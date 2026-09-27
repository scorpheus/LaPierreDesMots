# État courant et file de travail

Mise à jour : 27 septembre 2026. Cette page porte uniquement l'état actif.
Le contrat de la reconstruction est [le plan de réhabilitation](plan-rehabilitation-site.md).

## Décision et demande active

**Publication anticipée autorisée le 27 septembre.** Le parent demande explicitement :
« on verra plus tard pour finir proprement, skip toutes les procedure, et commit push deploy
directement toi meme ». La version actuelle est donc livrée avec les décors provisoires,
les voix maths reportées et la qualification incomplète décrite ci-dessous. Les crochets de
validation sont ignorés pour ce commit et ces push uniquement ; aucune règle permanente,
référence de test ni preuve de réussite n'est modifiée. Le livrable local visé est
`e7d538bb622061bd`. Les identifiants effectifs source/Pages et le constat HTTPS sont conservés
dans `bac-a-sable/publication-gh-pages-etat.json`. Les travaux de finition restent à reprendre.

**Clôture du 27 septembre, à la demande du parent.** Travail suspendu pour aujourd'hui.
La campagne `npm run verifier` et le serveur d'aperçu PWA ont été arrêtés ; aucun processus
Node de ce chantier ne reste actif. Aucun commit, push ni déploiement effectué.
Le livrable local `client/dist-pwa/` reste disponible, version `e7d538bb622061bd`.

**Point de reprise :** la campagne interrompue a passé ancrages, ressources, cohérence,
lint, TypeScript, contenu et construction test. La logique rend **3 064 succès / 3 071** :
les sept échecs concernent deux inventaires de tests restés au schéma v13 :

1. `tests/api/fuzz-api.test.ts` : ajouter le descripteur de `PUT /api/mathematiques/niveaux`.
2. `tests/api/parent-reinitialisation.test.ts` : semer `preferences_niveaux_maths` et
   mettre à jour les comptes exacts (complète 27, progression 25, maths 9).
3. Exécuter ces familles, puis reprendre la qualification complète après gel des corrections.
   Aucun patch de ces inventaires n'a été appliqué avant l'arrêt. L'E2E de la campagne globale
   a été interrompu ; son état « non exécuté » n'est pas un verdict sur les parcours.
4. Obtenir les visas déjà demandés pour les cinq décors peints et les trois références de carte,
   puis intégrer uniquement les éléments approuvés et vérifier leur composition réelle.

Journal interrompu : `bac-a-sable/vallee-campagne-finale-27.log` ; détails des sept cas dans
`tests/rapports/test.json`. `tests/rapports/RAPPORT.md` est intermédiaire, pas une recette finale.
Les preuves ciblées et les deux recettes PWA réussies ci-dessous restent conservées.
Les voix restent explicitement reportées ; l'observation de l'enfant et la publication restent
à faire après les validations correspondantes. Ne pas relancer automatiquement pendant cette pause.

