# Les fiches d'origine — analyse du corpus réel

**Mesuré le** 2026-08-01, sur les 7 PDF versés dans `Docs/`
**Remplace** la description orale préalable, qui fusionnait deux formats distincts
**Méthode** extraction PyMuPDF, structure vérifiée par position (`x`, `y`), aucun comptage affirmé
sans commande à l'appui

---

## 1. Le corpus

**7 PDF × 15 fiches = 105 fiches**, format A4 (594 × 834 pt). Marquage `CP` sur le niveau 1,
`C2` (cycle 2) sur les niveaux 2 à 7. Chaque fiche porte l'en-tête « LECTURE / JE COMPRENDS », un
champ Prénom et une notation en étoiles.

**Trois propriétés qui changent le plan de production :**

1. **Le texte est extractible**, pas scanné. Aucun OCR nécessaire — l'ingestion lit le texte exact,
   avec ses positions.
2. **La structure est régulière et vérifiable par géométrie.** Sur le niveau 1, la séparation des
   deux colonnes à `x = 300` donne 79 consignes d'action et 86 affirmations, **zéro anomalie sur
   15 fiches**. L'ingestion peut être déterministe, pas heuristique.
3. **Les illustrations sont déjà du trait noir sur blanc à régions fermées** — c'est-à-dire
   exactement le format que la chaîne ComfyUI de l'annexe P § 2 s'efforce de produire. Elles sont
   directement vectorisables et coloriables.

## 2. La progression, niveau par niveau

C'est la découverte principale : **le format « lis et colorie » n'est que le niveau 1.** Les six
autres niveaux sont de la compréhension de texte, avec une tâche différente à chaque palier.

| Niveau | Support | Tâche demandée | Moteur v2 correspondant |
|---|---|---|---|
| **1** (CP) | **Une scène dessinée**, pas de texte narratif | « Je lis, je fais » — 5 consignes de coloriage et de dessin — puis 6 affirmations V/F **portant sur l'image** | `colorie` + un moteur de **placement** (manquant) |
| **2** | Texte documentaire (~8 lignes) | 8 affirmations vrai/faux sur le texte | `histoire` |
| **3** | Texte narratif avec dialogue | « Lis chaque question et **entoure la bonne image** » | `paires` ou `histoire`, variante à réponses illustrées |
| **4** | Texte documentaire | « Lis chaque question et **colorie la bonne réponse** » — QCM à 3 options | `histoire` en QCM |
| **5** | Texte narratif | « **Numérote de 1 à 5** l'ordre de l'histoire » | `chrono` — déjà prévu tel quel |
| **6** | Texte documentaire | « Réponds aux questions **en complétant la réponse** » — phrase à trou amorcée | `grave` ou saisie guidée |
| **7** | Texte documentaire | « Réponds aux questions **avec une phrase réponse** » — rédaction libre | **aucun** |

La trajectoire est nette et pédagogiquement saine : *agir sur une image* → *juger vrai ou faux* →
*choisir parmi des images* → *choisir parmi des mots* → *ordonner un récit* → *compléter une phrase*
→ *rédiger*. C'est la trajectoire « du déchiffrage au sens » que les specs visent, déjà découpée en
sept paliers par quelqu'un dont c'est le métier.

## 3. Le niveau 1 en détail — le modèle du moteur `colorie`

