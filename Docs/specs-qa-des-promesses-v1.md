# Spécification — la QA des promesses (v1)

Ouverte le **2026-08-07**, à la demande du père : *« ta QA n'a pas remonté tous ses problèmes,
donc il y en a sûrement d'autres de pas détectés. Inscris comme tâche prioritaire à faire, un QA ;
fais les analyses et les recherches pour écrire les specs. »*

Ce document n'est pas un plan de tests de plus. Il part d'un constat mesuré — **la QA existante ne
peut pas voir la classe de défauts qui gâche le jeu** —, en établit les modes de défaillance, les
transforme en détecteurs, **les fait tourner**, et spécifie les gardes à écrire à partir de ce
qu'ils ont trouvé.

> **Lot prioritaire Q** de [feuille-de-route-debug.md](feuille-de-route-debug.md). Il **court en
> parallèle** des lots correctifs : il ne corrige rien, il rend visible, donc il ne dispute aucun
> fichier à personne. Seul **Q3 attend A1** — écrire un garde de persistance contre un code qu'on
> va justement réécrire n'aurait aucun sens.

---

## § 0. Le chiffre qui commande cette spec

```
défauts trouvés par le père, en deux sessions de jeu (3 et 7 août)   14
défauts trouvés par la QA, sur les mêmes                              0
cas automatisés à ce jour                                         2 498
```

Ce n'est pas un procès. La QA existante est rapide (174 s), stable, et elle a attrapé de vrais
défauts que personne n'aurait vus — un `INSERT OR IGNORE` qui avalait des compétences, un Leitner
qui sautait trois boîtes, des seuils de couverture creux.

**Le diagnostic est structurel, et il tient en une phrase :**

> La QA existante vérifie que **le code fait ce que le code dit**.
> Les 14 défauts sont tous de la forme : **le code fait exactement ce qu'il dit, et l'enfant ne
> reçoit rien.**

Un `pourcentageColorie` qui passe à 1/12 est juste. Une scène nommée « la luciole qui clignote »
sans luciole est un fichier valide. Une cascade calculée dans le client, affichée, sonnée et jamais
envoyée au serveur ne viole aucune assertion. Un mot de couleur refusé par le panier des couleurs
passe tous les types.

**La QA des promesses mesure l'effet perçu, jamais l'état interne.**

---

## § 1. Les huit modes de défaillance

Chacun est tiré d'un défaut réel. La colonne « signature » est ce qui rend le mode détectable ;
c'est elle qui devient un garde au § 4.

| # | mode de défaillance | signature | défauts qui l'ont révélé |
|---|---|---|---|
| **M1** | **Le chemin déclaré, câblé, jamais parcouru** | une fonction ou un rappel existe, est typé, est testé — et rien en production ne l'appelle | R31 (la cascade), R25→R30 (7 rappels morts) |
| **M2** | **L'énumérant sans émetteur** | un nom de loi survit à la loi ; aucune exécution ne le produit | `objet-campement`, `hesitation` |
| **M3** | **Ce que l'écran annonce n'existe nulle part** | l'affichage et la persistance ne sont jamais confrontés | R31 |
| **M4** | **Le contenu porte un biais que le rendu ne corrige pas** | une régularité statistique du contenu rend l'exercice gagnable sans lire | R14 (`eclair`), R32 (`histoire`) |
| **M5** | **Le geste proposé qui n'aboutit ni ne s'explique** | un élément affiché et tapable produit un refus muet | R33 (78 % des mots), R16, R17 |
| **M6** | **La promesse des specs sans rendu** | les specs nomment un habillage, une mécanique, un geste — l'écran montre autre chose | R36 (`chemin`), et 10 autres moteurs |
| **M7** | **Le réglage qui n'atteint pas ce qu'il règle** | le parent règle, le pixel ne bouge pas là où ça compte | R35 (27 px demandés, 20 px rendus) |
| **M8** | **L'instrument qui ment** | la mesure affiche le bon chiffre en ne mesurant rien | R20 (3 fois), et 4 fois de plus ce jour |

