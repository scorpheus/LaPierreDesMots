# Retours de jeu — ce qu'un humain trouve et que la QA ne trouve pas

Défauts relevés **en jouant**, par le père, sur la vraie base et le vrai serveur. Chacun porte sa
mesure, son état, et le fichier qui le corrige. Rien ici n'est une impression : quand une cause
n'est pas mesurée, c'est écrit en toutes lettres.

> **Pourquoi ce fichier existe séparément.** `questions-en-attente.md` recense les arbitrages que
> les campagnes demandent au père. Celui-ci recense l'inverse : ce que le père a trouvé et que les
> campagnes n'avaient pas vu. Les deux listes ne se recouvrent presque jamais, et c'est le fait le
> plus instructif du projet à ce jour.

---

## Le chiffre qui commande ce fichier

**Session du 2026-08-03, environ vingt minutes de jeu réel : six défauts.**
**La QA en comptait alors 2 498 cas automatisés — elle en avait trouvé zéro.**

```
tests unitaires + composants + api   2 005
recettes E2E (Playwright)              372
qualité (a11y, perf, budget)           106
visuel                                  15
─────────────────────────────────────────
                                     2 498   →   0 des 6 défauts ci-dessous
```

Ce n'est pas un procès de la QA : elle est rapide (174 s), stable (0 rouge sur 10 tours) et elle
a attrapé de vrais défauts que personne n'aurait vus — un `INSERT OR IGNORE` qui avalait des
compétences, un Leitner qui sautait trois boîtes, des seuils de couverture creux depuis leur
introduction.

**Le diagnostic est ailleurs, et il est structurel.** La QA vérifie que *le code fait ce que le
code dit*. Les six défauts ci-dessous sont tous de la même famille : **le code fait exactement ce
qu'il dit, et l'enfant ne voit rien.** Un voile qui passe de 1,000 à 0,917 est juste. Une scène
nommée « la luciole qui clignote » où aucune luciole n'est dessinée est un fichier valide. Un écran
de récompense sans bouton « suivant » ne viole aucune assertion.

→ **Conséquence retenue** : toute recette qui garde une promesse faite à l'enfant doit mesurer
**l'effet perçu**, pas l'état interne. « `pourcentageColorie` vaut 1/12 » n'est pas une preuve que
quelque chose s'est rallumé ; « la part de territoire découverte a augmenté d'au moins X » en est
une. Les tests écrits pour D51 suivent cette forme : ils recomptent les points intérieurs de la
silhouette dans le décor.

---

## R1. Le rallumage ne se voyait pas — **corrigé**

**Mesuré** sur `donnees/pierre.db` après son premier exercice :

```
clairiere : pourcentage_colorie = 0,0833   (1 nœud sur 12)
voile      : opacité = 1 − 0,0833 = 0,917
```

Ses mots : « j'ai fait un peu de clairiere, 2/12 écrit en bas, je ne vois aucun changement au gris
de la clairiere ».

**Arbitré par lui** : « rallume une zone dans la clairiere ça se voit mieux. les 12 paliers c'est
bien. » → **D51**, halo par paliers, table de quantiles mesurés.

**État** : corrigé, commit `32b20f8`. Détail complet dans [journal-des-decisions.md](journal-des-decisions.md) § D51.

---

## R2. La luciole n'est pas dessinée — **ouvert**

« j'ai touché la luciole, mais je ne vois aucune luciole sur l'écran ».

**Mesuré** — identifiants de `contenu/habillages/clairiere/luciole.svg`, sortie citée :

```
calque-fond · calque-trait · calque-zones
etoile-du-soir · feuille-large · halo · herbe-courte · lune-fine
nuit · rocher-plat · souche-basse · tige
```

Il y a un `halo` — une étoile à dix branches remplie `#8E97A8` — et **aucun élément `luciole`**. La
scène s'appelle « La luciole qui clignote », son `<desc>` parle du « halo rayonnant de la luciole
posée dessus », et l'insecte n'existe pas dans le fichier.

**Ce que ça dit de la chaîne d'assets** : aucun contrôle ne rapproche le NOM d'un habillage de ce
que son SVG contient. `test:contenu` valide 590 documents contre leur schéma — un schéma ne sait
pas qu'une scène nommée « luciole » devrait porter une luciole.

**À faire** : dessiner la luciole (corps, ailes, abdomen lumineux) dans `luciole.svg`, sur le
calque de trait, et lui donner le rôle que `MoteurEclair` fait clignoter. Pas de GPU nécessaire :
c'est de la géométrie polygonale, comme le reste du décor.

---

## R3. Fin d'exercice : aucun chemin vers l'exercice suivant — **corrigé le 9 septembre 2026**

« quand l'exercice est fini, il y a soit rejoué ou retour a la carte ? il n'y a pas d'autres
exercice dans la clairiere ? »

**Correction** : l'écran de récompense propose la suite de la région. Si un prérequis manque,
le composeur ouvre une préparation réellement éligible, conserve `regionObjectif`, puis reprend
la région demandée. L'arbitrage S3-Q2 du 9 septembre limite l'éligibilité à la compétence
principale ; les compétences secondaires restent déclarées et journalisées.

La portée optimiste passe de 15 à 70 nœuds sur 76 sans crédit artificiel. Le parcours réel des
Galeries, la réponse tardive, l'échec de recomposition et le retour à la carte sont gardés par
les tests de progression et d'API. Cette mesure ne prétend pas valider pédagogiquement les six
nœuds restants.

---

## R4. Une seule étoile sans qu'on dise pourquoi — **ouvert**

« j'ai eu qu'une seule étoile alors que tout est bon ppk ? »

**Mesuré** dans son journal, et le barème a raison :

```
clairiere-01   nb_erreurs = 2   aide_utilisee = indice   etoiles = 1
  rang 0  c1  réussi          rang 2  c3  ÉCHOUÉ (avec indice)
  rang 1  c2  réussi          rang 3  c4  ÉCHOUÉ
```

`calculerEtoiles` rend `1 + sansAide + sansErreur` : deux erreurs et une aide donnent bien 1.

**Le défaut n'est pas le calcul, c'est le silence.** La couleur fautive s'écoule (D16), l'image
finit juste, et l'enfant conclut « tout est bon ». Il n'a aucun moyen de relier son étoile unique à
ce qui s'est passé.

**Contrainte dure** : « aucun écran d'échec, jamais » et « l'aide de Gobi ne coûte rien et n'est
jamais présentée comme un échec ». L'explication doit donc dire ce qui a été **gagné**, jamais ce
qui a été raté — par exemple montrer les deux étoiles non acquises avec la condition qui les
ouvre (« sans demander d'aide », « du premier coup »), au futur et jamais au passé.

---

## R5. Les particules de recoloration resteraient à l'écran — **NON REPRODUIT**

« il y a un petit effet de particules, les particules ne s'effacent pas de l'écran du tout ».

**Ma mesure ne vaut rien, et je l'écris plutôt que de la présenter.** J'ai relevé 14 cercles
toujours présents à t+3 s dans une repro. Mais mes **contrôles négatifs** — un `div` HTML ordinaire
et un cercle SVG sans fioriture, mêmes durées — ne finissaient pas non plus, et
`document.timeline.currentTime` restait à **0** avec `visibilityState: "hidden"` : le panneau
navigateur n'était pas affiché, donc aucune animation n'avançait. **J'ai mesuré mon environnement,
pas le défaut.** (Repro conservée : `bac-a-sable/diag-particules/repro-semer-particules.html`.)

**Ce qui reste vrai sans mesure, et qui se corrige quand même** : dans
`client/src/moteurs/colorie/recoloration.ts`, le retrait des 14 cercles repose **uniquement** sur
`vol.finished.then(retirer, retirer)`. Si cette promesse ne se règle jamais — onglet en arrière-plan,
document caché, animation qui ne démarre pas — les cercles restent, à l'opacité 0,9, bien visibles.

→ **Règle** : un nettoyage décoratif ne dépend jamais d'une seule promesse d'animation. Il lui faut
un filet indépendant du temps d'animation.

---

## R6. Montrer Gobi quand il évolue — **demandé, ouvert**

« quand on gagne assez de point et que tu dis goby a évolué, montre la goby, fait une petite
animation de transition ».

Aujourd'hui l'évolution est annoncée par du texte. D28 pose que Gobi évolue comme un tamagotchi et
D43 fixe 8 à 10 stades ; `stade_gobi` enregistre bien le stade atteint (relevé : `oeuf`, rang 1).
Le passage d'un stade au suivant est **le seul moment du jeu où le compagnon change**, et il passe
inaperçu.

**À faire** : un écran ou un encart plein format, l'ancien stade qui se fond dans le nouveau, et le
nom du stade. Interruptible d'un tap comme tout le reste (v2 § 8, « aucune animation bloquante »).

---

## R8. Aucune police n'était sur le disque — **corrigé, 6 sur 8**

Trouvé dans sa console, pas par un test : `OTS parsing error: invalid sfntVersion: 1008821359`.
**1008821359 = 0x3C21444F = « <!DO »** : les requêtes de police recevaient la page HTML, par le
repli SPA du serveur, parce que le fichier n'existait pas.

```
$ find . -name "*.woff2" -not -path "./node_modules/*"
(aucun résultat)
```

**Aucune police n'a jamais été téléchargée.** L'enfant a lu tous ses exercices dans la police
système, jamais en Andika — alors que « fond parchemin, police Andika » est une règle non
négociable, et qu'Andika est choisie pour l'alphabétisation (« a » et « g » à une boucle, comme
dans ses manuels).

Puis un second défaut, de même nature, sous le premier. Les polices vivaient dans **deux listes
que rien ne rapprochait** :

```
réclamées par les feuilles de style : 8   (global.css 3, polices.css 5)
connues de telecharger-polices.mjs  : 5
intersection                        : 5   → 3 que RIEN n'allait jamais chercher
```

**État** : 6 / 8 téléchargées et vérifiées, empreintes épinglées. Luciole et Belle Allure GS
restent absentes — pas de source établie, et la redistribution de Belle Allure n'est pas acquise ;
elles ne servent que la matrice de l'écran de réglages. Garde posé :
`tests/unitaires/polices-declarees.test.ts` croise les deux listes dans les deux sens.

**Ce que ça dit de la QA** : `tests/visuel/polices.spec.ts` capture cinq polices et ses cinq cas
**passaient**. Ils ne pouvaient rien prouver — les cinq rendaient dans la même police de repli, et
les références ont été figées sur cet état.

---

## R9. Douze moteurs sur quatorze ne dessinent aucun décor — **ouvert, et c'est structurel**

Trouvé en cherchant pourquoi la luciole restait invisible après avoir été dessinée. Elle l'est
bel et bien : le SVG la porte, l'habillage la déclare (surface 7 152, centroïde [300, 252]). Mais
**`MoteurEclair` ne monte jamais la scène.** Il rend la consigne, l'éclair du mot, le bouton
« Revoir » et les options. L'habillage ne lui sert qu'à remplir `data-habillage`.

Recensé sur les OBJETS — les quatorze moteurs — et non sur les occurrences d'un mot-clé :

```
moteur       monte son décor ?
assemble     non        histoire     non
attrape      non        libre        non
chemin       non        paires       non
chrono       non        phrase       non
eclair       non        trace        non
grave        non        tri          non
colorie      OUI (SceneSvg)
place        OUI (ScenePlace)
```

**2 sur 14.** Vérifié aussi que le décor n'est pas monté *autour* du moteur : `EcranNoeud`
n'utilise l'habillage que pour poser ses jetons de palette en variables CSS
(`variablesHabillage`), jamais pour afficher la scène.

**Pourquoi c'est grave, et pas seulement laid.** « Moteur × habillage × contenu » est l'axe qui
porte la promesse de variété — R12 (≥ 3 moteurs par compétence) et R13 (jamais deux fois le même
habillage dans une sortie). Un habillage qui ne s'affiche pas rend R13 **inobservable** : deux
sorties « avec des habillages différents » sont identiques à l'écran. Et l'enfant joue douze des
quatorze types de jeu sur un fond vide, avec des boutons et du texte.

C'est aussi la vraie réponse à « il faut commencer à rendre le jeu beau » : le décor existe, il
est mesuré, il est validé — et personne ne le montre.

**À trancher** : les douze moteurs sont-ils repris un par un, ou le décor est-il monté **une
fois** par `EcranNoeud` derrière tous les moteurs, chaque moteur restant libre de le surcharger ?
La seconde voie règle les douze d'un coup et remet la scène là où l'axe la place — mais elle
touche un fichier que tous les moteurs partagent.

---

## R14. La bonne réponse était TOUJOURS le premier bouton — **corrigé**

« ça sélectionne toujours le premier ». Mesuré sur les 76 exercices livrés :

```
consignes à options : 34   dont la bonne réponse en PREMIÈRE position : 34   (100,0 %)
```

**Trente-quatre sur trente-quatre.** Un enfant qui tapait toujours le premier bouton gagnait à
tous les coups sans lire une lettre. L'exercice ne mesurait rien, et le BKT engrangeait des
réussites vides. L'ordre est désormais tiré une fois par `Alea` à la création de l'état —
reproductible à la graine près, donc le rejeu reste exact. Contrôle négatif exécuté : sans le
mélange, le garde redevient rouge sur **100,0 % (170/170)**.

---

## R15. Gobi « a aidé » alors que l'enfant n'a rien demandé — **ouvert, cause trouvée**

« ça met, tu n'as que deux étoiles parce que Gobi a aidé, alors que c'est pas vrai, on l'a fait
sans ». Cause, dans `partage/src/moteurs/commun/delais.ts` :

```
indiceMs : 45 000        →  45 s d'INACTIVITÉ et le niveau d'aide monte tout seul
erreursAvantIndice : 2
```

`niveauAideSuivant` fait monter l'aide **automatiquement**, et `commun/etapes.ts` recopie ce
niveau dans `resume.aideUtilisee` — qui décide de la deuxième étoile, alimente le BKT et le
Leitner. **Un enfant qui réfléchit plus de 45 secondes est enregistré comme aidé.** Depuis R11,
la porte « Prêt ? » ajoute encore du temps de lecture avant le premier geste.

**La correction conçue, non appliquée** : séparer l'aide PROPOSÉE (ce que Gobi montre, spontané,
qui doit rester) de l'aide DEMANDÉE (ce que l'enfant a réclamé, qui seule doit compter). Un champ
de plus sur l'état d'étape, alimenté par la seule action explicite, et `resume.aideUtilisee` le
lit à la place de `niveauAide`.

