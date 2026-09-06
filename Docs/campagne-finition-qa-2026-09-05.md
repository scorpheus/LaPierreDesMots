# Campagne de finition et de qualification — 5 septembre 2026

## Mandat et point de départ

Le parent demande de terminer les travaux réalisables sans son intervention, de reprendre la QA
et de vérifier les exercices, leur logique, leur lisibilité CE1 et le responsive. Ses retours
successifs s'ajoutent à cette file ; ils ne remplacent pas les engagements antérieurs.

Départ : `1d5a637`, portraits canoniques validés publiés. L'arbre suivi est propre ; les pièces
jointes `.codex-remote-attachments/` sont celles du parent, à préserver hors commits.
Inventaire remesuré : 146 sources client, 140 sources partage, 25 sources serveur, 248 fichiers
de tests, 11 migrations, 76 exercices et 76 nœuds. Les chiffres initiaux d'AGENTS.md sont historiques.

## Lots et propriété des fichiers

1. **Pédagogie et données** : sous-agent dédié, lecture des 76 exercices et des règles des moteurs.
   Écrit uniquement `Docs/audit-pedagogique-2026-09-05.md`,
   `scripts/qa/auditer-coherence-exercices.mjs` et son test unitaire dédié.
   Aucun changement direct aux exercices publiés ; transmettre les corrections exactes proposées.
   Après livraison de l'audit, lot de correction distinct : propriété de
   `client/src/moteurs/attrape/MoteurAttrape.tsx` et `client/src/moteurs/grave/MoteurGrave.tsx`,
   tests unitaires/composants dédiés et rapport. Corriger les prises masquées reproduites,
   réserver le cartouche hors du jeu et permettre un flux vertical quand le cadre manque de place.
2. **Responsive** : sous-agent dédié, audit des sondes existantes et corrections reproductibles.
   Écrit uniquement un nouveau test `tests/qualite/composition-exercices.spec.ts`, ses aides
   propres et `Docs/audit-composition-2026-09-05.md`. Signaler au principal les corrections
   applicatives nécessaires ; aucun build ni campagne navigateur globale.
   Extension après livraison du premier audit : propriété exclusive de
   `client/src/moteurs/paires/MoteurPaires.tsx` et
   `client/src/moteurs/chemin/MoteurChemin.tsx` pour corriger les collisions reproduites par la
   campagne tactile. Tests de composants dédiés autorisés ; les styles et aides partagés restent
   propriété du principal.
3. **Animations canoniques** : sous-agent dédié, quatre nouvelles planches dérivées des portraits
   approuvés. Écrit uniquement dans `contenu/brouillons/sprites-compagnons-2026-09-05/`,
   `bac-a-sable/sprites-compagnons-2026-09-05/` et `Docs/animations-canoniques-2026-09-05.md`.
   Utilise le générateur intégré et le normaliseur existant, sans changer les portraits publiés,
   les verrous ou le composant. Présentation au parent avant publication des nouveaux pixels.
   Après livraison : audit et correction ciblée des deux rendus de coloriage, propriété de
   `client/src/moteurs/libre/SceneRasterIndexee.tsx`, `client/src/moteurs/colorie/` et tests dédiés.
   Conserver les pixels validés ; corriger les prises réelles et la détection depuis les masques.
4. **Principal** : application, infrastructure QA, intégration, livraison
   locale et préparation des livrables. Seul écrivain des fichiers applicatifs et des scripts
   partagés, seul responsable des builds et de la campagne finale.

Chaque sous-agent lit AGENTS.md, les présentes limites et les documents utiles au lot. Aucun
agent ne compile, n'installe ni ne modifie les références visuelles/de rejeu. Rapports en français,
preuves avec chemins et cas exacts ; pas de « tout validé » à partir d'un simple inventaire.

## Critères de validation et file cumulative

- Chaque moteur a une sonde de composition ; l'ajout d'un moteur sans sonde échoue.
- Attendre le bon exercice, les polices, images et une géométrie stable avant toute mesure.
- Viewports CSS utiles téléphone/tablette/PC, portrait/paysage et changements en cours de partie ;
  prendre en compte les réglages de lecture, pas seulement la largeur physique d'une capture.
- Mesurer les superpositions, les prises tactiles, le texte coupé et les sous-scrolls gênants.
  Interagir par les prises réelles ; ne pas confondre `__test.repondre` et une preuve de jouabilité.
