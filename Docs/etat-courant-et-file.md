# État courant et file de travail

Dernière mise à jour : 5 septembre 2026.

Ce document est la mémoire de passage du projet. La conversation principale reste le poste de
pilotage : tout nouveau retour du parent s'ajoute à cette file tant qu'il n'est pas explicitement
annulé, remplacé ou reporté.

## Point de reprise

- Branche : `main`.
- Base du présent lot : `5874524` — couverture responsive des quatorze moteurs sur tablette.
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
- Derniers contrôles séparés : 2433/2433 tests unitaires, composants et API, 524/524 parcours E2E
  à quatre travailleurs et 294/294 contrôles qualité et responsive. Le contrat exhaustif rejoué
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
  et paysage sans commande perdue ni garde de composition déclenchée.
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
- La photo réelle de la Galaxy Tab du 4 septembre a invalidé le vert responsive du moteur
  `chrono`. La cause est mesurée : la matrice générale jouait au corps par défaut et ne vérifiait
  que l'atteignabilité ; le profil réel (`27 px`, interligne `2`) rendait trois cartes de 240 px,
  un cartouche superposé et des fentes hautes de près de 400 px. Le moteur utilise maintenant des
  cartes horizontales pleine largeur en portrait et une frise 4:3 compacte numérotée. Le garde
  rejoue exactement `720×1017` avec les réglages du profil et mesure largeur, hauteur et
  recouvrements. Il a rougi sur l'ancien rendu, puis la campagne complète a trouvé et fermé les
  variantes paysage et petit téléphone. Résultat ciblé : 1/1 ; matrice responsive : 26/26 en
  2 min 12 s ; détecteur de tests trompeurs : 0 bloquant, plafond historique 93 avertissements.
- Deux nouvelles photos à `800 × 1100` CSS ont révélé le même biais sur `tri` et `eclair` avec le
  profil réel. Dans `tri`, les douze mots recevaient tous la même ordonnée : six semblaient tenir,
  les autres se superposaient derrière eux. Une grille calculée de une à quatre colonnes remplace
  désormais ce repli sur les cadres jusqu'à 900 px et repousse les paniers après le dernier rang.
  Dans `eclair`, le statut héritait à tort du corps 27 et de l'interligne 2 du texte à déchiffrer ;
  les repères d'interface gardent maintenant une métrique compacte et leur détail secondaire est
  masqué sur tablette étroite. Les deux gardes ont rougi sur l'ancien rendu puis passent 2/2 ; la
  matrice étendue à tous les exercices concernés passe **28/28 en 3 min 36 s**.
- Le contrôle responsive possède maintenant un contrat de composition pour chacun des **14
  moteurs**. La table de sondes est comparée à l'union `CodeMoteur`, puis un nœud représentatif par
  moteur est joué à `800 × 1100` avec le profil réel (corps 27, interligne 2). Les deux écrans de
  l'école avec la maîtresse ont leurs cas nommés (`clairiere-01` colorie et `clairiere-04` place).
  Résultats mesurés : 15/15 pour l'inventaire et les moteurs en 4,8 s, puis **45/45** pour la
  matrice responsive complète en 2 min 18 s. Vitest est désormais plafonné à quatre ouvriers :
  les 2 422 cas passent en 90,81 s, là où le lancement sans plafond avait produit 28 délais RPC et
  SQLite sans défaut d'assertion.
- La campagne qui enchaîne les nœuds attend désormais l'identifiant exact de l'exercice, remet son
  témoin de préparation à zéro à chaque paquet et exige une géométrie stable sur trois images. Avant
  ce garde, elle pouvait mesurer le cadre de repli de `tri` puis capturer sa géométrie finale : un
  faux rouge et, inversement, un risque de juger un écran pas encore chargé. La campagne stabilisée
  passe les **150 écrans** (75 nœuds × 2 vues) en 51,9 s.
- Recette de clôture du 5 septembre : **VERT, 12/12 étapes** — 2 433 tests unitaires,
  645 validations de contenu, 524 parcours E2E, 13 références visuelles, 294 contrôles qualité et
  11 contrôles de bundle, zéro échec. La charge initiale mesure 233,4 Kio gzip sur 250 : Andika reste
  embarquée et se charge à la première zone de lecture au lieu d'être préchargée sur l'accueil.
- Une nouvelle photo réelle a fermé trois angles morts de cette recette. Dans `place`, le cartouche
  variable est désormais dans le flux sous l'école : il ne peut plus cacher le soleil, le banc ou
  le toit, quelle que soit sa hauteur typographique. Dans `chemin`, la règle variable emploie toute
  la largeur, le départ et les liaisons jaunes sont explicités et les cases parcourues ne répètent
  plus « Déjà fait » sur le décor. Enfin, le compagnon inscrit dans `PlanSortie` porte réellement
  l'aide : portrait, nom du bouton et locuteur suivent Filou, Roc, Plume ou Bulle ; Gobi n'est que
  le repli sans compagnon choisi.
