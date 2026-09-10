#!/usr/bin/env python
"""Détoure les dix rendus raster de Gobi sans toucher au personnage ni à ses couleurs."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image


RACINE = Path(__file__).resolve().parents[2]
SOURCES = RACINE / "production" / "personnages" / "gobi" / "stades"
CIBLE_PRODUCTION = RACINE / "contenu" / "assets" / "gobi" / "stades"
BAC_A_SABLE = RACINE / "bac-a-sable"


def est_fond(pixel: tuple[int, int, int, int]) -> bool:
    rouge, vert, bleu, _ = pixel
    return min(rouge, vert, bleu) >= 205 and max(rouge, vert, bleu) - min(rouge, vert, bleu) <= 55


def detourer(source: Path) -> tuple[Image.Image, dict[str, int | str]]:
    image = Image.open(source).convert("RGBA")
    largeur, hauteur = image.size
    pixels = image.load()
    visites = bytearray(largeur * hauteur)
    file: deque[tuple[int, int]] = deque()

    def ajouter(x: int, y: int) -> None:
        index = y * largeur + x
        if visites[index] == 0 and est_fond(pixels[x, y]):
            visites[index] = 1
            file.append((x, y))

    for x in range(largeur):
        ajouter(x, 0)
        ajouter(x, hauteur - 1)
    for y in range(1, hauteur - 1):
        ajouter(0, y)
        ajouter(largeur - 1, y)

    while file:
        x, y = file.popleft()
        if x > 0:
            ajouter(x - 1, y)
        if x + 1 < largeur:
            ajouter(x + 1, y)
        if y > 0:
            ajouter(x, y - 1)
        if y + 1 < hauteur:
            ajouter(x, y + 1)

    indices_fond = [index for index, visite in enumerate(visites) if visite]
    if not indices_fond:
        raise RuntimeError(f"Aucun fond connecté détecté dans {source}.")
    fond = tuple(
        sum(pixels[index % largeur, index // largeur][canal] for index in indices_fond)
        / len(indices_fond)
        for canal in range(3)
    )

    resultat = image.copy()
    sortie = resultat.load()
    transparents = 0
    transitions = 0
    for y in range(hauteur):
        for x in range(largeur):
            index = y * largeur + x
            if visites[index]:
                sortie[x, y] = (0, 0, 0, 0)
                transparents += 1
                continue

            touche_fond = any(
                0 <= x + dx < largeur
                and 0 <= y + dy < hauteur
                and visites[(y + dy) * largeur + x + dx]
                for dx, dy in ((-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1))
            )
            if not touche_fond:
                continue

            rouge, vert, bleu, _ = pixels[x, y]
            distance = ((rouge - fond[0]) ** 2 + (vert - fond[1]) ** 2 + (bleu - fond[2]) ** 2) ** 0.5
            alpha = max(0, min(255, round(((distance - 6) / 58) * 255)))
            if alpha >= 255:
                continue
            if alpha == 0:
                sortie[x, y] = (0, 0, 0, 0)
                transparents += 1
                continue
            facteur = alpha / 255
            canaux = tuple(
                max(0, min(255, round((valeur - fond[canal] * (1 - facteur)) / facteur)))
                for canal, valeur in enumerate((rouge, vert, bleu))
            )
            sortie[x, y] = (*canaux, alpha)
            transitions += 1

    resultat = resultat.resize((512, 512), Image.Resampling.LANCZOS)
    alpha = resultat.getchannel("A")
    minimum, maximum = alpha.getextrema()
    if minimum != 0 or maximum != 255 or alpha.getpixel((0, 0)) != 0:
        raise RuntimeError(f"Canal alpha invalide après détourage de {source}.")
    return resultat, {
        "source": source.relative_to(RACINE).as_posix(),
        "fond_transparent_pixels_1024": transparents,
        "transition_pixels_1024": transitions,
    }


def est_destination_autorisee(destination: Path) -> bool:
    destination = destination.resolve()
    return destination == CIBLE_PRODUCTION.resolve() or destination.is_relative_to(BAC_A_SABLE.resolve())


def principal() -> None:
    analyseur = argparse.ArgumentParser()
    analyseur.add_argument("destination", type=Path)
    arguments = analyseur.parse_args()
    destination = arguments.destination.resolve()
    if not est_destination_autorisee(destination):
        raise RuntimeError("La sortie doit être le dossier publié de Gobi ou un sous-dossier de bac-a-sable/.")
    destination.mkdir(parents=True, exist_ok=True)

    rapport: list[dict[str, int | str]] = []
    for rang in range(1, 11):
        source = SOURCES / f"stade-{rang}.png"
        cible = destination / f"stade-{rang}.webp"
        image, mesure = detourer(source)
        image.save(cible, "WEBP", quality=92, method=6, exact=True)
        relue = Image.open(cible)
        if relue.mode != "RGBA" or relue.getchannel("A").getpixel((0, 0)) != 0:
            raise RuntimeError(f"{cible} a perdu son alpha à l’encodage WebP.")
        empreinte = hashlib.sha256(cible.read_bytes()).hexdigest()
        rapport.append({
            **mesure,
            "cible": cible.relative_to(RACINE).as_posix(),
            "mode": relue.mode,
            "largeur": relue.width,
            "hauteur": relue.height,
            "empreinte_fichier": f"sha256:{empreinte}",
        })
        print(f"stade-{rang}.webp : RGBA 512×512, coin transparent, {empreinte[:12]}…")

    chemin_rapport = BAC_A_SABLE / "detourage-gobi" / "rapport.json"
    chemin_rapport.parent.mkdir(parents=True, exist_ok=True)
    chemin_rapport.write_text(json.dumps(rapport, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Rapport : {chemin_rapport.relative_to(RACINE).as_posix()}")


if __name__ == "__main__":
    principal()
