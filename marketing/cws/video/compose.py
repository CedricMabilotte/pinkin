import json, os, subprocess, io, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; out = sys.argv[2]
T = [tuple(map(float, l.split())) for l in open(d + '/times.txt')]
t0 = os.path.getmtime(d + '/f000000.jpg') - 0.05
caps = [json.loads(l) for l in open('captions.jsonl')]
for c in caps: c['rt'] = c['t'] - t0
# coupe : le temps mort après la fiche contact (de « fiche +12 s » à « carnet -1 s »)
ci = next(i for i, c in enumerate(caps) if c['text'].startswith('Clicking a pin'))
li = next(i for i, c in enumerate(caps) if c['text'].startswith('The List tab'))
cuts = [(caps[ci]['rt'] + 12, caps[li]['rt'] - 1)]
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 23)
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
def caption_at(rt):
    cur = None
    for c in caps:
        if c['rt'] <= rt: cur = c
    return cur
MJ = d + '/stream.mjpg'; mj = open(MJ, 'wb')
n = 0
for idx, rt in T:
    if any(a <= rt < b for a, b in cuts): continue
    im = Image.open(f'{d}/f{int(idx):06d}.jpg').convert('RGB')
    c = caption_at(rt)
    if c and c.get('zoomUrl'):
        crop = im.crop((95, 42, 905, 82)).resize((1215, 60), Image.LANCZOS)
        box = Image.new('RGB', (1231, 92), (255, 196, 0)); box.paste(crop, (8, 24))
        dd = ImageDraw.Draw(box); dd.text((10, 3), 'Address bar (zoom) — OAuth client ID', font=FB, fill=(0, 0, 0))
        im.paste(box, (24, 96))
    if c and c['text']:
        lines = textwrap.wrap(c['text'], 92)
        h = 18 + 32 * len(lines)
        ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        top = 800 - h - 10 if not c['text'].startswith('Result in Google Contacts') else 92
        od.rectangle((0, top, 1280, top + h + 10), fill=(15, 15, 20, 215))
        for k, L in enumerate(lines): od.text((28, top + 11 + 32 * k), L, font=F, fill=(255, 255, 255, 255))
        im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90); mj.write(buf.getvalue()); n += 1
mj.close()
subprocess.run([os.path.expanduser('~/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux'), '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '8', '-i', MJ,
    '-c:v', 'libvpx', '-b:v', '3M', '-qmin', '4', '-qmax', '30', '-auto-alt-ref', '0', out], check=True)
print('frames', n, 'duree', round(n / 8, 1), 's', 'taille', os.path.getsize(out) // 1024, 'Ko')
