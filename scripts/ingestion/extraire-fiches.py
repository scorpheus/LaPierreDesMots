#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Ingestion des fiches d'origine — extraction par POSITION, jamais par heuristique.

Lot L2-G du contrat features v2 § 3.7. Ce fichier était le script monolithique du
niveau 1 (lot L-F, contrat v1) ; il est devenu un **AIGUILLEUR** : il choisit le
format d'après `--niveau`, et toute la connaissance d'une mise en page vit dans
`formats/niveau<N>.py`, avec ses mesures citées en tête de fichier.

Transforme un PDF de `Docs/NIVEAU N.pdf` en brouillons JSON, un par fiche, dans
`contenu/brouillons/` ET NULLE PART AILLEURS (annexe P § 6.4 : aucun contenu
n'atteint l'enfant sans relecture parent).

CE QUE FAIT CET AIGUILLEUR
--------------------------
1. Il choisit le format du niveau demandé (`formats/__init__.py`).
2. Il lui donne chaque page, une par une.
3. Il écrit le brouillon rendu, ou consigne le refus avec son **code** et son
   **motif** (vocabulaire fermé de `refus.py`).
4. Il compose le manifeste et **refuse de l'écrire si la comptabilité ne ferme
   pas** : `ingérées + refusées == demandées`, toujours (`manifeste.py`).

CE QU'IL NE FAIT PAS, ET POURQUOI
---------------------------------
Il n'invente rien de ce que le PDF ne porte pas : ni cible `(region, couleur)`
au niveau 1, ni valeur de vérité au niveau 2, ni bonne option aux niveaux 3 et 4,
ni ordre du récit au niveau 5, ni mot manquant au niveau 6. Le niveau 7 est
refusé en entier, par décision de contrat (§ 8, n° 3 — point ouvert O7).
Le passage d'un brouillon à un exercice jouable de `contenu/exercices/` est un
geste humain, pas une sortie de ce script.

USAGE
-----
    .venv\\Scripts\\python.exe scripts\\ingestion\\extraire-fiches.py --niveau 1
    .venv\\Scripts\\python.exe scripts\\ingestion\\extraire-fiches.py --niveau 5 --fiche 1 --verbeux

Codes de sortie : 0 toutes les fiches ingérées · 1 au moins un refus ·
2 erreur d'environnement, d'usage, ou comptabilité ouverte.

La sortie est DÉTERMINISTE : aucun horodatage, aucun aléa, aucun chemin absolu
dans les fichiers produits. Deux exécutions donnent deux fichiers identiques
octet pour octet — c'est ce qui permet d'en faire une référence de test.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# `scripts/ingestion/` n'est pas un paquet installé : on l'ajoute au chemin
# d'import pour que `formats`, `geometrie`, `refus` et `manifeste` se voient,
# quel que soit le répertoire courant. Rien n'est installé hors du dépôt (D9).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from formats import NIVEAUX_QUI_REFUSENT, format_du_niveau  # noqa: E402
from manifeste import (ComptabiliteOuverte, composer, ecrire_json,  # noqa: E402
                       ecrire_manifeste, verifier_destination)
from refus import RefusIngestion  # noqa: E402


def racine_depot() -> Path:
    return Path(__file__).resolve().parents[2]


def analyser_arguments(argv: list[str]) -> argparse.Namespace:
    analyseur = argparse.ArgumentParser(
        prog="extraire-fiches.py",
        description="Ingestion positionnelle des fiches d'origine vers "
                    "contenu/brouillons/.")
    analyseur.add_argument("--niveau", type=int, required=True, choices=range(1, 8),
                           metavar="1..7", help="niveau du PDF à ingérer")
    analyseur.add_argument("--fiche", type=int, default=None,
                           help="n'ingérer qu'une fiche (1 = première page)")
    analyseur.add_argument("--source", type=Path, default=None,
                           help="PDF source (défaut : Docs/NIVEAU <n>.pdf)")
    analyseur.add_argument("--sortie", type=Path, default=None,
                           help="dossier de sortie (défaut : "
                                "contenu/brouillons/niveau-<n>/)")
    analyseur.add_argument("--verbeux", action="store_true",
                           help="détailler chaque fiche sur la sortie standard")
    return analyseur.parse_args(argv)


