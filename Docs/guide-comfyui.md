# Guide ComfyUI — La Pierre des Mots

**Écrit le** 2026-08-01, après cinq séries de génération de personnage qui n'ont pas convergé
**Statut** guide opérationnel. Chaque affirmation est adossée à une mesure, et la mesure est nommée
**Portée** la chaîne image du projet. Ne fige aucun design de personnage (décision D7)

> **Comment lire ce guide.** Il distingue trois qualités d'énoncé, toujours explicitement :
> **MESURÉ** — une commande a été exécutée sur cette machine et sa sortie est citée ;
> **SOUS RÉSERVE** — le fichier est présent et l'usage documenté, mais rien ici ne l'a encore éprouvé ;
> **ÉCARTÉ** — une source le recommandait, une mesure le contredit.
> Un guide qui ne fait pas cette distinction fabrique la confiance qui a coûté les cinq séries.

---

## 1. Le diagnostic — ce qui a réellement échoué

Les cinq séries n'ont pas échoué à tenir un personnage. **Elles n'ont jamais essayé d'en tenir un.**

Les 20 images de `production/personnages/gobi/` sont **20 créatures différentes**, avec 20 graines
différentes (`100000 + index*7717`), sur trois checkpoints, quatre jeux de réglages et deux
résolutions. Aucune technique de cohérence n'était applicable, parce qu'aucune ne fonctionne sans
**une image canonique déjà choisie**.

Les six verrous que l'annexe P § 3.3 prescrivait déjà, et leur état réel dans
`production/generer_personnage.py` :

| Verrou prescrit | État |
|---|---|
| Même checkpoint | **violé** — `flux1-schnell-fp8` → `juggernautXL` → `damnPonyIllustrious` |
| Mêmes CFG / pas / sampler | **violé** — CFG 1 / 6 pas → CFG 7 → CFG 6 / 28 pas / dpmpp_2m |
| Résolution fixe | **violé** — 1024² puis 832×1216 |
| Graine fixe entre variantes | **violé** — une graine par proposition |
| Fragment de style partagé, jamais réécrit | **violé** — réécrit à chaque série |
| Un seul facteur modifié par itération | **violé** — modèle, style, sujet et registre bougent ensemble |

Quand six facteurs bougent à chaque série, aucune série n'enseigne rien à la suivante. C'est cela
qui a fait « repartir de zéro à chaque correction ».

### Ce que ce guide aurait évité — 4 des 5 séries

| Série | Cause mesurée | Règle qui l'attrape | Évitée ? |
|---|---|---|---|
| **01** — « bébé kawaii » | aucun défaut technique : 6/6 à la porte technique | § 2, règle A — c'est l'étape (A) qui **fonctionne**, pas un échec | **non**, et c'est correct |
| **02** — « antagoniste » | correction de registre par **re-génération** : 4 nouvelles créatures, 4 graines | § 2, règle B — un trait se corrige par **édition** de la canonique. Mesuré : silhouette conservée à **99,9 %** pendant que les yeux sont réduits et les rougissements retirés | **oui** |
| **03** — « dodu, proche de l'orc » | idem | idem | **oui** |
| **04** — « super-héros adultes » | `juggernautXL`, base photoréaliste | § 7, liste blanche **bloquante**. Mesuré : `charger.py` lève `ModeleInterdit` sur ce fichier | **oui** |
| **05** — « griffonnage au feutre » | `damnPonyIllustrious`, **0/24 mesuré** à la porte technique | idem | **oui** |

La série 01 n'est pas évitée et ne doit pas l'être : produire quatre propositions au registre
imparfait, **c'est le travail normal de l'exploration**. Ce qui a manqué, c'est de la clore.

---

## 2. La méthode — deux problèmes, jamais mélangés

```
(A)  EXPLORATION texte -> image            personnage-exploration.api.json
       N propositions, graines libres, un seul fragment de style figé
       aucune technique de cohérence ne s'applique ici, et il ne faut pas en chercher
              |
              |   choix HUMAIN d'UNE image  (décision D7 — aucun design figé sans accord)
              v
       production/personnages/gobi/gobi-canonique.png      <-- LE seul verrou qui compte
              |
(B)  DÉCLINAISON par édition                profondeur de chaîne = 1, TOUJOURS
       |-- corriger un trait (yeux, ombre, expression)  personnage-declinaison.api.json
       |-- planche 4 vues                               personnage-planche.api.json
       |-- 25 graphèmes, corps gelé sous masque         personnage-cristal.api.json
              |
(C)  TRI humain, puis vectorisation, puis assets.lock.json
```

