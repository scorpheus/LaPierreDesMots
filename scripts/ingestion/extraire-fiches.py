#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Ingestion des fiches d'origine — extraction par POSITION, jamais par heuristique.

Lot L-F du contrat technique v1. Transforme un PDF de `Docs/NIVEAU N.pdf` en
brouillons JSON, un par fiche, dans `contenu/brouillons/` ET NULLE PART AILLEURS
(annexe P § 6.4 : aucun contenu n'atteint l'enfant sans relecture parent).

CE QUE FAIT CE SCRIPT
---------------------
1. Il lit les positions (`x`, `y`) de chaque fragment de texte, pas leur sens.
2. Il sépare les deux colonnes de la fiche à `x = SEPARATION_COLONNES_X`.
3. Il regroupe les lignes en items par ÉCART VERTICAL mesuré, pas par numérotation
   (les numéros de consigne ne sont pas du texte dans ces PDF).
4. Il classe chaque consigne d'action en `colorie` / `place` / `autre`.
5. Il REFUSE d'écrire une fiche dont la structure attendue n'est pas retrouvée.

CE QU'IL NE FAIT PAS, ET POURQUOI
---------------------------------
Il n'invente AUCUNE cible `(region, couleur)`. Les identifiants de région du
décor SVG n'existent pas dans le PDF : les déduire serait fabriquer du faux.
Le brouillon porte donc `statut = "brouillon-non-jouable"` et la liste de ce qui
reste à faire à la main. Le passage d'un brouillon à un exercice jouable de
`contenu/exercices/` est un geste humain, pas une sortie de ce script.

SOURCES QUI FONT FOI, RECOPIÉES ICI ET NON RECALCULÉES
------------------------------------------------------
- Docs/fiches-origine-analyse.md § 1 et § 3 : 7 PDF x 15 fiches, A4 594 x 834 pt,
  séparation des colonnes à x = 300, illustration en bbox (52,182)-(567,526).
- Docs/contrat-technique-v1.md § 9.2 : le corps de la fiche est sous y = 575.
Ces valeurs sont des CONSTANTES de ce fichier ; le script vérifie qu'il les
retrouve et refuse la fiche sinon — il ne les ré-estime pas.

USAGE
-----
    .venv\\Scripts\\python.exe scripts\\ingestion\\extraire-fiches.py --niveau 1
    .venv\\Scripts\\python.exe scripts\\ingestion\\extraire-fiches.py --niveau 1 --fiche 1 --verbeux

Codes de sortie : 0 toutes les fiches ingérées · 1 au moins un refus ·
2 erreur d'environnement ou d'usage.

La sortie est DÉTERMINISTE : aucun horodatage, aucun aléa, aucun chemin absolu
dans les fichiers produits. Deux exécutions donnent deux fichiers identiques
octet pour octet — c'est ce qui permet d'en faire une référence de test.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------
# Constantes de structure. Toute valeur ici vient d'une source qui fait foi,
# citée en tête de fichier. Elles ne sont jamais ré-estimées à l'exécution.
# --------------------------------------------------------------------------

#: Frontière des deux colonnes, fiches-origine-analyse.md § 1.
SEPARATION_COLONNES_X = 300.0

#: Le corps de la fiche commence sous cette ordonnée (contrat v1 § 9.2).
#: Sert de garde-fou : la valeur réellement utilisée est dérivée des en-têtes.
Y_CORPS_ATTENDU = 575.0

#: Tolérance sur la dérivation de `Y_CORPS_ATTENDU` depuis les en-têtes.
Y_CORPS_TOLERANCE = 15.0

#: Marge sous le bas des en-têtes de colonne, pour ne pas les reprendre.
MARGE_APRES_ENTETE = 2.0

#: Deux fragments dont les ordonnées diffèrent de moins que cela sont sur la
#: même ligne. Mesuré : les fragments d'une même ligne sont à moins de 3 pt.
TOLERANCE_LIGNE_Y = 3.0

#: Deux lignes séparées de AU PLUS cet écart appartiennent au même item
#: (repli de ligne). Mesuré sur les 15 fiches du niveau 1 : écart intra
#: maximal = 16,5 pt.
ECART_REPLI_MAX = 18.0

#: Deux lignes séparées de AU MOINS cet écart sont deux items distincts.
#: Mesuré sur les 15 fiches du niveau 1 : écart inter minimal = 21,7 pt.
ECART_ITEM_MIN = 20.0

