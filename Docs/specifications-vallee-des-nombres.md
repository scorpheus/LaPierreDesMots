# La Vallée des Nombres — spécifications du mode mathématiques

Date : 27 septembre 2026. Statut : gameplay validé par le parent, contrat pédagogique conservé ; six lieux, 18 familles,
18 projets et fête implantés, qualification finale en cours. Les voix sont reportées par le
parent ; les cinq nouveaux décors attendent son visa esthétique.

Le parent a confirmé la zone libre au nord de la Pierre centrale, approuvé le gameplay proposé,
puis demandé les spécifications et la planification, avec liberté d'innovation et délégation
adaptée au coût. La présente extension porte sur les maths ; les quatre originaux restent intacts.

Documents propriétaires :

- ce fichier : parcours, règles communes, données, audio, intégration et critères d'acceptation ;
- [catalogue des jeux](catalogue-jeux-mathematiques.md) : familles, exemples, domaines et projets ;
- [plan de réalisation](plan-vallee-des-nombres.md) : lots, dépendances, fichiers, agents et preuves ;
- [état courant](etat-courant-et-file.md) : seule file active et état d'avancement du chantier.

Les réglages de jeu ci-dessous sont des choix de conception explicites, pas des seuils de maîtrise
pédagogique. Le catalogue distingue le programme scolaire et notre sélection de jeux.

État technique au 27 septembre : les migrations SQLite 013 (maths et reprises) et 014 (choix
de niveau) sont intégrées. Le niveau choisi est conservé par profil, génération maths et famille ;
la vue en montre un exemple concret. Pendant un défi, le changement attend la sauvegarde du
projet figé, puis ouvre une activité libre au niveau demandé, sans créer de tentative pour le
défi interrompu. Un parcours automatisé des 57 étapes des 18 projets et de la fête, avec gestes
DOM et aide de Gobi, est passé ; la campagne finale et les visas restent à conclure.

## 1. Résultat attendu et périmètre

L'enfant peut rejoindre la vallée dès sa première partie, choisir un lieu et une difficulté,
résoudre une situation en manipulant, voir son action transformer le lieu et reprendre sa lecture.
La vallée possède une aventure finie et des activités renouvelables hors ligne.

La première version complète comprend :

- six lieux ouverts dès le départ : jardin, ponts, moulin, marché, chantier, horloge ;
- les 18 familles et les 18 projets du catalogue, puis une fête de conclusion ;
- un accès par carte et campement, la navigation entre lecture et maths et deux reprises conservées ;
- des exercices générés à partir de modèles validés, avec nombres, situation et réponse cohérents ;
- Gobi, les compagnons déjà acquis, les voix et réglages du profil ;
- progression propre, transformations durables, souvenirs au coffre et objets de campement ;
- conservation, export/import, suivi parent et fonctionnement PWA hors ligne.

La tranche initiale du plan éprouve trois familles et un projet ; elle ne remplace pas cette
livraison complète. Restent hors de cette version : multijoueur, synchronisation entre appareils,
nouvelle voix clonée, reconnaissance manuscrite, classement, achat, énergie, monde physique libre,
contenu produit par un LLM pendant la partie et refonte des six régions de lecture.

## 2. Histoire, lieux et progression du monde

### 2.1 Une vallée à faire vivre

Gobi découvre des jardins délaissés, des passages incomplets et un moulin à l'arrêt. L'enfant
prépare, mesure, construit et répartit ce qui manque. Les transformations montrent l'utilité
du raisonnement : canal qui conduit l'eau, pont terminé, sacs répartis, livraison arrivée.

Le retour magique des noms et les six Éclats appartiennent à la quête de lecture. La vallée
apporte des réalisations concrètes ; elle ne crée pas un septième Éclat nécessaire à la Pierre.
La Grisaille reste une absence, sans ennemi ni menace. Les installations acquises ne se dégradent
pas pendant l'absence de l'enfant et aucune récolte ne meurt.

Chaque lieu possède trois projets ordonnés localement. Tous les lieux et toutes leurs familles
sont jouables immédiatement ; seul le récit d'un lieu conserve un ordre pour que les transformations
aient un sens. Les activités libres donnent accès aux familles avant leur projet narratif.
La difficulté choisie n'empêche jamais de finir un projet ou de participer à la fête.

### 2.2 Aboutissement et rejouabilité

