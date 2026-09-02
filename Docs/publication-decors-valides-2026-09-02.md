# Publication des cinq décors validés — 2 septembre 2026

Le parent a validé les cinq illustrations de la seconde vague. Elles sont publiées comme références
visuelles canoniques dans :

- `contenu/assets/decors/ecole.png` ;
- `contenu/assets/decors/tapis.png` ;
- `contenu/assets/decors/brume.png` ;
- `contenu/assets/decors/forge.png` ;
- `contenu/assets/decors/fresque-murale.png`.

## Porte pédagogique avant activation dans les coloriages

Ces illustrations ne remplacent pas encore les SVG interactifs. Les consignes existantes font lire
des objets précis qui ne figurent pas tous dans les compositions validées : `chat`, `rat` et `nid`
pour le tapis ; `poule`, `souris`, `mouche`, `roue` et `route` pour la brume ; `tableau`, `drapeau`,
`chapeau`, `rideau` et `oiseau` pour la forge. Associer ces mots à des objets différents rendrait une
mauvaise réponse visuellement indétectable.

La dérivation à produire devra donc conserver le style, la palette et la composition validés, tout
en ajoutant lisiblement chaque cible imposée par les exercices. Elle passera ensuite par le pipeline
raster indexé, qui fournit un fond, un masque RGB exact et un trait superposé. L'activation n'aura
lieu qu'après contrôle des correspondances mot/objet et nouvelle validation parent de la planche de
coloriage — pas seulement du décor d'ambiance.

Le chaudron est traité séparément : son illustration validée contient ses quatorze régions et peut
donc être publiée directement en raster indexé sans changer les objectifs pédagogiques.
