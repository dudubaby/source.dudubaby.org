`dudubaby-320k.mp3` was downloaded from <http://source.snh48.com/mediasource/music/file/19190b96-c21c-4621-a57f-55691517bac8.mp3>, extracted from 口袋48.app. Downsampled to 128k with FFmpeg 3.2.2 (lame 3.99.5):

```
ffmpeg -i dudubaby-320k.mp3 -c:a libmp3lame -b:a 128k dudubaby-128k.mp3
```
