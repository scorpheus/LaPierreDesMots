# Briefs de lancement — les deux chantiers du 2026-08-07

## § 0. Comment lancer — le brief de l'ORCHESTRATEUR

**On ne recopie pas ce document dans un message.** On donne son chemin. Le recopier dans N briefs,
c'est N occasions de le déformer (D10). Ouvrir une session neuve et coller ceci suffit :

```
Tu orchestres les deux chantiers de Docs/briefs-agents-2026-08-07.md. Lis-le en entier
avant de lancer quoi que ce soit, ainsi que Docs/feuille-de-route-debug.md et
Docs/specs-qa-des-promesses-v1.md qu'il cite.

Tes règles d'orchestrateur, et elles sont à toi seul :
- TU es le seul à compiler, lancer `npm run verifier` et installer. Aucun sous-agent ne
  compile ni n'installe : jeton unique.
- Tu LIS le rapport de chaque sous-agent AVANT l'action qu'il devait informer. Un rapport
  commandé et non lu se paie deux fois.
- Tu vérifies toi-même que chaque symbole déclaré a trouvé son propriétaire : un contrat
  gelé n'oblige personne tant qu'un fichier n'est pas nommé pour chaque morceau.
- Tu ne donnes à chaque sous-agent que les lignes qu'il POSSÈDE, plus le chemin du plan.
  Tu ne lui recopies pas le plan.
- Tu relances `node scripts/qa/mesures-feuille-de-route.mjs` et
  `node scripts/qa/detecteurs-qa-aveugle.mjs` avant le premier lot, et tu signales tout
  écart avec les chiffres du document au lieu de les recopier.

Ordre de lancement imposé :
1. AGENT QA d'abord — § « AGENT 1 » du document. Attends son rapport.
   Motif : si un correctif atterrit avant qu'un garde soit écrit, son contrôle positif naît
   vert et le garde ne prouve plus rien. La preuve « rouge avant correction » se périme.
2. Puis les lots correctifs, § « AGENT 2 », UN SOUS-AGENT PAR LOT, dans l'ordre du document :
   A1, V1, B1, C1, B3, B2, C2, C3. Tu compiles et tu lis le rapport entre chaque.

Arrête-toi et demande-moi un arbitrage si un rejeu de journal diverge, si une règle non
négociable de CLAUDE.md est en jeu, ou si un lot demande de toucher l'un des quatre
documents de référence.
```

**Pourquoi un sous-agent par lot correctif, et non un seul pour les huit** : un agent qui
enchaîne huit lots épuise son contexte et perd le début. Un lot = un agent = un rapport lu =
une compilation. C'est aussi ce qui permet de s'arrêter net après A1 si quelque chose surprend.

**Modèle et effort, rappel** : `sonnet`/`medium` partout, sauf **Q2 et Q5** (`opus`/`high`, ils
conçoivent une instrumentation) et **B3** (`opus`/`high`, il change la sémantique du journal).
Ne monter l'effort nulle part ailleurs : cela ne rend rien de meilleur et ralentit tout le monde.

---

Deux agents, **périmètres de fichiers disjoints, vérifié mécaniquement** :

```
périmètre AGENT QA   :  tests/  ·  scripts/qa/
périmètre AGENT FIX  :  partage/src/  ·  serveur/src/  ·  client/src/  ·  contenu/
chevauchements       :  AUCUN   →  les deux peuvent voler ensemble
```

L'agent QA **ne corrige rien** : il rend visible. L'agent FIX **n'écrit aucun test neuf** dans
`tests/` : il fait passer au vert ceux que l'agent QA aura posés, et corrige les tests existants
qui contredisent une décision écrite.

---

## Règles communes aux deux briefs — à recopier en tête de chaque agent

1. **Les sources qui font foi, et il est INTERDIT de les recalculer** :
   - [feuille-de-route-debug.md](feuille-de-route-debug.md) — l'inventaire, les 8 défauts, l'ordre
   - [specs-qa-des-promesses-v1.md](specs-qa-des-promesses-v1.md) — les 8 modes, les 8 gardes
   - [retours-de-jeu.md](retours-de-jeu.md) — R1 → R38, les verbatims
   - [questions-en-attente.md](questions-en-attente.md) — les arbitrages **déjà rendus** (J1, J2, J3)
   - `Docs/la-pierre-des-mots-specs-v2.md`, annexes T et P, addendum — **jamais modifiés**
2. **Relancer les mesures avant la première écriture**, et signaler l'écart au lieu de recopier :
   ```bash
   node scripts/qa/mesures-feuille-de-route.mjs
   node scripts/qa/detecteurs-qa-aveugle.mjs
   ```
