# Boucle de tests rapide — 2 septembre 2026

## Décision

La chaîne `npm run verifier` reste la preuve de finition avant un commit ou une livraison, mais
elle n’est plus relancée après chaque petite retouche visuelle. Sur la machine mesurée, elle prend
environ six minutes à quatre travailleurs et peut dépasser vingt minutes avec un parallélisme mal
adapté.

Pendant l’itération, on exécute seulement le test du composant ou de la route touchée, accompagné
du contrôle de contenu si un JSON ou un asset change. Exemples réellement employés :

```powershell
npx vitest run tests/composants/MoteurPlace.test.tsx
npx vitest run tests/api/recuperation-code-parent.test.ts
npm run test:contenu
```

Une capture navigateur ciblée complète cette boucle lorsqu’un rendu change. La chaîne entière est
relancée une seule fois quand le lot est prêt à être committé.

Pour une régression de mise en page vue sur un appareil réel, la reproduction doit croiser le
viewport CSS utile, l’orientation **et les réglages de lecture enregistrés pour le profil**. Le
cas du 4 septembre a démontré la différence : la matrice à corps 24 px restait verte, tandis que
la Galaxy Tab avec `corpsPx=27` et `interligne=2` tassait les phrases de `chrono` dans trois
colonnes de 240 px et réservait des cases vides de près de 400 px de haut.

La boucle courte est désormais :

```powershell
node scripts/playwright.mjs test --project=responsive --no-deps --grep "photo tablette"
npm run test:responsive
```

Le premier cas mesure la composition sémantique du récit (largeur des cartes, hauteur de la frise,
absence de recouvrement). Le second rejoue la même garde sur toutes les recettes et quatre formats.
Le 4 septembre, ce second étage a trouvé trois récits encore superposés en paysage, puis deux sur
petit téléphone : preuve observée que la garde sait échouer au-delà de la capture initiale.

Deux autres photos du même appareil ont ajouté un point de matrice indispensable : `800 × 1100`
CSS avec les mêmes réglages de lecture. Elles ont fait rougir deux nouveaux cas avant correction :
les douze mots de `tri` partageaient une ligne et se superposaient ; le statut de `eclair` héritait
de l'interligne pédagogique et mangeait le décor. La sonde générique vérifie maintenant ces
propriétés sur toutes les recettes qui montent ces moteurs, tandis que les cas photo gardent la
combinaison exacte appareil + profil.

La visite de toutes les recettes ne remplace pas une vérification de composition par type de jeu.
La campagne porte donc maintenant une table `SONDES_PAR_MOTEUR` comparée automatiquement à
`CodeMoteur` : **14 moteurs déclarés, 14 sondes et 14 nœuds représentatifs**. Chaque sonde nomme
les plateaux structurants qui doivent exister, être visibles au premier écran et rester dans la
largeur du moteur à `800 × 1100`, corps 27 et interligne 2. Les deux usages du décor de l'école ont
en plus leur régression dédiée : `clairiere-01` (`colorie`) et `clairiere-04` (`place`). La matrice
complète compte désormais 45 cas et passe en 2 min 18 s à quatre travailleurs.

Le même lot a plafonné Vitest à quatre ouvriers. Sans plafond, la couverture V8 lançait assez de
processus pour affamer SQLite et le canal RPC (`Timeout calling onTaskUpdate`) : 28 faux échecs par
dépassement de délai. Avec le plafond, les **2 422 tests** unitaires, composants et API passent en
90,81 s. Ce plafond ne change ni assertion ni délai ; il retire seulement la contention qui
empêchait les assertions de rendre leur verdict.

Une navigation réussie ne signifie pas encore que le moteur a fini sa première mise en page. La
campagne des 75 nœuds a mesuré une fois le cadre de repli `900 × 1000` de `tri`, alors que la capture
prise juste après montrait déjà sa géométrie finale. Le contrat de préparation impose donc désormais
trois états observables avant toute mesure : le `data-noeud` exact, `data-test-pret="oui"` remis à
zéro à chaque paquet, puis une géométrie inchangée sur trois images du navigateur. Ce n'est pas une
attente en millisecondes. Après ce correctif, les 150 écrans de la campagne (75 nœuds × 2 vues)
passent en 51,9 s sans confondre chargement et défaut responsive.