**Pourquoi ce n'est pas fait dans la foulée** : `aideUtilisee` est une sémantique de JOURNAL. Elle
décide des étoiles, nourrit le BKT et le Leitner, et le test de rejeu compare des journaux de
référence. La changer demande son propre lot, avec le rejeu sous les yeux.

---

## R16. Le déplacement au doigt ne marche pas — **ouvert**

« Range dans la grotte de gauche les mots avec la lettre B… sur la tablette ça marche pas, on
n'arrive pas à déplacer. »

**Mesuré** : `MoteurTri.tsx` ne contient **aucun** gestionnaire de glisser — `grep` sur
`onPointer`, `onTouch`, `onDrag`, `draggable`, `dnd-kit` ne rend **aucune ligne**. Le moteur est
un **tap-puis-tap** : on touche l'étiquette, puis on touche le panier.

Ce n'est donc pas un défaut tactile, c'est un défaut d'AFFORDANCE et de consigne : le mot
« range » appelle un geste de glisser que le moteur ne propose pas, et rien à l'écran ne dit
« touche, puis touche ». Même famille que le campement du premier jour — l'enfant ne comprend pas
ce qu'on attend, et le dessin n'est pas en cause.

**À trancher** : ajouter le glisser (dnd-kit est au socle technique) **ou** rendre le tap-puis-tap
évident et reformuler la consigne. La seconde voie est moins coûteuse et plus sûre sur tablette.

---

## R17. Gobi ne répond pas dans certains exercices — **ouvert**

« Quand on appuie sur Gobi, ça ne fait rien non plus. » Signalé sur le `tri`. À relier à R15 : le
niveau d'aide monte peut-être déjà au maximum tout seul, auquel cas un tap n'a plus rien à
escalader et ne produit aucun changement visible. À mesurer moteur par moteur avec la sonde de R10.

---

## R18. La carte ne montre ni l'avancement, ni le lien entre les régions ouvertes — **ouvert**

« je vois pas vraiment l'évolution de la révélation de la couleur… et il faut bien montrer le lien
entre les deux, vu que les deux sont bien ouverts, on sait pas trop qu'on les a bien ouverts. »

D51 a rendu le rallumage visible **par région**, mais deux choses manquent encore : un enfant qui
a joué 2 nœuds sur 12 ne voit qu'un petit halo, et rien ne dit que **deux** régions sont ouvertes
en parallèle (D38) ni ce qui les relie. Le chemin d'encre existe et n'est pas lu comme tel.

---

## R19. L'histoire de la Pierre passe toute seule — **ouvert, mesuré**

« il faut enlever le chronomètre parce qu'on n'a pas le temps de lire, ça passe directement. On
peut changer de panneau que si on a cliqué sur passer. Il faudrait un tout petit bouton pour
revenir en arrière au cas où. »

**Mesuré** — `EcranOuverture.tsx:126` porte un `setTimeout(…, tableau.dureeMs)`, et les cinq
panneaux déclarent :

```
6000 ms · 6000 ms · 6000 ms · 6000 ms · 5000 ms
```

**Six secondes par panneau pour un enfant qui déchiffre.** C'est le même défaut que l'éclair, au
même endroit du raisonnement : une durée n'a de sens que si l'on a fini de lire. La correction est
symétrique de R11 — on avance au tap, jamais au chronomètre — plus un retour arrière discret.

---

## R20. Tout devrait tenir sur un écran, sans défilement — **corrigé, sauf le campement**

« sur une tablette il y a largement de la place et il y a besoin de scroller alors qu'il n'y a pas
besoin, et clairement c'est pas bien placé. »

Cible : Galaxy Tab S10 FE, 1920 × 1200. Un enfant de 7 ans qui doit faire défiler pour trouver le
bouton perd le fil de l'exercice.

### Mesuré avant de toucher à quoi que ce soit

Sonde `bac-a-sable/r20-mise-en-page/mesurer-debordement.mjs`, à la résolution réelle :

```
7 écrans sur 20 obligent à faire défiler
carte · campement · coffre · ouverture · reglages-lecture   →  76 px  (chiffre CONSTANT)
noeud:place                                                 → 470 px
noeud:colorie                                               → 873 px
```

Le **76 revenant cinq fois** désignait une cause partagée, et non cinq défauts : les scènes se
dimensionnent par leur LARGEUR et laissent leur hauteur suivre le rapport d'aspect du `viewBox`,
sans jamais regarder la hauteur disponible.

### Le piège qui compte plus que la correction

Mon premier correctif posait `overflow: hidden` sur `[data-ecran]`. Le débordement mesuré est tombé
à **zéro d'un coup** — parce que `hidden` rend `scrollHeight === clientHeight`, **que le contenu
tienne vraiment ou qu'il soit COUPÉ**. La mesure était devenue creuse, et j'allais annoncer « 0 px
de débordement » sur un jeu cassé.

La sonde renforcée a trouvé aussitôt dix cibles coupées : « le pot de couleur », « Colorier en
rouge », « un ballon »… puis trois écrans entiers — « Ouvrir le chaudron à couleurs » au campement,
cent seize boutons « Valider »/« Rejeter » au dashboard, la galerie complète.

**Un bouton coupé est pire qu'un bouton qu'on atteint en faisant défiler** : le premier est
introuvable, le second seulement pénible. `overflow: hidden` a été remplacé par `overflow: auto` :
ce qui fait tenir les écrans, c'est le dimensionnement, pas le rognage.

### Deux griefs, et un seul est exemptable

| grief | ce qu'il mesure | portée |
|---|---|---|
| **il faut défiler** | tout conteneur défilable, pas seulement le document | le jeu ; toléré sur `dashboard` et `galerie-parent` |
| **c'est hors d'atteinte** | on demande au navigateur d'amener la commande à l'écran, et on regarde si elle y arrive | **partout, sans exception** |

L'exemption des deux écrans parent est nommée et justifiée : ce sont des consoles d'administration
dont les listes sont non bornées par nature. Exiger qu'elles tiennent dans 1 200 px reviendrait à
exiger qu'il n'y ait jamais plus de six brouillons à valider. Elles restent tenues par le second
grief, qui est celui qui compte.

### Ce qui a été corrigé

- Les scènes de moteur deviennent l'**unique enfant souple** de leur moteur, où qu'elles soient
  dans l'ordre. La première version bornait « la première rangée de la grille » — vrai pour
  `colorie`, faux pour `place`, qui met sa consigne devant : son SVG restait à 1 259 px dans un
  moteur de 931.
- `[data-ecran]` passe en `overflow: auto`.
- Le campement passe en grille responsive ; son décor, **qui était écrasé à 8 px** parce que
  `aspect-ratio` ne s'appliquait pas dans une colonne souple, est de nouveau visible.

### Le garde

