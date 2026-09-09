# Audit QA et progression — 6 septembre 2026

Périmètre autorisé : diagnostiquer et corriger la progression, renforcer les preuves automatiques des exercices, réduire les vérifications inutiles, revoir les instructions agents selon les recommandations officielles GPT-6 Astra.

État initial : git propre ; 141 fichiers TS partage, 150 TS/TSX client, 25 TS serveur, 274 fichiers de test, 11 migrations, 76 exercices et 76 nœuds. Ces comptes remplacent les chiffres historiques pour ce lot.

Répartition initiale : audits indépendants en lecture seule de la progression et des coûts/angles morts QA. Après lecture des rapports, corrections déléguées sur des fichiers disjoints (cascade ; sauvegarde et hydratation ; parcours navigateur). L’orchestrateur seul exécute les commandes de test, compilations et intégration.

File active : progression par exercice et retour carte ; récompenses/pierres et évolution Gobi ; qualité réelle des oracles responsive/tactiles ; durée de la boucle de test ; instructions agents ; validation finale et limites documentées. Ne pas modifier les références visuelles ou de rejeu, le contenu publié, les sauvegardes réelles ni les quatre documents de référence.

## Décision parent du 6 septembre : récompenses par exercice inédit

Réponse explicite : « Un nouvel exercice réussi compte une fois ; rejouer améliore seulement ses étoiles. »
La cascade reçoit donc un crédit à la première réussite d’un nœud, indépendamment des 1 à 3 étoiles de qualité. Les échecs, reprises et renvois idempotents ne donnent aucun crédit supplémentaire. Le seuil existant de cinq crédits par forme reste inchangé. Cette règle remplace pour ce comportement la lecture historique de D25 fondée sur le cumul des points ; le barème des étoiles reste inchangé.

Les colonnes historiques `etoiles_total` et `etoiles_depuis_inter` de la cascade conservent leur nom pour la compatibilité de stockage, mais comptent ces crédits. La projection est reconstruite depuis le journal à l’ouverture serveur et autonome. Les formes, stades, Éclats et objets déjà obtenus ne sont pas retirés. Aucune base de jeu réelle n’est modifiée par la recette.

## Diagnostic initial et preuves à conserver

Dernier rapport antérieur : environ 13 min 43 s, dont E2E 489 s, qualité 246 s, Vitest instrumenté 66 s. La nouvelle mesure sans couverture : 2 675 tests réussis en 61,64 s. Les durées dépendent de cette machine et du dépôt de ce jour.

La majorité du coût est le navigateur, pas la compilation. Les tests tactiles et responsive existent déjà ; ils prouvent les gestes et certaines géométries, mais leur entrée directe avec profil neuf ne prouvait pas la progression cumulée. La couverture de lignes ne doit jamais être présentée comme un pourcentage de défauts détectés.

Gobi : le test du `href` réellement rendu échoue avant correction car fissure et gardien emploient tous deux `animation/joie.webp` ; après correction, les fichiers des stades 2 et 10 sont rendus. Journal rouge/vert dans `bac-a-sable/gobi-progression-*.log`.

Sauvegarde : trois rouges initiaux prouvent ACK prématuré, absence de réessai et gain tardif appliqué au nouveau profil. L’ancien test résolvait une réponse `{}` invalide et exigeait l’envoi avant ACK ; cet oracle a été corrigé conformément à la règle de persistance, sans assouplir une propriété du jeu. Un quatrième cas couvre la tentative suivante du même profil.

## Instructions et boucle de travail

Source consultée et ouverte : [guide officiel GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model), section Prompting best practices. OpenAI conseille d’auditer les instructions des skills/AGENTS, de préciser la délégation et de calibrer la portée des tests. Application au dépôt : audits indépendants, fichiers disjoints, compilateur unique ; test discriminant puis famille, vérification intégrale à la clôture. Aucun changement de modèle ni de configuration personnelle Codex.

`npm run test:progression` est une boucle ciblée, pas un remplacement de `verifier`. Les historiques de mesure et les anciens propriétaires de lots ne valent pas état courant. La procédure réutilisable est ajoutée au skill QA existant dans `.agents/skills/banc-de-mutation/` ; le chemin `.Codex/skills/` du vieux document n’existe pas dans ce dépôt.

## Corrections et portée des preuves

