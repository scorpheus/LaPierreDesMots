# Loupe volontaire des coloriages

## Recette intégrée par le principal

Les six tests de composant passent. La recette navigateur déplace réellement la vue par un
geste tactile natif, vérifie qu'il ne peint rien, puis peint par un tap immobile et revient à
la vue entière sans perdre l'étape. La grille intermédiaire utilise `minmax(0,1fr)` : un premier
essai coupait l'image sur téléphone et paysage, détecté par les nouveaux points indépendants.
La mention ci-dessous « régressions non exécutées » est l'état de livraison de l'agent, pas
l'état final. Sa livraison incluait déjà le code : pas de preuve rouge avant implémentation
pour ces six seuls tests. Le contrôle pixel du noir, lui, a bien été mis à l'épreuve par une
mutation temporaire `multiply → color`, détectée puis restaurée sans changer le test.

5 septembre 2026. Finition de confort locale au moteur `colorie` : le bouton de 64 px
« Voir en grand » active une vue à au moins 1280 px de large, défilable directement dans le
cadre de l’image. « Voir tout » revient à l’échelle normale. La loupe n’a accès ni à la
consigne ni aux régions : elle agrandit l’image entière et ne révèle donc aucune réponse.

## Geste tactile

En vue normale, le comportement de peinture reste inchangé. En vue agrandie, `pointerdown`
enregistre seulement la région et le point initial. La peinture ne part qu’au `pointerup` si le
déplacement reste strictement inférieur à 10 px ; à 10 px ou plus, le geste appartient au
défilement. `pointercancel` annule toujours ce geste. L’état du moteur et l’étape active restent
dans `MoteurColorie`, hors de l’état de confort du cadre : la bascule ne les réinitialise pas.

`SceneSvg` conserve explicitement le mélange des couleurs neutres introduit juste avant ce lot :
noir `multiply`, blanc `screen`, gris `normal`, autres couleurs `color`.

## Régressions écrites, non exécutées

`tests/composants/LoupeColoriage.test.tsx` couvre les valeurs 64 px, 1280 px et 10 px, la
bascule volontaire, la conservation de la consigne et du remplissage, le tap immobile différé,
le glissement de 10 px et le `pointercancel`. Conformément au partage de travail, aucune suite,
compilation ou serveur n’a été lancé ; le principal exécute la régression rouge puis verte.

## Ajustement global réservé au principal

Le cadre insère un ancêtre entre `[data-moteur="colorie"]` et `svg.pierre-scene`. Les deux
sélecteurs suivants de `client/src/styles/global.css` doivent donc être étendus par le principal
au nouveau cadre, sans modifier ce fichier dans ce lot :

- lignes 2986–2991 : `[data-ecran="noeud"] [data-moteur] > svg.pierre-scene` et la règle de
  dimensionnement direct du SVG ;
- ligne 3709 : `[data-ecran="noeud"] [data-moteur="colorie"] > svg.pierre-scene` du paysage
  bas, avec le placement grille à reporter sur `.pierre-cadre-coloriage` et sa fenêtre.

Les styles locaux de `CadreColoriage` préservent une scène souple hors loupe, mais ils ne doivent
pas se substituer à ce réglage responsive global.
