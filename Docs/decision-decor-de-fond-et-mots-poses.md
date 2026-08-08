# Décision — le décor est le fond, et les mots se posent dessus (R47 / R52)

Fichier **nouveau**, conformément à CLAUDE.md : les quatre documents de référence ne se
modifient pas sans validation. Il enregistre ce qui a été **décidé** et ce qui a été **mesuré**
le 2026-08-07, sur le moteur `phrase`. Il ne raconte pas un lot ; il évite que la conversation
suivante redécide au jugé.

---

## D — La règle de dérivation des emplacements, et elle vaut pour les quatorze moteurs

Les emplacements des mots ne sont **jamais écrits** : ils se dérivent des champs que
`*.habillage.json` porte déjà depuis le lot M6.

1. **Population** — les régions des calques dont `role === "coloriable"`, recensées par OBJET,
   dédoublonnées par `id`, **triées par `surface` décroissante** (`id` départage, sinon deux
   aires égales s'échangeraient d'une exécution à l'autre et une zone changerait de couleur
   toute seule).
2. **Ancrage** — le `centroide` de la région. C'est son point le plus intérieur : un mot posé
   là est loin des traits qui la bordent. Même choix que `MoteurPlace`, qui est le précédent
   qui marche.
3. **Visibilité** — le décor COUVRE la zone de jeu, donc en portrait il déborde latéralement.
   Une région dont le centroïde tombe hors de la partie réellement dessinée est **écartée** :
   un mot posé sur une région invisible perdrait le lien avec ce qu'il rallume.
4. **Affectation** — la i-ème clé prend la i-ème région. Les clés arrivent **déjà mélangées**
   (R44), donc la plus grande région ne revient pas au premier mot de la phrase.
5. **Séparation** — relaxation déterministe des boîtes qui se chevauchent, poussée selon l'axe
   de moindre pénétration, puis clampage dans les bornes. La lisibilité a le dernier mot sur
   le centroïde : « un mot posé sur un endroit sympa mais illisible est un défaut ».
6. **Repli** — s'il manque des régions, une grille dérivée du NOMBRE de mots. Aucun mot ne
   disparaît jamais.

**Contrat de sortie du module** : il rend son propre compte de `chevauchements` et de
`horsBornes`. Les deux **doivent valoir 0**, et se citent au lieu de s'affirmer.

Propriétaire du concept : `client/src/habillages/emplacements.ts`. Il ne connaît **aucun**
décor. Porter la mise en scène à un autre moteur, c'est monter `SceneDecor` et appeler
`deriverEmplacements` — pas réécrire une dérivation.

---

## D — Le contraste (réponse à la question ouverte de R37)

R37 demandait : « un décor devenu fond doit résoudre ce contraste **autrement** ». Il l'est —
non par une opacité, mais parce que **chaque mot porte son propre fond opaque** (`.cible` :
`background-color: var(--parchemin)`, `color: var(--trait)`). Le contraste du texte ne dépend
donc plus de ce qui passe derrière.

Mesuré (WCAG 2.1, luminance relative) :

| situation | rapport | verdict |
|---|---|---|
| mot `#1B2440` sur sa pastille `#FFF6E3` | **14,23:1** | AA et AAA, très au-delà |
| contre-épreuve — le même mot à nu sur la Grisaille `#8E97A8` | 5,20:1 | passerait, mais dépend du fond |
| contre-épreuve — à nu sur la pire couleur rallumée (`brun` `#7A5230`) | **2,24:1** | **échouerait** |

La contre-épreuve est le point : sans pastille opaque, la recoloration ferait tomber le
contraste sous le seuil AA à mesure que l'enfant réussit. Le fond opaque n'est pas un détail
graphique, c'est ce qui autorise le décor à passer de 14 % à 100 %.

---

## D — Deux entrées de nuancier sont inertes, et c'est un défaut de CONTENU

Mesuré sur `PALETTE` et `NUANCIER`, qui font foi :

