# -*- coding: utf-8 -*-
"""Format du NIVEAU 2 — texte documentaire + 8 affirmations vrai/faux.

Moteur cible `histoire`, mode de réponse `vrai-faux`
(fiches-origine-analyse.md § 2 ; contrat features v2 § 3.7).

LES MESURES QUI FONT FOI — commande citée, sortie citée
-------------------------------------------------------
Sondage positionnel des 15 pages de `Docs/NIVEAU 2.pdf` (PyMuPDF 1.26.3) ::

    entetes de consigne : x15 | Réponds par V pour vrai ou F pour faux.
    entete y0/y1 distincts : [(459.0, 479.5)]        # les 15 pages
    affirmations : OpenDyslexic-Regular 11.0, x0 79.4..79.4, y 497.2..778.9
    lignes/page [8, 9]   ecarts 15.0 (repli, x2) puis 26.9..37.5 (item)

D'où : un seul en-tête, une seule colonne, un seuil d'item sans ambiguïté. Les
deux écarts de 15,0 pt sont des replis de ligne, les 13 autres pages n'en ont
aucun — d'où 8 affirmations sur les 15 fiches, sans exception.

CE QUE CE FORMAT REFUSE DE FAIRE
--------------------------------
**Il n'écrit aucune réponse attendue.** Le corrigé n'est pas dans le PDF : les
15 pages sont 15 fiches, il n'y a pas de page de corrigé. Décider que « Les
dauphins sont des mammifères » est vrai demande de lire le texte, ce qui est le
travail du relecteur parent — pas d'un script positionnel. Inventer la valeur de
vérité serait exactement la faute que ce lot doit éviter.
"""

from __future__ import annotations

from formats.commun import (Fiche, bloc_texte, enveloppe, exiger_compte,
                            item_en_dictionnaire, items_de_zone, titre_unique)
from geometrie import (bas_du_repere, exiger_signature, lire_fragments,
                       signature, sous)
from refus import RefusIngestion

NIVEAU = 2
LIBELLE = "texte documentaire + affirmations vrai/faux"
MOTEUR_CIBLE = "histoire"
MODE_REPONSE = "vrai-faux"

#: Texte exact de l'en-tête, comparé sans accents ni casse. Mesuré sur 15/15.
REPERE_CONSIGNE = "vrai ou f pour faux"
LIBELLE_CONSIGNE = "Réponds par V pour vrai ou F pour faux."

#: Bas de l'en-tête, mesuré à 479,5 pt sur les 15 pages. La tolérance est large
#: (± 12 pt) : elle doit absorber une recomposition mineure, pas un autre format.
Y_ENTETE_ATTENDU = 479.5
Y_ENTETE_TOLERANCE = 12.0

#: Signatures typographiques mesurées.
POLICE_TITRE, TAILLE_TITRE = "BoldLiving", 19.4
POLICE_TEXTE, TAILLE_TEXTE = "OpenDyslexic-Regular", 12.0
POLICE_ITEM, TAILLE_ITEM = "OpenDyslexic-Regular", 11.0

#: Plage MESURÉE du nombre d'affirmations : 8 sur les 15 fiches. La plage
#: [6, 10] laisse passer une fiche un peu différente, jamais un autre format.
AFFIRMATIONS_MINI, AFFIRMATIONS_MAXI = 6, 10

RAISON = ("aucune valeur de vérité n'est déductible du PDF : le corrigé n'y "
          "figure pas, et la déduire du texte est un jugement humain, pas une "
          "extraction positionnelle")

A_FAIRE_A_LA_MAIN = [
    "décider vrai ou faux pour chaque affirmation, en relisant le texte support",
    "vérifier la couverture lexicale CE1 du texte support",
    "choisir les compétences du référentiel et la difficulté",
    "faire relire et valider par le parent avant de déposer dans contenu/exercices/",
]

REGLES_DE_STRUCTURE = {
    "repereConsigne": LIBELLE_CONSIGNE,
    "yEnteteAttendu": Y_ENTETE_ATTENDU,
    "policeTexte": f"{POLICE_TEXTE} {TAILLE_TEXTE:g}",
    "policeAffirmations": f"{POLICE_ITEM} {TAILLE_ITEM:g}",
    "affirmationsAttendues": [AFFIRMATIONS_MINI, AFFIRMATIONS_MAXI],
}


def extraire(page, numero: int, niveau: int, nom_source: str) -> dict:
    fragments = lire_fragments(page)
    if not fragments:
        raise RefusIngestion("texte-absent",
                             "aucun texte extractible (fiche scannée ?)")

    y_entete = bas_du_repere(fragments, REPERE_CONSIGNE, LIBELLE_CONSIGNE,
                             Y_ENTETE_ATTENDU, Y_ENTETE_TOLERANCE, y_min=400.0)

    avertissements: list[str] = []

    # Le titre et le texte support sont AU-DESSUS de l'en-tête ; les affirmations
    # au-dessous. C'est la position qui les sépare, la signature qui les valide.
    au_dessus = [f for f in fragments if f.y0 < y_entete]
    titre = titre_unique(signature(au_dessus, POLICE_TITRE, TAILLE_TITRE),
                         avertissements, "titre")
    texte = bloc_texte(
        exiger_signature(au_dessus, POLICE_TEXTE, TAILLE_TEXTE, "texte", 4),
        avertissements, "texte")

    en_dessous = sous(fragments, y_entete)
    affirmations = exiger_compte(
        items_de_zone(signature(en_dessous, POLICE_ITEM, TAILLE_ITEM),
                      avertissements, "affirmations"),
        "affirmations", AFFIRMATIONS_MINI, AFFIRMATIONS_MAXI)

    corps = {
        "moteurCible": MOTEUR_CIBLE,
        "modeReponse": MODE_REPONSE,
        "titre": titre,
        "consigne": LIBELLE_CONSIGNE,
        "texte": texte,
        "affirmations": [
            {**item_en_dictionnaire(rang, item), "reponseAttendue": None}
            for rang, item in enumerate(affirmations, start=1)
        ],
        "compte": {"lignesTexte": texte["nbLignes"],
                   "affirmations": len(affirmations)},
    }
    return enveloppe(RAISON, niveau, nom_source,
                     Fiche(numero=numero, page=numero, corps=corps,
                           avertissements=avertissements),
                     A_FAIRE_A_LA_MAIN)


def agregats_initiaux() -> dict:
    return {
        "totalAffirmations": 0,
        "totalLignesTexte": 0,
        "textesNonFiables": 0,
        "reponsesAttenduesADecider": 0,
    }


def cumuler(agregats: dict, brouillon: dict) -> None:
    agregats["totalAffirmations"] += len(brouillon["affirmations"])
    agregats["totalLignesTexte"] += brouillon["texte"]["nbLignes"]
    agregats["textesNonFiables"] += sum(
        1 for a in brouillon["affirmations"] if not a["texteFiable"])
    if not brouillon["texte"]["texteFiable"]:
        agregats["textesNonFiables"] += 1
    agregats["reponsesAttenduesADecider"] += sum(
        1 for a in brouillon["affirmations"] if a["reponseAttendue"] is None)


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    return {
        "fiche": numero,
        "fichier": chemin_relatif,
        "titre": brouillon["titre"],
        "affirmations": len(brouillon["affirmations"]),
    }


def detail_verbeux(brouillon: dict) -> list[str]:
    return [f"[vrai-faux] {a['texte']}" for a in brouillon["affirmations"]]