Un projet comporte de trois à cinq défis cohérents, assemblés dans une version éditoriale fixe.
Chaque défi terminé est enregistré. Une contribution visible persiste à son emplacement ; la
dernière étape achève le projet. Le nombre de défis est un réglage de rythme, pas un critère d'acquis.

Les 18 projets achevés ouvrent la préparation de la fête : une mission de synthèse de trois défis,
sur des familles déjà pratiquées et à des difficultés choisies. Les objets nécessaires à la fête
existent dans tous les profils, même sans compagnon rallié. Elle possède sa propre conclusion,
rejouable ; elle ne modifie pas l'ouverture ou la conclusion de la Pierre des Mots.

Après la fête, récoltes, commandes, assemblages et rendez-vous continuent. Les activités produisent
des variantes, sans remettre les bâtiments à zéro. Chaque cadeau a une attribution unique par
profil et projet ; refaire le même projet permet de revoir la scène et d'améliorer ses étoiles.

### 2.3 Personnages

Gobi accompagne toutes les familles dès le début : il regarde, désigne, bondit, montre une
décomposition. Il garde son stade réel et son anatomie ; on ne lui dessine pas de mains pour manipuler.
Les objets bougent sous le geste de l'enfant ou dans une démonstration clairement signalée.

Les compagnons déjà ralliés peuvent être choisis avant une mission : Roc accompagne le chantier,
Filou les mécanismes, Plume les livraisons, Bulle leur contexte. Leur présence varie les répliques et
la mise en scène ; toutes les stratégies d'aide nécessaires restent disponibles avec Gobi seul.
Un compagnon futur n'est ni révélé par anticipation ni crédité par une réussite mathématique.

## 3. Parcours et navigation

### 3.1 Entrer

Sur la carte, la vallée occupe l'espace nord confirmé par le parent. Son repère possède une
silhouette et un libellé distincts, immédiatement actifs, même quand le reste du monde est grisé.
L'ancre exacte sera mesurée sur le décor final ; elle ne réutilise pas l'ancre de conclusion centrale.
Les six prises existantes et la Pierre restent accessibles. Une liste de destinations offre le
même accès si la carte est difficile à viser ; aucun zoom n'est requis pour cliquer.

Au campement, une entrée maths et les actions de reprise sont visibles. Si deux aventures sont
en cours, « Reprendre la lecture » et « Reprendre les maths » les distinguent explicitement.
Sans reprise maths, l'entrée ouvre la vue des six lieux. Le prochain projet conseillé est visible,
mais toucher un autre lieu démarre son choix d'activité directement.

### 3.2 Choisir et jouer

La vue d'un lieu présente son état, son projet actuel, les familles libres et la difficulté mémorisée.
Le choix d'une famille montre un exemple concret de son niveau avant de commencer. L'enfant peut
garder Gobi et partir immédiatement ; le choix d'un compagnon ne rajoute pas d'écran obligatoire.

Deux entrées sont équivalentes du point de vue des gestes et de l'aide :

- **une activité** : un défi, son résultat, puis rejouer une variante, poursuivre le projet ou sortir ;
- **un projet** : ses défis liés, une transformation finale, puis prochain projet ou retour.

Les nombres d'un projet viennent d'un problème commun. Par exemple, une commande fixe le nombre
de paniers et de fruits ; le total est réutilisé pour préparer, répartir puis livrer. Les étapes
suivantes ne changent pas silencieusement les quantités et n'inventent pas un stock manquant.
Les paramètres des étapes liées sont tirés ensemble avant démarrage, dans l'intersection de leurs
contraintes. Chaque projet déclare des combinaisons de niveaux compatibles ; une intersection
vide est un défaut de contenu à détecter avant publication. Le choix proposé montre les niveaux
des familles concernées et ne remplace pas silencieusement leurs difficultés mémorisées.

Si les préférences courantes ne permettent pas un projet commun, l'écran montre des exemples
de combinaisons possibles et laisse choisir les réglages de ce projet, ou une activité libre.
Aucune partie insoluble n'est démarrée. Le choix ponctuel du projet ne modifie les préférences
de chaque famille que sur une action explicite. Reprendre un projet suspendu propose ses réglages
d'origine ; l'enfant peut ainsi toujours le finir avec l'aide de Gobi.

### 3.3 Sortir et reprendre