- Les contrôles négatifs ont réintroduit séparément l'ancien cartouche superposé, l'ancienne bulle
  de chemin à 392 px et le forçage de Gobi : les deux recettes navigateur et les quatre cas de
  compagnons sont tous devenus rouges, puis verts après restauration. La même campagne a découvert
  une prise de carte réduite à 60 px CSS et une scène `place` de hauteur nulle à 360 px ; elles sont
  corrigées respectivement à au moins 64 px et à 400 px défilables. Le détecteur de tests trompeurs
  reste vert : 0 bloquant, plafond historique de 93 avertissements.
- La photo du coloriage `foret-muette-08` a invalidé la précédente validation de contenu : le PNG
  ne portait aucun « gland du centre » et cinq des six feuilles étaient visées hors de leur motif.
  La consigne nomme désormais le centre uni du tapis puis six feuilles réellement présentes sur sa
  bordure. Les sept prises ont été remesurées sur le cadrage raster, et un tap sur la forme complète
  est accepté en plus du cercle technique. Le garde unitaire ne se contente plus de rectangles
  déclarés par lui-même : il mesure le contraste local des six motifs dans le PNG. L'ancien contenu
  a fait rougir 3 contrôles sur 3 ; après correction, 12/12 contrôles unitaires, 30/30 composants,
  645/645 contrôles de contenu et la recette réelle des sept taps à `800 × 1100` sont verts.
- La campagne exhaustive a ensuite révélé une course de sauvegarde : la réponse réseau d'un ancien
  nœud pouvait revenir après l'ouverture du suivant et marquer sa tentative comme déjà envoyée.
  Le drapeau est désormais posé au départ de chaque envoi, jamais au retour d'une réponse devenue
  ancienne. Le contrôle différé de composant passe 22/22 et la campagne des 75 nœuds repasse en
  entier jusqu'à leurs récompenses, sans réussite perdue côté serveur.

## Dernier chantier terminé : audio

- Population recensée après la réduction de la frise des Galeries à trois récits : 666 objets
  audio, 673 clips avec les variantes.
- Couverture des consignes : 368/368, soit 100 %.
- Refus : 0. Dix clips ont été resynthétisés pour les nouvelles consignes et les mots `tapis` et
  `milieu` ; 663 clips existants ont été réutilisés.
- Instrument final : Whisper `large-v3` sur CPU/int8. Le mode CUDA a de nouveau présenté son
  comportement non borné : mémoire GPU occupée mais aucun résultat écrit après environ douze
  minutes. Il a été interrompu sans perdre les clips synthétisés.
- Les 35 tests ciblés de manifeste, couverture et recettes régionales passent.
- `contenu/audio/` est volontairement ignoré par Git et embarqué depuis le poste de production ; le
  verrou reproductible suivi par Git est `production/voix.lock.json`.

## File ouverte

1. Faire tester sur la tablette les nouveaux rendus `chrono`, `tri`, `eclair`, `chemin` et les deux
   écrans de l'école avec la maîtresse sur le serveur local reconstruit. Vérifier aussi que le
   compagnon choisi reste visible dans l'aide pendant toute la sortie. Rejouer aussi le tapis de
   la Forêt Muette : sa première étape dit maintenant « Colorie le centre du tapis en brun », puis
   les six feuilles sont repérées par leur position. Intégrer les retours sans perdre les tâches
   ouvertes.
2. Tester sur l’appareil réel les cinq exercices de chronologie reconstruits. Les quinze triplets
   ont été validés par le parent puis publiés sous forme de 45 cartes 4:3 ; le verrou de pixels et
   les gardes de correspondance texte/image sont décrits dans
   [publication-chronologies-visuelles-2026-09-04.md](publication-chronologies-visuelles-2026-09-04.md).
3. Faire une passe de finition artistique sur les écrans que le test tablette jugera encore trop
   légers, en commençant par les éléments réellement visibles dans le parcours enfant. Les quatre
   fonds régionaux validés sont désormais publiés ; ne pas en générer davantage avant ce test réel.
4. La PWA du lot Chronologie est publiée : source `328079d`, livrable `02812949d95cbb7e`, Action
   Pages `33895370041` réussie, mais le test réel a découvert les WebP de Gobi absents. La
   préparation locale précédente est invalidée par le correctif responsive : refaire
   `publier-site.bat --preparer`, demander l'autorisation explicite, publier puis vérifier Gobi,
   le campement, l'histoire et les compagnons après activation du nouveau service worker.

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