**M8 n'est pas un mode comme les autres : c'est celui qui rend les sept premiers inopérants.** Il a
sa règle au § 5, et elle est non négociable.

---

## § 2. Ce que les détecteurs ont trouvé — l'étude, pas la promesse

Les cinq détecteurs sont dans `scripts/qa/detecteurs-qa-aveugle.mjs`, relançables.
**Chaque chiffre ci-dessous est une sortie de commande, aucun n'est une estimation.**

### 2.1 M1 — 36 fonctions exportées sans aucun appelant de production, dont 4 qui ÉCRIVENT

```
36 fonctions exportées ne sont appelées par aucun autre fichier de production
dont 16 sont pourtant exercées par des tests

── celles qui ÉCRIVENT en base ──
  recalculerLeitner        serveur/src/depots/leitner.ts
  enregistrerFormeGobi     serveur/src/depots/monde.ts
  noterVisitePoint         serveur/src/depots/monde.ts
  ouvrirEssai              serveur/src/depots/reglages.ts
  (+ appliquerTentativeALaCascade, manquée par la sous-règle — limitation nommée au § 2.6)
```

**« Testée » et « atteignable » sont deux propriétés distinctes, et seule la seconde compte pour
l'enfant.** Seize fonctions ont un test qui prouve qu'elles marchent ; aucun ne prouve qu'elles
tournent.

**Confirmation en base réelle** (`donnees/pierre.db`, lecture seule), après 23 exercices joués :

```
ce qui TOURNE                          ce qui ne tourne PAS
  progression_noeud       23             progression_cascade    0
  tentatives              23             formes_gobi            0
  maitrise_competence     12             campement              0
  items_leitner           10             compagnons             0
  progression_region       6             points_visites         0
  ouverture_vue            1             essais_typographie     0
                                         sorties                0
```

**Le noyau pédagogique tourne. C'est toute la couche RÉCOMPENSE ET MONDE qui est débranchée.** Et
`points_visites = 0` est une trouvaille neuve : les **30 points d'interaction du campement**
n'enregistrent rien. L'exigence R11 (« au moins 25 points gratuits ») est vérifiée sur la
*déclaration JSON* par `campement-audit.test.ts`, jamais sur l'usage.

### 2.2 M2 — 0 trouvé, et **le contrôle positif est ROUGE**

```
26 unions littérales examinées · 0 membre orphelin
CONTRÔLE POSITIF · natures de récompense qu'aucun palier n'attribue : 'objet-campement'
D2 les avait-il trouvées ?  *** NON — D2 est AVEUGLE ***
```

**C'est le résultat le plus instructif de l'étude.** `objet-campement` est cité dans
`CascadeRecompense.tsx` et `JaugePalier.tsx` — mais ces deux fichiers le **traduisent** (« un objet
pour le campement »), ils ne le **produisent** pas.

> **Être mentionné n'est pas être émis.** Aucun détecteur textuel ne peut faire cette différence.
> Le garde Q2 doit donc recenser les valeurs **réellement produites à l'exécution** sur le corpus
> entier — c'est le « contrat de couverture » de CLAUDE.md, et il n'y a pas de raccourci.

Sans son contrôle positif, ce détecteur aurait publié « 0 orphelin » et on l'aurait cru.

### 2.3 M4 — le biais de contenu, sur tous les moteurs à choix

```
moteur     cas   bonne réponse en 1re position   mélangée au rendu ?
eclair      34            34  (100 %)                  oui
histoire    32            32  (100 %)              *** NON ***
```

**Deux moteurs portent des choix, un seul mélange.** R14 avait corrigé `eclair` et personne n'avait
étendu la mesure aux autres. Un garde par moteur nommé serait retombé dans le même piège : Q4
recense les moteurs **par l'union `CodeMoteur`**, pas par une liste.

### 2.4 M1-bis — les rappels morts, quatre jours après leur premier recensement

```
29 rappel(s) optionnel(s) déclaré(s) · 7 fourni(s) NULLE PART
  Compagnon.surChoisir · EcranCampement.surOuvrirChaudron · EcranDashboard.surTravailler
  MurDesNoms.surRejouer · PastilleSortie.surRepli · PointLibre.surVisite
  TopConfusions.surTravailler   ← NOUVEAU depuis le recensement du 3 août
```

