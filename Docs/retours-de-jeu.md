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
