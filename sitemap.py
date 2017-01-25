#!/usr/bin/env python3

import urllib.parse

from lxml import etree as ET
from lxml.builder import ElementMaker

import conf
from schema import token

__all__ = [
    'xml_sitemap',
]

SITE_PREFIX = conf.site_prefix

NS_DEFAULT = 'http://www.sitemaps.org/schemas/sitemap/0.9'
NS_IMAGE_EXTENSION = 'http://www.google.com/schemas/sitemap-image/1.1'
NSMAP = {None: NS_DEFAULT, 'image': NS_IMAGE_EXTENSION}

E = ElementMaker(namespace=NS_DEFAULT, nsmap=NSMAP)
IMAGE_E = ElementMaker(namespace=NS_IMAGE_EXTENSION, nsmap=NSMAP)

URLSET = E.urlset
URL = E.url
LOC = E.loc
IMAGE_IMAGE = IMAGE_E.image
IMAGE_LOC = IMAGE_E.loc
IMAGE_CAPTION = IMAGE_E.caption

def sitepath(path):
    return urllib.parse.urljoin(SITE_PREFIX, urllib.parse.quote(path))

def imagepath(filename):
    path = f'/assets/images/olarge/{filename}'
    return sitepath(path)

def regular_url_element(path):
    url = sitepath(path)
    return URL(
        LOC(url),
    )

def status_url_element(status):
    url = sitepath(f'/status/{token(status)}')
    author = status.author.name
    # We don't really have precise captions, so just use a few keywords
    # for association.
    caption = 'SNH48 陈怡馨' if author == '陈怡馨' else f'SNH48 {author} 陈怡馨'
    images = status.images.split() + status.orig_images.split()
    image_elements = [
        IMAGE_IMAGE(
            IMAGE_LOC(imagepath(filename)),
            IMAGE_CAPTION(caption),
        )
        for filename in images
    ]
    return URL(
        LOC(url),
        *image_elements,
    )

# Returns a str that can be written to sitemap.txt directly:
def txt_sitemap(pagelist):
    return '\n'.join(map(sitepath, pagelist)) + '\n'

# Returns a UTF-8 encoded bytestring that can be written to sitemap.xml directly
def xml_sitemap(pagelist, statuses, local_images=True):
    if local_images:
        url_elements = [
            regular_url_element(path)
            for path in pagelist if not path.startswith('status/') or path == 'status/'
        ] + [
            status_url_element(status)
            for status in statuses
        ]
    else:
        url_elements = [
            regular_url_element(path)
            for path in pagelist
        ]
    tree = URLSET(*url_elements)
    return ET.tostring(tree, xml_declaration=True, encoding='UTF-8')
