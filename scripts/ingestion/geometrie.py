# -*- coding: utf-8 -*-
"""Géométrie de la page — lot L2-G. **Par position, jamais par heuristique.**

Ce module est le seul à toucher une page PyMuPDF. Il rend des `Fragment` et des
`Illustration`, et il offre les trois opérations que les sept formats partagent :

1. **repérer un en-tête** par son texte, à sa position mesurée, et refuser sinon ;
2. **séparer deux colonnes** à une abscisse mesurée, et refuser si un fragment
   est à cheval — auquel cas les colonnes ne SONT pas séparables par position ;
3. **relever une bbox** — celle d'une illustration, celle d'une zone de réponse.

LA RÈGLE QUI COMMANDE TOUT LE FICHIER
-------------------------------------
Une constante de position vient d'une MESURE citée dans le format qui l'emploie,
et le script vérifie qu'il la retrouve. Il ne la ré-estime jamais à l'exécution :
ré-estimer, c'est accepter n'importe quelle mise en page, donc accepter du faux.

`police` et `taille` sont relevées et servent de **signature** : `exiger_signature`
refuse une fiche dont la typographie n'est pas celle du niveau. Elles ne servent
jamais à deviner le rôle d'un fragment — c'est la position qui le donne.
"""

from __future__ import annotations

from dataclasses import dataclass

from formats.commun import Fragment, normaliser_espaces, sans_accents
from refus import RefusIngestion


@dataclass
class Illustration:
    """Un bloc image de la page, avec sa taille en pixels."""
    x0: float
    y0: float
    x1: float
    y1: float
    largeur: int | None
    hauteur: int | None

    @property
    def aire(self) -> float:
        return (self.x1 - self.x0) * (self.y1 - self.y0)

    def en_dictionnaire(self) -> dict:
        return {
            "bboxPt": [round(self.x0, 1), round(self.y0, 1),
                       round(self.x1, 1), round(self.y1, 1)],
            "pixels": [int(self.largeur or 0), int(self.hauteur or 0)],
            "viewBoxPropose": f"0 0 {int(self.largeur or 0)} {int(self.hauteur or 0)}",
        }


# --------------------------------------------------------------------------
# Lecture de la page
# --------------------------------------------------------------------------

def lire_fragments(page) -> list[Fragment]:
    """Tous les spans textuels de la page, position et signature comprises."""
    fragments: list[Fragment] = []
    for bloc in page.get_text("dict")["blocks"]:
        if bloc.get("type") != 0:
            continue
        for ligne in bloc.get("lines", ()):
            for span in ligne.get("spans", ()):
                texte = normaliser_espaces(span.get("text", ""))
                if not texte:
                    continue
                x0, y0, x1, y1 = span["bbox"]
                fragments.append(Fragment(
                    x0=x0, x1=x1, y0=y0, y1=y1, texte=texte,
                    police=str(span.get("font", "")).split("+")[-1],
                    taille=round(float(span.get("size", 0.0)), 1)))
    return fragments


def lire_illustrations(page) -> list[Illustration]:
    """Tous les blocs non textuels de la page, dans l'ordre de lecture."""
    illustrations: list[Illustration] = []
    for bloc in page.get_text("dict")["blocks"]:
        if bloc.get("type") == 0:
            continue
        x0, y0, x1, y1 = bloc["bbox"]
        illustrations.append(Illustration(
            x0=x0, y0=y0, x1=x1, y1=y1,
            largeur=bloc.get("width"), hauteur=bloc.get("height")))
    return illustrations


# --------------------------------------------------------------------------
# Repérage d'en-têtes
# --------------------------------------------------------------------------

def fragments_du_repere(fragments: list[Fragment], repere: str,
                        x_min: float = 0.0, x_max: float = 1e9,
                        y_min: float = 0.0) -> list[Fragment]:
    """Les fragments dont le texte normalisé contient `repere`, dans la fenêtre."""
    cible = sans_accents(repere)
    return [f for f in fragments
            if cible in sans_accents(f.texte)
            and x_min <= f.x0 < x_max and f.y0 >= y_min]


#: Signature typographique des en-têtes de consigne, mesurée identique sur les
#: 90 fiches des niveaux 2 à 7 : KGPrimaryPenmanship 19,9 pt.
POLICE_ENTETE, TAILLE_ENTETE = "KGPrimaryPenmanship", 19.9


