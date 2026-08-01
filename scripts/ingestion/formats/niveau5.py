# -*- coding: utf-8 -*-
"""Format du NIVEAU 5 — DEUX exercices sur une fiche.

À gauche « Cherche et colorie la réponse dans le texte », à droite
« Numérote de 1 à 5 l'ordre de l'histoire ». Moteur cible `chrono`, mode `ordre`
(fiches-origine-analyse.md § 2 ; contrat features v2 § 3.7).

LE PIÈGE DE CE NIVEAU, ET POURQUOI IL EST NOMMÉ ICI
---------------------------------------------------
Le contrat ne retient que « Numérote de 1 à 5 », et c'est bien la tâche
principale. Mais la fiche en porte **deux**, mesurées sur les 15 pages :

    entetes de consigne : x15 | Cherche et colorie la réponse dans le
                                Numérote de 1 à 5 l'ordre de
                                texte. l'histoire.

N'extraire que l'ordre jetterait la moitié de chaque fiche — 75 questions de
repérage dans le texte, chacune appariée à une couleur de surlignage. Ce format
extrait donc les deux, dans deux champs distincts, sans les mélanger.

LES MESURES QUI FONT FOI — commande citée, sortie citée
-------------------------------------------------------
Sondage positionnel des 15 pages de `Docs/NIVEAU 5.pdf` (PyMuPDF 1.26.3) ::

    entete y0/y1 : bas commun 551.1 sur les 15 pages
    gauche x1 max = 319.7   droite x0 min = 366.1     -> separation x = 340
    couleurs : GlacialIndifference-Regular 11.0, x0 77.5..83.1, x1max 104.9
    questions: OpenDyslexic-Regular 11.0, x0 136.4..                 -> sous-separation x = 120
    ordre    : OpenDyslexic-Regular 11.0, x0 366.1..551.9
    couleurs/page  : [5] x15
    questions/page : [5] x15
    ordre/page     : [5] x15
    ecart y couleur - question : 3.0 .. 13.3 pt   (appariement par rang sûr)

CE QUE CE FORMAT REFUSE DE FAIRE
--------------------------------
Il n'écrit **aucun ordre correct**. Les cinq étapes sont imprimées dans le
désordre, et le PDF ne porte pas la numérotation attendue — c'est précisément ce
que l'enfant doit écrire. Le champ `ordreAttendu` vaut `null`. Le rang stocké
est la **position d'impression**, jamais la place dans le récit.
"""

from __future__ import annotations

from formats.commun import (Fiche, bloc_texte, enveloppe, exiger_compte,
                            item_en_dictionnaire, items_de_zone, titre_unique)
from geometrie import (bas_du_repere, colonne, exiger_colonnes_separables,
                       exiger_signature, lire_fragments, signature, sous)
from refus import RefusIngestion

NIVEAU = 5
LIBELLE = "texte narratif + repérage colorié + remise en ordre"
MOTEUR_CIBLE = "chrono"
MODE_REPONSE = "ordre"

REPERE_CONSIGNE_GAUCHE = "cherche et colorie la reponse"
LIBELLE_CONSIGNE_GAUCHE = "Cherche et colorie la réponse dans le texte."
REPERE_CONSIGNE_DROITE = "numerote de 1 a 5"
LIBELLE_CONSIGNE_DROITE = "Numérote de 1 à 5 l’ordre de l’histoire."

Y_ENTETE_ATTENDU = 551.1
Y_ENTETE_TOLERANCE = 12.0

#: Séparation des deux exercices, mesurée des deux côtés (319,7 | 366,1).
SEPARATION_EXERCICES_X = 340.0

#: Sous-séparation couleur / question dans l'exercice de gauche (104,9 | 136,4).
SEPARATION_COULEUR_X = 120.0

POLICE_TITRE, TAILLE_TITRE = "BoldLiving", 19.4
POLICE_TEXTE, TAILLE_TEXTE = "OpenDyslexic-Regular", 12.0
POLICE_ITEM, TAILLE_ITEM = "OpenDyslexic-Regular", 11.0
POLICE_COULEUR, TAILLE_COULEUR = "GlacialIndifference-Regu", 11.0

ITEMS_MINI, ITEMS_MAXI = 4, 6

#: Écart vertical maximal mesuré entre une pastille de couleur et sa question :
#: 13,3 pt. Au-delà, l'appariement par rang n'est plus démontré, on refuse.
ECART_APPARIEMENT_MAX = 20.0

RAISON = ("ni l'ordre correct du récit ni le mot à surligner ne figurent dans le "
          "PDF : les cinq étapes y sont imprimées dans le désordre, et c'est "
          "l'enfant qui les numérote")

A_FAIRE_A_LA_MAIN = [
    "donner l'ordre correct des étapes du récit",
    "désigner, pour chaque question coloriée, le passage du texte qui répond",
    "vérifier la couverture lexicale CE1 du texte support",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]

REGLES_DE_STRUCTURE = {
    "repereConsigneGauche": LIBELLE_CONSIGNE_GAUCHE,
    "repereConsigneDroite": LIBELLE_CONSIGNE_DROITE,
    "yEnteteAttendu": Y_ENTETE_ATTENDU,
    "separationExercicesX": SEPARATION_EXERCICES_X,
    "separationCouleurX": SEPARATION_COULEUR_X,
    "ecartAppariementMax": ECART_APPARIEMENT_MAX,
    "itemsAttendus": [ITEMS_MINI, ITEMS_MAXI],
}


