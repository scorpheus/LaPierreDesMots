# État courant et file de travail

Dernière mise à jour : 4 septembre 2026.

Ce document est la mémoire de passage du projet. La conversation principale reste le poste de
pilotage : tout nouveau retour du parent s'ajoute à cette file tant qu'il n'est pas explicitement
annulé, remplacé ou reporté.

## Point de reprise

- Branche : `main`.
- Base du présent lot : `afedbe5` — responsive du chaudron et fiabilisation initiale des campagnes.
  Le plafond à quatre travailleurs a depuis validé les 521 parcours E2E.
- Serveur de jeu : écoute sur `0.0.0.0:8080` ; adresse LAN mesurée le 4 septembre :
  `http://192.168.1.19:8080`.
- Version de production compilée et servie.
- Le chantier PWA/GitHub Pages est terminé et publié sur
  `https://scorpheus.github.io/LaPierreDesMots/`. Sa recette doit être rejouée après les présentes
  modifications avant la prochaine publication.

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
- Les quatre compagnons utilisent désormais leurs atlas raster validés de huit poses ; le portrait
  statique reste le repli et le mode calme coupe l'animation.
- Les huit images manquantes du second jeu de paires de la Cité sont publiées et raccordées.
- La Pierre centrale est désormais la conclusion : la Clairière part du chemin au sud et le centre
  ne se révèle qu'après l'obtention des six Éclats.
- Derniers contrôles séparés : 2411/2411 tests unitaires, composants et API, 521/521 parcours E2E
  à quatre travailleurs et 274/274 contrôles qualité et responsive. Le contrat exhaustif rejoué
  seul couvre 15 écrans sur 15, 89 recettes et 76 nœuds, avec un écart nul. Lint, TypeScript,
  construction de production et budget du bundle réussissent également.
- Les sept divergences visuelles ont été montrées puis validées par le parent. Les références ont
  été mises à jour explicitement et la recette repasse 13/13 avec une tolérance de 0,2 %.

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
- La passe suivante a recomposé `tri`, `assemble`, `chemin`, `histoire`, `trace` et `grave` : les
  règles variables sont séparées des consignes stables, les constructions sont centrées et les
  plateaux courts ne se recouvrent plus. Les captures ciblées téléphone ont révélé puis fermé les
  recouvrements de `chemin`, `histoire` et `grave` que les tests DOM ne pouvaient pas détecter.
- La zone parent tient désormais à 360 px sans sous-scroll interne ; le coffre laisse ses
  collections prendre leur hauteur en portrait et affiche bien 25 formes, 6 éclats et 6 objets
  raster, sans SVG nominal ni cercle parasite.
- Les décors illustrés déjà produits sont enfin raccordés automatiquement aux scènes régionales :
  47 correspondances PNG sont présentes. Le SVG demeure la géométrie interactive et le repli si
  le raster manque. Les quatre fonds (`fresque-murale`, `tapis`, `brume`, `forge`) validés par le
  parent sont publiés et verrouillés en production.
- La garde de composition vérifie aussi que l'écran racine ne crée pas son propre sous-scroll
  horizontal. Le cas croisé 568 × 320 du campement conserve maintenant le rapport exact du PNG.
- Le balayage des 89 écrans n'est plus un test monolithique de quatre minutes : chaque format est
  découpé en trois lots indépendants et `RESPONSIVE_LOT=1|2|3` permet de rejouer seulement le tiers
  concerné. Les six lots téléphone (portrait et paysage) passent en 1 min 24 s au total ; un lot
  isolé prend 12 à 15 s.
- Une campagne à six travailleurs a encore épuisé les sockets Windows après 318 cas : un
  `ERR_NO_BUFFER_SPACE`, puis trois pages incapables de finir leur chargement. Les quatre cas
  concernés repassent seuls, 8/8 en 58,1 s. Le plafond navigateur par défaut est donc abaissé à
  quatre travailleurs et gardé par un test de configuration. La campagne complète repasse ainsi
  521/521 en 6 min 30 s, sans saturation.
- Le seul débordement produit de ce contrôle concernait le chaudron à 1017 × 640 : `100vw`
  comptait la barre de défilement et ajoutait 15 à 32 px. Le chaudron se borne désormais à son
  conteneur ; son lot tablette paysage repasse en 19,7 s.
