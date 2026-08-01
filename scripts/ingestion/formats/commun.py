# -*- coding: utf-8 -*-
"""Le socle commun des sept formats d'ingestion — lot L2-G.

Ce module ne connaît **ni PDF ni PyMuPDF** : il ne manipule que des `Fragment`
déjà lus. Tout ce qui touche à la page vit dans `geometrie.py`. La séparation
n'est pas cosmétique : elle rend le groupement testable sans fichier.

CE QUI EST ICI, ET POURQUOI C'EST COMMUN AUX SEPT FORMATS
---------------------------------------------------------
* la normalisation du texte — espaces insécables, fines, liants ;
* le recollage des fragments en lignes, avec la détection de surimpression ;
* le recollage des lignes en items, par écart vertical **mesuré** ;
* l'enveloppe de brouillon, identique d'un niveau à l'autre.

Les CONSTANTES par défaut sont celles mesurées sur le niveau 1 (contrat v1
§ 9.2). Chaque format peut les redéfinir — et le fait quand la mesure l'exige —
mais aucun format ne les devine : il les mesure et les cite en tête de son
fichier.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field

from refus import RefusIngestion

# --------------------------------------------------------------------------
# Constantes de groupement, mesurées sur le corpus. Voir le tableau du § « Les
# écarts mesurés » de chaque format pour la valeur qui s'y applique.
# --------------------------------------------------------------------------

#: Deux fragments dont les ordonnées diffèrent de moins que cela sont sur la
#: même ligne. Mesuré niveau 1 : les fragments d'une même ligne sont à < 3 pt.
TOLERANCE_LIGNE_Y = 3.0

#: Deux lignes séparées d'AU PLUS cet écart appartiennent au même item (repli).
#: Mesuré : 16,5 pt au niveau 1, 15,0 pt aux niveaux 2 à 5.
ECART_REPLI_MAX = 18.0

#: Deux lignes séparées d'AU MOINS cet écart sont deux items distincts.
#: Mesuré : 21,7 pt au niveau 1 ; 23,1 pt au plus serré (niveau 5, questions).
ECART_ITEM_MIN = 20.0

# Entre les deux, la structure est AMBIGUË : on refuse la fiche plutôt que de
# trancher au hasard. Aucun écart mesuré sur les 105 fiches n'y tombe.


# --------------------------------------------------------------------------
# Structures
# --------------------------------------------------------------------------

@dataclass
class Fragment:
    """Un `span` PyMuPDF réduit à ce dont la structure a besoin.

    `police` et `taille` ne servent JAMAIS à deviner un sens : elles servent de
    **signature de format**, contrôlée par `verifier_signature`. Une fiche dont
    la signature typographique n'est pas celle du niveau est refusée, elle n'est
    pas réinterprétée.
    """
    x0: float
    x1: float
    y0: float
    y1: float
    texte: str
    police: str = ""
    taille: float = 0.0


@dataclass
class Ligne:
    """Une ligne de la fiche, fragments recollés dans l'ordre des `x`."""
    y: float
    texte: str
    douteuse: bool = False
    x0: float = 0.0
    x1: float = 0.0


@dataclass
class Item:
    """Une consigne, une question ou une affirmation, replis de ligne recollés."""
    y: float
    texte: str
    nb_lignes: int
    douteux: bool = False
    x0: float = 0.0
    x1: float = 0.0
    y_fin: float = 0.0


@dataclass
class Fiche:
    """Ce qu'un format rend au tronc commun : le corps du brouillon, et ses alertes."""
    numero: int
    page: int
    corps: dict
    avertissements: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------
# Normalisation du texte
# --------------------------------------------------------------------------

#: Caractères d'espacement et liants invisibles rencontrés dans le corpus.
#: Le liant sans chasse U+200C est présent dans TOUS les PDF des niveaux 6 et 7 :
#: mesuré sur `NIVEAU 6.pdf`, il termine 60 spans sur 60. Le laisser passerait
#: un caractère invisible jusque dans le texte lu par l'enfant.
ESPACES_A_REDUIRE = (" ", " ", " ", "​", "‌", "‍", "\t")


def sans_accents(texte: str) -> str:
    """Minuscule sans diacritiques, pour la comparaison seulement.
    Le texte écrit dans le brouillon garde ses accents et son apostrophe ’."""
    decompose = unicodedata.normalize("NFD", texte.lower())
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn")


def normaliser_espaces(texte: str) -> str:
    """Espaces multiples, insécables, fines et liants réduits à une espace simple."""
    for espace in ESPACES_A_REDUIRE:
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
# Groupement
# --------------------------------------------------------------------------

def grouper_en_lignes(fragments: list[Fragment],
                      avertissements: list[str],
                      colonne: str,
                      tolerance_y: float = TOLERANCE_LIGNE_Y) -> list[Ligne]:
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
        if paquets and abs(fragment.y0 - paquets[-1][0].y0) <= tolerance_y:
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
        lignes.append(Ligne(y=ordonnee, texte=texte, douteuse=douteuse,
                            x0=min(f.x0 for f in paquet),
                            x1=max(f.x1 for f in paquet)))
    return lignes