# Entre les deux, la structure est AMBIGUË : le script refuse la fiche plutôt
# que de trancher au hasard. Aucun écart mesuré sur le niveau 1 n'y tombe.

#: Aire minimale, en pt², du bloc image tenu pour l'illustration de la fiche.
AIRE_ILLUSTRATION_MINI = 50_000.0

#: Repères textuels des deux en-têtes de colonne, comparés sans accents ni casse.
REPERE_COLONNE_GAUCHE = "je lis"
REPERE_COLONNE_DROITE = "ponds vrai"

#: Verbes qui font d'une consigne un PLACEMENT (moteur `place`, point ouvert O6).
#: Liste fermée des formes réellement attestées dans le corpus du niveau 1 —
#: on n'y ajoute pas de verbe supposé, sous peine de classer du vent.
VERBES_PLACEMENT = ("dessine", "dessinez", "ecris", "ecrivez", "colle", "collez")

#: Verbes qui font d'une consigne un COLORIAGE explicite.
VERBES_COLORIAGE = ("colorie", "coloriez")

#: Lexique des couleurs : forme normalisée (sans accent, minuscule) -> couleur
#: canonique du nuancier de coloriage (contrat v1 § 9.3, 11 couleurs).
#: Table fermée et explicite : aucune racinisation, aucune devinette.
LEXIQUE_COULEURS: dict[str, str] = {}
for _canonique, _formes in {
    "rouge":  ("rouge", "rouges"),
    "orange": ("orange", "oranges"),
    "jaune":  ("jaune", "jaunes"),
    "vert":   ("vert", "verte", "verts", "vertes"),
    "bleu":   ("bleu", "bleue", "bleus", "bleues"),
    "violet": ("violet", "violette", "violets", "violettes"),
    "rose":   ("rose", "roses"),
    "brun":   ("brun", "brune", "bruns", "brunes",
               "marron", "marrons"),
    "noir":   ("noir", "noire", "noirs", "noires"),
    "blanc":  ("blanc", "blanche", "blancs", "blanches"),
    "gris":   ("gris", "grise", "grises"),
}.items():
    for _forme in _formes:
        LEXIQUE_COULEURS[_forme] = _canonique

#: Mots de couleur volontairement NON canonisés : ils désignent une couleur sans
#: en nommer une. Signalés dans le brouillon, jamais traduits d'office.
COULEURS_IMPRECISES = ("multicolore", "multicolores", "or", "dore", "doree",
                       "clair", "claire", "fonce", "foncee")


# --------------------------------------------------------------------------
# Outillage
# --------------------------------------------------------------------------

class RefusIngestion(Exception):
    """La structure attendue n'a pas été retrouvée : on n'écrit rien."""


def sans_accents(texte: str) -> str:
    """Minuscule sans diacritiques, pour la comparaison seulement.
    Le texte écrit dans le brouillon garde ses accents et son apostrophe ’."""
    decompose = unicodedata.normalize("NFD", texte.lower())
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn")


def normaliser_espaces(texte: str) -> str:
    """Espaces multiples, insécables et fines réduits à une espace simple."""
    for espace in (" ", " ", " ", "​", "‌", "\t"):
        texte = texte.replace(espace, " ")
    return " ".join(texte.split())


def mots_normalises(texte: str) -> list[str]:
    """Découpe en mots comparables : sans accents, sans ponctuation."""
    brut = sans_accents(texte)
    courant: list[str] = []
    mots: list[str] = []
    for caractere in brut:
        if caractere.isalnum():
            courant.append(caractere)
        elif courant:
            mots.append("".join(courant))
            courant = []
    if courant:
        mots.append("".join(courant))
    return mots


# --------------------------------------------------------------------------
# Extraction positionnelle
# --------------------------------------------------------------------------

@dataclass
class Fragment:
    """Un `span` PyMuPDF réduit à ce dont la structure a besoin."""
    x0: float
    x1: float
    y0: float
    y1: float
    texte: str


@dataclass
class Ligne:
    """Une ligne de la fiche, fragments recollés dans l'ordre des `x`."""
    y: float
    texte: str
    douteuse: bool = False


@dataclass
class Item:
    """Une consigne ou une affirmation, une fois les replis de ligne recollés."""
    y: float
    texte: str
    nb_lignes: int
    douteux: bool = False