Une commande de pause est disponible pendant tout défi. Elle permet d'aller au campement,
à la carte ou à l'autre activité, après sauvegarde de l'état. L'enfant n'a pas à terminer pour sortir.
Une sortie volontaire conserve le travail ; elle ne fabrique pas une réussite ni une tentative ratée.
La clôture proposée d'une session jouée est une réussite réalisable avec l'aide, jamais obligatoire
pour fermer. Un changement de lieu peut mettre le projet en attente ; un seul défi maths reste actif.

Reprendre restaure le même problème, les objets placés, l'étape, les erreurs déjà validées et l'aide.
Une reprise ne relance pas d'elle-même un son ou une animation longue. Le bouton d'écoute reste
disponible. Quitter les maths conserve la reprise lecture, et réciproquement, y compris après fermeture.

Changer de difficulté pendant un défi en propose un nouveau, après mise à l'abri du projet courant.
Dans un projet, les étapes non jouées peuvent être réassemblées seulement si les nouvelles
contraintes respectent les quantités déjà fixées. Sinon, le projet reste suspendu et une activité
libre au niveau choisi est proposée ; sa reprise retrouve exactement les préparatifs conservés.
Un seul défi est actif à la fois ; un projet suspendu peut coexister avec cette activité libre.
Le défi remplacé ne reçoit aucun résultat ; les étapes de projet déjà terminées restent acquises.

Dans l'implantation actuelle, le changement en cours conserve toujours le projet et son instance
exacte, puis propose une activité libre. Le réassemblage conditionnel des étapes non jouées décrit
ci-dessus n'est pas utilisé dans ce parcours.

## 4. Contrat commun des jeux

### 4.1 Chercher avec des objets

Quatre idées structurent les nouveaux jeux :

1. **Transformer sans perdre la quantité** : ouvrir une dizaine, réunir des unités, répartir un stock.
2. **Construire sous contrainte** : atteindre une longueur, une forme, un total avec plusieurs solutions.
3. **Faire un essai réversible** : poser, déplacer, retirer, annuler ; observer ce qui change.
4. **Réutiliser un résultat** : le calcul d'une étape fournit les ressources de la suivante.

Le code gère des nombres entiers, des grilles et des fractions exactes ; l'animation illustre le
résultat. Un moteur physique ne décide pas si un partage est juste. Les manipulations disponibles
et la représentation changent avec le domaine numérique pour éviter cent gestes sur cent objets.
Les grandes collections utilisent des paquets, des cases ou des groupes clairement dénombrables.

### 4.2 Valider et corriger

Une action « C'est prêt » valide une proposition complète. Déplacer, essayer, compter, ouvrir un
paquet, annuler ou écouter ne compte pas comme erreur. Une action incomplète invite à finir sans
enregistrer de réponse fausse. Une réponse vide est toutefois une réponse complète si la question
porte explicitement sur zéro ; « C'est prêt » doit alors permettre de la valider. Une validation
complète incorrecte compte une erreur et montre
la conséquence utile : panier encore vide, différence de longueur, quantité restante.
« Incomplète » désigne une décision requise non renseignée, pas une quantité trop petite :
valider sept unités pour une cible de huit est une réponse complète incorrecte. Ce point doit
être déclaré par famille pour que le jeu ne transforme pas toute erreur en simple absence de réponse.

Le validateur accepte toutes les solutions autorisées, sans imposer la disposition de l'oracle.
Quand plusieurs pièces produisent le bon total, chacune est valide sauf si une contrainte explicite
en demande une particulière. Un double clic ne valide qu'une fois. Les animations de récompense
ne peuvent pas déclencher une seconde écriture.

### 4.3 Aide, étoiles et absence d'échec

La consigne, sa réécoute, le matériel de manipulation et une règle graduée prévue par le jeu sont
des outils neutres. Gobi apporte une aide spécifique à la réponse : indice puis démonstration.
L'aide reste disponible gratuitement et son niveau ne redescend pas au cours d'une tentative.

Après deux validations incorrectes, Gobi propose un indice ; après trois, il guide le geste correct,
que l'enfant accomplit. On conserve cette règle existante. La pause suspend les temporisations ;
prendre son temps ou faire une manipulation pertinente ne provoque pas une solution automatique.
Les délais éventuels doivent être déclarés et justifiés, sans reprendre aveuglément ceux d'un quiz.

Le barème existant de `partage/src/etoiles.ts` est réutilisé :
`1 + (sans aide) + (sans erreur)` pour un défi terminé. Une réussite aidée sans erreur vaut donc
deux étoiles. La meilleure performance antérieure reste visible ; rejouer ne la fait pas baisser.
Les étoiles sont attachées à une famille, un niveau et un projet identifiable, pas à un catalogue
infini d'instances exposé à l'enfant. L'historique exact des tentatives reste consultable au parent.

