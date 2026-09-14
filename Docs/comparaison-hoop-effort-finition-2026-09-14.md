# Comparaison avec Raboliots académy : effort et finition

Analyse demandée le 14 septembre 2026. Aucune correction, publication ou campagne de tests entreprise. Cette note distingue observations du jour, preuves historiques et avis ; elle ne remplace pas une recette.

## Observation des sites publics

Le site [Hoop Academy, intitulé Raboliots académy](https://hoop-academy-cm2.jbonnalmkneuro.chatgpt.site/) présente une navigation stable, six niveaux scolaires proposés, cinq univers proposés, huit matières et 180 défis annoncés pour le CM2. Une réponse au quiz de grammaire CM2 a été jouée en mode invité : sélection, validation, correction expliquée, gain de 15 XP et commande de question suivante fonctionnent sur cet échantillon. La clarté de cette boucle et la cohérence des composants contribuent à la finition perçue. Les autres exercices, le compte famille et la persistance distante ne sont pas certifiés par cette visite.

Sa [page de confidentialité](https://hoop-academy-cm2.jbonnalmkneuro.chatgpt.site/confidentialite), datée du 14 septembre, distingue stockage invité et espace famille, décrit export/suppression, hébergement Sites/Cloudflare D1 et voix du navigateur. Elle annonce une phase de test gratuit, un contact public encore à compléter et l'absence de certification de conformité. La présence de cette page informe et rassure ; elle ne prouve pas à elle seule le comportement de la base ou une conformité juridique. Aucune expertise juridique réalisée.

La [carte publique de La Pierre des Mots](https://scorpheus.github.io/LaPierreDesMots/) a été ouverte et observée sur le profil d'audit déjà présent. Aucun exercice ni changement de progression n'y a été effectué. Elle montre un monde illustré gris, des régions verrouillées et deux destinations accessibles dans cet état. Cette mise en scène expose moins immédiatement la variété du jeu que le catalogue de matières de Raboliots. C'est une différence de présentation, pas une mesure de la qualité pédagogique.

## Coûts réels et reprises évitables

- Inventaire relu aujourd'hui : 141 sources TypeScript partagées, 154 sources client, 25 serveur, 298 fichiers de test, 11 migrations, 76 fichiers d'exercices et 76 nœuds ; 14 composants principaux de moteur. Ces comptes décrivent le dépôt, pas sa qualité.
- Le [contrat PWA](contrat-pwa-github-pages.md) décrit trois adaptateurs de stockage pour LAN, APK Android et PWA, avec conservation locale des tentatives. Le [bilan du 5 septembre](campagne-finition-qa-2026-09-05.md) recensait 673 clips et des recettes hors ligne. Les gestes, dessins, audio préparé, progression et livraisons multiples expliquent une complexité importante malgré le périmètre CE1 lecture. Les 673 clips sont un compte historique, non recompté aujourd'hui.
- Le [contrat de finition du 2 août](contrat-finition-v3.md), § 1.2–1.3, décrivait déjà 14 moteurs, 227 fichiers source et 79 fichiers de test pour six fichiers d'exercices. Cela étaye l'avis qu'une structure très large a précédé la richesse du contenu, sans suffire à déterminer quel investissement aurait été optimal.
- L'[audit QA de septembre](audit-qa-progression-2026-09-06.md) documente les limites des parcours à profil neuf, un ancien oracle de sauvegarde invalide et des contrôles d'interaction acceptant disparition ou dérive d'écran. Les corrections consignées ont amélioré les preuves. Ces reprises montrent toutefois que quantité de tests et confiance justifiée ont été confondues à certains endroits.
- Le [bilan du 5 septembre](campagne-finition-qa-2026-09-05.md), section « les objets doivent être reconnaissables sans oracle », documente un coloriage mécaniquement jouable dont les objets n'étaient pas reconnus par le parent. Cette détection tardive obligeait à reprendre dessin, consignes, masques et voix. Le document d'état consigne des corrections ultérieures : ne pas présenter ce défaut historique comme encore présent.
- Une [clôture verte](cloture-campagne-rouge-2026-09-10.md) du 10 septembre à 10:34 UTC existe ; le [rapport consolidé présent](../tests/rapports/RAPPORT.md), plus récent à 11:03 UTC, est rouge sur un cas E2E. L'[audit PWA du 14 septembre](audit-fiabilite-pwa-2026-09-14.md) attend encore ses résultats finaux au moment de cette lecture. Un timeout de test ne prouve pas à lui seul un défaut du jeu ; aucune campagne actuelle n'est certifiée dans cette analyse.

## Forfait et environnement

La [documentation officielle Sites](https://learn.chatgpt.com/docs/sites) consultée aujourd'hui indique que Plus et Pro donnent accès à Sites, qui prend en charge création, hébergement et publication. La [documentation tarifaire](https://learn.chatgpt.com/docs/pricing) distingue surtout les capacités d'usage des forfaits pour Codex et référence Astra dans les deux offres. Un budget supérieur ne détermine ni la pertinence du périmètre ni la qualité de direction artistique. Le forfait effectif, le modèle exact, le temps de création et les tokens consommés par l'auteur de Raboliots ne sont pas vérifiables depuis son site ; ils ne sont pas comparés numériquement.

## Avis et direction proposée

Le coût a deux composantes : complexité fonctionnelle utile et effort évitable dû à des priorités dispersées et des preuves initialement inadaptées. GitHub conserve utilement l'historique ; il n'impose ni la multiplication des cibles ni une finition insuffisante. La responsabilité des agents inclut le choix de concentrer le travail sur une expérience visible cohérente et l'explication du coût des exigences. Elle ne doit pas être reportée sur le parent parce qu'il est développeur.

Direction proposée, sans modification décidée ici : conserver les acquis techniques, concentrer un lot sur le parcours tablette ouverture → activité → aide → récompense → retour → reprise, traiter ses défauts visibles et sa compréhension en priorité, puis ajouter des contrôles adaptés aux défauts rencontrés. Les informations pour les parents doivent être accessibles dans le produit autant que dans les documents techniques. Évaluer chaque lot par son amélioration observable, pas par ses tokens, ses fichiers ou son nombre de tests.

Une lecture indépendante des rapports a été menée par un sous-agent en lecture seule et intégrée à cette analyse. Aucun audit exhaustif du concurrent ni mesure de tokens perdus ; aucun changement aux quatre références protégées, au contenu ou aux sauvegardes.
