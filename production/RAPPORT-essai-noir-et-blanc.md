# Essai contrôlé — « ça marche moins bien parce que c'est en noir et blanc » ?

**Mesuré le** 2026-08-01, sur ComfyUI 0.29.2, RTX 5090
**Statut** essai empirique, 36 images générées sur GPU + 12 extractions, 48 images mesurées
**Portée** teste l'hypothèse de l'utilisateur, et elle seule. Ne fige aucun design.

---

## Verdict en une phrase

**L'hypothèse est rejetée comme cause principale, et la vraie cause est mesurée : c'est le
checkpoint.** À sujet et graines identiques, passer du noir et blanc à la couleur sur le modèle
qui échouait n'a rien changé (0/6 → 0/6) ; garder le noir et blanc et changer de modèle a fait
passer de 0/6 à 6/6 à la porte technique. L'effet appartient au modèle, pas à la couleur.

| Condition | Porte technique | Conformité au sujet | **Exploitables bout en bout** |
|---|---|---|---|
| **A — trait imposé au prompt** | **6/12** | 4/12 | **4/12** |
| **B — couleur, sans contrainte** | 0/12 | 4/12 | **0/12** |
| **C — trait extrait de B** | 0/12 | 4/12 (héritée) | **0/12** |
| D — trait, convention native (contrôle) | 0/6 | 0/6 | 0/6 |
| E — couleur, convention native (contrôle) | 0/6 | 0/6 | 0/6 |
| **Total** | **6/48** | 12/48 | **4/48** |

Les 6 réussites techniques sont **toutes** en condition A sur Flux, et Flux en condition A réussit
**6/6**. Aucune autre combinaison ne produit une seule image exploitable.

---

## 1. Ce qui a été fait

### 1.1 Le protocole

Un **seul sujet**, écrit une fois, tiré de `fiche-personnage-gobi.md` § 2 et des décisions D20
(structure cristalline), D24 (deux bras courts) et D27 (sourcils relevés, pupille nette, sourire
franc, posture ouverte). Aucune œuvre ni studio n'est nommé (annexe P § 3.3).

Entre les conditions, **seule la clause de rendu change** — le sujet, la résolution (1024²), les
graines (1001, 2002, 3003, 4004, 5005, 6006) et la base négative sont identiques. C'est la seule
manière d'imputer un écart à la couleur plutôt qu'à autre chose.

| | Clause de rendu | Négatif |
|---|---|---|
| **A** | `black and white line art, clean bold black ink outlines…, no color, no shading` | base **+ `color, colored, colorful, grey shading, gradient, painted`** |
| **B** | `children's picture book illustration, soft warm colors, clean flat color shapes…` | base seule |
| **C** | *(aucune génération)* extraction XDoG + fermeture morphologique appliquée aux images de B | — |

### 1.2 Les deux familles de modèles

| Clé | Checkpoint | Architecture | Réglages |
|---|---|---|---|
| `flux` | `flux1-schnell-fp8` | Flux, transformeur de flot rectifié, latent 16 canaux | 8 pas, CFG 1, euler/simple |
| `sdxl` | `damnPonyIllustrious_rebornIllustrious` | SDXL, entraînement Illustrious | 28 pas, CFG 6, dpmpp_2m/karras |

Deux architectures distinctes, pas deux réglages du même modèle. `damnPonyIllustrious` est celui de
la série 05 ; le choix n'est pas neutre, c'est l'accusé.

### 1.3 Le contrôle qui empêchait de conclure trop vite

L'essai principal a montré que `damnPonyIllustrious` échoue **dans les deux conditions**. Deux
explications rivales : le checkpoint est inadapté (H1), ou on lui parle mal — la famille
Pony/Illustrious attend des **étiquettes** et des jetons de qualité, pas de la prose descriptive
(H2). Conclure sans trancher, c'était imputer au noir et blanc un effet qui ne lui appartient
peut-être pas. Conditions **D** et **E** : mêmes graines, mêmes deux conditions, on ne change que
la **forme** du prompt (`masterpiece, best quality, very aesthetic, absurdres,` + étiquettes).

**Résultat du contrôle, et il est nuancé** : la convention native fait bien obéir le modèle sur la
teneur chromatique — saturation moyenne **35,8 → 5,4** entre A et D — mais elle ne fait pas
apparaître de trait. En D il rend des **peluches 3D en niveaux de gris, ombrées**, pas du trait à
plat. Conclusion : ce checkpoint sait faire « monochrome », il ne sait pas faire « dessin au
trait ». H1 l'emporte sur le fond, H2 sur la seule question de la couleur.

---

## 2. Les mesures