`tests/qualite/mise-en-page-tablette.spec.ts`, **89 cas, tous verts**. Il n'écrit aucune liste
d'écrans : il reprend `recettesDEcrans()` — **87 recettes**, les 11 écrans plus une par nœud livré,
soit les 14 moteurs. Ma sonde artisanale en couvrait 20 : **quatre fois moins**. Un écran ou un
moteur ajouté demain entre dans le garde tout seul.

Il porte un **contrôle positif** qui fabrique un débordement de 3 000 px et exige de le voir. Il a
gagné ses frais à sa première exécution : les sept premiers cas ont échoué d'un coup, contrôle
positif compris, ce qui a immédiatement désigné le harnais — `page.evaluate` recevant une chaîne
évalue la fonction fléchée sans jamais l'appeler — et non la mise en page.

### Le conflit que ce lot a révélé : R16 contre R20, et R16 gagne

C'est la trouvaille qui compte le plus, et elle n'est venue d'aucune relecture — c'est la QA des
invariants qui l'a levée, **49 recettes rouges d'un coup**.

Borner une scène pour la faire tenir la rétrécit dans les **deux** dimensions : le rapport d'aspect
est conservé. Sur `colorie`, 21 régions coloriables sont aussitôt passées sous les 64 px des specs.
Sortie citée :

```
path « le tronc du premier arbre »       31 × 91
path « l'horloge de l'école »            47 × 47
path « la porte de l'école »             45 × 86
path « la première fenêtre de l'école »  54 × 45
```

Vérifié plutôt que supposé : le lot remisé, la même recette passe ; le lot remis, elle échoue. C'est
bien cette borne, et rien d'autre.

Ramener un tronc de 31 px à 64 demande une scène **2,06 fois** plus grande, soit près de 2 500 px de
haut sur une tablette qui en offre 1 200. **Aucune mise en page ne peut satisfaire les deux.** Le
défaut n'est donc pas dans la disposition : il est dans l'**asset**, dont les régions sont trop fines
pour un écran de 1 200 px.

« Cibles ≥ 64 px, aucune coordination fine exigée » est une règle non négociable des specs ; « rien
ne défile » est un retour de jeu. **La règle l'emporte sur le confort** : `colorie` garde sa scène,
son écran défile — il défilait déjà — et le garde porte la dette au lieu de la taire.

### Trois fois où l'instrument mentait, et ce que ça coûte de ne pas le vérifier

Ce lot a produit **trois** mesures qui affichaient le bon chiffre en ne mesurant rien. Aucune n'a été
trouvée par relecture ; les trois l'ont été par un contrôle positif ou par une suite existante.

1. **`overflow: hidden`** rend `scrollHeight === clientHeight` : « 0 px de débordement » sur dix
   commandes coupées.
2. **`page.evaluate` recevant une chaîne** évalue la fonction fléchée sans jamais l'appeler et rend
   `undefined` : les sept premiers cas ont échoué d'un coup, ce qui a désigné le harnais et non la
   mise en page.
3. **`scrollIntoView`** traverse un `overflow: hidden` — la propriété empêche le DOIGT de défiler,
   pas le script. L'instrument censé constater l'atteignabilité déclarait donc atteignable
   exactement ce qui ne l'est pas. Le grief se mesure désormais par la **géométrie** : une commande
   est hors d'atteinte quand un ancêtre qui rogne la laisse entièrement hors de sa boîte.

Le garde porte **deux** contrôles positifs, un par grief. Le second n'existait pas au départ ; il a
été ajouté au moment où la définition du grief a changé, et il a réfuté la nouvelle définition à sa
première exécution. **Une mesure dont on modifie la définition sans lui redemander de prouver
qu'elle sait échouer est une mesure qu'on vient de perdre.**

### Ce qui reste, et pourquoi c'est un arbitrage et non un défaut

**Le campement déborde encore de 378 px.** Balayage complet, sortie citée :

```
une colonne (état d'origine, décor rendu)      2 607 px
3 colonnes de 608                              1 848 px
2 colonnes de 924                              2 209 px
4 colonnes                                     1 903 px
décor en pleine largeur                        1 862 px
3 col + étagère et compagnons pleine largeur   1 578 px   ← état actuel
cadre de la tablette                           1 200 px
```

Aucun assemblage ne descend sous 1 578, et la raison est mesurable : **rétrécir un panneau
l'ALLONGE** — l'étagère fait 298 px sur 1 872 de large et 686 px sur 608. Il reste huit blocs pour
1 200 px de haut. Les 378 px restants demandent de **retirer ou de déplacer du contenu**, ce qui
touche une règle écrite en tête de `EcranCampement.tsx` : « Rien n'est caché. Un compagnon non
rallié, un objet non rapporté : visibles et gris. » **Cet arbitrage appartient au père.**

En attendant, le garde tient la valeur exacte en **cliquet** (`DETTE_MESUREE`) : elle ne peut que
descendre, elle échoue si le campement grandit d'un pixel, et sa ligne disparaît le jour où
l'arbitrage est rendu.

---

## R21. Rafraîchir ou revenir en arrière fait perdre la partie — **ouvert**

« quand on appuie dans le navigateur sur rafraîchir ou sur retour en arrière, ça enlève le site. »

L'application n'a pas de routage : l'écran vit dans le magasin, jamais dans l'URL. Un rafraîchissement
repart donc du choix de profil, et le bouton « retour » du navigateur sort du site. TanStack Router
est au socle technique et n'est pas utilisé pour ça.

**Conséquence pédagogique**, et c'est elle qui compte : un enfant qui touche par mégarde le bouton
retour de sa tablette perd son exercice en cours. C'est un état sans issue déguisé.

---

## R22. Changer de région ramène au même exercice — **ouvert**

« on est revenu en arrière, on a sélectionné un autre monde, en fait ça t'amène vers le même
exercice. Il faudrait plutôt avoir des changements d'exercice en fonction des mondes où on est. »

À reproduire et à mesurer : la carte calcule pourtant un nœud de reprise PAR région
(`repriseDeRegion`, R3). Hypothèse à vérifier avant toute correction — le magasin garde-t-il le
`paquet` précédent quand le chargement du nouveau échoue ou tarde ?

---

## R23. Le nom des régions est trop petit sur la carte — **ouvert**

Demandé le 2026-08-03. La carte est « l'écran qu'on ouvre en premier, celui qu'on montre à ses
parents » (v2 § 9.4) ; le nom du territoire y est un cartouche discret. À agrandir, en gardant la
règle « le décor s'agite, le texte jamais » : le cartouche est posé sur parchemin et ne bouge pas.

---

## R24. Voir TOUT ce qu'il y a à gagner, même ce qu'on n'a pas — **ouvert**

« même si on ne les a pas, tous les items à récupérer devraient être affichés en grand dans un
popup avec une description de ce qu'on peut gagner, et on aura la couleur, et avec une croix ou un
bouton retour — pour voir tous les items à gagner dans le campement et dans le coffre. »

**Ce qui existe déjà**, mesuré : `Etagere.tsx` montre bien les cases VIDES — D44 et D25 point 3,
« ce qui donne envie, c'est de voir la case suivante encore vide ». Il n'y a aucune branche
`if (obtenue)` autour d'une case, seulement autour de son remplissage.

**Ce qui manque** : la case vide ne dit pas CE QU'ELLE ATTEND. Elle est en Grisaille, sans nom,
sans description, sans la couleur qu'elle prendra. L'enfant voit qu'il manque quelque chose, jamais
quoi ni pourquoi.

À faire, dans les deux écrans :

```
campement : 6 objets déclarés   (contenu/monde/campement.json)
coffre    : 10 stades / formes  (contenu/monde/gobi-stades.json)
```

Un panneau plein format au tap d'une case — obtenue ou non — avec le nom, la description, la
couleur qu'elle prendra, et une sortie évidente. **Montrer la couleur d'un objet non obtenu est le
seul endroit du jeu où la Grisaille se lève par avance** : c'est une promesse, pas une récompense,
et c'est exactement ce que D25 point 3 appelle « le vide restant ».

---

## R25 → R30. Six retours du 2026-08-03 au soir — **tous corrigés**

Ces six-là partagent une racine, et c'est elle qui vaut d'être retenue.

### La racine : sept boutons qui ne faisaient rien, et le père en a trouvé deux

Deux de ses retours décrivent le MÊME défaut à deux bouts opposés du site :

> « Le chaudron dans le campement devrait fonctionner directement, je ne sais pas ce qu'il attend,
> ce qu'il mijote. »
> « dans le profil il y a les exercices, il y a le bouton lancer l'exercice, mais ça ne fait rien. »

Dans les deux cas : un rappel optionnel **déclaré** sur l'écran, **relayé** jusqu'au bouton,
**jamais fourni** par l'hôte. Le bouton s'affiche, il se désactive même proprement
(`disabled={surLancer === undefined}`), et rien ne signale qu'il ne mène nulle part.

Recensé par OBJET plutôt que par occurrence (`bac-a-sable/rappels-morts/auditer.mjs`), sortie
citée :

```
27 rappel(s) optionnel(s) DÉCLARÉ(S) sur 21 composant(s)
 7 ne sont fourni(s) NULLE PART

  composants/Compagnon.tsx      surChoisir      ← rendait la bande NON tapable
  ecrans/EcranCampement.tsx     surOuvrirChaudron
  ecrans/EcranDashboard.tsx     surTravailler
  ecrans/EcranDashboard.tsx     surLancerExercice
  monde/MurDesNoms.tsx          surRejouer
  monde/PastilleSortie.tsx      surRepli
  monde/PointLibre.tsx          surVisite
```

**Aucun test ne pouvait les voir.** Chaque recette injecte elle-même les rappels dont elle a
besoin, donc **aucune ne traverse le câblage réel du routeur**. C'est le mode de défaillance
« champ déclaré, câblé jusqu'à la sortie, jamais affecté » : invisible au compilateur, invisible à
la relecture, et parfaitement visible au premier enfant qui tape.

Les deux nouvelles recettes passent donc par le CHEMIN DE L'ENFANT — profil, écran, tap — sans rien
injecter. `parcours-chaudron.spec.ts` et `parcours-lancer-exercice.spec.ts` étaient **rouges avant
correction**, 4/4 et 2/3.

### R25. Le chaudron ne mijotait pas, il n'était pas branché — **corrigé**

Le message que le père a lu est le message d'attente du composant : « Le chaudron mijote encore ».
Sa destination existe désormais (`galeries-12` / `paroi-libre-01`, moteur `libre`), et elle est
déclarée dans le **contenu** (`campement.coloriageLibre`), pas dans le code : le campement déclare
déjà sa scène, ses trente points et ses objets, sa sortie de secours y appartient au même titre.
Sans déclaration, le chaudron retombe sur son message calme — jamais un écran d'erreur (R14).