```
NUANCIER.gris  === PALETTE.grisaille === '#8E97A8'   ← la zone NON conquise elle-même
NUANCIER.blanc === PALETTE.parchemin === '#FFF6E3'   ← le calque-fond
```

Une région « rallumée » en `gris` est identique à une région éteinte ; en `blanc`, elle se
confond avec le fond. L'enfant range le bon mot et **rien ne change**.

Recensé par objet sur les quatre habillages de `phrase` — **6 entrées sur 24** :

| habillage | nuancier déclaré | inertes |
|---|---|---|
| `cite.banniere` | orange, jaune, rose, violet, **blanc**, brun | 1 |
| `clairiere.guirlande` | vert, jaune, bleu, brun, rose, **blanc** | 1 |
| `foret.message` | vert, brun, **gris**, noir, **blanc**, jaune | 2 |
| `marais.roseaux` | bleu, vert, **gris**, violet, brun, **blanc** | 2 |

**Parade en code** : `nuancierUtile()` écarte les couleurs dont l'hexadécimal vaut EXACTEMENT
l'un des deux états neutres. Le critère est une égalité, pas un seuil — aucun nombre magique à
justifier, et le filtre suit si la palette bouge.

**Le contenu n'est pas corrigé** : `contenu/habillages/` ne se modifie pas sans relecture
parent. À arbitrer : retirer `gris` et `blanc` des nuanciers, ou les garder pour le moteur
`colorie` (où ils ont un sens : l'enfant a le droit de peindre en blanc) et laisser le filtre
faire son travail ailleurs. **La seconde voie semble juste, et elle n'est pas tranchée.**

Reste ouvert dans la même famille : `noir` (`#1B2440`) vaut le jeton `trait`. Une région
rallumée en noir avale son propre contour. Visible, donc pas inerte — mais laid.

---

## D — Le décor couvre la ZONE DE JEU, pas la boîte entière

Trouvé en regardant, pas en calculant. Cadre 928×1046, `viewBox` 960×600 :

```
couvrir la boîte entière   → échelle max(928/960, 1046/600) = 1,743 → 745 px de décor rognés
couvrir la zone de jeu     → échelle max(928/960,  886/600) = 1,477 → 490 px rognés
```

À 1,743 la cité n'était plus reconnaissable : des aplats. À 1,477 elle l'est, et l'écran est
**tout aussi plein** — la bande de lecture continue le parchemin du décor, donc ni bordure ni
vide. « Le décor c'est le fond » ne veut pas dire « le décor n'est plus reconnaissable ».

Bénéfice de fond : le décor et les mots partagent **un seul référentiel**. C'est très
exactement ce que R40 reproche au campement, où le cadre et l'image n'ont pas le même rapport.

**Ce qui reste à arbitrer par le père** : à 1,477, **35 % de la largeur du décor n'est pas
montrée**, et 2 à 5 régions sur 9 ou 10 tombent hors champ selon l'habillage. C'est le prix
d'un décor paysage 960×600 dans un écran portrait. Trois voies, aucune tranchée :
produire des décors en portrait, accepter le rognage, ou laisser une bande de parchemin.

---

## Ce qui a été mesuré, et sur quel format

**R39 s'applique** : le banc mesure en 1920×1200 **paysage** (`playwright.config.ts:98`) ;
l'enfant joue en portrait. La largeur CSS de la Galaxy Tab S10 FE **n'a toujours pas été
mesurée sur l'appareil** — les chiffres ci-dessous valent pour deux portraits qui encadrent
l'hypothèse, et rien de plus.

| | 960×1356 (rapport 1,5) | 720×1017 (rapport 2,0) |
|---|---|---|
| chevauchements de pastilles | **0** | **0** |
| pastilles hors bornes | **0** | **0** |
| mots posés sur une région dessinée | 52 / 52 | 52 / 52 |
| débordement vertical de l'écran | **0 px** | — |

Sur 6 exercices × 4 habillages × 12 consignes, aux deux formats.

**R44** — taux de « bonne réponse en 1re position de lecture », sur 2 000 graines × 2
consignes : **0,210**, contre **1,000** avant le lot et **0,208** de hasard attendu.

**R50** — compte lu dans le DOM sur `banniere-phrase-01` : **4** mots offerts pour la consigne
c1 (10 auparavant), **6** pour c2, et 4 régions rallumées sur 9 à la fin de la première phrase.

---

---

## D — R53 : l'aide se montrait toute seule, et la cause n'est pas le rejeu

> « le premier mot clignote en jaune direct, il faudrait attendre que "?gobi" soit cliqué. j'ai
> fait rejouer après une première fois, ça vient peut-être de là. »

**Le rejeu est hors de cause** : `magasin.demarrerNoeud` appelle `creerEtat` à chaque lancement,
donc l'état repart toujours à `nbErreurs: 0 · aide: null · derniereActionMs: maintenant`.
Mesuré sur le réducteur pur, horloge figée
(`bac-a-sable/mesurer-r53-aide-spontanee.mjs`) :

| scénario | première aide | ce qu'elle désigne |
|---|---|---|
| aucun geste, l'horloge tourne | **t = 45 000 ms** (`indiceMs`) | `restantes[0]` — la bonne réponse |
| **deux taps faux, aucune attente** | **t = 2 000 ms** (`erreursAvantIndice: 2`) | idem |
| tap sur « ? Gobi » | t = 1 000 ms, `aideDemandee = indice` | idem |

La vraie porte est donc le **compte d'erreurs**, pas le temps : deux taps faux et l'écran donnait
la réponse en deux secondes.

**Et c'est le mélange de R44 qui a ouvert cette porte.** Avant, taper de gauche à droite gagnait
60 consignes sur 60 : zéro erreur, donc jamais de palier automatique, donc le défaut restait
**inatteignable**. Il existait depuis toujours ; le lot précédent l'a rendu visible.

**Correction de conception** : la cible n'est désignée que si `aideDemandee !== 'aucune'` — le
champ que l'état porte déjà et que seule l'action `demanderAide` alimente. Le palier automatique
garde le droit de faire **relire** la consigne par Gobi (gratuit, R15) et perd celui de **montrer
la réponse**.

**Correction au passage de la documentation** : `Docs/retours-de-jeu.md` décrit R15 comme
« ouvert » côté journal. Le code dit autre chose — `commun/etapes.ts:149` lit déjà `aideDemandee`
et non `niveauAide`. Mesuré : `niveauAide = indice · aideDemandee = aucune ·
resume.aideUtilisee = aucune`. **L'étoile n'était pas perdue.** Seule la moitié « affichage »
restait, et c'est celle qui vient d'être traitée.

---

## D — R54 : une image-clé ne compose pas, elle remplace

La pastille était centrée par `transform: translate(-50%, -50%)`. `.oscillation`
(`global.css:374`) anime la **même** propriété : `0%, 100% { transform: translateX(0) }`. Dès la
première image, le centrage disparaît — le coin haut-gauche saute du point moins la demi-boîte au
point lui-même, soit **+ 76 px à droite et + 34 px en bas** pour une pastille de 152 × 68.

**Règle à retenir, et elle vaut pour les quatorze moteurs** : un élément positionné par une
`transform` ne peut pas recevoir une animation qui touche `transform`. Deux éléments, deux
propriétés disjointes — un porteur qui centre, un bouton qui oscille.

Attrapé du même coup, sans qu'on le cherche : `.cible:active` pose
`scale(0.96) translateY(3px)` et écrasait le centrage lui aussi. **Chaque appui faisait sauter le
mot avant de le rendre.**

---

## Ce que ce lot n'a PAS fait, et où ça doit se faire

1. **`capacites.recolorieLeDecor` vaut `false` pour `phrase`** et ce n'est plus vrai.
2. **`FournisseurReglagesLecture` n'est monté nulle part.** Les mots consomment désormais le
   contexte, donc ils suivront le jour où il le sera ; en attendant ils sont à 24 px (défaut)
   au lieu des 27 px du profil.
3. **R49** — le moteur ne répète plus la consigne : sa bande de lecture porte la **phrase en
   train de se faire**, ce qui est un meilleur usage de ce champ. Le défaut général subsiste
   pour les treize autres moteurs et appartient à `EcranNoeud`.
4. **Le garde Q4 identifie l'ordre affiché par sa FORME, pas par son nom** : il retient le
   premier tableau d'identifiants de l'état d'étape dont le contenu trié égale celui des
   éléments présentés. Or `restantes` vaut `[...ordre]` à la création et satisfait ce critère
   lui aussi. La levée d'ambiguïté repose donc aujourd'hui sur **l'ordre de déclaration des
   clés** dans `creerEtat` — `ordreAffichage` est déclaré avant `restantes`. C'est fragile, et
   le remède appartient au garde : chercher un champ **nommé**. Signalé à la campagne qui
   possède `tests/`.

---

## D — R56 : « ça ne range rien » était un défaut d'AFFORDANCE, mesuré

Le tap range. Sortie citée, sur `banniere-phrase-01` :

```
TAP MAUVAIS MOT  · bande «  » · offerts 4 · pastilles qui oscillent : 1   ← rien ne bouge
TAP BON MOT      · bande « Le… » · offerts 3 · fentes : mot-le=oui · régions rallumées : 1
```

Trois causes se cumulaient, toutes mesurées : depuis R44 le premier mot que l'œil rencontre n'est
le bon qu'une fois sur cinq (**0,208**), donc ~79 % des premiers taps sont des refus légitimes ;
le retour au refus était cassé (R54) ; les fentes étaient à 35 % d'opacité (R55).

**Le glisser est refusé, et l'argument est mécanique** : `ActionPhrase.placer` ne porte
**aucune destination** — seulement `etiquette`. Un glisser proposerait un choix qui n'existe pas
et sa cible serait ignorée par le moteur : une prise décorative, c'est-à-dire un mensonge
(famille R16/R41). `place` a raison d'avoir le glisser : ses zones sont de vraies destinations et
son action porte un `point`.

**Décidé par le père** : « Dire le vrai geste ». Les 12 consignes passent de « Range les … » à
« Touche les … dans l'ordre pour lire : … ». Proposition déposée dans
`contenu/brouillons/consignes-phrase-verbe-du-geste.json`, **jamais dans `contenu/exercices/`**.

Couverture lexicale, vérifiée par **précédent** et non par affirmation, sur les 286 consignes du
corpus : « Touche » ouvre déjà **34** consignes validées, « dans l'ordre » figure dans **19**.

Coût en voix, chiffré : **12 clips périmés, 151,2 Ko, 39,5 s** à re-rendre. Le risque n'est pas le
silence — D42 masque le bouton quand le clip manque — c'est un clip qui dit « Range » sous un
écran qui dit « Touche ». Le texte et la voix doivent donc être promus **dans le même lot**.

Reste ouvert : « Range » ouvre **93** consignes sur 286. Les 81 autres appartiennent à d'autres
moteurs, où le geste attendu peut différer. La même question s'y pose, une par une.

---

## D — R57 : le mot vole vers sa case, et l'animation est purement ADDITIVE

Demandé par le père : « une fois sélectionné, c'est bien que le mot se déplace tout seul sur la
case vide ». Trois bornes tenues, et la troisième est celle qui protège les captures T4 :

- **hors du champ de lecture** — le vol vit dans la couche des mots, qui s'arrête au bord haut de
  la bande ; le mot plonge vers sa case et **s'éteint en arrivant** ;
- **interruptible** — le tap suivant l'efface, et il est `pointerEvents: none` ;
- **additive** — c'est une COPIE transitoire, jamais l'élément réel. Mesuré :

```
animations VIVES  · vols montés : 1 · fentes : mot-le=oui mot-feu=non mot-est=non mot-rouge=non
animations CALMES · vols montés : 0 · fentes : mot-le=oui mot-feu=non mot-est=non mot-rouge=non
```

**La destination est visée dans le gestionnaire de clic, avant d'émettre** — c'est le seul instant
où la case existe encore : dès que le mot est pris, elle se remplit et quitte le DOM.

**Piège trouvé en écrivant le banc, et il vaut au-delà** : le premier essai comparait deux
montages partageant un même `Alea`. Depuis que `creerEtat` mélange, il **puise** dans le
générateur — les deux montages recevaient donc deux tirages, et le cas a échoué sur « la place »
contre « le toit de tuiles ». L'animation n'y était pour rien. **Rejouer un nœud rebat les mots**,
c'est voulu et c'est le comportement d'`eclair` ; mais un banc qui isole une variable doit tenir
les autres fixes.

---

## D — R58 : le refus dit ce qu'on attend, jamais ce qui a raté

Quatre phrases, une par motif, sans « tu », sans « non », sans « erreur », et **sans nommer le mot
attendu** — le nommer ferait du refus une aide gratuite et il n'y aurait plus rien à déchiffrer.

**Manque connu, non résolu** : ces quatre textes n'ont **aucun clip**.
`scripts/recenser-textes.mjs` recense le CONTENU — exercices, points du campement, tableaux
d'ouverture — et n'offre **aucun canal à une chaîne d'interface**. « Tout est audible en un tap »
n'est donc pas tenu ici. Les quatre textes sont réunis dans une seule table
(`MESSAGES_DE_REFUS`) pour qu'un lot possédant `scripts/` n'ait qu'un endroit à brancher, sous
les clés `phrase/refus-<motif>`.

---

---

## D — R59 : une case vide est une PROMESSE DE PLACE

Ce qui était rendu, lu sur l'arbre du DOM avant de conclure :

```
<p data-ligne="0">  « Le »                ← le mot atterrissait ICI
<span data-fente="mot-le" hidden>        ← et sa case DISPARAISSAIT
```

La case ne recevait rien et s'effaçait : elle n'avait jamais rien promis. **Il n'y a plus qu'une
seule ligne, et c'est la phrase elle-même** — chaque fente garde sa place du début à la fin, vide
elle attend, tenue elle porte son mot au même endroit. Aucune ne disparaît.

**La réservation est ce qui rend la chose vraie.** Chaque fente réserve dès le départ la boîte de
son futur mot — la *même* que celle de la pastille, puisque `mesurer` est la même fonction et la
typographie la même. La remplir ne recompose donc rien, ni elle ni ses voisines. Sans cette
réservation, la ligne se réajusterait à chaque mot et **la case visée aurait bougé avant l'arrivée
du jeton**.

**La ligne de fentes est posée AU-DESSUS de `ZoneDeLecture`**, et ce n'est pas un choix
esthétique : le jeton vient du décor, donc d'en haut. Ainsi placée, la ligne l'intercepte et la
trajectoire s'arrête avant le champ de lecture. « Aucune animation dans le champ de lecture » tient
**par géométrie**, pas par promesse. Mesuré : arrivée à **y = 902,0 px**, centre de la fente
902,0 px — **écart 0,0 px** — et **38 px** de marge sous le haut du champ de lecture.

---

## D — R60 : la phrase cible, écrite en entier, AU-DESSUS du dessin

Mesuré avant de conclure : la phrase cible n'existait **que** dans la consigne de l'en-tête —
`"Range les mots pour lire : le feu est rouge."` — à 1,75 rem, en typographie d'interface. Or le
contenu la porte déjà seule, dans `consigne.phrase` : `"Le feu est rouge."`

Elle est affichée dans `ZoneDeLecture`, **en haut du moteur, au-dessus du décor** — arbitré par le
père : « la phrase doit être au-dessus du dessin ». Empilement mesuré :

```
empilement du moteur : modele · décor · etiquettes · phrase(cases)
phrase modèle : insetBlockStart = 0      ligne de cases : insetBlockEnd = 0
```

**Le conflit que je redoutais avec l'animation n'existe pas, et c'est la géométrie qui le dit** :
le jeton part du décor et descend vers les cases, toutes deux SOUS le champ de lecture. La
trajectoire est monotone vers le bas et ne remonte jamais.

```
trajectoire du vol : y 836,3 → 882,0 px (vers le BAS de 45,7 px)
atterrissage : centre de la fente 882,0 px · écart 0,0 px
champ de lecture : y ∈ [0, 100] · le vol commence 736,3 px EN DESSOUS et descend
```

**R35 borne la taille** : `FournisseurReglagesLecture` n'étant monté nulle part, le contexte rend
`REGLAGES_PAR_DEFAUT` (24 px). Les 27 px du profil n'atteindront cette ligne que lorsque C1
montera le fournisseur. Aucune valeur n'est écrite en dur.

### Ce que R60 crée comme dette, et elle est bloquante

La phrase modèle est désormais **affichée**, donc à déchiffrer, donc elle doit être **audible** —
« aucune consigne n'existe uniquement à l'écrit ». Mesuré contre `contenu/audio/manifeste.json` :
**aucune des 12 phrases modèles n'a de clip.**

Et le moteur **ne peut pas** monter le bouton d'écoute : il lui faudrait la clé
`<idExercice>/<idConsigne>`, et `ProprietesMoteur` ne porte pas l'identifiant d'exercice — c'est
l'arbitrage déjà écrit pour R10. Rendre la phrase audible demande donc soit un second
`BoutonEcouter` dans `EcranNoeud`, soit l'ajout de l'identifiant d'exercice au contrat de rendu.
**Ni l'un ni l'autre n'est dans ce périmètre.**

---

## Ce qui est GÉNÉRIQUE, et ce qui est propre à `phrase`

Le père a dit « à reprendre partout ». Le partage est donc explicite.

**Générique — `client/src/moteurs/phrase/receptacles.tsx`.** Ne connaît ni étiquette, ni consigne,
ni habillage : seulement des **jetons** porteurs d'un texte et des **réceptacles** qui leur gardent
la place. Porte `Fente`, `JetonEnVol`, `centreDuReceptacle`, `FEUILLE_DU_VOL`. La loi qu'il
transporte — *le réceptacle réserve la boîte de son futur contenu, et le jeton atterrit sur son
centre mesuré* — vaut telle quelle pour `assemble` et `chrono` (même geste d'ordre) et pour `tri`
et `paires` (réceptacles).

**Propre à `phrase`** : la population des fentes (`consigne.ordre`), la phrase modèle
(`consigne.phrase`), les quatre motifs de refus, et la dérivation des emplacements sur le décor.

**⚠ Son domicile devrait être `client/src/moteurs/commun/`, et il ne peut pas y être.**
`tests/unitaires/decor-de-fond.test.ts` énumère **tous les sous-dossiers** de
`client/src/moteurs/` et exige de chacun un `Moteur*.tsx` :

```
expect(fichier, `aucun composant Moteur*.tsx dans ${code}`).toBeDefined();
```

Créer `commun/` ferait donc échouer ce garde. Le déménagement demande d'abord que ce garde
distingue « un moteur » de « un dossier » — cela appartient à la campagne qui possède `tests/`.

---

## Le mélange, corrigé à sa place (R44, deuxième passe)

La première version mélangeait dans la couche de rendu, à graine dérivée. L'enfant voyait bien
des mots mélangés, mais **Q4 restait rouge** : il mesure le moteur et le contenu, pas le DOM.
Surtout, quatre autres moteurs portent le même biais et seront corrigés par un autre lot — une
variante maison sur `phrase` aurait installé deux mécanismes pour une seule règle, ce qui est
exactement ce qui a fait diverger les deux listes de polices (R8).

Le mélange vit désormais dans `EtatEtapePhrase.ordreAffichage`, tiré **une seule fois** par
`entree.alea.melanger(etape.ordre)` dans `creerEtat`, comme `eclair`.

Mesuré : `phrase` **a quitté** la liste des moteurs signalés par Q4 (5 avant, 4 après :
`assemble`, `chrono`, `histoire`, `paires`). Le cas « DÉTERMINISME — la même graine rend la même
mesure, sinon le rejeu ment » passe.