**Règle A — l'exploration ne se corrige pas, elle se clôt.** Tant qu'aucune image n'est retenue,
toute « correction de prompt » relance (A) et perd ce qui précédait. Les séries 02 à 05 sont
quatre relances de (A) déguisées en (B).

**Règle B — un trait se corrige par édition, jamais par re-génération.** MESURÉ le 2026-08-01 :
sur la canonique `flux_A-trait_g4004`, l'instruction « réduis les yeux, retire les ronds de
rougissement » donne un recouvrement de silhouette de **99,9 %** avec l'original — c'est le même
personnage, avec le trait corrigé. Une re-génération donne un recouvrement qui n'a aucune raison
d'être défini : c'est une autre créature.

**Règle C — profondeur de chaîne = 1.** On repart toujours de la canonique, jamais du résultat de
l'édition précédente. Black Forest Labs documente une dégradation visible après six éditions en
cascade ; sur 25 déclinaisons plus 5 états, une chaîne en cascade dérive sans que personne ne
le voie.

**Règle D — un seul facteur par itération.** Corollaire immédiat des six verrous violés.

---

## 3. Quel modèle pour quel usage

| Usage | Modèle | Statut | Workflow |
|---|---|---|---|
| **Explorer un design** (A) | `flux1-schnell-fp8` | **MESURÉ 6/6** | `personnage-exploration.api.json` |
| **Décliner une canonique** (B) | `qwen_image_edit_2511_bf16` | **MESURÉ** — identité 99,9 % | `personnage-declinaison.api.json` |
| **Planche de 4 vues** | idem | **MESURÉ** — les 4 vues sortent correctes | `personnage-planche.api.json` |
| **25 graphèmes, corps gelé** | `flux1-fill-dev` + masque | **MESURÉ** — 0,31 % de pixels bougent hors masque | `personnage-cristal.api.json` |
| **Décors** | `flux1-schnell-fp8` | **MESURÉ** — voir le piège du § 9.3 | `decor.api.json` |
| **Objets, vignettes** | `flux1-schnell-fp8` | **MESURÉ** | `objet.api.json` |
| **Pages de coloriage** | `flux1-schnell-fp8` | **MESURÉ** — le plus sûr des sept | `coloriage.api.json` |
| Rendu final plus fin que schnell | `flux1-dev` (+ `FLUX.1-Turbo-Alpha`) | **SOUS RÉSERVE** | — |
| Repli si Qwen Edit dérive | `flux1-dev-kontext_fp8_scaled` | **SOUS RÉSERVE** | — |
| Imposer une pose / une silhouette | ControlNet Union Flux ou Qwen | **SOUS RÉSERVE** | — |
| LoRA de personnage | `TrainLoraNode` natif | **SOUS RÉSERVE** — voir § 8.2 | — |

**Une correction à l'inventaire.** `flux1-dev` n'est **pas** chargeable par
`CheckpointLoaderSimple` : il est dans `diffusion_models/` et demande `UNETLoader` +
`DualCLIPLoader(clip_l, t5xxl_fp8_e4m3fn_scaled, type=flux)` + `VAELoader(ae)`.
`environnement-et-outillage.md` § 3 le range parmi les candidats sans le préciser.

**Une correction à l'état de l'art.** Le rapport recommandait `flux1-dev` pour la première image
et ne mentionnait pas `flux1-schnell-fp8`. Or **schnell est le seul modèle de cette installation
dont la conformité soit mesurée** (6/6), et il rend en 4,6 s à 1024² contre 10,6 s à 1536².
`flux1-dev` reste un candidat de qualité, mais il n'a rien prouvé ici.

---

## 4. Quels réglages

### 4.1 Les valeurs, par chaîne

| Chaîne | Pas | CFG / guidance | Sampler / ordonnanceur | Négatif | Résolution | Coût mesuré |
|---|---|---|---|---|---|---|
| **`flux1-schnell-fp8`** | **8** | **CFG 1,0** | `euler` / `simple` | **inerte** | 1024² (4,6 s) ou 1536² (10,6 s) | MESURÉ |
| **`qwen_image_edit_2511_bf16`** | **20** | **CFG 2,5** | `euler` / `simple` | **actif** | entrée ramenée à **1,0 MP** | 47 à 62 s, MESURÉ |
| **`flux1-fill-dev`** (inpainting) | **20** | CFG 1,0 + `FluxGuidance` **30,0** | `euler` / `normal` | **inerte** | taille de la canonique | 9 à 17 s, MESURÉ |
| `flux1-dev` | 20-28 | `FluxGuidance` 3,0-4,0 | `euler` / `beta` | inerte | 1024-1536² | SOUS RÉSERVE |
| `flux1-dev-kontext` | 20-28 | `FluxGuidance` 2,5-3,5 | `euler` / `simple` | inerte | jusqu'à ~2 MP | SOUS RÉSERVE |