### R26. Le butin et la bande s'ouvrent comme l'étagère — **corrigé**

> « Tu as fait dans l'étagère de Gobi, on peut cliquer et voir les Gobi. Il faudrait la même chose
> en fait dans ce que tu as rapporté et dans la bande aussi. »

Le panneau de R24 est devenu `FicheObjet`, partagé par quatre collections. La bande était un cas
particulier : sa tuile n'était un bouton **que si** le compagnon était rallié **et** qu'un hôte
fournissait `surChoisir` — qui n'était fourni nulle part. Aucune tuile n'était donc tapable, jamais.

### R27. L'étagère de Gobi quitte le campement — **corrigé**

> « Dans le coffre, il y a aussi les Gobi. Je pense qu'il faut les laisser dans le coffre, ça sert
> à rien de les mettre dans le campement. Dans le coffre, c'est bien. »

Elle était rendue aux deux endroits, à l'identique. Le campement est le hub — ce qu'on y fait ; le
coffre est l'album — ce qu'on y garde.

**Effet inattendu, et il solde une dette :** l'étagère occupait 298 px des 1 578 du campement. Le
garde de R20 le tenait à 378 px de débordement, avec cette conclusion écrite le matin même — « les
378 px restants demandent de retirer ou de déplacer du contenu, et cet arbitrage appartient au
père ». **Mesure après retrait : 0 px.** La dette est éteinte et sa ligne supprimée.

C'est la démonstration du procédé : chiffrer une dette au lieu de l'exempter en silence est ce qui
rend son extinction visible. Et la cause n'était pas celle que je croyais — j'avais écrit que ce
n'était pas un défaut de mise en page, sans voir que c'était un panneau au mauvais endroit.

### R28. Les fiches du coffre ne révèlent pas la couleur — **corrigé**

> « Il faudrait aussi du coup dans les Éclats de Pierre et ce que tu as rapporté, bah cette
> prévisualisation quoi, sans donner les couleurs, parce que ça c'est à deviner. »

Le coffre porte maintenant **deux contrats opposés sur la même page**, et c'est délibéré :

| collection | la couleur | pourquoi |
|---|---|---|
| Les formes de Gobi | **montrée** | R24 — « et on aura la couleur ». Une promesse assumée, annoncée en toutes lettres |
| Les Éclats de Pierre | **cachée** | R28 — « c'est à deviner » |
| Ce que tu as rapporté | **cachée** | R28 |

L'un donne envie en montrant, l'autre en cachant. Deux règles opposées dans un même écran dérivent
si rien ne les tient : `EcranCoffre.test.tsx` les garde côte à côte, pour qu'on ne puisse pas
aligner l'une sur l'autre par distraction.

### R29. Supprimer un compte joueur — **corrigé**, et c'est un dégât que j'ai causé

> « tu as créé plein de comptes de joueurs qui s'appellent Mesure, déjà il faudrait les enlever.
> Et dans l'espace des parents, il faudrait pouvoir les supprimer en fait, supprimer un compte. »

**Six profils « Mesure » écrits dans sa VRAIE base**, entre 19:06 et 19:07 le 2026-08-03, par mes
sondes de mise en page qui pointaient sur `donnees/pierre.db` au lieu d'une base jetable.

> **Un outil de mesure qui écrit dans les données du joueur n'est pas un outil de mesure.** Toute
> sonde future monte son propre serveur sur une base jetable, comme le fait déjà
> `tests/harnais-serveur.ts`. C'est la vraie leçon de ce retour.

Sans écran de suppression, il n'avait aucun moyen de nettoyer sans ouvrir SQLite — c'est-à-dire
aucun moyen. `DELETE /api/parent/:profil` reprend les gardes de la remise à zéro, parce qu'il fait
quelque chose de **strictement plus destructeur** : jeton parent, aperçu chiffré avant toute
confirmation, prénom retapé vérifié **au serveur**. Pas de portée : supprimer n'a qu'un sens.

Le service ne réécrit pas de seconde liste de tables — il réutilise `tablesPorteusesDeProfil`, qui
les DÉCOUVRE par le schéma. Une table ajoutée demain avec une colonne `profil_id` est vidée toute
seule, par les deux chemins à la fois.

Nettoyage effectué avec sauvegarde préalable, sortie citée :

```
Sauvegarde écrite : donnees/sauvegardes/pierre-avant-retrait-mesure.db
6 profils retirés · 42 ligne(s) de données effacée(s)
Profils restants : Ezékiel
✅ Aucun « Mesure » restant, « Ezékiel » intact.
```

### R30. « Lancer cet exercice » lance vraiment l'exercice — **corrigé**

Deux manques, pas un. Le rappel n'était fourni par personne, **et** l'entrée de catalogue ne portait
pas de quoi jouer : le catalogue liste des exercices, on n'entre dans le jeu que par un nœud. Le
serveur résolvait pourtant ce nœud depuis toujours, trois lignes plus haut, pour en déduire la
région. Mesuré : 76 exercices sur 76 déclarent `jeu.noeud`.

**La moitié qui compte le plus n'était gardée par rien.** Une partie lancée par le parent ne doit
rien journaliser — `tentatives` fait foi pour le BKT, le Leitner et le sélecteur. `LANCEMENT_PARENT
= { journalise: false }` existait depuis N5 et **personne ne le lisait**. Son propre commentaire
annonçait le risque : « un drapeau qui ne vit que dans une variable JavaScript est un drapeau
qu'aucun test de bout en bout ne peut constater. » Il vit maintenant dans le magasin et se lit sur
`data-journalise`.

`tests/unitaires/galerie-non-journalisee.test.ts` prétendait garder ce contrat depuis N5. Son
« lancement » est un `GET /api/contenu/noeuds/{exercice}` **qui accepte un 404 comme succès** : il
ne traverse aucune ligne de client, et son « 100 % des exercices sont lançables » ne mesurait rien.
Le nouveau garde joue réellement jusqu'à la récompense et recompte le journal au serveur.

### Ce que le contrôle positif a attrapé, encore une fois

Ma première sonde du journal renvoyait `0` en silence quand la requête échouait, **et** lisait
`etat().profil?.id` alors que `etat().profil` EST l'identifiant. Deux mesures creuses qui
s'annulaient : le cas « le parent ne journalise rien » comparait zéro à zéro et passait au vert.
C'est le contrôle positif — « une partie de l'ENFANT, elle, compte bien » — et lui seul, qui a fait
tomber les deux.

### Ce qui reste, et que le père n'a pas encore vu

Deux rappels du recensement ne sont toujours fournis par personne, et ce ne sont plus des boutons
morts mais des **fonctionnalités absentes** :

- **`MurDesNoms.surRejouer`** — la v2 § 3.4 promet « le mur des noms (mots maîtrisés, chacun
  rejouable en un tap) ». Les noms sont bien tapables et jouent un son ; ils ne rejouent rien.
- **`EcranDashboard.surTravailler`** — le bouton « Travailler ça » de la v2 § 14 n'est simplement
  pas rendu, faute de destination.

Les trois autres (`Compagnon.surChoisir`, `EcranCampement.surOuvrirChaudron`,
`PastilleSortie.surRepli`, `PointLibre.surVisite`) sont désormais des **surcharges** : le composant
fait son travail sans elles.

---

## Ce que la QA doit apprendre de ces six

Trois recettes manquantes, formulées comme des propriétés et non comme des captures :

1. **Un exercice réussi change ce que l'enfant voit sur la carte.** Mesurable : la part de
   territoire découverte croît d'au moins `1/N` moins la tolérance. Écrite pour D51.
2. **Un habillage livre ce que son nom promet.** Mesurable : chaque habillage déclare les
   identifiants que son moteur anime, et le SVG les porte. Aurait attrapé R2 le jour de sa
   livraison.
3. **Aucun écran de fin n'est un cul-de-sac quand il reste du contenu.** Mesurable : depuis
   l'écran de récompense, il existe un chemin vers un nœud jouable tant qu'il en reste un.
   Aurait attrapé R3.

La quatrième leçon n'est pas une recette, c'est une discipline : **le père a trouvé en vingt
minutes ce que 2 498 cas n'avaient pas vu.** Une session de jeu réel vaut une campagne, et elle
doit précéder les campagnes plutôt que les suivre.

---

## R31 → R38. Huit retours du 2026-08-07 — **session d'Ezékiel et du père**

Verbatim et mesure ici ; le plan de travail, les arbitrages et l'ordre des lots sont dans
[feuille-de-route-debug.md](feuille-de-route-debug.md), qui est né de cette session.

### R31. Rien de ce qu'on gagne n'est jamais enregistré — **ouvert, cause trouvée, priorité 1**

> « si on finit un exercice, il y a écrit qu'on gagne une évolution mais en fait il n'y a rien du
> tout dans le campement. »

Mesuré sur `donnees/pierre.db`, en lecture seule, sortie citée :

```
tentatives            23        formes_gobi            0
progression_cascade    0        campement              0
compagnons             0        stade_gobi   {oeuf, rang 1}
```

**Vingt-trois exercices joués, zéro ligne de cascade.** Recensé par OBJET, chaque écrivain d'acquis
et son atteignabilité :

```
appliquerTentativeALaCascade   →  appelé par PERSONNE
enregistrerFormeGobi           →  appelé par PERSONNE
poserObjetCampement            →  route OK, aucun client ne l'appelle
compagnons, etagere_rang       →  aucun écrivain nulle part
```

L'annonce, elle, est sincère : `client/src/etat/magasin.ts:345` calcule la cascade **dans le
client**, et `magasin.ts:240` la remet à `ETAT_CASCADE_VIDE` à chaque choix de profil. Rien ne la
lit du serveur (`grep -n cascade client/src/api/client.ts` → aucune ligne). **C'est un compteur de
session qui repart de zéro à chaque rechargement, et qui n'attribue rien.**

Conséquence qui n'était pas dans le retour : `formes_gobi` vide ⇒ le stade reste `oeuf` ⇒
**`EvolutionGobi`, écrit et livré pour R6, est inatteignable.** Le coffre restera vide à vie.

`tests/e2e/parcours-cascade.spec.ts` vérifie l'affichage d'une cascade que le client fabrique
lui-même : il ne pouvait rien voir.

### R32. `histoire` : la bonne réponse est TOUJOURS le premier bouton — **ouvert**

> « mélanger un peu plus les réponses aussi qui sont juste à cocher à la suite »

R14 avait corrigé exactement ce défaut — sur `eclair` seulement. Mesuré sur les 76 exercices :