- Les sept divergences visuelles sont expliquées : six remplacent volontairement les blockouts SVG
  par la carte ou les décors raster ; la septième concerne la récompense et reste à montrer au
  parent avant toute mise à jour de référence.
- La passe de composition suivante supprime le vide de 84 à 119 px entre la carte et ses départs
  en portrait, ramène les départs paysage à 64–80 px et retire les sous-défilements du coffre à
  1017×640. La recette qualité finale repasse 274/274 en 4 min 54 s ; TypeScript et les 11
  contrôles de bundle restent verts (250,0 Kio gzip sur 250 Kio).
- La PWA intégrée a été reconstruite avec les nouveaux décors, cartes et atlas : livrable
  `3489471b43cd49c6`, 197,8 Mio au total et 15,9 Mio de précache atomique. Elle n'est pas
  republiée avant la validation locale et visuelle.
- Le test réel de la publication `02812949d95cbb7e` a révélé Gobi absent : les quinze WebP
  existaient dans le dépôt mais n'entraient pas dans le glob autonome. Le glob est corrigé et la
  garde est désormais générique : les 339 PNG/SVG/WebP de production doivent tous se résoudre
  localement ; les 293 fichiers que Vite n'incorpore pas au JavaScript seront sondés en HTTP après
  publication. Le campement et les quatre atlas de compagnons sont physiquement présents et
  répondent 200 sur la version publique actuelle ; leur rendu doit être revérifié après purge du
  cache par la prochaine version de service worker.

## Dernier chantier terminé : audio

- Population recensée après la réduction de la frise des Galeries à trois récits : 666 objets
  audio, 674 clips avec les variantes.
- Couverture des consignes : 368/368, soit 100 %.
- Refus : 0. Deux clips ont nécessité une nouvelle synthèse après le contrôle inverse.
- Instrument final : Whisper `large-v3` sur CPU/int8. Le mode CUDA a de nouveau présenté son
  comportement non borné : mémoire GPU occupée mais aucun résultat écrit après environ douze
  minutes. Il a été interrompu sans perdre les clips synthétisés.
- Les 35 tests ciblés de manifeste, couverture et recettes régionales passent.
- `contenu/audio/` est volontairement ignoré par Git et embarqué depuis le poste de production ; le
  verrou reproductible suivi par Git est `production/voix.lock.json`.

## File ouverte

1. Faire tester la version responsive sur la tablette et le téléphone réels, et intégrer les
   nouveaux retours sans
   perdre les tâches déjà ouvertes.
2. Tester sur l’appareil réel les cinq exercices de chronologie reconstruits. Les quinze triplets
   ont été validés par le parent puis publiés sous forme de 45 cartes 4:3 ; le verrou de pixels et
   les gardes de correspondance texte/image sont décrits dans
   [publication-chronologies-visuelles-2026-09-04.md](publication-chronologies-visuelles-2026-09-04.md).
3. Faire une passe de finition artistique sur les écrans que le test tablette jugera encore trop
   légers, en commençant par les éléments réellement visibles dans le parcours enfant. Les quatre
   fonds régionaux validés sont désormais publiés ; ne pas en générer davantage avant ce test réel.
4. La PWA du lot Chronologie est publiée : source `328079d`, livrable `02812949d95cbb7e`, Action
   Pages `33895370041` réussie, mais le test réel a découvert les WebP de Gobi absents. Préparer,
   publier puis tester la version corrigée ; vérifier aussi le campement, l'histoire et les
   compagnons après activation du nouveau service worker.

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
- Clarification parentale du 4 septembre : les six récits du moteur `histoire` sont conservés. Le
  défaut signalé concernait les cartes du moteur `chrono` à remettre dans l'ordre. Le texte seul
  peut sembler logique alors que les images restent des scènes isolées ; la validation porte donc
  sur la continuité visuelle de chacune des quinze séquences.
- L'audit des 249 champs `asset: null` a séparé 241 cartes volontairement textuelles de huit
  images réellement manquantes dans `cite-des-histoires-cartes-paires-02`. Une unique planche a
  produit tomate, carotte, salade, citron, olive, raisin, pomme dans un panier et prune dans un bol.
  Les huit découpes carrées ont été validées, publiées et raccordées à l'exercice.

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
