#!/usr/bin/env python3

import json
import logging
import os
import urllib.parse

import requests

__all__ = [
    'persist',
    'resolve',
    'unshorten',
]

HERE = os.path.dirname(os.path.realpath(__file__))
DATAFILE = os.path.join(HERE, 'data', 'shortlinks.json')
MAPPING = {}
SESSION = requests.session()
logging.basicConfig(format='[%(name)s] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Load db from disk
def load():
    if os.path.isfile(DATAFILE):
        with open(DATAFILE) as fp:
            try:
                MAPPING.update(json.load(fp))
            except Exception:
                logger.error(f'{DATAFILE} is corrupted')

def unshorten(shorturl):
    try:
        longurl = SESSION.head(shorturl).headers['Location']
        assert longurl != shorturl
        MAPPING[shorturl] = longurl
        return longurl
    except Exception:
        logger.error(f'Failed to shorten {shorturl}')
        return shorturl

def resolve(shorturl):
    return MAPPING[shorturl] if shorturl in MAPPING else unshorten(shorturl)

def persist():
    if not MAPPING:
        logger.warning('Not persisting because there\'s no data to persist; '
                       'something might be wrong!')
        return
    os.makedirs(os.path.dirname(DATAFILE), exist_ok=True)
    with open(DATAFILE, 'w') as fp:
        json.dump(MAPPING, fp, indent=2, sort_keys=True)

load()