@dataclass
class Fiche:
    numero: int
    page: int
    consignes: list[Item]
    affirmations: list[Item]
    illustration: dict
    avertissements: list[str] = field(default_factory=list)


def lire_fragments(page) -> list[Fragment]:
    fragments: list[Fragment] = []
    for bloc in page.get_text("dict")["blocks"]:
        if bloc.get("type") != 0:
            continue
        for ligne in bloc.get("lines", ()):
            for span in ligne.get("spans", ()):
                texte = normaliser_espaces(span.get("text", ""))
                if not texte:
                    continue
                x0, y0, x1, y1 = span["bbox"]
                fragments.append(Fragment(x0=x0, x1=x1, y0=y0, y1=y1, texte=texte))
    return fragments


def reperer_entetes(fragments: list[Fragment]) -> float:
    """Retourne l'ordonnée sous laquelle commence le corps de la fiche.

    Dérivée des DEUX en-têtes de colonne, et vérifiée contre la valeur de
    référence du contrat. Refuse si un en-tête manque ou est mal placé.
    """
    gauche = [f for f in fragments
              if REPERE_COLONNE_GAUCHE in sans_accents(f.texte)
              and f.x0 < SEPARATION_COLONNES_X]
    droite = [f for f in fragments
              if REPERE_COLONNE_DROITE in sans_accents(f.texte)
              and f.x0 >= SEPARATION_COLONNES_X]
    if not gauche:
        raise RefusIngestion(
            "en-tête « Je lis, je fais » introuvable à gauche de "
            f"x={SEPARATION_COLONNES_X:g}")
    if not droite:
        raise RefusIngestion(
            "en-tête « Réponds vrai V ou faux F » introuvable à droite de "
            f"x={SEPARATION_COLONNES_X:g}")

    # Le corps commence sous le BAS des deux en-têtes, pas sous leur sommet :
    # ils sont composés en gros corps (mesuré : y0 = 547,0 et y1 = 572,6 sur les
    # 15 fiches du niveau 1, alors que la première ligne de corps est à 581,1).
    y_entete = max(f.y1 for f in gauche + droite)
    y_corps = y_entete + MARGE_APRES_ENTETE
    if abs(y_corps - Y_CORPS_ATTENDU) > Y_CORPS_TOLERANCE:
        raise RefusIngestion(
            f"début du corps dérivé à y={y_corps:.1f}, hors de "
            f"{Y_CORPS_ATTENDU:g} ± {Y_CORPS_TOLERANCE:g} : la mise en page "
            "n'est pas celle du niveau 1")
    return y_corps


def grouper_en_lignes(fragments: list[Fragment],
                      avertissements: list[str],
                      colonne: str) -> list[Ligne]:
    """Recolle les fragments d'une même ligne, dans l'ordre des `x`.

    Un fragment dont la plage horizontale est STRICTEMENT INCLUSE dans celle
    d'un autre fragment de la même ligne est une SURIMPRESSION : le PDF dessine
    un mot par-dessus un blanc réservé (mesuré fiche 6 du niveau 1, le mot
    « glace » posé sur une suite d'espaces). Sa place dans la phrase n'est pas
    déterminable par position. On recolle quand même — le résultat reste
    déterministe — mais la ligne est marquée douteuse, et le texte ne sera pas
    présenté comme fiable.
    """
    paquets: list[list[Fragment]] = []
    for fragment in sorted(fragments, key=lambda f: (f.y0, f.x0)):
        if paquets and abs(fragment.y0 - paquets[-1][0].y0) <= TOLERANCE_LIGNE_Y:
            paquets[-1].append(fragment)
        else:
            paquets.append([fragment])

    lignes: list[Ligne] = []
    for paquet in paquets:
        ordonnee = min(f.y0 for f in paquet)
        ordonnes = sorted(paquet, key=lambda f: f.x0)
        douteuse = False
        for interieur in ordonnes:
            for exterieur in ordonnes:
                if interieur is exterieur:
                    continue
                if exterieur.x0 < interieur.x0 and interieur.x1 < exterieur.x1:
                    douteuse = True
                    avertissements.append(
                        f"colonne {colonne}, y={ordonnee:.1f} : fragment "
                        f"{interieur.texte.strip()!r} en surimpression sur "
                        f"{exterieur.texte.strip()!r} — place dans la phrase non "
                        "déterminable par position, texte à reprendre à la main")
        texte = normaliser_espaces(" ".join(f.texte for f in ordonnes))
        lignes.append(Ligne(y=ordonnee, texte=texte, douteuse=douteuse))
    return lignes


