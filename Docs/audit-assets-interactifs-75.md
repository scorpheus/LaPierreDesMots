# Audit des assets interactifs des 75 exercices

Audit du 3 septembre 2026, sans génération d’image.

Le moteur `attrape` rend désormais une image locale quand la cible porte un champ `asset` :
l’image est décorative (`alt=""`) et le libellé reste présent pour l’accessibilité. Le premier
branchement exploitable est `volcan-etoiles-filantes-attrape-02` : huit cibles utilisent les cartes
raster déjà présentes dans `contenu/assets/cartes/volcan/`.

## Inventaire résiduel

Sur les champs interactifs inspectés (`cibles`, `elements`, `cartes`, `vignettes`) :

- 344 éléments au total ;
- 249 champs `asset: null` restent présents : 64 cartes du moteur `paires`, 122 éléments du
  moteur `tri`, 63 cibles du moteur `attrape` ; la plupart portent volontairement un mot à lire
  et ne constituent donc pas automatiquement une image manquante ;
- ces champs ne sont pas remplacés par des images approximatives : aucun asset raster existant n’a
  été attribué à un mot différent ou à une autre région ;
- les assets SVG d’objets de `ecole-02-place` restent des éléments vectoriels déclaratifs, car
  aucun équivalent raster correspondant n’est présent dans le dépôt.

Les 249 valeurs nulles ne sont pas des chargements cassés. Elles doivent être évaluées selon le
geste pédagogique : un mot à déchiffrer doit rester du texte, tandis qu'une cible explicitement
figurative peut recevoir une illustration après validation parent. Il ne faut donc pas lancer 249
générations mécaniques ni remplacer un mot par une image qui donnerait la réponse.
