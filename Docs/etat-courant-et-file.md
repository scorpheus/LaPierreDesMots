# État courant et file de travail

Dernière mise à jour : 4 septembre 2026.

Ce document est la mémoire de passage du projet. La conversation principale reste le poste de
pilotage : tout nouveau retour du parent s'ajoute à cette file tant qu'il n'est pas explicitement
annulé, remplacé ou reporté.

## Point de reprise

- Branche : `main`.
- Dernier commit fonctionnel avant le chantier audio : `5000483` — choix et animation de la bande
  avant une sortie.
- Serveur de jeu : écoute sur `0.0.0.0:8080` ; adresse LAN mesurée le 4 septembre :
  `http://192.168.1.19:8080`.
- Version de production compilée et servie.
- Dépôt propre avant le lancement du rendu audio.

## Validé techniquement

- Les 76 exercices sont livrés et atteignables dans les six régions.
- Les fonds raster, les scènes adaptatives, les mécaniques communes et la reprise au premier nœud
  inédit sont raccordés.
- La carte, le campement, le coffre, les récompenses et la zone parent sont fonctionnels.
- Les objets du coffre utilisent leurs images raster ; les anciennes formes SVG ne sont plus le
  rendu nominal.
- Le choix de compagnon précède une sortie. Seuls Gobi et les compagnons ralliés sont proposés.
- Le compagnon choisi favorise réellement ses moteurs déclarés, côté serveur comme en mode Android
  autonome.
- Les quatre portraits de compagnons ont une animation CSS légère et distincte, neutralisée par le
  réglage d'animations calmes.
- Campagne complète après audio : 2361/2361 tests unitaires et composants, 645/645 contrôles de
  contenu, 521/521 parcours E2E et 249/249 contrôles qualité. Lint, TypeScript, construction de
  production, budget du bundle, rejeu et contrôles de la QA réussissent également.
- Seule étape rouge : quatre divergences visuelles déjà connues sur la cour d'école et le moteur
  de coloriage. Les références n'ont pas été modifiées sans validation parentale.

## Dernier chantier terminé : audio

- Population recensée : 667 objets audio, 674 clips avec les variantes.
- Couverture des consignes : 369/369, soit 100 %.
- Refus : 0. Deux clips ont nécessité une nouvelle synthèse après le contrôle inverse.
- Instrument final : Whisper `large-v3` sur CPU/int8. Le mode CUDA a de nouveau présenté son
  comportement non borné : mémoire GPU occupée mais aucun résultat écrit après environ douze
  minutes. Il a été interrompu sans perdre les clips synthétisés.
- Les 35 tests ciblés de manifeste, couverture et recettes régionales passent.
- `contenu/audio/` est volontairement ignoré par Git et embarqué depuis le poste de production ; le
  verrou reproductible suivi par Git est `production/voix.lock.json`.

## À faire après l'audio

1. Faire tester la version courante sur la tablette réelle et intégrer les nouveaux retours sans
   perdre les tâches déjà ouvertes.
2. Examiner avec le parent les quatre divergences de références visuelles historiques. Ne jamais
   mettre les références à jour sans sa validation.
3. Faire une passe de finition artistique sur les écrans que le test tablette jugera encore trop
   légers, en commençant par les éléments réellement visibles dans le parcours enfant.
4. Produire de vraies animations articulées des compagnons dans un lot séparé : une planche de
   sprites par personnage, contrôlée avec le protocole `hatch-pet`. Les portraits actuels ne sont
   pas des sprites et ne doivent pas être artificiellement étirés en fausse animation.
5. Revoir l'histoire globale de la carte lorsque le parent souhaitera trancher la place de la
   Clairière : point de départ central actuel ou région périphérique menant à une résolution au
   centre.

## Retours parent à surveiller pendant le test

- Lisibilité des consignes qui changent au milieu d'un exercice : la règle stable et la cible
  courante doivent rester visuellement distinctes.
- Centrage des assemblages, phrases, cartes d'histoire et commandes sous les scènes.
- Taille des scènes sur différents rapports largeur/hauteur, notamment 1920 × 1080 et tablette
  paysage.
- Logique des tris, paires et chemins : toutes les bonnes réponses doivent être acceptées dans
  n'importe quel ordre quand l'ordre n'est pas une règle pédagogique.
- Coloriages : la zone demandée doit être identifiable sans révéler la réponse et la couleur doit
  apparaître sur la partie nommée.
- Fin de sortie et fin de région : la victoire, le cadeau, la région suivante et l'action pour
  continuer doivent être immédiatement compréhensibles.

Ces points ont reçu des corrections globales et des tests, mais restent dans la file tant que le
parent ne les a pas validés sur l'appareil réel.

## Règle de délégation

Une tâche ou un sous-agent reçoit toujours :

1. le commit de départ ;
2. les documents à lire ;
3. un périmètre de fichiers disjoint ;
4. les critères de validation ;
5. les fichiers et décisions à ne pas modifier ;
6. le livrable et le format de commit attendus.

La tâche principale conserve l'intégration, la cohérence pédagogique et artistique, la compilation
globale et la validation finale. Une nouvelle tâche indépendante est réservée aux chantiers
réellement isolables ; les retours de test et les idées restent dans cette conversation principale.