def grouper_en_items(lignes: list[Ligne],
                     colonne: str,
                     repli_max: float = ECART_REPLI_MAX,
                     item_min: float = ECART_ITEM_MIN) -> list[Item]:
    """Regroupe les lignes en items par écart vertical mesuré.

    Refuse si un écart tombe dans la bande ambiguë : mieux vaut ne rien écrire
    que de couper une consigne en deux, ou d'en coller deux ensemble.
    """
    items: list[Item] = []
    derniere_ordonnee: float | None = None
    for ligne in lignes:
        if derniere_ordonnee is None:
            items.append(Item(y=ligne.y, texte=ligne.texte, nb_lignes=1,
                              douteux=ligne.douteuse, x0=ligne.x0, x1=ligne.x1,
                              y_fin=ligne.y))
        else:
            ecart = ligne.y - derniere_ordonnee
            if ecart <= repli_max:
                items[-1].texte = normaliser_espaces(
                    items[-1].texte + " " + ligne.texte)
                items[-1].nb_lignes += 1
                items[-1].douteux = items[-1].douteux or ligne.douteuse
                items[-1].x0 = min(items[-1].x0, ligne.x0)
                items[-1].x1 = max(items[-1].x1, ligne.x1)
                items[-1].y_fin = ligne.y
            elif ecart >= item_min:
                items.append(Item(y=ligne.y, texte=ligne.texte, nb_lignes=1,
                                  douteux=ligne.douteuse, x0=ligne.x0,
                                  x1=ligne.x1, y_fin=ligne.y))
            else:
                raise RefusIngestion(
                    "ecart-ambigu",
                    f"colonne {colonne} : écart vertical ambigu de {ecart:.1f} pt "
                    f"à y={ligne.y:.1f} (ni repli ≤ {repli_max:g}, ni item "
                    f"≥ {item_min:g}) — structure non tranchable")
        derniere_ordonnee = ligne.y
    return items


def items_de_zone(fragments: list[Fragment],
                  avertissements: list[str],
                  zone: str,
                  repli_max: float = ECART_REPLI_MAX,
                  item_min: float = ECART_ITEM_MIN,
                  tolerance_y: float = TOLERANCE_LIGNE_Y) -> list[Item]:
    """Raccourci : lignes puis items, pour une zone déjà filtrée par position."""
    return grouper_en_items(
        grouper_en_lignes(fragments, avertissements, zone, tolerance_y),
        zone, repli_max, item_min)


def exiger_non_vide(items: list[Item], zone: str) -> list[Item]:
    """Une zone déclarée obligatoire par le format ne peut pas être vide."""
    if not items:
        raise RefusIngestion("zone-vide", f"zone « {zone} » vide : aucun item")
    return items


def exiger_compte(items: list[Item], zone: str, mini: int, maxi: int) -> list[Item]:
    """Le nombre d'items doit tomber dans la plage MESURÉE sur le corpus.

    Ce n'est pas une commodité : c'est le garde-fou qui attrape une fiche dont la
    mise en page a bougé sans qu'aucun écart ne devienne ambigu. Sans lui, une
    fiche à quatre questions au lieu de cinq passerait en silence.
    """
    if not mini <= len(items) <= maxi:
        raise RefusIngestion(
            "compte-inattendu",
            f"zone « {zone} » : {len(items)} item(s), hors de la plage mesurée "
            f"[{mini}, {maxi}]")
    return items


# --------------------------------------------------------------------------
# Enveloppe de brouillon
# --------------------------------------------------------------------------

def item_en_dictionnaire(rang: int, item: Item) -> dict:
    """La forme JSON commune d'un item — identique à celle du niveau 1."""
    return {
        "rang": rang,
        "texte": item.texte,
        "texteFiable": not item.douteux,
        "nbLignes": item.nb_lignes,
        "y": round(item.y, 1),
    }


def bloc_texte(fragments: list[Fragment], avertissements: list[str],
               zone: str) -> dict:
    """Le SUPPORT de lecture des niveaux 2 à 7 : le texte à comprendre.

    Il est rendu **ligne par ligne, avec son ordonnée**, et non recollé en items :
    les niveaux 2 à 7 composent un paragraphe dont l'interligne (23,9 à 30,0 pt
    mesurés) tombe au-dessus du seuil d'item. Vouloir en tirer des « items »
    serait inventer un découpage que la page ne porte pas. Le champ `contenu`
    donne la version recollée, qui est celle que l'enfant lira.
    """
    lignes = grouper_en_lignes(fragments, avertissements, zone)
    if not lignes:
        raise RefusIngestion("zone-vide",
                             f"zone « {zone} » vide : aucun texte support")
    return {
        "lignes": [{"texte": l.texte, "y": round(l.y, 1)} for l in lignes],
        "contenu": normaliser_espaces(" ".join(l.texte for l in lignes)),
        "nbLignes": len(lignes),
        "texteFiable": not any(l.douteuse for l in lignes),
    }


def titre_unique(fragments: list[Fragment], avertissements: list[str],
                 zone: str) -> str:
    """Le titre de la fiche — une seule ligne, sinon la structure a bougé."""
    lignes = grouper_en_lignes(fragments, avertissements, zone)
    if len(lignes) != 1:
        raise RefusIngestion(
            "compte-inattendu",
            f"zone « {zone} » : {len(lignes)} ligne(s) de titre au lieu d'une")
    return lignes[0].texte


def enveloppe(statut_raison: str, niveau: int, nom_source: str, fiche: Fiche,
              a_faire: list[str]) -> dict:
    """L'enveloppe commune aux brouillons des niveaux 2 à 6.

    Le niveau 1 a la sienne, figée depuis le contrat v1 : elle n'est PAS
    reconstruite ici, pour que la refactorisation reste neutre au bit près.
    """
    return {
        "statut": "brouillon-non-jouable",
        "raison": statut_raison,
        "origine": {"source": nom_source, "niveau": niveau,
                    "fiche": fiche.numero, "page": fiche.page},
        **fiche.corps,
        "aFaireALaMain": list(a_faire),
        "avertissements": fiche.avertissements,
    }
