# Réhabilitation de La Pierre des Mots

Plan du 14 septembre 2026, demandé par le parent. Il remplace la stratégie de corrections
ponctuelles F1–F5 ; leurs objectifs sont conservés dans les lots ci-dessous. Ce document fixe
le cadrage validé. L'implantation et ses preuves restent à réaliser et à suivre dans l'état courant.

## 1. Direction et choix de conception approuvés

**Poursuivre le projet en reconstruisant sa couche de présentation, dans le dépôt existant.**
Le parent approuve cette direction et la répartition des modèles/contextes le 14 septembre.
Les réponses au questionnaire sont reçues : section 10. Il souhaite retrouver une version
entièrement reconstruite et propre avant de la tester puis de la montrer à son enfant et à sa
femme, sans échéance imposée. R1–R2 deviennent des jalons internes, sans visa de prototype à
lui demander. Les vérifications intermédiaires restent à la charge des agents. Le gameplay propre à la
carte, au campement et aux différentes activités doit être préservé dans la reconstruction.
Conserver contenus validés, illustrations, voix, sauvegardes, journal et services pédagogiques.
Remplacer progressivement les écrans et règles de composition qui se sont accumulés ; retirer
les anciennes règles à mesure que leur remplacement est qualifié. Aucun effacement du projet.

Le coût passé ne justifie pas à lui seul de continuer. Le prochain investissement doit prouver
sa valeur sur une tranche interne : campement → monde → région → activité → récompense → reprise,
belle et fonctionnelle sur les appareils demandés. Si cette tranche ne simplifie pas le travail,
corriger la construction avant de migrer le reste. Un besoin démontré de reconstruire aussi le
socle serait un changement de périmètre à expliquer, pas une permission de multiplier les audits.

| Option | Décision et raison |
|---|---|
| Tout supprimer, garder seulement les images | Écartée : reperdre contrats, corrections et compatibilité des acquis, sans preuve de bénéfice. |
| Continuer les retouches CSS écran par écran | Écartée comme stratégie : des règles concurrentes demeureraient et l'identité visuelle resterait fragmentée. |
| Reconstruire l'interface sur les services existants | Direction approuvée : renouveler réellement l'expérience, avec un périmètre réversible et une référence utilisable. |
| Migrer tout dans ChatGPT Sites | Non retenue pour la première tranche : l'hébergement intégré ne reconstruit pas notre progression ni notre fonctionnement hors ligne. Comparer séparément si un besoin d'hébergement apparaît. |

## 2. Périmètre à conserver, à reconstruire, à suspendre

- **Conserver** : `contenu/`, verrous de production, sauvegardes et migrations ; services de
  `partage/src/base`, logique pédagogique et contrats des moteurs ; audio préparé ; Git ; React,
  TypeScript et Vite déjà en place. « Conserver » ne signifie pas déclarer sans défaut : une
  erreur démontrée y reste corrigible, sans changer une règle pédagogique silencieusement.
- **Reconstruire** : accueil, carte, campement, cadre d'activité, récompense et présentation parent ;
  mise en page, hiérarchie, navigation et ordre des calques. Les moteurs de réponse sont branchés
  sur ce cadre plutôt que réécrits avec chaque écran.
- **Simplifier** : une source de dimensions par scène, styles attachés aux composants, une
  projection de progression issue des services existants, commandes usuelles réutilisables.
  Leur présence et leur disposition dépendent du type d'écran. Les futurs
  composants n'ajoutent pas une couche de corrections à la fin de `global.css`.
- **Suspendre pendant la reconstruction** : nouveaux moteurs/régions, nouvelles séries d'assets,
  variantes de compagnons non validées, nouveaux portages et audits QA génériques. Aucune
  fonctionnalité acquise n'est supprimée ; les dettes historiques restent accessibles.

## 3. Direction de design à matérialiser avant migration

Direction visuelle approuvée : **décors immersifs et carte au trésor sur parchemin**.
L'enfant entre dans les lieux ; commandes discrètes et zones de lecture calmes.
Les assets, la palette et les polices déjà validés servent de base.
Une composition soignée vient d'abord du cadrage, de la hiérarchie
et des proportions, pas de nouvelles images ou d'animations supplémentaires.
Cette identité visuelle n'impose ni un cadre de livre autour de chaque scène, ni la même
disposition partout. La composition précise reste à matérialiser dans R1.