**Le CFG de Qwen Edit était en litige entre deux rapports** — l'état de l'art annonçait 4,0,
l'inventaire 2,5, aucun des deux sur mesure. MESURÉ le 2026-08-01, même canonique, même graine,
même instruction : **les deux franchissent la porte technique** (fond blanc 100,0 %, 0 fuite,
32 et 45 composantes) et **les deux tiennent l'identité à 99,9 %**. CFG 4,0 applique l'instruction
plus durement et déforme davantage la crête. Sur une chaîne dont la consigne est « ne change
QUE cela », **2,5** est le bon réglage. Le litige était tranchable en 104 s de GPU.

### 4.2 Le prompt négatif — la règle, et sa preuve

> **Le négatif n'existe que si le CFG est strictement supérieur à 1.**

Le guidage sans classifieur interpole entre une prédiction conditionnée et une prédiction non
conditionnée. À CFG 1, il n'y a pas d'interpolation : le conditionnement négatif a un poids nul.

**MESURÉ, et il fallait le mesurer.** Sur `flux1-schnell-fp8`, graine 4004, trois variantes du
seul nœud négatif :

| Variante | sha256 du **fichier** | sha256 des **pixels** |
|---|---|---|
| `ConditioningZeroOut` | `ff9c3629f620c290` | `88c9093a18bd7982` |
| `CLIPTextEncode` vide | `29b60c985881dd3c` | `88c9093a18bd7982` |
| `CLIPTextEncode` + 30 interdits | `ecb4103796471109` | `88c9093a18bd7982` |

Écart moyen entre les images : **0,0000**. Écart maximum : **0,0**. Les images sont
**pixel pour pixel identiques**. Le négatif n'a strictement aucun effet.

> **Le contrôle qui a failli manquer.** Les trois `sha256` de fichier diffèrent — j'ai d'abord
> conclu que le négatif agissait. C'était faux : ComfyUI écrit le graphe dans un bloc de texte du
> PNG (1568, 1569 et 1873 caractères ici), et c'est **cette métadonnée** que le hachage voyait.
> Trois exécutions du même graphe donnent bien le même `sha256`, donc la génération est
> déterministe ; l'instrument, lui, ne l'était pas. Un fait mécanique ne se mesure pas avec
> n'importe quel instrument : **l'instrument aussi a besoin d'un témoin.**

**Conséquence pour `assets.lock.json`** (annexe P § 3.6) : le champ `empreinte` doit hacher les
**pixels**, pas le fichier. Sinon deux assets identiques régénérés avec un commentaire de prompt
différent portent deux empreintes différentes, et la reproductibilité est illusoire.

**Conséquence de conception, appliquée.** Dans les quatre workflows à CFG 1, le nœud négatif est un
`ConditioningZeroOut` et **non un champ de texte** : il est mécaniquement impossible d'y écrire un
interdit en croyant qu'il s'applique. C'est le correctif structurel des séries 01 à 03.

**Piège inverse.** Activer la LoRA `Qwen-Image-Edit-2511-Lightning-4steps` ramène Qwen Edit à
CFG 1 et **rend son négatif inerte à son tour**. On ne peut pas avoir en même temps les 5 s par
image et les interdits opposables.

### 4.3 Ce qu'une contrainte formulée en positif obtient — et ce qu'elle n'obtient pas

Puisque tout doit passer par le positif, encore faut-il savoir ce que le positif tient. MESURÉ :

| Contrainte, dans le prompt positif | Résultat mesuré | Verdict |
|---|---|---|
| `no color, no shading, no grey` | saturation **1,62 à 5,64** sur 6 graines, fond blanc 100,0 % | **tenue** |
| `no hatching` | fourrure dessinée en hachures sur les 6 images | **ignorée** |
| `no drop shadow, no ground shadow` | aplat noir sous les pieds : **12 829 px** sans la clause, **13 450 px** avec | **ignorée** |

> **La règle qui en découle : une négation de RENDU est honorée, une négation d'ÉLÉMENT DESSINÉ
> ne l'est pas.** On n'obtient pas la disparition d'un objet en écrivant qu'il ne faut pas le
> dessiner.