def bas_du_repere(fragments: list[Fragment], repere: str, libelle: str,
                  y_attendu: float, tolerance: float,
                  x_min: float = 0.0, x_max: float = 1e9,
                  y_min: float = 0.0,
                  police: str = POLICE_ENTETE,
                  taille: float = TAILLE_ENTETE) -> float:
    """Ordonnée du BAS de l'en-tête ENTIER, vérifiée contre sa position mesurée.

    Deux gestes distincts, et l'ordre compte :

    1. le **repère** identifie le format — c'est un morceau de texte, il peut
       n'occuper que la première des deux lignes de l'en-tête ;
    2. le **bas** est celui de tout le bloc d'en-tête, repéré par sa signature
       typographique dans la même fenêtre.

    Confondre les deux est le piège mesuré au niveau 5 : « Cherche et colorie la
    réponse dans le | texte. » tient sur deux lignes, le repère finit à 534,6 pt
    et le bloc à 551,1 pt. Prendre le bas du repère seul reprend « texte. »
    comme si c'était du corps, et fait dérailler tout le groupement.

    Le corps commence donc sous le bas du BLOC, jamais sous celui du repère.
    """
    trouves = fragments_du_repere(fragments, repere, x_min, x_max, y_min)
    if not trouves:
        raise RefusIngestion(
            "repere-introuvable",
            f"en-tête « {libelle} » introuvable entre x={x_min:g} et x={x_max:g}")
    bloc = [f for f in signature(fragments, police, taille)
            if x_min <= f.x0 < x_max and f.y0 >= y_min]
    bas = max(f.y1 for f in bloc + trouves)
    if abs(bas - y_attendu) > tolerance:
        raise RefusIngestion(
            "repere-mal-place",
            f"bas de l'en-tête « {libelle} » mesuré à y={bas:.1f}, hors de "
            f"{y_attendu:g} ± {tolerance:g} : la mise en page n'est pas celle "
            f"attendue par ce format")
    return bas


# --------------------------------------------------------------------------
# Séparation de colonnes
# --------------------------------------------------------------------------

def exiger_colonnes_separables(fragments: list[Fragment], x: float) -> None:
    """Refuse si un fragment enjambe l'abscisse de séparation.

    Un fragment à cheval prouve que les deux colonnes ne sont PAS séparables par
    position sur cette fiche : tout ce qu'on en tirerait serait une devinette.
    """
    a_cheval = [f for f in fragments if f.x0 < x < f.x1]
    if a_cheval:
        raise RefusIngestion(
            "colonnes-non-separables",
            f"{len(a_cheval)} fragment(s) à cheval sur la séparation x={x:g} : "
            f"les colonnes ne sont pas séparables par position "
            f"(premier : {a_cheval[0].texte!r})")


def colonne(fragments: list[Fragment], x_min: float = 0.0,
            x_max: float = 1e9) -> list[Fragment]:
    """Les fragments dont l'origine tombe dans la bande [x_min, x_max[."""
    return [f for f in fragments if x_min <= f.x0 < x_max]


def sous(fragments: list[Fragment], y: float) -> list[Fragment]:
    """Les fragments dont le sommet est strictement sous `y`."""
    return [f for f in fragments if f.y0 > y]


def entre(fragments: list[Fragment], y_haut: float, y_bas: float) -> list[Fragment]:
    """Les fragments dont le sommet tombe dans la bande ]y_haut, y_bas[."""
    return [f for f in fragments if y_haut < f.y0 < y_bas]


def signature(fragments: list[Fragment], police: str,
              taille: float) -> list[Fragment]:
    """Les fragments qui portent cette police et cette taille.

    La comparaison est un PRÉFIXE, pas une égalité : PyMuPDF tronque les noms de
    police longs (mesuré : « GlacialIndifference-Regular » est rendu
    « GlacialIndifference-Regu »). Épingler le nom complet ferait échouer tous
    les formats à la première mise à jour de la bibliothèque, pour une raison
    qui n'a rien à voir avec le corpus.
    """
    return [f for f in fragments
            if f.police.startswith(police) and abs(f.taille - taille) < 0.05]


def exiger_signature(fragments: list[Fragment], police: str, taille: float,
                     zone: str, mini: int) -> list[Fragment]:
    """La zone doit porter au moins `mini` fragments de cette signature.

    C'est le contrôle qui attrape une fiche recomposée dans une autre police :
    la géométrie pourrait encore tomber juste, la typographie non.
    """
    trouves = signature(fragments, police, taille)
    if len(trouves) < mini:
        raise RefusIngestion(
            "compte-inattendu",
            f"zone « {zone} » : {len(trouves)} fragment(s) en {police} "
            f"{taille:g} pt, au moins {mini} attendu(s) — la signature "
            f"typographique de ce niveau n'est pas retrouvée")
    return trouves


# --------------------------------------------------------------------------
# Bbox
# --------------------------------------------------------------------------

def bbox(elements) -> list[float] | None:
    """Boîte englobante d'une liste de `Fragment` ou d'`Illustration`."""
    elements = list(elements)
    if not elements:
        return None
    return [round(min(e.x0 for e in elements), 1),
            round(min(e.y0 for e in elements), 1),
            round(max(e.x1 for e in elements), 1),
            round(max(e.y1 for e in elements), 1)]


def illustration_unique(page, aire_mini: float) -> Illustration:
    """Le bloc image de la fiche. Refuse s'il n'y en a pas exactement un.

    « Exactement un » est la seule forme vérifiable : deux blocs au-dessus du
    seuil, et rien ne dit lequel est la scène.
    """
    candidats = [i for i in lire_illustrations(page) if i.aire >= aire_mini]
    if len(candidats) != 1:
        raise RefusIngestion(
            "illustration-introuvable",
            f"{len(candidats)} illustration(s) de plus de {aire_mini:g} pt² "
            f"au lieu d'une seule")
    unique = candidats[0]
    if not unique.largeur or not unique.hauteur:
        raise RefusIngestion("illustration-introuvable",
                             "illustration sans dimension en pixels")
    return unique