Fiche 1 (« l'école »), relevé exact :

**Scène** — illustration au trait, bbox `(52,182)-(567,526)`, 922 × 615 px.

**« Je lis, je fais : »** — 5 consignes numérotées, colonne gauche :

1. Le pull de la maîtresse est bleu.
2. Dessine un soleil dans le ciel.
3. Colorie les feuilles des arbres en vert.
4. Les garçons ont les cheveux bruns.
5. La porte de l'école est jaune et le toit est rouge.

**« Réponds vrai V ou faux F »** — 6 affirmations, colonne droite, avec case à cocher :

Les garçons jouent au ballon. · La maitresse est debout. · Une fille joue à la corde à sauter. ·
Les deux filles ont des couettes. · Il y a quatre arbres à côté de l'école. · L'école a une horloge
sur le toit.

### Quatre observations qui commandent la conception du moteur

**La forme dominante est l'affirmation descriptive, pas l'impératif.** Sur les 79 consignes du
niveau 1, les premiers mots les plus fréquents sont `le` (23), `la` (19), `les` (9) — loin devant
`dessine` (7) et `colorie` (1). L'enfant doit donc comprendre qu'« *Le pull de la maîtresse est
bleu* » **est un ordre**, alors que la phrase a la forme d'un constat. C'est une exigence
pragmatique réelle, et c'est plus difficile qu'un impératif. **À préserver** : transformer toutes
les consignes en impératifs appauvrirait l'exercice.

**Ce qui rend l'ambiguïté supportable, c'est la colonne d'à côté.** Une phrase de forme identique
— « *Les garçons jouent au ballon* » — est à juger, pas à exécuter. Ce n'est le titre de colonne
qui tranche. En jeu, la distinction devra être portée par le contexte (le compagnon, le geste
proposé, l'habillage), pas par un titre écrit que l'enfant ne lira pas.

**Une consigne peut porter plusieurs cibles.** La n° 5 en porte deux (porte jaune, toit rouge). Le
schéma d'exercice doit donc lier une consigne à une **liste** de couples (région, couleur), pas à
un couple unique.

**« Dessine » n'est pas « colorie ».** Sept consignes du niveau 1 demandent d'ajouter un élément
absent de la scène (« Dessine un soleil dans le ciel », « Dessine un seau à côté de l'homme assis
sur le banc »). Aucun des 12 moteurs de la v2 § 7 ne couvre ce geste. En numérique il devient un
**glisser-déposer vers une région cible**, mécaniquement validable, et il exerce quelque chose que
le coloriage n'exerce pas : la **localisation spatiale** (« à côté de », « dans le ciel »,
« sur le banc »). Voir § 5.

**Les V/F du niveau 1 ne portent pas sur un texte, mais sur l'image.** « Il y a quatre arbres à côté
de l'école » se vérifie en comptant sur le dessin. Ce n'est pas de la compréhension de récit, c'est
de la **lecture d'énoncé confrontée à une observation**. Distinction à conserver : elle ne
s'évalue pas comme la compréhension des niveaux 2 à 7, et ne devrait pas alimenter les mêmes
compétences.

## 4. Ce que ce corpus change dans le plan

**Le pipeline de génération d'images n'est plus sur le chemin critique.** L'annexe P dimensionnait
~600 assets à produire, en désignant le volume graphique comme le risque n° 3. Il y a ici
**105 scènes déjà dessinées, déjà au bon format**. L'ingestion (v2 § 13.4, lot L3) devient plus
rentable que la génération (lot L1a-L1b) et devrait passer devant : entraîner une LoRA de style
avant d'avoir ingéré ce qui existe serait produire ce qu'on possède déjà.

**Le style de référence est donné, pas à inventer.** Les 40 à 60 références de style que l'annexe P
§ 3.3 demandait de dessiner à la main pour entraîner la LoRA existent : ce sont ces illustrations.
Elles fixent le style cible et fourniront le corpus d'entraînement le jour où il faudra en produire
de nouvelles — dans le style de ce que l'enfant connaît déjà.

**Le contenu pédagogique des six régions a une base réelle.** 105 fiches réparties sur sept paliers
couvrent largement de quoi peupler les premières régions sans rien inventer, et sans dépendre d'un
LLM générateur pour le premier lot.

## 5. Ce que ce corpus oblige à trancher

| # | Point | Enjeu |
|---|---|---|
| **F1** | **Un moteur de placement manque au catalogue.** À ajouter aux 12 de la v2 § 7 — proposition : `place` (faire glisser un élément vers une région cible, tolérance 24 px conforme à R16) | Couvre les 7 consignes « Dessine… » du niveau 1 et exerce la localisation spatiale, absente de tous les autres moteurs |
| **F2** | **Le niveau 7 n'est pas validable automatiquement.** Rédaction libre d'une phrase réponse | Trois voies : un LLM juge local (llama.cpp est là), une validation parent différée, ou une transformation en phrase à trou façon niveau 6. À arbitrer |
| **F3** | **La forme « affirmation qui vaut consigne » doit survivre au passage en jeu**, alors que le titre de colonne qui la désambiguïse disparaît | C'est une compétence pragmatique réelle. La porter par le contexte de jeu, pas par un texte écrit |
| **F4** | **Le niveau 1 mélange deux compétences** — exécution de consigne, et vérification d'énoncé sur image. Les séparer dans le référentiel | Sinon le BKT agrège deux choses différentes et n'est interprétable ni pour l'une ni pour l'autre |
| **F5** | **Les illustrations sont du matériel tiers.** Usage familial privé, donc sans objet en pratique | À noter si le projet devait sortir du foyer. Les assets générés, eux, sont originaux |

## 6. Rappel — le paramètre BKT manquant

Le corpus **confirme et aggrave** le point relevé avant de l'avoir lu : le vrai/faux est le format
dominant des niveaux 1 à 3 (86 affirmations pour le seul niveau 1), et il se réussit une fois sur
deux au hasard. Le BKT de la v2 § 12.2 ne déclare que `p_init`, `p_transit` et `p_glissement` —
**il manque `p_devinette`**, à fixer par mode de réponse : ~0,50 en vrai/faux, ~0,33 en QCM à trois
options (niveaux 3 et 4), quasi nul en coloriage, en placement et en saisie.

Sans ce paramètre, une série de vrai/faux répondus au hasard **fait monter la maîtrise estimée** et
le sélecteur cesse de proposer une compétence non acquise. C'est nommément la « régression
pédagogique silencieuse » que l'annexe T § 1 désigne comme le premier risque du projet.
