#!/usr/bin/env python3

import os

import yaml

__all__ = [
    'CONF',
    'allow_crawlers',
    'alt_site',
    'buildpath',
    'database',
    'enable_ga',
    'ga_tracking_id',
    'image_source',
    'local_images',
    'production',
    'site_prefix',
    'statuses_per_page',
    'weibo_cookie',
]

HERE = os.path.dirname(os.path.realpath(__file__))
# Read from the env var CONFFILE, or conf.yml
CONFFILE = os.getenv('CONFFILE', os.path.join(HERE, 'conf.yml'))
CONF = None

if os.path.isfile(CONFFILE):
    with open(CONFFILE) as fp:
        try:
            CONF = yaml.load(fp.read())
        except Exception:
            raise RuntimeError(f'{CONFFILE} is corrupted')
else:
    raise RuntimeError(f'{CONFFILE} does not exist; '
                       f'please get started with copying {CONFFILE}.template')

allow_crawlers = CONF.get('allow_crawlers', True)
alt_site = CONF.get('alt_site', 'https://cn.dudubaby.org')
buildpath = os.path.join(HERE, CONF.get('buildpath', '_build'))
database = os.path.join(HERE, CONF.get('database', 'data/weibo_data.sqlite3'))
enable_ga = CONF.get('enable_ga', False)
ga_tracking_id = CONF.get('ga_tracking_id', None)
image_source = CONF.get('image_source', 'local')
local_images = image_source != 'sina'
production = CONF.get('production', False)
site_prefix = CONF.get('site_prefix', 'https://dudubaby.org')
statuses_per_page = CONF.get('statuses_per_page', 50)
weibo_cookie = CONF.get('weibo_cookie', '')