Ni score négatif, ni vies, ni compte à rebours obligatoire, ni récompense pour la vitesse ou la durée.
Les conséquences d'une erreur sont réversibles et le défi reste soluble sans recommencer tout le projet.

## 5. Difficulté et observations pédagogiques

Chaque famille déclare ses domaines dans le catalogue : nombres admissibles, représentation,
opérations, contraintes, cas exclus et aide. Des intitulés enfant simples décrivent le choix ;
le niveau interne possède un identifiant stable. Il n'existe pas de difficulté globale supposée
équivalente entre monnaie, calcul et géométrie.

Les situations commencent avec des représentations concrètes. Des variantes permettent ensuite
d'anticiper puis de vérifier avec le matériel. L'enfant peut reprendre un niveau plus simple à
tout moment. Une suggestion de changement de niveau doit être acceptée ; aucun changement caché.
La lecture de textes longs n'est pas un prérequis pour une tâche de maths : information orale,
quantités lisibles, unités explicites, pictogrammes compréhensibles et lexique contrôlé.

Le suivi conserve famille, niveau, notion réellement mobilisée, erreurs validées, aide, solution
et contexte. Une solution montrée puis exécutée est une réussite accompagnée ; elle ne devient
pas une preuve d'autonomie. Les statuts exposés sont « essayé », « réussi avec aide » et
« réussi seul », avec détail des occasions observées. Ils ne signifient pas « compétence maîtrisée ».

La première version ne calibre pas un nouveau BKT et ne recycle pas ses probabilités de devinette
de lecture pour des manipulations à solutions multiples. Aucun seuil de maîtrise maths n'est
inventé. Un futur modèle de maîtrise nécessiterait des paramètres motivés et sa propre qualification.
Les codes `math.*` nécessaires seront préparés en brouillon ; leur ajout au référentiel protégé
sera présenté avec le catalogue concret avant intégration.

## 6. Génération et variété

### 6.1 Ce qui est généré

Les modèles de problème, dialogues, objets, opérations et contraintes sont éditoriaux et versionnés.
Le jeu tire des paramètres à l'intérieur de leurs domaines validés. Aucun texte libre, image ou
voix n'est généré pendant la partie. Une variante est une instance d'un modèle précis.

L'instance contient au minimum : identifiant, version du modèle et du générateur, graine,
famille, niveau, paramètres résolus, stock disponible, état initial, consigne structurée,
unités, références audio, règles de validation, aides et contexte de projet.
Les témoins de solution employés pour construire ou tester le problème sont distincts de l'énoncé
distribué à la scène. Le validateur contrôle les paramètres et l'état conservé ; il accepte toutes
les solutions recevables et n'exige pas de recopier le témoin du générateur.

La graine passe par `Alea`. La même graine, la même version et les mêmes entrées produisent la
même instance. Deux graines différentes peuvent mathématiquement mener au même exercice ;
la variété se vérifie sur la sélection et les contraintes, pas sur une fausse garantie d'unicité.

### 6.2 Invariants du générateur

- Générer une solution réalisable puis construire le problème, ou prouver la solvabilité avant affichage.
- Garder tous les nombres, résultats intermédiaires et unités dans le niveau choisi.
- Soustraction sans résultat négatif dans les familles initiales ; diviseur jamais nul.
- Partage exact dans le modèle qui l'annonce ; reste explicite uniquement dans un modèle qui l'enseigne.
- Fractions définies par parts égales d'un même tout ; calcul exact par numérateur/dénominateur.
- Monnaie calculée en centimes entiers ; longueurs dans une unité canonique, jamais à la taille de l'écran.
- Pièces géométriques et cibles sur une grille logique ; rotations acceptées selon la consigne explicite.
- Horaires et durées construits dans les domaines du catalogue, sans ambiguïté matin/soir.
- Ressources et pièces suffisantes ; distracteurs distincts et aucun indice visuel accidentel de la réponse.
- Aide et démonstration dérivées de l'instance réellement présentée, sans modifier sa question.

Un générateur utilise une construction bornée. Si ses contraintes ne peuvent être satisfaites,
il sélectionne une instance de secours validée du même niveau ; il ne boucle pas indéfiniment,
ne baisse pas silencieusement la difficulté et ne crédite pas une réussite.