- Entrée habituelle approuvée : le campement vivant, avec une action évidente pour continuer
  ou partir et un accès parent discret et repérable. Éviter un accueil supplémentaire faisant
  doublon ; l'introduction initiale et le choix de profil conservent leur rôle propre.
- Carte : vraie vue d'ensemble du monde, région active immédiatement identifiable, prochaine
  destination mise en avant. La progression colore le monde ; un indicateur de prochaine étape
  l'explique. Les détails techniques des compteurs restent hors du premier plan enfant.
- Région : vue rapprochée illustrée avec ses lieux et son chemin, avant d'entrer dans une
  activité. La prochaine étape est conseillée ; les lieux déjà acquis restent revisitables.
  Ces choix de navigation ne modifient pas les seuils pédagogiques ou les règles de récompense.
- Campement : scène à explorer avec objets réactifs, compagnons et collections ; les objets
  donnent accès à leurs fonctions. Conserver les interactions gratuites déjà prévues et un
  départ repérable. Ce lieu de vie possède sa composition, sans plateau de réponses imposé.
- Activité : consigne et réécoute, plateau, réponses/outils, aide et retour dans des emplacements
  stables. Un téléphone change l'arrangement, jamais le sens de l'exercice ou l'ordre de lecture.
  Composition adaptée au moteur : actions dans le décor quand cela sert le geste, plateaux
  pour cartes et mots quand ils sont plus lisibles. Portrait et paysage également utilisables
  sur tablette ; aucune orientation imposée pour contourner une composition défectueuse.
- Récompense : montrer ce qui vient réellement d'être acquis et l'action suivante ; campement
  et collections reprennent les mêmes composants et rythmes visuels.

Livrable interne du premier lot de design : une proposition cohérente, consultable en navigateur,
montrant campement, monde, région, activité et récompense avec les vrais assets et données de
démonstration explicitement séparées des sauvegardes. Vue PC et tablette dans les deux orientations,
adaptation téléphone. Les variantes de déverrouillage et de reprise sont représentées. Les agents
contrôlent cet ensemble avant la migration étendue ; le parent le découvrira une fois la version
complète prête à ses essais. Il n'a pas à tester ou approuver chaque écran intermédiaire.
Le profil de démonstration est isolé, déterministe et réinitialisable sans ouvrir la base
familiale. La revue interne porte sur quatre critères : prochaine action évidente, distinction
enfant/parent, cohérence des écrans, objets et gestes sans ambiguïté. L'avis esthétique du parent
reste libre et intervient sur la version complète ; cette revue ne le remplace pas.

### Des compositions différentes sur un socle partagé

| Famille | Expérience à préserver | Ce qui lui appartient |
|---|---|---|
| Carte et choix de destination | Comprendre le monde, choisir un lieu, voir le chemin et son évolution | Vue du monde, sélection et transitions entre lieux |
| Campement | Explorer, toucher, écouter les compagnons, retrouver les objets acquis | Composition du décor, réactions et accès par les objets |
| Activité mise en scène | Choisir des cartes, déplacer, tracer, assembler ou colorier selon le moteur | Plateau, gestes, disposition des cibles et retours de jeu |
| Lecture | Déchiffrer au calme avec les réglages du profil et l'aide audio | Zone de lecture stable, outils et présentation du texte |
| Parent | Comprendre les acquis, régler, sauvegarder et consulter | Navigation et densité d'information adaptées à l'adulte |

Une activité de choix de cartes peut donc avoir sa propre scène ; son moteur commun ne la
transforme pas en questionnaire standard. Partager les composants ne fixe ni le nombre de
menus, ni celui des écrans. Le campement sert d'entrée habituelle ; aucun accueil supplémentaire
ne doit ajouter une étape sans fonction utile.

## 4. Lots et critères de passage