- Une première réussite par nœud donne un crédit, une reprise zéro. La qualité en étoiles reste indépendante. Le recalcul et les insertions dans un ordre temporel différent produisent la même date de dernière première réussite.
- Une ligne de progression à zéro étoile ne compte plus comme terminée dans le monde, le choix de sortie, la carte ou les compteurs parent.
- La jauge est hydratée depuis la cascade persistée ; un changement de profil efface l’ancienne jauge et ignore les réponses tardives.
- La récompense attend l’accusé de sauvegarde et le rafraîchissement des projections. Un échec permet de réessayer avec la même clé ; si seul le rafraîchissement échoue, l’accusé et son gain sont conservés sans nouvel envoi. Une ancienne réponse ne lance plus un exercice après le retour à la carte.
- Les appels HTTP expirent après 15 secondes d’activité pour rendre une connexion suspendue réessayable. Le signal couvre aussi la lecture du corps ; voir [AbortSignal.timeout](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static). Les tests commandent l’annulation, sans attendre quinze secondes.
- La carte annonce le nombre restant pour la région ouverte dont la fin libérera le prochain emplacement, au lieu de compter seulement la région précédente dans la liste.
- L’évolution montre l’asset du stade acquis, au lieu de réutiliser la même image de joie pour tous les stades.

Les nouveaux tests ont été exécutés rouges avant correction, notamment les crédits uniques, les lignes à zéro étoile, les dates reçues hors ordre, les réponses tardives et l’expiration réseau. Les journaux sont dans `bac-a-sable/`. La famille progression a passé 105 tests en 2,56 s avant les deux derniers cas de sauvegarde ; ce temps illustre le coût d’une boucle ciblée, pas une accélération de la suite intégrale. Les sept parcours navigateur ciblés ont passé en 9,5 s avant la dernière revue ; la chaîne finale doit confirmer l’état intégré.

Le nouveau parcours cumulé part de la carte, réalise deux exercices par gestes, vérifie les identifiants exacts acquis et les récompenses, recharge puis démarre une autre sortie. Les parcours tactiles exhaustifs vérifient désormais qu’aucun autre nœud n’a été crédité. Les tests de cascade jouent des nœuds distincts : répéter artificiellement le même nœud ne doit plus fabriquer des récompenses.

## Limites conservées explicitement

La cadence reste cinq exercices inédits par forme. Les 75 nœuds de progression permettent donc 15 paliers de forme, pour un catalogue de 25 : la proposition de passer à trois attend une décision distincte du parent. Les récompenses historiques acquises ne sont pas retirées.

Le lot ne certifie pas chaque exercice sur chaque navigateur physique. Les contrôles tactiles existent sur téléphone et tablette ; l’audit de composition fine échantillonne les moteurs. Le parcours général `parcours-audit-tout-le-site.spec.ts` conserve un angle mort : un élément absent peut être classé vivant et certaines interactions suivent des rangs DOM variables. Il doit être repris séparément avec des critères propres à chaque interaction.

Mise à jour à la reprise : les absences et rangs sont corrigés dans le présent lot (voir ci-dessous). La limite sémantique demeure : une réaction DOM n’est pas une preuve d’effet métier correct.

La sauvegarde attendue et réessayable ne constitue pas une file d’envoi durable : fermer brutalement le navigateur avant l’accusé reste un cas non garanti. Aucune sauvegarde personnelle n’a été ouverte ou modifiée. Aucun contenu, seuil pédagogique, original de référence ou capture de référence n’a été changé.

Une première chaîne intégrale a été interrompue volontairement après les tests unitaires pour intégrer les défauts trouvés lors de la revue. La seconde a été arrêtée à la demande du parent pendant les E2E. Aucun de ces résultats partiels ne vaut validation intégrale.

## Pause demandée par le parent — état de reprise

Le 6 septembre 2026 vers 22 h 15, le parent demande de continuer plus tard. Les modifications sont conservées dans l’arbre de travail, sans commit ni publication. Le processus `npm run verifier` et ses descendants ont été arrêtés ; aucune campagne ne doit continuer en arrière-plan pour ce chantier.

