# Paires : tout le plateau sur tablette — 6 septembre 2026

## Mandat actuel

Le parent refuse la grille géante, même défilable : toutes les paires doivent tenir dans
la page tablette. Le défilement du lot précédent reste un filet pour les petits téléphones
et les agrandissements extrêmes, pas le critère de réussite sur tablette.
Serveur vérifié au départ : PID 5544, build `index-DRWzcVGh.js`, livré le 5 septembre à 19 h 40.
Le problème est donc la composition livrée, pas un redémarrage oublié.

Base `1d5a637`, arbre déjà modifié conservé. Mesure : partage 141, client 149, serveur 25
sources ; 273 tests ; 11 migrations ; 76 exercices et 76 nœuds.

## Périmètre et responsabilités

- Orchestrateur : composant Paires, composition géométrique associée, CSS limité à cet écran,
  tests et livraison locale. Seul compilateur/lanceur, aucun changement du contenu ou du journal.
- Sous-agent : proposition de disposition en lecture seule, sans tests, compilation ni écriture.
- Aucun autre moteur, asset, texte d'exercice, profil familial, référence de test, GitHub ou APK.

## Critères

Les huit fiches, dont les seize cartes à phrases longues de la Cité, doivent présenter
chaque carte entièrement dans le viewport utile : 800×1100 et 720×1017 en portrait,
1100×700 et 1017×640 en paysage, puis grand écran. Compagnon et retour restent visibles.
Images décodées, texte non tronqué, cibles >= 64 px, mélange stable, bonnes et mauvaises
paires jouables. Le choix se fait d'après largeur ET hauteur utile, pas le nom de l'appareil.

Réduire les marges, supprimer la consigne doublonnée, agrandir les vignettes dans leurs cadres.
Conserver la police du profil ; ajuster la composition avant toute réduction du corps de lecture.
Pas de pagination cachant la moitié des paires ni de suppression des paires acquises.
Sur les formats physiquement insuffisants, conserver le vrai balayage natif et des caractères lisibles.

Tests : rouge de cadrage sur le cas photographié, mesures de texte et de prises sur la famille,
rotation et sélection sans déplacement des cartes, tests natifs précédents conservés, puis
`npm run verifier` une fois à la clôture. Les autres dettes restent dans la file courante.

## Implantation et preuves ciblées

Grille CSS intrinsèque : deux colonnes de phrases et deux colonnes étroites d'images sur
tablette ; quatre colonnes égales pour les paires uniquement textuelles. Chaque sous-liste
conserve son mélange initial, sans consulter l'identifiant de paire. Aucune carte acquise
ne disparaît. Les bordures remplacent la graisse de sélection, qui faisait changer les lignes.
La grande carte glissée désigne désormais la cible sous le pointeur, pas celle dont le
rectangle recoupe le plus sa surface (défaut trouvé par le test souris après recomposition).

Le test de cadrage a d'abord rougi avec huit cartes et l'aide sous l'écran en 800×1100.
Les 32 cas de cadrage passent ensuite : huit fiches, quatre formats, véritable en-tête de
sortie, Andika 27 px/interligne 2 conservés, images décodées, toutes les cartes et commandes
dans le viewport, aucun scroll, tap puis appariement et rotation sans perte ni déplacement.
La fixture remplace seulement le nœud du plan retourné par l'API ; elle ne modifie pas le DOM.

Deux attentes anciennes sont remplacées, car elles imposaient précisément le design refusé :
les tests géométriques exigeaient une hauteur supérieure à l'écran ; le test du cartouche
exigeait la répétition de « Trouve les paires. ». Les nouveaux contrôles exigent au contraire
le plateau entier et une seule consigne, présente dans l'en-tête. Aucun scénario de jeu,
seuil tactile, taille de lecture ni contrôle de défilement natif n'est assoupli.

Artefacts : `bac-a-sable/paires-plein-ecran-2026-09-06/`, dont `cadrage-rouge.json`,
`cadrage-sortie.json`, captures des quatre formats et `glisser.json` (6/6 : souris/tactile × 3).
La dernière campagne globale et la preuve de serveur seront consignées après leur exécution.