La photo suivante a montré pourquoi « les pièces sont visibles » n'est pas encore une preuve de
composition. Sur `place`, le cartouche existait, la scène existait et la cible du toit existait,
mais le premier flottait devant la troisième. La garde dédiée joue maintenant les trois étapes et
mesure l'intersection du cartouche avec `ciel`, `a-cote-du-banc` puis `toit-ecole`. Sur `chemin`,
elle mesure la largeur et la hauteur du panneau, le début du plateau et les intersections entre
cases. Ces gardes ont un contrôle négatif conservé au rapport de tâche : retour aux positions
absolues historiques → **2 recettes rouges sur 2**. Le branchement des quatre compagnons a subi le
même contrôle : forcer `compagnon={null}` → **4 cas rouges sur 4**.

Ce passage a également révélé deux défauts collatéraux que la suite refuse désormais de taire : la
mise à l'échelle de la carte ramenait les prises de région de 92 unités SVG à 60 px CSS sur la
tablette, et une règle CSS moins spécifique laissait le conteneur de `place` haut de 0 px sur
téléphone. Le rayon utile est maintenant calculé pour rester au-dessus de 64 px dans ce cadre ; la
scène téléphone reprend explicitement la priorité CSS et conserve ses 400 px défilables.

Le coloriage du tapis a ajouté un autre principe : vérifier un centroïde contre une boîte écrite
dans le test ne prouve pas que l'objet existe dans le PNG. La boucle courte croise maintenant trois
preuves : la consigne et la région concordent, le centroïde tombe dans le tracé, puis une fenêtre de
pixels autour de chaque petite cible présente assez de contraste local pour matérialiser un motif.
Une recette Chromium joue ensuite les sept étapes par de vrais taps à `800 × 1100`. Avec l'ancien
« gland du centre » absent du décor, les trois contrôles du tapis rougissaient ; après remappage sur
le centre uni et les six feuilles de la bordure, ils passent, ainsi que la sortie complète.

Cette sortie complète a aussi découvert une course que les cas isolés ne pouvaient pas produire :
une réponse de journalisation du nœud précédent pouvait revenir après le démarrage du suivant et
poser son drapeau global `tentativeEnvoyee`. La récompense suivante n'envoyait alors rien. Le test
de composant retient volontairement la première réponse, démarre logiquement une nouvelle tentative
puis la libère ; la campagne des 75 nœuds vérifie ensuite que toutes les récompenses sont réellement
portées par le serveur.

## Parallélisme de la recette navigateur

Dix travailleurs ont produit `ERR_NO_BUFFER_SPACE` sur Windows. Un seul travailleur a évité la
saturation mais a rendu faux le contrat de couverture globale, qui attend 88 recettes parallèles
et expire après 270 secondes. Une campagne à six travailleurs a reproduit l’épuisement des sockets
après 318 cas le 4 septembre 2026 ; les quatre échecs ont tous repassé isolément, 8/8. Quatre
travailleurs constituent donc le plafond prudent pour ce dépôt :

```powershell
$env:PIERRE_TRAVAILLEURS='4'
npm run verifier
```

Le run du 2 septembre 2026 à six travailleurs avait terminé ses 12 étapes sans échec en 378,8
secondes, avant l’ajout des décors raster et l’augmentation de la campagne.

## Agrégation de la couverture sans quatrième parcours

Le 4 septembre 2026, les 521 scénarios E2E ont montré un autre coût artificiel : après que trois
familles avaient déjà atteint et éprouvé chacune des 89 recettes d’écran, le contrat final les
rejouait toutes une quatrième fois dans un unique test. Ce test monolithique a dépassé son
garde-fou de 270 secondes au milieu de la recette parent, puis a présenté les 80 recettes restantes
comme fermées avec le navigateur.

