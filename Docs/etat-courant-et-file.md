# État courant et file de travail

Mise à jour : 25 septembre 2026. Cette page porte uniquement l'état actif.
Le contrat de la reconstruction est [le plan de réhabilitation](plan-rehabilitation-site.md).

## Décision et demande active

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
  du 22 septembre est publié ; le chantier suivant concerne uniquement le protocole de livraison.
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
- Le parent demande désormais de réduire le coût du protocole de livraison ; aucun ajout au jeu
  ne fait partie de ce chantier.

## Historique à consulter seulement au besoin

Le suivi antérieur intégral, avec toutes ses demandes et preuves, est conservé dans
[l'archive du suivi](archives/suivi-avant-rehabilitation-2026-09-14.md). Ses liens relatifs
conservent leur écriture d'origine ; ils se lisaient depuis `Docs/`.
La [comparaison avec Raboliots](comparaison-hoop-effort-finition-2026-09-14.md) explique le
constat initial. L'[audit de progression](audit-qa-progression-2026-09-06.md) et les bilans
régionaux restent des preuves datées, pas une seconde file active.