### 6.3 Limiter la répétition

Réglage initial de sélection : éviter la même signature de problème parmi les cinq dernières
instances de la famille, quand son domaine permet ce choix ; conserver cet historique au rechargement.
La signature décrit opération, nombres et inconnue, indépendamment de la disposition décorative.
Si le domaine est trop petit, varier d'abord la représentation puis autoriser la répétition.

La sélection implantée examine au plus douze candidats : elle retient une signature de problème
nouvelle si possible, sinon une représentation matérielle nouvelle parmi les cinq dernières
instances, puis une répétition valide. `MAT-HOR-03` varie les horaires cibles ; `MAT-JAR-02` et
`MAT-MOU-03` tirent bande ou disque avec le générateur v2. Leurs anciennes instances v1 restent
lisibles et résolubles.

Un projet varie les gestes et le rôle de l'inconnue. Une séance libre peut rester sur une famille
choisie : le jeu ne force pas une autre notion au nom de la diversité. La révision conseillée utilise
les observations récentes et la demande du parent, sans créer d'obligation quotidienne.

## 7. Voix, images et interface

### 7.1 Consignes variables entièrement audibles

Chaque consigne et chaque aide dispose d'un bouton d'écoute en un tap. L'audio contient les nombres
et unités utiles ; « regarde le nombre » ne remplace pas leur lecture. Les références pointent
sur des fichiers préproduits, servis hors ligne. Aucune synthèse vocale à l'exécution.

Les textes fixes des projets sont rendus en clips complets. Pour les paramètres variables, une
consigne structurée assemble des segments préproduits, dans un ordre validé : phrase, nombre,
nom avec son accord, seconde proposition si nécessaire. Les nombres sont enregistrés comme mots
entiers nécessaires au domaine, sans concaténation naïve de chiffres. Fractions, monnaie et heure
ont leurs propres modèles de phrase ; « un », pluriels, euros/centimes et liaisons sont vérifiés.

Le manifeste de contenu calcule la fermeture de tous les segments nécessaires aux niveaux livrés.
Le volume exact, les tailles et durées sont inventoriés avant production. Les raccords sont écoutés
sur les cas singuliers, pluriels et bornes ; la justesse textuelle seule ne valide pas l'écoute.
Un segment absent empêche de publier le modèle concerné. Après navigation, le son précédent
s'arrête ; répétition, pause et changement de profil ne superposent pas deux consignes.

### 7.2 Composition et gestes

Les scènes reprennent le monde illustré, les polices et la palette approuvés. Les chiffres,
graduations, pièces comptables et zones tactiles sont des éléments précis rendus par le code,
posés sur un décor. Aucun chiffre pédagogique n'est peint dans une image générée.

Un geste de glisser possède toujours un équivalent toucher la pièce puis toucher la destination,
et un parcours clavier. Annuler la dernière manipulation est visible. Le zoom navigateur et les
réglages du profil restent utilisables ; la rotation du téléphone conserve le problème et les objets.
Les règles de cibles et tolérance de dépôt restent celles de l'annexe T, pas une taille choisie
pour faire entrer plus d'objets. Si nécessaire, regrouper les quantités ou simplifier la composition.

Consigne et champ de calcul restent calmes. Les mouvements de personnages et effets attendent la
validation ; avec animations réduites, l'état final est immédiat et compréhensible. Une couleur
ne constitue jamais le seul indice de catégorie, de quantité ou de justesse. Les formes nouvelles
de décor et les transformations sont soumises au visa esthétique habituel sur un échantillon cohérent.

## 8. Progression, récompenses et suivi parent

Une réussite termine un défi ; la fin des étapes termine le projet. Cette progression narrative
accepte l'aide et se recalcule depuis les réussites enregistrées. Un cadeau prévu par le projet
est attribué une fois, après écriture durable de sa réussite. Il ne dépend ni d'un compteur de
variantes rejouées ni du temps passé. Les acquisitions sont monotones.

La vallée utilise les collections existantes avec une origine maths explicite : six souvenirs
de lieu, six objets de campement et un souvenir final de fête au maximum pour cette version.
Attribution : souvenir au premier projet du lieu, objet au troisième, souvenir final à la fête.
Les deuxième projets transforment le lieu sans créer une monnaie supplémentaire. Les objets
ajoutés au campement doivent respecter sa composition et ses prises tactiles.
Leur propriété est enregistrée dans les gains maths ; l'affichage réunit les collections des
deux domaines sans mélanger leurs écritures. Une remise à zéro maths peut ainsi retirer ses
propres cadeaux sans toucher aux souvenirs de lecture.

