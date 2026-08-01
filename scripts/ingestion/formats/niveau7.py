# -*- coding: utf-8 -*-
"""Format du NIVEAU 7 — « Réponds aux questions avec une phrase réponse ».

**CE FORMAT REFUSE, ET IL LE DÉCLARE.** Ce n'est pas une lacune, c'est la
décision du contrat features v2 § 8, ligne 3, reprise du point ouvert O7
(`Docs/fiches-origine-analyse.md` § 5, F2) :

    « Le point ouvert n'est pas tranché : LLM juge local, validation parent
      différée, ou transformation en phrase à trou. Trois voies légitimes,
      aucune décision. `formats/niveau7.py` est donc écrit pour REFUSER
      explicitement et écrire son motif au manifeste, plutôt que de produire un
      brouillon qu'aucun moteur ne sait valider. »

POURQUOI LE REFUS EST MESURÉ, ET NON DÉCRÉTÉ
--------------------------------------------
Le refus ne se contente pas de constater le numéro du niveau : il **lit la
fiche**, retrouve son en-tête, compte ses questions, et constate l'absence de la
signature qui rendrait la réponse validable. Sondage des 15 pages de
`Docs/NIVEAU 7.pdf` (PyMuPDF 1.26.3) ::

    entetes de consigne : x15 | Réponds aux questions avec une phrase réponse.
    questions : BelleAllureScript3i-Gros 12.0, n=60      # 4 par fiche
    amorces   : BelleAllureGS-Gros      13.0, n=0        # AUCUNE

Au niveau 6, la même mesure rend **60 amorces**. C'est cette amorce imprimée qui
borne la réponse et la rend comparable ; sans elle, « Quel animal peut marcher
longtemps sans boire ? » admet « le dromadaire », « c'est le dromadaire », « un
dromadaire », « le chameau »… Aucune règle du dépôt ne sait trancher, et une
règle inventée ici corrigerait un enfant à tort — ce que la règle R14 interdit
formellement (aucun écran d'échec, jamais).

Le refus porte donc un motif du vocabulaire fermé, `format-non-tranche`, et le
compte des questions qu'on aurait pu extraire. Le jour où O7 est tranché, ce
fichier devient un format comme les autres, et la mesure ci-dessus reste vraie.
"""

from __future__ import annotations

from formats.commun import exiger_compte, items_de_zone
from geometrie import bas_du_repere, lire_fragments, signature, sous
from refus import RefusIngestion

NIVEAU = 7
LIBELLE = "texte documentaire + rédaction libre d'une phrase réponse"
MOTEUR_CIBLE = None
MODE_REPONSE = "redaction-libre"

REPERE_CONSIGNE = "avec une phrase reponse"
LIBELLE_CONSIGNE = "Réponds aux questions avec une phrase réponse."

Y_ENTETE_ATTENDU = 486.5
Y_ENTETE_TOLERANCE = 12.0

POLICE_QUESTION, TAILLE_QUESTION = "BelleAllureScript3", 12.0
POLICE_AMORCE, TAILLE_AMORCE = "BelleAllureGS-Gros", 13.0

QUESTIONS_MINI, QUESTIONS_MAXI = 3, 6

#: Le point ouvert qui bloque, nommé pour qu'on le retrouve.
POINT_OUVERT = "O7 (fiches-origine-analyse.md § 5, F2 ; contrat features v2 § 8, n° 3)"

REGLES_DE_STRUCTURE = {
    "repereConsigne": LIBELLE_CONSIGNE,
    "yEnteteAttendu": Y_ENTETE_ATTENDU,
    "pointOuvert": POINT_OUVERT,
    "decision": "refus explicite de toute fiche du niveau 7",
    "questionsAttendues": [QUESTIONS_MINI, QUESTIONS_MAXI],
}


def extraire(page, numero: int, niveau: int, nom_source: str) -> dict:
    """Ne rend JAMAIS de brouillon. Mesure, puis lève `RefusIngestion`."""
    fragments = lire_fragments(page)
    if not fragments:
        raise RefusIngestion("texte-absent",
                             "aucun texte extractible (fiche scannée ?)")

    # On lit la fiche pour de bon : un refus qui n'a rien lu ne prouve rien.
    y_entete = bas_du_repere(fragments, REPERE_CONSIGNE, LIBELLE_CONSIGNE,
                             Y_ENTETE_ATTENDU, Y_ENTETE_TOLERANCE, y_min=400.0)
    en_dessous = sous(fragments, y_entete)
    avertissements: list[str] = []
    questions = exiger_compte(
        items_de_zone(signature(en_dessous, POLICE_QUESTION, TAILLE_QUESTION),
                      avertissements, "questions"),
        "questions", QUESTIONS_MINI, QUESTIONS_MAXI)
    amorces = signature(en_dessous, POLICE_AMORCE, TAILLE_AMORCE)

    raise RefusIngestion(
        "format-non-tranche",
        f"{len(questions)} question(s) à réponse rédigée et {len(amorces)} "
        f"amorce(s) imprimée(s) : sans amorce, aucune règle du dépôt ne sait "
        f"juger une phrase libre. Le point ouvert {POINT_OUVERT} n'est pas "
        f"tranché (LLM juge local, validation parent différée, ou "
        f"transformation en phrase à trou façon niveau 6). Produire un "
        f"brouillon ici serait produire du faux.")


def agregats_initiaux() -> dict:
    return {"totalQuestions": 0, "totalLignesTexte": 0, "textesNonFiables": 0}


def cumuler(agregats: dict, brouillon: dict) -> None:
    """Jamais appelée : aucune fiche du niveau 7 n'est ingérée."""
    raise AssertionError(
        "niveau7.cumuler ne doit jamais être appelée : le format refuse toutes "
        "ses fiches. Si cette erreur se déclenche, le refus a été contourné.")


def resume_fiche(numero: int, chemin_relatif: str, brouillon: dict) -> dict:
    """Jamais appelée, pour la même raison que `cumuler`."""
    raise AssertionError(
        "niveau7.resume_fiche ne doit jamais être appelée : le format refuse "
        "toutes ses fiches.")


def detail_verbeux(brouillon: dict) -> list[str]:
    return []