| Lot | Résultat concret | Travail et sortie attendue |
|---|---|---|
| R0 — référence conservée | Un état récupérable | Intégrer proprement le lot PWA F0 déjà vert avec ses fichiers et assets locaux ; identifier commit et livrable. Ne pas perdre les changements non commités en repartant de `HEAD`. Aucune suppression de base ni publication implicite. |
| R1 — référence visuelle interne | La construction visuelle éprouvée | Réaliser les compositions de la section 3 selon les choix reçus. Brancher une activité réelle pour éprouver les contraintes de contenu. Revue interne, sans présentation de prototype imposée au parent. |
| R2 — tranche complète | Une expérience réellement jouable | Relier accueil, carte, une sortie, aide, récompense et reprise aux services existants. Même profil ; aucun crédit fabriqué ; un palier réel et une reprise. Deux familles aux contraintes différentes éprouvent le cadre avant généralisation. |
| R3 — migration du reste | Une seule construction d'interface | Migrer les familles de moteurs, puis campement/parent. Réutiliser le cadre et les composants validés. Retirer les règles anciennes devenues inutiles et vérifier tous les exercices restent accessibles. Pas de coexistence permanente de deux interfaces. |
| R4 — livraison | Une version complète prête aux essais du parent et de sa famille | Qualifier l'état intégré, préparer le livrable web, vérifier les appareils accessibles, la version active, la reprise, le transfert de sauvegarde et les ressources hors ligne. Présenter l'ensemble au parent, puis recueillir son visa et publier sur autorisation. Documenter les limites concrètes restantes. |

R1–R2 forment une **revue interne de construction**. Engager R3 après contrôle de la composition,
des branchements réels, de la simplification des responsabilités et du coût de vérification.
Une maquette isolée des contraintes du jeu ne suffit pas. Le parent a demandé d'attendre la
version entière pour ses essais : aucune approbation intermédiaire ne conditionne cette migration.

## 5. Construction cible

```text
Contenus et assets validés       Journal et services pédagogiques existants
            │                                │
            └──────── contrats du jeu ────────┘
                             │
               Services et composants partagés
             sauvegarde · audio · navigation · affichage
                             │
           ┌─────────────────┼─────────────────┐
      Scènes du monde   Activités et lecture  Espace parent
      carte/campement   compositions propres  gestion/suivi
```

Noms de composants éventuels à décider dans R1 : `SceneInteractive`, `CommandesActivite`.
La partie commune gère les contraintes d'affichage et les services ; chaque famille possède
sa composition. Une scène possède le rectangle de son image et la transformation commune
aux objets/zones tactiles ; le moteur gère les réponses, pas le viewport global.
Carte et campement n'héritent pas d'un gabarit d'exercice. Les éléments génériques apparaissent
seulement lorsqu'ils sont utiles ; aucun composant central à dizaines d'options pour toutes
les mises en scène. Les écrans ne recalculent pas récompenses ou acquis. Les styles de l'ancien cadre ne
doivent pas s'appliquer au nouveau. Préférer les capacités React/CSS existantes, sans nouvelle
bibliothèque de mise en page ni migration de framework dans cette réhabilitation.

SVG et Canvas restent possibles à l'intérieur d'une scène ; leur rôle est défini, sans versions
concurrentes d'un même asset choisies par des replis implicites. Le passage au nouveau cadre
est réversible jusqu'à sa qualification. Les références visuelles sont présentées avec le
changement attendu puis mises à jour seulement après validation explicite.
Les captures candidates se préparent pendant le travail ; la validation des références reste
à la fin, avec le résultat concret. Les écarts attendus de refonte ne deviennent pas une campagne
annoncée verte ni une raison de demander au parent de tester des prototypes successifs.

Première livraison : un appareil habituel et une sauvegarde exportable/importable pour changer
d'appareil. Le transfert doit préserver le profil, les acquis et les réglages, avec confirmation
avant remplacement de données. Aucune synchronisation automatique inter-appareils ajoutée.
Les sauvegardes du serveur local existant restent préservées.

R2 ouvre un tableau de bascule dans l'état courant : écran/famille, ancien cadre, nouveau cadre,
responsable, preuve de remplacement, retour possible et retrait de l'ancien. Chaque migration
clôt sa ligne ; R4 exige toutes les lignes closes. Aucun ancien écran n'est effacé avant son
remplacement jouable et le contrôle de conservation des acquis.

## 6. QA redessinée autour des risques

Les tests existants sont conservés comme protection pendant la transition. Leur nombre n'est
pas une cible. Les suites ne doivent pas toutes tourner dans chaque boucle d'édition.

