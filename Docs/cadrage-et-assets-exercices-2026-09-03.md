# Cadrage et raccordement des décors — 3 septembre 2026

Le retour parent a mis en évidence deux lacunes différentes de la QA : une illustration pouvait
être produite sans être raccordée à l'exercice, et un décor pouvait être présent tout en étant
rogné verticalement sur un écran 1920×1080.

## Décisions appliquées

- Les dix moteurs qui utilisent `SceneDecor` rendent en `xMidYMid meet`.
- La projection des zones tactiles utilise la même transformation `transformeMeet`.
- Le moteur `colorie` borne sa scène par la hauteur de la fenêtre, conserve son ratio et remet
  progressivement la couleur au raster selon les seules régions demandées par l'exercice.
- Seules les cibles de la consigne courante prennent le doigt ; les cercles voisins ne peuvent
  plus intercepter un tap.
- Les fonds finaux `ecole.png`, `tapis.png`, `brume.png`, `forge.png` et
  `fresque-murale.png` sont raccordés à leurs habillages.

## Gardes ajoutées

- `assets-decors-integres.test.ts` échoue si un PNG final reste orphelin sur disque.
- `parcours-cadrage-decors.spec.ts` contrôle les dix moteurs `SceneDecor` en 1920×1080.
- `parcours-regression-decor-clairiere.spec.ts` contrôle le raster, les deux formats usuels et
  un vrai geste de coloriage sur l'école.
- `parcours-tri-tactile.spec.ts` garde le scénario vécu `rouge → rose → vert`.
- La recette générale de visite couvre désormais explicitement le chaudron, auparavant testé par
  sa suite dédiée mais oublié de l'inventaire transversal.

## Lisibilité des consignes

La recette de validation d'un exercice comporte désormais un contrôle CE1 concret : la consigne
doit nommer l'action, la cible et, si nécessaire, l'ordre des gestes sans dépendre d'une métaphore
du décor. Ainsi, « relie le mot à son écho » est remplacé par « Touche bain, puis pain », avec les
deux mots à traiter nommés dans l'ordre. Une campagne textuelle des 76
exercices doit signaler séparément les ambiguïtés restantes ; elle ne juge ni l'audio ni les voix.

L'audit textuel des 76 exercices du 3 septembre relève en priorité les familles suivantes :

- Galeries : grottes aux pronoms vagues, cristaux sans mot modèle explicitement nommé, chemins à
  métaphore peu actionnable, pierres sans rappel de la lettre manquante et syllabes sans rappel de
  l'image à observer ;
- toutes régions : « ces mots », « aussi », « les derniers mots » et « dans le bon ordre » sans
  règle complète répétée ;
- coloriages : phrases déclaratives qui décrivent une couleur sans dire « Colorie… » ;
- tris phonologiques : mot-repère présent mais action et destination pas toujours nommées.

La grille de reprise exige désormais, pour chaque étape, ces quatre champs lisibles dans la phrase :
action visible, critère exact, destination, ordre éventuel. Les corrections seront traitées par
familles de moteur pour conserver un vocabulaire stable entre les 76 exercices.

L'audio reste volontairement hors de ce lot, conformément à la demande du parent.