3. **Un fait mécanique n'est jamais affirmé** — comptage, présence d'un symbole, équilibre
   d'accolades : on exécute la commande et on **cite sa sortie**.
4. **Contrôle positif obligatoire** sur toute mesure. Quatre instruments ont menti le 7 août ;
   le § 2.6 de la spec QA les liste. Un chiffre sans contrôle positif n'est pas un résultat.
5. **Un seul écrivain par fichier.** Les lots à l'intérieur d'un même agent sont **séquentiels**
   quand ils se disputent un fichier (voir l'ordre imposé du brief FIX).
6. **Aucun agent ne compile ni n'installe** — jeton unique, la compilation reste à l'orchestrateur.
7. **Aucune sonde n'écrit dans `donnees/pierre.db`.** Base jetable, comme `tests/harnais-serveur.ts`.
   Six profils « Mesure » ont été écrits dans la vraie base le 3 août.
8. **Jamais de test en `skip`, jamais d'assertion assouplie, jamais de référence visuelle mise à
   jour de sa propre initiative.** En cas de divergence du rejeu : s'arrêter et attendre l'arbitrage.
9. **Les fichiers de travail vont dans `bac-a-sable/`**, jamais dans le dossier temporaire système.
10. **Rapport plafonné** : une table plus un verdict. Seule la synthèse a droit à la prose longue.

---

## AGENT 1 — le lot Q, la QA des promesses

**Modèle et effort** : `sonnet`, effort `medium` pour Q1 · Q4 · Q8 (implantation contre une spec
gelée) ; `opus`, effort `high` pour **Q2 et Q5** seulement — ce sont les deux qui doivent
*concevoir* une instrumentation, pas appliquer une recette.

**Pourquoi il peut partir tout de suite** : il ne touche aucun fichier applicatif, donc il ne
dépend d'aucun lot correctif. Seul **Q3 attend A1**.

### Le brief

> Tu implantes le **lot Q** de `Docs/specs-qa-des-promesses-v1.md`. Lis-le en entier avant
> d'écrire une ligne : il contient les huit gardes, leur population, leur contrôle positif et leur
> critère d'échec. Tu ne les redéfinis pas.
>
> **Tu possèdes** : `tests/**` (fichiers neufs uniquement) et `scripts/qa/controles-positifs.mjs`.
> Tu ne touches **aucun** fichier de `partage/`, `serveur/`, `client/` ou `contenu/` — un autre
> agent y écrit en parallèle.
>
> **Ordre imposé** :
> 1. **Q8** en premier, toujours. C'est le méta-garde ; sans lui les sept autres sont des
>    affirmations. Il doit rougir quand on lui retire un contrôle positif — prouve-le.
> 2. **Q1** et **Q4** ensuite (fichiers disjoints, effort faible, signalement immédiat).
> 3. **Q6**, **Q5**, **Q7**.
> 4. **Q2** en dernier : il demande une sonde d'émissions, et le § 2.2 explique pourquoi un
>    détecteur textuel **échoue son contrôle positif** sur `objet-campement`.
> 5. **Q3 : ne l'écris pas.** Il attend le lot A1. Signale-le au rapport.
>
> **Contrat de sortie, non négociable.** Pour chacun des sept gardes écrits, tu produis :
> - la sortie de son exécution **AVANT** toute correction — il doit être **ROUGE** sur le défaut
>   qui l'a inspiré, et tu cites la sortie ;
> - la sortie de son **contrôle positif** ;
> - le nombre d'objets de sa population, et **la commande qui l'a dérivée du code**.
>
> Un garde qui naît vert n'a rien gardé : si l'un d'eux passe au vert du premier coup, tu ne le
> livres pas — tu expliques pourquoi le défaut qu'il devait voir lui est invisible.
>
> **Chiffres attendus au premier tour** (ce sont des repères, pas des cibles — signale tout écart) :
> Q1 → 4 écrivains sans appelant · Q4 → `histoire` 32/32 · Q6 → 11 moteurs sur 14 ·
> Q5 → 95 mots refusés sur 122 dans `tri` · Q7 → 11 moteurs à 20 px en dur.
>
> **Tu n'as pas le droit de corriger un seul de ces défauts.** Ce n'est pas ton lot.

---

## AGENT 2 — les lots correctifs, dans un ordre imposé

**Modèle et effort** : `sonnet` effort `medium` pour A1 · B1 · C1 · V1 (implantation contre un
contrat clair) ; **`opus` effort `high` pour B3** — il change la sémantique du journal, dont le BKT
et le Leitner se recalculent, et se trompe coûte une conception entière.

**Pourquoi l'ordre est imposé et non parallèle** : trois lots se disputent des fichiers.

```
C1 (réglages de lecture) touche les 11 moteurs — dont chemin et tri
C2 (plateau chemin)      touche client/src/moteurs/chemin/   → chevauche C1
B3 (tri)                 touche client/src/moteurs/tri/      → chevauche C1
```

### Le brief

> Tu enchaînes les lots ci-dessous **dans cet ordre**, un seul à la fois. Après chaque lot, tu
> t'arrêtes, tu rends ton contrat de sortie, et tu passes au suivant. Les décisions du père sont
> **déjà prises** — elles sont dans `Docs/questions-en-attente.md`, section du 2026-08-07 ; tu ne
> les rouvres pas.
>
> **Tu possèdes** `partage/src/`, `serveur/src/`, `client/src/` et `contenu/`. Tu n'écris **aucun
> fichier neuf dans `tests/`** — un agent QA y travaille en parallèle. Tu peux corriger un test
> existant **uniquement** s'il contredit une décision écrite, et alors tu cites le passage.
>
> ---
>
> **A1 — la cascade est enregistrée et attribue vraiment (R31).** Le défaut n° 1 du jeu.
> Fichiers : `serveur/src/routes/tentatives.ts`, `serveur/src/depots/tentatives.ts`,
> `client/src/etat/magasin.ts`, `client/src/api/client.ts`.
> Ce que dit la mesure : 23 tentatives jouées, `progression_cascade` à **0 ligne**.
> `appliquerTentativeALaCascade` et `enregistrerFormeGobi` existent, sont justes, sont testées, et
> **ne sont appelées par personne**. Le client calcule la cascade lui-même (`magasin.ts:345`) et la
> remet à zéro à chaque profil (`:240`).
> Quatre points : le serveur applique la cascade dans la transaction du POST et la **rend** ; le
> client cesse de calculer et **lit** ; le palier intermédiaire attribue vraiment une forme ; et tu
> **tranches `objet-campement`** — soit un palier l'attribue, soit le nom disparaît, mais un
> énumérant sans émetteur ne survit pas à ce lot.
> **Contrat de sortie** : après N parties jouées par le chemin de l'enfant,
> `SELECT COUNT(*) FROM progression_cascade > 0` et `formes_gobi > 0` dès la 5ᵉ. Sortie citée.
>
> ---
>
> **V1 — la visite des écrans et des exercices, en zone parent (R38).** C'est l'outil dont dépend
> toute la revue de design du père ; il vient **avant** les lots de rendu, pas après.
> Fichiers : `client/src/parent/VisiteDesEcrans.tsx` (neuf), `client/src/ecrans/EcranDashboard.tsx`.
> Elle couvre **29 pages + les 76 exercices**. Elle **dérive** sa liste d'écrans de
> `recettesDEcrans()` (`tests/e2e/qa-outils.ts`) — tu la lis, tu ne la recopies pas : une seconde
> liste écrite à la main est le doublon qui se met à mentir (R8, deux listes de polices).
> Les exercices passent par le chemin de R30 (`LANCEMENT_PARENT`), donc **rien n'est journalisé** :
> une visite du père ne nourrit pas le BKT de l'enfant. Bandeau « retour à la visite » sur chaque
> page, toujours atteignable.
> **Contrat de sortie** : nombre de pages atteignables depuis la visite = `recettesDEcrans().length`
> + le nombre d'exercices du catalogue, et `data-journalise="non"` constatable sur un exercice
> lancé depuis la visite.
>
> ---
>
> **B1 — mélanger les options d'`histoire` (R32).**
> Fichiers : `partage/src/moteurs/histoire/{moteur,types}.ts`,
> `client/src/moteurs/histoire/MoteurHistoire.tsx`.
> Mesuré : 32 consignes à options, bonne réponse en 1re position **32 fois sur 32**, aucun mélange.
> Tu portes le mécanisme d'`eclair` : `ordreOptions` tiré **une seule fois** par `Alea` à la
> création de l'état — reproductible à la graine près, donc le rejeu reste exact.
> **Contrat de sortie** : contrôle négatif exécuté — mélange retiré, le garde redevient rouge sur
> 100 % des cas. Sortie citée.
>
> ---
>
> **C1 — le texte de jeu hérite des réglages de lecture (R35).**
> Fichiers : `client/src/styles/global.css` + les 11 moteurs concernés, **un seul à la fois**.
> Mesuré : le père a réglé 27 px / Andika / interlettrage 0,06 em ; les mots à déchiffrer sont en
> dur à `1.25rem` (20 px) dans **11 moteurs sur 14**, et les réglages ne sortent que par
> `ZoneDeLecture`, qui rend la consigne.
> Un seul fichier de style, pas onze réglages en ligne.
> **Contrat de sortie, et c'est le piège du lot** : relancer
> `tests/qualite/mise-en-page-tablette.spec.ts` (89 cas) **au corps maximal de 40 px**, pas au
> corps par défaut. R20 l'a déjà démontré : agrandir peut faire passer des cibles sous 64 px, et
> **c'est la règle des 64 px qui gagne**. Si le conflit apparaît, tu ne rabotes pas la règle — tu
> chiffres la dette et tu la signales.
>
> ---
>
> **B3 — `tri` accepte n'importe quel mot (R33).** `opus`, effort `high`.
> Fichiers : `partage/src/moteurs/tri/*`, `client/src/moteurs/tri/MoteurTri.tsx`,
> `contenu/exercices/**` pour les 11 exercices de `tri`.
> **La décision est prise, voie A** (`questions-en-attente.md`, J1) : n'importe quel mot, à
> n'importe quel moment. Mesuré : **95 mots sur 122 affichés au premier écran sont refusés au
> doigt** (77,9 %), et **29 des 53 consignes de `tri` (54,7 %) n'introduisent aucune règle
> nouvelle** — ce sont des lots, pas des étapes.
> **Le lot se fait avec le rejeu sous les yeux.** `resume` est agrégé par étape, le journal fait
> foi pour le BKT et le Leitner. Si le rejeu diverge : **tu t'arrêtes**, tu expliques l'écart
> pédagogique en clair, et tu attends l'arbitrage. Tu ne mets à jour aucun journal de référence.
> **Contrat de sortie** : 0 mot refusé pour cause de `element-hors-consigne` sur les 11 exercices,
> et le rejeu des journaux de référence reste exact **ou** l'écart est nommé et chiffré.
>
> ---
>
> **B2 — le glisser en second chemin (R34).** Fichiers : `client/src/moteurs/{tri,assemble,phrase,paires}/`.
> Le glisser au doigt **fonctionne** en web sur tablette, et `place` le prouve : `PointerSensor`
> de dnd-kit, `activationConstraint: { distance: 8 }` pour qu'un tap reste un tap, et surtout
> **`touch-action: none`** sur le draggable — sans lui le navigateur fait défiler la page au lieu
> de glisser. Tu copies ces trois pièces.
> **Le tap-puis-tap reste le chemin principal.** Deux gestes, une seule règle de décision.
> Note : les specs exigent explicitement le glisser sur `assemble` (« faire glisser des
> blocs-syllabes »).
> **Contrat de sortie** : un cas Playwright qui exerce un **vrai** glisser tactile
> (`page.touchscreen`) sur `place` — le moteur qui marche — **d'abord**, pour prouver que
> l'instrument sait mesurer, puis sur les quatre moteurs repris.
>
> ---
>
> **C2 — le plateau de `chemin` (R36).** Fichiers : `client/src/moteurs/chemin/*`,
> `contenu/habillages/**` pour les habillages de `chemin`.
> Le design existait : specs v2 ligne 216, « **sauts de nénuphars · pas japonais · lianes** ».
> Rendu actuel : `display: flex, flexWrap: wrap`, une rangée de boutons. `data-pion`,
> `data-atteignable` et `data-franchie` sont dans le DOM et **aucun des trois n'a de rendu**.
> Les cases prennent une position dans l'habillage, comme `place` le fait avec ses centroïdes.
> **C'est un lot de contenu autant que de code.**
>
> ---
>
> **C3 — recensement, aucune écriture.** Quels moteurs lotissent comme `tri` ? Lesquels sont une
> rangée de boutons ? `attrape` ne fait bouger aucune cible et `chrono` ne permet aucun
> réordonnancement, alors que leurs specs l'exigent : chiffre-le sur les 14 moteurs, par objet.
> Ce recensement **alimente la revue de design du père**, il ne décide de rien.

---

## Ce que le père fait ensuite

Une fois **V1** livré, la revue de design page par page devient possible : 29 pages + 76
exercices, ouvrables depuis la zone parent, sans jouer. C'est là que se posent les questions
laissées ouvertes — **J2** (les vignettes d'illustration, une décision par exercice et non dans
l'abstrait) et **C4** qui en découle.