| Niveau | Ce qu'il prouve | Quand |
|---|---|---|
| Logique sans navigateur | Journal, idempotence, calcul des acquis, sélection, règles moteur ; bon résultat et absence d'effet parasite | Modification du domaine ou de son contrat, filtre concerné |
| Composant/scène en navigateur | Cadrage, image réellement rendue, occlusion, geste et orientation sur les variantes pertinentes | Modification du composant commun ou de sa famille |
| Parcours de référence | Même profil : sortie, aide, palier, retour, fermeture/reprise, remédiation ; UI et persistance cohérentes | Modification de l'intégration et clôture de R2/R3 |
| Recette de livraison | Catalogue, appareils couverts, vrais assets/audio, PWA/migration, version active, accessibilité, vision d'ensemble | Clôture de l'état intégré et publication, conformément à l'annexe T |

Le cadrage commun est testé sur sa matrice complète une fois ; les exercices sont contrôlés
pour leurs données, extrêmes et interactions propres. Une exception démontrée conserve son
test. Cette séparation vise à éviter de répéter le même risque dans chaque combinaison
moteur × région × appareil, sans déclarer par principe que les combinaisons sont équivalentes.

Pour retirer/remplacer un contrôle redondant : identifier la propriété couverte, son remplaçant
et un défaut que celui-ci détecte ; revue avant retrait. Aucun `skip`, seuil assoupli, référence
rafraîchie ou contrôle négatif écarté pour obtenir du vert. Les crochets et `verifier` ne sont
pas contournés. Toute modification de leur cadence doit être explicite, compatible avec les
quatre références et validée avant application.

Objectifs de boucle **proposés, non mesurés** : contrôle local pertinent en moins de 30 secondes ;
parcours de référence en moins de 2 minutes. Si le coût dépasse, examiner d'abord son périmètre
et le démarrage des services, pas diminuer les assertions ni augmenter les timeouts. La recette
large peut rester plus longue ; elle ne doit pas être payée après chaque retouche.

## 7. Modèles et consommation de contexte

Le parent approuve le principe de cette répartition et des contextes courts le 14 septembre.
Les efforts du tableau sont des points de départ, pas une modification automatique du
modèle de cette tâche. Modèles et efforts doivent être disponibles dans l'hôte au lancement.

| Travail | Modèle / effort de départ proposé | Limite de délégation |
|---|---|---|
| Architecture, arbitrage du design, revue du passage R2 | Astra élevé ; ultra seulement si la difficulté le justifie | Une décision consolidée, pas surveillance des logs |
| Implantation de composants bien spécifiés | Terra moyen | Un lot et fichiers disjoints ; pas tout l'historique |
| Défaut transversal difficile ou revue substantielle | Sol élevé, ou Astra si nécessaire | Escalade avec reproduction et hypothèses déjà éliminées |
| Exécution d'une recette définie, inventaire, synthèse de rapport | Luna faible | Pas de modification des assertions ni diagnostic pédagogique autonome |

Un agent d'implantation au quotidien ; ajouter un second travailleur seulement pour une tâche
indépendante qui économise réellement du temps. Un unique détenteur du jeton de suites/builds,
éventuellement Luna si l'orchestrateur le lui transfère explicitement. Pas de délégation pour
une commande isolée, pas de sous-agents qui relisent tous le même dépôt ou attendent le même test.

Brief neuf et court : objectif, fichiers, contrats nécessaires, exclusions, preuve attendue,
format de retour. Ne pas cloner la longue conversation par défaut. Le parent ne doit pas devoir
réexpliquer le projet : les faits utiles sont dans la source propriétaire indiquée par le brief.
Retour : changement, résultat, limite, décision nécessaire. Les logs restent dans `bac-a-sable/`.
Après deux tentatives sans progrès sur la même cause, passer la reproduction à un modèle plus
capable au lieu d'épuiser le petit modèle. Ne pas recommencer la même enquête à zéro.
Le paquet initial se limite au brief, aux sections du contrat actif, aux fichiers possédés et
à une preuve de référence. Toute lecture supplémentaire répond à une question nommée ; elle
ne déclenche pas automatiquement l'ouverture des archives ou des autres skills.

