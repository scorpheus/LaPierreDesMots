# Audit pédagogique des 76 exercices — 5 septembre 2026

**Mise à jour du 6 septembre :** les onze substitutions proposées ci-dessous ont été
autorisées dans la demande de correction avant commit et promues, avec les trois consignes
des Ponts et dix critères de paniers oubliés du premier garde. Voir
`lot-corrections-cloture-2026-09-06.md` : 76 fiches sans incohérence signalée, voix synchronisées.
Le reste du présent rapport décrit la mesure historique et les limites lexicales toujours
ouvertes ; il ne signifie plus que ces onze corrections attendent leur application.

## Verdict

Les 76 exercices publiés ont été lus, moteur par moteur, avec leurs consignes, réponses,
cibles, récits et cartes. La structure pédagogique est globalement saine : aucune référence
orpheline, aucun mot mal reconstitué, aucun trou de gravure mal positionné, aucune paire
incomplète, aucun parcours discontinu, aucune réponse d'histoire ou d'éclair absente de ses
choix, ni cible de coloriage en contradiction avec le libellé humain de l'habillage.

Onze écarts restent cependant dans quatre fichiers. Ils sont regroupés ci-dessous, avec une
correction proposée ; ce rapport ne modifie pas le contenu publié. Tant qu'ils existent, la
commande node scripts/qa/auditer-coherence-exercices.mjs sort avec le code 1.

## Périmètre réellement lu

Inventaire remesuré : 76 fichiers de contenu/exercices/, répartis ainsi :

| Moteur | Fiches |
|---|---:|
| assemble, grave, chrono | 5 chacun |
| attrape, chemin, colorie, eclair, histoire, phrase | 6, 7, 6, 6, 6, 6 |
| tri, paires | 11, 8 |
| place, libre, trace | 1, 1, 2 |

La revue a confronté les énoncés aux données réellement utilisées par chaque moteur, et non
seulement au JSON Schema :

- assemble : concaténation des blocs dans l'ordre de solution ;
- grave : graphème attendu à la position déclarée, disponible au clavier ;
- phrase : étiquettes recomposant exactement la phrase ;
- attrape, tri, paires, eclair, histoire, place, chrono : références vers le catalogue
  correspondant et réponse/cible réellement déclarée ;
- chemin : départ et chaque arête successivement voisins ;
- colorie : couleur proposée et cible nommée avec le libellé humain de l'habillage, y compris
  les identifiants historiques (rideau = cristal, roue = escargot).

La couverture lexicale CE1 reste portée par scripts/valider-brouillons.mjs et son lexique
versionné ; elle n'a pas été remplacée par une heuristique du présent audit. L'annexe T,
section T1, reste la règle applicable.

## Résultats par mécanique

### Tri et paires

Les 11 tris et 8 jeux de paires possèdent les cibles demandées, associées au bon réceptacle ou
à exactement deux cartes. Aucun élément demandé ne référence un réceptacle absent.

La liberté de l'enfant n'est pas seulement supposée : le tri retire les éléments déjà acquis de
toutes les étapes futures dans partage/src/moteurs/tri/moteur.ts, fonction avancerEtapes, et les
paires acceptent une paire demandée par une étape ultérieure dans
partage/src/moteurs/paires/validation.ts, variable paireEncoreDemandee. Le test
tests/unitaires/liberte-ordre-moteurs.test.ts couvre ces deux gestes. Il s'agit de la liberté
parmi les réponses affichées ; l'ordre des consignes pédagogiques reste volontairement séquentiel
pour tri.

### Éclair

Les six fiches ont des réponses présentes dans leurs options et aucune des cinq autres fiches ne
révèle le mot fugace. Une fiche de couleurs divulgue toutefois systématiquement le mot à retrouver
dans sa consigne : défaut bloquant ci-dessous.

### Chronologies

Les cinq chronologies ont trois triplets disjoints, des références de vignette valides et un ordre
techniquement continu. Les récits approuvés sont cohérents sauf le nom d'un insecte dans une
vignette du Volcan. L'image a été contrôlée : elle représente bien une abeille sur le nez du
cochon ; c'est le libellé JSON qui est erroné.

### Coloriage, place, trace et libre

