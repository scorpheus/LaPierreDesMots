---
name: banc-de-mutation
description: >-
  Mesurer ce que la QA du projet attrape réellement, et détecter les tests qui rassurent sans rien
  prouver. À utiliser dès qu'il s'agit de tester la QA elle-même — taux de survie des mutations,
  tests sans assertion, tests désactivés, assertions tautologiques, écrans ou moteurs sans garde,
  tableau de bord de la QA. Couvre aussi les pièges qui rendent une mesure de mutation fausse :
  contrôles négatifs absents, campagne parallèle qui écrit dans tests/, rapport partiel écrasant
  le rapport complet, restauration qui écrase le travail d'un autre.
---

# Le banc de mutation, et le détecteur de tests trompeurs

## Progression et sauvegarde : commencer par le parcours cumulé

`npm run test:progression` exécute la famille sans couverture ni navigateur ; la recette
`parcours-progression-cumulee.spec.ts` passe ensuite par la carte avec les gestes natifs.
Les cas tactiles isolés restent complémentaires : leur réussite sur un profil neuf ne
prouve pas la reprise d’une sortie interrompue. Comparer l’ensemble exact des nœuds acquis,
les compteurs affichés et les récompenses après chaque exercice puis après rechargement.

Pour un enregistrement asynchrone, maintenir une promesse non résolue puis la rejeter ou
la résoudre : exiger ACK avant navigation, même clé au réessai, absence de gain appliqué
à une autre tentative ou à un autre profil. Une réponse factice `{}` ne représente pas
un enregistrement réussi : fournir une enveloppe `gainCascade` valide.

Pour une évolution illustrée, comparer le `href`/`src` effectivement rendu entre deux
stades. `data-stade` peut annoncer Gardien tout en affichant le même sprite de joie.

La décision parent du 6 septembre compte un crédit par nouvel exercice réussi : le rejeu
améliore les étoiles mais ne donne pas de crédit supplémentaire. Vérifier incrémental et
recalcul sur le même journal, avec reprises et échecs, et préserver les récompenses acquises.
Voir `Docs/audit-qa-progression-2026-09-06.md` pour les mesures et limites du lot.

Pour un dépassement RPC Vitest, mesurer d’abord le bruit réellement produit, sans masquer
les erreurs non capturées. L’exploration générait 7 130 avertissements `act` malgré
`silent: 'passed-only'` : ce réglage d’affichage ne corrige pas l’environnement React.
Importer `act` depuis Testing Library dans son harnais configure et restaure cet
environnement même avec `globals: false`. Conserver le test qui compte ces avertissements
et les assertions du graphe ; zéro avertissement ne remplace pas la navigation validée.

Le balayage générique des commandes utilise `tests/e2e/audit-interactions.ts` : inventorier
des identités, refuser les doublons, conserver les repères DOM puis retrouver la cible à
froid si une réponse précédente l’a retirée. Une absence persistante reste non vérifiée.
Tester la cible seule avant l’amorçage, puis après chaque amorce ; rétablir l’écran quand
une amorce navigue ailleurs. Les contrôles du helper couvrent déplacement, remplacement,
homonymes et faux adaptateur. Ce balayage synthétique n’est pas une recette tactile.

Pour le chaudron, attendre le moteur et le masque raster chargé. La couleur se trouve dans
`canvas[data-raster-couche="couleurs"]`, pas dans le HTML ni dans l’état global du jeu :
comparer ses pixels, en excluant les particules. Le contrôle exige un signal égal si les
pixels sont inchangés et différent lorsqu’ils changent à DOM identique. Ne pas déduire le
rendu du seul nom `SceneLibre` : cette scène peut choisir le SVG ou le raster indexé.

La chaîne complète conserve maintenant les artefacts dans trois dossiers distincts :
`tests/rapports/artefacts/e2e`, `visuel`, `qualite`. Les appels ciblés continuent d’utiliser
leur dossier par défaut ; passer un `--output` dédié pour conserver un échec ciblé.