```
eclair    34 consignes à options, 34 avec la bonne en 1re position  →  MÉLANGÉ au rendu
histoire  32 consignes à options, 32 avec la bonne en 1re position  →  ORDRE D'ÉCRITURE
```

`grep -rn "melanger" partage/src/moteurs/*/moteur.ts` ne rend qu'**une** ligne, celle d'`eclair`.

### R33. Le jeu refuse une bonne réponse — **ouvert, tranché, lot B3**

> « la sélection des mots dans la page les mots de couleur et autre qui n'est pas facile, on
> devrait juste pouvoir prendre n'importe quel mot et le mettre dans l'une des deux cases, sans
> ordre particulier, ça devrait juste fonctionner. »

**Il avait parfaitement compris l'exercice, et c'est moi qui n'avais pas ouvert le fichier.** Je
lui ai d'abord posé la question comme s'il avait pu se tromper sur la mécanique. Sa réponse — « on
a des mots mélangés, des mots qui indiquent une couleur et d'autres mots, il y a 2 cases » —
décrit `paniers-couleurs-01.json` à la lettre : deux paniers, douze mots, il faut trier.

Le code, lui, découpe ce tri en **quatre consignes de trois mots**, affiche les **douze**
(`MoteurTri.tsx:178` ne filtre jamais sur `etape.restantes`) et refuse les neuf autres
(`validation.ts:66`). Donc la consigne dit « range les mots de couleur à gauche », l'enfant tape
**vert** — qui *est* un mot de couleur — le pose dans le bon panier, et le jeu le refuse par une
oscillation de 6 px sans un mot. **Ce n'est pas un ordre imposé, c'est le refus d'une bonne
réponse.**

Mesuré sur les 11 exercices de `tri` :

```
122 mots affichés au premier écran  ·  27 acceptés  ·  95 refusés   →  77,9 %
wagons-tri-01 : 14 affichés, 2 acceptés, 12 refusés
```

Et le découpage ne porte aucune pédagogie — les 53 consignes de `tri` :

```
« Range AUSSI les mots … » (règle identique à la précédente)   16
« ces mots » / « les derniers mots » (aucun critère)           13
portant un critère neuf                                        24
→ sans aucune règle nouvelle : 29  (54,7 %)
```

`rayonnages-tri-01` dit *« Range les mots du renard. »* puis *« Range **aussi** les mots du
renard. »* : deux consignes, une règle, des lots de deux mots.

**Tranché** : `tri` accepte n'importe quel mot à n'importe quel moment (voie A). Le lotissement
disparaît, le critère reste. **Se fait avec le rejeu sous les yeux** — la forme des résumés change,
et le journal fait foi pour le BKT et le Leitner.

### R34. Le glisser au doigt sur tablette — **question tranchée : c'est possible, et c'est déjà fait**

> « voir pour le glissement d'un texte vers une zone si en web sur la tablette au doigt c'est
> possible ou pas ? »

**Oui.** `place` le fait, et les trois pièces indispensables sont dans le dépôt :
`PointerSensor` de dnd-kit (`MoteurPlace.tsx:21`), `activationConstraint: { distance: 8 }`
(`:137`) pour qu'un tap reste un tap, et surtout **`touchAction: 'none'`** (`Reserve.tsx:90`) —
sans lequel le navigateur fait défiler la page au lieu de glisser, ce qui est la cause n°1 des
« ça ne marche pas au doigt » en web.

Recensé par objet, **commentaires exclus** : aucun geste de pointeur dans **11 moteurs sur 14**.
Seul `place` fait réellement du glisser-déposer — et il porte 1 exercice sur 76 ; `colorie` peint
et `trace` trace, ce sont d'autres gestes. `tri` a reçu son affordance au lot R16, jamais son
glisser.

> Le premier passage de ce recensement comptait `tri` comme ayant un glisser : les motifs
> `onPointer`, `draggable`, `dnd-kit` étaient trouvés **dans le commentaire de R16 qui dit qu'ils
> sont absents**. Un recensement qui lit ses propres notes ne mesure rien.

**Garde manquant** : aucune recette n'exerce un vrai glisser tactile, même sur `place` qui marche.

### R35. Les mots à déchiffrer ignorent les réglages de lecture — **ouvert**

> « la mise en page pour chaque page, actuellement, le texte est trop petit »

Réglages d'Ezékiel en base : `andika · corps 27 px · interlettrage 0,06 em · interligne 2`. Ils ne
sortent que par `ZoneDeLecture`, qui rend la **consigne**. Les mots sur lesquels porte la lecture
sont en dur, recensé sur les 14 moteurs :

```
fontSize: '1.25rem' (20 px) en dur  →  11 moteurs sur 14
```

**27 px demandés, 20 px rendus, sans interlettrage** — alors que l'interlettrage est noté dans le
dépôt lui-même comme « le levier le plus prouvé » (Zorzi 2012).

### R36. « Marcher sur les mots » : le design existait, il n'a jamais été dessiné — **ouvert**

> « certaines règles sont incomprises… comme marcher sur les mots, est-ce qu'il y avait un design
> graphique en tête ? »

**Oui, et il est écrit noir sur blanc** — specs v2, ligne 216 : *« `chemin` · Tracer une route en
enchaînant les bonnes cases · Sauts de nénuphars · pas japonais · lianes »*.

Ce qui est rendu (`MoteurChemin.tsx:119`) : `display: flex, flexWrap: wrap` — **une rangée de
boutons qui passe à la ligne**. Le pion, l'adjacence et le franchissement sont dans le DOM
(`data-pion`, `data-atteignable`, `data-franchie`) et **aucun des trois n'a de rendu**. Ni plateau,
ni pion visible, ni trace du chemin.

Même famille que R16 : **le dessin manquant a été pris pour un défaut de compréhension.**

### R37. Le décor est un lavis gris à 14 %, pas une image qui accompagne — **à arbitrer**

> « il devrait y avoir des images aussi pour accompagner, exemple avec les lucioles »

R9 a bien été corrigé : `EcranNoeud` monte `DecorDeFond` derrière les 12 moteurs sans scène propre.
Mais `DecorDeFond.tsx:77` pose `OPACITE_FOND = 0.14`, en grisaille, `aria-hidden`,
`pointerEvents: none`. **Cette opacité est juste** — elle a été dérivée de la contrainte de
contraste du texte, pas choisie à l'œil.

Elle répond simplement à une autre question. Quand l'exercice parle de lucioles, l'enfant doit
**voir une luciole** en couleur à côté du mot, pas un lavis gris derrière le texte. Coexistence
possible (la vignette est hors du champ de lecture), mais elle heurte D51 — le décor de l'exercice
reste gris pour ne pas voler son signal au coloriage.

**Le père a refusé de trancher dans l'abstrait, et il a raison** : « il faut qu'on revoie le
design en particulier dans une tâche liée à cet exercice ». La question de l'illustration se pose
**par exercice, devant l'exercice** — donc après R38. Lot C4, après V1.

### R38. Aucun moyen de revoir les écrans sans jouer — **demandé, ouvert**

> « niveau design, faire des retours page par page, donc à me donner des pages en mode parent
> juste pour faire des retours »

La zone parent donne accès aux 76 **exercices** (galerie, R30) et à **aucun des 13 écrans**. Voir
le campement ou la carte demande de jouer jusqu'à eux.

De quoi le faire existe déjà : `tests/e2e/qa-outils.ts` porte `recettesDEcrans()`, qui **dérive du
code** la liste des écrans et sait atteindre chacun **en tapant comme l'enfant**. Une « Visite des
écrans » dans le dashboard la lit — écrire une seconde liste d'écrans à la main serait le doublon
qui se met à mentir, comme les deux listes de polices de R8.

**Tranché le 2026-08-07 : la visite dans la zone parent**, pas une planche de captures. Et le père
l'a élargie de lui-même : « il faut qu'on trouve un moyen pour que je voie chaque exercice et que
je fasse des retours de design » — donc **29 pages + les 76 exercices**, ces derniers par le
chemin non journalisé de R30. **C'est l'outil dont dépend toute la revue de design** : lot V1,
juste après A1.

### Le compte cumulé

**14 défauts trouvés par le père en deux sessions de jeu. 0 par la QA.**

---

## Troisième session — le 2026-08-07, sur la tablette, en portrait

Le père ouvre la **visite des écrans** (R38, livrée le jour même) sur la Galaxy Tab S10 FE, en
navigateur, **orientation portrait**. Cinq retours, dont un qui invalide une garantie qu'on croyait
tenue.

### R39 — Toute la garantie « tient dans l'écran » est mesurée en PAYSAGE

> « j'utilise une tablette vertical, une samsung s10 fe, c'est 1440 * 2034. et je suis dans un
> navigateur, donc on perd en hauteur aussi, ça veut scrolle. »

Mesuré, `playwright.config.ts:98`, projet `qualite` :

```
viewport: { width: 1920, height: 1200 }        ← PAYSAGE
appareil réel, tel que rapporté               1440 × 2034   ← PORTRAIT
```

Les **91 cas** de `tests/qualite/mise-en-page-tablette.spec.ts` mesurent donc R20 dans une
orientation que l'enfant n'utilise jamais. Le lot R20 a été livré, ses cas sont verts, et l'écran
défile quand même chez l'utilisateur. **Un banc qui ne reproduit pas le réel n'autorise aucune
conclusion sur le réel** (CLAUDE.md).

À faire, et dans cet ordre : d'abord **établir le format CSS réel** (les 1440 px sont des pixels
d'appareil ; le rapport de pixels de la tablette donne la largeur CSS effective, et c'est elle
qu'il faut au banc), ensuite décider si le banc bascule en portrait ou couvre les deux. Ne pas
supposer le format : le mesurer sur l'appareil.

### R40 — Le décor du campement flotte dans son cadre, les points ne suivent pas

> « pour le campement, l'image ne remplit pas la largeur, et du coup le tour noir et les petits
> carrés jaunes qui clignotent ne correspondent pas à l'image. »

Cause mécanique, localisée. `client/src/ecrans/EcranCampement.tsx:326-351` :

```
maxInlineSize : 1200px          ← plafonne la largeur sous les 1440 de l'appareil
maxBlockSize  :  260px          ← écrête la hauteur…
aspectRatio   : largeurScene / hauteurScene   ← …et CONTREDIT donc ce rapport
backgroundSize: contain · backgroundPosition: center
```

Quand la hauteur est écrêtée, le cadre n'a plus le rapport du décor ; `contain` centre alors
l'image en laissant des marges. Mais les points sont posés **en pourcentage du CADRE**, pas de
l'image — `client/src/monde/PointLibre.tsx:123-126` :

```
insetInlineStart: (x / largeurScene) * 100 %
```

