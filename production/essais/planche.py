# -*- coding: utf-8 -*-
"""Assemble une planche-contact etiquetee pour un lot d'images.

Usage : python production/essais/planche.py <motif_glob> <sortie.png> [taille]
"""
import glob, os, sys
from PIL import Image, ImageDraw

motif, sortie = sys.argv[1], sys.argv[2]
T = int(sys.argv[3]) if len(sys.argv) > 3 else 640
BANDE = 34

fichiers = sorted(glob.glob(motif))
if not fichiers:
    sys.exit(f"aucun fichier pour {motif}")

cols = 3
lignes = (len(fichiers) + cols - 1) // cols
planche = Image.new("RGB", (cols * T, lignes * (T + BANDE)), "white")
dessin = ImageDraw.Draw(planche)

for i, f in enumerate(fichiers):
    im = Image.open(f).convert("RGB").resize((T, T), Image.LANCZOS)
    x, y = (i % cols) * T, (i // cols) * (T + BANDE)
    planche.paste(im, (x, y))
    dessin.rectangle([x, y + T, x + T, y + T + BANDE], fill="black")
    dessin.text((x + 8, y + T + 10), os.path.basename(f), fill="white")
    dessin.rectangle([x, y, x + T - 1, y + T + BANDE - 1], outline="black")

planche.save(sortie)
print(f"{sortie} : {len(fichiers)} images, {planche.size[0]}x{planche.size[1]}")