**Sources à lire : historique, recettes et dernière mesure sont distincts.** Ne pas recopier
un ancien nombre comme état du jour ; ne pas modifier une référence pour rendre un résultat vert.

| Fichier | Ce qu'il porte |
|---|---|
| `Docs/audit-qa.md` | La mesure de référence du 2026-08-02 : 27 mutations, 11 survivantes, 6 tests trompeurs, 6 zones aveugles |
| `scripts/qa/recettes.mjs` | Les recettes, leur verdict de RÉFÉRENCE et la justification écrite de chaque survivant |
| `tests/rapports/qa/mutations.json` | La dernière mesure complète |
| `tests/rapports/TABLEAU-DE-BORD-QA.md` | L'état de la QA sur une page |

---

## Les trois commandes

```
npm run qa:mutations     # ≈ 30–35 min · casse le code 33 fois et regarde si la suite hurle
npm run qa:trompeurs     # ≈ 2 s   · les tests qui n'assertent rien, ou pas ce qu'ils disent
npm run qa:tableau       # < 1 s   · la page à lire en trente secondes
```

`qa:tableau` LIT les deux rapports précédents ; il ne recalcule rien. Une case qui dit
« non mesuré » n'est pas un zéro, c'est un ordre à taper.

---

## AVANT de lancer le banc — les trois vérifications qui décident de tout

### 1. La base doit être verte, et le banc le vérifie lui-même

```
npm run test
```

Si elle est rouge, **arrêter là**. Toute « détection » mesurée sur une base rouge est un faux
positif. Le banc refuse de jouer une seule recette dans ce cas, et il le dit.

Mesuré le 2026-08-02, deux fois de suite sur ce dépôt : la base a rendu ROUGE puis VERTE à
trois minutes d'écart, sans qu'aucune recette ne tourne entre les deux — une campagne
parallèle écrivait un fichier de test *suivi par git*. Le garde a fonctionné : il a refusé de
mesurer.

### 2. Aucune campagne ne doit écrire les fichiers-cibles

Le banc imprime, au démarrage, la liste de ses fichiers-cibles qui sont déjà modifiés dans
l'arbre de travail. **Ce n'est pas un refus, c'est un avertissement** — mais lancer le banc
pendant qu'un autre agent écrit `client/src/api/client.ts` fait courir un risque réel : si
l'autre écrit pendant les 9 secondes où le fichier est muté, sa version reprendra la mutation.

Le banc se protège dans l'autre sens : avant de restaurer, il relit le disque. Si le contenu
n'est plus celui qu'il a écrit, **il ne restaure pas** et crie `COLLISION`. Écraser le travail
d'un autre pour nettoyer le sien coûte infiniment plus cher que de s'arrêter.

### 3. Les tests non suivis par git sont exclus — automatiquement, à chaque essai

```
git ls-files --others --exclude-standard -- tests
```

Ce sont exactement les fichiers qu'une autre campagne est en train d'écrire. Le banc recalcule
cette liste **à chaque recette**, pas une fois au départ : une campagne en ajoute pendant que
le banc tourne.

> **C'est la leçon la plus chère de l'audit.** Son premier passage a rendu 23 détectées sur 23.
> Résultat flatteur, donc suspect. Les cinq contrôles négatifs ont tous rougi : le banc comptait
> la rougeur d'une autre campagne comme sa propre détection. Sans eux, le document aurait publié
> « 0 survivant » et le père aurait cru sa QA parfaite.

---

## Les cinq invariants du banc

| # | Invariant | Ce qu'il coûte de l'oublier |
|---|---|---|
| 1 | **Ancrage unique**, sinon refus de démarrer | La mutation frappe ailleurs qu'on croit ; `d-panse` et `q-panse` portent le même `chemin` (D33) |
| 2 | **Restauration dans un `finally`, et jamais aveugle** | On écrase le travail d'un autre écrivain |
| 3 | **Tests non suivis exclus, recalculés à chaque essai** | On compte le bruit des autres comme sa détection |
| 4 | **Cinq contrôles négatifs**, qui doivent RESTER verts | La mesure entière ne vaut rien, sans qu'on le sache |
| 5 | **Base verte avant ET après** | Avant : faux positifs. Après : une restauration a échoué, le dépôt est sale |