La clause anti-ombre a donc été **retirée** des workflows livrés plutôt que laissée en place à
induire en erreur. La bonne réponse est mesurée : l'instruction d'**édition** « remove the dark
shadow ellipse under the feet » ramène l'aplat de **12 829 px à 94 px**, soit **−99,3 %**.
C'est le même mécanisme que la règle B du § 2, sur un autre objet.

*Cela infirme la recommandation n° 6 du rapport d'essai (« interdire l'ombre portée au prompt »),
qui était une inférence et non une mesure.*

---

## 5. Noir et blanc ou couleur

**La question a été tranchée par un essai contrôlé de 48 images, et l'hypothèse « ça marche moins
bien parce que c'est en noir et blanc » est rejetée comme cause principale.**

À sujet identique et graines identiques :

| Condition | Modèle | Porte technique | Conformité au sujet |
|---|---|---|---|
| trait imposé | `flux1-schnell-fp8` | **6/6** | 4/6 |
| couleur libre | `flux1-schnell-fp8` | 0/6 | **4/6** |
| trait imposé | `damnPonyIllustrious` | 0/6 | 0/6 |
| couleur libre | `damnPonyIllustrious` | 0/6 | 0/6 |
| trait, convention à étiquettes (contrôle) | `damnPonyIllustrious` | 0/6 | 0/6 |
| couleur, convention à étiquettes (contrôle) | `damnPonyIllustrious` | 0/6 | 0/6 |

Source : `production/essais/qc-technique.csv`, 48 lignes.

**La mesure qui tranche : 4/6 en trait, 4/6 en couleur, sur les mêmes graines.** À graine égale, la
couleur n'améliore ni l'anatomie, ni l'expression, ni la conformité. Le registre « bébé » — yeux
immenses, ronds de rougissement — est **identique dans les deux conditions**. Il est orthogonal au
noir et blanc. Passer du noir et blanc à la couleur sur le modèle qui échouait : 0/6 → 0/6.
Garder le noir et blanc et changer de modèle : 0/6 → **6/6**. **L'effet appartient au checkpoint.**

Trois raisons de garder le trait, dont une seule était dans l'annexe P :

1. **La constance d'identité**, l'argument décisif et absent de l'annexe. Six graines en couleur
   ont donné six corps de teintes allant de **6° à 340°**, saturation de 19 à 91. Or la fiche § 3
   pose que « le corps ne change jamais ». Un Gobi engendré en couleur change de corps à chaque
   génération.
2. **Les régions fermées**, que la fiche § 5 exige pour Gobi aussi — pelage, cristal et cœur
   coloriables séparément, et un Cœur de Pierre qui pulse, donc piloté par le code.
3. **La mesure** : 0/24 image couleur ne franchit la porte technique.

**Une nuance de formulation à remonter.** L'annexe P § 2 écrit « ComfyUI ne génère que du trait
noir sur blanc ». C'est une contrainte sur le **livrable**, présentée comme une contrainte sur
l'**outil**. Rien n'interdit de produire de la couleur pour *choisir* un design. La mesure ne
montre toutefois **aucun gain de conformité** (4/6 des deux côtés) : le seul bénéfice défendable
est le confort du jugement humain, et il ne justifie pas de doubler chaque génération.

### 5.1 « Générer riche puis extraire le trait » — ÉCARTÉ

L'état de l'art recommandait de générer en valeurs riches puis d'extraire le trait. **La mesure
l'écarte** : extraction XDoG + seuil d'Otsu + fermeture morphologique appliquée aux 12 images
couleur donne **0/12** à la porte technique et **11/12 fuites**, avec **165 composantes d'encre**
en moyenne contre 57 en génération directe. Le trait extrait est un pointillé, pas un contour. Sur
`g1001` le corps est noirci en bloc par le seuil, sur `g5005` le contour disparaît entièrement.

La cause est structurelle : l'extraction cherche des **frontières de valeur**. Une illustration en
aplats doux n'en a pas là où il faut, et en a beaucoup là où il ne faut pas — les ronds de
rougissement deviennent des anneaux parasites. Le trait obtenu n'est pas le trait du dessin, c'est
la carte de ses contrastes.

*Réserve honnête* : l'extraction mesurée est **XDoG**, un filtre classique. Le préprocesseur
neuronal `AnyLineArtPreprocessor_aux`, présent sur la machine, **n'a pas été testé** et pourrait
faire mieux. Il reste SOUS RÉSERVE : ne pas bâtir de pipeline dessus avant de l'avoir mesuré
contre les mêmes 6 graines.

---

## 6. Comment on fige un personnage — la procédure

### 6.1 Étape (A) — obtenir une canonique

