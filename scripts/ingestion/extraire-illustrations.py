#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Découpe des illustrations des fiches — lot L2-G, contrat features v2 § 3.7.

Deuxième étage de la chaîne d'ingestion : `extraire-fiches.py` a mesuré la bbox
de la scène dessinée et l'a écrite dans le brouillon ; ce script **découpe cette
bbox et rien d'autre**, en PNG, prêt pour `vectoriser.py`.

POURQUOI LA BBOX N'EST PAS RE-MESURÉE ICI
------------------------------------------
Elle l'a été une fois, par position, et elle est écrite dans le brouillon. La
re-mesurer serait recalculer une source qui fait déjà foi — la faute que
CLAUDE.md nomme en premier. Si le brouillon n'a pas de bbox, ce script REFUSE ;
il ne va pas la chercher lui-même.

QUELS NIVEAUX ONT UNE ILLUSTRATION — mesuré, pas supposé
--------------------------------------------------------
**Le niveau 1 seul.** Sa fiche est une scène dessinée que l'enfant colorie
(922 × 615 px, bbox (52,182)-(567,526) sur la fiche 1). Aux niveaux 2 à 7, le
support est le TEXTE : les seuls blocs image de la zone utile sont des pictos de
consigne et, aux niveaux 6 et 7, le fond ligné de la zone de réponse. Aucun
n'est une scène à colorier. Ce script le dit et sort en 0 plutôt que de produire
90 PNG de lignes de cahier.

USAGE
-----
    .venv\\Scripts\\python.exe scripts\\ingestion\\extraire-illustrations.py --niveau 1
    ... --niveau 1 --fiche 3 --echelle 2

Codes de sortie : 0 tout est découpé · 1 au moins un refus · 2 environnement.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from manifeste import verifier_destination  # noqa: E402

#: Échelle de rendu par défaut. 1 = les points PDF, donc 72 dpi ; les
#: illustrations du niveau 1 déclarent 922 × 615 px pour 515 × 343 pt, soit un
#: rapport mesuré de 1,79. On rend à 2 pour ne pas perdre de trait avant
#: vectorisation — potrace travaille d'autant mieux que le trait est net.
ECHELLE_PAR_DEFAUT = 2.0

#: Seuil de binarisation. Le trait est noir, le fond blanc : tout ce qui est
#: au-dessus devient blanc. Valeur volontairement haute — un trait gris clair
#: perdu vaut mieux qu'un aplat de fond pris pour du trait, qui ferait fuiter
#: le remplissage sur toute l'image (CLAUDE.md, « régions fermées »).
SEUIL_NOIR_ET_BLANC = 200


def racine_depot() -> Path:
    return Path(__file__).resolve().parents[2]


def analyser_arguments(argv: list[str]) -> argparse.Namespace:
    analyseur = argparse.ArgumentParser(
        prog="extraire-illustrations.py",
        description="Découpe en PNG la bbox d'illustration mesurée par "
                    "extraire-fiches.py.")
    analyseur.add_argument("--niveau", type=int, required=True,
                           choices=range(1, 8), metavar="1..7")
    analyseur.add_argument("--fiche", type=int, default=None)
    analyseur.add_argument("--source", type=Path, default=None,
                           help="PDF source (défaut : Docs/NIVEAU <n>.pdf)")
    analyseur.add_argument("--brouillons", type=Path, default=None,
                           help="dossier des brouillons du niveau")
    analyseur.add_argument("--echelle", type=float, default=ECHELLE_PAR_DEFAUT)
    analyseur.add_argument("--couleur", action="store_true",
                           help="garder la couleur (défaut : noir et blanc, "
                                "c'est ce que potrace attend)")
    return analyseur.parse_args(argv)


