# Vérification directe des compteurs

La demande du 9 septembre ajoute une URL locale pour arriver directement sur le composant corrigé :
`http://127.0.0.1:8080/debug/recompenses?exercices=23`.

La page utilise le véritable composant `CascadeRecompense`, la fonction pure `appliquerEtoiles`
et les seuils du référentiel `contenu/referentiel/parametres-recompenses.json`. Elle simule
23 nouveaux exercices réussis, puis permet d'ajouter une réussite ou de rejouer sans crédit.
Le grand palier doit passer de 27 à 26 après une nouvelle réussite, puis rester à 26 après
un rejeu. Réinitialiser reprend la valeur de l'URL ; les valeurs sont bornées de 0 à 10000.

Cette simulation n'écrit aucun journal ni profil. Elle est accessible uniquement depuis
localhost, 127.0.0.1 et la boucle locale IPv6. Elle ne dépend pas du profil mémorisé et conserve
son URL pendant l'hydratation du jeu. Elle vérifie le rendu des compteurs, pas la persistance
d'un parcours réel ni l'attribution persistée d'une forme de Gobi.

## Aperçu des fenêtres de cadeaux

`http://127.0.0.1:8080/debug/recompenses?exercices=49&cadeaux=1` montre immédiatement
quatre cartes à toucher : étoile, palier intermédiaire, grand palier et forme « er ».
Le bouton « Voir toutes les récompenses » permet aussi d'afficher ces exemples. Ils ne
changent aucun compteur. La forme et son image `assets/coffre/formes/er.png` proviennent
du référentiel `contenu/monde/gobi-stades.json`, sans image inventée ni appel de service.

Une nouvelle réussite quitte cet aperçu et reprend la simulation normale. À partir de 49,
elle franchit les paliers selon les seuils du référentiel. Chaque palier intermédiaire
simulé reçoit une forme issue de la liste du référentiel pour essayer également sa fenêtre.
Cette attribution en mémoire est un exemple de rendu, pas la sélection pédagogique du jeu.
Le parcours initial `?exercices=23` reste disponible. Les vérifications du présent complément
sont conduites par l'orchestrateur après intégration des fenêtres partagées.

Le test de composant dédié a été écrit avant implantation ; l'orchestrateur a constaté le
rouge dû au module absent. L'orchestrateur conduit les vérifications après intégration.

Les quatre annonces ouvrent maintenant `FenetreRecompense` : médaille du palier ou image
réelle de la forme, titre et bouton Fermer. La fenêtre se ferme aussi par Échap ou un toucher
extérieur et rend le focus à la carte d'origine. Le dashboard parent propose un accès
« Tester les récompenses sans enregistrer », uniquement sur l'hôte local.

Vérification Chromium du complément : les quatre fenêtres s'ouvrent et se ferment, le PNG
de la forme est décodé, le focus revient au bon bouton, aucune erreur JavaScript ni requête
d'écriture. Script : `bac-a-sable/corrections-2026-09-09/verifier-fenetres.mjs`.
La capture a révélé le reset CSS des marges natives du dialogue : une marge automatique
explicite assure son centrage. Une nouvelle campagne générale est en cours pour le lot intégré.

Validation effectuée : test composant vert après rouge initial, TypeScript et build de production réussis, lint ciblé réussi. Navigation Chromium réelle sur le serveur relancé : arrivée directe sans profil, décompte 27 → 26 → 26 après nouvelle réussite puis rejeu, URL conservée, aucune erreur JavaScript et aucune requête d'écriture. Preuve : bac-a-sable/corrections-2026-09-09/verifier-debug.mjs. Les trois parcours navigateur de cascade passent aussi après conversion en exercices. La campagne générale précédente n'a pas été relancée pour ce complément d'affichage et de prévisualisation ; ses écarts restent consignés dans le rapport précédent.
