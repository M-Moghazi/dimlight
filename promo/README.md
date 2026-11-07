# Dimlight promo video

`dimlight-promo-20s.mp4`: 20 seconds, 1920×1080, 30 fps, H.264 with an AAC soundtrack.

## Rebuild

```sh
cd promo/source
mkdir -p frames && node render.js frames 30      # needs Playwright and Chromium
python3 audio.py                                 # writes music.wav
ffmpeg -framerate 30 -i frames/%04d.png -i music.wav -c:v libx264 -crf 17 \
  -pix_fmt yuv420p -c:a aac -b:a 192k -shortest ../dimlight-promo-20s.mp4
```

The animation lives in `scene.html`, which exposes `render(t)` for any time `t` in seconds.