def principal(argv: list[str]) -> int:
    for flux in (sys.stdout, sys.stderr):
        if hasattr(flux, "reconfigure"):
            flux.reconfigure(encoding="utf-8", errors="replace")

    arguments = analyser_arguments(argv)
    racine = racine_depot()

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("ERREUR — PyMuPDF absent. `npm run preparer` crée .venv/ et "
              "installe scripts/ingestion/requirements.txt.", file=sys.stderr)
        return 2
    try:
        from PIL import Image
    except ImportError:
        print("ERREUR — Pillow absent. Il est épinglé dans "
              "scripts/ingestion/requirements.txt ; relancer `npm run preparer`.",
              file=sys.stderr)
        return 2

    brouillons = (arguments.brouillons or (
        racine / "contenu" / "brouillons" / f"niveau-{arguments.niveau}")).resolve()
    verifier_destination(brouillons, racine)
    if not brouillons.is_dir():
        print(f"ERREUR — brouillons introuvables : {brouillons}\n"
              f"         Lancer d'abord : npm run ingerer -- --niveau "
              f"{arguments.niveau}", file=sys.stderr)
        return 2

    source = arguments.source or (racine / "Docs" / f"NIVEAU {arguments.niveau}.pdf")
    if not source.is_file():
        print(f"ERREUR — PDF introuvable : {source}", file=sys.stderr)
        return 2

    fiches = sorted(brouillons.glob("fiche-*.json"))
    if arguments.fiche is not None:
        fiches = [f for f in fiches if f.name == f"fiche-{arguments.fiche:02d}.json"]
    if not fiches:
        print(f"ERREUR — aucun brouillon à traiter dans {brouillons}",
              file=sys.stderr)
        return 2

    destination = brouillons / "illustrations"
    verifier_destination(destination, racine)
    # Le dossier n'est créé qu'à la PREMIÈRE découpe : un dossier vide laissé aux
    # niveaux 2 à 7 laisserait croire qu'une scène y était attendue.

    document = fitz.open(source)
    decoupees, refusees = 0, 0

    for chemin in fiches:
        brouillon = json.loads(chemin.read_text(encoding="utf-8"))
        illustration = brouillon.get("illustration")
        numero = brouillon["origine"]["fiche"]
        if not illustration or not illustration.get("bboxPt"):
            print(f"REFUS  {chemin.name} — aucune bbox d'illustration dans le "
                  f"brouillon : ce niveau n'a pas de scène dessinée, son support "
                  f"est le texte", file=sys.stderr)
            refusees += 1
            continue

        x0, y0, x1, y1 = illustration["bboxPt"]
        page = document[brouillon["origine"]["page"] - 1]
        pixmap = page.get_pixmap(
            clip=fitz.Rect(x0, y0, x1, y1),
            matrix=fitz.Matrix(arguments.echelle, arguments.echelle),
            colorspace=fitz.csGRAY if not arguments.couleur else fitz.csRGB,
            alpha=False)
        image = Image.frombytes(
            "L" if not arguments.couleur else "RGB",
            (pixmap.width, pixmap.height), pixmap.samples)
        if not arguments.couleur:
            # Binarisation explicite : potrace veut du noir et du blanc, pas du
            # gris. Le point de bascule est une CONSTANTE, pas un seuil adaptatif :
            # un seuil qui change d'une fiche à l'autre rend la chaîne non
            # reproductible, ce que les fichiers de verrou interdisent.
            image = image.point(lambda v: 0 if v < SEUIL_NOIR_ET_BLANC else 255,
                                mode="1")

        destination.mkdir(parents=True, exist_ok=True)
        cible = destination / f"fiche-{numero:02d}.png"
        # `optimize` sans métadonnées : deux exécutions donnent le même octet.
        image.save(cible, format="PNG", optimize=True)
        decoupees += 1
        print(f"OK     fiche {numero:2d} — {pixmap.width}x{pixmap.height} px "
              f"-> {cible.relative_to(racine).as_posix()}")

    document.close()
    print(f"\nillustrations découpées : {decoupees}")
    print(f"brouillons sans scène   : {refusees}")
    print(f"destination             : {destination.relative_to(racine).as_posix()}")
    return 1 if refusees else 0


if __name__ == "__main__":
    sys.exit(principal(sys.argv[1:]))
