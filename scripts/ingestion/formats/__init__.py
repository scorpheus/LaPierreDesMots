# -*- coding: utf-8 -*-
"""Les sept formats d'ingestion, un par niveau — lot L2-G.

Le corpus n'a pas UN format, il en a **sept** : c'est la découverte du § 2 de
`Docs/fiches-origine-analyse.md`, et c'est ce qui commande l'architecture de ce
paquet. `extraire-fiches.py` n'est plus qu'un aiguilleur ; toute la connaissance
d'une mise en page vit dans le module de son niveau, avec ses mesures citées.

LE CONTRAT QU'UN MODULE DE FORMAT DOIT HONORER
----------------------------------------------
Constantes ::

    NIVEAU              int, 1 à 7
    LIBELLE             str, ce que la fiche demande, en une ligne
    MOTEUR_CIBLE        str | None, le moteur v2 visé (None = aucun décidé)
    MODE_REPONSE        str, le `ModeReponse` de la pédagogie (L2-D)
    REGLES_DE_STRUCTURE dict, ce que le manifeste déclare de la mise en page

Fonctions ::

    extraire(page, numero, niveau, nom_source) -> dict
        Le brouillon complet, ou `RefusIngestion`. N'écrit RIEN sur disque.
    agregats_initiaux() -> dict
        Les compteurs du manifeste, dans l'ordre où ils y apparaîtront.
    cumuler(agregats, brouillon) -> None
    resume_fiche(numero, chemin_relatif, brouillon) -> dict
    detail_verbeux(brouillon) -> list[str]

RÈGLE NON NÉGOCIABLE, VALABLE POUR LES SEPT
--------------------------------------------
Un format **refuse** plutôt que d'émettre du faux. Il n'invente ni corrigé, ni
ordre, ni cible de coloriage : rien de ce que le PDF ne porte pas. Tout champ
qu'un humain doit renseigner vaut `null` et figure dans `aFaireALaMain`.
"""

from __future__ import annotations

from formats import (niveau1, niveau2, niveau3, niveau4, niveau5, niveau6,
                     niveau7)

#: Les sept formats, indexés par niveau. Table fermée : un niveau absent d'ici
#: n'est pas « à écrire plus tard », c'est un niveau qui n'existe pas.
FORMATS = {
    1: niveau1,
    2: niveau2,
    3: niveau3,
    4: niveau4,
    5: niveau5,
    6: niveau6,
    7: niveau7,
}

#: Les niveaux qui refusent tout par décision de contrat, et non par défaut de
#: mise en page. Le manifeste le dit, pour qu'on ne cherche pas un bogue.
NIVEAUX_QUI_REFUSENT = (7,)


def format_du_niveau(niveau: int):
    """Le module de format d'un niveau. Lève `KeyError` hors de 1..7."""
    if niveau not in FORMATS:
        raise KeyError(
            f"niveau {niveau} inconnu : le corpus en compte 7 "
            f"({', '.join(str(n) for n in sorted(FORMATS))})")
    return FORMATS[niveau]
