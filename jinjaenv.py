#!/usr/bin/env python3

import os
import random
from contextlib import contextmanager

import jinja2

import conf
import initdb
from schema import Member, comments, token
from teams import team
from version import __css_version__, __js_version__

__all__ = [
    'JINJAENV',
    'setglobal',
]

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(HERE, 'templates')
PRODUCTION = conf.production
GA_TRACKING_ID = conf.ga_tracking_id if conf.enable_ga else None
LOCAL_IMAGES = conf.local_images
ALT_SITE = conf.alt_site
JINJAENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
)

MEMBER_NAMES = {member.name for member in Member.select()}

def memberlink(name):
    blacklist = ['陈怡馨', 'SNH48', 'BEJ48', 'GNZ48', '星梦咖啡店']
    if name not in blacklist and name in MEMBER_NAMES:
        return f'<a href="/interactions/{name}">{name}</a>'
    else:
        return name

def layoutclass(images):
    count = len(images)
    if count == 1:
        layout_class = 'col1'  # single image
    elif count in {2, 4}:
        layout_class = 'col2'  # two images per row (1x2 or 2x2)
    else:
        layout_class = 'col3'  # three images per row
    return layout_class

def sinaimg(path):
    subdomain = 'ww' + str(sum(map(ord, path)) % 4 + 1)
    return f'http://{subdomain}.sinaimg.cn/{path}'

def strftime(dt):
    return dt.strftime('%Y-%m-%d %H:%M')

GLOBALS = JINJAENV.globals
GLOBALS['ALT_SITE'] = ALT_SITE
GLOBALS['GA_TRACKING_ID'] = GA_TRACKING_ID
GLOBALS['LOCAL_IMAGES'] = LOCAL_IMAGES
GLOBALS['PRODUCTION'] = PRODUCTION
GLOBALS['CSS_VERSION'] = __css_version__
GLOBALS['JS_VERSION'] = __js_version__

FILTERS = JINJAENV.filters
FILTERS['comments'] = comments
FILTERS['layoutclass'] = layoutclass
FILTERS['memberlink'] = memberlink
FILTERS['sinaimg'] = sinaimg
FILTERS['strftime'] = strftime
FILTERS['team'] = team
FILTERS['token'] = token

@contextmanager
def setglobal(name, value):
    has_original_value = False
    original_value = None
    if name in GLOBALS:
        has_original_value = True
        original_value = GLOBALS[name]

    GLOBALS[name] = value
    yield

    if has_original_value:
        GLOBALS[name] = original_value
    else:
        del GLOBALS[name]