**26 septembre — mise à jour PWA depuis la tablette.** Implantation autorisée : recherche au
démarrage/retour, téléchargement en fond, notification hors exercice avec report, boutons et
version locale dans l'espace parent. Activation explicite après confirmation des activités,
sans purge de la progression, refus si un autre onglet du jeu est ouvert. Contrat dans
[le contrat PWA](contrat-pwa-github-pages.md#mise-à-jour-sur-un-appareil-déjà-utilisé).
Code et qualification ciblée terminés : 82 cas, cycle Chromium et recette SQLite réelle verts.
Build local `abe8d7c665d1c051` ; une vraie réussite conserve exactement son profil, son journal,
ses acquis et ses récompenses après le tap de mise à jour. Formats tablette/téléphone vérifiés.
Campagne intégrée à conduire après gel de la Vallée des Nombres ; aucune campagne complète
concurrente. Aucun commit ni déploiement demandé. Ce lot conserve intégralement le chantier
Vallée des Nombres et ses changements préexistants.

**26 septembre — La Vallée des Nombres.** Le parent confirme la zone inutilisée au nord de
la Pierre centrale et valide une aventure de maths accessible dès le début et à tout moment :
six lieux, Gobi et compagnons acquis, projets qui transforment durablement la vallée, exercices
générés hors ligne, difficulté choisie et activités libres renouvelables. Il demande les specs
détaillées et la planification, avec innovation de gameplay et sous-agents choisis selon le
risque et le coût. Dossier rédigé : [spécifications](specifications-vallee-des-nombres.md),
[catalogue de 18 familles et 18 projets](catalogue-jeux-mathematiques.md),
[plan M0–M10](plan-vallee-des-nombres.md). La cible ajoute trois niveaux par famille et une fête.
Réalisation autorisée après remise du plan : les six lieux et les 18 familles sont raccordés,
avec migrations 013/014, services local/HTTP, reprise durable de lecture et accès nord/campement.
Les 18 projets et la fête sont implantés. Les variantes avancées des Ponts font mesurer
deux morceaux liés, puis retirer un module abîmé et réparer un pont existant.
Points structurants identifiés : journaux séparés par domaine, vraie reprise durable des
14 moteurs de lecture désormais conservés, audio variable préproduit, migrations/imports et portées
de remise à zéro explicites. Les preuves et responsabilités sont définies dans le plan.
Le prototype conservé dans `bac-a-sable/vallee-prototype-non-integre-2026-09-26/` a servi de
point de départ après autorisation et revue. Les changements du jeu sont maintenant actifs.
Les preuves ciblées couvrent les journaux séparés, le reset par domaine, les générations,
l'idempotence, les 14 moteurs de lecture et la reprise. Le tour SQL accomplit 54 couples
famille/niveau ; le parcours navigateur du 27 septembre accomplit les 57 étapes des 18 projets
puis de la fête, par les gestes visibles et l'aide de Gobi, sans crédit de lecture ni cadeau en
double. La première traversée passe sur téléphone et grand écran ; les 18 ateliers libres
passent sur quatre formats. Les préférences de niveau persistent par famille et montrent un
exemple ; changer pendant un projet conserve ce projet et ouvre un jeu libre. Les horaires,
les fractions bande/disque et le choix de variantes limitent les répétitions. Suivi parent,
conseil facultatif et export JSON sont intégrés.
La recette PWA `execution-93387c6f` passe sur le livrable local `e7d538bb622061bd` : fermeture,
reprise hors ligne, transfert par l'interface parent vers un second navigateur et égalité des
onze tables concernées. Trois réussites maths, un cadeau, préférence Explorer conservée,
zéro tentative de lecture ajoutée ; une reprise de lecture conservée. Les navigateurs de recette
et leurs anciennes données sont préservés ; un ancien livrable refuse correctement une base v14.
La recette de mise à jour `execution-PEEOIb` passe aussi sur ce build : une réussite lecture
et un projet maths interrompu restent exactement conservés avant/après activation du worker,
puis un geste supplémentaire est enregistré sur la même instance hors ligne. Même schéma SQL
dans ce scénario ; les migrations sont couvertes séparément par les tests de contrats.
La première campagne intégrée rendait 10/15, code 1. Les défauts de navigation, cibles, coffre,
et retour carte pendant la sauvegarde sont corrigés et passent les familles ciblées. Les trois
écarts de références visuelles correspondent aux nouvelles entrées de carte ; visa demandé,
références protégées inchangées. La prochaine campagne complète doit qualifier ces corrections.
La campagne intégrée fait foi dans `tests/rapports/RAPPORT.md` : lire sa date et son verdict,
sans substituer ces résultats ciblés à la qualification complète.
Le décor des rives, généré par l'outil intégré de Codex, est validé par le parent et intégré
dans `contenu/assets/mathematiques/`, avec sa provenance dans le verrou des assets.
Le parent refuse les voix proposées : trop de silence entre les fragments, phrases peu fluides.
Il demande explicitement de terminer le reste du jeu et de reprendre les voix plus tard.
Les voix restent en brouillon, sans promotion ni activation. Travail reporté : reconstruire des
phrases fluides (silences et raccords), écouter les assemblages réels, puis obtenir un nouveau visa.
La qualification ne se réduit pas aux tests de logique. Aucun commit ni déploiement.
Référentiel, assets et sauvegardes familiales préservés. Les validations de contenu et du livrable
public restent à obtenir sur des résultats concrets. Les demandes antérieures restent présentes.
Les cinq remplaçants peints des décors SVG hors Ponts sont générés et présentés, en attente
de visa avant intégration. Ils restent dans `contenu/brouillons/mathematiques/images/` ; leur
intégration préparée dans `bac-a-sable/vallee-decors-proposition/` devra être recapturée en jeu.
L'observation de l'enfant reste distincte des parcours automatisés. Le dossier éditorial reproductible est préparé dans
`contenu/brouillons/mathematiques/inventaire-v1/` (54 secours, textes, transformations et gains).
Inventaire et contrôle lexical régénérés le 27 septembre : 766 textes, aucune des formulations
abstraites signalées encore présente ; 516 mots restent hors du lexique source, à relire sans
élargissement silencieux du référentiel. Le rapport n'est pas un visa pédagogique.

**22 septembre — protocole de livraison économique.** Chantier suivant explicitement demandé :
réutiliser une campagne complète si ses entrées et ses rapports sont inchangés, au lieu de la
répéter au commit, à la préparation et au push. Les fichiers sources, tests, ressources locales,
dépendances installées et navigateurs participent à la preuve. Aucune garde désactivée ; campagne
forcée toujours accessible par `npm run verifier`. Fichiers : scripts de vérification/publication,
crochets Git et procédure PWA ; aucun changement de jeu, de données ni de références visuelles.
Qualification : tests des invalidations, campagne intégrée puis mesure du chemin de réutilisation.
Résultat de la campagne dans `tests/rapports/RAPPORT.md` ; détails dans la réalisation.

**22 septembre — nettoyage et qualification du dépôt.** Le parent demande de diagnostiquer
les tests rouges, corriger les bugs et les attentes périmées, puis vérifier l'ensemble.
Les corrections couvrent navigation, stabilité des consignes, géométrie tactile et budget
du premier chargement. Bilan consolidé : **15 étapes vertes sur 15** ; 2 807 tests de logique,
921 parcours, 321 contrôles de qualité et 13 tests visuels passent. Le parent a validé toutes
les vues présentées ; leurs références sont intégrées. La recette PWA locale passe. Détails et preuves dans la section du 22 septembre de
[la réalisation](realisation-rehabilitation-site.md). Livraison terminée : source `996a78f`, `gh-pages` `abd745a`, version `66e0bee4f2f07a39`, Action Pages `35709558384` réussie et recette HTTPS verte.

Le parent demande une reconstruction cohérente de la présentation et une méthode économique,
avec un design présentable sur PC, tablette et téléphone. Il refuse la poursuite d'une boucle
illimitée « tests de progression/cadrage, correctif local, nouvelle campagne ».

Direction approuvée : conserver assets, voix, contenus, journal, sauvegardes et services ;
reconstruire les compositions des écrans sur des services et composants partagés, puis retirer
les anciens styles. Carte, campement et activités gardent leur gameplay et leurs présentations.
Le parent approuve aussi la répartition des modèles et les contextes courts. Le questionnaire
de cadrage est clos ; il veut découvrir l'ensemble reconstruit et propre avant de tester puis
de le montrer à son enfant et à sa femme. Aucun délai imposé, aucun visa de prototype attendu.
Décisions reçues : campement vivant à l'entrée, reprise accessible directement ; carte
interactive où toucher un lieu montre le trajet puis ouvre sa scène ; décors immersifs et
carte au trésor sur parchemin ; vue de région avec lieux/chemin ; activités composées selon leur
mécanique ; prochaine étape conseillée et lieux acquis revisitables ; portrait et paysage
également utilisables ; appareil habituel avec sauvegarde transférable, sans nouvelle synchronisation.
Réponses 1A–5A et attente de livraison enregistrées dans le plan § 10. Les questions éventuelles
doivent rester visibles directement dans le chat, sans demander une relecture du document.
R1–R2 servent aux contrôles internes ; première présentation familiale prévue à R4, complète.
Aucun effacement autorisé. Le parent a demandé de démarrer et d'aller jusqu'au bout ; seuls
l'orchestrateur et ses sous-agents travaillent désormais sur ce dossier.
L'implantation est en cours sur `codex/rehabilitation-interface` ; contrat d'exécution et preuves
dans [la réalisation](realisation-rehabilitation-site.md).

**Livraison anticipée demandée le 14 septembre vers 16 h 10.** Campagne complète interrompue
à la demande du parent ; PWA locale `77456385be2f7f38` construite, serveur 4196 disponible.
Les 2 806 tests de logique/composants/API passent. Qualification finale incomplète et défaut
grand écran des six coloriages encore ouvert. Sources non commitées, aucune publication.
Le détail de reprise immédiate est à la fin du document de réalisation.

**Publication ensuite autorisée et réalisée par Luna.** Version `77456385be2f7f38` en ligne,
source `0477867`, `gh-pages` `74dc513f`, action Pages `34854401493` réussie ; version HTTPS et
297 visuels vérifiés. Cette publication anticipée ne clôt pas les limites de qualification ci-dessus.

## File active

| Lot | État | Prochain résultat |
|---|---|---|
| Vallée des Nombres | Suspendu pour aujourd'hui à la demande du parent ; code intégré et deux recettes PWA vertes | À la reprise : corriger les deux inventaires de tests v14 (sept échecs), finir la qualification, traiter les visas des cinq décors et des trois références. Voix reportées. Aucun commit ni déploiement autorisé. |
| Voix de la Vallée | Reporté à la demande du parent le 26 septembre | Corriger silences/raccords et fluidité des phrases ; nouvelle écoute et visa avant intégration. Conserver les brouillons actuels comme référence du défaut. |
| R0 — référence conservée | Référence vérifiée, intégration Git à clore | 16 fichiers locaux copiés avec SHA-256, diff binaire et HEAD conservés ; assets et données en place. |
| R1 — référence visuelle interne | Revue navigateur effectuée, intégration finale | Campement, monde, région, activité et récompense revus ; 12 formats d'en-têtes passent. |
| R2 — tranche complète | Parcours téléphone et tablette réussis | Vraie réussite, rechargement du même profil, revisite sans crédit supplémentaire et abandon vérifiés. |
| R3 — migration | Écrans migrés, gel fonctionnel | Feuilles spécialisées, 14 moteurs et 25 cas de repères coloriage validés ; file durable et reset intégrés. |
| R4 — livraison et présentation | Après migration complète et contrôles | Version entière prête aux essais du parent et de sa famille ; livrable identifié, recette finale, visa parent et publication explicitement autorisée. |
| Protocole de livraison | Réutilisation implantée, qualification dans le rapport courant | Une seule campagne par contenu ; mesure des gardes de réutilisation et conservation des contrôles distants. |
| Nettoyage du 22 septembre | Clos localement : 15/15 étapes vertes, recette PWA et visa parent obtenus | Références approuvées intégrées et 13 comparaisons visuelles réussies. Publication réalisée et vérifiée en HTTPS. |

Les anciens sujets ne sont pas effacés : F1 progression rejoint R2/R3 ; F2 cadrage et calques
rejoint R1/R3 ; F3 accueil/carte/campement rejoint R1/R3 ; F4 informations parent et version
rejoint R3 ; F5 livraison rejoint R4. F0 est la base locale validée décrite ci-dessous.

## Base et coordination

- Référence Git actuelle : `996a78f`, poussée sur `codex/rehabilitation-interface`. Le nettoyage
  du 22 septembre est publié ; le protocole de livraison garde son périmètre propre. La demande
  de mode maths du 26 septembre s'ajoute à la file, avec son plan distinct.
- La tâche « Résoudre les problèmes de campagne » a clos F0 et rendu le jeton de tests le
  14 septembre à 13 h 58. Elle n'engage aucun lot suivant. Le nettoyage du 22 septembre est
  conduit par la tâche courante, avec une seule campagne à la fois.
- À la demande du parent, « Analyser transcript et agents code »
  (`01a090c2-67cb-7f71-a72f-ddef5b5c430a`) a clos son aide documentaire : skill mutation
  recentré (30 609 → 4 560 octets), description de génération clarifiée ; rapport et diff relus.
  AGENTS n'a pas été regrossi, aucun guide supplémentaire créé. Skill PWA/code intacts.
  La conduite produit reste ici ; aucune nouvelle sollicitation de l'ancienne tâche de campagne.
- F0 : campagne unique `npm run verifier`, rapport `2026-09-14T11:58:05.302Z`, code 0,
  15/15 étapes vertes, 962,5 secondes. Les étapes navigateur représentent environ 90 % du temps.
  Détails et preuves : [audit PWA](audit-fiabilite-pwa-2026-09-14.md).
- Corrections PWA de la livraison précédente : caches versionnés, reprises et expiration d'installation,
  nettoyage atomique, empreinte stable sensible au worker, contrôle du bon point de montage.
  Le nettoyage du 22 septembre est publié. La version active sur l'appareil familial n'est
  pas requalifiée ici ; aucune sauvegarde familiale n'a été modifiée.
- Le parent a validé les vues de carte et de récompense, puis les trois vues école/coloriage
  après comparaison à la même échelle, le 22 septembre. Les sept références approuvées
  sont intégrées ; les 13 tests visuels passent. La campagne F0 reste une preuve historique.

## Contraintes et décisions ouvertes

- Conserver les acquis sans crédit artificiel. La cadence reste cinq inédits par forme ;
  la proposition trois/cinq est un arbitrage pédagogique distinct, pas une réparation implicite.
- Fermeture avant accusé : file durable conservée au dernier geste, reprise idempotente et
  génération de profil au reset intégrées. Le changement d'appareil/origine ne synchronise pas les données.
- Les défauts reproduits de cadrage, orientation, superposition et stabilité de consigne sont
  corrigés et leurs parcours passent. La qualité a été rejouée entièrement après une erreur
  `ERR_NO_BUFFER_SPACE` de Chromium ; aucun test ou seuil n'a été assoupli.
- Lexique CE1 incomplet, atlas de compagnons, nouveaux textes et variantes artistiques non
  approuvés : leur statut reste inchangé. Ils ne sont pas promus par la reconstruction.
- La récompense montre le stade courant de Gobi. Une future tranche artistique devra décliner
  sa pose joyeuse pour les dix stades et la faire valider ; l'asset de joie unique n'est plus
  employé comme substitut d'un stade et aucune nouvelle image n'est produite dans ce correctif.
- Site web de référence ; LAN et APK conservés sans nouveaux portages pendant la réhabilitation.
- La direction visuelle est choisie ; le visa esthétique sur le résultat intervient à la fin.
  Les agents portent les contrôles intermédiaires, la qualité mécanique et la détection des
  défauts de composition ordinaires. Les règles pédagogiques restent inchangées.
- Le protocole de livraison demandé le 22 septembre porte sur son coût ; les ajouts au jeu du
  26 septembre appartiennent au chantier distinct Vallée des Nombres.

## Historique à consulter seulement au besoin

Le suivi antérieur intégral, avec toutes ses demandes et preuves, est conservé dans
[l'archive du suivi](archives/suivi-avant-rehabilitation-2026-09-14.md). Ses liens relatifs
conservent leur écriture d'origine ; ils se lisaient depuis `Docs/`.
La [comparaison avec Raboliots](comparaison-hoop-effort-finition-2026-09-14.md) explique le
constat initial. L'[audit de progression](audit-qa-progression-2026-09-06.md) et les bilans
régionaux restent des preuves datées, pas une seconde file active.
