# -*- coding: utf-8 -*-
"""Format du NIVEAU 1 — « Je lis, je fais » + « Réponds vrai V ou faux F ».

EXTRACTION À L'IDENTIQUE DE L'EXISTANT — contrat features v2 § 3.7, en toutes
lettres : « aucune règle modifiée ». Ce fichier est le déménagement du code de
`extraire-fiches.py` (lot L-F, contrat v1), pas sa réécriture. Les constantes,
l'ordre des règles, le libellé des refus et l'ordre des clés JSON sont ceux
d'avant. **Le manifeste du niveau 1 doit rester identique au bit près**, et
c'est le contrat de sortie de la première étape du lot.

SOURCES QUI FONT FOI, RECOPIÉES ICI ET NON RECALCULÉES
------------------------------------------------------
- Docs/fiches-origine-analyse.md § 1 et § 3 : 7 PDF x 15 fiches, A4 594 x 834 pt,
  séparation des colonnes à x = 300, illustration en bbox (52,182)-(567,526).
- Docs/contrat-technique-v1.md § 9.2 : le corps de la fiche est sous y = 575.

CE QU'IL NE FAIT PAS, ET POURQUOI
---------------------------------
Il n'invente AUCUNE cible `(region, couleur)`. Les identifiants de région du
décor SVG n'existent pas dans le PDF : les déduire serait fabriquer du faux.
"""

from __future__ import annotations

from formats.commun import (Fragment, grouper_en_items, grouper_en_lignes,
                            mots_normalises, sans_accents)
from geometrie import exiger_colonnes_separables, illustration_unique, lire_fragments
from refus import RefusIngestion

NIVEAU = 1
LIBELLE = "scène dessinée : consignes d'action + affirmations vrai/faux sur l'image"
MOTEUR_CIBLE = "colorie"
MODE_REPONSE = "coloriage"

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

A_FAIRE_A_LA_MAIN = [
    "associer chaque consigne à ses couples (region, couleur) du décor SVG",
    "vectoriser l'illustration et nommer ses régions fermées",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]

#: Ce que le manifeste du niveau 1 déclare de sa structure. Ordre des clés figé.
REGLES_DE_STRUCTURE = {
    "separationColonnesX": SEPARATION_COLONNES_X,
    "yCorpsAttendu": Y_CORPS_ATTENDU,
    "toleranceLigneY": TOLERANCE_LIGNE_Y,
    "ecartRepliMax": ECART_REPLI_MAX,
    "ecartItemMin": ECART_ITEM_MIN,
}


# --------------------------------------------------------------------------
# Extraction positionnelle
# --------------------------------------------------------------------------

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
            "repere-introuvable",
            "en-tête « Je lis, je fais » introuvable à gauche de "
            f"x={SEPARATION_COLONNES_X:g}")
    if not droite:
        raise RefusIngestion(
            "repere-introuvable",
            "en-tête « Réponds vrai V ou faux F » introuvable à droite de "
            f"x={SEPARATION_COLONNES_X:g}")

    # Le corps commence sous le BAS des deux en-têtes, pas sous leur sommet :
    # ils sont composés en gros corps (mesuré : y0 = 547,0 et y1 = 572,6 sur les
    # 15 fiches du niveau 1, alors que la première ligne de corps est à 581,1).
    y_entete = max(f.y1 for f in gauche + droite)
    y_corps = y_entete + MARGE_APRES_ENTETE
    if abs(y_corps - Y_CORPS_ATTENDU) > Y_CORPS_TOLERANCE:
        raise RefusIngestion(
            "repere-mal-place",
            f"début du corps dérivé à y={y_corps:.1f}, hors de "
            f"{Y_CORPS_ATTENDU:g} ± {Y_CORPS_TOLERANCE:g} : la mise en page "
            "n'est pas celle du niveau 1")
    return y_corps


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


def extraire(page, numero: int, niveau: int, nom_source: str) -> dict:
    """Le brouillon complet d'une fiche du niveau 1. Ordre des clés FIGÉ."""
    fragments = lire_fragments(page)
    if not fragments:
        raise RefusIngestion("texte-absent",
                             "aucun texte extractible (fiche scannée ?)")

    y_corps = reperer_entetes(fragments)
    corps = [f for f in fragments if f.y0 > y_corps]
    if not corps:
        raise RefusIngestion("zone-vide", f"aucun texte sous y={y_corps:.1f}")

    exiger_colonnes_separables(corps, SEPARATION_COLONNES_X)

    avertissements: list[str] = []
    consignes_items = grouper_en_items(
        grouper_en_lignes([f for f in corps if f.x0 < SEPARATION_COLONNES_X],
                          avertissements, "gauche", TOLERANCE_LIGNE_Y),
        "gauche", ECART_REPLI_MAX, ECART_ITEM_MIN)
    affirmations_items = grouper_en_items(
        grouper_en_lignes([f for f in corps if f.x0 >= SEPARATION_COLONNES_X],
                          avertissements, "droite", TOLERANCE_LIGNE_Y),
        "droite", ECART_REPLI_MAX, ECART_ITEM_MIN)

    if not consignes_items:
        raise RefusIngestion("zone-vide",
                             "colonne gauche vide : aucune consigne d'action")
    if not affirmations_items:
        raise RefusIngestion("zone-vide",
                             "colonne droite vide : aucune affirmation")

    illustration = illustration_unique(page, AIRE_ILLUSTRATION_MINI)

    consignes = []
    for rang, item in enumerate(consignes_items, start=1):
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
        for rang, item in enumerate(affirmations_items, start=1)
    ]
    return {
        "statut": "brouillon-non-jouable",
        "raison": "aucune cible (region, couleur) n'est déductible du PDF : "
                  "les identifiants de région appartiennent au décor SVG, pas à la fiche",
        "origine": {"source": nom_source, "niveau": niveau, "fiche": numero,
                    "page": numero},
        "illustration": illustration.en_dictionnaire(),
        "consignes": consignes,
        "affirmations": affirmations,
        "compte": {"consignes": len(consignes), "affirmations": len(affirmations)},
        "aFaireALaMain": list(A_FAIRE_A_LA_MAIN),
        "avertissements": avertissements,
    }


# --------------------------------------------------------------------------
# Agrégats de manifeste — l'ordre des clés est celui du manifeste d'origine
# --------------------------------------------------------------------------

def agregats_initiaux() -> dict:
    return {
        "totalConsignes": 0,
        "totalAffirmations": 0,
        "textesNonFiables": 0,
        "consignesParType": {"colorie": 0, "place": 0, "autre": 0},
    }


def cumuler(agregats: dict, brouillon: dict) -> None:
    agregats["totalConsignes"] += len(brouillon["consignes"])
    agregats["totalAffirmations"] += len(brouillon["affirmations"])
    for consigne in brouillon["consignes"]:
        agregats["consignesParType"][consigne["type"]] += 1
    agregats["textesNonFiables"] += sum(
        1 for item in brouillon["consignes"] + brouillon["affirmations"]
        if not item["texteFiable"])


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    return {
        "fiche": numero,
        "fichier": chemin_relatif,
        "consignes": len(brouillon["consignes"]),
        "affirmations": len(brouillon["affirmations"]),
    }


def detail_verbeux(brouillon: dict) -> list[str]:
    """Les lignes que `--verbeux` imprime pour cette fiche."""
    lignes = []
    for consigne in brouillon["consignes"]:
        marque = " MIXTE" if consigne["mixte"] else ""
        lignes.append(f"[{consigne['type']:7s}]{marque} {consigne['texte']}")
    return lignes