def grouper_en_items(lignes: list[Ligne], colonne: str) -> list[Item]:
    """Regroupe les lignes en items par écart vertical mesuré.

    Refuse si un écart tombe dans la bande ambiguë : mieux vaut ne rien écrire
    que de couper une consigne en deux, ou d'en coller deux ensemble.
    """
    items: list[Item] = []
    derniere_ordonnee: float | None = None
    for ligne in lignes:
        if derniere_ordonnee is None:
            items.append(Item(y=ligne.y, texte=ligne.texte, nb_lignes=1,
                              douteux=ligne.douteuse))
        else:
            ecart = ligne.y - derniere_ordonnee
            if ecart <= ECART_REPLI_MAX:
                items[-1].texte = normaliser_espaces(
                    items[-1].texte + " " + ligne.texte)
                items[-1].nb_lignes += 1
                items[-1].douteux = items[-1].douteux or ligne.douteuse
            elif ecart >= ECART_ITEM_MIN:
                items.append(Item(y=ligne.y, texte=ligne.texte, nb_lignes=1,
                                  douteux=ligne.douteuse))
            else:
                raise RefusIngestion(
                    f"colonne {colonne} : écart vertical ambigu de {ecart:.1f} pt "
                    f"à y={ligne.y:.1f} (ni repli ≤ {ECART_REPLI_MAX:g}, ni item "
                    f"≥ {ECART_ITEM_MIN:g}) — structure non tranchable")
        derniere_ordonnee = ligne.y
    return items


def reperer_illustration(page) -> dict:
    """Bloc image de la fiche, avec sa taille en pixels — celle qui fixera le
    `viewBox` de l'habillage. Refuse s'il n'y en a pas exactement un."""
    candidats = []
    for bloc in page.get_text("dict")["blocks"]:
        if bloc.get("type") == 0:
            continue
        x0, y0, x1, y1 = bloc["bbox"]
        if (x1 - x0) * (y1 - y0) >= AIRE_ILLUSTRATION_MINI:
            candidats.append((x0, y0, x1, y1, bloc.get("width"), bloc.get("height")))
    if len(candidats) != 1:
        raise RefusIngestion(
            f"{len(candidats)} illustration(s) de plus de "
            f"{AIRE_ILLUSTRATION_MINI:g} pt² au lieu d'une seule")
    x0, y0, x1, y1, largeur, hauteur = candidats[0]
    if not largeur or not hauteur:
        raise RefusIngestion("illustration sans dimension en pixels")
    return {
        "bboxPt": [round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)],
        "pixels": [int(largeur), int(hauteur)],
        "viewBoxPropose": f"0 0 {int(largeur)} {int(hauteur)}",
    }


def extraire_fiche(page, numero: int) -> Fiche:
    fragments = lire_fragments(page)
    if not fragments:
        raise RefusIngestion("aucun texte extractible (fiche scannée ?)")

    y_corps = reperer_entetes(fragments)
    corps = [f for f in fragments if f.y0 > y_corps]
    if not corps:
        raise RefusIngestion(f"aucun texte sous y={y_corps:.1f}")

    a_cheval = [f for f in corps if f.x0 < SEPARATION_COLONNES_X < f.x1]
    if a_cheval:
        raise RefusIngestion(
            f"{len(a_cheval)} fragment(s) à cheval sur la séparation "
            f"x={SEPARATION_COLONNES_X:g} : les colonnes ne sont pas séparables "
            f"par position (premier : {a_cheval[0].texte!r})")

    avertissements: list[str] = []
    gauche = grouper_en_items(
        grouper_en_lignes([f for f in corps if f.x0 < SEPARATION_COLONNES_X],
                          avertissements, "gauche"),
        "gauche")
    droite = grouper_en_items(
        grouper_en_lignes([f for f in corps if f.x0 >= SEPARATION_COLONNES_X],
                          avertissements, "droite"),
        "droite")

    if not gauche:
        raise RefusIngestion("colonne gauche vide : aucune consigne d'action")
    if not droite:
        raise RefusIngestion("colonne droite vide : aucune affirmation")

    return Fiche(
        numero=numero,
        page=numero,
        consignes=gauche,
        affirmations=droite,
        illustration=reperer_illustration(page),
        avertissements=avertissements,
    )