Le trait noir cerne le cadre, les points se répartissent sur le cadre, et le décor flotte au
milieu. Le désalignement est garanti par construction dès que le rapport diffère.

Remède à concevoir, pas à bricoler : le cadre doit porter **le rapport du décor et rien d'autre**
(retirer l'écrêtage de hauteur, ou passer le décor en `<svg>` posé dans le flux avec les points
dans son propre système de coordonnées). Un décor et ses prises doivent partager **un seul**
référentiel.

### R41 — Le bouton « ? Gobi » du campement est câblé sur le vide

> « quand j'appuie sur le bouton "? gobi" ça ne fait rien. »

Mesuré, `client/src/ecrans/EcranCampement.tsx:369` :

```tsx
surDemande={() => undefined}
```

Le composant `Gobi` rend toujours son bouton `data-action="aide"` ; au campement il reçoit une
fonction vide. **Il ne peut rien faire par construction.**

Ce cas est instructif au-delà du défaut : **le détecteur de rappels morts (D4) ne le voit pas.**
Il recense les propriétés `sur…?` **déclarées optionnelles et fournies nulle part** ; celle-ci est
fournie — avec du néant. C'est le même mode de défaillance que « le champ déclaré, câblé jusqu'à la
sortie, jamais affecté » (CLAUDE.md) : le câblage existe, la valeur est morte.

Deux issues, et c'est une décision de conception : soit Gobi a quelque chose à dire au campement
et le bouton le dit, soit il n'a rien à y dire et le bouton **ne s'affiche pas**. Un bouton qui
existe et ne répond pas est le pire des trois — R16 et R33 l'ont déjà montré au doigt.

Élargissement à faire dans le même lot, par OBJET et non par occurrence : recenser **tous** les
rappels fournis avec une fonction vide (`() => undefined`, `() => {}`, `noop`), pas seulement
celui-ci.

### R42 — « forme(s) » : le pluriel n'est pas rendu

> « puis fais un effort pour mettre un s ou pas en fonction du nombre de formes. »

`client/src/ecrans/EcranCampement.tsx:384` :

```
Encore {suivant.formesRestantes} forme(s) et Gobi deviendra « {suivant.stade.libelle} ».
```

C'est un texte lu par un enfant de CE1 qui apprend à lire. La parenthèse est une notation
d'adulte : elle n'existe pas dans ce qu'il déchiffre à l'école, et elle contredit la règle
« aucune consigne n'existe uniquement à l'écrit » — celle-ci sera lue à voix haute telle quelle.

Le même lot recense les autres `(s)` du texte destiné à l'enfant, par objet.

### R43 — L'annonce d'évolution ne montre pas ce qu'elle annonce

> « il y a écrit "encore 1 forme(s) et Gobi deviendra la lueur qui perce", mais le dessin ne
> change pas. »

À distinguer de R31 : ici Gobi ne peut **jamais** évoluer, puisque `formes_gobi` reste à 0 — c'est
A1 qui le débloque. Mais la phrase promet un changement de dessin, et **rien à l'écran ne montre à
quoi ressemblera « la lueur qui perce »**. L'enfant lit une promesse sans image.

À reprendre **après A1**, quand l'évolution sera possible : montrer le prochain stade en creux, à
côté du stade actuel — le même contrat que l'étagère de R24, où la case vide est la même case en
Grisaille. Ne pas le faire avant : on habillerait une promesse que rien ne peut encore tenir.

### Le compte cumulé

**19 défauts trouvés par le père en trois sessions de jeu. 0 par la QA** — mais les sept gardes
posés le 2026-08-07 en tiennent désormais quatre familles, et R39 dit pourquoi ils n'auraient pas
attrapé les cinq d'aujourd'hui : **ils mesurent tous en paysage.**

---

## Même session, dans la visite — les exercices vus un par un

### R44 — Dans `phrase`, les mots à ranger sont déjà rangés

> « je commence par le premier avec le feu rouge. […] il faut ranger les mots, mais ils sont déjà
> dans l'ordre. »

Mesuré sur `contenu/exercices/cite-des-histoires/banniere-phrase-01.json` :

```
consigne c1 : « Range les mots pour lire : le feu est rouge. »
  ordre attendu      : mot-le · mot-feu · mot-est · mot-rouge
  étiquettes du fichier, dans l'ordre du fichier :
                       mot-le · mot-feu · mot-est · mot-rouge · mot-les · mot-voitures …
```

Et `client/src/moteurs/phrase/MoteurPhrase.tsx:137` rend `contenu.etiquettes.map(…)` — **l'ordre
du fichier, sans aucun mélange**. Ni `Alea`, ni tirage : la recherche de `melange|Alea|shuffle`
dans le moteur et dans son rendu ne rend **rien**.

L'enfant tape de gauche à droite et gagne **sans lire**. Le BKT engrange alors des réussites vides,
ce qui est pire qu'un échec : il croit l'acquis acquis.

**C'est R32 qui recommence, sur un autre moteur** — et il faut dire pourquoi on ne l'a pas vu :

- le détecteur D3 cherchait un champ nommé `options`. `phrase` range ses mots dans `etiquettes` +
  `ordre`. **Recensement par occurrence, pas par objet** — le défaut que CLAUDE.md nomme, commis
  par l'instrument censé le trouver ;
- le garde **Q4** a hérité du même angle mort : sa population dit « 14 moteurs, dont **2** portent
  des choix », détectés à la forme « tableau d'ids + scalaire qui en fait partie ». `phrase` a la
  forme « tableau d'ids + **tableau** d'ids ». Elle lui échappe.

**Q4 doit être élargi avant le lot B1**, sinon B1 corrigera `histoire` et laissera `phrase`, et
personne ne le saura. La bonne population n'est pas « les moteurs qui ont un champ `options` » :
c'est **tout moteur dont le contenu porte une réponse ordonnée**.

### R45 — « c'est quasiment le même design partout »

> « le design est le même partout, c'est juste une liste de mots les uns à côté des autres avec un
> fond gris avec des formes, donc il faut qu'on réfléchisse à ça. »

Le père confirme depuis le siège de l'enfant ce que le détecteur D5 avait mesuré : **11 moteurs sur
14 sont une rangée de boutons**, alors que les specs v2 § 5 leur promettent une scène nommée.
`MoteurPhrase.tsx:136` : `<div data-plateau="etiquettes" style={{ display: 'flex', flexWrap:
'wrap' }}>` — pour un habillage qui s'appelle `cite.banniere`.

C'est la **promesse de variété** du projet qui tombe (R12 : ≥ 3 moteurs par compétence ; R13 :
jamais deux fois le même habillage dans une sortie). Trois moteurs par compétence ne servent à rien
si les trois se ressemblent.

Ce n'est pas un lot de correction, c'est une **question de conception à instruire**, et le père
demande qu'on y réfléchisse — pas qu'on la corrige au jugé. Elle se pose devant les exercices, dans
la visite, exercice par exercice. Lot C2 (le plateau de `chemin`) en est le premier cas concret ;
C3 le recensement qui l'alimente.

### R46 — L'aide de Gobi est vide : 13 moteurs sur 14

> « et aussi le bouton "? gobi" ne fait rien. »

Signalé une deuxième fois, cette fois **dans un exercice**. Le premier signalement portait sur le
campement (R41, `surDemande={() => undefined}`) ; ici la cause est **autre**, et elle est plus
large.

L'action arrive bien jusqu'au moteur — `demanderAide` est traité par les 14. Mais :

```
partage/src/moteurs/commun/aide.ts:130
  return { niveau: 'indice', code: 'relire-consigne', cible, texte };
```

et **tous les appelants passent `texte: null`**. Mesuré, par objet :

```
appels à construireAide(niveau, cible, TEXTE) dans partage/src :
  13 moteurs passent  null
   1 moteur  passe un texte réel  →  trace  (trait?.libelle)
   colorie  a son propre construireAide, local
```

Or `client/src/composants/Gobi.tsx` :

```
134:  const parle = aide !== null && aide.texte !== null;
195:  <p style={{ margin: 0 }}>{texte}</p>
199:  {parle ? <BoutonEcouter … /> : null}
```

Taper « ? Gobi » change donc l'état, pose une aide dont le texte est `null`, et rend **une bulle
vide sans bouton Écouter**. À l'écran : rien.

**Deux règles non négociables tombent en même temps** : « l'aide de Gobi ne coûte rien » — elle ne
donne rien non plus —, et « aucune consigne n'existe uniquement à l'écrit, tout est audible en un
tap » — ici il n'y a ni écrit ni audible.

**Le garde Q2 avait déjà la moitié de la réponse** et personne ne l'avait reliée : il signale
`CodeAideGobi — JAMAIS produits : souffle-syllabe, surligne-graphene, montre-couleur`. La cause est
la même ligne : `construireAide` ne produit jamais que `relire-consigne` et `montre-cible`. Le
contenu déclare des aides — `banniere-phrase-01` demande `souffle-syllabe` — que **rien ne peut
émettre**.

Lot à créer, prioritaire, et il est plus gros qu'il n'en a l'air : ce n'est pas un texte à
brancher, c'est **l'étage d'aide entier qui est inerte**, alors que 354 assertions sont vertes
autour. Signature exacte du « banc qui ne peut pas ATTEINDRE le mécanisme qu'il garde ».

### Le compte cumulé

**22 défauts trouvés par le père en trois sessions de jeu.** La QA en a trouvé la **moitié** de
deux d'entre eux sans que personne ne fasse le lien : Q2 tenait la cause de R46 depuis la veille,
Q4 aurait tenu R44 si sa population avait été dérivée par objet.

---

### R47 — Le décor de l'exercice ne se colorie jamais. C'est la promesse centrale du jeu.

> « j'aimerais qu'on voie aussi la base de design […] au lieu de pur texte mis en haut à gauche de
> l'écran, ça n'utilise pas le fond, et le fond devait se colorier en plus non ? »

**Oui.** Specs v2, deux lignes qui portent le projet entier :

> ligne 70 — « Toute zone non conquise est affichée **en gris désaturé, immobile, silencieuse**.
> Chaque mini-jeu réussi **recolorie une portion du décor** : les feuilles reprennent leur vert,
> l'eau se remet à couler, un animal se met à bouger, un instrument rejoint la musique. »
>
> ligne 79 — « chaque décor est un SVG en calques, servi avec un filtre `saturate(0)` global et des
> calques **dé-grisés un par un**, avec une transition de **900 ms** qui balaie depuis le point
> touché. »