1. Écrire le **sujet** seul. La clause de rendu est figée dans le workflow, on n'y touche pas.
2. `personnage-exploration.api.json`, 6 à 12 graines, **un seul sujet**. Pas quatre créatures
   différentes : *une* créature, plusieurs tirages.
3. Passer la porte technique sur chacune. Le lot est sain si le taux est proche de 6/6.
4. **Un humain choisit UNE image** (D7). Elle est copiée sous
   `production/personnages/gobi/gobi-canonique.png` et **plus rien n'y touche**.
5. Si aucune ne convient : changer **un seul** élément du sujet, garder les mêmes graines, refaire.
   Comparer les deux planches côte à côte. C'est un témoin, et c'est ce qui a manqué cinq fois.

### 6.2 Étape (B) — décliner

Téléverser la canonique dans ComfyUI (`POST /upload/image` — le nœud `LoadImage` ne connaît que
des fichiers déjà présents côté serveur ; `charger.televerser()` le fait).

| Ce qu'on veut | Workflow | Ce que la mesure garantit |
|---|---|---|
| corriger un trait du visage ou du corps | `personnage-declinaison.api.json` | silhouette conservée à **99,9 %** |
| retirer un élément parasite (ombre au sol) | idem | aplat noir **−99,3 %** |
| changer la pose | idem | identité tenue ; **le recouvrement de silhouette ne s'applique plus** (§ 9.4) |
| les 4 vues de la fiche | `personnage-planche.api.json` | les 4 vues sortent correctes en 62 s |
| les 25 graphèmes | `personnage-cristal.api.json` | **0,31 %** de pixels modifiés hors masque |

### 6.3 Les 25 graphèmes — pourquoi c'est le cas facile, et pas le cas dur

La fiche § 3 pose « le corps ne change jamais, seul le cristal change ». Ce n'est pas une règle de
style : c'est l'énoncé exact d'un **inpainting régional**. Un masque de la crête, dessiné **une
fois**, réutilisé 25 fois.

MESURÉ, masque couvrant 17,1 % de l'image, deux crêtes demandées :

| | hors masque | dans le masque |
|---|---|---|
| écart moyen (sur 255) | **0,43** | 34,6 à 37,9 |
| pixels modifiés de plus de 8 niveaux | **0,31 %** | 21,0 % à 23,0 % |

Coût : **9,4 s et 16,6 s**. Les deux franchissent la porte technique.

> **Correction à l'état de l'art.** Il annonçait que « le corps est littéralement identique au
> pixel près » et que la différence hors masque « doit être nulle ». **Elle ne l'est pas** : le VAE
> ré-encode et re-décode l'image entière, pas seulement la région masquée. Deux conséquences :
> le contrat de sortie s'écrit « **au plus 0,5 % de pixels modifiés hors masque** », pas « zéro » ;
> et si l'on veut vraiment zéro, il faut **recomposer** le résultat avec la canonique en se servant
> du masque — la différence devient nulle par construction. C'est la voie recommandée pour les 25.

### 6.4 Le registre — un problème ouvert, et ce que la mesure en dit

Ce n'est pas un problème d'outil, et le guide ne le tranche pas (D7). Mais deux faits mesurés
doivent remonter à l'orchestrateur :

- **Les quatre règles de dessin de D27 ont été respectées et n'ont pas suffi.** Sourcils relevés,
  pupille nette, sourire franc, posture ouverte : conformes sur 6/6. Le registre « bébé » est
  resté sur les 6. Le levier n'est pas le sourcil.
- **Le levier est la taille des yeux**, et c'est aussi le point de validation n° 3 de la fiche § 6.
  MESURÉ : l'instruction d'édition « réduis nettement les yeux » l'obtient en une passe. **Mais**
  l'instruction contenait aussi « more determined », et le résultat est un visage **fâché** — la
  bascule vers l'antagoniste de la série 02, reproduite par un seul mot. C'est la confirmation
  expérimentale de D27 : **caractère n'est pas dureté**, et le modèle ne connaît pas la nuance.
  Formuler ce qu'on veut voir (« calme », « attentif », « complice »), jamais ce qu'on veut être.

---

## 7. La liste blanche — 17 fichiers, 8 exclusions motivées

Elle n'est pas documentaire : elle est **exécutable**, dans
`production/workflows/charger.py`, et le chargement d'un modèle hors liste lève `ModeleInterdit`.
C'est ce qu'exigeait `environnement-et-outillage.md` § 3 (« erreur bloquante, pas un défaut
silencieux »). L'installation compte 15 checkpoints, 19 UNET et 48 LoRA ; rien n'entre sans motif
écrit.

**MESURÉ — le blocage fonctionne :**

