---
name: generer-asset
description: Produire un asset image du projet (personnage, décor, objet, page de coloriage) avec ComfyUI, sans refaire les cinq séries qui ont échoué. À utiliser dès qu'il s'agit de générer, décliner ou corriger une image d'asset — personnage Gobi et compagnons, planche de vues, déclinaisons de graphèmes, décors de région, objets de campement, vignettes d'exercice, coloriages. Couvre aussi les pièges de pilotage de ComfyUI : prompt négatif inerte à CFG 1, liste blanche de modèles, empreinte des PNG, porte technique inadaptée aux décors et aux planches.
---

# Générer un asset image

**Source qui fait foi : `Docs/guide-comfyui.md`.** Ce skill en est la procédure. En cas de doute
sur un chiffre, c'est le guide qui tranche, jamais la mémoire.

---

## 0. La règle qui commande tout

> **Il y a deux problèmes, et ils ne se mélangent jamais :
> (A) CHOISIR un design — (B) le DÉCLINER.**

Cinq séries ont échoué en croyant travailler sur (B) alors qu'elles relançaient (A) à chaque
correction de prompt. Les 20 images produites ne sont pas 20 variantes d'un personnage : ce sont
**20 personnages**, avec 20 graines, 3 checkpoints et 4 jeux de réglages.

**Aucune technique de cohérence n'existe tant qu'une image canonique n'a pas été choisie par un
humain.** Si `production/personnages/<perso>/<perso>-canonique.png` n'existe pas, tu es en (A) —
et tu n'as pas le droit d'espérer de la convergence.

---

## 1. Avant de générer — 4 vérifications, toutes mécaniques

```bash
# 1. ComfyUI répond ? (sinon on brûle son budget de tentatives sur des erreurs réseau)
curl -s http://127.0.0.1:8188/system_stats

# 2. les 7 workflows chargent et passent la liste blanche ?
python production/workflows/charger.py

# 3. le GPU est-il pris ? (ComfyUI, TTS et llama.cpp visent la même VRAM)
ls production/.gpu.lock 2>/dev/null && cat production/.gpu.lock

# 4. suis-je en (A) ou en (B) ?
ls production/personnages/*/[a-z]*-canonique.png 2>/dev/null || echo "PAS DE CANONIQUE -> etape (A)"
```

Si l'étape 2 échoue, **ne pas contourner** : `charger.py` refuse un modèle hors liste blanche, et
c'est exactement ce qui aurait évité les séries 04 et 05.

---

## 2. Étape (A) — explorer, puis CLORE

```python
import sys; sys.path.insert(0, "production/workflows")
import charger as C

SUJET = "…"  # UN seul sujet, décrit une fois. Pas quatre créatures différentes.

for graine in (1001, 2002, 3003, 4004, 5005, 6006):
    g = C.patcher(C.charger("personnage-exploration.api.json"),
                  sujet=SUJET, graine=graine,
                  prefixe=f"exploration-g{graine}")
    C.soumettre(g, destination=f"production/personnages/gobi/exploration/g{graine}.png")
```

Puis mesurer les six, puis **montrer la planche à l'utilisateur et attendre son choix**.

- Décision **D7** : aucun design n'est figé sans accord explicite. Ce n'est pas une formalité.
- Si le lot ne convient pas : changer **UN SEUL** élément du sujet, **garder les mêmes graines**,
  refaire, et comparer les deux planches côte à côte. C'est un témoin. Cinq séries n'en ont eu aucun.
- Ne **jamais** changer le modèle, le CFG, le sampler ou la résolution pour corriger un design.

Quand une image est retenue, la copier sous `…/<perso>-canonique.png`. **À partir de là, on ne
génère plus de personnage à partir de texte.**

---

## 3. Étape (B) — décliner depuis la canonique

