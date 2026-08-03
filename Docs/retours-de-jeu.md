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

## R20. Tout devrait tenir sur un écran, sans défilement — **ouvert**

« sur une tablette il y a largement de la place et il y a besoin de scroller alors qu'il n'y a pas
besoin, et clairement c'est pas bien placé. »

Cible : Galaxy Tab S10 FE, 1920 × 1200. Un enfant de 7 ans qui doit faire défiler pour trouver le
bouton perd le fil de l'exercice. Refonte de mise en page à faire écran par écran, avec une
recette qui MESURE l'absence de défilement à cette résolution — sans quoi elle reviendra.

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
