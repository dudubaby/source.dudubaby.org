#!/usr/bin/env python3

# Common extraction/transformation utilities shared accross
# snhey.com/extract and snh48club.com/extract.

import html
import re
import urllib.parse

import longstatuses
import shortlinks
import weibo_photos

AT_MENTION = re.compile(r'@(?P<handle>.*?)((?P<post>:)|(?=\s|@|：|<|$))')
INCOMPLETE_STATUS_PATTERN = re.compile(r'^(?P<incomplete>.*)...全文： '
                                       r'(<a ([^>]+ )?href=")?'
                                       r'(?P<url>http://m.weibo.cn/[0-9]+/[0-9]+)'
                                       r'("[^>]*>)?$',
                                       re.DOTALL)
MEMBER_HANDLE = re.compile(r'^(SNH|BEJ|GNZ)48[_-](?P<name>(.[_-]?){2,5})$')
TCN_SHORTLINK = re.compile(r'http://t.cn/\w{7}', re.A)
URL_STRIP_BOILERPLATE = re.compile(r'^https?://(www\.)?(?P<interesting>.*)')
WEIBO_PHOTO_PAGE = re.compile('^http://photo.weibo.com/')

# Target length of the display version of an expanded t.cn URL
LINK_DISPLAY_LENGTH = 20

# A naive ''.join(str(e) for e in soup.children) results in unescaped
# NavigableStrings wreaking havok
def join_soup_tags(iterator):
    return ''.join(html.escape(e) if isinstance(e, str) else str(e)
                   for e in iterator)

def parse_handle(handle):
    m = MEMBER_HANDLE.match(handle)
    if m:
        return ''.join([ch for ch in m.group('name') if ch not in '_-'])
    else:
        return handle

# Wrap the at mention in a span.name.
# Also wrap it in a link to the interactions page if the handle belongs to a member.
def transform_at_mentions(s):
    return re.sub(AT_MENTION, transform_at_mentions_repl, s)

def highlight_handle(handle, pre=''):
    name = parse_handle(handle)
    if name != handle:  # name != handle iff member
        if name in ['陈怡馨', 'SNH48', 'BEJ48', 'GNZ48', '星梦咖啡店']:
            span_innerhtml = f'{pre}{name}'
        else:
            span_innerhtml = f'<a href="/interactions/{name}">{pre}{name}</a>'
    else:
        span_innerhtml = f'{pre}{handle}'
    return f'<span class="name">{span_innerhtml}</span>'

def transform_at_mentions_repl(match):
    handle = match.group('handle')
    post = match.group('post')
    # Transform colon after the mention into a full-width colon
    if post == ':':
        post = '：'
    span = highlight_handle(handle, '@')
    return span + post if post else span

def transform_tcn_shortlinks(s):
    return re.sub(TCN_SHORTLINK, transform_tcn_shortlinks_repl, s)

def display_url(url):
    # Target a length of LINK_DISPLAY_LENGTH characters
    m = URL_STRIP_BOILERPLATE.match(url)
    s = m.group('interesting')
    if len(s) <= LINK_DISPLAY_LENGTH:
        return s
    else:
        return s[:LINK_DISPLAY_LENGTH-3] + '...'

def transform_tcn_shortlinks_repl(match):
    shorturl = match.group(0)
    longurl = shortlinks.resolve(shorturl)
    # Resolve weibo photo page (photo.weibo.com) to a direct link to the
    # large image
    if WEIBO_PHOTO_PAGE.match(longurl):
        image_filename = weibo_photos.resolve(longurl)
        longurl = weibo_photos.large_image_url(image_filename)
    display = display_url(longurl)
    return (f'<a data-canonical-href="{shorturl}" href="{urllib.parse.quote(longurl, safe="/:")}" '
            f'target="_blank">{display}</a>')

def parse_complete_status_link(s):
    m = INCOMPLETE_STATUS_PATTERN.match(s)
    if m:
        s = m.group('incomplete') + '……'
        url = m.group('url')
        # We fetch and archive the complete status, although we won't be
        # using it due to problems: @mentions and hashtags are linked,
        # emojis are rendered with RSS and thus not available in the
        # HTML we extract, etc.
        longstatuses.get(url)
        return s, url
    else:
        return s, None