```python
nom = C.televerser("production/personnages/gobi/gobi-canonique.png")   # LoadImage ne voit que
                                                                       # le dossier d'entrée
g = C.patcher(C.charger("personnage-declinaison.api.json"),
              instruction="turn the whole creature to a three-quarter view facing to its left",
              image=nom, graine=4004)
C.soumettre(g, destination="production/personnages/gobi/poses/trois-quarts.png")
```

| Ce que tu veux | Workflow | Champ |
|---|---|---|
| corriger un trait (yeux, expression, ombre parasite) | `personnage-declinaison.api.json` | `instruction=` |
| la planche des 4 vues | `personnage-planche.api.json` | `instruction=` |
| les 25 graphèmes, corps gelé | `personnage-cristal.api.json` | `cristal=` + `masque=` |
| un décor | `decor.api.json` | `sujet=` |
| un objet, une vignette | `objet.api.json` | `sujet=` |
| une page de coloriage | `coloriage.api.json` | `sujet=` |

**Profondeur de chaîne = 1.** On repart TOUJOURS de la canonique, jamais du résultat de l'édition
précédente. Une chaîne en cascade dérive silencieusement sur 600 assets.

**Rédiger une instruction d'édition** : nommer le sujet et la portée du changement.
`« raise the eyelids and open the mouth wide »` et non `« make it happier »`. Décrire ce qu'on veut
**voir**, jamais ce qu'on veut **être** — voir le piège 6 ci-dessous.

---

## 4. Après avoir généré — la porte technique

```python
import sys; sys.path.insert(0, "production/essais")
from qc_technique import mesurer
m = mesurer("chemin.png", "direct")
ok = (m["fond_blanc"] >= 99 and m["saturation_moy"] < 10
      and not m["fuite"] and m["composantes"] <= 400)
```

| Critère | Seuil | Valeur de référence mesurée |
|---|---|---|
| fond blanc pur | ≥ 99 % | 100,0 % sur les 6 témoins |
| saturation moyenne | < 10 | 1,62 à 5,64 |
| fuite (régions non fermées) | aucune | 0/6 |
| composantes d'encre | ≤ 400 | 24 à 95 |
| régions coloriables | 6 à 40 (annexe P) | 15 à 28 — **mais un coffre en donne 42, et il est correct** |