def extraire(page, numero: int, niveau: int, nom_source: str) -> dict:
    fragments = lire_fragments(page)
    if not fragments:
        raise RefusIngestion("texte-absent",
                             "aucun texte extractible (fiche scannée ?)")

    # Les deux en-têtes sont sur la même ligne : on exige les DEUX, chacun dans
    # sa colonne. Un seul des deux prouverait un autre format.
    bas_gauche = bas_du_repere(fragments, REPERE_CONSIGNE_GAUCHE,
                               LIBELLE_CONSIGNE_GAUCHE, Y_ENTETE_ATTENDU,
                               Y_ENTETE_TOLERANCE,
                               x_max=SEPARATION_EXERCICES_X, y_min=400.0)
    bas_droite = bas_du_repere(fragments, REPERE_CONSIGNE_DROITE,
                               LIBELLE_CONSIGNE_DROITE, Y_ENTETE_ATTENDU,
                               Y_ENTETE_TOLERANCE,
                               x_min=SEPARATION_EXERCICES_X, y_min=400.0)
    y_entete = max(bas_gauche, bas_droite)

    avertissements: list[str] = []
    au_dessus = [f for f in fragments if f.y0 < y_entete]
    titre = titre_unique(signature(au_dessus, POLICE_TITRE, TAILLE_TITRE),
                         avertissements, "titre")
    texte = bloc_texte(
        exiger_signature(au_dessus, POLICE_TEXTE, TAILLE_TEXTE, "texte", 4),
        avertissements, "texte")

    en_dessous = sous(fragments, y_entete)
    exiger_colonnes_separables(en_dessous, SEPARATION_EXERCICES_X)
    exiger_colonnes_separables(
        colonne(en_dessous, x_max=SEPARATION_EXERCICES_X), SEPARATION_COULEUR_X)

    couleurs = exiger_compte(
        items_de_zone(
            signature(colonne(en_dessous, x_max=SEPARATION_COULEUR_X),
                      POLICE_COULEUR, TAILLE_COULEUR),
            avertissements, "couleurs"),
        "couleurs", ITEMS_MINI, ITEMS_MAXI)
    questions = exiger_compte(
        items_de_zone(
            signature(colonne(en_dessous, SEPARATION_COULEUR_X,
                              SEPARATION_EXERCICES_X),
                      POLICE_ITEM, TAILLE_ITEM),
            avertissements, "questions"),
        "questions", ITEMS_MINI, ITEMS_MAXI)
    etapes = exiger_compte(
        items_de_zone(
            signature(colonne(en_dessous, SEPARATION_EXERCICES_X),
                      POLICE_ITEM, TAILLE_ITEM),
            avertissements, "ordre"),
        "ordre", ITEMS_MINI, ITEMS_MAXI)

    if len(couleurs) != len(questions):
        raise RefusIngestion(
            "compte-inattendu",
            f"{len(couleurs)} pastille(s) de couleur pour {len(questions)} "
            "question(s) : l'appariement par rang n'est pas possible")
    for rang, (pastille, question) in enumerate(zip(couleurs, questions), start=1):
        ecart = abs(pastille.y - question.y)
        if ecart > ECART_APPARIEMENT_MAX:
            raise RefusIngestion(
                "compte-inattendu",
                f"pastille n° {rang} à y={pastille.y:.1f} et question à "
                f"y={question.y:.1f} : écart de {ecart:.1f} pt, au-delà des "
                f"{ECART_APPARIEMENT_MAX:g} pt mesurés — l'appariement par rang "
                "n'est plus démontré")

    corps = {
        "moteurCible": MOTEUR_CIBLE,
        "modeReponse": MODE_REPONSE,
        "titre": titre,
        "consigne": LIBELLE_CONSIGNE_DROITE,
        "consigneSecondaire": LIBELLE_CONSIGNE_GAUCHE,
        "texte": texte,
        "etapes": [
            {**item_en_dictionnaire(rang, item), "ordreAttendu": None}
            for rang, item in enumerate(etapes, start=1)
        ],
        "reperages": [
            {**item_en_dictionnaire(rang, question),
             "couleur": pastille.texte,
             "yCouleur": round(pastille.y, 1),
             "passageAttendu": None}
            for rang, (pastille, question)
            in enumerate(zip(couleurs, questions), start=1)
        ],
        "compte": {
            "lignesTexte": texte["nbLignes"],
            "etapes": len(etapes),
            "reperages": len(questions),
        },
    }
    return enveloppe(RAISON, niveau, nom_source,
                     Fiche(numero=numero, page=numero, corps=corps,
                           avertissements=avertissements),
                     A_FAIRE_A_LA_MAIN)


def agregats_initiaux() -> dict:
    return {
        "totalEtapes": 0,
        "totalReperages": 0,
        "totalLignesTexte": 0,
        "textesNonFiables": 0,
        "ordresADecider": 0,
    }


def cumuler(agregats: dict, brouillon: dict) -> None:
    compte = brouillon["compte"]
    agregats["totalEtapes"] += compte["etapes"]
    agregats["totalReperages"] += compte["reperages"]
    agregats["totalLignesTexte"] += compte["lignesTexte"]
    agregats["textesNonFiables"] += sum(
        1 for item in brouillon["etapes"] + brouillon["reperages"]
        if not item["texteFiable"])
    if not brouillon["texte"]["texteFiable"]:
        agregats["textesNonFiables"] += 1
    agregats["ordresADecider"] += sum(
        1 for e in brouillon["etapes"] if e["ordreAttendu"] is None)


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    return {
        "fiche": numero,
        "fichier": chemin_relatif,
        "titre": brouillon["titre"],
        "etapes": brouillon["compte"]["etapes"],
        "reperages": brouillon["compte"]["reperages"],
    }


def detail_verbeux(brouillon: dict) -> list[str]:
    lignes = [f"[ordre  ] {e['texte']}" for e in brouillon["etapes"]]
    lignes += [f"[colorie] ({r['couleur']}) {r['texte']}"
               for r in brouillon["reperages"]]
    return lignes