# --------------------------------------------------------------------------
# Classement des consignes
# --------------------------------------------------------------------------

def classer_consigne(texte: str) -> dict:
    """Classe une consigne d'action en `colorie` / `place` / `autre`.

    Règle ordonnée, écrite ici en toutes lettres pour qu'elle soit opposable :

    1. `place`   — la consigne commence par un verbe d'AJOUT d'élément
                   (« Dessine un soleil… »). Ces 7 consignes du niveau 1 relèvent
                   du moteur `place`, qui n'existe pas encore (fiches-origine § 5,
                   F1 ; contrat v1 § 12, écart n° 3).
    2. `colorie` — la consigne nomme au moins une couleur du nuancier.
    3. `autre`   — tout le reste, à trancher à la main.

    `mixte` signale une consigne qui relève des deux (« colorie le ciel en noir
    ET dessine la lune ») : elle sera à SCINDER, pas à ranger d'un côté.
    """
    mots = mots_normalises(texte)
    premier = mots[0] if mots else ""

    couleurs: list[str] = []
    for mot in mots:
        canonique = LEXIQUE_COULEURS.get(mot)
        if canonique and canonique not in couleurs:
            couleurs.append(canonique)

    verbes_place = [m for m in mots if m in VERBES_PLACEMENT]
    verbes_colorie = [m for m in mots if m in VERBES_COLORIAGE]
    imprecis = [m for m in mots if m in COULEURS_IMPRECISES]

    if premier in VERBES_PLACEMENT:
        type_consigne = "place"
    elif couleurs:
        type_consigne = "colorie"
    else:
        type_consigne = "autre"

    return {
        "type": type_consigne,
        "mixte": bool(verbes_place) and bool(couleurs),
        "forme": "imperative" if (premier in VERBES_PLACEMENT
                                  or premier in VERBES_COLORIAGE) else "affirmative",
        "couleurs": couleurs,
        "verbesPlacement": verbes_place,
        "verbesColoriage": verbes_colorie,
        "couleursImprecises": imprecis,
    }


# --------------------------------------------------------------------------
# Écriture des brouillons
# --------------------------------------------------------------------------

A_FAIRE_A_LA_MAIN = [
    "associer chaque consigne à ses couples (region, couleur) du décor SVG",
    "vectoriser l'illustration et nommer ses régions fermées",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]


def brouillon_de_fiche(fiche: Fiche, niveau: int, nom_source: str) -> dict:
    consignes = []
    for rang, item in enumerate(fiche.consignes, start=1):
        classement = classer_consigne(item.texte)
        consignes.append({
            "rang": rang,
            "texte": item.texte,
            "type": classement["type"],
            "mixte": classement["mixte"],
            "forme": classement["forme"],
            "couleurs": classement["couleurs"],
            "verbesPlacement": classement["verbesPlacement"],
            "verbesColoriage": classement["verbesColoriage"],
            "couleursImprecises": classement["couleursImprecises"],
            "texteFiable": not item.douteux,
            "nbLignes": item.nb_lignes,
            "y": round(item.y, 1),
        })
    affirmations = [
        {"rang": rang, "texte": item.texte, "texteFiable": not item.douteux,
         "nbLignes": item.nb_lignes, "y": round(item.y, 1)}
        for rang, item in enumerate(fiche.affirmations, start=1)
    ]
    return {
        "statut": "brouillon-non-jouable",
        "raison": "aucune cible (region, couleur) n'est déductible du PDF : "
                  "les identifiants de région appartiennent au décor SVG, pas à la fiche",
        "origine": {"source": nom_source, "niveau": niveau, "fiche": fiche.numero,
                    "page": fiche.page},
        "illustration": fiche.illustration,
        "consignes": consignes,
        "affirmations": affirmations,
        "compte": {"consignes": len(consignes), "affirmations": len(affirmations)},
        "aFaireALaMain": list(A_FAIRE_A_LA_MAIN),
        "avertissements": fiche.avertissements,
    }


def ecrire_json(chemin: Path, donnees: dict) -> None:
    chemin.parent.mkdir(parents=True, exist_ok=True)
    with chemin.open("w", encoding="utf-8", newline="\n") as flux:
        json.dump(donnees, flux, ensure_ascii=False, indent=2, sort_keys=False)
        flux.write("\n")