Le recensement du 3 août comptait **7 morts sur 27**. Le lot R25→R30 en a corrigé un
(`surLancerExercice`) — et il en est **réapparu un autre**. Le compte est resté à 7 pendant que le
dénominateur montait à 29. **Un défaut qu'on corrige sans poser de garde revient.**

### 2.5 M6 — 11 moteurs sur 14 sont une rangée de boutons

Rapproché de la table des specs § 5, ligne à ligne :

```
moteur      rendu                     promesse des specs v2
assemble    rangée de boutons         « faire GLISSER des blocs-syllabes » · ponton · train · perles
attrape     rangée de boutons         « toucher les bonnes cibles MOBILES » · lucioles · poissons
chemin      rangée de boutons         « tracer une route » · nénuphars · pas japonais · lianes
chrono      rangée de boutons         « remettre des vignettes DANS L'ORDRE » · fresque · pellicule
eclair      rangée de boutons         flash d'orage · lueur d'une luciole · éclat de cristal
grave       rangée de boutons         Roc grave la pierre · sable · buée sur une vitre
histoire    rangée de boutons         veillée au feu avec Bulle · théâtre d'ombres
libre       rangée de boutons         le chaudron du campement
paires      rangée de boutons         memory · coquillages · cartes du bestiaire
phrase      rangée de boutons         message porté par Plume · bannière · guirlande
tri         rangée de boutons         paniers de fruits · wagons · grottes
colorie     scène                     recoloration d'une zone
place       scène                     —
trace       scène                     —
```

**Trois de ces écarts ne sont pas esthétiques, ce sont des mécaniques absentes :**

```
$ grep -c "onDrag|onPointer|dnd-kit"  assemble   →  0   or les specs disent « faire glisser »
$ grep -c "animate|translate|rAF"     attrape    →  0   or les specs disent « cibles mobiles »
$ grep -c "onDrag|onPointer|ordre"    chrono     →  0   or les specs disent « remettre dans l'ordre »
```

**`attrape` ne fait bouger aucune cible. `chrono` ne permet de réordonner aucune vignette.** Ces
deux moteurs portent 12 exercices ; ils ne font pas ce que leur nom, leur fiche et leurs specs
annoncent.

### 2.6 Ce que l'étude a coûté en corrections d'instrument — **quatre, en une heure**

À consigner, parce que c'est la moitié de la leçon :

| # | l'instrument disait | il mesurait en réalité | trouvé par |
|---|---|---|---|
| 1 | `tri` a un glisser | les mots `onPointer`, `draggable`, `dnd-kit` **dans le commentaire de R16 qui dit qu'ils sont absents** | relecture de la sortie |
| 2 | la cascade est branchée | `scripts/qa/` — c'est-à-dire **mon propre script de mesure**, écrit une heure plus tôt | contrôle positif |
| 3 | `ecrireProgressionRegion` est morte | la règle ignorait les appels **dans le même fichier** | invraisemblance du résultat |
| 4 | 15 énumérants orphelins | le détecteur ne lisait pas `contenu/` : `presentation`, `developpement`, `retournement` y sont produits 17, 23 et 17 fois | vérification croisée |

Trois de ces quatre erreurs auraient produit un chiffre **faux et plausible**. La deuxième est la
plus instructive : **le détecteur comptait son propre instrument comme un appelant de production.**

---

## § 3. Le périmètre du lot Q

**Dans le périmètre.** Les huit gardes du § 4, leurs contrôles positifs, et leur intégration à
`npm run verifier`.

**Hors périmètre, et volontairement.** Corriger les défauts que les gardes révèlent. Un lot qui
garde *et* corrige ne sait plus lequel des deux a échoué. Les gardes naissent **rouges** ; leur
passage au vert est le travail des lots A, B et C de la feuille de route.

> **Conséquence à assumer d'avance** : à la fin du lot Q, `npm run verifier` sera **rouge**. C'est
> le résultat attendu, pas un échec. Un garde qui naît vert n'a rien gardé.