Mesurer par lot : résultat accepté, minutes d'exécution, lectures/retours superflus et consommation
fournie par l'hôte lorsqu'elle existe. Ne pas convertir les caractères en tokens exacts ni les
quotas partagés en coût de cette seule tâche. Un agent moins cher par token peut coûter davantage
s'il multiplie les reprises. Aucune garantie de nombre de tokens total n'est donnée avant R2.

## 8. Pratiques reprises de Vehigraph

Lecture du 14 septembre : `AGENTS.md` et `docs/agent_workflow.md`, révision du 12 septembre,
dans le dépôt Vehigraph. À reprendre : consignes courtes, chargement progressif des skills,
responsabilité documentaire unique, archives explicitement historiques, validation proportionnée.
À ne pas recopier : contrats C++, physique, règles Git propres au dépôt et interdiction locale
de déléguer. Vehigraph travaille actuellement de façon séquentielle.

Mesures de départ dans La Pierre des Mots : AGENTS 21 020 caractères, état/file 53 727,
skill QA 29 806 ; CSS global 4 401 lignes, carte 1 130 lignes. Ce sont des indices de volume
et de charge de lecture, pas des preuves que chaque ligne est inutile.

Première mise au propre documentaire : un AGENTS court, ce plan comme contrat actif,
un état courant court. Les versions antérieures exactes sont conservées dans
`Docs/archives/consignes-avant-rehabilitation-2026-09-14.md` et
`Docs/archives/suivi-avant-rehabilitation-2026-09-14.md`. Les preuves historiques restent accessibles
à la demande. Les skills seront découpés seulement quand une lecture inutile est constatée ;
aucune campagne de réécriture de tous les skills n'est requise pour commencer R1.

