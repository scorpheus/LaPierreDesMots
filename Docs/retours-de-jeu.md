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

## R3. Fin d'exercice : aucun chemin vers l'exercice suivant — **ouvert**

« quand l'exercice est fini, il y a soit rejoué ou retour a la carte ? il n'y a pas d'autres
exercice dans la clairiere ? »

**Mesuré** : `ls contenu/noeuds/ | grep -c clairiere` → **12**. La carte l'affiche même
(« Étape 1 sur 12 »). Mais `client/src/ecrans/EcranRecompense.tsx` n'offre que **Rejouer** et
**Retour à la carte** : rien ne mène au nœud suivant.

**Et derrière, une falaise plus large, déjà mesurée et non tranchée** (S3-Q2) : le sélecteur exige
que **toutes** les compétences d'un nœud soient éligibles (`selecteur.ts`,
`competences.every(competenceEligible)`). Un exercice précoce qui déclare une compétence avancée en
secondaire se ferme lui-même. Mesuré sur 500 graines : **2 régions sur 6 répondent**, et **10 nœuds
sur 76 au mieux** sont atteignables pour un profil neuf.

**À faire** : un bouton « exercice suivant » sur l'écran de récompense, et l'arbitrage de S3-Q2.
Les deux sont nécessaires — le bouton seul mènerait vite à un cul-de-sac.

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