Réussir une activité libre crée ses étoiles et observations ; cela ne termine pas un projet dont
les autres étapes n'ont pas été jouées. Les cadeaux ne sont ni achetés ni perdus. Les six Éclats,
les graphèmes, les formes/stades de Gobi, le mur des mots et le calendrier de révision lecture
ne reçoivent aucun crédit d'une tentative maths.

Le parent dispose d'un filtre Lecture / Maths, avec projets, familles, niveaux choisis,
réussites autonomes ou aidées, erreurs observées et reprise. « Travailler ceci » conseille une
famille au prochain passage ; l'enfant garde son choix. Les totaux lecture conservent leur
définition. Export, import et suppression volontaire du profil couvrent les deux domaines.
La télémétrie nécessaire reste locale ; aucune donnée enfant n'est envoyée à un modèle externe.

Les remises à zéro sont explicites et protégées par le contrôle parent : « lecture », « maths »,
« toute la progression » et remise à zéro complète existante. La portée historique `progression`
signifie toute la progression et son libellé cite désormais les deux domaines ; `complete`
conserve sa portée générale, réglages inclus selon son contrat existant. Les nouvelles portées
partielles n'effacent que le domaine choisi. Une suppression de profil retire les deux domaines.
L'import d'une base remplace les deux domaines ensemble et le dit avant confirmation.

## 9. Architecture et conservation des données

### 9.1 Frontières

La vallée est une destination indépendante, pas un ajout dans l'ordre phonologique de `CodeRegion`.
La carte sait ouvrir cette destination sans la compter parmi les deux régions de lecture ouvertes,
les six Éclats ou les masques de la Pierre. Les moteurs maths séparent toujours règles pures,
contenu déclaratif et scène. Mutualiser les gestes utiles sans imposer un moteur unique à six jeux.

Le module proposé `partage/src/mathematiques/` porte génération, validation, projets et projections.
Les scènes proposées vivent sous `client/src/mathematiques/`. Les contrats de domaine et de
persistance sont fixés au lot M1 du plan avant de paralléliser ces deux écritures.

La route actuelle des tentatives déclenche BKT, Leitner et récompenses de lecture. Les maths
possèdent un service d'enregistrement distinct, exposé de façon équivalente par les ports local
et HTTP. Une réussite maths ne peut pas traverser accidentellement la cascade lecture.

### 9.2 Journal et état de reprise

La reprise durable lecture constitue une extension nécessaire : l'état du moteur actuel reste
en mémoire et le rechargement ne restaure pas le nœud commencé. Le lot M3 conserve plan de sortie,
paquet/version, graine, objets/actions, erreurs et aide pour les 14 moteurs. Il suspend le temps
actif pendant les maths et restaure l'état sans rejouer une soumission ou un effet externe.
Les gestes et résultats reprennent ; la position du pointeur, la frame d'animation et le milieu
d'un son ne sont pas des données à conserver. La preuve est propre à chaque moteur.

Décision de conception : deux journaux de tentatives dans la même base. `tentatives` reste la
source de vérité de la lecture ; `tentatives_maths` devient celle des maths, avec le même contrat
append-only. Chaque projection se recalcule depuis son journal. Cela étend l'invariant du projet
à la nouvelle matière sans modifier les anciennes lignes ni créer des nœuds de lecture factices.
Une vue réunie peut servir à l'historique parent, jamais à une cascade de récompenses commune.

Justification : le journal actuel exige nœud, exercice, moteur et habillage de lecture ; ses
lecteurs et recalculs ne filtrent pas de domaine. Y injecter des maths exposerait BKT, Leitner,
Éclats, formes et exports à des effets parasites. La séparation s'applique donc dès l'écriture,
dans les services, les types d'API et les tables, plutôt que dans le seul affichage.

