# -*- coding: utf-8 -*-
"""Format du NIVEAU 6 — « Réponds aux questions en complétant la réponse ».

Phrase à trou **amorcée** : la fiche donne le début de la réponse, l'enfant
écrit la fin. Moteur cible `grave`, mode `saisie`
(fiches-origine-analyse.md § 2 ; contrat features v2 § 3.7).

LES MESURES QUI FONT FOI — commande citée, sortie citée
-------------------------------------------------------
Sondage positionnel des 15 pages de `Docs/NIVEAU 6.pdf` (PyMuPDF 1.26.3) ::

    entetes de consigne : x15 | Réponds aux questions en complétant la réponse.
    entete y0/y1 distincts : [(466.0, 486.5)]        # les 15 pages
    questions : BelleAllureScript3i-Gros 12.0, n=60, y 499.9..743.1
    amorces   : BelleAllureGS-Gros      13.0, n=60, y 535.8..779.4
    ecarts questions : 71.6 .. 73.2      (aucun repli : une question = une ligne)
    ecarts amorces   : 71.6 .. 72.9      (idem)

**4 questions et 4 amorces par fiche, sur 15 fiches sur 15.** Aucun repli de
ligne : chaque question et chaque amorce tiennent sur une ligne, ce qui rend
l'appariement par rang immédiat — l'amorce n° k suit la question n° k, et son
ordonnée est comprise entre celle de la question k et celle de la question k+1.

CE QUI DISTINGUE CE NIVEAU DU NIVEAU 7 — et c'est ce qui le rend ingérable
--------------------------------------------------------------------------
La signature `BelleAllureGS-Gros 13.0` est **présente ici et absente au niveau
7** (mesuré : 60 fragments contre 0). C'est l'amorce imprimée qui fait toute la
différence : elle borne la réponse attendue, donc elle la rend validable. Sans
elle (niveau 7), il n'y a rien à valider — voir `niveau7.py`.

CE QUE CE FORMAT REFUSE DE FAIRE
--------------------------------
Il n'écrit **aucune réponse attendue**. L'amorce donne la forme de la phrase,
pas le mot manquant.
"""

from __future__ import annotations

from formats.commun import (Fiche, bloc_texte, enveloppe, exiger_compte,
                            item_en_dictionnaire, items_de_zone, titre_unique)
from geometrie import (bas_du_repere, exiger_signature, lire_fragments,
                       signature, sous)
from refus import RefusIngestion

NIVEAU = 6
LIBELLE = "texte documentaire + phrases à trou amorcées"
MOTEUR_CIBLE = "grave"
MODE_REPONSE = "saisie"

REPERE_CONSIGNE = "en completant la reponse"
LIBELLE_CONSIGNE = "Réponds aux questions en complétant la réponse."

Y_ENTETE_ATTENDU = 486.5
Y_ENTETE_TOLERANCE = 12.0

POLICE_TITRE, TAILLE_TITRE = "BoldLiving", 19.4
POLICE_TEXTE, TAILLE_TEXTE = "OpenDyslexic-Regular", 12.0
POLICE_QUESTION, TAILLE_QUESTION = "BelleAllureScript3", 12.0
POLICE_AMORCE, TAILLE_AMORCE = "BelleAllureGS-Gros", 13.0

QUESTIONS_MINI, QUESTIONS_MAXI = 3, 6

RAISON = ("l'amorce donne la forme de la phrase réponse, jamais le mot manquant : "
          "la réponse attendue n'est pas dans le PDF")

A_FAIRE_A_LA_MAIN = [
    "écrire la réponse attendue de chaque phrase à trou, et ses variantes acceptées",
    "vérifier la couverture lexicale CE1 du texte support",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]

REGLES_DE_STRUCTURE = {
    "repereConsigne": LIBELLE_CONSIGNE,
    "yEnteteAttendu": Y_ENTETE_ATTENDU,
    "policeQuestion": f"{POLICE_QUESTION} {TAILLE_QUESTION:g}",
    "policeAmorce": f"{POLICE_AMORCE} {TAILLE_AMORCE:g}",
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
    questions = exiger_compte(
        items_de_zone(signature(en_dessous, POLICE_QUESTION, TAILLE_QUESTION),
                      avertissements, "questions"),
        "questions", QUESTIONS_MINI, QUESTIONS_MAXI)
    amorces = exiger_compte(
        items_de_zone(signature(en_dessous, POLICE_AMORCE, TAILLE_AMORCE),
                      avertissements, "amorces"),
        "amorces", QUESTIONS_MINI, QUESTIONS_MAXI)

    if len(amorces) != len(questions):
        raise RefusIngestion(
            "compte-inattendu",
            f"{len(amorces)} amorce(s) pour {len(questions)} question(s) : "
            "l'appariement par rang n'est pas possible")
    # L'amorce n° k suit sa question n° k. Vérifié par position, jamais supposé.
    for rang, (question, amorce) in enumerate(zip(questions, amorces), start=1):
        if amorce.y <= question.y:
            raise RefusIngestion(
                "compte-inattendu",
                f"amorce n° {rang} à y={amorce.y:.1f} au-dessus de sa question "
                f"à y={question.y:.1f} : l'ordre attendu n'est pas respecté")

    corps = {
        "moteurCible": MOTEUR_CIBLE,
        "modeReponse": MODE_REPONSE,
        "titre": titre,
        "consigne": LIBELLE_CONSIGNE,
        "texte": texte,
        "questions": [
            {**item_en_dictionnaire(rang, question),
             "amorce": amorce.texte,
             "yAmorce": round(amorce.y, 1),
             "amorceFiable": not amorce.douteux,
             "reponseAttendue": None}
            for rang, (question, amorce)
            in enumerate(zip(questions, amorces), start=1)
        ],
        "compte": {"lignesTexte": texte["nbLignes"],
                   "questions": len(questions),
                   "amorces": len(amorces)},
    }
    return enveloppe(RAISON, niveau, nom_source,
                     Fiche(numero=numero, page=numero, corps=corps,
                           avertissements=avertissements),
                     A_FAIRE_A_LA_MAIN)


def agregats_initiaux() -> dict:
    return {
        "totalQuestions": 0,
        "totalAmorces": 0,
        "totalLignesTexte": 0,
        "textesNonFiables": 0,
        "reponsesAttenduesADecider": 0,
    }


def cumuler(agregats: dict, brouillon: dict) -> None:
    compte = brouillon["compte"]
    agregats["totalQuestions"] += compte["questions"]
    agregats["totalAmorces"] += compte["amorces"]
    agregats["totalLignesTexte"] += compte["lignesTexte"]
    agregats["textesNonFiables"] += sum(
        1 for q in brouillon["questions"]
        if not q["texteFiable"] or not q["amorceFiable"])
    if not brouillon["texte"]["texteFiable"]:
        agregats["textesNonFiables"] += 1
    agregats["reponsesAttenduesADecider"] += sum(
        1 for q in brouillon["questions"] if q["reponseAttendue"] is None)


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    return {
        "fiche": numero,
        "fichier": chemin_relatif,
        "titre": brouillon["titre"],
        "questions": brouillon["compte"]["questions"],
    }


def detail_verbeux(brouillon: dict) -> list[str]:
    return [f"[saisie ] {q['texte']}  ->  {q['amorce']}"
            for q in brouillon["questions"]]
