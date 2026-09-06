# Lot : six coloriages jouables sur le site local

Accord parent du 5 septembre : « Très bien, vas-y, fais tout ça et valide et finis pour que je
puisse tester au moins sur le site en local ». V2 du tapis acceptée ; les reprises du bilan sont
à réaliser pour essai local. Pas de publication GitHub ni nouvelle APK. La validation esthétique
finale de la nouvelle recette appartient toujours au parent après cet essai.

Base `1d5a637` avec travail local de la campagne précédente à préserver. Inventaire remesuré :
140 TS partage, 148 TS/TSX client, 25 TS serveur, 259 fichiers de tests, 11 migrations, 76 fiches
et 76 nœuds (les anciens chiffres AGENTS sont périmés).

## Répartition, un écrivain par fichier

- Principal : tapis v2, école (deux exercices), mécanique commune, tests, audio, intégration,
  builds, serveur local, documentation globale et commits.
- Agent Marais : brouillons de `marais-jumeau-08` / `marais.brume`, image et masques.
- Agent Forge : brouillons de `volcan-08` / `volcan.forge`, image et masques.
- Agent Fresque : brouillons de `cite-des-histoires-10` / `cite.fresque-murale`, image et masques.

Chaque agent écrit seulement `contenu/brouillons/coloriages-locaux-2026-09-05/<lot>/`,
`bac-a-sable/coloriages-locaux-2026-09-05/<lot>/`, et `Docs/coloriage-local-<lot>-2026-09-05.md`.
Aucun fichier commun, contenu publié, test existant, verrou global ou moteur modifié par les
agents. Aucune compilation, suite npm, installation, voix ou commit par les agents. Les scripts
de mesure ciblés ne construisant pas l'application sont permis.

## Livrable de chaque lot

Lire AGENTS, `Docs/audit-visuel-coloriages-2026-09-05.md`, `Docs/audit-textes-coloriages-2026-09-05.md`,
la fiche et l'habillage concernés. Lire les skills d'asset applicables avant génération.
Préférer une image existante cohérente, inspectée, à une nouvelle génération ; l'accord porte
sur la finition, pas une recherche de nouveau style. Si nécessaire, un seul rendu initial avec
le générateur intégré, style référencé sur l'école et/ou tapis v2 validés ; pas ComfyUI.

Livrer `exercice.json`, `habillage.json`, `scene.svg` en brouillon, image choisie et provenance.
Conserver identifiants du nœud, de l'exercice, compétences, couleurs et nombre de consignes autant
que possible. Les mots doivent décrire de vrais objets uniques en gris ; jamais un ancien mot
posé sur un objet différent. Pas de faux repères couleur ni d'objets minuscules. Les masques
suivent les silhouettes (polygones M/L/Z et trous), pas des rectangles ou disques génériques.
Coordonnées du raster et viewBox cohérentes, image entièrement visible (`meet`/ratio exact).
Recalculer surfaces et centres des régions modifiées, préserver les identifiants historiques
inutilisés. S'appuyer sur les outils de géométrie existants du projet.

Fournir aussi `points-reperes.json` : par cible, un point intérieur et un point extérieur
observés sur l'IMAGE, normalisés 0..1, indépendamment du masque. Ils serviront aux régressions
qui doivent refuser les anciens masques. Rapport : objets choisis, phrases exactes, mots hors
lexique local (ne pas le modifier), méthodes et limites. Le principal lit avant promotion.

## Recette principale

Ajouter les régressions sur points visuels indépendants avant de publier les nouveaux masques,
constater leur rouge. Promouvoir les brouillons après revue. Jouer tous les coloriages par
touchers natifs, refus doux, aide sur demande, gris puis bonne couleur, rotations, profil agrandi.
Vérifier les petites zones de l'école, actualiser les voix des phrases modifiées, refaire des
captures du vrai jeu à taille utile tablette/téléphone. Exécuter les portes de clôture sans
assouplir tests/références ; documenter tout rouge restant. Rebuild et contrôler le serveur 8080.

La file antérieure n'est pas annulée. PWA/APK/publication sont explicitement reportées ; les
autres décisions artistiques non liées (atlas des compagnons) ne sont pas implicitement validées.
