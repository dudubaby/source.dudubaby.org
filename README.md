# DuDuBaby.org

Source code, assets, and build instructions for [dudubaby.org](https://dudubaby.org).

## Download

You can of course clone the repository (close to 1GB in size), which is the preferred way to get started. However, in case your connection to GitHub is slow and/or unstable, you can also download release tarballs from the [releases](https://github.com/dudubaby/source.dudubaby.org/releases) page, which exclude some assets like re-downloadable images, and are consequently much smaller (<50MB).

## Dependencies

Python build dependencies:

- Python 3.6 or later (Python 3.6.0 used for production);
- `requirements.txt` (exact versions in `requirements.txt.lock` used for production).

Non-Python build dependencies:

- [clean-css](https://www.npmjs.com/package/clean-css) (3.4.23 used for production);
- [UglifyJS](https://www.npmjs.com/package/uglifyjs) (2.4.10 used for producation).

Other dependencies (used in helper scripts but not necessary for building the site from this repo):

- [GNU Parallel](https://savannah.gnu.org/projects/parallel/);
- [ImageMagick](https://imagemagick.org);
- `jpegtran` from [libjpeg](http://www.ijg.org/);
- [OptiPNG](http://optipng.sourceforge.net/).

## Build instructions

The one-stop build script is `build`, which is very simple:

```
$ build -h
usage: build [-h] [conffile]

positional arguments:
  conffile    defaults to conf.yml

optional arguments:
  -h, --help  show this help message and exit
```

Only a configuration file is required, and `build` takes care of the rest, generating a fully static site (or maybe a "static web app" is more appropriate, as the site uses JavaScript extensively and behaves like a single page application) that can be deployed anywhere (must be at the root of a domain though). The configuration file should be modeled on `conf.yml.template`, which documents all configuration variables.

## Notes

- The build system is a mess. I apologize, but don't intend to clean it up.

- **Why `/assets`?**

  The `/assets` directory contains all assets: `audio`, `css`, `data`, `images`, `js`. These could well be top-level directories, and we can even save some bytes in HTML files by putting them at top level. So why `/assets`?

  The answer is that we have to have an encompassing assets directory in order to do caching right in CloudFlare and stay within CloudFlare's free plan (limited to 3 page rules).

  The thinking is as follows: We need to have a 30 day TTL on assets, and a 1 day TTL on HTML files. We only have 3 page rules, one of which is used for redirecting HTTP to HTTPS, another one of which has to be dedicated to setting the TTL of HTML files, since they're not cached by default. We're also subject to the following additional constraints:

  1. CF page rules only support rudimentary wildcards;
  2. The first and only the first matching rule is applied to a URL.

  Due to lack of regex support, our HTML caching rule must be catch-all, but if we don't have an overriding rule, then the cache TTL of all files, including assets, would be set to the same 1 day as HTML files. Therefore, the only remaining rule must be used to reinstate the cache TTL of assets, and it must come before the catch-all rule. Again, due to lack of regex support, we must put all assets under a common prefix in order to write a rule to match them all (and nothing else).

  The final page rules are:

  1. `https://*dudubaby.org/assets/*`: TTL 30 days, cache level: cache everything;
  2. `https://*dudubaby.org/*`: TTL 1 day, cache level: cache everything;
  3. `http://*dudubaby.org/*`: always use HTTPS.

  <https://gist.github.com/4458971153b414e91200ab67b5f0a4f9> contains some statistics of the additional `/assets` dir on the size of HTML files. At the point of development when `/assets` dir was being introduced, before the change the uncompressed total of HTML files (in preview.dudubaby.org production build) was 21599195 bytes and the compressed total was 4552135 bytes; after the change the uncompressed total was 22285654 bytes and the compressed total was 4576934 bytes. That is, we saw a 3% increase in uncompressed total and a 0.5% increase in compressed total. Not a considerable hit.

## Known issues

- If you ever see a comment that says "图片评论" and nothing else, that's because it's only in snh48club.com's data set, which has stripped images in comments. (In contrast, snhey.com kept all the comment images as t.cn shortlinks (pointing to photo.weibo.com), which I have parsed and converted into actual images.) I faced a difficult choice between hiding those comments and showing them as "图片评论"; I chose the latter in the end to preserve the interaction aspect of each comment.

- In Google Chrome, sometimes I can't search on a page because soon after I press &#x2318;F (probably less than a second), the search input box would cancel itself as if I pressed the escape key. This could happen when the page is fully loaded and doing nothing, except for recording the scroll position periodically in the background (see the `setInterval` call in `ui.js`). It happens the most for me on `/one-page` (most likely because when I need to search for something I go to `/one-page`), a gigantic page for sure, but I've seen this on other pages as well. Refreshing usually doesn't help, but if I recall correctly, navigating away then back (without even unloading, just flushing `main` and repopulating it with XHR'ed content) would resolve the problem. This is very strange because I don't think there's any JavaScript API that could affect the browser's builtin search box. Also, I've only observed this issue in Chrome (55.0.2883.95 on macOS 10.12.2), not in Firefox or Safari, but that might be due to the fact that Chrome is my single main development browser. Basically, I can't think of anything that I could do about this, and it's probably not (entirely) my fault.
