# -*- coding: utf-8 -*-
"""Format du NIVEAU 4 — « Lis chaque question et colorie la bonne réponse ».

QCM à trois options **écrites**. Moteur cible `histoire`, mode `qcm-3`
(fiches-origine-analyse.md § 2 ; contrat features v2 § 3.7).

LES MESURES QUI FONT FOI — commande citée, sortie citée
-------------------------------------------------------
Sondage positionnel des 15 pages de `Docs/NIVEAU 4.pdf` (PyMuPDF 1.26.3) ::

    entetes de consigne : x15 | Lis chaque question et colorie la bonne réponse.
    entete y0/y1 distincts : [(513.9, 534.4)]        # les 15 pages
    questions : OpenDyslexic-Regular 11.0, x0 55.1..258.3, x1max 272.9
    options   : GlacialIndifference-Regular 11.0, x0 284.9..511.9, x1max 562.5
    trous > 3pt dans la couverture x des options : [(371.6, 381.0), (468.0, 475.9)]
    questions par page : [5] x15
    options par page   : [15] x15        # soit 3 x 5, sur les 15 fiches
    ecarts dans une colonne d option : 10.4/10.5 (repli, x66) puis >= 28.0 (item)

Les **deux trous horizontaux** mesurés sur l'ensemble du niveau donnent les
frontières des trois colonnes d'options : 376 et 472. Ce ne sont pas des
estimations par regroupement, ce sont des bandes vides de 9,4 et 7,9 pt.

CE QUE CE FORMAT REFUSE DE FAIRE
--------------------------------
Il n'écrit **aucune bonne réponse**. Le corrigé n'est pas dans le PDF : rien ne
distingue, par position, l'option juste des deux autres. Le champ
`bonneOption` vaut `null` et attend la relecture parent.
"""

from __future__ import annotations

from formats.commun import (Fiche, bloc_texte, enveloppe, exiger_compte,
                            item_en_dictionnaire, items_de_zone, titre_unique)
from geometrie import (bas_du_repere, colonne, exiger_colonnes_separables,
                       exiger_signature, lire_fragments, signature, sous)
from refus import RefusIngestion

NIVEAU = 4
LIBELLE = "texte documentaire + QCM à trois options écrites"
MOTEUR_CIBLE = "histoire"
MODE_REPONSE = "qcm-3"

REPERE_CONSIGNE = "colorie la bonne reponse"
LIBELLE_CONSIGNE = "Lis chaque question et colorie la bonne réponse."

Y_ENTETE_ATTENDU = 534.4
Y_ENTETE_TOLERANCE = 12.0

#: Séparation questions / options, mesurée des deux côtés (272,9 | 284,9).
SEPARATION_COLONNES_X = 280.0

#: Frontières des trois colonnes d'options : les deux trous horizontaux mesurés.
BORNES_COLONNES_OPTIONS = (SEPARATION_COLONNES_X, 376.0, 472.0, 1.0e9)

POLICE_TITRE, TAILLE_TITRE = "BoldLiving", 19.4
POLICE_TEXTE, TAILLE_TEXTE = "OpenDyslexic-Regular", 12.0
POLICE_QUESTION, TAILLE_QUESTION = "OpenDyslexic-Regular", 11.0
POLICE_OPTION, TAILLE_OPTION = "GlacialIndifference-Regu", 11.0

QUESTIONS_MINI, QUESTIONS_MAXI = 4, 7

#: Trois options par question, mesuré sur 75 questions sur 75. Un écart n'est
#: PAS rattrapé : il est refusé, parce qu'un QCM à deux options fausserait le
#: `p_devinette` du BKT (fiches-origine-analyse.md § 6).
OPTIONS_PAR_QUESTION = 3

RAISON = ("aucune bonne réponse n'est déductible du PDF : rien ne distingue par "
          "position l'option juste des deux autres, et le corrigé n'y figure pas")

A_FAIRE_A_LA_MAIN = [
    "désigner la bonne option de chaque question, en relisant le texte support",
    "vérifier la couverture lexicale CE1 du texte support et des options",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]

