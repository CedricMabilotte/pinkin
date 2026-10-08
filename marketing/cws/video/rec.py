# Enregistre l'écran virtuel :99 en JPEG horodatés (8 i/s) jusqu'à ce que le fichier STOP apparaisse.
import time, os, sys
from PIL import ImageGrab
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
fps = 8; i = 0; t0 = time.time()
with open(os.path.join(out, 'times.txt'), 'w') as tf:
    while not os.path.exists(os.path.join(out, 'STOP')):
        t = time.time()
        im = ImageGrab.grab(xdisplay=':99')
        im.save(os.path.join(out, f'f{i:06d}.jpg'), quality=88)
        tf.write(f'{i} {t - t0:.3f}\n'); tf.flush(); i += 1
        dt = 1 / fps - (time.time() - t)
        if dt > 0: time.sleep(dt)
