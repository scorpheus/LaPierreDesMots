# Vallée des Nombres — catalogue des jeux et projets

**Statut : catalogue V1 implanté, qualification en cours, 27 septembre 2026.** Ce catalogue décrit le contenu jouable de la [spécification de la vallée](specifications-vallee-des-nombres.md) et ses tranches de réalisation renvoient au [plan](plan-vallee-des-nombres.md). Les six lieux, 18 familles, 54 couples famille/niveau, 18 projets et la fête ont un raccord dans le code. Les identifiants ci-dessous sont stables pour les contenus, les suivis et les tests ; ils ne prescrivent pas 18 moteurs distincts. Les voix restent reportées et les cinq nouveaux décors sont encore en brouillon, en attente du visa esthétique.

## Cadre pédagogique et règles communes

Le [programme de mathématiques du cycle 2 publié au BO du 31 octobre 2024](https://www.education.gouv.fr/bo/2024/Hebdo41/MENE2415135A), applicable depuis la rentrée 2025, donne la priorité à la numération, au calcul et à la résolution de problèmes. Il demande un passage progressif de la manipulation à l'image puis aux symboles et rappelle qu'une manipulation réussie, seule, ne prouve pas la compréhension. Son [annexe 4](https://www.education.gouv.fr/sites/default/files/document/Annexe%204%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20du%20cycle%202-403821.pdf) détaille les attendus CE1 ; le [livret d'accompagnement CE1](https://eduscol.education.gouv.fr/sites/default/files/document/2025livretaccompagnementmathce1pdf-116325.pdf) donne des exemples de séquences. Le présent document propose des situations de jeu inspirées de ce périmètre. Il ne constitue ni une progression scolaire certifiée ni une validation pédagogique par l'Éducation nationale.

Les bornes de contenu viennent du programme : entiers jusqu'à **1 000** au CE1 ; fractions **d'un même tout**, inférieures ou égales à 1, de dénominateur 2, 3, 4, 5, 6, 8 ou 10 ; comparaison de fractions de même dénominateur ou de numérateur 1 ; addition et soustraction de fractions de même dénominateur ; longueurs, masses, monnaie, heures et quarts d'heure ; figures, solides, repérage et données. Le contexte narratif, les gestes, les trois difficultés et les exemples chiffrés sont **des choix de jeu proposés**, pas des seuils officiels. Les contenus d'accueil peuvent reprendre le CP, mais cette possibilité ne doit pas limiter définitivement le CE1 à de petits nombres. Les fractions employées ici restent des parts d'un tout : le repérage de fractions comme nombres sur une règle est réservé au CE2. Les contenances comme mesure formelle sont également laissées au CE2.

La vallée occupe le nord de la carte et ses six lieux sont accessibles dès le départ. Gobi accompagne l'enfant ; les compagnons déjà acquis peuvent être choisis. Leur intervention change la présentation ou l'aide, jamais la vérité mathématique. Chaque lieu porte trois projets narratifs courts, restaurés durablement **par profil**, puis trois familles d'activités renouvelables. L'enfant peut revenir à un projet achevé pour rejouer une scène ; le décor ne redevient jamais gris. Aucune famille n'exige de chronomètre, de vies ou de score négatif. Une erreur garde les objets en place, montre l'écart utile et invite à essayer, retirer, échanger ou annuler. La consigne sonore est disponible en un geste, rejouable librement ; Gobi fournit une aide gratuite et fait accomplir le dernier geste juste à l'enfant.

La restauration narrative constate l'achèvement du projet, pas la maîtrise d'une compétence. L'observation distingue les gestes autonomes de ceux accompagnés d'aide ; aucun seuil d'acquisition mathématique n'est fixé ici. Le barème partagé des étoiles est additif : **1** pour l'activité achevée, **+1** sans aide, **+1** sans erreur. Une activité terminée avec aide mais sans erreur vaut donc **2 étoiles**. Seule une validation explicite incorrecte compte comme erreur ; déplacer librement, annuler, écouter, utiliser la règle ou un autre outil neutre n'en compte pas. L'aide gratuite ne reprend ni acquis ni récompense déjà obtenus.

**Difficultés choisies par l'enfant.** `Découverte` : peu d'objets, matériel affiché et geste guidé. `Exploration` : changement de représentation et contrainte supplémentaire. `Défi` : plusieurs étapes, choix de stratégie ou plusieurs solutions à comparer. Les domaines proposés, modifiables après vérification pédagogique et technique, figurent dans le tableau ci-dessous. Ils paramètrent des instances de jeu et ne fixent aucun seuil de maîtrise. Le choix est propre à chaque famille. Il est conservé dans SQLite par profil et génération maths, avec un exemple concret montré avant le départ ; il suit ainsi l'export/import de la sauvegarde. Changer de difficulté pendant un défi sauvegarde le projet puis propose une nouvelle instance libre au niveau choisi.

**Contrat de génération hors ligne.** Le moteur tire une instance locale à partir de la famille, du niveau choisi, d'une graine et des contraintes de cette famille. Il calcule d'abord toutes les solutions recevables, ou une propriété vérifiable, puis écarte une instance sans solution, ambiguë ou qui exige une compétence hors périmètre. Pour la reprise, il conserve **l'instance résolue et ses versions de modèle et de générateur**, en plus de la graine, des objets placés, de l'étape et des validations ; une mise à jour ne doit pas transformer la question en cours. Il varie la situation, les quantités, l'ordre, les représentations et les contraintes ; il évite de ne changer que les nombres d'un questionnaire identique. Les objets manipulés, la consigne orale et les indices doivent parler de la **même instance**. Les réponses et suites d'actions équivalentes sont acceptées. Chaque famille prévoit une courte invitation à expliquer ou montrer pourquoi : une phrase enregistrée n'est pas requise, mais le jeu doit rendre visible le lien mathématique. Une simulation tactile reste un support numérique ; si une notion demande une manipulation tangible, le jeu peut suggérer des cubes, une ficelle ou des pièces fictives à portée de main, sans bloquer la session.

La sélection implantée cherche parmi douze candidats une signature de problème absente des cinq
dernières instances. À défaut, elle préfère une représentation matérielle nouvelle avant de
répéter une instance valide. `MAT-HOR-03` varie les horaires cibles ; `MAT-JAR-02` et
`MAT-MOU-03` tirent bande ou disque avec le générateur v2, tout en conservant la lecture et la
résolution des anciennes instances v1. Ce mécanisme réduit les répétitions sans promettre
l'unicité des tirages.

Un projet transmet des quantités entre ses défis : **ses paramètres sont tirés conjointement avant le premier défi**, à partir des niveaux choisis indépendamment pour les familles concernées. Sa version éditoriale déclare les tuples de niveaux compatibles et une instance soluble pour chaque combinaison proposée à l'enfant. Une intersection vide est un défaut de conception à signaler avant livraison, jamais une raison de baisser silencieusement une difficulté. Si l'enfant change un niveau en cours de projet, les défis déjà réussis et leurs contributions narratives restent acquis. Si les quantités figées permettent une suite cohérente au niveau choisi, seules les étapes non jouées sont retissées ; le défi inachevé est d'abord mis à l'abri comme point de reprise. Si cette suite est impossible, le projet reste suspendu **avec son instance exacte**, et une activité libre est proposée au niveau choisi ; l'enfant pourra reprendre plus tard le projet inchangé. Un seul défi est actif à la fois. Aucun nombre déjà montré ne change silencieusement ; une transformation visible et un cadeau ne sont attribués qu'une fois.

Dans l'implantation actuelle, le changement de niveau suspend toujours le projet figé et ouvre
une activité libre après l'accusé de sauvegarde. Aucune étape liée n'est régénérée et le défi
interrompu ne crée pas de tentative. La possibilité contractuelle de retisser des étapes non
jouées reste distincte de ce parcours implanté.

Tout nombre, prix, horaire ou autre donnée variable de la consigne et de l'aide doit rester intégralement audible hors ligne. L'assemblage éventuel utilise uniquement des clips préproduits et une grammaire audio validée, avec contrôle de l'accord et de la liaison dans les valeurs effectivement générées ; aucune synthèse vocale n'est faite à l'exécution. Un tirage sans réalisation audio correcte est rejeté. Les mots nouveaux destinés à l'enfant passent le contrôle lexical CE1 et la validation parent avant publication.

La **V1** livre les 18 familles, les 18 projets et la fête décrite dans la [spécification](specifications-vallee-des-nombres.md). Ses six lieux et toutes leurs familles sont jouables dès l'ouverture ; seul le récit de chaque lieu ordonne ses trois projets. Le [plan de la vallée](plan-vallee-des-nombres.md) organise des tranches internes jusqu'à cette livraison complète. Chaque projet comprend trois à cinq défis liés, fonctionne avec Gobi seul et se reprend après interruption. Le catalogue ne prétend pas couvrir tous les attendus mathématiques CE1.

Les 18 projets et la fête ont actuellement trois étapes chacun, soit 57 défis. Un parcours
automatisé les a traversés avec gestes DOM et aide de Gobi. La campagne finale reste en cours ;
ce parcours ne vaut ni visa esthétique ni observation de compréhension par l'enfant.

**Arbitrage audio du 26 septembre :** après écoute, le parent reporte les voix pour terminer le
reste du mode. Les clips proposés restent en brouillon : les silences entre fragments rendent
les phrases peu fluides. La consigne textuelle reste affichée ; aucune synthèse à l'exécution.
La couverture sonore ci-dessus reste la cible de la reprise audio, avec un nouveau visa.

### Déclinaisons des projets lors de l'intégration

Les nombres des exemples ci-dessous se déclinent dans le domaine du niveau choisi.
Dans le Jardin P02, Découverte compte des fruits isolés ; Exploration et Défi comptent des
**caisses de dix fruits**, annoncées et représentées comme telles dans les deux carnets.
Le total de caisses est transmis à la décomposition du nombre de fruits ; ce changement
d'unité est explicite, et conserve les bornes du tableau et de la numération.

Les Horloges P02/P03 ne permettent pas Découverte pour les trois étapes à la fois : un ruban
de 15 ou 30 minutes partant d'une heure entière ne rejoint pas un cadran à heure entière.
Le choix initial compatible est Découverte/Découverte/Exploration. Le joueur peut modifier
chaque niveau, avec une explication avant de démarrer si la combinaison est incompatible.
Les paramètres du niveau Découverte restent inchangés ; aucun ruban de 60 minutes n'y est ajouté.

Aux Ponts P02, le premier défi fixe la borne de destination. Le deuxième conserve deux
longueurs distinctes, `longueurA` et `longueurB`, mesurées par des choix et lectures séparés ;
leur somme `longueursTrajet` fixe la portée du tablier final. Chaque morceau reste dans le
domaine de `MAT-PON-01`, et la somme dans celui de `MAT-PON-03`. Il existe **24 tuples** de
niveaux compatibles : mesure Défi avec tablier Découverte est exclue, puisque deux morceaux
d'au moins 8 cm dépassent la portée maximale de 12 cm de ce tablier. Le niveau de repérage
est indépendant. Le service refuse ce tuple sans changer silencieusement les niveaux.

Aux Ponts P03, `manqueCm` est la longueur du module abîmé mesurée dans le premier défi.
Le module reste posé pendant cette mesure ; l'enfant le retire au début du défi de réparation,
ce qui ouvre le trou. `moduleRestantCm` demeure fixé sur le pont. Deux paires de modules de
longueurs différentes peuvent ensuite remplacer le module retiré. La portée réparée est
`porteeReparee = moduleRestantCm + manqueCm` et devient le repère vérifié dans le dernier
défi. Les **27 tuples** des trois niveaux sont représentables : le générateur choisit une
portée du niveau `03` qui figure sur les graduations du niveau `02`, un manque mesurable au
niveau `01` d'au moins 6 cm et un module restant d'au moins 2 cm.

### Domaines initiaux proposés pour les trois niveaux

Ces valeurs sont **des paramètres éditoriaux de V1 à confirmer sur les instances et avec le parent**, pas des attendus scolaires ni une progression imposée. Chaque ligne définit un domaine de tirage, une opération ou une contrainte et un outil neutre, disponible sans réduire les étoiles. Le générateur garde les résultats intermédiaires dans le domaine de la ligne ; le stock proposé permet toujours la solution. `D`, `E` et `F` abrègent Découverte, Exploration et Défi. Les aides de Gobi, précisées dans les fiches, restent distinctes de ces outils.

| Famille | D — Découverte | E — Exploration | F — Défi | Outil neutre |
|---|---|---|---|---|
| `MAT-JAR-01` | 0–99 graines : accueil à 0–10 objets isolés, puis bottes de 10 et unités. Le cas 0 montre un plateau vide et se valide sans déposer d'objet. | 100–499 ; centaines, dizaines, unités ; un échange demandé. | 100–1 000 ; au moins deux décompositions avec stock borné, dont une sans la représentation canonique. | Plateau de groupement, bouton annuler et tableau C/D/U. |
| `MAT-JAR-02` | Tout partagé en 2 ou 4 parts égales ; couvrir ou compléter une part. | Dénominateur 3, 5 ou 6 ; part non unitaire ou complément ; un seul tout visible. | Dénominateur 6, 8 ou 10 ; deux représentations d'une même part ou somme de parts de même dénominateur, résultat ≤ 1. | Superposition du tout, pièces déplaçables et quadrillage optionnel. |
| `MAT-JAR-03` | Deux catégories, effectifs de 1 à 6 ; construire des barres unité. | Trois ou quatre catégories, effectifs de 1 à 12 ; passer panier → tableau → barres. | Quatre ou cinq catégories, effectifs de 1 à 20 et total < 100 ; transfert d'un objet puis lecture du nouveau tableau, égalités possibles. | Jetons de comptage, grille unité et retour à l'inventaire. |
| `MAT-PON-01` | Planches de 2–8 unités cm du problème ; origine indiquée, comparer deux pièces. | 5–15 unités ; placer soi-même l'origine, mesurer puis reporter. | 8–25 unités ; plusieurs planches, choix d'une combinaison de même portée après mesure. | Règle virtuelle, bande de report et annuler. |
| `MAT-PON-02` | Fenêtre de 0–30, graduée de 1 en 1 ; une borne à poser. | Entiers ≤ 300, fenêtre graduée de 10 en 10 ; deux bornes dont une manquante. | Entiers ≤ 1 000, fenêtre de 1, 10 ou 100 selon l'instance ; intercaler et justifier deux bornes. | Demi-droite graduée avec repères révélables et déplacement réversible. |
| `MAT-PON-03` | Portée de 5–12 unités cm ; deux pièces dont la somme est la cible. | 10–25 unités ; trois pièces, retirer puis remplacer un module. | 15–40 unités ; stock borné offrant au moins deux assemblages distincts de la même longueur. | Bande de mesure et inventaire des pièces, sans indice sur la combinaison à choisir. |
| `MAT-MOU-01` | 2–4 roues de 2–5 pales ; compter par groupes égaux. | 3–6 groupes de 2–8 ; passer dessin → addition répétée → total. | Total ≤ 60 ; trouver deux organisations en groupes égaux lorsque l'instance l'annonce. | Jetons alignables et grille rectangulaire. |
| `MAT-MOU-02` | Total de 4–20 mesures, 2–4 sacs ; partage exact, une mesure par geste. | Total ≤ 40, 2–6 sacs ; partage exact ou nombre de sacs à trouver. | Total ≤ 60 ; comparer deux répartitions exactes ; un reste n'apparaît que dans un modèle explicitement annoncé. | Bacs et compteur de stock, retour de mesure sans pénalité. |
| `MAT-MOU-03` | Même tout coupé en 2 ou 4 ; régler une part puis compléter. | Dénominateur 3, 5 ou 6 ; ajouter ou retirer des parts de même dénominateur. | Dénominateur 6, 8 ou 10 ; comparer deux réglages, dont une équivalence visuelle simple, sans résultat > 1. | Disque du même réservoir et secteurs superposables. |
| `MAT-MAR-01` | Sommes entières de 1–20 € ; pièces de 1, 2 € et billet de 10 €. | Sommes entières de 1–100 € ; pièces/billets disponibles, un échange de valeur égale. | Sommes ≤ 20 € avec centimes entiers ; deux compositions, dont une conversion `100 c = 1 €`. | Porte-monnaie, plateau de tri et affichage de la somme en € et centimes. |
| `MAT-MAR-02` | Prix et somme donnée entiers ≤ 20 €, rendu ≤ 10 € avec stock garanti. | Prix et somme donnée entiers ≤ 100 € ; payer exactement ou rendre une somme positive. | Prix ≤ 20 € avec centimes ; rendu en centimes entiers, deux façons de payer ou de rendre. | Trois plateaux « donné / prix / rendu » et pièces fictives. |
| `MAT-MAR-03` | Budget entier ≤ 20 € ; choisir deux articles d'une liste de trois. | Budget entier ≤ 60 € ; trois besoins, au moins une combinaison admissible. | Budget ≤ 100 € ; deux paniers distincts admissibles, puis comparer leurs restes. | Panier, étiquettes déplacées et tableau de dépense. |
| `MAT-CHA-01` | Carré ou rectangle sur grille, côtés de 2–6 carreaux ; modèle visible. | Carré/rectangle de 2–10 carreaux ; longueurs annoncées, orientation libre. | Rectangle ou assemblage de deux figures, côtés ≤ 12 unités ; une cote changée impose une révision du plan. | Grille logique, règle et équerre virtuelles, annuler. |
| `MAT-CHA-02` | Reconnaître un cube et compter ses six faces sur un modèle illustré manipulable. | Choisir parmi deux patrons de six carrés, puis vérifier par pliage illustré. | Assembler un patron parmi des placements autorisés, comparer deux patrons valides distincts. | Faces numérotables, modèle à déplier et aperçu de pliage déterministe. |
| `MAT-CHA-03` | Comparer deux masses entières de 100–900 g ; chercher le plateau le plus lourd. | Équilibrer avec 2–4 poids en grammes, total ≤ 1 000 g. | Masses et résultats ≤ 1 kg, soit ≤ 1 000 g ; utiliser `1 kg = 1 000 g` et trouver deux décompositions équivalentes. | Balance logique, poids étiquetés et référence 1 kg. |
| `MAT-HOR-01` | Heures entières de 1 h à 12 h ; contexte matin ou après-midi indiqué. | Heures et demies ou quarts ; contexte matin/après-midi explicite, cadran et écriture 24 h. | Heures entières, demies et quarts sur 0–23 h ; traduire cadran ↔ écriture 24 h dans une scène de journée explicite. | Cadran à aiguilles, repères quart/demi et frise de journée. |
| `MAT-HOR-02` | Départ à heure entière ; durée de 15 ou 30 min, arrivée dans la même journée. | Départ à heure entière ou demi-heure ; somme de deux rubans de 15 ou 30 min, arrivée au quart. | Départ et arrivée sur quarts d'heure ; deux rubans totalisant 30–120 min, comparaison de deux parcours. | Frise horaire de la journée, rubans de 15/30/60 min et annuler. |
| `MAT-HOR-03` | Tableau 2 destinations × 2 moments ; lire la case et placer un trajet. | Tableau jusqu'à 3 × 3 ; lire ligne/colonne et choisir un départ compatible. | Tableau jusqu'à 4 × 3 ; comparer deux horaires compatibles avec une arrivée demandée. | Tableau à double entrée, marqueurs de ligne/colonne et frise. |

Les intervalles sont inclusifs. « Deux solutions » signifie deux états mathématiquement distincts, pas deux dispositions graphiques d'un même état. Les fractions ont toujours un tout identifié et des parts égales. Les valeurs monétaires sont calculées en centimes entiers ; l'écriture à virgule n'est montrée que dans ce contexte. Les horaires d'après-midi ou de soirée sont nommés par le récit et l'audio : un cadran seul ne permet pas de choisir entre 2 h et 14 h. Pour les niveaux où le total d'une collection dépasse les objets affichables confortablement, les échanges et regroupements évitent une scène de centaines de pièces isolées.

### Jardin des pousses — réunir, partager, observer

| Famille | Action et exemple rejouable | Validation mathématique, aide et génération |
|---|---|---|
| `MAT-JAR-01` Bottes de graines | L'enfant fabrique des bottes de dix graines, les défait et les échange contre des sacs de cent. Pour **235** graines, il peut poser `2 centaines + 3 dizaines + 5 unités` ou `1 centaine + 13 dizaines + 5 unités`. | La somme pondérée des objets doit être 235, quel que soit leur ordre ou leur groupement. Gobi anime un échange `10 ↔ 1` et revient en arrière sur demande. Tirer un entier CE1, éviter les représentations impossibles avec le stock, vérifier que chaque décomposition proposée conserve la valeur. |
| `MAT-JAR-02` Plates-bandes à partager | L'enfant couvre **3/4** d'une plate-bande avec trois quarts égaux, puis peut remplacer ces pièces par une autre partition du **même tout** si l'équivalence est visible. Il peut aussi chercher le quart manquant. | Comparer des aires rationnelles et contrôler l'égalité des parts, pas la forme des tuiles ni l'ordre de pose. Gobi superpose le tout et souligne les parts égales ; il refuse doucement un partage inégal. Générer un tout explicite, des partitions exactes parmi les dénominateurs CE1 et un complément non négatif ; ne pas exiger les équivalences systématiques du CE2. |
| `MAT-JAR-03` Carnet des récoltes | Des paniers de deux à cinq variétés sont comptés, rangés en tableau puis en barres unitaires. Exemple : 4 poires, 6 pommes et 3 prunes ; l'enfant peut déplacer une pomme de panier et voir les deux représentations changer ensemble. | La somme du tableau et des barres reste égale à l'inventaire ; les lectures « le plus », « le moins », « autant » sont vérifiées sur les données courantes. Gobi compte une barre à la fois. Tirer un petit ensemble cohérent, des catégories distinctes et une échelle unitaire ; permettre une égalité ex aequo. |

**Projets durables du jardin**

| Projet | Enchaînement causal et trace permanente |
|---|---|
| `MAT-JAR-P01` Réveiller la pépinière | Former **240 graines** en bottes (`01`), puis planter trois des quatre carrés égaux (`02`) avec **60 graines par carré**. Le quatrième reçoit les 60 graines restantes après le geste de complément. Les carrés plantés restent colorés ; le stock des étapes suivantes provient réellement de la première. Pour les variantes, le tirage impose un total divisible par le nombre de carrés. |
| `MAT-JAR-P02` Le livre des saisons | Compter les récoltes (`03`), **ranger dix fruits dans une caisse qui les contient visiblement** (`01`), puis montrer dans le carnet que le total n'a pas changé (`03`). Le carnet devient consultable ; le changement de rangement conserve tous les fruits et toutes les données. |
| `MAT-JAR-P03` Le banquet des jardiniers | Choisir une part de gâteau de récolte (`02`), observer dans le tableau combien de convives ont reçu une part (`03`), puis compléter sans dépasser le tout (`02`). Une table de fête apparaît ; plusieurs découpages justes sont admis. |

### Ponts des Rives — mesurer, placer, relier

| Famille | Action et exemple rejouable | Validation mathématique, aide et génération |
|---|---|---|
| `MAT-PON-01` Planches à mesurer | L'enfant aligne l'origine d'une règle sur une planche et lit sa longueur en centimètres. Découverte/Exploration : choisir une autre planche de même longueur, même déplacée. Défi : reporter cette mesure sur une combinaison de planches raccordées. | Valider la longueur en unités entières et la coïncidence des extrémités ; pour une combinaison, vérifier aussi somme, absence de trou et de chevauchement. La tolérance tactile facilite le geste sans changer l'égalité mathématique. Gobi montre le zéro, puis le report de longueur. Générer des segments entiers lisibles et des distracteurs distincts. Les graduations « cm » représentent les **unités du problème sur une grille logique** : aucune mesure physique en centimètres de l'écran n'est inférée. |
| `MAT-PON-02` Pierres de la rive | Placer des bornes, par exemple **230, 240 et 250**, sur une demi-droite graduée de dix en dix ; une borne cachée peut ensuite être retrouvée entre deux bornes visibles. | Valider valeur et ordre selon une échelle explicite. Gobi pose deux repères et laisse l'enfant intercaler le troisième. Tirer des graduations de 1, 10 ou 100, compatibles avec les bornes et les entiers jusqu'à 1 000 ; éviter les bornes hors écran ou non discernables au toucher. |
| `MAT-PON-03` Tablier modulable | Assembler des segments de **8 cm** et **5 cm** pour franchir **13 cm** ; puis retirer 5 cm, ou trouver une autre composition de 13 cm. | La longueur totale mesurée atteint la portée demandée et les pièces se raccordent sans trou ni chevauchement. Gobi montre `8 + 5` comme conservation de longueur et permet de défaire. Générer un stock offrant au moins deux compositions dans le mode « plusieurs chemins » ; calculs entiers, unités cohérentes, pas de parcours plus court imposé. |

**Projets durables des ponts**

| Projet | Enchaînement causal et trace permanente |
|---|---|
| `MAT-PON-P01` La première traversée | Mesurer l'écart (`01`), fabriquer un tablier de cette longueur (`03`), puis placer le nouveau pont au bon repère de rive (`02`). La passerelle reste ouverte ; la longueur mesurée pilote réellement l'assemblage. |
| `MAT-PON-P02` Les bornes du messager | Ordonner des bornes (`02`), mesurer séparément les deux morceaux A et B du trajet (`01`), puis assembler un tablier de longueur `A + B` (`03`). Le chemin du messager s'inscrit sur la carte ; un autre ordre de pose juste ne change pas la distance. |
| `MAT-PON-P03` Le pont de secours | Mesurer le module abîmé encore posé et la longueur à remplacer (`01`), retirer soi-même ce module puis choisir parmi plusieurs réparations équivalentes (`03`), enfin vérifier sur la bande graduée que le tablier réparé rejoint l'autre rive (`02`). Le module stable reste en place ; une rampe durable est ajoutée sans effacer le premier pont. |

**Contrat de la première traversée à fixer avant les scènes**

La portée est tirée dans l'intersection des domaines de mesure (`01`) et de tablier (`03`).
Les bornes ci-dessous sont inclusives. Les sept paires possibles se combinent chacune avec les
trois niveaux de repérage (`02`) : **21 combinaisons**. Les six autres combinaisons ne sont pas
proposées comme un projet prêt à démarrer ; l'écran permet un choix explicite de réglages
compatibles ou une activité libre, en conservant les préférences de chaque famille.

| Mesure \ Tablier | Découverte | Exploration | Défi |
|---|---|---|---|
| Découverte | 5–8 cm | Incompatible | Incompatible |
| Exploration | 5–12 cm | 10–15 cm | 15 cm |
| Défi | 8–12 cm | 10–25 cm | 15–25 cm |

Le modèle commun conserve deux données distinctes : longueur du pont en cm et numéro de son
emplacement sur la rive. La première est transmise à l'assemblage ; le second figure sur le
panneau du chantier puis se retrouve sur la bande de repérage. Un numéro de borne n'est pas
silencieusement assimilé à une longueur. La pose finale exige le tablier terminé et le repère juste.

Le lot M1 doit fermer les détails suivants dans les modèles :

- `02` : origine et fin de fenêtre, pas, valeurs visibles et nombre de repères compatibles avec
  les prises tactiles. Chaque cible appartient à cette fenêtre ; deux bornes à poser sont distinctes,
  y compris aux extrémités. Les valeurs réellement tirables alimentent l'inventaire audio complet.
- `03`, Exploration : état initial à trois modules avec un module à remplacer, stock de remplacement
  suffisant et conservation de la portée. Le remplacement n'exige aucune perte de travail déjà validé.
- `03`, Défi : deux compositions de longueurs distinctes, avec multiplicité des pièces et stock borné.
  Permuter les mêmes pièces ne constitue pas une seconde solution. Une réponse voisine fausse et
  une bonne réponse différente du témoin figurent dans les cas de validation.
- Projet : version, variables communes, trois étapes, transformations et cadeau conservés ; mêmes
  quantités après aide, pause, fermeture, changement de vue et reprise.

### Moulin des Roues — grouper, distribuer, conserver

| Famille | Action et exemple rejouable | Validation mathématique, aide et génération |
|---|---|---|
| `MAT-MOU-01` Roues en groupes | Monter **4 roues de 3 pales** et constater 12 pales ; on peut aussi répartir 12 pales en **3 roues de 4**. Les roues tournent selon le montage. | Le total réel et la taille de chaque groupe doivent correspondre à la consigne. Accepter additions répétées et disposition rectangulaire ; Gobi entoure une roue puis compte les groupes. Tirer facteurs entiers accessibles, collections finies et deux dispositions possibles seulement si le stock le permet. |
| `MAT-MOU-02` Sacs de farine | Distribuer **18 mesures** également dans **3 sacs** ; déplacer une mesure d'un sac à l'autre modifie la balance visible. Variante : combien de sacs de 6 ? | Vérifier l'égalité de chaque groupe et la conservation des 18 mesures ; un reste n'est proposé que dans une situation explicitement prévue. Gobi aligne les sacs et montre un tour de distribution. Générer des divisions exactes pour l'entrée, puis des restes contextualisés lorsque choisis, sans introduire l'algorithme écrit de division. |
| `MAT-MOU-03` Vanne des parts | Régler une vanne sur **1/2**, puis **1/4 + 1/4** du même réservoir ; retirer un quart pour obtenir le débit voulu. | Contrôler les parts d'un même tout et les sommes ou différences de même dénominateur ; montrer visuellement pourquoi deux quarts remplissent une moitié sans exiger une règle algébrique générale. Gobi juxtapose les secteurs. Générer partitions exactes, résultats entre 0 et 1 et un niveau de comparaison conforme au CE1. |

**Projets durables du moulin**

| Projet | Enchaînement causal et trace permanente |
|---|---|
| `MAT-MOU-P01` La roue immobile | Monter les pales (`01`), régler l'eau nécessaire à leur mouvement (`03`), puis distribuer la farine produite (`02`). La roue réparée tourne ensuite ; quantité produite et répartition se correspondent. |
| `MAT-MOU-P02` La tournée des sacs | Monter une première disposition de roues (`01`), transformer ce montage en une **autre** disposition qui garde le même total (`01`), par exemple `4 × 3 ↔ 3 × 4`, puis distribuer exactement les 12 mesures produites entre les sacs (`02`). Les sacs livrés s'ajoutent au décor ; le nombre à distribuer vient du montage, et l'échange de disposition est réversible. |
| `MAT-MOU-P03` La réserve du moulin | Partager le débit du réservoir (`03`), répartir la production (`02`) et comparer deux montages équivalents (`01`). Une réserve apparaît ; l'enfant peut refaire le projet avec une autre solution sans perdre la restauration. |

### Marché des Échanges — payer, rendre, décider

| Famille | Action et exemple rejouable | Validation mathématique, aide et génération |
|---|---|---|
| `MAT-MAR-01` Étals et porte-monnaie | Former **48 €** avec pièces et billets fictifs ; échanger dix pièces de 1 € contre un billet de 10 € sans changer la somme. | La valeur est la somme des dénominations, pas le nombre d'objets. Gobi regroupe les pièces par dix et montre l'échange réversible. Tirer un montant entier de 0 à 100 €, un stock suffisant et plusieurs compositions lorsque demandées ; avec centimes, utiliser les pièces réelles et les relations € / centimes du CE1. |
| `MAT-MAR-02` Monnaie à rendre | Un objet coûte **17 €**, l'enfant donne 20 € et prépare **3 €** de rendu, ou choisit de payer exactement. | Valider `donné − prix = rendu` et la conservation entre les trois plateaux, quelle que soit la combinaison de pièces. Gobi rapproche le prix du montant donné avec une ligne de nombres. Générer des transactions solvables, un stock de rendu réalisable et, en mode centimes, des conversions exactes en centimes ; éviter tout prix impossible à afficher. |
| `MAT-MAR-03` Préparer les paniers | Avec **25 €**, choisir des articles à 8 €, 9 € et 7 € pour une commande donnée, puis essayer une autre combinaison respectant le budget. | Valider les besoins de la commande et `somme des prix ≤ budget` ; montrer le reste, accepter toutes les sélections valides. Gobi déplace les étiquettes dans un tableau et aide à additionner. Tirer au moins une solution et, si annoncé, au moins deux ; empêcher que le panier « facile » soit l'unique choix valable par hasard. |

**Projets durables du marché**

| Projet | Enchaînement causal et trace permanente |
|---|---|
| `MAT-MAR-P01` Rouvrir les étals | Constituer la caisse (`01`), acheter les fournitures nécessaires (`03`) puis rendre la monnaie d'une première vente (`02`). Les étals restent ouverts ; la caisse de départ est celle utilisée ensuite. |
| `MAT-MAR-P02` La commande des voisins | Composer deux paniers possibles (`03`), payer le panier choisi (`01`) et calculer le rendu éventuel (`02`). La livraison apparaît sur la carte ; les deux stratégies de paiement sont recevables. |
| `MAT-MAR-P03` La journée des échanges | Échanger des pièces sans modifier le capital (`01`), servir une commande (`03`) et vérifier le solde après rendu (`02`). Une enseigne durable s'allume ; chaque mouvement d'argent est réversible avant validation. |

### Chantier des Formes — construire, comparer, vérifier

| Famille | Action et exemple rejouable | Validation mathématique, aide et génération |
|---|---|---|
| `MAT-CHA-01` Plans à tracer | Poser des segments sur quadrillage pour construire un rectangle de **6 × 3 carreaux** ou un carré ; déplacer un sommet met le plan à jour. | Vérifier côtés, longueurs et angles droits selon la figure visée ; la rotation et la position libre sont acceptées. Gobi montre comment poser la règle ou une équerre virtuelle, sans tracer à la place de l'enfant. Générer des dimensions entières visibles et des figures constructibles ; l'outil numérique ne doit pas faire passer un tracé approximatif pour une mesure exacte. |
| `MAT-CHA-02` Blocs et patrons | En Découverte, reconnaître un cube et compter ses six faces sur une illustration manipulable. Ensuite, placer six carrés sur une grille 2D pour former un patron, puis voir son pliage illustré. | Valider la configuration 2D contre une **bibliothèque versionnée de patrons et de contre-exemples vérifiés** ; accepter toutes les configurations valides prévues par le modèle. Le pliage est une suite d'images déterministe associée au patron, sans moteur physique ni construction 3D générale. Gobi déplie un modèle et nomme face, arête et sommet. Les exemples et contre-exemples sont contrôlés avant publication. |
| `MAT-CHA-03` Contrepoids | Sur une balance, comparer deux charges puis former une masse cible avec des poids marqués, par exemple **1 kg = 1 000 g**. | L'équilibre est une égalité de masses, indépendante de la forme des objets ; comparer les deux plateaux et accepter plusieurs décompositions. Gobi montre un poids de référence et permet de remplacer 1 kg par 1 000 g. Générer des masses entières et un stock réalisable ; ne pas simuler une estimation de poids comme une mesure physique réelle. |

**Projets durables du chantier**

| Projet | Enchaînement causal et trace permanente |
|---|---|
| `MAT-CHA-P01` L'atelier des plans | Tracer le plan (`01`), choisir les blocs qui peuvent le réaliser (`02`) et vérifier la charge des matériaux (`03`). L'atelier est réparé ; dimensions et quantité de matériaux restent liées. |
| `MAT-CHA-P02` La tour légère | Construire un cube à partir d'un patron (`02`), équilibrer ses blocs (`03`) puis tracer sa base carrée (`01`). La tour reste debout ; une autre orientation correcte du patron est acceptée. |
| `MAT-CHA-P03` Le toit des artisans | Réviser un plan après changement de dimensions (`01`), réassembler les solides nécessaires (`02`) et remplacer un contrepoids par une masse équivalente (`03`). Le toit coloré demeure, même si l'enfant choisit ensuite une autre conception valide. |

### Horloge des Voyages — lire, composer, organiser le temps

| Famille | Action et exemple rejouable | Validation mathématique, aide et génération |
|---|---|---|
| `MAT-HOR-01` Cadrans à remettre | Déplacer les aiguilles pour afficher **14 h 15**, puis associer ce cadran à **2 h et quart de l'après-midi**, dans une scène qui annonce explicitement l'après-midi. | Valider la position des aiguilles et l'équivalence entre le contexte d'après-midi et l'écriture 24 h, pas seulement l'étiquette numérique. Gobi matérialise le passage d'un quart de tour. Tirer heures entières, demi-heures et quarts d'heure du CE1 ; l'audio et le décor situent toujours matin, après-midi ou soirée avant de demander 14 h plutôt que 2 h. |
| `MAT-HOR-02` Rubans de durée | Placer un ruban de **15 min**, puis un de **30 min**, sur une frise commençant à 8 h 30 ; découvrir que l'arrivée est à **9 h 15**. | La somme des durées et l'heure d'arrivée doivent coïncider ; `15 + 30` et `30 + 15` sont acceptés. Gobi découpe 1 h en moitiés ou en quarts. Générer des intervalles d'une même journée, aux bornes entières, demi-heures ou quarts d'heure ; pas de compte à rebours de jeu. |
| `MAT-HOR-03` Tableau des départs | Placer trois trajets sur un tableau à double entrée « destination × moment de la journée », puis choisir un départ compatible avec une arrivée voulue. | Valider la case par ses deux critères et l'ordre chronologique ; toutes les options réellement compatibles sont admises. Gobi pointe ligne et colonne puis montre la frise. Générer des horaires cohérents et au moins une solution ; « matin », « après-midi » ou « soirée » sont énoncés dans le tableau et l'audio, sans connaissance cachée du récit. |

**Projets durables de l'horloge**

| Projet | Enchaînement causal et trace permanente |
|---|---|
| `MAT-HOR-P01` La grande aiguille | Régler le cadran (`01`), avancer d'un ruban de durée (`02`) puis reporter la nouvelle heure sur le tableau (`03`). L'horloge réparée reste animée ; l'heure finale vient du geste précédent. |
| `MAT-HOR-P02` La tournée des compagnons | Lire les départs (`03`), choisir une durée de trajet (`02`) et régler l'heure d'arrivée (`01`). Un chemin lumineux rejoint les lieux visités ; plusieurs horaires compatibles sont acceptés. |
| `MAT-HOR-P03` La fête au bon moment | Choisir parmi plusieurs départs (`03`), composer quarts et demi-heures (`02`) et aligner les cadrans de la place (`01`). Les fanions restent en place ; chaque autre planning compatible peut être essayé. |

## Mutualisation et preuve attendue

Les familles partagent un petit ensemble de composants : objets à grouper/échanger (`JAR-01`, `MOU-01`, `MOU-02`, `MAR-01`, `CHA-03`), pièces fractionnaires (`JAR-02`, `MOU-03`, `HOR-02` pour les quarts d'heure), bandes graduées (`PON-01` à `03`, `HOR-02`), tableaux (`JAR-03`, `HOR-03`) et construction (`CHA-01`, `CHA-02`). Les *contrats de validation* restent propres aux grandeurs : une égalité de valeur monétaire ne prouve pas une égalité de masse, une aire fractionnaire ne se valide pas par un nombre de tuiles, et un horaire ne se déduit pas d'un simple ordre visuel. Les 18 projets composent ces familles avec des variables transmises d'une étape à la suivante ; la narration donne la raison d'agir, sans ajouter 18 moteurs.

Pour chaque famille, conserver quelques instances fixes de référence et des graines de génération couvrant une solution, plusieurs solutions, échange réversible, cas limite et aide. Vérifier l'oracle mathématique indépendamment du geste tactile, puis observer l'enfant ou un parent pour savoir si la consigne, l'image et l'aide sont comprises. Une réussite automatique ou un tableau de réponses exactes ne suffit pas à certifier cette compréhension. Le choix des paramètres exacts, des dialogues, des assets et de l'ordre de réalisation appartient à la spécification et au plan, puis au visa parent pour les nouveaux contenus publiés.