Revue croisée finale, sans écriture ni exécution concurrente : pas de fuite CSS vers les autres
moteurs ni de tri par réponse détectés. Un geste supplémentaire est à couvrir avant clôture :
glisser une carte neuve sur une carte déjà acquise. Cette dernière ne doit plus être une cible
de dépôt, et le geste ne doit ni effacer la sélection ni émettre un refus. Le correctif sera
intégré après la campagne en cours, pour ne pas modifier les sources d'une mesure active.

## Vérification générale et contre-vérifications

`npm run verifier` exécuté entièrement en **717,3 s**, rapport complet archivé avant les
contre-vérifications (`RAPPORT-complet.md`, `e2e-complet.json`, `qualite-complet.json`).
Résultat non entièrement vert, conservé sans modifier les références :

- 2660/2661 tests unitaires/composants/API ; seule vignette de chronologie Volcan non approuvée.
- 14 incohérences textuelles déjà dans la file ; validation structurelle du contenu verte.
- E2E : 850 passés, 2 rouges, 14 bilans non exécutés. Les 32 nouveaux cadrages passent.
  Un rouge glisser tactile et un rouge Cassecou (une étoile attendue, deux reçues sans demande
  explicite d'aide, après la correction Colorie du lot précédent). Barème et test
  Cassecou ne sont pas changés dans ce lot de présentation ; rapprochement explicite à faire.
- Qualité : 246 passés, un défaut de chargement du crochet sur Clairière-02, 73 dépendants
  non exécutés. **Ce n'est pas 319/320 verts.** Clairière-02 repasse ensuite 3/3 isolément ;
  l'instabilité de chargement en campagne n'est pas déclarée résolue.
- Trois divergences de captures Colorie, références inchangées ; rejeu, lint, types verts.
  Le budget de bundle n'avait pas été exécuté après le rouge Qualité ; il est relancé à part.

Après cette campagne, deux nouveaux rouges sont reproduits : débordement horizontal de la
carte glissée et dépôt sur carte acquise. Correction : contenir le dessin de la carte dans
la largeur utile (la collision reste sous le doigt), désactiver les cibles déjà acquises.
**20/20** cas répétés cinq fois, puis **78/78 en 34,3 s**, et **78/78 en 34,8 s** par la nouvelle
commande `npm run test:paires`. Aucun affaiblissement du test de glisser intermittent.
Unitaires ciblés **17/17**, lint ciblé et types verts après ces derniers ajustements.

La commande ciblée est ajoutée à `package.json` : c'est une vérification de cette famille,
pas un remplacement de la recette générale. Le skill QA documente les deux critères distincts
(plateau entier / défilement) et le piège des fixtures retirées par la préparation du profil.

## Livraison locale finale

Les **73/73** contrôles dépendants (responsive et latence) sont finalement exécutés et verts,
en 2,2 min, après le démarrage isolé Clairière-02 vert. Ils ne remplacent pas rétroactivement
le rapport complet rouge. Budget revérifié séparément : **11/11**, charge initiale
**239,7 Ko gzip / 250 Ko**, sans crochet de test livré.

Dernière construction et relance après les correctifs de dépôt : lanceur **47948**, serveur
**69688**, écoute `0.0.0.0:8080`. HTML/JS/CSS et quatre portraits comparés aux fichiers locaux.
JS `index-Cbbgf2Fy.js`, SHA-256
`b77425c3ff00da9040629a26085479cb8723051cdaf65da2391a4481a3f717bd` ; CSS `style-Dq9MdKgK.css`.
Preuve `serveur-final-verifie.json`. Aucune progression familiale effacée ni publication externe.
Recharger **http://192.168.1.19:8080/** sur la tablette.

Restent dans la file : cohérence des contenus, vignette Volcan et références à arbitrer,
rapprochement du scénario Cassecou avec la distinction aide proposée/demandée, et instabilité
de chargement en campagne. Pas de déclaration « tout le projet est vert » ni de commit
global mélangeant les changements antérieurs de l'arbre de travail.
