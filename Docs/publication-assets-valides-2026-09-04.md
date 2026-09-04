# Publication du lot graphique validé le 4 septembre 2026

Le parent a validé en une fois les quatre planches d'animation, les quatre nouveaux décors régionaux
et les huit cartes illustrées de la Cité. Ils quittent donc le bac à sable et deviennent des assets
de production.

## Compagnons

Filou, Roc, Plume et Bulle disposent chacun d'un atlas RGBA de huit cellules de 256 × 256 px.
L'application anime les cellules sans interpolation, conserve le portrait statique en repli et
neutralise tout mouvement avec le réglage d'animations calmes ou `prefers-reduced-motion`. Plume
utilise exclusivement la seconde planche, la première ayant été refusée pour des morceaux détachés.

## Décors et cartes

Les fonds `fresque-murale.png`, `tapis.png`, `brume.png` et `forge.png` remplacent les versions
précédentes sans modifier les géométries SVG interactives. Les huit faces illustrées jusque-là
absentes de `cite-des-histoires-cartes-paires-02` pointent maintenant vers des PNG 512 × 512.

Les empreintes de pixels et la validation parentale sont consignées dans
`production/assets.lock.json`. Les tests ne dépendent jamais des sources ignorées du bac à sable :
un clone autonome contrôle directement les fichiers publiés et leur verrou.

