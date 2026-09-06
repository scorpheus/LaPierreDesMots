# Audit de composition des exercices — 5 septembre 2026

## Périmètre et méthode

Audit borné au lot responsive/QA, sur la base demandée `1d5a637`. Les sources relues sont
`tests/qualite/responsive-tous-ecrans.spec.ts`, `tests/e2e/qa-outils.ts` et les quatorze moteurs
de `client/src/moteurs/`. Aucune source applicative, aide QA existante ou référence visuelle n'a
été modifiée. La campagne Playwright intégrée n'a volontairement pas été lancée : elle appartient
à l'orchestrateur et d'autres campagnes écrivent dans le dépôt.

La garde précédente prouve trois choses utiles : les pièces déclarées existent, leurs cadres ne
débordent pas horizontalement et aucune commande HTML n'est entièrement rognée par un ancêtre.
Elle ne prouve pas, en revanche, les propriétés suivantes :

- une région ou un bouton est la couche réellement rendue sous le doigt (un toit opaque ou une
  couche sœur transparente peut passer `isVisible()`) ;
- une prise partiellement dessinée garde une surface utile de 64 × 64 px après les clips et le
  viewport ;
- la rotation survient alors que l'exercice a déjà reçu un geste réel ;
- le texte d'une prise ne disparaît pas sous `overflow`, ellipse ou line clamp.

