## Weibo images

The image list `images.txt` is generated with `extract-images` from the root directory; the emoji URL list `emojis.txt` is based on `../data/emojis.json`. With the image and emoji lists, the images and emojis with `download-images` and `download-emojis`, which result in emojis saved in `thumb180/`, `large/` and `emojis/`.

To optimize the large images for this repository, copy `large/` to `olarge/` and run `optimize`.

## Other images

`profile-pic.jpg` is the official profile image from snh48.com.

`teamh2.jpg` was downloaded from <http://stage48.net/wiki/index.php/File:TeamHIIFlag.jpg> (apparently a property of SNH48's operating company), and it went through

```sh
convert teamh2.jpg -fuzz 45% \
    -fill black -opaque 'rgb(243,154,0)' \
    -fill '#f8941d' +opaque black \
    -transparent black \
    -crop 400x300+52+18 \
    -resize 100x75 \
    teamh2.png
```

to become `teamh2.png`.

`play-circle.svg`, `pause-circle.svg`, `info-circle.svg` and `question-circle.svg` were downloaded from <https://github.com/encharm/Font-Awesome-SVG-PNG> (OFL 1.1, MIT).

`favicon.ico` is generated through

```sh
for size in 16 32 48; do convert profile-pic-square.png -resize $sizex$size favicon-$size.png; done
optipng favicon-*.png
convert favicon-*.png ../favicon.ico
rm favicon-*.png
```

I created the rest of the images. The relevant Pixelmator PXM files are in `pixelmator/`.
