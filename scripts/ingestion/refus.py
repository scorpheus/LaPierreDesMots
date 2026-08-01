# -*- coding: utf-8 -*-
"""Le vocabulaire FERMÉ des motifs de refus — lot L2-G, contrat features v2 § 3.7.

POURQUOI UN VOCABULAIRE FERMÉ
-----------------------------
Un refus dont le motif est une phrase libre n'est pas exploitable : on ne peut ni
le compter, ni le regrouper, ni décider s'il vaut une correction du script ou une
correction de la fiche. Chaque refus porte donc **deux** champs :

* un ``code`` pris dans :data:`MOTIFS`, qui se compte ;
* un ``detail`` en français, qui se lit.

Le code est la seule chose que le manifeste agrège ; le détail est la seule chose
qu'un humain lit. Aucun refus ne peut être levé sans les deux.

RÈGLE DURE
----------
``RefusIngestion`` refuse un code absent de :data:`MOTIFS`. Ajouter un motif est
un geste délibéré : on l'écrit ici, avec sa description, ou on réutilise un code
existant. C'est ce qui empêche le vocabulaire de se diluer fiche après fiche.
"""

from __future__ import annotations

#: Vocabulaire fermé. Clé = code stable, valeur = ce que le code veut dire.
#: Ces codes sont écrits dans le manifeste et comptés par `manifeste.py` ; les
#: renommer casserait les manifestes déjà produits.
MOTIFS: dict[str, str] = {
    "texte-absent":
        "aucun texte extractible dans la page (fiche scannée, ou page vide)",
    "repere-introuvable":
        "l'en-tête de consigne qui identifie le format n'a pas été retrouvé",
    "repere-mal-place":
        "l'en-tête a été retrouvé, mais hors de la bande d'ordonnées mesurée",
    "colonnes-non-separables":
        "un fragment de texte est à cheval sur la séparation des colonnes",
    "ecart-ambigu":
        "un écart vertical ne permet de trancher ni le repli de ligne ni le "
        "changement d'item",
    "zone-vide":
        "une zone que le format déclare obligatoire ne contient aucun texte",
    "compte-inattendu":
        "le nombre d'items trouvés est hors de la plage mesurée sur le corpus",
    "illustration-introuvable":
        "la scène dessinée attendue par le format est absente ou multiple",
    "format-non-tranche":
        "le format de ce niveau n'a pas de moteur ni de règle de validation "
        "décidée : produire un brouillon serait produire du faux",
}


class RefusIngestion(Exception):
    """La structure attendue n'a pas été retrouvée : on n'écrit rien.

    Le message (``str(refus)``) reste le **détail seul**, sans préfixe : c'est
    lui qui était déjà écrit dans les manifestes du niveau 1, et la
    refactorisation doit y être neutre (contrat § 3.7). Le code voyage à côté,
    dans l'attribut :attr:`code`.
    """

    def __init__(self, code: str, detail: str) -> None:
        if code not in MOTIFS:
            raise ValueError(
                f"motif de refus « {code} » hors du vocabulaire fermé de "
                f"refus.py ({', '.join(sorted(MOTIFS))})")
        super().__init__(detail)
        self.code = code
        self.detail = detail

    def en_dictionnaire(self, fiche: int) -> dict:
        """Le refus tel qu'il entre au manifeste : la fiche, le code, le détail."""
        return {"fiche": fiche, "code": self.code, "motif": self.detail}
