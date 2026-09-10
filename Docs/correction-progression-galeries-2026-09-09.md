# Correction de la progression des Galeries — 9 septembre 2026

## Cause constatée sur le serveur local

Lecture seule du journal et des projections du profil signalé : dix exercices distincts des
Galeries sont acquis. Les dernières réussites reprennent des exercices déjà acquis ; leurs
sauvegardes existent. Le compteur régional et les crédits uniques de Gobi restent donc
correctement inchangés. Les trois exercices restants sont `galeries-10`, `galeries-13` et
`galeries-14`.

Ces trois exercices demandent `gph.confusion.sourde-sonore`, dont le prérequis `syl.cvc` vaut
0,456 de maîtrise, sous le seuil 0,60. `syl.cv` et `gph.voyelle.orale` ne sont pas encore
renseignés. Le sélecteur écarte correctement les exercices prématurés, mais sa reprise parmi
les miroirs déjà terminés ne peut améliorer aucun de ces prérequis : il fabrique une boucle.
Une étoile d'exercice et une maîtrise BKT sont deux mesures différentes ; les dix acquis ne
permettent pas de supposer que tous les prérequis sont maîtrisés.

## Correction

Quand une région incomplète ne possède plus de nouveauté éligible, le sélecteur recherche les
ancêtres encore sous le seuil, puis propose leurs exercices réellement éligibles. Le plan
porte sa région effective et `regionObjectif` pour reprendre la région demandée après cette
remédiation. Les ports HTTP et autonome transmettent le plan complet, sans conversion qui
perdrait cet objectif.

Pour ce cas, la chaîne est voyelles en Clairière, syllabes CV, syllabes CVC, puis les trois
exercices restants des Galeries. Chaque étape suivante reste soumise à la maîtrise mesurée,
sans crédit offert, sans suppression d'acquis, sans changement du référentiel ou du seuil.
Une reprise peut améliorer une compétence tout en conservant le compteur d'exercices uniques.

## Vérifications

Le test discriminant `tests/unitaires/selecteur-remediation.test.ts` échoue avant correction :
la sortie retourne les deux miroirs au lieu des deux exercices de voyelles attendus.
Il vérifie ensuite la chaîne complète, les régions effectives et la conservation exacte des
acquis d'entrée.

Le cas « remédiation Galeries avec le contenu livré » dans `tests/api/sortie.test.ts` utilise
une base isolée et les JSON réels. Il reproduit les dix acquis et les maîtrises concernées,
vérifie les propositions successives, puis l'ensemble exact des trois exercices nouveaux.
Les valeurs de maîtrise y sont contrôlées pour isoler la sélection ; ce test ne prétend pas
prouver le nombre de gestes requis pour franchir le seuil BKT. La composition ne doit écrire
ni tentative ni progression. Les résultats d'exécution sont consignés par l'orchestrateur.

## Limite bloquante révélée par le cas réel

Le test API échoue encore au premier entraînement : les trois exercices de voyelles livrés
portent également `syl.cv` ou `flu.mot.court`, qui dépendent eux-mêmes des voyelles. Aucun
exercice de cet ancêtre n'est éligible sous la règle actuelle « tous les prérequis de toutes
les compétences ». La remédiation stricte ne peut inventer une activité éligible.

Ce verrou circulaire et les deux remèdes sont déjà explicitement documentés dans
`Docs/questions-en-attente.md`, section S3-Q2 : retirer les compétences secondaires dégrade
R12 ; limiter l'éligibilité à la compétence travaillée modifie P11. Le document laisse cet
arbitrage ouvert. Le test API reste discriminant ; il ne doit pas être affaibli pour masquer
cette limite. La correction complète dépend de cet arbitrage, pas d'une perte de sauvegarde.

## Arbitrage accepté et appliqué

Le 9 septembre, après présentation du verrou et de la correction proposée, le parent répond
« Oui, débloquer l’exercice des voyelles ». La correction annoncée vérifie les prérequis de
la compétence principale travaillée (`competences[0]`). Les exercices dont la compétence
principale est la syllabation ou les sons proches conservent leurs prérequis et le seuil 0,60.

L'éligibilité normale et la recherche de remédiation utilisent désormais cette même règle.
Les compétences secondaires restent déclarées et journalisées ; aucune étiquette du contenu
ni aucun référentiel n'est modifié. Une liste vide ou une compétence inconnue, même secondaire,
reste refusée. P11 est actualisée explicitement en fonction de cet accord, avec un contrôle
supplémentaire : une voyelle portant `syl.cv` en secondaire reste disponible tandis que
`syl.cv` en objectif principal est encore refusé lorsque son prérequis est absent.

