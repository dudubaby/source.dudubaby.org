#!/usr/bin/env python3

import http.cookies
import json
import logging
import os
import random

import bs4
import requests

import conf

__all__ = [
    'large_image_url',
    'persist',
    'resolve',
]

HERE = os.path.dirname(os.path.realpath(__file__))
DATAFILE = os.path.join(HERE, 'data', 'photos.json')
MAPPING = {}
SESSION = requests.session()
logging.basicConfig(format='[%(name)s] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def large_image_url(filename):
    return f'http://ww{random.randrange(1, 5)}.sinaimg.cn/large/{filename}'

def load_cookie(s):
    cookie = http.cookies.SimpleCookie()
    cookie.load(s)
    for key, morsel in cookie.items():
        SESSION.cookies.set(key, morsel.value, domain='weibo.com')

def load_cache():
    if os.path.isfile(DATAFILE):
        with open(DATAFILE) as fp:
            try:
                MAPPING.update(json.load(fp))
            except Exception:
                logger.error(f'{DATAFILE} is corrupted')

def fetch(url):
    resp = SESSION.get(url)
    assert resp.status_code == 200
    try:
        filename = os.path.basename(bs4.BeautifulSoup(resp.text, 'html.parser').find('img').get('src'))
        MAPPING[url] = filename
        return filename
    except Exception:
        logging.error(r'Failed to resolve {url}')

def resolve(url):
    return MAPPING[url] if url in MAPPING else fetch(url)

def persist():
    if not MAPPING:
        logger.warning('Not persisting because there\'s no data to persist; '
                       'something might be wrong!')
        return
    os.makedirs(os.path.dirname(DATAFILE), exist_ok=True)
    with open(DATAFILE, 'w') as fp:
        json.dump(MAPPING, fp, indent=2, sort_keys=True)

load_cookie(conf.weibo_cookie)
load_cache()

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('urls', nargs='+')
    parser.add_argument('-u', '--urls', dest='print_urls', action='store_true',
                        help='return URLs instead of basenames')
    args = parser.parse_args()
    for url in args.urls:
        filename = resolve(url)
        if filename:
            if args.print_urls:
                print(large_image_url(filename))
            else:
                print(filename)
    persist()

if __name__ == '__main__':
    main()