---

## La règle d'échec, et pourquoi elle n'est pas « zéro survivant »

Le banc sort en **1** dès qu'un de ces cinq faits est vrai :

- une mutation attendue `DETECTEE` a **survécu** → la QA a régressé ;
- un contrôle négatif a rougi → la mesure n'est pas opposable ;
- la base n'était pas verte, avant ou après ;
- un ancrage a été perdu → une recette pourrit sans le dire ;
- une collision d'écriture a été détectée.

Une mutation attendue `SURVIT` qui se fait **détecter** n'échoue pas : c'est une AMÉLIORATION.
Le banc imprime la ligne exacte à changer dans `recettes.mjs`. **Le cliquet ne se resserre qu'à
la main, mais il ne se desserre jamais tout seul.**

> ### Une AMÉLIORATION se CONFIRME avant de resserrer quoi que ce soit
>
> Mesuré le 2026-08-02, et payé sur pièce. Le banc a rendu `🎉 AMÉLIORATION` sur M2 (« le bouton
> *La carte* disparaît de l'écran du nœud »). J'ai passé son `attendu` à `DETECTEE`. Le banc
> suivant l'a vue **SURVIVRE**, et il a sorti 1 — le garde a fonctionné, contre son propre auteur.
>
> La détection venait de `tests/composants/exploration-modele.test.tsx`, qu'une campagne
> parallèle écrivait : **au premier banc le fichier n'existait pas encore, au second il existait
> mais n'était pas suivi par git**, donc l'invariant 3 l'excluait. Deux mesures justes, deux
> dépôts différents.
>
> ```
> npm run qa:mutations -- --seulement=<id>     # confirmer AVANT d'éditer `attendu`
> ```
>
> **On ne resserre pas un cliquet sur une mesure qu'on n'a pas reproduite.** Un cliquet resserré
> à tort transforme le prochain banc en faux rouge, et un faux rouge se fait désactiver.

> Pourquoi pas « rouge dès qu'une mutation survit » ? Parce que 10 des 27 survivent aujourd'hui
> pour des raisons écrites et acceptées — un écran sans test de composant, une taille rendue
> qu'un DOM sans mise en page ne peut pas mesurer. Une commande rouge en permanence est une
> commande qu'on cesse de lire, et c'est le mode de défaillance que ce banc combat.
> **Tout survivant porte donc son `pourquoi` dans `recettes.mjs` ; tout NOUVEAU survivant
> fait rougir.**

---

## Ajouter une recette

1. Écrire l'ancrage **sur une seule ligne**. Le dépôt est sur Windows et git normalise
   LF ↔ CRLF : un ancrage littéral multi-ligne casse au premier `git checkout`. Si le défaut
   demande plusieurs lignes, utiliser une expression régulière qui traverse par `[\s\S]`
   (voir `M1`).
2. Vérifier l'unicité **sans rien exécuter** :
   ```
   npm run qa:mutations -- --liste
   ```
   Cette commande contrôle chaque ancrage et sort en 1 si l'un a rouillé. Une seconde.
3. Mesurer la recette seule :
   ```
   npm run qa:mutations -- --seulement=M27
   ```
   Un banc partiel écrit `mutations-partiel.json` et **ne touche pas** au rapport de référence.
4. Inscrire le verdict MESURÉ dans `attendu`. Si c'est `SURVIT`, écrire `pourquoi` — un
   survivant sans justification est un trou de QA maquillé en décision.

---

## Le détecteur de tests trompeurs

Six détecteurs, deux gravités :

| code | ce qu'il attrape | gravité |
|---|---|---|
| `TEST-DESACTIVE` | `.skip` / `.only` / `.todo` / `.fixme` | **bloquant** |
| `FICHIER-SANS-ASSERTION` | un fichier de test sans une seule assertion | **bloquant** |
| `CAS-SANS-ASSERTION` | un `it(...)` qui n'assert rien, ni directement ni par une aide du fichier | **bloquant** |
| `FRACTION-NON-ASSERTEE` | on imprime « X sur Y » et rien ne relie X à Y | avertissement |
| `CHIFFRE-JAMAIS-ASSERTE` | un chiffre imprimé qui n'entre dans aucune assertion du cas | avertissement |
| `ASSERTION-TAUTOLOGIQUE` | le sujet de l'assertion est aussi son attendu | avertissement |
| `MESSAGE-QUI-SURPROMET` | le message affirme une propriété que le matcher ne mesure pas (D48) | avertissement |

**Bloquants : tolérance zéro.** Avertissements : un **plafond gelé**, mesuré, qui ne descend
qu'à la main. Le détecteur imprime lui-même la valeur à laquelle resserrer le plafond dès
qu'il mesure moins.

### Les faux positifs qu'il a fallu payer, et qu'il ne faut pas réintroduire

Ce détecteur a rendu **33 bloquants** à son premier jet, tous faux. Un détecteur qui crie faux
se fait désactiver, ce qui est pire que pas de détecteur. Les cinq causes, toutes mesurées :

1. **`it.each(table)(…)`** — la parenthèse à équilibrer est la **dernière** du motif, pas la
   première ; sinon le corps du cas n'est jamais lu.
2. **`.test(f)` d'une expression régulière** lu comme un cas — d'où le `(?<![.\w$])`.
3. **`fc.assert(fc.property(…))`** de fast-check est une assertion, même sans `expect`.
4. **Une aide locale qui assert pour le cas** (`function refuse(…) { … expect(…) }`) : on
   énumère les FONCTIONS qui assertent, pas les occurrences du mot `expect` (D48).
5. **`test.slow()`, `test.describe(…)`, `test.beforeEach(…)`** ne sont pas des cas : un cas a un
   corps (`=>` ou `function`) et son suffixe appartient à une liste blanche.

---

## Prouver que ces outils peuvent échouer

Un garde qu'on n'a jamais vu se déclencher n'a pas fait ses preuves. Les trois chemins :

```
# 1. le banc — un jeu de recettes de preuve, sans toucher aux recettes gelées
npm run qa:mutations -- --recettes=<chemin>/recettes-de-preuve.mjs
#    P1  mutation attendue DETECTEE dont le remplacement est inerte  → ROUGE « a SURVÉCU »
#    P2  ancrage inexistant                                          → ROUGE « ancrage perdu »
#    PN1 contrôle négatif qui casse vraiment                         → ROUGE « mesure non opposable »

# 2. le détecteur — poser un fichier de test qui porte les deux défauts, puis le supprimer
#    un `it()` sans expect + un `it.skip()`                          → ROUGE, 2 bloquants

# 3. le tableau de bord — le pointer sur un dossier vide
npm run qa:tableau -- --racine=<un dossier vide>                     → ROUGE, 4 populations nulles
```

---

## Auditer une régression responsive vue sur un appareil réel

Une capture laide peut rester verte si la sonde ne mesure que « aucun bouton coupé ». Reproduire
alors les **trois dimensions de l'état réel**, pas seulement la largeur de l'écran :

1. le viewport CSS utile, barres du navigateur déjà retranchées ;
2. l'orientation ;
3. les réglages de lecture du profil (`corpsPx`, interlettrage et interligne).

Écrire d'abord un cas ciblé dans `tests/qualite/responsive-tous-ecrans.spec.ts` et constater le
rouge sur l'ancien rendu. Les assertions doivent nommer la composition attendue : zones qui ne se
recouvrent pas, largeur minimale du texte, proportion maximale d'un réceptacle, absence de
sous-scroll indésirable. Une simple assertion de visibilité ou de débordement de page ne prouve
pas cela.

Après correction : cas ciblé, puis `npm run test:responsive`. Cette campagne reste la boucle
courte ; `npm run verifier` ne vient qu'à la clôture du lot. Si le nouveau garde ne rougit jamais
sur l'ancien rendu, il n'explique pas la photo et ne doit pas être présenté comme sa régression.

Le balayage de toutes les recettes ne suffit toujours pas : il prouve l'atteignabilité, pas que
chaque famille de jeu garde sa composition. Maintenir une table de sondes indexée par moteur,
comparer exactement ses clés à l'union déclarée dans le code, puis ouvrir au moins un nœud de
chaque moteur avec le profil réel. Un moteur ajouté sans sonde doit faire rougir l'inventaire.

---

## Jouabilité tactile : les preuves ne sont pas interchangeables

Trois chemins coexistent :

- `parcours-campagne-gestes-75.spec.ts` injecte `__test.repondre` : transitions logiques seulement.
- `npm run test:tactile` termine tous les nœuds par les entrées natives du navigateur, avec
  rotation après le premier geste et réglages de lecture agrandis. L'oracle peut lire la réponse,
  mais ne doit jamais l'injecter au moteur. Tri et paires sont parcourus à rebours.
- `tests/qualite/composition-exercices.spec.ts` mesure les vrais pixels accessibles, les textes
  coupés et les occlusions ; ses contrôles injectent une image cassée, une prise masquée et une
  géométrie instable. Il appartient à `npm run test:responsive`.

`qa-outils.taper` emploie des événements DOM synthétiques : ne pas l'utiliser comme preuve de
hit-testing. Pour isoler une régression, filtrer `test:tactile` avec `-- --grep <noeud>` puis
relancer tous les nœuds de la mécanique après une correction commune. Un seul orchestrateur
construit et lance Playwright ; aucune reconstruction concurrente de `dist-test`.

Pièges reproduits le 5 septembre 2026 :

- Une mise à jour API du profil ne renouvelle pas l'objet déjà conservé par React Query. Recharger
  les profils avant la recette et mesurer le corps/interligne CSS ; une intention « 27 px » peut
  sinon tester réellement 24 px. Effacer la sélection locale **avant** le rechargement, pas
  seulement après : le démarrage peut restaurer un ancien joueur.
- `scrollIntoView` sait déplacer un conteneur `overflow:hidden`, contrairement au doigt. La sonde
  restaure ces déplacements avant de mesurer ; conserver son contrôle négatif de rognage.
- Un tap natif Playwright peut encore faire défiler la page **par code avant le tap**. Il ne
  prouve pas le balayage d'une liste. Pour une grille longue, utiliser `balayerAuDoigt` dans
  `tests/e2e/gestes-defilement.ts`, depuis une carte visible : événements CDP touchStart/Move/End,
  puis vérifier scroll de page, dernière carte atteinte et absence de sélection/erreur parasite.
  Le témoin de `parcours-paires-defilement.spec.ts` doit rester immobile sous `touch-action:none`
  puis défiler sous `manipulation`. `synthesizeScrollGesture` ne passait même pas ce témoin
  positif sur le Chromium local : ne pas utiliser son retour réussi comme preuve de geste.
  Tester aussi le maintien-glisser si le composant distingue ce geste du balayage. Ne pas
  appliquer aveuglément cette règle à une ardoise de dessin qui doit capturer le doigt.
- Pour un coloriage, cliquer un cercle invisible ou le centre d'un rectangle ne prouve rien.
  Tester les pixels du vrai chemin SVG, ou le masque Canvas après son état `pret`. Les prises
  réservées au clavier ne remplacent pas les régions dessinées.
- Le dernier tap peut terminer l'exercice puis activer un bouton du nouvel écran. Exiger la
  récompense et l'absence de remise à zéro, pas seulement un changement quelconque de l'état.
- Les dimensions calculées d'une grille ne prouvent pas ses dimensions rendues : une image en
  pourcentage d'un bouton sans taille définie peut déborder malgré le calcul. Mesurer le DOM.
- Mesurer aussi l'appui maintenu : `scale(0.96)` faisait passer une cible de 64 à 61 px,
  invisiblement sur les captures au repos. `cassecou.spec.ts` attend le transform stabilisé,
  mesure la prise puis demande réellement l'aide au doigt. Distinguer aide automatique et
  volontaire selon le retour parent R15 (`retours-de-jeu.md`), pas le R15 des specs (audio).
- Utiliser `attendreGeometrieStable` plutôt qu'un nombre fixe de frames. Entre le prévol réseau
  et la mesure, React peut ajouter une image : attendre son `decode()` avant de juger ses
  dimensions naturelles. Les contrôles « image ajoutée entre prévol et mesure » et « image
  cassée » de `composition-exercices.spec.ts` doivent respectivement réussir et rejeter.
- Un contrôle du centre seul ignore les ailes d'une luciole qui interceptent le bord de sa
  voisine. Mesurer aussi les quatre côtés intérieurs avec `elementFromPoint`, puis remonter les
  ancêtres pour identifier le vrai conteneur défilant. `fullPage` ne capture pas le contenu d'un
  `main` encore limité par `max-block-size:100dvh`. Cas discriminants :
  `tests/e2e/parcours-attrape-accessibilite.spec.ts` (sept fiches, cinq formats).
- Une commande HTML dont les coins reçoivent le doigt mais dont le centre est couvert reste
  défectueuse. Conserver le contrôle négatif de couverture centrale ; réserver l'exception des
  formes concaves aux vraies géométries SVG.
- Les titres et consignes hors boutons ne sont pas couverts par le balayage des prises. Contrôler
  leur propre composition : une réserve flex centrée dans une rangée comprimée peut faire
  remonter son titre sous le carton précédent sans masquer le centre d'un seul bouton.
- Importer `test` depuis `./invariants.js` pour une nouvelle recette E2E, pas directement depuis
  le harnais serveur : l'isolation ne remplace pas la sentinelle qui suit les invariants en cours.
- Une sentinelle permanente doit aussi attendre les dimensions stabilisées pour juger R16,
  sans suspendre les erreurs ou la sauvegarde. Observer les tailles avec `ResizeObserver` :
  un bouton peut rétrécir sans changer la population ni provoquer le relevé attendu. Conserver
  le contrôle qui accepte une taille transitoire corrigée et refuse le vrai bouton de 20 px.

L'audit `npm run qa:coherence` vérifie les références, les réponses reconstituables et certaines
contradictions textuelles sans LLM. Ce n'est ni une validation esthétique ni une preuve autonome
du niveau CE1. Une correction de contenu reste soumise à la validation parentale du projet.
Les critères de réceptacles Tri sont aussi lus et vocalisés : corriger les seules consignes
laissait dix « son de … » à l'écran. Ils sont maintenant couverts par le même garde.
Vérifier séparément `node scripts/valider-brouillons.mjs` avant toute affirmation sur le lexique :
le contrôle 9 de `test:contenu` est historiquement non exécuté pour seuil non arbitré. Sa liste
artisanale de 546 mots et les conjugaisons qu'elle ignore ne constituent pas un référentiel
scolaire complet ; nommer les absences sans les assimiler à autant d'erreurs pédagogiques.

Pour les jeux à règle changeante, jouer le parcours encodé ne prouve pas que les autres choix
sont justes. Employer un oracle sémantique indépendant des id attendus : classer les mots
visibles, vérifier chaque voisin possible et le maintien de vrais contre-exemples. Contrôler
le changement de règle, la remise à zéro des coches de manche (pas des acquis) et une nouvelle
demande d'aide après un pas. Pour Attrape, vérifier la permutation spatiale et sa stabilité
pendant la lecture, pas seulement l'ordre DOM. Exemples exécutables :
`chemin-plateaux-semantique.test.ts`, `MoteurCheminEtapes.test.tsx`,
`MoteurAttrapeMelange.test.tsx`, `parcours-chemins-regles.spec.ts` dans `tests/`.
Une table phonétique fermée ne certifie pas un mot nouveau ou une chronologie ; ces cas
restent signalés à la relecture plutôt que comptés dans les réussites sémantiques.

Une regex sur une garde ne prouve pas son comportement : le test R17 exigeait une clause
en dernière position et rejetait une garde Chemin plus précise. Pour une règle de journal,
exécuter les moteurs du registre sur leurs fixtures et une horloge contrôlée. Le scénario
« palier automatique → demande explicite » de `aide-demandee.test.ts` vérifie les deux
paliers sur les treize moteurs et rejette un état simulant une demande ignorée. Il a aussi
trouvé le résumé Colorie qui comptait encore l'aide automatique : contrôler le résumé public,
pas seulement le socle commun qu'un ancien moteur peut ne pas utiliser. Tout changement de
journal reste accompagné du rejeu inchangé ; jamais d'actualisation automatique des références.

Sur mobile, un débordement peut agrandir `innerWidth` **et** `innerHeight`, même si le
viewport CSS ne change pas. Un repli piloté par ces mesures peut alors s'annuler lui-même.
Ne pas conclure « scrollbar » sans relever les cadres : le cas Chemin à 360×640 gardait
344 px de largeur de moteur mais alternait grille/plateau toutes les quatre images.
Le viewport de mise en page (`document.documentElement.clientHeight`) a supprimé ce cycle.
Le cas « chemin étroit » de `responsive-tous-ecrans.spec.ts` suit les cadres consécutifs,
puis vérifie rotation, grand écran et retour au petit écran. Une capture unique ou un
simple second passage vert ne prouve pas la stabilité ; conserver le rouge discriminant.

### Reconnaissance visuelle : un oracle ne prouve pas la clarté

Le coloriage du tapis a passé les taps natifs alors que le parent ne reconnaissait pas les
« feuilles » : l'oracle connaissait les chemins, l'enfant voyait des ornements floraux minuscules.
Pour une cible dessinée, mesurer la silhouette réelle, pas son cercle de repli clavier ; montrer
le rendu gris sans halo à taille réduite et vérifier que le nom désigne un objet reconnaissable
et unique. Les mots relatifs (« en haut ») doivent nommer leur repère quand il est ambigu.
Conserver séparément les verdicts mécanique, reconnaissance et validation parentale. Un
identifiant cohérent et un pixel réactif ne sont pas des preuves de compréhension.

`npm run qa:coloriages` produit une revue depuis les SVG réellement déclarés et leurs PNG :
gris sans aide, vrais masques superposés, boîtes et empreintes des deux fichiers. Son code zéro
atteste seulement la production de ces preuves, jamais la reconnaissance. Examiner les objets
et les silhouettes côte à côte avant d'utiliser la réussite d'un parcours comme visa : le 5
septembre, le caillou des Marais réussissait sur un masque situé dans l'eau. Une validation
d'image d'ambiance ne vaut pas validation de coloriage. Rouvrir la revue quand l'empreinte du
fond ou du masque change. Ne pas confondre les empreintes historiques RGB décodées du verrou
avec celles des fichiers PNG ; une compression différente n'est pas une autre illustration.

### Plateau entier et cadrage réel d'une sortie

Pour une demande de plateau entier (Paires), la recette de défilement ne suffit pas :
`tests/e2e/parcours-paires-cadrage.spec.ts` exige simultanément toutes les cartes, le retour et
l'aide dans le viewport, sans `scrollIntoView`, puis vérifie sélection, paire acquise et rotation.
Conserver cette recette en complément du balayage natif sur les formats trop petits.
Une entrée directe par `allerAuNoeud` ne monte pas l'en-tête « Exercice … sur … » : tester aussi
une sortie. Si son plan est remplacé par une fixture HTTP, installer l'interception **après**
`appliquerReglagesLectureReels` : ce helper appelle `preparerSansProfil`, qui retire les routes.
Le bon moteur et la présence de l'en-tête doivent être assertés avant toute mesure.

### Recette native Android, distincte de l'émulation de viewport

`npm run qa:apk` utilise un émulateur isolé déjà lancé sur 5554 et l'APK déjà installé ; jamais
la tablette de l'enfant. Voir `Docs/audit-livrables-2026-09-05.md` pour l'invocation locale validée.
Lancer l'AVD avec `-read-only -no-snapshot -no-window`, conserver ses données de base, puis arrêter
seulement cet émulateur de recette. Aucun pilote Android additionnel n'est nécessaire :
`_android.devices({ omitDriverInstall: true })` accède à la WebView existante.

La WebView peut refuser `locator.tap()` faute de contexte `hasTouch`. Utiliser les vrais événements
CDP `Input.dispatchTouchEvent`, avec hit-testing du centre ou d'un pixel du path ; ne pas remplacer
par un `dispatchEvent` DOM. Attendre le SVG illustré, ses images décodées et les polices.

Une lecture SQL brute pendant une transaction voit parfois une écriture non commitée. Attendre
la lecture du port public sérialisé avant de comparer après relance. Après `am force-stop`,
attendre la fermeture de l'ancienne WebView avant de rattacher la nouvelle. Un arrêt après commit
ne prouve pas la résistance à l'arrêt forcé pendant la transaction ; garder ce verdict distinct.

`npm run qa:ancrages` est un prévol rapide de la chaîne globale, **hors** des suites que le banc
exécute pendant une mutation : y tester la présence du code original créerait de fausses détections.

## Ce que le banc ne mesure PAS, et qu'il ne faut pas taire

### Commandes chargées, champs, exports et branches destructives

Attendre les données du panneau avant son inventaire : un dashboard déjà monté peut encore
ne contenir que son en-tête. Identifier les champs par leur réglage et les commandes répétées
par le brouillon auquel elles appartiennent, sans utiliser leur rang comme identité.
Une saisie se vérifie sur la propriété courante du champ après événements `input`/`change` ;
un export se vérifie sur le téléchargement terminé et son nom, pas sur un changement du DOM.
Ces signaux restent distincts de la persistance ou de la justesse du contenu exporté.

Une navigation ne remet pas la base à neuf : valider un brouillon supprime la branche Rejeter.
Pour explorer les deux, `serveurIsole.reinitialiser()` recrée la base en mémoire sur le même
port, après avoir quitté la page ; la recette remonte ensuite l'état initial. Le contrôle
`parcours-restauration-harnais.spec.ts` vérifie deux réinitialisations successives et la
disparition des seuls profils de test. Ne jamais remplacer cela par une remise à zéro de
la base personnelle. Voir `Docs/audit-qa-progression-2026-09-06.md` pour les rouges et mesures.

Un crochet de test absent après navigation peut venir du chargement du bundle : lire la trace
réseau/console avant d'accuser le moteur. Le 9 septembre, Chromium signale
`ERR_NO_BUFFER_SPACE` sur un module JS ; le cas passe isolément, puis les 872 E2E passent avec
`PIERRE_TRAVAILLEURS=3`. Conserver le passage rouge et les cas dépendants non exécutés dans
le bilan. Le passage à trois est une reprise mesurée, pas une suppression d'assertion, une
augmentation de délai ni la preuve que l'épuisement des ressources est définitivement résolu.

Pour conserver une comparaison visuelle refusée, relancer le cas avec un `--output` dédié dans
`bac-a-sable/` : les invocations suivantes de Playwright nettoient son répertoire commun.
La copie des références reçue dans ces artefacts n'autorise pas leur remplacement. Exemple
exécuté et limites : `Docs/lot-corrections-cloture-2026-09-06.md`, dernière section.

**Les E2E ne sont pas un étage de ce banc.** `playwright.config.ts` sert
`node serveur/dist/index.js` : les parcours exigent un build, et la compilation appartient à
l'orchestrateur (D10). Les recettes couvertes en E2E portent le champ `assertionE2E`, qui
**nomme le fichier et l'assertion**. C'est plus faible qu'une exécution, et c'est écrit comme
tel partout où le chiffre apparaît.

Trois étages tournent, dans cet ordre, et le premier qui rougit tranche :
`vitest` (unitaires + composants + api) → `test:contenu` → `test:rejeu`. Aucun n'exige de
compilation : `test:rejeu` charge `partage/src` par `tsx`, `test:contenu` est un script Node.