---

## § 4. Les huit gardes

Chaque garde porte les cinq mêmes rubriques. Aucune n'est facultative.

### Q1 — Tout écrivain d'état est atteignable depuis un geste d'enfant

| | |
|---|---|
| **mesure** | pour chaque fonction qui écrit en base, il existe une chaîne d'appels depuis une route HTTP ou un gestionnaire d'événement du client |
| **population** | **dérivée** : toute fonction dont le corps contient `INSERT`/`UPDATE`/`DELETE`/`.run(` — jamais une liste écrite à la main |
| **contrôle positif** | `enregistrerFormeGobi` doit être signalée aujourd'hui, et cesser de l'être quand A1 la branche |
| **échoue si** | un écrivain n'a aucun appelant, **ou** n'est appelé que depuis `tests/` et `scripts/qa/` |
| **vit dans** | `tests/unitaires/ecrivains-atteignables.test.ts` |

**Exemptions** : une liste nommée, chacune avec la raison et **la scène qui l'éteindrait**. Une
exemption est une dette, pas un pardon — au premier passage de R-couverture, six exemptions sur
huit étaient inutiles.

### Q2 — Chaque énumérant est réellement PRODUIT au moins une fois sur le corpus

| | |
|---|---|
| **mesure** | sur l'exécution de tout le corpus (76 exercices + les 13 écrans), chaque membre de chaque union de causes est **émis** au moins une fois |
| **population** | **dérivée** des unions littérales de `partage/src`, recensées par les fonctions de nom que le compilateur force déjà à être exhaustives |
| **contrôle positif** | `objet-campement` doit être signalé. **Le détecteur textuel de l'étude échoue ce contrôle** : Q2 ne peut donc pas être un `grep`, il doit instrumenter l'exécution |
| **échoue si** | un membre n'est jamais produit et ne figure pas sur la liste d'exemptions nommée |
| **vit dans** | `tests/e2e/couverture-enumerants.spec.ts` + une sonde `window.__test.emissions()` |

C'est le garde qui **ne pourrit pas** : une loi ajoutée demain entre dans le contrat toute seule.

### Q3 — Ce que l'écran annonce comme gagné existe en base

| | |
|---|---|
| **mesure** | après une partie jouée **par le chemin de l'enfant** (profil, carte, nœud, tap), chaque `data-recompense` affiché a sa contrepartie persistée |
| **population** | **dérivée** de `NatureRecompense` : une nature ⇒ une table à interroger |
| **contrôle positif** | une partie **du parent** (`LANCEMENT_PARENT`) ne doit rien écrire — sinon la mesure compare zéro à zéro et passe au vert, ce qui est exactement ce qui est arrivé à R30 |
| **échoue si** | un palier annoncé n'a laissé aucune trace, **ou** si le contrôle positif ne distingue pas les deux cas |
| **vit dans** | `tests/e2e/parcours-recompense-persistee.spec.ts` |

### Q4 — Aucune position de réponse n'est privilégiée, sur AUCUN moteur

| | |
|---|---|
| **mesure** | pour chaque moteur portant des choix, la distribution des positions de la bonne réponse **au rendu** n'est pas concentrée |
| **population** | **dérivée de l'union `CodeMoteur`** — jamais des deux moteurs qu'on connaît. C'est précisément la liste écrite à la main qui a laissé passer R32 après R14 |
| **contrôle positif** | mélange désactivé ⇒ le garde redevient rouge sur 100 % des cas (déjà exécuté pour R14 : 170/170) |
| **échoue si** | plus de 60 % des bonnes réponses tombent au même index, sur au moins 20 cas |
| **vit dans** | `tests/unitaires/melange-des-reponses.test.ts` |

### Q5 — Tout geste proposé aboutit ou s'explique