La nouvelle aide `tests/qualite/aides-composition.ts` attend d'abord les polices, toutes les
images terminées et décodables, puis trois empreintes géométriques strictement égales sur des
images de rendu successives. Le chargement attend le véritable état HTML `complete` via Playwright
(délai de 10 s borné par l'outil), afin qu'un réseau honnêtement lent ne devienne pas un faux rouge;
une image cassée, un délai Playwright ou un cadre qui continue à dériver arrête ensuite la mesure.
L'empreinte couvre les racines, prises, cibles et plateaux : un bouton animé dans une racine fixe
ne peut donc pas se faire oublier. Elle recoupe ensuite chaque prise (`button`, `role=button`,
`role=application`, `data-cible-frappe`) avec le viewport et tous les ancêtres qui rognent. Cinq
points dans la partie visible passent par `elementFromPoint`; avant cette mesure chaque prise est
amenée par `scrollIntoView` au centre du viewport. Les positions de défilement des ancêtres
`hidden` ou `clip` sont toutefois sauvegardées puis restaurées : CSS permet de les modifier par
script, mais un doigt ne les révèle pas. Une longue page normalement défilable n'est donc pas
confondue avec un rognage : une prise reste signalée seulement si elle demeure coupée par un
ancêtre ou masquée après le défilement. Aucune des prises n'est déclarée toucheable par une simple
propriété CSS. Enfin `taperLaPriseReelle` appelle `locator.click()` et enregistre, en phase capture,
que l'événement est bien arrivé dans l'élément demandé.

Les cercles SVG transparents explicitement rendus `pointer-events: none` ne sont pas des prises
au doigt : ils restent les commandes clavier/lecteur d'écran des rendus raster, dont le canvas
lit le masque. La sonde les exclut donc du hit-test, mais attend `data-masque-raster="pret"` avant
toute géométrie. Elle mesure au contraire les vrais chemins visibles
`[data-region-source][data-active="oui"]`, dont le `pointer-events: fill` reçoit le doigt. Le
contrôle positif juxtapose les deux afin qu'une exclusion trop large ne masque pas un chemin SVG
réellement couvert.

Les contrôles négatifs posent un toit opaque sur un bouton, un texte coupé, une prise durablement
hors d'un `overflow: hidden`, une image invalide et une géométrie animée : chacun doit échouer pour
sa raison propre. La troncature n'est pas déduite de `scrollWidth`/`scrollHeight` du bouton : ces
mesures comptent aussi les ailes SVG/CSS et les libellés réservés au lecteur d'écran des lucioles.
La sonde mesure les rectangles `Range` de chaque texte réellement rendu, les confronte au clip de
la prise et de ses ancêtres, et ignore seulement le motif lecteur-écran 1 × 1 px explicitement
masqué par `clip-path: inset(50%)`. Un témoin positif combine ce libellé avec des ailes décoratives
qui débordent : il doit rester vert, tandis que le carton à texte réellement coupé reste rouge.
Le témoin positif est aussi une page longue défilable avec image PNG décodée et prise
de 64 px à 1 380 px : il passe, défile réellement, puis reçoit un vrai tap. Cette paire empêche
une sonde qui ne détecterait que des défauts imaginaires ou qui prendrait le défilement normal pour
un défaut de composition.

## Couverture livrée

`composition-exercices.spec.ts` compare l'inventaire de ses prises à l'union lue dans
`CodeMoteur`, sans liste parallèle permissive. Mesure actuelle des contenus :

| Moteur | Nœuds / exercices | Recettes parcourues |
|---|---:|---:|
| assemble | 5 / 5 | 2 |
| attrape | 7 / 7 | 2 |
| chemin | 7 / 7 | 2 |
| chrono | 5 / 5 | 2 |
| colorie | 6 / 6 | 2 |
| eclair | 6 / 6 | 2 |
| grave | 5 / 5 | 2 |
| histoire | 6 / 6 | 2 |
| libre | 1 / 1 | 1 |
| paires | 8 / 8 | 2 |
| phrase | 6 / 6 | 2 |
| place | 1 / 1 | 1 |
| trace | 2 / 2 | 2 |
| tri | 11 / 11 | 2 |

Chaque recette est ouverte avec le profil Andika 27 px / interlettrage 0,06 em / interligne 2
réellement enregistré, puis mesurée en tablette portrait 800 × 1100. Une prise native du moteur
est tapée; la même partie déjà engagée est mesurée à nouveau après rotation 1017 × 640, reçoit un
second tap réel, puis revient en portrait. Ainsi `libre` et `place`, qui n'ont chacun qu'un seul
exercice, sont quand même vérifiés dans trois états rendus distincts : départ, après geste,
après rotation.

Les deux témoins d'un même moteur sont séparés par un vrai retour aux profils :
`entrerDansLeNoeud` attend une carte de joueur déjà montée et ne peut pas, depuis le premier
nœud, démontrer une seconde recette. Enfin les premiers témoins sains de `chrono`, `place` et
`chemin` produisent exactement six captures diagnostiques dans
`bac-a-sable/qa-finition-2026-09-05/` (portrait et paysage). Une capture devient `fullPage`
uniquement si le repli intrinsèque rend le défilement réel nécessaire.

Les prises sont volontairement propres à chaque mécanique : chemin SVG visible pour `colorie`,
palette pour `libre`,
ardoise pour `trace`, porte du mot pour `eclair`, récit/options pour `histoire`, cibles sur le
décor pour `attrape`, `chemin`, `paires` et `tri`. Le test ne passe jamais par
`window.__test.repondre`; seul `allerAuNoeud` reste une lecture/navigation de harnais.

## Défaut applicatif établi par lecture de source

`client/src/moteurs/histoire/MoteurHistoire.tsx:313` écrase, en téléphone portrait, la taille
issue de `styleDeLecture(reglages)` par `fontSize: '1rem'` sur le panneau de question. C'est une
question que l'enfant doit déchiffrer; le profil 27 px devient donc 16 px précisément quand
l'espace se resserre. C'est l'opposé du comportement accessible attendu : l'écran doit pouvoir
défiler verticalement ou redistribuer les éléments, pas rapetisser la lecture configurée.

Correction exacte proposée au principal : supprimer la propriété conditionnelle
`fontSize: regimeTelephonePortrait ? '1rem' : undefined` de ce panneau, après le spread
`...styleLecture`. Le panneau conservera alors les 27 px et l'interligne 2 du profil. La nouvelle
recette ciblée à 360 × 640 mesure `data-cible-histoire="oui"` et exige au moins 26,5 px et 53 px
d'interligne; elle est faite pour échouer tant que l'écrasement existe.

Le `fontSize` du panneau de récit à la ligne 278 est moins critique : `ZoneDeLecture` y pose déjà
son propre style de lecture. Il ne faut donc pas le confondre avec le défaut de la question.

Les nombreux `overflow: hidden` des racines à décor ne sont pas proposés à la suppression en
bloc : ils peuvent être nécessaires pour contenir le décor. La nouvelle sonde ne les accuse que
si, dans une géométrie réelle, ils réduisent une prise à moins de 64 px ou si le hit-test ne
retourne aucune prise. Cela laisse le défilement vertical normal à la coque quand il est requis,
au lieu d'autoriser un sous-scroll ou de masquer une cible par principe.

## Vérification restante

À exécuter par l'orchestrateur dans la campagne Playwright isolée :

```powershell
npx playwright test tests/qualite/composition-exercices.spec.ts
```

Attendu initial : le cas téléphone `histoire` expose le défaut ci-dessus. Après la correction
applicative proposée, la sonde et la campagne de qualification complète doivent être relancées par
l'orchestrateur, avec lecture de `tests/rapports/RAPPORT.md` conformément à l'annexe T.

## Correctif complémentaire — collisions téléphone paysage

Les artefacts de la campagne DOM exhaustive ont fourni deux preuves directes à 640 × 360 :

- `tests/rapports/artefacts/playwright/parcours-tactile-exhaustif-354a7-mine-par-ses-prises-réelles-parcours/error-context.md` : dans
  `cite-des-histoires-02`, le centre de `mot-ecole` était couvert par `mot-ami` ;
- `tests/rapports/artefacts/playwright/parcours-tactile-exhaustif-e3736-mine-par-ses-prises-réelles-parcours/error-context.md` : dans
  `cite-des-histoires-07`, le centre de `pont-quatre` était couvert par `pont-douze`.

Le diagnostic `chevauchements` de la dérivation par centroïdes est nécessaire mais insuffisant
quand la hauteur disponible devient plus petite que la somme des cibles : aucune relaxation dans
un rectangle fermé ne peut faire tenir 16 cartes ou 12 phrases de 64 px sans recouvrement. Masquer
une couche avec `pointer-events: none` aurait seulement donné le mauvais mot au doigt ; il fallait
modifier la composition.

`MoteurPaires` et `MoteurChemin` possèdent maintenant un repli local, déclenché si le cadre est
compact et qu'un placement dérivé se chevauche, sort des bornes, déborde, ou si la population ne
peut matériellement pas tenir. Le repli compose une ou deux colonnes selon la largeur réelle,
calcule la hauteur de ligne depuis l'encombrement mesuré des textes, puis agrandit le moteur. La
page peut donc défiler verticalement : ni le texte ni les prises de 64 px ne sont comprimés ou
coupés. Le décor raster demeure sous le plateau. Pour `chemin`, les mêmes coordonnées de grille
alimentent boutons, pion et traits SVG : les liaisons restent attachées à leurs cases.
Le repli supprime aussi l'interligne local `1.05` des cases de `chemin` : les libellés reprennent
l'interligne choisi dans le profil, déjà utilisé pour calculer leur hauteur.

`tests/unitaires/grilles-compactes-moteurs.test.ts` couvre les deux témoins synthétiques : 16
cartes dont des phrases de 550 px, puis 12 cases narratives jusqu'à 620 px, dans 640 px. Il exige
une hauteur de repli supérieure à 640 px et zéro intersection entre tout couple de rectangles.
La recette Playwright reste l'autorité d'intégration.

## Intégration par l'orchestrateur

Les replis sont finalement activés pour **tout** plan invalide, pas seulement les cadres compacts.
Le choix du repli ne dépend plus de la hauteur qu'il produit lui-même. La sonde ne confond plus
texte volontairement réservé aux lecteurs d'écran et texte visible rogné ; elle mesure les
rectangles des vraies lignes, pas le `scrollWidth` gonflé par les ailes décoratives des lucioles.

La campagne combinée a validé les 23 cas de composition le 5 septembre, puis a été enrichie d'une
assertion explicite sur le cartouche de placement (hors illustration et réserve) et d'une garde
contre le défilement laissé par la sonde. Ces ajouts passent par la vérification globale en cours.
Les captures sont dans `bac-a-sable/qa-finition-2026-09-05/` ; le bilan consolidé du lot prime sur
les anciens diagnostics reproduits plus haut.

Deux contrôles supplémentaires ont été prouvés rouges avant correction :

- Un carré de 20 × 20 px couvre le centre d'un bouton de 100 × 80 px. La sonde n'en voyait
  aucun défaut, puisque quatre coins restaient accessibles. Elle exige désormais aussi le
  centre pour les commandes HTML ; les géométries SVG concaves restent traitées distinctement.
- Sur `place` en paysage, le titre de la réserve débordait de **61,02 px vers le haut**, sous
  le cartouche de l'étape. Aucun centre de bouton n'était masqué. Une assertion dédiée contrôle
  maintenant l'appartenance du titre à sa réserve ; la grille garde les hauteurs intrinsèques,
  au lieu de comprimer une rangée `minmax(0, 1fr)` puis d'y centrer des enfants trop hauts.

Les 24 tests de composition comprennent les contrôles faux/sains et les 14 moteurs. Le dernier
lot ajoute leurs assertions aux états avant/après geste et aux deux orientations, sans changer
de référence visuelle ni relâcher les seuils.

## Sentinelle commune raccordée au parcours natif

Le nouveau fichier tactile importait initialement le harnais d'isolation mais pas la sentinelle
globale. Le contrôle d'inventaire de `verifier` l'a refusé ; l'import passe désormais par
`./invariants.js`, comme les 37 autres recettes E2E.

Ce raccordement a exposé les prises de carte de 29 × 29 px sur téléphone et une commande
« Montre-moi le mot » de 55 × 64 px. Le rayon SVG est maintenant calculé depuis sa matrice de
rendu (66 px CSS minimum), le bouton a une largeur minimale de 64 px et les prises de clavier
du coloriage libre partagent le composant `CercleAccessible`. Le test de ce composant reproduit
une échelle de 25 %, puis un agrandissement à 200 %, sans dépendre d'un écran physique.

Autre défaut réel : le lancement direct de `galeries-12`, pourtant déclaré `progression:false`,
promettait un enregistrement que le serveur refuse. Le magasin conserve maintenant cette
interdiction quel que soit le chemin de lancement. Le chaudron du campement reste une activité
distincte ; aucune donnée de profil existant n'a été effacée.

Enfin, les mesures initiales pouvaient précéder le ResizeObserver et retenir définitivement une
taille provisoire. La sentinelle attend maintenant trois géométries identiques après chargement
des polices. Les autres invariants restent actifs pendant cette attente. Un nouveau contrôle
a d'abord prouvé qu'elle manquait le rétrécissement d'une prise existante : le nombre de boutons
ne changeait pas. Un ResizeObserver sur les prises la réveille maintenant même sans changement
de population. Le contrôle exige à la fois l'absence d'alerte pendant un redimensionnement
transitoire et la détection d'un vrai bouton stabilisé à 20 × 20 px. Les seuils restent inchangés.

Les rapports intermédiaires rouges sont conservés dans `bac-a-sable/qa-finition-2026-09-05/` :
`tactile-sentinelle-et-composition.json`, `tactile-sentinelle-final.json` et
`sentinelle-redimensionnement-detail.json`. Le dernier contrôle ciblé de la sentinelle passe
2/2 (`sentinelle-redimensionnement-vert.json`). Le bilan du lot donne la campagne finale.

## Résultat final mécanique et limite de reconnaissance

La campagne E2E complète repasse 679/679, dont les 152 parcours des 76 exercices par vrais taps
et rotation. Les 24 cas de composition et les 89 recettes dans quatre formats passent également.
Après la dernière correction des liens SVG autonomes, les 14 parcours placement/coloriage sont
rejoués : 14/14. Les preuves sont conservées dans la campagne datée du 5 septembre.

La recette autonome a révélé une autre attente insuffisante : le moteur de repli apparaît avant
le chargement du SVG illustré. Attendre ses images actuelles ne suffit pas puisqu'elles peuvent
être encore absentes. La recette de démarrage exige désormais l'image SVG `data-fond-illustre`
avant de décoder ses liens internes, les images HTML et les polices.

**Réserve issue du test humain :** le tapis reste difficile à interpréter. Les ornements nommés
« feuilles » se confondent avec des fleurs ; les repères spatiaux sont relatifs au tapis sans
le dire. Le pilote sait où toucher via l'oracle, ce que l'enfant ne sait pas. Sa réussite ne
vaut donc pas validation de reconnaissance. Ce nœud est rouvert dans
`Docs/refonte-coloriage-tapis-2026-09-05.md`, avec une proposition séparée en gris et en couleur.
