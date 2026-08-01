# -*- coding: utf-8 -*-
"""Format du NIVEAU 3 — « Lis chaque question et entoure la bonne image ».

Moteur cible `paires`, mode de réponse `qcm-3`
(fiches-origine-analyse.md § 2 ; contrat features v2 § 3.7).

LES MESURES QUI FONT FOI — commande citée, sortie citée
-------------------------------------------------------
Sondage positionnel des 15 pages de `Docs/NIVEAU 3.pdf` (PyMuPDF 1.26.3) ::

    entetes de consigne : x15 | Lis chaque question et entoure la bonne image.
    entete y0/y1 distincts : [(455.1, 475.6), (457.2, 477.7), (467.7, 488.2)]
    questions : OpenDyslexic-Regular 11.0, x0 55.9..63.8, x1max 334.4
    images de la zone reponse : x0 min 337.0
    lignes/page [5, 6, 7]  ecarts 14.9/15.0 (repli, x16) puis 36.9..56.9 (item)

La séparation des colonnes à **x = 336** est donc mesurée des deux côtés :
334,4 pt à gauche pour le texte, 337,0 pt à droite pour la première image.

L'ÉCART QUI COMMANDE CE FORMAT — et qu'un comptage d'occurrences aurait manqué
------------------------------------------------------------------------------
Audit par OBJET : 15 fiches × 5 questions × 3 options = **225 images-réponses**.
Audit par OCCURRENCE : les blocs image de la zone réponse, une fois le bruit
écarté (seuil mesuré : aucun bloc entre 521,0 et 826,4 pt²), sont **105**.

    aires zone reponse : [… 480.0, 521.0, 826.4, 926.1, … 3902.7]   # coupure nette
    blocs >= 700 pt² : 105        # pour 225 options attendues

**Écart : 120.** Une partie des options est dessinée en vectoriel et n'apparaît
comme aucun bloc image. Ce format ne prétend donc PAS extraire les trois options
d'une question : il extrait les questions, qui sont fiables, relève ce qu'il
mesure dans la zone réponse, et le déclare non fiable (`optionsFiables: false`).
Prétendre le contraire produirait des QCM à deux options en silence.
"""

from __future__ import annotations

from formats.commun import (Fiche, bloc_texte, enveloppe, exiger_compte,
                            item_en_dictionnaire, items_de_zone, titre_unique)
from geometrie import (bas_du_repere, bbox, colonne, exiger_colonnes_separables,
                       exiger_signature, lire_fragments, lire_illustrations,
                       signature, sous)
from refus import RefusIngestion

NIVEAU = 3
LIBELLE = "texte narratif + questions à réponses illustrées"
MOTEUR_CIBLE = "paires"
MODE_REPONSE = "qcm-3"

REPERE_CONSIGNE = "entoure la bonne image"
LIBELLE_CONSIGNE = "Lis chaque question et entoure la bonne image."

#: Bas de l'en-tête : 475,6 · 477,7 · 488,2 pt mesurés. Centre 477,0, ± 14.
Y_ENTETE_ATTENDU = 477.0
Y_ENTETE_TOLERANCE = 14.0

#: Séparation questions / images, mesurée des deux côtés (334,4 | 337,0).
SEPARATION_COLONNES_X = 336.0

#: Le pied de page décoratif, présent sur les 105 fiches, à écarter.
#: Mesuré : un unique bloc, toujours en (545.3, 794.5)-(588.0, 829.0).
Y_PIED_DE_PAGE = 790.0

#: Seuil d'aire d'un bloc image tenu pour une option. Mesuré : coupure nette
#: entre le bruit (≤ 521,0 pt²) et les vraies vignettes (≥ 826,4 pt²).
AIRE_OPTION_MINI = 700.0

#: Nombre d'options que la consigne annonce. Sert à MESURER l'écart, pas à
#: fabriquer des options manquantes.
OPTIONS_ANNONCEES = 3

POLICE_TITRE, TAILLE_TITRE = "BoldLiving", 19.4
POLICE_TEXTE, TAILLE_TEXTE = "OpenDyslexic-Regular", 12.0
POLICE_ITEM, TAILLE_ITEM = "OpenDyslexic-Regular", 11.0

QUESTIONS_MINI, QUESTIONS_MAXI = 4, 7

RAISON = ("les trois images-réponses ne sont pas toutes des blocs image du PDF "
          "(105 blocs mesurés pour 225 options annoncées) : les découper et "
          "désigner la bonne est un geste humain, pas une extraction positionnelle")

A_FAIRE_A_LA_MAIN = [
    "découper les trois images-réponses de chaque question et les nommer",
    "désigner la bonne image de chaque question",
    "vérifier la couverture lexicale CE1 du texte support",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]

REGLES_DE_STRUCTURE = {
    "repereConsigne": LIBELLE_CONSIGNE,
    "yEnteteAttendu": Y_ENTETE_ATTENDU,
    "separationColonnesX": SEPARATION_COLONNES_X,
    "aireOptionMini": AIRE_OPTION_MINI,
    "optionsAnnoncees": OPTIONS_ANNONCEES,
    "questionsAttendues": [QUESTIONS_MINI, QUESTIONS_MAXI],
}


