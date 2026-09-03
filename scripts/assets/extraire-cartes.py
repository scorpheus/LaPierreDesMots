"""Découpe les planches de cartes validées en assets stables.

Usage : python scripts/assets/extraire-cartes.py
Les planches sources restent dans contenu/brouillons/cartes (zone de travail ignorée).
Chaque tuile est normalisée en 512×512 pour que le moteur de paires n'ait pas à connaître
la grille de production.
"""

from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
SOURCE = RACINE / "contenu" / "brouillons" / "cartes"
DESTINATION = RACINE / "contenu" / "assets" / "cartes"

PLANCHES = {
    "foret-bestiaire-01.png": ("foret", ["renard", "hibou", "arbre", "feuille", "oiseau", "fleur"]),
    "foret-bestiaire-02.png": ("foret", ["ours", "hibou-gris", "arbre-vert", "enfants", "oiseaux", "etoiles"]),
    "marais.png": ("marais", ["lapin", "matin", "jardin", "sapin", "main", "pain"]),
    "volcan-ill-01.png": ("volcan", ["bille", "fille", "famille", "quille", "feuille", "grenouille"]),
    "volcan-ill-02.png": ("volcan", ["cheval", "cochon", "musique", "vache", "queue", "phare", "dauphin"]),
    "cite.png": ("cite", ["cartable", "ecole", "maitresse", "cahier", "ami", "matin-gris", "cour", "livre"]),
}

BRANCHEMENTS = {
    "foret-muette/bestiaire-paires-01.json": {
        "image-renards": "assets/cartes/foret/renard.png", "image-hiboux": "assets/cartes/foret/hibou.png",
        "image-arbres": "assets/cartes/foret/arbre.png", "image-feuilles": "assets/cartes/foret/feuille.png",
        "image-oiseaux": "assets/cartes/foret/oiseau.png", "image-fleurs": "assets/cartes/foret/fleur.png"},
    "foret-muette/bestiaire-paires-02.json": {
        "image-ours": "assets/cartes/foret/ours.png", "image-hibou": "assets/cartes/foret/hibou-gris.png",
        "image-arbre": "assets/cartes/foret/arbre-vert.png", "image-enfant": "assets/cartes/foret/enfants.png",
        "image-oiseau": "assets/cartes/foret/oiseaux.png", "image-etoile": "assets/cartes/foret/etoiles.png"},
    "marais-jumeau/coquillages-paires-01.json": {
        "image-lapin": "assets/cartes/marais/lapin.png", "image-matin": "assets/cartes/marais/matin.png",
        "image-jardin": "assets/cartes/marais/jardin.png", "image-sapin": "assets/cartes/marais/sapin.png",
        "image-main": "assets/cartes/marais/main.png", "image-pain": "assets/cartes/marais/pain.png"},
    "volcan/geodes-paires-01.json": {
        "image-bille": "assets/cartes/volcan/bille.png", "image-fille": "assets/cartes/volcan/fille.png",
        "image-famille": "assets/cartes/volcan/famille.png", "image-quille": "assets/cartes/volcan/quille.png",
        "image-feuille": "assets/cartes/volcan/feuille.png", "image-grenouille": "assets/cartes/volcan/grenouille.png"},
    "volcan/geodes-paires-02.json": {
        "image-cheval": "assets/cartes/volcan/cheval.png", "image-quille": "assets/cartes/volcan/quille.png",
        "image-cochon": "assets/cartes/volcan/cochon.png", "image-musique": "assets/cartes/volcan/musique.png",
        "image-vache": "assets/cartes/volcan/vache.png", "image-queue": "assets/cartes/volcan/queue.png",
        "image-phare": "assets/cartes/volcan/phare.png", "image-dauphin": "assets/cartes/volcan/dauphin.png"},
    "cite-des-histoires/cartes-paires-01.json": {
        "image-cartable": "assets/cartes/cite/cartable.png", "image-ecole": "assets/cartes/cite/ecole.png",
        "image-maitresse": "assets/cartes/cite/maitresse.png", "image-cahier": "assets/cartes/cite/cahier.png",
        "image-ami": "assets/cartes/cite/ami.png", "image-matin": "assets/cartes/cite/matin-gris.png",
        "image-cour": "assets/cartes/cite/cour.png", "image-livre": "assets/cartes/cite/livre.png"},
}


def extraire(chemin: Path, dossier: str, noms: list[str]) -> None:
    with Image.open(chemin) as planche:
        largeur, hauteur = planche.size
        colonnes = 4 if len(noms) > 6 else 3
        lignes = 2
        largeur_tuile = largeur // colonnes
        hauteur_tuile = hauteur // lignes
        destination = DESTINATION / dossier
        destination.mkdir(parents=True, exist_ok=True)
        for index, nom in enumerate(noms):
            x = (index % colonnes) * largeur_tuile
            y = (index // colonnes) * hauteur_tuile
            tuile = planche.crop((x, y, x + largeur_tuile, y + hauteur_tuile))
            tuile = tuile.resize((512, 512), Image.Resampling.LANCZOS)
            tuile.save(destination / f"{nom}.png", format="PNG", optimize=True)


def main() -> None:
    for fichier, (dossier, noms) in PLANCHES.items():
        extraire(SOURCE / fichier, dossier, noms)
    for fichier, branchement in BRANCHEMENTS.items():
        chemin = RACINE / "contenu" / "exercices" / fichier
        contenu = __import__("json").loads(chemin.read_text(encoding="utf-8"))
        cartes = contenu["jeu"]["contenu"]["cartes"]
        for carte in cartes:
            if carte["id"] in branchement:
                carte["asset"] = branchement[carte["id"]]
        chemin.write_text(__import__("json").dumps(contenu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{sum(len(noms) for _, noms in PLANCHES.values())} cartes extraites dans {DESTINATION}")


if __name__ == "__main__":
    main()