Les six coloriages correspondent aux libellés déclarés dans les habillages. Les apparentes
discordances d'identifiants ne sont pas des erreurs : volcan.forge#rideau est libellé « le grand
cristal violet » et marais.brume#roue « l'escargot ». Le placement a ses trois éléments et zones,
les deux tracés portent une paire et une consigne, et l'activité libre ne demande aucune réponse
pédagogique.

## Écarts à corriger

| Priorité | Fichier et preuve | Effet enfant | Correction proposée |
|---|---|---|---|
| Haute | contenu/exercices/clairiere/luciole-couleurs-01.json, consignes c1 à c6 : chacune dit « porte le mot rouge/bleu/etc. ». | Le mot est dévoilé après son flash : l'exercice mesure la lecture de la consigne, pas la reconnaissance éclair. | Remplacer les six textes par « Retrouve le mot que tu viens de lire. ». Conserver mot, reponse et options ; régénérer ou valider l'audio avec le texte retenu. |
| Haute | contenu/exercices/marais-jumeau/grenouilles-tri-01.json, c3 et c4 : « le son de gant ». | La formule abstraite n'offre pas le mot-repère à comparer. Elle contredit le lot CE1 qui exige « le même son que dans … ». | Dans les deux cas, écrire « le même son que dans “gant” » ; ne pas modifier les cibles, compétences ou réceptacles. Étendre au mot-clé si le manifeste vocal le dérive. |
| Haute | contenu/exercices/marais-jumeau/poissons-attrape-01.json, c1 et c2 : « le son de gant ». | La formule abstraite n'offre pas le mot-repère à comparer. Elle contredit le lot CE1 qui exige « le même son que dans … ». | Dans les deux cas, écrire « le même son que dans “gant” » ; ne pas modifier les cibles, compétences ou réceptacles. Étendre au mot-clé si le manifeste vocal le dérive. |
| Haute | contenu/exercices/volcan/fresque-chrono-01.json, c1, seconde vignette : récit « Une abeille se pose », id et asset vignette-abeille-nez, mais libelle « Une mouche se pose ». Le commentaire du fichier et Docs/publication-chronologies-visuelles-2026-09-04.md valident aussi l'abeille. | La carte à ranger est décrite comme un autre animal ; la lecture et le récit se contredisent. | Changer uniquement le libellé en « Une abeille se pose sur son nez. ». L'image existe, porte l'abeille et n'a pas à être régénérée. |

Le premier fichier totalise six signalements, les deux fichiers nasaux deux chacun et le dernier
un : 11 au total. Ce sont des occurrences, pas onze causes indépendantes.

### Rectificatif de formulations — même date

La première rédaction de ce rapport proposait par erreur « la luciole qui a brillé » : aucune
luciole ne brille dans l'éclair, l'enfant vient de lire un mot. La formulation à arbitrer est
bien « Retrouve le mot que tu viens de lire. ». Les deux suggestions concernant `gant` ont été
relues contre les cibles (`dent`, `vent`, `grand`, `orange`, `enfant`) et la compétence
`gph.nasale.an` : elles doivent dire « le même son que dans « gant » », jamais le phonème /g/.
Les autres corrections proposées ont été revérifiées contre leurs données : seule l'abeille de
la fresque reste à renommer. La relecture complète des quinze chronologies est dans
[audit-chronologies-pedagogique-2026-09-05.md](audit-chronologies-pedagogique-2026-09-05.md).

## Garde ajoutée

scripts/qa/auditer-coherence-exercices.mjs est un contrôle Node déterministe et sans LLM. Il
exporte auditerExercice pour les tests, audite tout le répertoire publié par défaut et imprime
chemin, règle et preuve. Il conserve volontairement un périmètre mécanique : il ne prétend pas
valider seul une inférence, une illustration non textuelle ou la qualité stylistique d'un récit.

Les contrôles faux/sains sont dans tests/unitaires/auditer-coherence-exercices.test.ts :

- tri sain ;
- réponse éclair absente et cible dévoilée ;
- assemblage non reconstituable et chemin sans arête ;
- paire incomplète, trou mal positionné, référence chrono absente ;
- formulation « son de … » contre formulation avec mot-repère ;
- sujet de vignette qui contredit celui du récit.