def extraire(page, numero: int, niveau: int, nom_source: str) -> dict:
    fragments = lire_fragments(page)
    if not fragments:
        raise RefusIngestion("texte-absent",
                             "aucun texte extractible (fiche scannée ?)")

    y_entete = bas_du_repere(fragments, REPERE_CONSIGNE, LIBELLE_CONSIGNE,
                             Y_ENTETE_ATTENDU, Y_ENTETE_TOLERANCE, y_min=400.0)

    avertissements: list[str] = []
    au_dessus = [f for f in fragments if f.y0 < y_entete]
    titre = titre_unique(signature(au_dessus, POLICE_TITRE, TAILLE_TITRE),
                         avertissements, "titre")
    texte = bloc_texte(
        exiger_signature(au_dessus, POLICE_TEXTE, TAILLE_TEXTE, "texte", 4),
        avertissements, "texte")

    en_dessous = sous(fragments, y_entete)
    exiger_colonnes_separables(en_dessous, SEPARATION_COLONNES_X)
    questions = exiger_compte(
        items_de_zone(
            signature(colonne(en_dessous, x_max=SEPARATION_COLONNES_X),
                      POLICE_ITEM, TAILLE_ITEM),
            avertissements, "questions"),
        "questions", QUESTIONS_MINI, QUESTIONS_MAXI)

    # Zone réponse : à droite de la séparation, sous l'en-tête, hors pied de page.
    vignettes = [i for i in lire_illustrations(page)
                 if i.x0 >= SEPARATION_COLONNES_X and i.y0 > y_entete
                 and i.y0 < Y_PIED_DE_PAGE and i.aire >= AIRE_OPTION_MINI]

    # Attribution par POSITION : chaque vignette va à la question dont le centre
    # vertical est le plus proche du sien. Déterministe, et sans invention.
    centres = [(q.y + q.y_fin) / 2.0 for q in questions]
    paquets: list[list] = [[] for _ in questions]
    for vignette in vignettes:
        milieu = (vignette.y0 + vignette.y1) / 2.0
        rang = min(range(len(centres)), key=lambda i: abs(centres[i] - milieu))
        paquets[rang].append(vignette)

    detectees = len(vignettes)
    attendues = len(questions) * OPTIONS_ANNONCEES
    if detectees != attendues:
        avertissements.append(
            f"zone réponse : {detectees} vignette(s) mesurée(s) pour "
            f"{attendues} option(s) annoncée(s) — les options manquantes sont "
            "dessinées en vectoriel, à découper à la main")

    corps = {
        "moteurCible": MOTEUR_CIBLE,
        "modeReponse": MODE_REPONSE,
        "titre": titre,
        "consigne": LIBELLE_CONSIGNE,
        "texte": texte,
        "questions": [
            {
                **item_en_dictionnaire(rang, item),
                "optionsFiables": False,
                "optionsAnnoncees": OPTIONS_ANNONCEES,
                "vignettesMesurees": [v.en_dictionnaire() for v in paquet],
                "zoneReponseBboxPt": bbox(paquet),
            }
            for rang, (item, paquet) in enumerate(zip(questions, paquets), start=1)
        ],
        "compte": {
            "lignesTexte": texte["nbLignes"],
            "questions": len(questions),
            "optionsAnnoncees": attendues,
            "vignettesMesurees": detectees,
            "ecartOptions": attendues - detectees,
        },
    }
    return enveloppe(RAISON, niveau, nom_source,
                     Fiche(numero=numero, page=numero, corps=corps,
                           avertissements=avertissements),
                     A_FAIRE_A_LA_MAIN)


def agregats_initiaux() -> dict:
    return {
        "totalQuestions": 0,
        "totalLignesTexte": 0,
        "textesNonFiables": 0,
        "optionsAnnoncees": 0,
        "vignettesMesurees": 0,
        "ecartOptions": 0,
    }


def cumuler(agregats: dict, brouillon: dict) -> None:
    compte = brouillon["compte"]
    agregats["totalQuestions"] += compte["questions"]
    agregats["totalLignesTexte"] += compte["lignesTexte"]
    agregats["optionsAnnoncees"] += compte["optionsAnnoncees"]
    agregats["vignettesMesurees"] += compte["vignettesMesurees"]
    agregats["ecartOptions"] += compte["ecartOptions"]
    agregats["textesNonFiables"] += sum(
        1 for q in brouillon["questions"] if not q["texteFiable"])
    if not brouillon["texte"]["texteFiable"]:
        agregats["textesNonFiables"] += 1


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    return {
        "fiche": numero,
        "fichier": chemin_relatif,
        "titre": brouillon["titre"],
        "questions": brouillon["compte"]["questions"],
        "vignettesMesurees": brouillon["compte"]["vignettesMesurees"],
    }


def detail_verbeux(brouillon: dict) -> list[str]:
    return [f"[qcm-3  ] {q['texte']}  ({len(q['vignettesMesurees'])} vignette(s))"
            for q in brouillon["questions"]]