Le contrat final agrège désormais les destinations de `recettesDEcrans()` après leur validation
réelle par le projet `parcours`, dont le projet `couverture` dépend explicitement. Il continue de
comparer cet ensemble aux `data-ecran` dérivés du code et de refuser tout écran orphelin. Aucune
assertion fonctionnelle n’est retirée : une recette qui n’atteint pas son écran échoue dans la
campagne préalable ; seul son quatrième rejeu identique disparaît.

La même campagne a révélé qu’un client de test dont le bundle ne se chargeait pas laissait
`page.waitForFunction(window.__test)` hériter du plafond de 270 secondes de `test.slow()`. Le
crochet apparaît normalement dès l’évaluation du bundle ; cette attente porte désormais son propre
garde-fou de 10 secondes. Un incident de navigateur reste rouge, mais ne monopolise plus un
travailleur pendant quatre minutes et demie avant de le dire.

## Ajout du 9 octobre 2026 — trois paliers

Détail et mesures : [retravail des tests après le socle](rework-tests-socle-2026-10-09.md), § 6.

| Palier | Commande | Quand | Contenu |
|---|---|---|---|
| rapide | `npm run verifier:rapide` (ou `-- <fichiers>`) | pendant le développement | lint des fichiers touchés, `tsc -b`, `test:contenu`, Vitest des tests qui portent le nom du fichier touché (`related` pour la logique de `partage` et `serveur`), garde du socle pour les moteurs touchés (entière si le socle ou un style commun change), specs Playwright modifiées |
| verifier | `npm run verifier` | avant un push (crochet `pre-push`) | toute la chaîne, sans couverture ; les balayages exhaustifs prennent un nœud par moteur, différent à chaque campagne (`PIERRE_PALIER=verifier`, `PIERRE_ROTATION`) |
| complet | `npm run verifier:complet` | avant une publication, ou la nuit | tous les nœuds, tous les lots, couverture par zone (annexe T § 7) |

Règles :

- **Rien n'est retiré.** Ce que le palier `verifier` échantillonne tourne en entier au palier
  `complet`. La garde `tests/qualite/socle-activite.spec.ts` (tous les nœuds × 7 formats)
  tourne à chaque palier `verifier` : c'est elle qui garde la mise en page de chaque nœud
  pendant que les suites par moteur sont échantillonnées.
- **Construction figée.** `verifier` sert `tests/rapports/client-fige/` (`PIERRE_CLIENT_TEST`).
  Un autre écrivain peut donc relancer des tests ciblés, qui reconstruisent
  `client/dist-test/`, sans polluer la campagne.
- **Machine partagée.** Playwright tourne à 2 à 4 travailleurs au plus
  (`npm run verifier -- --travailleurs=N`, 4 par défaut), et e2e, visuel et qualité passent
  l'un après l'autre.
- **Mesures.** Le palier rapide prend 9,2 s pour un moteur touché, et 42 à 49 s quand le socle
  et la logique le sont. Pour `verifier` au plafond de 4 travailleurs, l'estimation est de
  9 à 10 min. Les deux campagnes mesurées à 8 travailleurs (320 et 334 s) l'ont été sous la
  charge d'autres projets : elles sont à refaire sur machine calme. L'objectif de 5 min n'est
  pas atteint ; les pistes sont au § 6.3 du document cité.

## Ajout du 30 octobre — un rouge du palier rapide sous charge se relance isolé

`verifier:rapide` lance la garde du socle et les specs touchées **en parallèle**, 4 travailleurs
chacune. Sous `PIERRE_FILS=6`, machine occupée, la garde a pris 4,6 min (57 s le 9 oct.) et
7 cas sont tombés en délai dépassé ; relancés seuls (`--workers=2` ou `3`, même client figé
`PIERRE_CLIENT_TEST=tests/rapports/client-fige-rapide`), tous verts. Commande :
`node scripts/playwright.mjs test <spec> --project=parcours --no-deps --workers=2 --reporter=line`.
Détail : [nettoyage du 30 octobre](nettoyage-socle-2026-10-30.md) § 3.