Commandes exécutées dans ce lot :

    node --check scripts/qa/auditer-coherence-exercices.mjs
    node scripts/qa/auditer-coherence-exercices.mjs
    # 76 exercices, 11 écarts détaillés ci-dessus (échec attendu : le garde prouve les défauts)
    npx vitest run --project unitaires tests/unitaires/auditer-coherence-exercices.test.ts
    # 7 tests passent après ajout du contrôle de restitution du rapport global

Les quatre versions proposées sont préparées dans
`contenu/brouillons/corrections-qa-2026-09-05/`, sans effet sur les exercices joués.
Le script local `bac-a-sable/qa-finition-2026-09-05/valider-reformulations.mjs` confronte chaque
copie à l'original. Sa première mesure refuse les mots « Retrouve » et « viens », absents de
la liste CE1 locale : le vocabulaire de cette proposition n'est donc pas déclaré validé.
Le contrôle n'a pas été contourné et aucun mot n'a été ajouté à la liste sans arbitrage.
Le rapport de `qa:coherence` nomme maintenant ces écarts et leur nombre au lieu d'annoncer un
simple « code de sortie 1, motif non identifié ».

## Limites et décision restante

### Vérification indépendante du lexique, ajout du 5 septembre

Le lancement réel de `node scripts/valider-brouillons.mjs` refuse **198 occurrences hors de la
liste locale** sur les 76 exercices publiés. L'inventaire indépendant en retrouve exactement
198, soit 76 formes normalisées distinctes parmi 4 316 occurrences de texte enfant. Détail
reproductible : `bac-a-sable/qa-finition-2026-09-05/inventaire-lexique.json`.

Ce ne sont **pas 198 mots trop difficiles pour le CE1** : la liste de 546 entrées ne reconnaît
notamment pas `eau`, `se`, `au`, `pose`, `ouvre` ou `prend`. D'autres termes de décor (`enclume`,
`médaillon`, `ponton`, `gouttière`) méritent une vraie relecture. Une absence dans cette liste
artisanale ne mesure donc pas à elle seule le niveau scolaire.

Le contrôle 9 de `test-contenu.mjs` est explicitement inactif pour seuil non arbitré
(`Docs/questions-en-attente.md`, Q-INT-2). Les 645 contrôles de contenu verts ne valident PAS
cette couverture. Le présent lot ne choisit pas un seuil ni n'ajoute silencieusement les mots :
la décision concernant la liste et les formes conjuguées reste ouverte. La phrase proposée
« Retrouve le mot que tu viens de lire. » rencontre aussi cette limite (`Retrouve`, `viens`).
Le bilan global ne doit donc pas être présenté comme une certification pédagogique CE1.

Repère externe vérifié le 5 septembre : les [ressources officielles du programme de français au
cycle 2](https://eduscol.education.gouv.fr/4740/ressources-d-accompagnement-du-programme-de-francais-au-cycle-2)
présentent le programme applicable depuis la rentrée 2025 et ses livrets par niveau. Les
[évaluations CE1](https://eduscol.education.gouv.fr/5289/evaluations-des-acquis-et-besoins-des-eleves-au-ce1)
portent notamment sur lecture, écriture, vocabulaire et oral. **Conséquence proposée pour ce
projet, et non certification ministérielle :** séparer la difficulté des mots à lire, celle des
consignes et l'appui de l'image. Une liste fermée de 546 formes ne peut pas remplacer ces axes
ni justifier, seule, l'exclusion d'un mot courant conjugué.

La garde ne peut pas inférer toutes les relations de sens françaises : une question d'inférence,
une image ou un récit restent à relire par un adulte. Elle compare ici les sujets nommés de chaque
phrase de chronologie uniquement lorsqu'ils sont tous deux explicites ; les pronoms restent donc
hors de son jugement.

Les corrections de contenu restent soumises à la relecture et à la validation du parent, puis à la
chaîne de voix : elles ne sont pas autorisées dans ce lot. Après décision parentale, le principal
devra appliquer les quatre corrections de fichier, régénérer les clips concernés si leur texte change, puis
relancer ce garde et la vérification globale.
