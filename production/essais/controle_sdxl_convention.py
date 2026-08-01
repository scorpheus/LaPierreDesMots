# -*- coding: utf-8 -*-
"""Controle : le checkpoint SDXL echoue-t-il A CAUSE du noir et blanc, ou parce qu'on
lui parle mal ?

L'essai principal a montre que damnPonyIllustrious rend des photos de jouets 3D dans LES
DEUX conditions. Deux explications rivales :
  (H1) le checkpoint est inadapte au projet ;
  (H2) on l'a prompte en prose descriptive, alors que la famille Pony/Illustrious attend
       des ETIQUETTES et des jetons de qualite.
Refuser de trancher entre les deux, c'est imputer au noir et blanc un effet qui ne lui
appartient peut-etre pas. Ce script donne au checkpoint sa convention native, MEMES graines,
MEMES deux conditions, et ne change QUE la forme du prompt.

Usage : python production/essais/controle_sdxl_convention.py
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import essai_noir_et_blanc as E

# Convention native Illustrious : jetons de qualite en tete, puis etiquettes courtes.
QUALITE = "masterpiece, best quality, very aesthetic, absurdres, newest, "
SUJET_TAGS = (
    "1other, chibi, round fluffy creature, solo, full body, looking at viewer, "
    "short velvet fur, stubby arms, tiny round feet, no neck, "
    "large round eyes, clear pupils, raised eyebrows, open smile, happy, "
    "crystal crest on head and back, faceted gemstone shards, "
    "glowing gem on chest, simple background, centered"
)
RENDU_A = "monochrome, greyscale, lineart, thick outlines, white background, no shading"
RENDU_B = "colored, soft pastel palette, flat colors, children book illustration, cute"

E.CONDITIONS = {
    "D-trait-tags":   (QUALITE + RENDU_A, E.NEG_A),
    "E-couleur-tags": (QUALITE + RENDU_B, E.NEG_B),
}
E.SUJET = SUJET_TAGS
E.MODELES = {k: v for k, v in E.MODELES.items() if k == "sdxl"}
E.SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)))
E.JOURNAL = "journal-controle-sdxl.json"

if __name__ == "__main__":
    E.main()