def verifier_destination(destination: Path, racine: Path) -> None:
    """Garde-fou dur : on n'écrit QUE sous `contenu/brouillons/`.

    Annexe P § 6.4 et CLAUDE.md : aucune écriture directe dans
    `contenu/exercices/`, `contenu/habillages/` ou `contenu/audio/`.
    """
    autorisee = (racine / "contenu" / "brouillons").resolve()
    cible = destination.resolve()
    if autorisee != cible and autorisee not in cible.parents:
        raise SystemExit(
            f"REFUS — destination {cible} hors de {autorisee}. Tout contenu "
            "produit par un agent passe par contenu/brouillons/ puis par la "
            "relecture parent (annexe P § 6.4).")


# --------------------------------------------------------------------------
# Point d'entrée
# --------------------------------------------------------------------------

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

    destination = arguments.sortie or (
        racine / "contenu" / "brouillons" / f"niveau-{arguments.niveau}")
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

    reussies: list[dict] = []
    refusees: list[dict] = []
    total_consignes = 0
    total_affirmations = 0
    total_douteux = 0
    par_type: dict[str, int] = {"colorie": 0, "place": 0, "autre": 0}

    for numero in pages:
        try:
            fiche = extraire_fiche(document[numero - 1], numero)
            brouillon = brouillon_de_fiche(fiche, arguments.niveau, nom_source)
        except RefusIngestion as refus:
            refusees.append({"fiche": numero, "motif": str(refus)})
            print(f"REFUS  fiche {numero:2d} — {refus}", file=sys.stderr)
            continue

        chemin = destination / f"fiche-{numero:02d}.json"
        ecrire_json(chemin, brouillon)
        total_consignes += len(brouillon["consignes"])
        total_affirmations += len(brouillon["affirmations"])
        for consigne in brouillon["consignes"]:
            par_type[consigne["type"]] += 1
        total_douteux += sum(
            1 for item in brouillon["consignes"] + brouillon["affirmations"]
            if not item["texteFiable"])
        for avertissement in brouillon["avertissements"]:
            print(f"ALERTE fiche {numero:2d} — {avertissement}", file=sys.stderr)
        reussies.append({
            "fiche": numero,
            "fichier": chemin.relative_to(racine).as_posix(),
            "consignes": len(brouillon["consignes"]),
            "affirmations": len(brouillon["affirmations"]),
        })
        if arguments.verbeux:
            print(f"OK     fiche {numero:2d} — "
                  f"{len(brouillon['consignes'])} consignes, "
                  f"{len(brouillon['affirmations'])} affirmations "
                  f"-> {chemin.relative_to(racine).as_posix()}")
            for consigne in brouillon["consignes"]:
                marque = " MIXTE" if consigne["mixte"] else ""
                print(f"           [{consigne['type']:7s}]{marque} "
                      f"{consigne['texte']}")

    manifeste = {
        "source": nom_source,
        "niveau": arguments.niveau,
        "fichesDuPdf": document.page_count,
        "fichesDemandees": len(pages),
        "fichesIngerees": len(reussies),
        "fichesRefusees": len(refusees),
        "totalConsignes": total_consignes,
        "totalAffirmations": total_affirmations,
        "textesNonFiables": total_douteux,
        "consignesParType": par_type,
        "reglesDeStructure": {
            "separationColonnesX": SEPARATION_COLONNES_X,
            "yCorpsAttendu": Y_CORPS_ATTENDU,
            "toleranceLigneY": TOLERANCE_LIGNE_Y,
            "ecartRepliMax": ECART_REPLI_MAX,
            "ecartItemMin": ECART_ITEM_MIN,
        },
        "fiches": reussies,
        "refus": refusees,
    }
    ecrire_json(destination / "manifeste.json", manifeste)
    document.close()

    print(f"\nfiches ingérées      : {len(reussies)} / {len(pages)}")
    print(f"fiches refusées      : {len(refusees)}")
    print(f"consignes extraites  : {total_consignes}")
    print(f"affirmations         : {total_affirmations}")
    print(f"textes non fiables   : {total_douteux}")
    print(f"consignes par type   : {json.dumps(par_type, ensure_ascii=False)}")
    print(f"manifeste            : "
          f"{(destination / 'manifeste.json').relative_to(racine).as_posix()}")
    return 1 if refusees else 0


if __name__ == "__main__":
    sys.exit(principal(sys.argv[1:]))
