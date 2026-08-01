#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Vectorisation des illustrations — lot L2-G, contrat features v2 § 3.7.

Troisième et dernier étage de la chaîne d'ingestion : PNG en noir et blanc →
SVG **à régions fermées**, par `potrace`, pris dans `outils/bin/` et nulle part
ailleurs (décision D9 : rien ne s'installe hors du dépôt).

POURQUOI LES RÉGIONS FERMÉES SONT LE SEUL CRITÈRE QUI COMPTE
-------------------------------------------------------------
CLAUDE.md, en toutes lettres : « un trait interrompu d'un pixel fait fuiter le
remplissage sur toute l'image ». Toute la mécanique signature du jeu — la
recoloration d'une zone au tap — repose sur des sous-chemins fermés. Ce script
**vérifie** donc le SVG qu'il vient de produire, et le supprime plutôt que de le
laisser sur disque s'il ne tient pas. Un SVG à région ouverte est un bogue qui ne
se voit qu'au moment où l'enfant tape dessus.

POTRACE ABSENT N'EST PAS UN DÉFAUT DE CODE
-------------------------------------------
C'est un défaut d'**environnement** (contrat § 2.2 et § 11) : `npm run preparer`
le télécharge dans `outils/bin/potrace/`. Ce script le dit dans ces termes, sort
en 2, et n'essaie jamais un binaire du système — un potrace global marcherait ici
et nulle part ailleurs.

USAGE
-----
    .venv\\Scripts\\python.exe scripts\\ingestion\\vectoriser.py --niveau 1
    ... --niveau 1 --fiche 3

Codes de sortie : 0 tout est vectorisé · 1 au moins un SVG refusé ·
2 potrace absent, ou erreur d'usage.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from manifeste import verifier_destination  # noqa: E402

#: Nom du binaire selon la plateforme.
NOM_POTRACE = "potrace.exe" if sys.platform == "win32" else "potrace"

#: Dossier du binaire DANS le dépôt. Aucune recherche dans le PATH : voulu.
DOSSIER_POTRACE = ("outils", "bin", "potrace")


def trouver_potrace(racine: Path) -> Path | None:
    """potrace dans `outils/bin/potrace/`, à la racine ou d'un cran plus bas.

    L'archive officielle de potrace 1.16 se déplie en `potrace-1.16.win64/` ;
    `scripts/telecharger-outils.mjs` ne l'aplatit pas, pour que le témoin
    d'installation décrive la forme RÉELLE de l'archive et détecte donc un
    changement de forme. La recherche est bornée à deux niveaux et triée : elle
    reste déterministe, et ne sort jamais du dépôt.
    """
    dossier = racine.joinpath(*DOSSIER_POTRACE)
    directs = [dossier / NOM_POTRACE]
    indirects = sorted(dossier.glob(f"*/{NOM_POTRACE}"))
    for candidat in [*directs, *indirects]:
        if candidat.is_file():
            return candidat
    return None

#: Options de potrace, épinglées pour que deux exécutions donnent le même SVG.
#: `--flat` : un seul groupe, pas de transformations imbriquées — c'est ce que
#: le moteur `colorie` sait relire. `-a 1` : lissage des coins modéré, le trait
#: reste reconnaissable. `-u 10` : quantification, réduit la taille sans
#: déformer. Aucune option n'est adaptative : la reproductibilité prime.
OPTIONS_POTRACE = ("--svg", "--flat", "-a", "1", "-u", "10", "-O", "0.2")

#: Un sous-chemin fermé finit par `z` ou `Z`. potrace en produit toujours ;
#: la vérification attrape une régression d'options, pas une fantaisie de
#: potrace.
MOTIF_CHEMIN = re.compile(r'\sd="([^"]*)"')


def racine_depot() -> Path:
    return Path(__file__).resolve().parents[2]


def chemins_ouverts(svg: str) -> list[str]:
    """Les sous-chemins du SVG qui ne se referment pas. Vide = tout va bien."""
    ouverts: list[str] = []
    for donnees in MOTIF_CHEMIN.findall(svg):
        for morceau in re.split(r"(?<=[zZ])", donnees):
            trace = morceau.strip()
            if not trace:
                continue
            if not trace.rstrip().endswith(("z", "Z")):
                ouverts.append(trace[:60])
    return ouverts


def analyser_arguments(argv: list[str]) -> argparse.Namespace:
    analyseur = argparse.ArgumentParser(
        prog="vectoriser.py",
        description="potrace : PNG noir et blanc -> SVG à régions fermées.")
    analyseur.add_argument("--niveau", type=int, required=True,
                           choices=range(1, 8), metavar="1..7")
    analyseur.add_argument("--fiche", type=int, default=None)
    analyseur.add_argument("--brouillons", type=Path, default=None)
    return analyseur.parse_args(argv)


def principal(argv: list[str]) -> int:
    for flux in (sys.stdout, sys.stderr):
        if hasattr(flux, "reconfigure"):
            flux.reconfigure(encoding="utf-8", errors="replace")

    arguments = analyser_arguments(argv)
    racine = racine_depot()
    potrace = trouver_potrace(racine)

    if potrace is None:
        print(f"ERREUR — potrace absent de "
              f"{racine.joinpath(*DOSSIER_POTRACE)}\n"
              "         C'est un défaut d'ENVIRONNEMENT, pas de code "
              "(contrat features v2 § 2.2).\n"
              "         Le télécharger dans le dépôt :  npm run preparer\n"
              "         Aucun potrace du système n'est utilisé : une "
              "dépendance globale est\n"
              "         une dépendance invisible (décision D9).", file=sys.stderr)
        return 2

    brouillons = (arguments.brouillons or (
        racine / "contenu" / "brouillons" / f"niveau-{arguments.niveau}")).resolve()
    verifier_destination(brouillons, racine)
    dossier_png = brouillons / "illustrations"
    if not dossier_png.is_dir():
        print(f"ERREUR — aucune illustration découpée dans {dossier_png}\n"
              f"         Lancer d'abord extraire-illustrations.py --niveau "
              f"{arguments.niveau}", file=sys.stderr)
        return 2

    images = sorted(dossier_png.glob("fiche-*.png"))
    if arguments.fiche is not None:
        images = [i for i in images if i.name == f"fiche-{arguments.fiche:02d}.png"]
    if not images:
        print(f"ERREUR — aucun PNG à vectoriser dans {dossier_png}",
              file=sys.stderr)
        return 2

    destination = brouillons / "svg"
    verifier_destination(destination, racine)
    destination.mkdir(parents=True, exist_ok=True)

    vectorises, refuses = 0, 0
    for image in images:
        cible = destination / (image.stem + ".svg")
        execution = subprocess.run(
            [str(potrace), *OPTIONS_POTRACE, "-o", str(cible), str(image)],
            capture_output=True, text=True)
        if execution.returncode != 0 or not cible.is_file():
            print(f"REFUS  {image.name} — potrace a rendu "
                  f"{execution.returncode} : {execution.stderr.strip()}",
                  file=sys.stderr)
            refuses += 1
            continue

        svg = cible.read_text(encoding="utf-8")
        ouverts = chemins_ouverts(svg)
        if ouverts:
            cible.unlink()
            print(f"REFUS  {image.name} — {len(ouverts)} sous-chemin(s) NON "
                  f"FERMÉ(s), SVG supprimé. Premier : {ouverts[0]!r}\n"
                  f"       Un trait interrompu fait fuiter le remplissage sur "
                  f"toute l'image.", file=sys.stderr)
            refuses += 1
            continue

        vectorises += 1
        print(f"OK     {image.name} -> {cible.relative_to(racine).as_posix()} "
              f"({len(MOTIF_CHEMIN.findall(svg))} chemin(s), tous fermés)")

    print(f"\nSVG produits            : {vectorises}")
    print(f"SVG refusés             : {refuses}")
    print(f"destination             : {destination.relative_to(racine).as_posix()}")
    return 1 if refuses else 0


if __name__ == "__main__":
    sys.exit(principal(sys.argv[1:]))