Cette décision résout l'arbitrage S3-Q2 pour la sélection des exercices, sans modifier les
quatre documents de référence. Les mentions de blocage et le rouge API ci-dessus décrivent
l'étape discriminante avant accord, et ne constituent pas le résultat de la correction.

## Mesures après arbitrage

L'orchestrateur constate 13/13 tests API sortie, 30/30 tests sélecteur et la chaîne synthétique
réussis après la correction. Le nouveau contrôle explicite principale/secondaire a ensuite
été ajouté et doit être inclus dans la clôture.

Le témoin de portée optimiste du sélecteur passe exactement de **15 à 70 nœuds sur 76**.
Son assertion est actualisée à 70 conformément à l'accord pédagogique, sans remplacement par
une borne permissive. Les **six nœuds restants ne sont pas déclarés accessibles** : ce calcul
ne constitue ni une recette de tous les exercices, ni une preuve de leur clarté, ni un parcours
réel complet. Il ne modifie aucune référence de capture ou de rejeu.

## Livraison locale et résultats ciblés

Le parent confirme tester le serveur local. Aucune publication GitHub Pages n'est nécessaire. La commande test:progression inclut désormais les gardes de remédiation : 154 tests passent, dont le cas API sur contenu réel et les reprises du composant avec réponse tardive. Le test de portée passe ses six cas avec la mesure exacte de 70 nœuds. La compilation de production réussit. Le serveur local a été relancé sur http://127.0.0.1:8080/ ; une lecture de l'API confirme la conservation des dix acquis des Galeries. La reprise se fait depuis la carte, après rechargement de l'onglet.

L'écran de récompense recompose la région visée après la préparation au lieu de perdre cet objectif. Le chargement du premier paquet installe le plan complet ; une réponse tardive est ignorée après changement de tentative et une erreur rend la main à la carte.

Prévol mesuré avant écriture : 141 fichiers TypeScript dans partage/src, 150 TS/TSX client, 25 TS serveur, 283 fichiers de tests, 11 migrations, 76 nœuds. Ces comptes remplacent pour ce lot les chiffres historiques de AGENTS.md. Les deux documents non suivis préexistants ont été conservés. Aucun commit ni push effectué.

## Ajout : libellés des jauges de récompense

Le parent signale aussi les annonces « Encore 1 avant la prochaine étoile » et « Encore 7
avant la prochaine zone à rallumer ». Les nombres ne partagent pas la même unité : la jauge
étoile est remise à 0/1 après chaque crédit, et le palier rare compte des formes intermédiaires,
pas des exercices. La nature interne `zone-recoloriee` ne constitue pas une attribution réelle
d'une région ; le texte ne doit donc pas promettre une zone.

Correction d'affichage prévue sans changement des seuils ni des compteurs : nommer la règle
« Une étoile à chaque nouvel exercice réussi. », les nouveaux exercices requis avant une
forme, et les formes de Gobi requises avant le grand palier. Les tests de `JaugePalier` portent
sur le texte exact, son nom accessible, les compteurs inchangés et le passage de sept à six
formes seulement après cinq crédits supplémentaires.

Couverture lexicale vérifiée avec `estAuLexique` exporté par
`scripts/generer-phonologie.mjs`, sans génération ni enrichissement du lexique. Le dictionnaire
rejette déjà les mots existants « encore », « avant », « prochaine », « forme » et « Gobi » ;
il rejette également « chaque », « nouvel », « exercice », « réussi » et « palier » des textes
proposés. « une », « étoile », « à », « la », « de », « le » et « grand » sont couverts.
Cette mesure ne prouve donc pas une couverture CE1 complète du texte d'interface. Aucun mot
n'est ajouté au dictionnaire pour fabriquer une mesure verte.

## Évolution demandée pendant l'essai

À 19:47 UTC, la lecture seule de la base locale retrouve dix-huit formes pour Ezekiel, dont ER nouvellement obtenue. Son stade reste besace (rang8), seuil16formes. Le prochain stade veilleur exige20formes : ER, dix-huitième forme, ne déclenche donc pas de changement. Deux formes supplémentaires sont nécessaires, soit dix nouveaux exercices réussis au rythme courant de cinq par forme. Les formes historiques restent acquises malgré le recalcul des crédits uniques ; leur total ne se confond pas avec le nombre de paliers intermédiaires de la cascade recalculée.

