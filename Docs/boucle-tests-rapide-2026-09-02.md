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