def principal(argv: list[str]) -> int:
    # La console Windows est en cp1252 par défaut : sans cela, un « é » dans un
    # message de refus fait tomber le script sur un UnicodeEncodeError.
    for flux in (sys.stdout, sys.stderr):
        if hasattr(flux, "reconfigure"):
            flux.reconfigure(encoding="utf-8", errors="replace")

    arguments = analyser_arguments(argv)
    racine = racine_depot()
    format_ = format_du_niveau(arguments.niveau)

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("ERREUR — PyMuPDF absent. Créer le venv du dépôt puis :\n"
              "  .venv\\Scripts\\python.exe -m pip install -r "
              "scripts\\ingestion\\requirements.txt", file=sys.stderr)
        return 2

    source = arguments.source or (racine / "Docs" / f"NIVEAU {arguments.niveau}.pdf")
    if not source.is_file():
        print(f"ERREUR — PDF introuvable : {source}", file=sys.stderr)
        return 2

    destination = (arguments.sortie or (
        racine / "contenu" / "brouillons" / f"niveau-{arguments.niveau}")).resolve()
    verifier_destination(destination, racine)

    nom_source = f"fiches-origine/{source.name}"
    document = fitz.open(source)

    pages = ([arguments.fiche] if arguments.fiche
             else list(range(1, document.page_count + 1)))
    hors_bornes = [n for n in pages if n < 1 or n > document.page_count]
    if hors_bornes:
        print(f"ERREUR — fiche {hors_bornes[0]} hors du PDF "
              f"({document.page_count} pages)", file=sys.stderr)
        return 2

    if arguments.niveau in NIVEAUX_QUI_REFUSENT:
        print(f"NOTE   — le niveau {arguments.niveau} refuse TOUTES ses fiches "
              f"par décision de contrat, pas par défaut de mise en page.\n"
              f"         {format_.REGLES_DE_STRUCTURE['pointOuvert']}",
              file=sys.stderr)

    reussies: list[dict] = []
    refusees: list[dict] = []
    agregats = format_.agregats_initiaux()

    for numero in pages:
        try:
            brouillon = format_.extraire(document[numero - 1], numero,
                                         arguments.niveau, nom_source)
        except RefusIngestion as refus:
            refusees.append(refus.en_dictionnaire(numero))
            print(f"REFUS  fiche {numero:2d} [{refus.code}] — {refus}",
                  file=sys.stderr)
            continue

        chemin = destination / f"fiche-{numero:02d}.json"
        ecrire_json(chemin, brouillon)
        format_.cumuler(agregats, brouillon)
        for avertissement in brouillon["avertissements"]:
            print(f"ALERTE fiche {numero:2d} — {avertissement}", file=sys.stderr)
        reussies.append(format_.resume_fiche(
            numero, chemin.relative_to(racine).as_posix(), brouillon))
        if arguments.verbeux:
            print(f"OK     fiche {numero:2d} — "
                  f"{chemin.relative_to(racine).as_posix()}")
            for ligne in format_.detail_verbeux(brouillon):
                print(f"           {ligne}")

    manifeste = composer(nom_source, arguments.niveau, document.page_count,
                         len(pages), reussies, refusees, agregats,
                         format_.REGLES_DE_STRUCTURE)
    document.close()

    chemin_manifeste = destination / "manifeste.json"
    try:
        ecrire_manifeste(chemin_manifeste, manifeste)
    except ComptabiliteOuverte as erreur:
        print(f"ERREUR — {erreur}", file=sys.stderr)
        return 2

    print(f"\nniveau               : {arguments.niveau} — {format_.LIBELLE}")
    print(f"fiches ingérées      : {len(reussies)} / {len(pages)}")
    print(f"fiches refusées      : {len(refusees)}")
    for cle, valeur in agregats.items():
        etiquette = cle if len(cle) <= 20 else cle[:20]
        rendu = (json.dumps(valeur, ensure_ascii=False)
                 if isinstance(valeur, dict) else valeur)
        print(f"{etiquette:21s}: {rendu}")
    print(f"écart de comptabilité: 0  (ingérées + refusées == demandées)")
    print(f"manifeste            : "
          f"{chemin_manifeste.relative_to(racine).as_posix()}")
    return 1 if refusees else 0


if __name__ == "__main__":
    sys.exit(principal(sys.argv[1:]))
