# -*- coding: utf-8 -*-
"""Porte technique : combien d'images, par condition, entreraient dans la chaine
de l'annexe P section 3.2 SANS retouche humaine ?

Les quatre criteres sont ceux dont depend la suite du pipeline. Ils sont mecaniques :
aucun n'est un jugement.

  fond blanc pur     >= 99 %   sinon potrace seuille un fond gris et noie le sujet
  saturation moyenne <  10     "trait noir sur blanc" au sens propre
  fuite              aucune    test d'inondation de l'annexe P 3.2, bloquant
  composantes encre  <= 400    seuil de chemins SVG de l'annexe P 3.5

Usage : python production/essais/verdict.py
"""
import csv, os, sys
from collections import OrderedDict

sys.stdout.reconfigure(encoding="utf-8")
ESSAIS = os.path.dirname(os.path.abspath(__file__))

LIBELLE = OrderedDict([
    ("A-trait",        "A  trait impose au prompt"),
    ("B-couleur",      "B  couleur, sans contrainte"),
    ("C-extrait",      "C  trait extrait de B"),
    ("D-trait-tags",   "D  trait, convention native (controle)"),
    ("E-couleur-tags", "E  couleur, convention native (controle)"),
])

lignes = list(csv.DictReader(open(os.path.join(ESSAIS, "qc-technique.csv"), encoding="utf-8")))
for l in lignes:
    ok_fond = float(l["fond_blanc"]) >= 99.0
    ok_mono = float(l["saturation_moy"]) < 10.0
    ok_ferm = l["fuite"] == "False"
    ok_chem = int(l["composantes"]) <= 400
    l["_p"] = ok_fond and ok_mono and ok_ferm and ok_chem
    l["_d"] = f"{'F' if ok_fond else '.'}{'M' if ok_mono else '.'}" \
              f"{'C' if ok_ferm else '.'}{'S' if ok_chem else '.'}"

print("detail  (F fond blanc pur · M monochrome · C contours fermes · S chemins <= 400)\n")
for c in LIBELLE:
    for l in [x for x in lignes if x["condition"] == c]:
        print(f"  {l['fichier']:30} {l['_d']}   {'RETENUE' if l['_p'] else ''}")

print("\n" + "=" * 64)
print(f"{'condition':40}{'porte technique':>16}")
print("=" * 64)
tot_ok = tot = 0
for c, lib in LIBELLE.items():
    g = [l for l in lignes if l["condition"] == c]
    ok = sum(1 for l in g if l["_p"])
    tot_ok += ok
    tot += len(g)
    print(f"{lib:40}{ok:>10}/{len(g):<5}")
print("=" * 64)
print(f"{'TOTAL':40}{tot_ok:>10}/{tot:<5}")