Intervention demandée à la tâche « Analyser transcript et agents code », réalisée et relue :
le skill [banc de mutation](../.agents/skills/banc-de-mutation/SKILL.md) passe de 30 609 à
4 560 octets UTF-8 (476 à 85 lignes). Les diagnostics de produit déjà portés par les tests/docs
sont retirés ; le déclencheur, les contrôles négatifs, les gardes de restauration/collision et
les limites de preuve restent dans la procédure. La description de
[génération d'asset](../.agents/skills/generer-asset/SKILL.md) distingue maintenant la production
d'image de l'intégration d'un asset existant. Le skill PWA en cours reste intact. AGENTS suffit
comme routeur : aucun guide supplémentaire créé. Deux validations structurelles de skills et
contrôles documentaires rapportés ; aucune suite applicative. Changements locaux non committés.

Nettoyage effectué : AGENTS passe de 327 à 97 lignes (21 020 à 6 903 caractères) ;
l'état courant de 674 à 68 lignes (53 727 à 4 815 caractères). Les deux points d'entrée
contiennent ainsi environ 84 % de caractères en moins. C'est une réduction de la lecture
initiale, pas une mesure d'économie de tokens par tâche : le plan et les références restent
chargés selon le besoin. Contrôles effectués : liens relatifs, UTF-8 et `git diff --check` ;
les quatre documents protégés sont inchangés. Aucune suite applicative relancée pour cette prose.

Une contrelecture Terra en effort moyen, sans historique de conversation hérité, a été effectuée
sur ce plan. Ses corrections intégrées : tableau de bascule, visa groupé, profil de démonstration
isolé et paquet de contexte borné. Aucun test ni build délégué pour cette révision documentaire.

## 9. Conditions d'une version finie

- Une direction visuelle approuvée et un socle actif partagé avec compositions spécialisées ; aucun écran laissé sur l'ancien
  système faute de temps. Les activités existantes et les acquis restent disponibles.
- Navigation et progression vécues correctes, y compris aide, palier et reprise ; absence de
  blocage connu. Les différents compteurs sont compréhensibles sans explication technique.
- Rendus vérifiés sur PC, tablette et téléphone avec orientation et réglages de lecture ;
  portrait et paysage sont tous deux utilisables sur tablette.
  test physique tablette distinct de la simulation. Les agents détectent les défauts ordinaires.
- Livrable identifié, sauvegardes préservées et transférables, mise à jour et fonctionnement hors ligne qualifiés,
  informations parent accessibles, résultats datés de la recette finale.
- Anciennes règles migrées retirées avec preuves ; documentation et démarrage utilisables par
  une nouvelle tâche. Les réserves restantes sont explicites, pas cachées derrière un total vert.
- La présentation attendue couvre tous les écrans et activités du périmètre existant reconstruit,
  y compris campement, collections et parent. Aucun écran hérité n'est renvoyé à une future version
  pour livrer plus vite. Cela n'ajoute pas les contenus ou fonctionnalités suspendus de la section 2.
- Public : le parent, son enfant et sa femme ; aucune date butoir. Le parent veut tester quand
  l'ensemble est refait et propre. L'absence d'échéance ne dispense pas de borner les lots,
  les contextes et les vérifications, ni de rendre compte honnêtement du reste à faire.

## 10. Conception avec le parent

La suite se pilote ici. L'aide documentaire de la tâche « Analyser transcript et agents code »
(`01a090c2-67cb-7f71-a72f-ddef5b5c430a`) est close. Aucun nouveau diagnostic n'est demandé à
l'ancienne tâche de campagne. Les questions éventuelles s'écrivent directement dans le chat :
le formulaire asynchrone a disparu avant que le parent puisse répondre. Le document conserve
les décisions ; le parent ne doit pas le relire pour découvrir une question ou comprendre le plan.

Réponse finale au questionnaire : **1A, 2A, 3A, 4A, 5A** ; présentation à lui-même, son enfant
et sa femme **quand tout est refait et propre**, sans date imposée.

| Choix | Décision reçue | Conséquence de construction |
|---|---|---|
| 1A — région | Vue illustrée avec lieux et chemin avant l'activité | Monde → région → activité ; reprise directe conservée au campement |
| 2A — activités | Composition adaptée à chaque mécanique | Décor pour les gestes qui s'y prêtent, plateau pour cartes/mots lorsqu'il est plus lisible |
| 3A — liberté | Prochaine étape conseillée, lieux acquis revisitables | Recommandation évidente et revisite, sans modification implicite des seuils ou récompenses |
| 4A — orientation | Portrait et paysage aussi utilisables sur tablette | Deux compositions qualifiées ; PC et téléphone également adaptés |
| 5A — sauvegarde | Un appareil habituel, transfert de sauvegarde pour changer | Export/import vérifié ; pas de synchronisation automatique ajoutée |
| 6 — présentation | Ensemble reconstruit et propre avant essais du parent et de la famille | R1–R2 internes ; première présentation prévue à R4, sans échéance artificielle |

Le questionnaire de cadrage est clos. Les détails techniques réversibles appartiennent aux
agents ; ne pas rouvrir ces choix ni multiplier les variantes à faire approuver.

Réponses reçues le 14 septembre : **campement vivant à l'entrée** et **carte interactive** :
toucher un lieu, voir le trajet et entrer dans sa scène. La reprise reste accessible directement
depuis le campement ; le parcours de carte est utile au choix d'une destination, sans détour
obligatoire pour reprendre. Aucun déplacement libre du personnage n'est ajouté au périmètre.
Le campement est représenté dès R1 ; sa migration complète reste dans R3.

Réponse visuelle reçue : **décors immersifs et carte au trésor**. Le « carnet » initialement
proposé est remplacé par ce choix ; les lieux ne sont pas présentés comme des pages de livre.

Conséquence documentaire de l'entrée choisie : la v2 § 3.4 prévoit le campement comme lieu
central et § 9.4 présente la carte comme premier écran ; le choix du parent retient désormais
le campement pour l'entrée habituelle dans la reconstruction. Le contrat de finition v3 § 4.6
porte un départ en un tap : conserver un départ direct accessible et préciser son parcours
avec les états d'introduction/profil lors de R1. Les originaux et leurs tests ne sont pas
modifiés par cette préparation. Les règles pédagogiques restent inchangées.

Sources officielles consultées le 14 septembre : [choix des modèles](https://developers.openai.com/api/docs/models),
[usage Codex et contexte](https://learn.chatgpt.com/docs/pricing),
[Sites](https://learn.chatgpt.com/docs/sites). Astra/Terra/Luna ont des profils de coût/capacité
différents ; les limites dépendent aussi du contexte, du raisonnement et des outils. Sites est
un environnement intégré de création/hébergement, pas une garantie de qualité du produit.