Toutes exécutées par `production/essais/qc_technique.py`, détail par image dans
`production/essais/qc-technique.csv`. Rien ici n'est affirmé : tout est compté.

```
condition     mod       sat   fond%  encre%  ep.px  regions  compos.  fuites
----------------------------------------------------------------------------
A-trait       flux      3.5   100.0    5.32   14.0     22.0       57    0/6
A-trait       sdxl     35.8     0.0   26.63  201.1      2.0       76    6/6
B-couleur     flux     35.1    16.7   23.97  104.4      2.2       64    3/6
B-couleur     sdxl     61.7     0.0   45.55  339.7      2.0      214    5/6
C-extrait     flux     35.1    16.7    6.81   31.9      9.0      165    5/6
C-extrait     sdxl     61.7     0.0   61.59  366.9      3.3      704    6/6
D-trait-tags  sdxl      5.4     0.0   33.34  213.8      3.5      276    5/6
E-couleur-tagssdxl     50.6     0.0   64.73  406.5      2.5      253    6/6
```

`fuites` est le test de l'annexe P § 3.2 : on inonde le blanc depuis les quatre coins ; si
l'inondation couvre plus de 55 % de l'intérieur de la boîte englobante du sujet, la silhouette
n'est pas fermée et l'asset serait rejeté.

**La porte technique** (`production/essais/verdict.py`) exige les quatre critères ensemble : fond
blanc pur ≥ 99 %, saturation moyenne < 10, aucune fuite, ≤ 400 composantes d'encre. Elle donne
**6/48**, et les six sont `flux_A-trait_g1001` à `g6006` — les six, sans exception.

---

## 3. Jugement par condition

### Condition A — trait imposé au prompt

**Sur Flux : la seule condition qui produit des images utilisables.**

*Anatomie.* Cohérente sur 6/6 : corps rond d'un seul tenant, deux bras, deux pieds, aucun membre
surnuméraire, aucune main déformée. Rien qui rappelle les échecs des séries 02 à 04.

*Expression.* Chaleureuse et ouverte sur 6/6 — sourire franc, pupille nette, sourcils relevés
lisibles sur `g4004` et `g6006`. Conforme à D27 sur les quatre règles de dessin. **Mais le registre
reste « bébé »** : yeux très grands à double reflet, traits de rougissement sur les joues. C'est
l'échec de la série 01, reproduit à l'identique.

*Lisibilité.* Excellente. Fond blanc pur mesuré à **100,0 % sur les six** ; encre entre 3,17 % et
8,63 % ; aucune fuite. 15 à 28 régions fermées coloriables, dans la fourchette 6-40 de l'annexe
P § 3.5. C'est directement vectorisable.

*Conformité au sujet : 4/6.* Échecs identifiés : `g2002` et `g6006` n'ont **pas d'éclat au
poitrail** — le cristal a migré sur le front pour l'un, dans la bouche pour l'autre.

*Deux défauts réels, propres au trait, à corriger au prompt et non à la condition* :
- le pelage est dessiné en **hachures de fourrure** à l'intérieur du corps et sur le contour, ce
  qui contredit à la fois le prompt (`no hatching`) et la fiche § 1 (« le pelage se lit au contour,
  pas à la texture »). L'encre varie de 3,17 % à 8,63 % d'une graine à l'autre, un facteur 2,7 ;
- `g4004` porte une **ombre au sol pleine et noire**, seconde source d'attention interdite par la
  fiche § 5, et gros chemin noir parasite à la vectorisation.

**Sur `damnPonyIllustrious` : échec total, 0/6.** Le modèle ignore purement la consigne de trait et
rend des **photographies de jouets 3D en studio** — saturation 35,8 malgré `no color` au positif
*et* `color, colored, colorful` au négatif à CFG 6, où le négatif est pourtant actif. Fond blanc
pur : **0,0 %**. Fuites : **6/6**. C'est très exactement le « griffonnage au feutre » de la
série 05, reproduit et expliqué : le modèle ne dessine pas, il photographie un objet.

### Condition B — couleur, sans contrainte de trait

**Sur Flux : très belles images, et rigoureusement zéro apport mesurable.**

*Anatomie et expression.* Cohérentes sur 6/6, de qualité au moins égale à A. C'est joli.

*Conformité au sujet : **4/6** — exactement le même compte qu'en condition A*, et sur les mêmes
graines (`g2002` et `g6006` perdent le même éclat de poitrail). **C'est la mesure qui tue
l'hypothèse** : à graine égale, la couleur n'améliore ni l'anatomie, ni l'expression, ni la
conformité.

*Registre.* Identique à A : mêmes yeux immenses, mêmes ronds de rougissement, sur les six. **La
couleur ne corrige pas le registre bébé.** Le problème de registre des cinq séries est donc
orthogonal au noir et blanc.