Dernière chaîne (`bac-a-sable/audit-qa-verifier-final.log`) : ancrages, ressources, cohérence, lint, TypeScript, contenu et construction de test réussis. Vitest : **221 fichiers, 2 692 tests réussis, zéro assertion en échec, mais une erreur non capturée `Timeout calling "onTaskUpdate"`**, donc étape rouge (195,8 s). Les E2E étaient en cours à l’arrêt. Les phases visuelles, qualité et rejeu ne sont pas validées pour cet état. Lire le rapport consolidé avec cette interruption en tête ; ne pas prendre les artefacts anciens pour des résultats nouveaux.

Derniers contrôles ciblés : récompense/sauvegarde, hydratation et expiration HTTP : 38 tests réussis ; cascade, dates hors ordre et compteurs parent : réussis. Les sept E2E ciblés avaient passé avant les dernières corrections de revue. L’ancien rapport intégral présentait trois divergences visuelles (école dans `decor-v2`, deux états dans `noeud-colorie`) : leurs références n’ont pas été modifiées et leur état final reste à vérifier.

À la reprise, dans cet ordre :

1. Relire ce document et le diff ; conserver les changements présents. Lire les journaux rouges/verts dans `bac-a-sable/` si une correction est remise en question.
2. Diagnostiquer/reproduire l’erreur RPC Vitest sans l’ignorer ni augmenter arbitrairement les délais. `vitest.config.ts` limite déjà les travailleurs à quatre et utilise `silent: 'passed-only'` pour ce problème connu.
3. Relancer les contrôles nécessaires, puis `npm run verifier` jusqu’au rapport complet ; distinguer défauts introduits, divergences visuelles anciennes et problèmes d’exécution. Ne pas régénérer les références sans décision parent.
4. Compléter les mesures finales et le bilan des limites. Les angles morts de l’audit général DOM et l’absence de file de sauvegarde durable restent identifiés, pas corrigés dans ce lot.
5. La question de cadence trois ou cinq exercices par forme reste ouverte ; la seule décision reçue est le crédit unique par nouvel exercice réussi. Le code conserve cinq.

Les corrections couvrent les fichiers progression/monde, sauvegarde/récompense, Gobi, port HTTP, tests associés, `AGENTS.md`, le skill QA et la commande `test:progression`. Aucun fichier des quatre références protégées, contenu publié ou base personnelle n’est à modifier pour reprendre la validation.

## Reprise du 9 septembre 2026

Le parent demande de continuer. Les corrections de la pause sont présentes ; un document de publication distinct a été ajouté entre-temps. Il décrit la publication des seuls commits existants, sans ce chantier : aucune publication n’est entreprise ici.

Comptes relus avant les écritures de reprise : 141 fichiers TS partage, 150 client, 25 serveur, 281 fichiers de test (avec le contrôle d’interactions en cours), 11 migrations, 76 exercices et 76 nœuds.

Premières mesures : `test:progression` passe 109 cas en 3,37 s ; la suite Vitest avec couverture passe 2 692 cas en 69,60 s sans erreur non capturée. Le dépassement RPC de septembre 6 n’est donc pas reproduit par ce passage ; ne pas le déclarer corrigé sur cette seule base. Les huit parcours ciblés progression/cascade/récompense passent en 6,7 s.

Audit complémentaire délégué à fichiers disjoints : `tests/e2e/audit-interactions.ts`, `tests/unitaires/audit-interactions.test.ts` et `tests/e2e/parcours-audit-tout-le-site.spec.ts`. Trois contrôles rouges prouvent que l’ancien balayage valide une disparition, un remplacement au même rang et une dérive d’écran ; un contrôle positif d’amorçage reste vert. Journal : `bac-a-sable/audit-interactions-rouge.log`. L’orchestrateur seul exécute les vérifications.