**Ce qui est livré, mesuré.** L'habillage existe et il est riche —
`contenu/habillages/cite-des-histoires/banniere.habillage.json` déclare **neuf régions coloriables
nommées**, chacune avec son centroïde et sa surface : le ciel de la cité, la place, le toit de
tuiles, le balcon, le mât, les deux bannières, la fenêtre de la tour, la lanterne. Le SVG porte
`calque-fond`, `calque-zones`, `calque-trait`.

Et voici ce que l'écran en fait — `client/src/habillages/DecorDeFond.tsx:109-129` :

```
opacity: 0.14           ← R37 : réglé par contraste, pour NE PAS gêner le texte
pointerEvents: 'none'   ← jamais le doigt
aria-hidden: 'true'     ← jamais annoncé
zIndex: 0               ← derrière tout
```

**Aucune désaturation, aucune recoloration.** Recherche de `saturate` dans tout `client/src`,
sortie citée — cinq emplois, **aucun sur le décor d'exercice** :

```
Compagnon.tsx   ·  EcranCoffre.tsx  ·  Etagere.tsx  ·  FicheObjet.tsx
global.css:631  →  .case-butin[data-rapporte="non"] .dessin-butin   (le coffre, pas le décor)
```

Et `MOTEURS_AVEC_SCENE_PROPRE = ['colorie', 'place']` : **2 moteurs sur 14** montent réellement
leur scène. Les douze autres reçoivent le même papier peint à 14 %, derrière une rangée de mots.

**C'est la racine commune de R45.** Si le décor est une décoration derrière le jeu au lieu d'être
la **surface de jeu**, alors douze moteurs se ressemblent nécessairement : ce qu'on voit d'eux,
c'est la rangée de boutons, et le décor ne les distingue pas — il est à 14 % pour tous.

La recoloration, elle, existe bel et bien : au niveau de la **région**, sur la carte
(`pourcentageColorie`, recalculé depuis `progression_noeud`). L'enfant la voit donc **après** avoir
quitté l'exercice, jamais pendant. Ce qui manque, c'est le geste immédiat que les specs décrivent
au § « Boucle de 30 secondes » : *« Consigne animée et audible → action → retour immédiat →
fragment de décor recolorié. »* Le fragment ne se recolorie pas.

**Trois questions à instruire, et aucune ne se tranche au jugé :**

1. **Le décor est-il le fond ou le plateau ?** Si les mots à ranger étaient posés SUR la bannière —
   à la place des bannières, sur le balcon, au mât — alors le décor devient le jeu, la variété
   revient gratuitement, et chaque région réussie recolorie sa zone. C'est ce que `place` fait déjà
   avec ses centroïdes : il y a un précédent qui marche dans le dépôt.
2. **Que devient R37 ?** Les 14 % ont été réglés par contrainte de contraste, pour que le fond ne
   passe jamais sous le champ de lecture. Un décor qui devient le plateau doit résoudre ce
   contraste autrement — le champ de lecture porte déjà son propre fond opaque.
3. **Le coût par habillage.** La promesse du projet est « ajouter un habillage ne demande **zéro
   ligne de code** » (axe moteur × habillage × contenu). Une conception qui exigerait du code par
   habillage violerait R12/R13 et tuerait la variété. Le remède doit rester déclaratif : les
   centroïdes et surfaces sont **déjà dans les fichiers d'habillage**, personne n'a à les écrire.

**Ce n'est pas un lot de correction, c'est la conception à reprendre**, et c'est le père qui l'a
demandée : « il faut qu'on réfléchisse à ça ». Elle se pose devant les exercices, dans la visite,
un par un — et elle commande C2, C3 et R45.

---

## La capture d'écran du 2026-08-07 — ce que la mesure n'avait pas vu

Le père envoie une capture de `banniere-phrase-01` (« Le feu rouge de la ville »), jouée depuis la
visite, sur sa tablette en **portrait**. Elle rend visibles cinq choses d'un coup, dont trois
qu'aucune mesure de cette session n'avait attrapées.

### ~~R48 — Le bandeau « retour à la visite » recouvre la bulle de Gobi~~ — RETIRÉ

> **Ce n'était pas un défaut. C'est moi qui ai mal lu la capture, et le père m'a corrigé :**
>
> > « le panneau devant le Gobi c'est juste parce que j'utilise le menu pour la visite, mais le Gobi
> > est derrière, c'est pas le problème, le problème c'est le décor et les mots à trouver. »
>
> Le bandeau n'existe **qu'en visite**, c'est-à-dire dans l'outil du parent. L'enfant ne le voit
> jamais. J'avais transformé un outil posé par-dessus une page qu'on inspecte en « régression qui
> annule l'aide sur les 76 exercices », et j'avais lancé un agent dessus — arrêté avant toute
> écriture.
>
> Le fait observé reste vrai (`position: fixed`, coin bas-gauche, `zIndex: 9999`, monté à la racine
> du routeur) ; c'est son **interprétation** qui était fausse. On garde la trace parce que la leçon
> vaut plus que l'entrée : **une capture montre un état, pas une gêne.** La gêne, seul celui qui
> joue peut la dire. J'ai déduit une urgence d'un pixel au lieu de demander.
>
> Numéro conservé, jamais réattribué : R48 est retiré, pas recyclé.

### R49 — La consigne est affichée DEUX fois

L'en-tête porte « Range les mots pour lire : le feu est rouge. » et `ZoneDeLecture`, quinze pixels
plus bas, porte **exactement la même phrase**. Mesuré : `EcranNoeud` monte une barre de consigne
(`data-consigne`), et `MoteurPhrase.tsx:114` monte `ZoneDeLecture` avec `consigne.texte`. Aucun des
deux ne sait que l'autre existe.

Pour un enfant qui déchiffre, lire deux fois la même ligne n'est pas neutre : il cherche la
différence entre les deux.

### R50 — `phrase` montre les mots des DEUX consignes à la fois

La capture montre dix mots en une seule rangée :

```
Le  feu  est  rouge.  Les  voitures  sont  sur  la  route.
```

Or la consigne courante est « le feu est rouge » — quatre mots. Les six autres appartiennent à la
consigne suivante. `MoteurPhrase.tsx:137` rend `contenu.etiquettes.map(…)` : **toutes** les
étiquettes de l'exercice, sans filtrer sur l'étape.

**C'est R33 à l'identique, sur un autre moteur.** Sur `tri`, 95 mots sur 122 étaient refusés au
doigt parce qu'ils appartenaient à une autre étape. La décision du père y était la voie A —
n'importe quel mot, n'importe quand. Ici la même question se pose, et elle se posera sur tout
moteur qui affiche un stock d'éléments : **le lot B3 doit être conçu pour la famille, pas pour
`tri` seul.**

### R51 — La mise en page ne se sert pas de l'écran

> « c'est pas beau design »

Sur 2034 px de haut, la capture montre : l'en-tête, la consigne, la consigne encore, une rangée de
mots minuscules — puis **environ 250 px de vide**, un décor de 310 px de haut flottant au centre,
**encore 350 px de vide**, et Gobi tout en bas. Les mots à déchiffrer sont en haut à gauche, à
`1.25rem` (R35), sans rapport avec le décor.

Trois défauts déjà consignés se voient ici en même temps, et c'est utile de les voir ensemble :
R35 (le texte de jeu n'hérite pas des réglages), R39 (le banc mesure en paysage, donc ce vide n'est
mesuré nulle part), R47 (le décor est un papier peint à 14 %).

### R52 — La décision du père sur le décor, et elle tranche R47

> « le décor c'est le fond, il se colore avec l'avancée de l'exercice, en tout cas si ma mémoire est
> bonne. et on met les mots à trouver de la bonne taille, de la bonne font et à des endroits sympa
> et les mots devant mais à des endroits lisibles. »

Sa mémoire est bonne : c'est exactement les specs v2, lignes 70 et 79. **Décidé, et cela répond aux
trois questions ouvertes de R47 :**

1. **Le décor est le FOND**, pas le plateau. Il occupe l'écran au lieu de flotter au centre.
2. **Il se colorie à l'avancée de l'exercice**, pas seulement à la fin sur la carte — le « fragment
   de décor recolorié » de la boucle de 30 secondes.
3. **Les mots sont DEVANT**, à la bonne taille, à la bonne police, posés à des endroits choisis —
   « sympas » mais **lisibles**. La lisibilité l'emporte sur la mise en scène, et R37 (le contraste
   du champ de lecture) reste la contrainte à respecter.

**Ce qui reste à instruire, et qui n'est pas tranché par cette décision** : le coût par habillage.
La promesse du projet est qu'ajouter un habillage ne demande **zéro ligne de code** (moteur ×
habillage × contenu). Les régions coloriables, leurs centroïdes et leurs surfaces sont **déjà** dans
les fichiers d'habillage — `banniere.habillage.json` en déclare neuf. Une conception qui exigerait
d'écrire du code ou des coordonnées à la main par habillage violerait R12/R13 et tuerait la
variété. Les emplacements des mots doivent donc se **dériver** des données déjà présentes.

**Et le principe de dimensionnement du projet s'applique** : on le prouve sur **un** moteur, devant
le père, avant de le porter aux douze. `phrase` est le bon candidat — c'est celui qu'il a sous les
yeux.

### Le compte cumulé

**26 défauts trouvés par le père.** Quatre de plus sur une seule capture d’écran — R48 retiré, il était de mon fait et non du jeu, et
un lot livré le jour même — et trois que la mesure n'avait pas vus parce qu'elle regardait au bon
endroit dans le mauvais format.

---

## R53 → R55 — le prototype de mise en scène, testé sur la tablette

Le père relance le serveur avec le build complet et joue « Le feu rouge de la ville ». Verdict
d'ensemble : **« ça progresse vers du mieux en design »**. Trois défauts précis.

### R53 — L'indice jaune s'allume tout seul, avant qu'on ait demandé

> « le premier mot clignote en jaune direct, il faudrait attendre que "?gobi" soit cliqué. j'ai
> fait rejouer après une première fois, ça vient peut-être de là. »

Il donne lui-même la piste, et elle vaut d'être vérifiée avant toute autre : **le rejeu**. À
rapprocher de **R15**, déjà mesuré et non corrigé — `delais.ts` fait monter le niveau d'aide
**automatiquement** après 45 s d'inactivité, et `commun/etapes.ts` recopie ce niveau dans
`resume.aideUtilisee`. Si l'horloge d'inactivité n'est pas remise à zéro au rejeu, l'aide naît déjà
montée.

**Ce n'est pas qu'un défaut d'affichage** : l'aide montée toute seule coûte une étoile (R15). Un
enfant qui rejoue perdrait donc son étoile avant d'avoir touché l'écran.

### R54 — Le mot refusé saute en bas à droite au lieu de vibrer sur place

> « quand on a faux, le mot se décale en bas à droite et vibre, il faudrait qu'il vibre mais autour
> de sa position initiale. »