*Lisibilité pour le pipeline : nulle.* 0/12 à la porte technique. Fond blanc pur sur 1 image sur 6.

*Instabilité chromatique, mesurée.* Couleur médiane du corps sur les six graines : teinte de **6°
à 340°**, en passant par 176° ; saturation de **19 à 91** ; distance RVB moyenne entre deux graines
**54,1**, maximum **99,0**. Six graines, six créatures de couleurs sans rapport.

**Sur `damnPonyIllustrious` : 0/6, et pire qu'en A.** Deux ballons de plage, une lampe, un
polyèdre, un chien en dodécaèdres — la créature demandée n'apparaît pas.

### Condition C — extraction du trait à partir de la couleur

Extraction XDoG (l'extracteur standard pour l'illustration, qui rend un trait continu là où Canny
rend des bords brisés) + seuil d'Otsu + fermeture morphologique 3×3 — c'est-à-dire déjà le
nettoyage prévu à l'annexe P § 3.2.

**0/12 à la porte technique.** Sur Flux, le détail par image est net :

| Image | Résultat |
|---|---|
| `g1001` | corps mauve foncé → **noirci en bloc** par le seuil. Dessin détruit |
| `g5005` | corps très pâle → **contour absent**, seul le visage subsiste. Silhouette inexistante |
| `g2002` `g3003` `g4004` `g6006` | dessin **lisible et plaisant**, mais trait fin et interrompu |

