# Media prep commands (ffmpeg + Pillow are available in the container)

## Hero video (web-friendly, no audio) + poster + stills
```bash
ffmpeg -y -i hero.mp4 -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart media/hero.mp4
ffmpeg -y -ss 2.5 -i hero.mp4 -frames:v 1 -q:v 3 media/hero-poster.jpg
# contact sheet to "see" a video: 1 frame/sec tiled
ffmpeg -y -i hero.mp4 -vf "fps=1,scale=480:-1,tile=5x1" sheet.jpg
```

## Covers with transparent/white padding → square JPG
```python
from PIL import Image
im = Image.open('cover.webp')
mask = im.getchannel('A').point(lambda p: 255 if p > 200 else 0)   # transparent padding
c = im.crop(mask.getbbox()).convert('RGB')
s = min(c.size); c = c.crop(((c.width-s)//2, (c.height-s)//2, (c.width-s)//2+s, (c.height-s)//2+s))
c.save('media/covers/name.jpg', quality=86, optimize=True, progressive=True)
```
(For white padding instead, diff against a white image and use that bbox.)

## Photos with decorative borders
Crop inside the border by percentage, check the result visually (don't clip heads), save as progressive JPG.

## Pick a 30 s preview by loudness (you can't listen — say so, give timestamps, offer to recut)
```python
import subprocess, numpy as np
raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','8000','-f','s16le','-'], capture_output=True).stdout
a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
sec = len(a)//8000
rms = np.array([np.sqrt(np.mean(a[i*8000:(i+1)*8000]**2)) for i in range(sec)])
best = max(range(15, sec-40), key=lambda s: rms[s:s+30].mean())   # skip intro/outro
```
```bash
ffmpeg -y -ss $BEST -t 30 -i song.mp3 -af "afade=t=in:d=1.5,afade=t=out:st=27.5:d=2.5" -b:a 128k media/previews/song.mp3
# full background track with fades at both ends (dur = track length)
ffmpeg -y -i song.mp3 -af "afade=t=in:d=2,afade=t=out:st=$((DUR-3)):d=3" -b:a 160k media/song-full.mp3
```

## Vector placeholder product art
Generate SVG mockups with Python (800×800, dark radial backdrop, flat garment silhouette path in the colourway, wordmark text + accent mark): tee, long-sleeve, hoodie, cap, poster, tote. Validate with `xml.dom.minidom.parseString`, preview via a local HTML sheet opened with Playwright (`file://` page, not `setContent`, or images won't load). Name files `<item>-<colour>.svg` so each colour variant maps to an image.

## Streaming links
DistroKid HyperFollow pages (`distrokid.com/hyperfollow/<artist>/<slug>`) list Spotify/Apple/Deezer/etc. links: allow `distrokid.com`, open with Playwright, read `a[href]`. Cover images there come from `distrokid.imgix.net` (a separate host).