- Tri et paires : toute bonne réponse disponible est acceptée indépendamment de l'ordre.
  Chemins : départ, voisinage et progression visibles. Coloriages : cible réellement dessinée,
  accessible et recolorée. Chronologies : continuité narrative des triplets approuvés.
- Règle permanente et cible variable distinctes ; aides pertinentes ; compagnon choisi conservé.
- Récompenses, région terminée, déblocages, cadeaux du campement et coffre cohérents.
- Les quatre nouveaux portraits ne constituent pas des sprites animés : refaire les animations
  à partir de la référence approuvée sans réintroduire les anciens personnages.
- Vérifier les fichiers embarqués, audio existant, préparation PWA et état Android. Ne pas
  annoncer que la version publique est à jour sur la seule base du serveur local.
- Prouver les nouveaux gardes avec des défauts injectés et des contrôles sains. Ne pas lancer
  le banc qui modifie les sources pendant qu'un autre écrivain travaille sur ses fichiers.
- À la clôture : `npm run verifier`, lecture du rapport, état courant actualisé, commits courts
  en français avec périmètre en préfixe. Nommer les limites et les décisions parent restantes.

## Avancement

- Reprise et inventaire : faits.
- Audits et corrections : intégration technique mesurée ci-dessous ; clôture suspendue aux
  validations de contenu et d'images. Le retour du parent sur le tapis rouvre sa recette
  pédagogique malgré la réussite de son parcours tactile.

### Défauts réellement reproduits et corrections intégrées

| Défaut | Correction | Preuve dédiée |
|---|---|---|
| Mot ou carte couverts par un voisin après rotation | Grilles intrinsèques pour `tri`, `paires`, `chemin` et `attrape`, hauteur réellement réservée | Parcours tactiles exhaustifs + composition |
| Cartons ou construction sur le décor/à gauche, question ramenée à 16 px | Flux séparé et centré dans `histoire`, `phrase`, `grave` | Tests composants, mesure réelle 27 px/54 px |
| Taille des images « Attrape » dérivée de leur propre hauteur de grille | Raster calculé depuis la largeur disponible seulement | Sonde de stabilité rouge avant, verte après |
| Cercles invisibles pris pour des zones peintes | Le toucher suit le vrai path SVG ou le masque Canvas prêt ; cercle réservé au clavier | Parcours des six coloriages et du chaudron |
| Toucher SVG reçu par la racine plutôt que le banc/une porte | Relecture du pixel exact sous le doigt, limitée au même SVG ; pas de proximité circulaire | Nouveau cas composant rouge puis vert + école tactile |
| Dernier appui sur le tapis activant « encore une fois » sur la récompense | Protection du clic entre deux écrans, sans délai ni gêne du clavier | Cas unitaire + parcours jusqu'à récompense persistée |
| Zone de placement trop petite, puis gigantesque quand le SVG était écrasé en hauteur | Taille CSS des prises + dessin à rapport préservé, sans contraction à zéro | Placement téléphone/tablette après rotation |
| Cartouche de placement encore devant le ciel en paysage large | Vraie case de grille hors scène/réserve | Intersection des boîtes explicitement refusée |
| Captures laissées en bas par le testeur | Restauration des défilements après sonde ; mesure avant capture | Contrôle positif de défilement |
| Contrôle négatif du pilote absorbant tout le délai du cas | Chaque tap natif doit devenir atteignable en 5 s | Prise couverte refusée puis saine acceptée |

### Mesures intermédiaires conservées

- Avant ces corrections, la recette tactile initiale rendait 127 réussites et 27 échecs.
- Passe combinée suivante : 175/177, avec un placement téléphone réellement bloqué et un
  contrôle négatif trop long. Rapport conservé sous
  `bac-a-sable/qa-finition-2026-09-05/tactile-composition-175-sur-177.json`.
- Après les deux corrections, reprise ciblée : 5/5 (placement tablette, téléphone, composition
  placement, composition chemin et contrôle du pilote).
- `npm run verifier` a ensuite été exécuté sans campagne parallèle. Son rapport historique
  conserve les échecs constatés à cette passe ; les reprises ci-dessous ne le repeignent pas.

### Dernières mesures du lot

