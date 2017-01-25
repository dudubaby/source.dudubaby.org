#!/usr/bin/env python3

# The overall version should be X.Y[dev], where the dev suffix is used
# on unreleased versions (e.g., changes after 1.0 release should belong
# to 1.1dev).
#
# CSS and JS version should be X.Y[devZ], where Z is a non-decreasing
# positive integer (non-decreasing given a X.Y combination). CSS and JS
# versions are only bumped as necessary in order to maximize the value
# of caching; however, a dev version must be bumped to stable upon
# release. That is to say, when the time comes to v1.1 release, if CSS
# hasn't changed at all since v1.0, then __css_version_ should stay at
# 1.0, but if JS is at 1.1dev5, then __js_version__ should be bumped to
# 1.1 upon release.

__version__ = '1.0'
__css_version__ = '1.0'
__js_version__ = '1.0'