Tables implantées par la migration 013 : `instances_maths` (énoncé immuable), `actions_maths` (gestes durables ordonnés),
`reprises_maths` (état et révision), `tentatives_maths` (conclusions immuables),
`progression_maths` et `recompenses_maths` (projections recalculables), ainsi que les sessions et
la progression des projets. La migration 014 ajoute `preferences_niveaux_maths`, choix propre à
chaque famille et génération, inclus dans l'export/import SQLite et la remise à zéro maths.
La reprise lecture possède sa propre table `reprises_lecture`, avec génération lecture,
révision, version du contrat et du moteur, et instantané. Le contrat des projets conserve leur
identité, version éditoriale, étapes, variables fixées et définition du cadeau attribué. Un recalcul
ne peut pas déduire un ancien gain uniquement depuis la version actuelle du catalogue.
L'instance est enregistrée avant son premier affichage. Une nouvelle partie voulue obtient une
identité distincte même avec la même graine. Une conclusion est unique par instance ; réutiliser
sa clé avec une réponse différente produit un conflit explicite, jamais une réécriture.

L'état mutable d'une partie inachevée est un point de reprise, pas une réussite. Il conserve le
profil et sa génération, la révision, l'instance complète, le projet et son étape, les objets,
les validations déjà faites, l'aide, les étoiles des étapes terminées et l'historique de sélection.
La graine seule ne suffit pas : l'instance résolue et sa version sont conservées même si le
générateur change dans une mise à jour.

Chaque geste de manipulation terminé est persisté avant d'être considéré comme durable ; pas
besoin d'écrire chaque pixel d'un glisser. Quitter par l'interface attend cette persistance.
Une fermeture brutale reprend au dernier geste confirmé. La soumission possède un identifiant
stable indépendant du nombre de réémissions réseau ; réponse perdue, double clic et reconnexion
ne créent ni double tentative ni double cadeau.

Écriture de tentative, avance de projet, attribution de cadeau et mise à jour de reprise sont
atomiques. La célébration suit l'accusé durable. Un cache UI n'est pas une preuve d'enregistrement.
Les anciennes réémissions d'un profil réinitialisé sont refusées par sa génération de domaine.
`generation_progression` reste celle de la lecture ; `generation_maths` est indépendante.
Les deux générations sont exposées à la lecture/création du profil. Leur contrôle précède la
recherche d'un accusé idempotent afin qu'une ancienne réponse ne revive pas après un effacement.

Contrat d'API implanté : `GET /api/mathematiques/etat`,
`PUT /api/mathematiques/niveaux`, `POST /api/mathematiques/parties`,
`POST /api/mathematiques/projets`, `GET /api/mathematiques/parties/:id`,
`POST /api/mathematiques/parties/:id/actions`, `POST /api/mathematiques/parties/:id/pause`,
`POST /api/mathematiques/parties/:id/terminer` et `GET /api/parent/:profil/mathematiques`.
Chaque écriture porte profil, génération et clé de geste. Manipuler, mettre en pause et conclure
portent aussi l'identité et la révision de l'instance ; mémoriser un niveau porte la famille et
la révision de ce choix.
Le service valide la réponse avec l'instance stockée ; il ne fait pas confiance à un booléen
« réussi » ni à un nombre d'étoiles fourni par la scène. Les mêmes services servent HTTP et PWA.

### 9.3 Concurrence, migration et erreurs

La PWA conserve son Web Lock SQLite : le second onglet invite à fermer le premier, sans voler
son verrou. En LAN, chaque écriture vérifie génération et révision dans la transaction ; une
révision périmée renvoie un conflit puis recharge l'état durable, sans écraser le travail reçu.
Une divergence n'efface pas les tentatives déjà enregistrées.

La migration conserve les anciennes tentatives et tous leurs résultats, crée un état maths vide
pour un ancien profil et reste transactionnelle. Une ancienne sauvegarde s'importe avec maths
vide ; une sauvegarde récente conserve instances, journaux et reprises des deux domaines.
Un ancien programme refuse une sauvegarde trop récente avec une explication, sans l'importer à moitié.
L'import gèle les files différées des deux domaines. La version maximale et les tables requises
du worker SQLite autonome sont étendues en même temps que la migration serveur.
Une barrière commune couvre tentatives et reprises : suspendre les producteurs, acquitter les
écritures ou refuser clairement l'opération, puis vérifier la base candidate avant permutation.
L'export attend également les écritures confirmées ; un geste encore en attente n'est pas annoncé
comme sauvegardé. Les files ne reprennent qu'une fois la base et les générations déterminées.

La remise à zéro ne peut plus déduire son périmètre de la simple présence de `profil_id`.
Une classification explicite attribue les tables à lecture, maths ou profil partagé ; une table
inconnue bloque prévisualisation et exécution avec diagnostic, avant tout effacement. L'ordre
de suppression respecte les clés étrangères et le décompte des cascades. Les portées partielles
incrémentent seulement leur génération ; les portées générales incrémentent les deux. Aucun reset n'est exécuté sur une base
familiale pour vérifier ce contrat : les essais utilisent des profils et sauvegardes synthétiques.