```
serie 04   juggernautXL_juggXIByRundiffusion.safetensors     BLOQUE
serie 05   damnPonyIllustrious_rebornIllustrious.safetensors BLOQUE
hors sujet lustifySDXLNSFW_oltFIXEDTEXTURES.safetensors      BLOQUE
LoRA       NSFW-22-H-e8.safetensors                          BLOQUE
```

### Autorisés — mesurés (4)

| Fichier | Preuve |
|---|---|
| `flux1-schnell-fp8.safetensors` | 6/6 à la porte technique |
| `qwen_image_edit_2511_bf16.safetensors` | déclinaison mesurée, identité 99,9 % |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | encodeur du précédent |
| `qwen_image_vae.safetensors` | VAE du précédent |

### Autorisés — sous réserve (13)

`qwen_image_edit_2511_fp8mixed` · `flux1-fill-dev` · `flux1-dev` · `flux1-dev-kontext_fp8_scaled` ·
`flux1-canny-dev` · `flux1-depth-dev` · `clip_l` · `t5xxl_fp8_e4m3fn_scaled` · `ae` ·
`FLUX\FLUX.1-dev-ControlNet-Union-Pro-2.0` · `Qwen-Image-InstantX-ControlNet-Union` ·
`FLUX.1-Turbo-Alpha` · `Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16`

Les deux seules LoRA autorisées sont **purement techniques** (distillation, accélération) :
aucune LoRA de style ni de contenu, conformément à D8. `flux1-fill-dev` est en fait mesuré depuis
aujourd'hui ; il reste marqué sous réserve tant qu'une seconde campagne ne l'a pas confirmé sur
d'autres masques.

### Exclus, avec motif (8)

| Fichier | Motif |
|---|---|
| `damnPonyIllustrious_rebornIllustrious` | **0/24 mesuré**, dans les quatre conditions. Ne dessine pas au trait : il photographie un objet. A coûté la série 05 |
| `juggernautXL_juggXIByRundiffusion` | base photoréaliste. A coûté la série 04 |
| `cyberrealisticPony_v110`, `cyberrealistic_v80Inpainting` | bases photoréalistes orientées adulte |
| `lustifySDXLNSFW_oltFIXEDTEXTURES` | explicitement pour adultes |
| `NetaYumev35_pretrained_all_in_one` | corpus anime non maîtrisé |
| `colossusProjectFlux_v12BehemothAIO` | fusion tierce, corpus non maîtrisé |
| `SDXL\controlnet-union-sdxl-1.0\…promax` | **aucun modèle SDXL n'étant plus autorisé, ce ControlNet n'a plus de modèle auquel s'appliquer** |

> **Trois écarts avec l'inventaire, et leurs motifs.** (1) Il gardait `damnPonyIllustrious` comme
> « explorateur rapide » — la mesure 0/24 l'exclut. (2) Il omettait `flux1-schnell-fp8`, seul
> modèle mesuré conforme — il est ajouté et devient le socle. (3) Il autorisait le ControlNet SDXL
> promax en même temps qu'un checkpoint SDXL ; les deux tombent ensemble.
>
> **Sur le décompte** : l'inventaire annonçait « 13 entrées » en regroupant. Ici on compte
> **17 noms de fichiers**, parce que c'est ce qu'une machine compare.

**Le point de vigilance produit de l'inventaire est tranché par la mesure** : `damnPonyIllustrious`
est une base Illustrious, famille dont le corpus d'entraînement inclut du contenu adulte, et le
prompt négatif du script ne couvrait aucun terme de nudité. Il est désormais hors liste pour une
raison purement technique (0/24), ce qui règle la question produit sans avoir à l'arbitrer.

---

## 8. Ce qu'il faudrait installer

### 8.1 Rien, pour le verrouillage de personnage

C'est le résultat le plus utile de la campagne. Qwen-Image-Edit 2511, ses nœuds
`TextEncodeQwenImageEditPlus` et `ReferenceLatent`, Flux Kontext, Flux Fill, les 7 ControlNet, les
préprocesseurs de trait et l'entraînement de LoRA natif sont **tous présents**. Le blocage des cinq
séries était méthodologique, pas outillé.

### 8.2 Ce qui manque vraiment

| Manque | Pourquoi | Statut |
|---|---|---|
| **`potrace`** | vectorisation, annexe P § 3.2. Bloque le lot L1b | déjà connu, à installer |
| **Une LoRA de personnage Gobi** | le verrouillage le plus fort pour 25 déclinaisons + 5 états. `TrainLoraNode`, `MakeTrainingDataset` et `LoraSave` sont natifs et présents : une soirée de GPU, rien à installer | **arbitrage d'orchestrateur** — D8 vise les LoRA *tierces*, pas une LoRA produite par le projet |
| Un modèle Qwen-Image **base** (texte→image) | absent ; rend inertes 3 des 4 LoRA Lightning Qwen | **optionnel** — Flux couvre le besoin |

