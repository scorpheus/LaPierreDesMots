# Décor absent dans le tri des feuilles

Le retour du parent correspond à `marais-jumeau-11`, exercice
`marais-jumeau-grenouilles-tri-02`, habillage `marais.grenouilles` : mots « trou »
et « noir » comme repères de son. L'image approuvée existe à
`contenu/assets/decors/exercices/marais-grenouilles.png`.

`SceneDecor` empile un PNG puis le SVG de l'habillage. Après chargement du PNG,
il masquait l'image intégrée au SVG, mais laissait son calque de fond et son
tracé opaque parchemin devant le PNG. Le chargement réussi effaçait donc
visuellement l'illustration. Ce n'était ni une image manquante ni un nouveau
décor à produire.

La correction retire les calques déclarés `fond` lorsque le PNG est chargé,
en conservant les calques coloriables. En cas de panne du PNG, le fond SVG doit
redevenir visible. Aucun habillage, asset, contenu ni prérequis pédagogique n'est modifié.

Le test `tests/composants/scene-decor-fond-opaque.test.tsx` charge le véritable SVG,
contrôle son image liée, puis vérifie le style calculé du fond après chargement
et après erreur. L'orchestrateur a confirmé son échec avant correction : le fond
opaque restait visible après chargement de l'image. Il exécute les vérifications après intégration ;
la vérification navigateur doit également confirmer que le PNG est visible
derrière les mots, car une réponse HTTP ou une image présente dans le DOM
ne prouve pas son affichage.

Après correction, le test de composant passe : il mesure le calque actuellement connecté
au DOM après chaque rendu, car l'injection du SVG peut remplacer ses éléments. Les deux
parcours tactiles complets de ce nœud passent sur téléphone et tablette. Le test navigateur
`parcours-tri-decor.spec.ts` complète ces contrôles par le décodage effectif du PNG,
la disparition du fond et la transparence des régions SVG avant la première réponse.
