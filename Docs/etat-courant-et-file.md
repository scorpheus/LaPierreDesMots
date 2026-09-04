# État courant et file de travail

Dernière mise à jour : 4 septembre 2026.

Ce document est la mémoire de passage du projet. La conversation principale reste le poste de
pilotage : tout nouveau retour du parent s'ajoute à cette file tant qu'il n'est pas explicitement
annulé, remplacé ou reporté.

## Point de reprise

- Branche : `main`.
- Dernier commit fonctionnel avant le chantier responsive : `2172a91` — couverture audio complète.
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

## Chantier en cours : responsive multi-écrans et composition professionnelle

- Matrice en pixels CSS réellement disponibles : tablette portrait `720 × 1017`, tablette paysage
  avec navigateur `1017 × 640`, téléphone portrait `360 × 640`, téléphone paysage `640 × 360`.
- Les 89 recettes d'écran sont parcourues dans chaque format. La garde refuse tout débordement
  horizontal de page, toute commande sans surface et toute commande rognée par un ancêtre.
- Le chargement est stabilisé avant la mesure : polices prêtes, images chargées ou en erreur, puis
  deux cycles de mise en page. Une capture partiellement chargée ne peut plus valider l'écran.
- Résultat du 4 septembre : 4/4 formats verts, soit 356 visites d'écran. Le téléphone portrait a
  en plus réussi trois répétitions concurrentes consécutives.
- Une seconde garde porte désormais sur la qualité de composition de la coque, pas seulement sur
  l'absence de rognage. Elle parcourt 12 cadres : téléphones de 320 à 915 px dans les deux sens,
  les deux côtés du seuil compact (899/901 px), une fenêtre PC réduite et le plein écran.
- Sur les écrans courts ou étroits, la surface tactile reste à 64 px mais l'habillage devient
  compact : texte d'interface borné en pixels CSS, bordure et relief allégés, vignettes réduites,
  détails secondaires retirés de la barre du campement. L'échelle de lecture du profil continue
  de s'appliquer au contenu pédagogique, sans faire grossir démesurément la navigation.
- La composition de la carte dépend également de l'orientation : flux vertical resserré en
  portrait ; carte et destinations côte à côte en paysage bas. L'ancienne piste de `72svh`, qui
  créait un grand vide sous l'introduction en portrait, n'est plus utilisée pour la carte.
- Les cibles tactiles restent à 64 px. Le choix initial de transformer le campement en plateau
  horizontalement défilable a été rejeté après essai parent : l'image entière doit rester visible
  et le campement reçoit une composition propre, sans sous-scroll horizontal.
- La hauteur disponible utilise `dvh`/`svh` et les seuils tiennent aussi compte d'une fenêtre
  courte, afin de couvrir les barres du navigateur et la barre des tâches.
- `npm run test:responsive` est la boucle courte du chantier web. `npm run test:qualite` séquence
  désormais l'audit général, la latence isolée, la matrice responsive puis le budget du bundle ;
  les lancer en concurrence faussait la mesure de latence par contention CPU.
- Les quatre balayages complets de 89 écrans sont séquencés dans leur fichier : après une longue
  campagne, les lancer en parallèle pouvait affamer un seul serveur de test jusqu'au délai maximal.
  Mesurés en série, ils terminent chacun en 30 à 37 secondes sans résultat dépendant de la charge.
- Validation finale du lot initial : 247/247 contrôles qualité généraux, 2/2 contrôles de latence,
  4/4 formats responsive et 6/6 contrôles de bundle. Passe de densité ajoutée ensuite : 16/16 cas
  verts en boucle courte ; dans la chaîne qualité complète, 265/265 cas et 6/6 contrôles de bundle
  sont verts (245,2 Kio gzip sur un budget de 250 Kio).
- L'audit esthétique complémentaire couvre 76 exercices et 13 écrans persistants dans 6 formats,
  plus la fiche coffre : **540 états-formats observés**. Il a révélé des défauts que les gardes de
  rognage ne pouvaient pas voir. Le détail et l'ordre de correction sont dans
  [audit-design-multiresolution-2026-09-04.md](audit-design-multiresolution-2026-09-04.md).
- La garde renforcée a révélé que les six moteurs `colorie`, et pas seulement les trois captures
  repérées, tombaient à 56 px de haut en paysage téléphone. Leur gabarit commun affiche désormais
  la scène et le nuancier côte à côte, avec une scène d'au moins 160 px et des godets de 64 px.
- Le campement tient désormais en entier dans le premier écran en paysage court ; le moteur
  `eclair` sépare l'étape de la commande « Voir/Revoir » ; la récompense place son action
  principale avant les détails ; les réglages ont un en-tête compact ; la fiche du coffre ne
  s'ouvre plus déjà défilée et tient entièrement à `640×360`.
- Vérification intermédiaire après ces corrections : 35/35 tests de composants ciblés, test de
  fiche 1/1, lint ciblé sans erreur, puis les **178 visites** des 89 écrans en téléphone portrait
  et paysage sans commande perdue ni garde de composition déclenchée. La validation globale reste
  à relancer après la fin du chantier PWA concurrent.

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

1. Faire tester la version responsive sur la tablette et le téléphone réels, et intégrer les
   nouveaux retours sans
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