Le dataset de LoRA se construit **depuis la canonique**, pas depuis l'exploration : la planche des
4 vues, découpée, plus une vingtaine de déclinaisons. Les 20 images actuelles sont **inutilisables
comme dataset** — ce sont 20 personnages, et la règle constante des sources est que 20 images
cohérentes battent 40 images divergentes.

### 8.3 Ce qu'il ne faut surtout PAS installer

**IPAdapter, InstantID, PuLID, PhotoMaker.** Et c'est un piège actif, à documenter pour qu'aucune
session ne le redécouvre :

- `/object_info` contient 8 nœuds dont le nom contient `ipadapter` — `easy ipadapterApply`,
  `easy ipadapterApplyFaceIDKolors`… **ce sont des façades**, toutes fournies par le seul module
  `comfyui-easy-use`, et le backend `ComfyUI_IPAdapter_plus` **n'est pas installé** ;
- `GET /object_info/IPAdapterModelLoader` renvoie `{}` ;
- `GET /models/ipadapter` renvoie **un seul fichier**, `ip-adapter-plus-face_sd15`, un modèle de
  visage SD1.5 — sans objet pour une créature non humaine.

Un agent qui voit ces nœuds dans la liste et bâtit un workflow dessus obtient une erreur
d'exécution, pas un résultat. **L'annexe P § 3.3 prévoit « à défaut un IPAdapter de style avec
image de référence figée » : ce repli n'existe pas ici, et ce n'est plus la bonne réponse.** Le
repli correct est Qwen Edit ou Kontext avec image de référence — ce que ce guide fait.

---

## 9. Les pièges mesurés

### 9.1 Un workflow ne se soumet jamais tel quel

**MESURÉ** : `POST /prompt` avec la clé de commentaire `_commentaire` en tête renvoie
`HTTP 400 · missing_node_type · Node 'ID #_commentaire' has no class_type`. Les workflows portent
tous un en-tête de commentaire, comme l'exige la campagne ; **c'est le chargeur qui retire les
clés commençant par `_`**, et il faut passer par lui.

### 9.2 Le sha256 d'un PNG ComfyUI n'est pas l'empreinte de l'image

Voir § 4.2. Hacher les **pixels** pour `assets.lock.json`.

### 9.3 La porte technique de l'annexe P suppose un sujet détouré

**Deux faux rejets mesurés le même jour** :

| Asset | Verdict de la porte | Réalité |
|---|---|---|
| décor de clairière, 1536² | ÉCHEC — fond blanc 97,4 %, fuite | **l'image est un bon décor au trait** |
| planche des 4 vues | ÉCHEC — fuite | **les 4 vues sont correctes** |

Le test de fuite de l'annexe P § 3.2 inonde le blanc depuis les quatre coins et le compare à la
boîte englobante **du sujet**. Il suppose **un** sujet détouré sur fond blanc. Un décor est une
scène ouverte qui touche les bords : l'inondation le traverse forcément. Une planche contient
quatre sujets : le blanc qui les sépare est relié à l'extérieur.

**Ce qu'il faut faire** — à trancher par l'orchestrateur avant le lot L1b :
- **planche** : découper en vignettes d'abord, tester chaque vignette ensuite ;
- **décor** : le critère qui compte n'est pas « le sujet est-il fermé » mais « chaque **région
  coloriable** est-elle fermée ». Compter les régions et vérifier qu'aucune n'excède une part
  fixée de l'image.

Ne pas rejeter des assets corrects sur ce test-là.

### 9.4 Le recouvrement de silhouette ne mesure l'identité que si la pose ne change pas

**MESURÉ** : 99,9 % sur une correction de visage, **23,9 %** sur une rotation de trois quarts —
alors que le personnage est manifestement le même dans les deux cas. Juger une déclinaison de pose
sur ce chiffre, c'est rejeter un bon asset.

### 9.5 Le plafond de 40 régions coloriables se vérifie, il ne se suppose pas

**MESURÉ** : un coffre en bois donne **42 régions**, deux de plus que le plafond de l'annexe
P § 3.5, pour une image par ailleurs impeccable. La fourchette 6-40 est un garde-fou, pas une loi
de la nature.

---

## 10. Ce que ce guide n'a PAS mesuré