Le passage discriminant de l'orchestrateur constate quatre échecs attendus sur les nouveaux
libellés. Le composant est ensuite corrigé : même modèle, mêmes cases et mêmes attributs de
comptage, mais unité explicite pour chaque palier et aucune promesse de zone. Les libellés
singuliers et le cas de palier atteint suivent la même règle. La validation ciblée finale
reste exécutée par l'orchestrateur.

## Clôture du lot intégré

Une seule campagne npm run verifier a été exécutée jusqu'à son code final1 (1001,1s). Lecture du RAPPORT.md : 873 parcours et320cas qualité réussis, compilation/rejeu/contenu/lint/TypeScript réussis. Le rapport global reste rouge : un oracle de validation des tracés supposait encore deux gestes identiques au lieu des quatre résultant du b demandé ; les trois références visuelles historiques divergent (cour d'école, coloriage initial, coloriage à une cible de la fin). Aucune référence visuelle ni de rejeu n'a été modifiée.

Après la campagne et le complément utilisateur sur les jauges : oracle géométrique précis corrigé, 69tests ciblés passent ; les cinq parcours navigateur de cascade et de tracé passent. TypeScript, lint ciblé et reconstruction de production passent. Le rapport global conserve honnêtement son résultat initial, sans le remplacer par ces contrôles ciblés. Les libellés nomment désormais les exercices nouveaux et les formes au lieu de promettre une zone. Le module servi vérifié par HTTP est index-B7topYkh.js ; il contient la règle explicite de l'étoile et ne contient plus « zone à rallumer ». Le serveur répond200 sur http://127.0.0.1:8080/.

Le périmètre demandé est livré localement : b, d, stabilité au refus, sortie de boucle Galeries, libellés des trois jauges et explication du prochain stade. Restent hors de ce lot les trois références visuelles historiques et les six nœuds hors portée de la mesure optimiste globale. Aucun commit/push ; profil personnel conservé.

## Vérification du compteur rare après trois nouveaux exercices

Après le signalement « Encore6formes » inchangé, lecture seule de la base : 23crédits uniques, 3depuis le dernier palier intermédiaire, 4paliers intermédiaires, 18formes conservées (ER reste la dernière). Les trois nouveaux exercices Clairière02/07/09 sont bien enregistrés. La prochaine forme arrive après deux nouveaux exercices ; le compteur rare passera alors de6à5. Il reste27nouveaux exercices jusqu'au palier rare (50crédits), et7jusqu'au prochain stade de Gobi (20formes, avec l'historique conservé). Aucun défaut de sauvegarde ni de calcul constaté dans ce signalement ; aucune règle modifiée.

## Compteur rare exprimé en exercices — complément demandé

Le parent demande que le décompte du grand palier bouge à chaque nouvel exercice réussi. CascadeRecompense convertit désormais la jauge rare en exercices à partir des deux jauges reçues : requis = seuil rare × seuil intermédiaire ; acquis = paliers intermédiaires acquis × seuil intermédiaire + exercices acquis depuis le dernier palier. Le texte, la barre et data-restant utilisent cette même unité. Le modèle métier et les seuils ne changent pas.

Le test de composant a été constaté rouge sur 23 crédits ; après correction il vérifie 27 → 26 → 25 exercices restants, la conservation à 25 sur une reprise sans crédit, puis 1 → 50 au franchissement du palier et l'attribution exacte du palier rare. La famille initiale de 41 tests passe. L'assertion navigateur de la cascade traduit explicitement les unités du modèle serveur en exercices affichés ; elle ne retire aucun contrôle de progression.

Livraison du complément : serveur local relancé, TypeScript/build/lint ciblé réussis ; les 154 cas de progression lancés avant ajout du nouveau cas à la commande passent, puis les nouveaux tests compteur/debug passent séparément. Trois parcours navigateur cascade réussissent. Une navigation réelle vers /debug/recompenses?exercices=23 vérifie le vrai rendu 27 → 26 → 26, sans écrire de tentative ni de profil. Le nouveau cas compteur est désormais inclus dans test:progression. La vérification générale de la clôture précédente reste la dernière campagne complète, sans annoncer ce complément comme une nouvelle certification globale.