**Cette porte ne vaut que pour UN sujet détouré sur fond blanc.** Elle rejette à tort un décor
(scène ouverte, touche les bords) et une planche (quatre sujets, le blanc entre eux communique avec
l'extérieur). Les deux ont été mesurés. Pour une planche : découper d'abord, tester ensuite.

**Après un inpainting**, vérifier le contrat propre : hors du masque, **au plus 0,5 % de pixels
modifiés de plus de 8 niveaux** (mesuré : 0,31 %). Pour obtenir zéro, recomposer le résultat avec
la canonique en se servant du masque.

**Budget** : 5 tentatives maximum par asset, avec un correctif à chaque passe (annexe P § 3.5).
Au-delà, escalade humaine. Un agent qui relance 40 fois le même prompt brûle du GPU sans converger.

---

## 5. Les huit pièges, tous constatés

### 1. Le prompt négatif est INERTE à CFG 1
Mesuré au pixel près sur `flux1-schnell-fp8` : `ConditioningZeroOut`, texte vide et 30 interdits
donnent **la même image**, écart maximum **0,0**. C'est vrai de tous les modèles distillés — Flux
schnell, Flux dev, Flux Fill — et de **Qwen Edit dès qu'on active la LoRA Lightning**.
→ Les workflows à CFG 1 n'ont **pas de champ négatif** : c'est un `ConditioningZeroOut`. Ne pas
en remettre un. Tout se formule en positif.
→ `personnage-declinaison` et `personnage-planche` tournent à CFG 2,5 : **là, le négatif agit**.
Ne jamais copier un négatif de l'un vers l'autre.

### 2. Une négation de rendu passe, une négation d'élément dessiné ne passe pas
`no color, no shading, no grey` : **tenu** (saturation 1,6 à 5,6).
`no hatching` et `no drop shadow` : **ignorés** (l'ombre passe de 12 829 px à 13 450 px *avec* la
clause).
→ **On ne retire pas un élément par le prompt de génération, on le retire par une passe
d'édition** : la même ombre tombe à 94 px, soit −99,3 %.

### 3. On ne soumet jamais un fichier de workflow tel quel
`POST /prompt` avec la clé `_commentaire` → **HTTP 400 `missing_node_type`**. Passer par
`charger.charger()`, qui retire les clés commençant par `_`.

### 4. Le sha256 d'un PNG ComfyUI n'est pas l'empreinte de l'image
ComfyUI écrit le graphe dans un bloc de texte du PNG. Trois images **pixel pour pixel identiques**
ont trois `sha256` de fichier différents. Pour `assets.lock.json`, hacher les **pixels**
(`Image.open(f).tobytes()`).

### 5. Ces modèles sont hors liste, et deux d'entre eux ont coûté une série
`damnPonyIllustrious` (**0/24 mesuré** — il photographie des jouets 3D, il ne dessine pas),
`juggernautXL` (photoréaliste → super-héros adultes), et toutes les bases orientées adulte.
`charger.py` les bloque. **Ne pas l'amender pour débloquer une génération.**

### 6. « Determined » donne un visage fâché
Mesuré : l'instruction « réduis les yeux **et donne un air plus déterminé** » a produit des
sourcils froncés et une bouche fermée — la bascule vers l'antagoniste de la série 02, reproduite
par un seul mot. Décision **D27** : *caractère n'est pas dureté*. Formuler « calme », « attentif »,
« complice » — jamais un mot qui décrit une intention.

### 7. IPAdapter, InstantID et PuLID n'existent pas ici
`/object_info` affiche 8 nœuds `easy ipadapter*` : **ce sont des façades** sans backend installé.
Un workflow bâti dessus donne une erreur d'exécution. Le seul modèle présent est un *face* SD1.5,
sans objet pour une créature. **Ne pas les installer** : le bon outil est déjà là (Qwen Edit).

### 8. Le recouvrement de silhouette ne mesure l'identité que si la pose ne change pas
99,9 % sur une correction de visage ; **23,9 %** sur une rotation de trois quarts, alors que c'est
le même personnage. Ne pas rejeter une déclinaison de pose sur ce chiffre.

---

## 6. Ce que tu n'as pas le droit de faire

- **Modifier la structure d'un `*.api.json`** (annexe P § 3.4). Seuls le prompt, la graine, la
  résolution et le nom de fichier sont modifiables, et `patcher()` est la seule voie.
- **Réécrire le fragment de style** d'un workflow. Il est figé et partagé ; le sujet se substitue à
  `{SUJET}`, il ne remplace pas la clause de rendu.
- **Ajouter un modèle à `charger.py`** sans motif écrit et sans mesure.
- **Écrire dans `contenu/habillages/`** : tout passe par les brouillons et la relecture parent.
- **Figer un design** sans accord explicite de l'utilisateur (D7).
- **Nommer une œuvre, un studio ou un personnage existant** dans un prompt (annexe P § 3.3).

---

## 7. Journaliser — sinon l'asset n'est pas reproductible

Toute image retenue produit une entrée dans `production/assets.lock.json` (annexe P § 3.6) :
workflow et sa version, modèle, prompt complet **après substitution**, graine, pas, CFG, sampler,
résolution, résultats de QC, et l'empreinte **des pixels**. Sans ce fichier, la bibliothèque
devient un cimetière d'images dont personne ne sait comment elles ont été faites.

---

## 8. Repères de coût mesurés

| Opération | Durée |
|---|---|
| exploration, 1024² | **4,6 s** |
| exploration ou décor, 1536² | **10,6 s** |
| déclinaison Qwen Edit | **47 à 57 s** |
| planche des 4 vues | **62 s** |
| inpainting d'une région | **9 à 17 s** |

Le GPU n'a jamais été le facteur limitant : les 48 images de l'essai contrôlé ont coûté 125 s.
Ce qui manquait, c'était un témoin.