Un refus qui **déplace** l'élément est doublement mauvais : l'enfant perd des yeux le mot qu'il
visait, et le déplacement se lit comme « ce n'est pas là qu'il va » alors que le mot n'a pas bougé
de rôle. La vibration doit être **symétrique autour de la position d'origine**, et finir exactement
là où elle a commencé.

### R55 — Les cases à remplir sont trop discrètes

> « les cases en bas à remplir, il faudrait revoir un peu, c'est un peu trop caché. »

Sur la capture, la bande du bas porte des cases en pointillé gris pâle, sous la phrase en train de
se faire. C'est **la cible du geste** : c'est là que le mot va. Elle doit se voir au moins autant
que les mots eux-mêmes.

### Portée — à ne pas se tromper

Le nouveau rendu ne concerne **que `phrase`**. Les treize autres moteurs sont inchangés. Le père a
supposé l'inverse (« je suppose que ça prend le design partout ») : à corriger avant qu'il ne teste
un autre exercice et n'y voie une régression.

### Consigne de travail donnée par le père

> « ne fais pas de screenshot toi-même, ni d'analyse, ça coûte trop cher de token. je préfère
> tester. »

**Retenu comme règle d'orchestration** : la vérification visuelle appartient au père, qui joue sur
le vrai appareil. L'orchestrateur compile, délègue et consigne ; il ne mesure à l'écran que ce
qu'aucun agent ne peut mesurer à sa place.

---

## 2026-08-08 — `colorie`, exercice « L'école des petits mots »

> « dans l'écran "le toit de l'école est rouge", les couleurs, les taches rondes sont devant Gobi.
> en haut, il n'y a pas la consigne mais la phrase en cours, c'est à redesigner aussi. »

### R61 — Le nuancier passait devant Gobi

MESURÉ (`bac-a-sable/mesurer-recouvrement-gobi-colorie.mjs`, sur le vrai serveur de dev, nœud
`clairiere-10`, portrait 720×1017 — la borne basse de la Galaxy Tab S10 FE) : `document.
elementFromPoint` sur le centre de Gobi, de sa bulle et de son bouton « ? Gobi » rendait tous
les trois un `<li class="pierre-consigne pierre-consigne--a-venir">` — une ligne du nuancier
peinte PAR-DESSUS Gobi.

**La cause n'est pas un `zIndex`** : `[data-moteur="colorie"]` vit sous deux ancêtres `position:
relative` posés par `EcranNoeud`. Un enfant POSITIONNÉ peint toujours après le contenu en flux
normal de son conteneur flex, quel que soit l'ordre du DOM (CSS 2.1, annexe E) — donc tout ce qui
DÉBORDE de cette racine (la scène `data-scene-non-reductible` ne rétrécit jamais, R20) peint
par-dessus le `<Gobi>` non positionné qui le suit, au lieu de rester en dessous de lui.

**Corrigé** en posant `overflow-y: auto` sur la racine du moteur (`client/src/moteurs/colorie/
MoteurColorie.tsx`) : le débordement est désormais CONTENU dans la racine elle-même, atteignable
par un défilement local, sans jamais repeindre par-dessus Gobi ni la barre de consigne — qui, de
surcroît, restent visibles en permanence (avant, un défilement de toute la page les aurait fait
défiler hors champ eux aussi). Mesuré après correction : recouvrement `false` sur les trois
points.

**Effet mesuré sur la dette R20** (`tests/qualite/mise-en-page-tablette.spec.ts`,
`DETTE_MESUREE['colorie'] = 730`, format du banc 1920×1200) : le débordement vertical, désormais
porté par `[data-moteur]` et non plus par `[data-ecran]`, se mesure maintenant à **703 / 810 / 827
/ 810 / 873 / 873 px** selon le nœud (clairière-01 · forêt-muette-08 · clairière-10 · marais-
jumeau-08 · cité-des-histoires-10 · volcan-08) — un maximum de **873 px**, contre 730 avant. La
hausse du CHIFFRE ne traduit pas une régression : le même contenu (la scène ne rétrécit toujours
pas, R16) est désormais rapporté à une boîte plus petite (celle du moteur seul, qui exclut
désormais le budget de hauteur qu'occupaient la barre de consigne et Gobi), là où l'ancienne mesure
portait sur toute la page. Whoever possède `tests/` doit décider s'il faut porter `730` à `873`
dans `DETTE_MESUREE` — je ne l'ai pas fait, `tests/` n'est pas dans mon périmètre.

### R49 (`colorie`) — La consigne était dite deux fois

Même défaut que R49 sur `phrase`, sur un autre moteur : `EcranNoeud` porte `consigne.texte` dans sa
barre d'en-tête, et `PaletteConsigne` (le moteur) le redisait, verbatim, pour la consigne courante.
**Ce n'est pas un défaut de FORME** (le père l'a précisé après une première lecture erronée de ma
part — voir ci-dessous) : le mélange affirmatif/impératif des consignes de `colorie` est
délibéré et n'est pas en cause.

**Corrigé** : `PaletteConsigne` ne rend plus le texte de la consigne courante. Ce qui reste, et
qui est propre à cette ligne : la TRACE des consignes déjà faites et à venir (inchangée, et
qu'aucun autre endroit de l'écran ne montre), et — au palier d'aide `indice` seulement — les
MOTS-CLÉS SEULS de la consigne courante (pas la phrase reconstruite : une phrase surlignée reste
la même phrase pour un enfant qui déchiffre).

**Dette laissée à `tests/`** : `tests/composants/MoteurColorie.test.tsx` gate 17 de ses 25 cas sur
`await screen.findByText(contenu.consignes[0]!.texte)`, qui ne trouve plus rien puisque le moteur,
monté ISOLÉMENT dans ce test (sans `EcranNoeud`), ne rend plus la phrase nulle part. Mesuré,
sortie citée : `17 failed | 8 passed`, tous les échecs à cette même ligne d'attente. C'est le même
sort que le lot `phrase` a payé pour R49 (voir plus haut, § M6/M7 dans `Docs/decision-decor-de-
fond-et-mots-poses.md`) — ce fichier n'est pas dans mon périmètre, je ne l'ai pas modifié.

### Correction de mon propre brief — la forme des consignes n'est pas un défaut

J'ai d'abord lu « il n'y a pas la consigne mais la phrase » comme un défaut de FORME (mélange
affirmatif/impératif) et proposé de le recenser. Le père a corrigé avant que je n'écrive quoi que
ce soit dans `contenu/brouillons/` : « c'est pas la forme, "le toit est rouge" ça fonctionne […]
lire les phrases c'est normal, même s'il y a plusieurs sens. » Rien n'a été recensé ni proposé sur
ce point — le vrai défaut était R49 ci-dessus.

### Format mesuré

Portrait 720×1017 et 960×1356 (les deux bornes de R39, aucune mesure sur l'appareil réel) et
1920×1200 (le format du banc, pour chiffrer la dette R20). Dit explicitement : aucune mesure de ce
lot ne vaut pour le format réel de la tablette du père, non mesuré à ce jour.

---

## R62. Le glisser ajouté au tap — R16 se referme, et par les deux voies à la fois

**2026-08-08.** R16 était resté **ouvert** depuis « sur la tablette ça marche pas, on n'arrive pas
à déplacer », avec deux voies écrites noir sur blanc : *« ajouter le glisser (dnd-kit est au
socle) **ou** rendre le tap-puis-tap évident et reformuler la consigne »*.

La seconde a été prise le 2026-08-07, sur arbitrage du père : « Touche les mots dans l'ordre », et
le mot vole tout seul jusqu'à sa case. Restait un conflit que **Q6** a nommé : les specs v2 § 5
promettent « **faire glisser** des blocs-syllabes », et trois moteurs ne portaient aucun
gestionnaire de glisser.

**Les deux voies ont été prises, et c'est ce qui referme R16.** Le glisser s'AJOUTE, le tap reste
le chemin principal :

```
seuil de glisse    8 px   (repris de `place`, en service depuis L2-C — pas réinventé)
sous 8 px          le geste reste un CLIC, `onClick` part, rien ne change pour l'enfant
au-delà            dnd-kit prend la main, la pastille suit le doigt
```

Aucune coordination fine n'est donc EXIGÉE — c'est la lettre de R16 — et la promesse des specs
est honorée sans qu'il faille les modifier.

**Le dépôt émet exactement la même action que le tap.** `poser` pour `assemble`, `placer` pour
`phrase`, `numeroter` pour `chrono`. Deux gestes, une seule règle : sinon le jeu se comporterait
autrement selon la façon dont l'enfant touche l'écran, ce qui est le pire des deux mondes.

| moteur | avant | après |
|---|---|---|
| `assemble` | gestes manquants : glisser | — |
| `chrono` | gestes manquants : réordonnancement | — |
| `phrase` | gestes manquants : réordonnancement | — |

**Q6 : 11/14 → 14/14.** 421 tests de composants verts : le tap n'a pas été mangé.

### Ce que l'instrument cachait, et qui valait le détour

Q6 a continué de déclarer `assemble` « sans gestionnaire de glisser » **alors que le glisser
fonctionnait**. La cause n'était pas dans le moteur : `sourceDuMoteur()` ne lisait que les
fichiers du dossier `client/src/moteurs/<code>/`, et le glisser vit dans le module partagé
`client/src/moteurs/commun/glisser.tsx`.

**L'instrument récompensait donc le copier-coller de dnd-kit dans chaque moteur et pénalisait la
factorisation** — l'inverse exact de l'axe « moteur × habillage × contenu » qui porte R12 et R13.
Il suit maintenant les imports relatifs, à profondeur 1, et son contrôle positif (« source muette
→ glisser ») reste rouge comme il doit.

Même famille, deux fichiers plus loin : `decor-de-fond.test.ts` énumérait les sous-dossiers de
`client/src/moteurs/` et tenait chacun pour un moteur. Le module partagé a fait virer trois cas au
rouge sur « aucun composant Moteur*.tsx dans commun ». La population vient maintenant de l'union
`CodeMoteur` — la même source que Q6, pour que deux gardes ne comptent pas deux populations. Le
disque reste vérifié **dans l'autre sens** : un dossier non déclaré ne doit porter aucun
`Moteur*.tsx`, sinon c'est un moteur que le sélecteur ne proposera jamais.

> **La leçon, et elle n'est pas propre à ce lot.** Deux gardes ont puni une bonne pratique parce
> que leur population venait du DISQUE et non du code. Un test dont la population est un dossier
> décrit l'organisation des fichiers ; un test dont la population vient d'une union du domaine
> décrit le jeu. Seul le second survit à une refactorisation.