| Porte | Résultat observé | Limite / preuve conservée |
|---|---|---|
| Vérification globale | 898 s, rouge | `tests/rapports/RAPPORT.md`, 08:59 UTC : contenu non approuvé et ancien import du harnais ; pas une clôture verte |
| E2E complet après correctifs | **679/679**, 7,6 min | `e2e-final.json`, dont 76 × 2 parcours tactiles natifs avec rotation |
| Placement/coloriage après réécriture des URL internes | **14/14**, 9,9 s | `placement-coloriage-final.json` |
| Unitaires/composants/API | **2475/2476** | `unitaires-final.json` ; rouge uniquement sur « mouche » au lieu d'« abeille » |
| Composition et matrice | **24/24** + **89 recettes × 4 formats** | Passe combinée `tactile-et-responsive-consolides.json` ; ses deux anciens rouges tactiles sont corrigés dans la passe E2E finale |
| Lint / TypeScript | 0 erreur / vert | 18 avertissements ESLint préexistants, `lint-final.log` et `typescript-final.log` |
| Tests trompeurs | 0 bloquant, 93 avertissements | Plafond inchangé à 93, pas de test désactivé |
| Bundle | **11/11** | 236,2 Ko gzip, budget 250 Ko |
| Ressources | 6 polices, 673 clips | Prévol commun aux builds, 216 anciens clips archivés de façon réversible |
| Recette PWA locale | Verte | Jeu tactile, hors ligne avec audio, mise à jour sans perte, fermeture, export/import et onglet concurrent |
| APK autonome | Construite, recette émulateur verte | Placement et tri hors réseau ; relance après commit, pas une preuve d'arrêt forcé pendant la transaction |

Les fichiers de preuve non qualifiés sont sous `bac-a-sable/qa-finition-2026-09-05/`.
Le banc de mutation n'a pas été mesuré sur cette base rouge ; seuls ses 33 ancrages ont été
vérifiés. Les 645 contrôles de contenu ne certifient pas le niveau CE1 : le contrôle lexical
historique attend toujours un référentiel et un seuil arbitrés.

### Nouveau retour : les objets doivent être reconnaissables sans oracle

Le tapis `foret-muette-08` passe le geste natif, mais ses six « feuilles » sont des petits
ornements floraux ambigus. Le parent ne les retrouve qu'avec l'aide. À largeur de scène 720 px,
leurs boîtes ne mesurent que 47,6–50,2 × 30,3–35,7 px. Une zone réactive et un nom technique
juste ne prouvent pas que l'enfant reconnaît le dessin. La recette pédagogique est rouverte.

Proposition unique en brouillon, avec tapis et six objets séparés :
`Docs/refonte-coloriage-tapis-2026-09-05.md`. Ses sept nouvelles consignes passent le lexique
local, mais le dessin et les textes attendent le parent avant publication et nouveaux masques.

Le parent a depuis refusé la v1 pour son style ; la v2, référencée sur l'école et le tapis
approuvés, est proposée sans intégration. L'audit étendu des six coloriages révèle aussi les
fonds inadéquats de brume, forge et fresque. **Quatre coloriages sont donc à reprendre**, pas
seulement le tapis ; les deux de l'école appellent des ajustements de petites zones.
Voir `Docs/audit-visuel-coloriages-2026-09-05.md` et `npm run qa:coloriages`. Les images servies
sont identiques à celles auditées ; ces défauts ne sont pas une capture prise avant chargement.

### Décisions humaines restant ouvertes

- Onze textes dans quatre fiches : six consignes d'éclair qui dévoilent la réponse, quatre
  formulations « son de gant », une carte « mouche » alors que le récit approuvé montre une
  abeille. Propositions exactes dans l'audit pédagogique, en attente de validation ; aucun JSON
  publié n'a été corrigé en dehors de la chaîne de brouillons.
- Quatre atlas de compagnons : l'aperçu animé local compare chaque brouillon au portrait approuvé.
  Pas de nouveaux pixels publiés ; Plume nécessite notamment un jugement sur le contour des yeux.
- La publication distante exige un accord distinct. La présence d'un build local ne prouve pas
  que le site GitHub Pages ou l'APK installé sur la tablette ont changé.
- La recette réelle sur la Galaxy Tab conserve son rôle : les entrées Chromium émulées ne
  prouvent ni le confort d'un enfant réel, ni l'installation Android native.