L’explorateur React émettait 7 130 avertissements « environnement non configuré pour act », mesurés par un contrôle rouge qui transmet les erreurs à la console au lieu de les cacher. `globals: false` empêche les hooks globaux automatiques de Testing Library de configurer cet environnement ; l’explorateur utilisait directement `act` de React. Il utilise désormais le wrapper de Testing Library (code installé inspecté), qui configure et restaure le drapeau à chaque appel. Le contrôle devient vert, avec les quinze assertions de navigation inchangées. [Documentation React sur act](https://react.dev/reference/react/act). Journaux `exploration-act-rouge.log` et `exploration-act-vert.log` dans le bac à sable. Aucune accélération de cette exploration n’est mesurée (environ 60 s avant et après) ; la correction retire une source de bruit RPC, sans prouver que tout dépassement intermittent est éliminé.

L’audit renforcé a aussi trouvé un bouton réellement inerte : « Retour à la visite » était affiché sur la page de visite elle-même. Le bandeau est désormais réservé aux excursions. `parcours-retour-visite.spec.ts` échoue avant correction (bouton présent au lieu d’absent), puis vérifie la carte, le retour effectif et la disparition du bandeau. Journaux rouge/vert `retour-visite-*.log`. Aucun texte enfant ajouté.

Les artefacts navigateur de la chaîne complète vont désormais dans des dossiers distincts `tests/rapports/artefacts/e2e`, `visuel` et `qualite`. Auparavant la phase qualité pouvait effacer les différences visuelles que le rapport demandait de regarder. Le rapport visuel pointe sur son nouveau dossier ; les références restent protégées par `--update-snapshots=none`.

Le balayage des commandes conserve désormais leur identité initiale au lieu de réinterpréter les rangs DOM. Une commande absente n’est pas observée ; une identité ambiguë refuse le bilan. La reprise essaie la cible à froid, puis après chaque amorce si elle est muette, en restaurant l’écran après navigation. Les boutons homonymes sont distingués par leurs identifiants de cible/exercice existants. Les scènes et le moteur du chaudron sont attendus avant inventaire.

Correction du diagnostic chaudron : le rendu publié est **raster indexé**, choisi par `SceneLibre` d’après l’habillage ; son état local n’est pas exposé dans l’état global du jeu. La peinture change les pixels du Canvas sans nécessairement modifier le HTML. L’audit compare désormais les empreintes SHA-256 des pixels de la couche de couleurs avant/après et attend le masque chargé. Les particules ne participent pas à cette empreinte. Le treizième contrôle échoue sur l’ancien signal constant, puis passe avec pixels changés à DOM identique et pixels inchangés ; le parcours du chaudron passe en 27,7 s (28,3 s avec lancement). Ces taps restent des dispatchs synthétiques sur les commandes accessibles : la preuve du doigt reste la campagne tactile séparée.

Les 89 écrans de ce balayage ont été contrôlés : 86 réussites sur le passage global ciblé, puis les trois écrans corrigés validés séparément (dashboard, visite et chaudron). La chaîne intégrale de reprise, démarrée après lint/TypeScript verts, doit confirmer leur état commun. Les douze premiers contrôles QA puis le treizième Canvas sont verts. Les résultats finaux ne sont pas encore consignés à ce stade.

Le premier passage intégral du 9 septembre a été arrêté après un nouveau défaut d'audit du
dashboard : ses données n'étaient pas toujours arrivées au moment de l'inventaire ciblé. Le
passage global avait chargé les champs et révélé des identités ambiguës. Attendre les panneaux
réglages et relecture expose maintenant leur population complète. Les identités utilisent le
réglage ou le brouillon ; les champs texte, curseurs et listes reçoivent une modification de
valeur, pas un simple clic. Quatre nouveaux contrôles rouges deviennent verts ; les 19 tests
du helper passent (`bac-a-sable/audit-saisie-vert.log`).

Valider un brouillon retire sa commande Rejeter. Le harnais possède désormais
`serveurIsole.reinitialiser()`, qui arrête puis recrée son seul serveur à base `:memory:` sur le
même port. Le contrôle dédié échoue sans cette méthode puis passe deux créations et remises
à zéro successives en 1,6 s. Le dashboard utilise cette restauration avant chaque reprise de
recette ; une navigation seule ne restaurait pas ses données. Le passage suivant isole cinq
exports CSV muets au DOM (`audit-dashboard-complet.log`) : le téléchargement réel et son nom
attendu sont désormais observés, sans prétendre valider ainsi le contenu du CSV.

Prévol final : lint et TypeScript passent. La commande ciblée progression, complétée avec les
compteurs parent, la cascade et l'expiration HTTP, passe **136 tests en 3,49 s** sur 13 fichiers.

Le dashboard complet avec exports passe en **2,5 min** (2,6 min avec lancement). La chaîne
suivante trouve un contrôle d'hygiène rouge sur 2 712 tests : le départ vers `about:blank`
du harnais contredit la règle des navigations par la racine. Cette navigation est remplacée
par `/`, sans modifier l'assertion. Les deux contrôles de navigation et les 19 contrôles
d'interactions passent ensemble en 754 ms. La chaîne interrompue ne vaut pas validation ;
le passage de clôture est consigné dans `bac-a-sable/verifier-cloture-2026-09-09.log`.

### Chaîne complète achevée à 18 h 29

`npm run verifier` termine en **863,5 s**, code 1, avec 2 étapes rouges sur 15. Le rapport
`tests/rapports/RAPPORT.md` daté `2026-09-09T16:29:58.190Z` a été lu après la fin du processus.

- Vitest : **2 712 tests réussis**, 66,9 s, aucune erreur RPC signalée ; seuils de couverture
  par zone respectés.
- E2E : **857 réussites, 1 échec, 14 cas dépendants non exécutés**, 530,0 s. Le total de
  872 annoncé par le rapport inclut ces 14 cas ; ce n'est pas 871 réussites.
- Visuel : **10 réussites et 3 divergences**, 7,7 s : école (`decor-v2`), nœud gris et nœud
  colorié (`noeud-colorie`), les mêmes cas déjà identifiés avant la reprise. Références intactes.
- Qualité : **320 cas réussis**, 243,9 s ; bundle : **11 contrôles réussis**. Rejeu, contenu,
  constructions, lint, TypeScript, ancrages et contrôles QA réussis.

L'unique échec E2E est le démarrage du cas Q5 `foret-muette-08`. La trace contient
`Failed to load resource: net::ERR_NO_BUFFER_SPACE` pour le module JavaScript
`assets/types-CFpt2c65.js` ; le crochet de test n'a donc jamais été installé. Ce passage ne
prouve pas un défaut du coloriage. Le même cas, relancé isolément sans changement de code
ni délai, passe en **3,2 s** (3,7 s avec lancement), journal `e2e-foret08-reprise.log`.
La cause précise de l'épuisement des ressources reste à établir : ne pas conclure d'un
réessai vert qu'elle est corrigée.

Une reprise complète des seuls E2E utilise `PIERRE_TRAVAILLEURS=3`, sans modification des
scénarios ni des délais. Son rapport indépendant et ses artefacts sont dans
`bac-a-sable/e2e-trois-travailleurs*` ; ils ne remplacent pas le rapport rouge de la chaîne.

### Bilan de reprise achevé

Le passage E2E à trois travailleurs termine avec **872 réussites, zéro échec, zéro cas non
exécuté, en 11,3 min**, code 0. Il comprend les 14 contrôles de couverture et d'invariants
empêchés lors du passage précédent. Le bilan relève 47 660 observations, 10 015 gestes et
14 écrans avec sortie prouvée. Ces nombres sont des observations du harnais, pas des preuves
supplémentaires de clarté pédagogique. Le dashboard complet passe en 2,9 min ; le parcours
cumulé en 4,1 s. Les assertions et les délais n'ont pas changé entre ces passages.

Invocation reproductible, depuis PowerShell à la racine, après les constructions de la chaîne :

```powershell
$env:PIERRE_TRAVAILLEURS='3'
$env:PIERRE_RAPPORT_JSON='bac-a-sable/e2e-trois-travailleurs.json'
node scripts/playwright.mjs test --project=parcours --project=robustesse --project=bilan --output=bac-a-sable/e2e-trois-travailleurs
```

Le réglage par défaut du dépôt reste quatre travailleurs. Un passage réussi à trois fournit
une configuration de reprise mesurée, pas la preuve qu'une saturation intermittente est
définitivement corrigée. Aucun gain de vitesse de la campagne E2E n'est revendiqué : 11,3 min
pour ce passage, contre 8,8 min pour celui à quatre, incomplet. La boucle de correction rapide
est `test:progression` (136 cas, 3,49 s) ; la campagne intégrale reste celle de clôture.

La file active est réconciliée : crédits uniques et projections, sauvegarde réessayable,
hydratation de jauge, comptage carte, asset d'évolution, parcours cumulé, contrôles tactiles,
audit des commandes et instructions d'agents sont intégrés et vérifiés selon les mesures
ci-dessus. Les captures de référence n'ont pas été réécrites ; les **trois divergences
visuelles restent à arbitrer**. La validation de chaque illustration et consigne par un
enfant, la file d'envoi durable après fermeture brutale et le choix de cadence trois/cinq
restent hors du résultat livré. La cadence demeure cinq. Aucun commit ni publication de ce
lot n'a été effectué ; les modifications sont conservées dans l'arbre de travail.
