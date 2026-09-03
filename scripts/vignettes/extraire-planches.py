"""Extrait les cellules des planches storyboard validées, sans modifier les pixels.

Les planches sont des grilles 3x4 ou 3x3 en 1536x1024. Une bordure blanche de 4 px
est retirée à chaque cellule pour ne pas publier la séparation de la planche.
"""

from pathlib import Path
from PIL import Image


RACINE = Path(__file__).resolve().parents[2]
CELLULES = {
    "galeries-frise": ("galeries-frise-v3.png", 4, [
        "vignette-pot", "vignette-bol", "vignette-panier", "vignette-tas",
        "vignette-dos", "vignette-dame", "vignette-four", "vignette-verre",
        "vignette-sac", "vignette-zebre",
    ]),
    "volcan-fresque": ("volcan-fresque-v3.png", 4, [
        "vignette-cour", "vignette-ruche", "vignette-mouche", "vignette-danse",
        "vignette-quille", "vignette-sac", "vignette-joue", "vignette-montagne",
        "vignette-ligne", "vignette-champignon",
    ]),
    "cite-pellicule-01": ("cite-pellicule-01-v2.png", 3, [
        "vignette-plage", "vignette-seau", "vignette-sable", "vignette-petit",
        "vignette-grand", "vignette-montre", "vignette-plume", "vignette-caillou",
        "vignette-danse",
    ]),
    "cite-pellicule-02": ("cite-pellicule-02-v3.png", 3, [
        "vignette-maison", "vignette-cahier", "vignette-papa", "vignette-table",
        "vignette-compte", "vignette-dessin", "vignette-sac", "vignette-jardin",
        "vignette-lit",
    ]),
    "cite-vitrail": ("cite-vitrail-v3.png", 3, [
        "vignette-nuage", "vignette-pluie", "vignette-riviere", "vignette-lac",
        "vignette-grand", "vignette-soleil", "vignette-petit", "vignette-gros",
        "vignette-jardin",
    ]),
}


def extraire(nom: str) -> None:
    planche, colonnes, ids = CELLULES[nom]
    source = RACINE / "contenu" / "brouillons" / "vignettes" / planche
    destination = RACINE / "contenu" / "assets" / "vignettes" / nom
    destination.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGB")
    if image.size != (1536, 1024):
        raise ValueError(f"{source.name}: taille inattendue {image.size}")
    # Les planches à 10 scènes sont en 4 colonnes × 3 lignes (C11-C12 vides).
    colonnes = 4 if len(ids) == 10 else 3
    lignes = 3
    largeur, hauteur = image.width // colonnes, image.height // lignes
    marge = 4
    # Les cellules de la grille sont 2:1 (3x4) ou 3:2 (3x3). On les centre
    # en 4:3 pour le recadrage DOM, sans publier les séparations blanches.
    largeur_utile = largeur - 2 * marge
    hauteur_utile = int(round(largeur_utile * 3 / 4))
    if hauteur_utile > hauteur - 2 * marge:
        hauteur_utile = hauteur - 2 * marge
        largeur_utile = int(round(hauteur_utile * 4 / 3))
    for index, identifiant in enumerate(ids):
        ligne, colonne = divmod(index, colonnes)
        centre = colonne * largeur + largeur // 2
        gauche = centre - largeur_utile // 2
        haut = ligne * hauteur + (hauteur - hauteur_utile) // 2
        droite = gauche + largeur_utile
        bas = haut + hauteur_utile
        cellule = image.crop((gauche, haut, droite, bas))
        cellule.save(destination / f"{identifiant}.png", format="PNG", optimize=True)


if __name__ == "__main__":
    for nom in CELLULES:
        extraire(nom)
        print(f"OK {nom}: {len(CELLULES[nom][2])} cellules")