| | |
|---|---|
| **mesure** | sur chaque écran et chaque nœud, on tape **tout ce qui est tapable** ; un geste qui ne change ni l'état ni le texte affiché est un défaut |
| **population** | **dérivée** : `[role="button"]`, `<button>`, `[data-region-svg][role]` — l'arbre d'accessibilité, plus les prises de jeu explicites |
| **contrôle positif** | un bouton fabriqué sans gestionnaire doit être trouvé ; et le harnais doit émettre `pointerdown/pointerup/click`, pas un `click` synthétique — sinon il relève 33 régions « mortes » qui répondent toutes au doigt |
| **échoue si** | un élément tapable produit un refus **muet** (ni changement d'état, ni `aria-live`) |
| **vit dans** | `tests/e2e/parcours-aucun-geste-mort.spec.ts` |

C'est le garde qui aurait attrapé les 95 mots refusés de R33, et R16 avant lui.

### Q6 — Chaque moteur rend ce que les specs lui promettent

| | |
|---|---|
| **mesure** | la table des 14 moteurs des specs § 5 est confrontée au DOM rendu : mécanique (glisser, mouvement, réordonnancement) et habillage figuratif |
| **population** | **dérivée** de la table markdown des specs — le document fait foi, le test le lit, personne ne recopie |
| **contrôle positif** | `chemin` doit être signalé aujourd'hui (« sauts de nénuphars » vs rangée de boutons) |
| **échoue si** | un moteur dont les specs annoncent un geste ne porte aucun gestionnaire de ce geste, **ou** ne monte aucune scène |
| **vit dans** | `tests/qualite/promesses-des-specs.spec.ts` |

**C'est le garde le plus inhabituel du lot, et le plus rentable** : il transforme un document de
conception en assertion. Il signale aujourd'hui 11 moteurs — c'est sa valeur, pas son échec.

### Q7 — Un réglage de lecture atteint tout ce qui se lit

| | |
|---|---|
| **mesure** | on pose le corps à 16 px puis à 40 px, et **tout texte destiné à l'enfant** change de taille dans le même rapport |
| **population** | **dérivée** : tout nœud de texte visible sous `[data-ecran]`, moins une liste nommée (chiffres de jauge, libellés parent) |
| **contrôle positif** | à 40 px, le garde de mise en page de R20 (89 cas) doit être relancé : aucune cible sous 64 px, aucune commande hors d'atteinte. **Agrandir le texte peut rendre une cible inatteignable, et c'est la règle des 64 px qui gagne** |
| **échoue si** | un texte à déchiffrer garde sa taille quand le réglage change |
| **vit dans** | `tests/qualite/reglages-de-lecture-effectifs.spec.ts` |

### Q8 — Aucun garde ne passe sans avoir prouvé qu'il sait échouer

| | |
|---|---|
| **mesure** | chacun des sept gardes ci-dessus porte au moins un contrôle positif exécuté **à chaque tour**, pas une fois à l'écriture |
| **population** | les sept gardes eux-mêmes |
| **contrôle positif** | le méta-garde est son propre contrôle : on retire un contrôle positif, il doit rougir |
| **échoue si** | un garde n'a pas de contrôle positif, ou son contrôle positif passe au vert |
| **vit dans** | `scripts/qa/controles-positifs.mjs`, appelé par `npm run verifier` |

**Justification chiffrée** : sur les seules mesures de cette session, **quatre instruments sur cinq
ont menti au moins une fois**, et R20 en avait déjà relevé trois. Sans Q8, les sept autres gardes
sont des affirmations.

---

## § 5. Les règles d'écriture d'un garde — non négociables

Elles sont opposables : un garde qui les enfreint n'est pas terminé, il est à refaire.

1. **La population se DÉRIVE du code, jamais d'une liste.** Un écran, un moteur ou un exercice
   ajouté demain entre dans le garde tout seul. C'est la seule forme qui ne pourrit pas — et c'est
   la liste écrite à la main qui a laissé R32 vivre après R14.
2. **Auditer les OBJETS, pas les occurrences.** « Combien de fois le mot apparaît » ne répond
   jamais à « combien d'objets devraient le porter ». Un défaut C++, un héritage, un implicite de
   schéma sont des occurrences qu'aucune recherche textuelle ne trouve.
3. **Contrôle positif obligatoire, exécuté à chaque tour** (Q8). Et **quand la définition d'un
   grief change, on redemande au contrôle de prouver qu'il sait échouer** : une mesure dont on
   modifie la définition sans ça est une mesure qu'on vient de perdre.
4. **Le garde naît ROUGE.** On le voit échouer sur le défaut réel avant de corriger quoi que ce
   soit. Un banc qui naît vert n'a rien gardé.
5. **On mesure l'effet perçu, pas l'état interne.** « `pourcentageColorie` vaut 1/12 » n'est pas
   une preuve que quelque chose s'est rallumé ; « la part de territoire découverte a augmenté »
   en est une.
6. **On passe par le chemin de l'enfant.** Aucun garde n'injecte les rappels dont il a besoin :
   c'est exactement ce qui a rendu les 7 boutons morts invisibles à 372 recettes E2E.
7. **Aucune attente de durée.** On attend un état, jamais un délai.
8. **Une sonde n'écrit jamais dans les données du joueur.** Base jetable, toujours — six profils
   « Mesure » ont été écrits dans la vraie base le 3 août.
9. **L'outillage de QA n'est pas de la production.** `tests/` et `scripts/qa/` sont exclus de tout
   recensement d'atteignabilité — sans quoi le détecteur se compte lui-même (erreur n° 2 du § 2.6).
10. **Les commentaires sont retirés avant toute recherche textuelle.** Ils citent souvent
    précisément ce qui est absent (erreur n° 1 du § 2.6).

---

## § 6. Dimensionnement et ordre

| garde | dépend de | effort | ce qu'il signale aujourd'hui |
|---|---|---|---|
| **Q8** | rien | faible | — (il est le socle) |
| **Q1** | Q8 | faible | 4 écrivains sans appelant |
| **Q4** | Q8 | faible | `histoire`, 32/32 |
| **Q6** | Q8 | moyen | 11 moteurs sur 14 |
| **Q5** | Q8 | moyen | 95 mots refusés sur 122 |
| **Q7** | Q8, R20 | moyen | 11 moteurs à 20 px en dur |
| **Q3** | Q8, **A1** | élevé | toute la couche récompense |
| **Q2** | Q8, sonde d'émissions | élevé | inconnu — c'est son intérêt |

**Ordre retenu** : **Q8 d'abord** (sans lui les sept autres sont des affirmations), puis Q1 · Q4 en
parallèle (fichiers disjoints, effort faible, signalement immédiat), puis Q6 · Q5 · Q7, et enfin
Q3 · Q2 qui demandent respectivement A1 et une sonde d'émissions.

**Définition de « terminé » pour ce lot**, au sens de l'annexe T § 6 :

- les huit gardes existent, sont branchés à `npm run verifier` ;
- chacun a été **vu rouge** sur le défaut qui l'a inspiré, et la sortie est citée dans le rapport ;
- chaque exemption est nommée, avec la scène qui l'éteindrait ;
- `tests/rapports/RAPPORT.md` distingue les échecs **connus et chiffrés** (la dette) des échecs
  **neufs** — sans quoi un lot Q rouge devient un rouge permanent qu'on cesse de lire.

---

## § 7. Ce que cette QA ne couvrira pas, et il faut le dire

1. **Le jugement esthétique.** Il appartient au parent (D50). Q6 vérifie qu'une scène est montée,
   jamais qu'elle est belle. C'est la « visite des écrans » (lot V1) qui sert ce jugement-là.
2. **La justesse pédagogique d'un exercice.** Qu'un mot soit au bon niveau CE1 relève de la
   couverture lexicale, pas de ces gardes.
3. **Le plaisir.** Aucun test ne dit si l'enfant a envie de recommencer. **C'est pour ça que la
   session de jeu réel reste la première étape de toute campagne, et non la dernière** : elle a
   trouvé 14 défauts quand 2 498 cas en trouvaient 0.

> **La leçon d'ensemble.** Ces huit gardes n'auraient pas trouvé les 14 défauts *à la place* du
> père. Ils les auraient trouvés **le jour de leur livraison**, c'est-à-dire des semaines avant
> qu'un enfant de 7 ans ne se heurte à un mot de couleur refusé par le panier des couleurs.