À traiter comme non su, et non comme probable :

- `flux1-dev`, `flux1-dev-kontext`, les ControlNet, `FLUX.1-Turbo-Alpha` : aucun n'a été exécuté ;
- `AnyLineArtPreprocessor_aux` : non testé (§ 5.1) ;
- l'entraînement d'une LoRA par `TrainLoraNode` : non exécuté ;
- la tenue de l'identité **au-delà d'une édition** : la profondeur de chaîne 1 est une règle reprise
  de la documentation de l'éditeur, pas une mesure de ce dépôt ;
- les chiffres « 85-92 % contre 65-75 % de cohérence inter-vues » qui circulent dans les guides de
  2026 : non reproductibles en l'état, **écartés comme source**. Le seul chiffre d'identité de ce
  guide est le 99,9 % mesuré ici, sur une opération précise.

---

## 11. Corrections à apporter aux documents de référence

Je n'écris pas dans ces fichiers. À l'orchestrateur :

**`Docs/environnement-et-outillage.md`**
- § 3, tableau : « Version 0.29.0 » et « PyTorch 2.13.0+cu130 ». MESURÉ sur `/system_stats` :
  **0.29.2** et **2.13.0+cu132**. Le corps du texte dit déjà 0.29.2 — c'est le tableau qui est en
  retard.
- § 3 ne mentionne ni **Flux.1 Kontext dev** (présent en deux variantes), ni **`flux1-fill-dev`**,
  ni **`TrainLoraNode`** natif.
- § 3 range `flux1-dev` parmi les candidats sans dire qu'il n'est **pas** chargeable par
  `CheckpointLoaderSimple`.
- § 3 dit « à CFG 1 le prompt négatif est inerte » : **c'est exact, et c'est désormais mesuré au
  pixel près** (§ 4.2). La formulation peut passer d'un constat à une preuve.

**`Docs/annexe-P-production-et-agent.md`**
- § 3.3 : le repli « IPAdapter de style » **n'existe pas sur cette machine** et n'est plus la bonne
  réponse (§ 8.3).
- § 3.2 : le test de fuite est écrit pour un sujet détouré ; il faut un critère distinct pour les
  décors et les planches (§ 9.3).
- § 3.5 : la fourchette 6-40 régions est franchie par un asset correct (§ 9.5).
- § 3.6 : préciser que l'`empreinte` porte sur les **pixels** (§ 9.2).
- § 2 : « ComfyUI ne génère que du trait noir sur blanc » est une contrainte sur le livrable, écrite
  comme une contrainte sur l'outil (§ 5).

**`Docs/fiche-personnage-gobi.md`** — deux des trois points ouverts du § 6 ont maintenant des
éléments mesurés : le pelage velouté produit des **hachures internes** contraires au § 1 de la
fiche elle-même (le lisse est plus sûr) ; et la proportion yeux/corps est bien le levier du
registre, corrigeable en une passe d'édition (§ 6.4).

---

## 12. Journal des mesures du 2026-08-01

23 images générées, coût GPU d'environ 8 minutes.

| Repère | Question | Réponse mesurée |
|---|---|---|
| M0 | ComfyUI accepte-t-il une clé de commentaire ? | **non** — HTTP 400 `missing_node_type` |
| M1 | le négatif agit-il à CFG 1 ? | **non** — 3 variantes, pixels identiques, écart max 0,0 |
| M1bis | l'instrument est-il valide ? | le `sha256` de fichier voyait la métadonnée ; 3 exécutions du même graphe donnent le même `sha256` |
| M2 | la clause anti-ombre agit-elle ? | **non** — 12 829 px → 13 450 px. Clause retirée |
| M3 | 1536² franchit-il la porte ? | **oui**, 2/2, 10,6 s contre 4,6 s |
| M5a | Qwen Edit tient-il l'identité ? | **oui** — silhouette 99,9 %, CFG 2,5 et 4,0 ; 2,5 retenu |
| M5b | l'édition retire-t-elle l'ombre ? | **oui** — 12 829 px → 94 px |
| M6 | la planche des 4 vues sort-elle ? | **oui**, 62,2 s ; la porte technique la rejette à tort |
| M7 | décor / objet / coloriage rendent-ils ? | oui ; le décor est rejeté à tort par la porte |
| M8 | l'inpainting gèle-t-il le corps ? | **oui** — 0,31 % de pixels hors masque, 9 à 17 s |

Scripts de mesure et images : dossier de travail de la session. Les données qui font foi restent
`production/essais/qc-technique.csv` (48 lignes) et `production/essais/journal-essai.json`.