*Les régions ne sont pas fermées, et c'est le point rédhibitoire.* **5/6 fuites** ; le remplissage
depuis l'extérieur envahit 91,6 % à 97,9 % de la boîte du sujet. Là où la condition A donne 57
composantes d'encre en moyenne, l'extraction en donne **165** (jusqu'à 252) : le trait extrait est
un pointillé, pas un contour.

*Diagnostic de fond.* L'extraction cherche des **frontières de valeur**. Une illustration jeunesse
en aplats doux n'en a pas là où il faut : le contour du corps beige sur fond crème de `g5005` n'a
presque pas de contraste, tandis que les ronds de rougissement, eux, en ont beaucoup et deviennent
des anneaux parasites. Le trait obtenu n'est pas le trait du dessin, c'est la carte de ses
contrastes — deux choses différentes.

---

## 4. Ce que cela dit des cinq séries échouées

En relisant `generer_personnage.py` à la lumière des mesures, l'échec s'explique sans invoquer la
couleur :

| Série | Modèle | Ce que mesure l'essai |
|---|---|---|
| 01 | `flux1-schnell-fp8` | La **seule famille qui marche**. Résultat « bébé kawaii » = problème de **registre**, et la condition B prouve que la couleur ne l'aurait pas corrigé |
| 02-03 | `flux1-schnell-fp8` | Même famille. Correctifs de registre appliqués au prompt, à CFG 1 où **le négatif est inerte** — l'outillage le dit déjà |
| 04 | `juggernautXL` (photoréaliste) | Modèle photo → super-héros adultes. Même mode d'échec que celui reproduit ici |
| 05 | `damnPonyIllustrious` | **0/6 mesuré ici, en couleur comme en trait.** Le « feutre sur papier » est le comportement natif du modèle |

**Le défaut de méthode est identifié, et il est d'orchestration, pas de prompt.** Entre deux séries,
le checkpoint, le prompt de style, le registre et parfois la résolution changeaient **en même
temps**. Cinq séries, cinq changements simultanés, aucun témoin : par construction, aucune ne
pouvait rien apprendre à la suivante. Le présent essai ne fait rien d'autre que ne bouger **qu'une
variable à la fois** — et il tranche en 125 s de GPU.

**Recommandation d'outillage, appuyée sur la mesure.** Le point de vigilance de
`environnement-et-outillage.md` § 3 — liste blanche explicite de checkpoints — n'est pas
théorique : `damnPonyIllustrious` est structurellement incapable du style du projet, et il a coûté
une série entière. *Note factuelle relevée au passage* : ce même § 3 range `flux1-dev` parmi les
candidats, mais `flux1-dev` n'est pas chargeable par `CheckpointLoaderSimple` — il est dans
`diffusion_models/` et demande `UNETLoader` + CLIP et VAE séparés. Vérifié sur `/object_info`.

---

## 5. « La couleur vient du code » s'applique-t-il aux personnages ?

L'orchestrateur a raison de poser la question, et la réponse mesurée est **oui, mais pas pour la
raison qu'écrit l'annexe P**.

**Ce qui ne s'applique pas.** La conséquence n° 1 du § 2 — « une zone grise est un SVG dont les
remplissages ne sont pas encore assignés, la mécanique de recoloration fonctionne par construction »
— est un argument sur les **décors à colorier**. Gobi n'est pas une zone à colorier : il ne se
recolorie jamais. Cette justification-là ne l'oblige pas. La distinction de l'orchestrateur est
juste.

**Ce qui s'applique quand même, et que la mesure impose.**

1. **La constance d'identité sur une série.** C'est l'argument décisif, et il n'est pas dans
   l'annexe. La fiche § 3 pose la règle qui rend les 25 déclinaisons possibles : *« le corps ne
   change jamais, seul le cristal change »*. Or six graines en condition B ont donné six corps de
   teintes allant de 6° à 340°, saturation de 19 à 91. Un Gobi engendré en couleur **change de
   corps à chaque génération** — ce qui contredit frontalement la règle qui rend la collection
   produisible. Le § 2 vaut donc pour Gobi, mais parce qu'il garantit l'**identité**, pas parce
   qu'il sert la recoloration.
2. **Les régions fermées, la fiche les exige pour Gobi aussi.** Fiche § 5 : le pelage, le cristal
   et le cœur sont « des régions fermées distinctes, coloriables séparément », et le Cœur de Pierre
   doit **pulser** — c'est-à-dire être piloté par le code. Gobi est bel et bien coloré par le code,
   simplement pas par l'enfant.
3. **La mesure**, enfin : 0/24 image couleur ne franchit la porte technique, et l'extraction ne
   rattrape pas (0/12, 11/12 fuites).

**Ce qu'il faut en revanche corriger dans la formulation.** Le § 2 dit « ComfyUI ne génère que du
trait noir sur blanc ». C'est une contrainte sur le **livrable**, et l'annexe la présente comme une
contrainte sur l'**outil**. Rien n'interdit de produire de la couleur pour *choisir* un design — et
c'est justement ce qui a manqué aux cinq séries, qui jugeaient un design sur des planches de trait.
Je le propose sans le surestimer : **la mesure ne montre aucun gain de conformité** (4/6 en couleur
comme en trait). Le seul bénéfice défendable est le confort de jugement humain, et il ne justifie
pas de doubler chaque génération.

---

## 6. Ce que je recommande, en une liste courte

1. **Verrouiller la famille Flux.** C'est la seule mesurée capable de trait à plat sur fond blanc
   pur. Mettre `damnPonyIllustrious` et `juggernautXL` hors liste blanche pour la chaîne image.
2. **Garder le trait noir sur blanc.** Il ne coûte rien de mesurable et il rapporte 6/6 contre 0/12.
3. **Ne plus changer qu'une variable à la fois entre deux séries.** C'est le seul correctif qui
   explique les cinq échecs.
4. **Traiter le registre « bébé » pour ce qu'il est** : un problème de prompt indépendant du noir
   et blanc, que la couleur ne résout pas. À CFG 1 sur Flux schnell, il ne peut être formulé qu'en
   positif — l'outillage le dit, les séries 02-03 l'avaient déjà appris.
5. **Décrire le corps comme lisse** plutôt que velouté : c'est la fourrure demandée au prompt qui
   produit les hachures internes, contre la fiche § 1 elle-même. Cela ferme aussi le point de
   validation n° 1 de la fiche § 6.
6. **Interdire l'ombre portée au prompt** — région noire pleine, seconde source d'attention (fiche
   § 5), gros chemin parasite à la vectorisation.
7. **Ne pas retenir l'extraction de trait** comme voie de production : 0/12, 11/12 fuites.

---

## 7. Fichiers produits

| Chemin | Contenu |
|---|---|
| `production/essais/essai_noir_et_blanc.py` | l'essai contrôlé, 24 images, graines et prompts figés |
| `production/essais/controle_sdxl_convention.py` | le contrôle D/E, 12 images |
| `production/essais/qc_technique.py` | la mesure technique et l'extraction de la condition C |
| `production/essais/verdict.py` | la porte technique et le décompte par condition |
| `production/essais/planche.py` | assemblage des planches-contact |
| `production/essais/flux/` · `sdxl/` · `C-extraction/` | les 36 images générées + 12 extractions |
| `production/essais/qc-technique.csv` | 48 lignes de mesures, une par image |
| `production/essais/journal-essai.json` · `journal-controle-sdxl.json` | prompts, graines, réglages — tout est régénérable à l'identique |
| `production/essais/planche_*.png` | 7 planches-contact étiquetées |
| `production/essais/comparaison_graine4004.png` | A / B / C / autre modèle, à graine identique |

**Coût GPU total : 125 s** (87 s pour les 24 images de l'essai, 38 s pour les 12 du contrôle).
Le budget n'a jamais été le facteur limitant ; l'absence de témoin l'était.
