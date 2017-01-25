#!/usr/bin/env python3

import json
import re
import os

__all__ = [
    'transform',
]

HERE = os.path.dirname(os.path.realpath(__file__))
# The data file was based on http://www.snh48club.com/js/weibobq.js
# I added new entries according to our needs.
DATAFILE = os.path.join(HERE, 'data', 'emojis.json')
with open(DATAFILE) as fp:
    DATA = json.load(fp)

# Matches plain text emoji placeholders, but not alt texts in what are
# already linked emoji images.
POTENTIAL_EMOJI = re.compile('(?<!alt=")\[.*?\]')

def transform(s):
    def repl(match):
        alt = match.group(0)
        if alt in DATA:
            return f'<img alt="{alt}" src="{DATA[alt]}"/>'
        else:
            return alt

    return POTENTIAL_EMOJI.sub(repl, s)
