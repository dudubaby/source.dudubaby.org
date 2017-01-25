#!/usr/bin/env python3

import logging
import os
import re

import bs4
import requests

__all__ = [
    'get',
]

HERE = os.path.dirname(os.path.realpath(__file__))
DATADIR = os.path.join(HERE, 'data', 'long-statuses')
os.makedirs(DATADIR, exist_ok=True)
MWEIBOCN_PATTERN = re.compile(r'^http://m.weibo.cn/(\d+)/(\d+)$', re.A)
SESSION = requests.session()
logging.basicConfig(format='[%(name)s] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def fetch(url):
    resp = SESSION.get(url)
    if resp.status_code == 404:
        # Well, unfortunately this status has been deleted, which is
        # true for any status of our protagonist.
        return ''
    assert resp.status_code == 200
    soup = bs4.BeautifulSoup(resp.text, 'html.parser')
    weibo_text = soup.select_one('.weibo-text')
    assert weibo_text
    html = ''.join(str(e) for e in weibo_text.children)
    assert html
    return html

def get(url):
    m = MWEIBOCN_PATTERN.match(url)
    if not m:
        logger.error(f'Invalid long status URL {url}')
        return
    cached_path = os.path.join(DATADIR, m.expand(r'\1-\2.html'))
    if os.path.isfile(cached_path):
        with open(cached_path) as fp:
            return fp.read()
    try:
        content = fetch(url)
    except Exception:
        logger.error(f'Failed to fetch long status {url}')
        return
    if not content:
        logger.warning(f'{url} has been deleted; caching as empty')
    with open(cached_path, 'w') as fp:
        fp.write(content)
    logger.warning(f'{url} written to {cached_path}')
    return content