REGLES_DE_STRUCTURE = {
    "repereConsigne": LIBELLE_CONSIGNE,
    "yEnteteAttendu": Y_ENTETE_ATTENDU,
    "separationColonnesX": SEPARATION_COLONNES_X,
    "bornesColonnesOptions": list(BORNES_COLONNES_OPTIONS[:-1]),
    "optionsParQuestion": OPTIONS_PAR_QUESTION,
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
                      POLICE_QUESTION, TAILLE_QUESTION),
            avertissements, "questions"),
        "questions", QUESTIONS_MINI, QUESTIONS_MAXI)

    # Une colonne d'options à la fois : les options d'une même colonne ne se
    # touchent jamais horizontalement, donc le groupement vertical est sûr.
    colonnes: list[list] = []
    for rang, (x_min, x_max) in enumerate(zip(BORNES_COLONNES_OPTIONS,
                                              BORNES_COLONNES_OPTIONS[1:])):
        colonnes.append(items_de_zone(
            signature(colonne(en_dessous, x_min, x_max),
                      POLICE_OPTION, TAILLE_OPTION),
            avertissements, f"options-{rang + 1}"))

    for rang, options in enumerate(colonnes, start=1):
        if len(options) != len(questions):
            raise RefusIngestion(
                "compte-inattendu",
                f"colonne d'options n° {rang} : {len(options)} option(s) pour "
                f"{len(questions)} question(s) — l'appariement par ligne n'est "
                "pas possible")
    if len(colonnes) != OPTIONS_PAR_QUESTION:
        raise RefusIngestion(
            "compte-inattendu",
            f"{len(colonnes)} colonne(s) d'options au lieu de "
            f"{OPTIONS_PAR_QUESTION}")

    corps = {
        "moteurCible": MOTEUR_CIBLE,
        "modeReponse": MODE_REPONSE,
        "titre": titre,
        "consigne": LIBELLE_CONSIGNE,
        "texte": texte,
        "questions": [
            {
                **item_en_dictionnaire(rang, item),
                "options": [
                    {"rang": numero_option, "texte": colonnes[numero_option - 1][rang - 1].texte,
                     "colonne": numero_option,
                     "texteFiable": not colonnes[numero_option - 1][rang - 1].douteux}
                    for numero_option in range(1, OPTIONS_PAR_QUESTION + 1)
                ],
                "bonneOption": None,
            }
            for rang, item in enumerate(questions, start=1)
        ],
        "compte": {
            "lignesTexte": texte["nbLignes"],
            "questions": len(questions),
            "options": len(questions) * OPTIONS_PAR_QUESTION,
        },
    }
    return enveloppe(RAISON, niveau, nom_source,
                     Fiche(numero=numero, page=numero, corps=corps,
                           avertissements=avertissements),
                     A_FAIRE_A_LA_MAIN)


def agregats_initiaux() -> dict:
    return {
        "totalQuestions": 0,
        "totalOptions": 0,
        "totalLignesTexte": 0,
        "textesNonFiables": 0,
        "bonnesReponsesADecider": 0,
    }


def cumuler(agregats: dict, brouillon: dict) -> None:
    compte = brouillon["compte"]
    agregats["totalQuestions"] += compte["questions"]
    agregats["totalOptions"] += compte["options"]
    agregats["totalLignesTexte"] += compte["lignesTexte"]
    agregats["textesNonFiables"] += sum(
        1 for q in brouillon["questions"]
        if not q["texteFiable"] or any(not o["texteFiable"] for o in q["options"]))
    if not brouillon["texte"]["texteFiable"]:
        agregats["textesNonFiables"] += 1
    agregats["bonnesReponsesADecider"] += sum(
        1 for q in brouillon["questions"] if q["bonneOption"] is None)


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    return {
        "fiche": numero,
        "fichier": chemin_relatif,
        "titre": brouillon["titre"],
        "questions": brouillon["compte"]["questions"],
        "options": brouillon["compte"]["options"],
    }


def detail_verbeux(brouillon: dict) -> list[str]:
    lignes = []
    for question in brouillon["questions"]:
        options = " | ".join(o["texte"] for o in question["options"])
        lignes.append(f"[qcm-3  ] {question['texte']}  ->  {options}")
    return lignes