Les versions d'instances livrées restent lisibles après mise à jour ; supprimer un générateur
n'autorise pas à perdre une partie en cours. Une réparation conserve l'instance et ses preuves.
Un défaut de stockage, quota ou intégrité affiche une action de reprise/export adaptée, sans
effacer localStorage, OPFS ou les journaux et sans afficher une récompense non enregistrée.

### 9.4 Distribution

La même logique fonctionne dans le serveur local et le mode autonome. La PWA embarque tous les
modèles, médias et segments audio annoncés disponibles hors ligne. Le chargement du code maths
est différé afin de préserver le démarrage de la lecture ; la préparation hors ligne rend ce
code disponible avant d'annoncer le jeu prêt. Une mise à jour de contenu attend un point sûr et
garde les ressources nécessaires aux reprises existantes. Pas de nouvelle dépendance présumée.

## 10. Exigences et acceptation

Le plan attribue un lot et des preuves à chaque identifiant. « Vérifié » exige le rapport et le
livrable correspondants ; cette rédaction documentaire ne constitue aucune preuve de jeu.

| ID | Exigence observable | Preuve déterminante à obtenir |
|---|---|---|
| VN-01 | Accès vallée sur profil neuf et tout état de lecture | Parcours réel carte/campement, aucune région lecture requise |
| VN-02 | Passer lecture → maths → lecture conserve les deux travaux | Interruption, fermeture, relance, comparaison des états exacts |
| VN-03 | Six lieux, 18 familles et 18 projets réellement atteignables | Inventaire croisé contenu/routes + parcours de couverture |
| VN-04 | Chaque défi fait agir et accepte les solutions autorisées | Bonne solution différente de l'oracle, voisine fausse, incomplet, annulation |
| VN-05 | Quantités et ressources restent cohérentes dans un projet | Invariants entre étapes et parcours de mission liée |
| VN-06 | Choix de difficulté indépendant par famille | Changer un choix, reprendre ; autres familles et lecture inchangées |
| VN-07 | Aide, écoute et étoiles respectent leur contrat | Table des cas aide/erreur/écoute, réussite guidée et reprise |
| VN-08 | Génération déterministe, soluble et dans le domaine | Propriétés, bornes, épuisement et graine reproductible |
| VN-09 | Variété utile, sans boucle de génération | Historique conservé, petit domaine épuisé, plafond de recherche |
| VN-10 | Une ancienne instance reprend après mise à jour | Fixture de version précédente, état et solution conservés |
| VN-11 | Une réussite compte une fois | Coupure avant/après accusé, double tap, réémission, concurrence |
| VN-12 | Aucune réussite maths ne crédite la lecture | Delta exact nul sur journal lecture, BKT, SRS, formes, Éclats et mots |
| VN-13 | Récompenses et décor acquis restent acquis | Rejeu, recalcul, niveau plus simple, absence longue, export/import |
| VN-14 | Anciens profils et sauvegardes conservés | Migrations et imports anciens/récents/corrompus/incompatibles |
| VN-15 | Consigne et aide variables audibles hors ligne | Écoute de l'énoncé exact, manifestes complets, réseau coupé |
| VN-16 | Toucher, clavier et orientations réellement utilisables | Gestes sur scène, cibles mesurées, focus, zoom et réglages de police |
| VN-17 | Scènes compréhensibles et agréables | Captures réelles, contrôle images, visa esthétique et observation enfant distincts |
| VN-18 | Suivi parent exact et séparé | Concordance journal/projections/UI, observations aidées distinctes |
| VN-19 | PWA disponible, budgets et reprise préservés | Installation/mise à jour/hors ligne sur livrable identifié |
| VN-20 | Conclusion maths indépendante et rejouable | Fête avec Gobi seul, reprise, aucun Éclat créé, activités encore accessibles |

Les limites d'une preuve sont explicites : test de calcul ≠ geste utilisable ; cible DOM ≠ objet
reconnaissable ; lecture audio réussie ≠ phrase compréhensible ; réussite guidée ≠ maîtrise autonome.
La validation de fin suit l'annexe T et la procédure de publication en vigueur, avec accord du
parent pour le livrable public. Les originaux et références de rejeu/visuelles restent protégés.
