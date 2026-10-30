# Bilan et audit — 9 octobre 2026

Demande du parent : faire le bilan de ce qui reste côté lecture et texte, ramener les gros tests
sous **5 minutes** (et les petits bien en dessous), et dire pourquoi les maths « ne marchent pas ».
But : la liste des tâches qui mènent à un jeu complet et fini, jouable sur la tablette.

Tout ce qui suit a été **mesuré aujourd'hui** sur le commit `9a378c1`, branche
`codex/rehabilitation-interface`, sans aucune modification de code. Scripts et sorties dans
`bac-a-sable/audit-2026-10-09/`.

---

## 1. L'état mesuré aujourd'hui

`npm run verifier` refuse de démarrer : le verrou `bac-a-sable/verification.lock` (PID 33648, du
27 septembre) est resté après la campagne interrompue. Le processus n'existe plus. Les étapes ont
donc été lancées une par une, dans l'ordre de la chaîne. Le verrou a ensuite été retiré à la
demande du parent, puisque personne d'autre ne travaille sur le dépôt.

| Étape | Durée | Verdict | Détail |
|---|---:|---|---|
| `test` (Vitest + couverture) | 88 s | ❌ 7 / 3 071 | Les 7 échecs connus : inventaires v14 de `fuzz-api` et `parent-reinitialisation` |
| `construire:test` | 5 s | ✅ | |
| `test:e2e` | **693 s** (11,5 min) | ❌ 2 / 928 | 911 réussis, 15 non exécutés (dépendants) |
| `test:visuel` | 9 s | ❌ 3 / 13 | Carte : nouvelles entrées maths, références en attente de visa |
| `construire` | 4 s | ✅ | |
| `test:qualite` | **318 s** (5,3 min) | ❌ 12 / 321 | Le budget de bundle n'a pas tourné (enchaîné après un échec) |
| `test:rejeu` | 1 s | ✅ | |
| **Total** | **≈ 18,6 min** | | Plus lint et TypeScript (≈ 6 s) |

Le 26 septembre, l'E2E comptait 88 échecs ; il en reste 2. Les correctifs de navigation du 27 ont
donc porté.

**Les échecs à traiter (lecture et coque) :**

1. `parcours-rehabilitation.spec.ts:203` : après `page.reload()` sur tablette, le campement
   n'apparaît pas. C'est une reprise réelle, à reproduire ; la reprise automatique d'une partie
   maths ou lecture au rechargement est suspecte.
2. `parcours-retours-parent-lucioles-coffre.spec.ts:53` : une case du coffre mesure 120 px pour
   144 px exigés.
3. `responsive-tous-ecrans.spec.ts:376` × 12 formats : « campement : l'en-tête occupe trop de
   hauteur », du petit téléphone jusqu'au bureau plein écran. Cause probable, non prouvée :
   l'entrée maths ajoutée dans l'en-tête du campement par `9a378c1`.
4. Les 7 inventaires v14, déjà décrits dans la [file active](etat-courant-et-file.md).
5. Les 3 références visuelles de la carte, qui attendent un visa.

---

## 2. Les tests : pourquoi c'est long, et comment passer sous 5 minutes

### 2.1 Où part le temps

Mesuré sur le dernier rapport JSON complet de l'E2E (26 septembre, 912 cas, 3 190 s de travail
cumulé à 4 travailleurs) :

| Fichier | Cas | Travail cumulé | Part |
|---|---:|---:|---:|
| `parcours-audit-tout-le-site.spec.ts` | 272 | 1 564 s | **49 %** |
| `parcours-tactile-exhaustif.spec.ts` | 154 | 489 s | 15 % |
| `parcours-aucun-geste-mort.spec.ts` | 92 | 248 s | 8 % |
| tout le reste (≈ 50 fichiers) | 394 | ≈ 890 s | 28 % |

Trois balayages **exhaustifs** (chaque nœud × chaque commande × chaque format) font 72 % du temps.
Le chemin critique est l'audit du tableau de bord parent : **122 s pour un seul cas**.
Côté qualité, `reglages-de-lecture-effectifs.spec.ts` coûte 15 s par moteur, soit 14 × 15 s,
alors que chaque cas mesure peu de chose : c'est un coût fixe de préparation.
Côté Vitest, `fuzz-contenu.test.ts` prend seul 34,5 s sur 88.

### 2.2 Deux causes structurelles

- **Un serveur Node neuf par cas** (`tests/harnais-serveur.ts`) sur un port neuf. Chaque cas
  repart donc d'une origine inconnue du navigateur : bundle, polices, images et voix sont
  re-téléchargés à chaque fois, et des milliers de connexions courtes s'ouvrent. C'est le
  candidat principal pour `ERR_NO_BUFFER_SPACE`, l'erreur qui a forcé le plafond à **4
  travailleurs sur une machine à 32 cœurs**. *Hypothèse à mesurer avant de bâtir dessus.*
- **Aucun palier entre « un fichier de test » et « tout »**. Le crochet `pre-push` lance la
  totalité, soit 18 min.

### 2.3 Plan proposé (à valider : il change ce qui garde un commit)

Trois paliers, avec la même règle partout : aucun test supprimé, aucune assertion assouplie.

| Palier | Cible | Contenu |
|---|---|---|
| `verifier:rapide` (développement d'une feature) | **< 60 s** | lint et TS ; `vitest related` sur les fichiers modifiés, sans couverture ; `test:contenu` ; E2E du seul moteur ou écran touché (table fichier → recettes) |
| `verifier` (pre-push, « gros test ») | **< 5 min** | Toute la logique ; tous les parcours ciblés ; balayages exhaustifs **échantillonnés de façon déterministe** (1 nœud par moteur, soit 14 au lieu de 76, en tournant d'une campagne à l'autre) |
| `verifier:complet` (avant publication, ou la nuit) | sans limite | Tous les balayages exhaustifs, la couverture, les mutations |

Chantiers techniques, du plus rentable au moins rentable. Chacun se mesure avant et après :

1. **T1 — Un serveur par travailleur au lieu d'un par cas**, avec une route de test
   `POST /api/__test/reinitialiser` (base `:memory:` vidée, `Alea` rembobiné). L'isolation est
   conservée, l'origine devient stable et le cache HTTP fonctionne. Mesurer ensuite 6, 8 puis
   10 travailleurs : le 10 avait donné 84 s contre 393 s en série dans le balayage de P1.
2. **T2 — Échantillonnage des trois balayages exhaustifs** dans le palier 5 min ; exhaustif dans
   `complet`.
3. **T3 — Casser le chemin critique** : les trois lots du tableau de bord à 120 s deviennent 6 à
   8 lots, ou passent en test de composant (happy-dom), bien plus rapide.
4. **T4 — `reglages-de-lecture-effectifs`** : préparer l'état par `window.__test` au lieu de le
   rejouer par l'interface ; viser 2 s par moteur.
5. **T5 — Vitest** : couverture seulement en `complet` (61 s sans, mesuré le 6 septembre) ;
   découper `fuzz-contenu` (34,5 s seul) en plusieurs fichiers pour paralléliser.
6. **T6 — Paralléliser `test` (Vitest) avec `construire:test`**, puis l'E2E avec la qualité si
   T1 libère assez de ressources.

Règle de décision posée avant la mesure : le palier 5 min est atteint s'il passe **sous 300 s
sur 3 campagnes consécutives, avec 0 cas instable**. Sinon, on garde le palier et on recalcule
l'échantillon. On ne retire pas un garde pour gagner du temps.

---

## 3. Les maths : ce qui ne marche pas

### 3.1 Ce que les tests disent, et ce qu'ils ne voient pas

Les 3 parcours maths passent : `parcours-mathematiques` en grand et mobile, et
`parcours-projets-mathematiques` (18 projets + fête, 48,5 s). Les tests unitaires des 6 lieux
passent aussi. **Ils ne testent pas ce qu'un enfant vit** : ils jouent à 1920 × 1200, cliquent par
nom accessible (sans jamais défiler) et lisent l'état par l'API. Les trois défauts ci-dessous leur
sont invisibles par construction.

### 3.2 Ce qui a été observé aujourd'hui sur la version publiée

Pilotage de la PWA GitHub Pages par Playwright, profil neuf, aux formats **1280 × 800** (tablette
paysage) et **800 × 1100** (portrait). Captures dans `bac-a-sable/audit-2026-10-09/explo-*`.

- **La mécanique tourne** : les 6 lieux s'ouvrent, une étape du Jardin se réussit jusqu'à
  « Bravo », et Pause ramène au campement.
- **B1 — En paysage tablette, toute la zone de jeu est sous la ligne de flottaison.** En-tête
  (≈ 250 px), décor (≈ 330 px), puis consigne : la zone de jeu commence vers y = 740 sur 800, et
  le premier bouton jouable du Jardin est vers y = 1 020. La page du Chantier mesure 1 844 px de haut. Un enfant qui ne sait pas
  qu'il faut faire défiler voit un décor et une phrase.
- **B2 — Aucune consigne n'est audible.** Chaque scène affiche « Audio en préparation ». C'est
  une **règle non négociable** (« aucune consigne n'existe uniquement à l'écrit ») et l'exigence
  VN-15. Pour un enfant de CE1 qui apprend à lire, « Monte 4 roues avec 3 pales sur chaque roue »
  ou « Règle : compte les carreaux entre deux sommets. Équerre : vérifie que les côtés voisins
  font un angle droit » ne se lit pas seul.
- **B3 — L'interface est un formulaire, pas un jeu.** Boutons « Ajouter / Retirer » et
  compteurs « −10 −1 +1 +10 » en dehors de la scène. Le décor (SVG provisoire) ne réagit pas
  aux gestes. Le Chantier demande de choisir « Sommet A », puis de toucher une case.
- **B4 — Défauts ponctuels** : deux boutons d'annulation dans la même scène (« Annuler mon geste »
  et « Annuler mon dernier geste ») ; « Retour au lieu » s'appelle « Retour aux Ponts » aux Ponts ;
  au Chantier, le rectangle en pointillés semble dessiner la réponse attendue (2 × 3), ce qui
  reste à vérifier dans le contrat de la famille.
- **B5 — Textes** : 766 textes maths, dont **516 mots hors du lexique source**, d'après
  l'inventaire du 27 septembre.

**À confirmer avec le parent** : ce qu'il a vu exactement quand « ça ne marche pas » (appareil,
lieu, geste, message). B1 et B2 suffisent à rendre le mode injouable seul, mais un défaut
propre à la tablette (cache PWA ancien, navigateur Samsung, base v14) n'est pas exclu.

### 3.3 Tâches maths

| # | Tâche | Bloquant pour jouer seul |
|---|---|---|
| M-1 | Recomposer les scènes : zone de jeu visible sans défiler à 1280 × 800 et 800 × 1280, décor réduit ou mis à côté | **oui** |
| M-2 | Garde QA qui rougit **avant** M-1 : « premier geste jouable dans le viewport » pour les 18 familles, aux 2 formats tablette | oui (sinon ça revient) |
| M-3 | Voix maths : reprendre la chaîne refusée (phrases entières plutôt qu'assemblage de fragments), écoute, visa | **oui** |
| M-4 | Simplifier les consignes au niveau CE1 et traiter les 516 mots hors lexique | oui |
| M-5 | Gestes dans la scène (poser, glisser, toucher l'objet) plutôt que des boutons à compteur | fortement souhaité |
| M-6 | Petits défauts B4 | non |
| M-7 | Corriger les 7 inventaires de tests v14 | non (QA) |
| M-8 | Visa des 5 décors peints et des 3 références de carte, puis intégration | non (esthétique) |
| M-9 | Observation de l'enfant sur la tablette (protocole R18), notée dans `tests/observations/` | **oui, c'est la recette** |

---

## 4. La lecture et le texte : ce qui reste

**Ce qui est fait et mesuré.** 6 régions, 76 nœuds, 76 exercices, les 14 moteurs.
**Couverture voix complète** : 666 objets parlants recensés, 666 fichiers présents dans
`contenu/audio/`, d'après `scripts/recenser-textes.mjs`. Le rejeu des journaux est vert.

| # | Tâche | Nature |
|---|---|---|
| L-1 | Reproduire et corriger « rechargement sur tablette → pas de campement » (`parcours-rehabilitation:203`) | bug, prioritaire |
| L-2 | En-tête du campement trop haut sur 12 formats (probablement l'entrée maths) | bug |
| L-3 | Case du coffre à 120 px pour 144 px exigés | bug |
| L-4 | **64 exercices sur 76** portent encore « À VALIDER PAR LE PARENT » dans `$commentaire` : soit une passe de relecture parent, soit un commentaire périmé à nettoyer. À trancher exercice par exercice | contenu |
| L-5 | Fiches papier du parent : **16 fiches** des PDF NIVEAU 1–6 sont devenues des exercices, sur ≈ 90 ingérées dans `contenu/brouillons/niveau-*`. Le niveau 7 n'a qu'un fichier. Décider combien en intégrer | contenu |
| L-6 | Lexique CE1 : la mesure est circulaire, puisque le lexique est écrit par le lot qui écrit les mots (Q-M3-5). Choisir une liste externe qui fasse foi | décision |
| L-7 | Pose joyeuse de Gobi déclinée sur les 10 stades (asset de joie unique retiré) | art |
| L-8 | Visa des 3 références de carte (communes avec M-8) | visa |
| L-9 | **Aucune observation R18 consignée** : `tests/observations/` est vide. L'enfant n'a jamais été observé jouant seul une sortie complète | **recette** |

---

## 5. Ordre proposé jusqu'au « fini sur tablette »

1. **Débloquer la QA** : verrou périmé (décision parent), 7 inventaires v14, et L-1 / L-2 / L-3.
2. **Tests rapides** T1 → T5 : chaque correction suivante en profite.
3. **Maths jouable** : M-2 (garde rouge) → M-1 → M-6 → M-4 → M-3.
4. **Contenu lecture** : L-4, puis L-5 selon la décision.
5. **Visas** : décors, carte, Gobi (M-8, L-7, L-8), sur planches de vignettes.
6. **Recette** : campagne `complet` verte, publication PWA, mise à jour sur la tablette, puis
   **observation R18** pour la lecture et pour les maths (M-9, L-9).

---

## 6. Décisions du parent, 9 octobre (après lecture du bilan)

- **Maths : à reconcevoir.** « Même pour un adulte, on ne comprend pas ce qu'il faut faire » ;
  boutons trop petits, séquences opaques, contenu qui oblige à décaler l'écran. Il y a de bonnes
  idées, mais « rien n'est bon » pour un enfant. On garde les idées et la logique
  (`partage/src/mathematiques/`), pas l'interface. Les tâches M-1 à M-6 du § 3.3 sont remplacées
  par une reconception de l'expérience, à faire **après** le socle commun du § 7.
- **Fiches papier : abandonnées comme base.** L-5 est retirée. On fait évoluer le jeu à partir de
  ce qu'il est devenu.
- **Priorité : finir le français.** Exercices jusqu'au bout, les bons animaux, un affichage
  correct partout, sans les défauts « basiques » vus en jouant (images trop petites, mises en
  page bancales, interactions trop complexes).
- **Une seule personne travaille désormais sur le dépôt.** Le verrou périmé a été retiré.

## 7. Le code : propre, évolutif, testable ? — mesuré

### Ce qui est solide

- **La logique est bien séparée et bien testée.** Règles des 14 moteurs, pédagogie (BKT,
  Leitner, sélecteur) et validation de contenu vivent dans `partage/` sans React. Couverture
  mesurée : 99,7 % sur `pedagogie/`, 97,9 % sur `moteurs/`. Le journal `tentatives` fait foi et
  le rejeu passe.
- **Le déterminisme** (`Alea`, `Horloge`) et l'isolation des tests sont réels.

### Ce qui explique « les choses basiques ne marchent pas partout »

- **Les 14 moteurs ne partagent presque rien côté écran.** Le seul code commun aux moteurs est
  `moteurs/commun/glisser.tsx` (141 lignes, utilisé par 3 moteurs sur 14) et `MessageStable`.
  Le cadre d'activité (`CadreSceneActivite`) fait 16 lignes. Chaque moteur réimplémente donc :
  - sa mise en page : 400 à 1 100 lignes par moteur (`MoteurTri` 1 086, `MoteurPhrase` 1 036) ;
  - ses mesures d'écran : 38 appels `getBoundingClientRect` / `ResizeObserver` répartis dans
    les moteurs ;
  - ses tailles : 98 valeurs en `px` codées en dur dans `moteurs.css`, 132 `style={{…}}` en ligne ;
  - ses images : 8 composants les affichent, chacun avec sa propre règle de taille.

  Résultat : un défaut corrigé dans un moteur reste présent dans les 13 autres. D'où une série de
  correctifs moteur par moteur et de tests au cas par cas (`parcours-paires-cadrage`,
  `-paires-pc`, `-paires-defilement`, `-phrase-pc`, `-place-responsive`, `-chemin-plateau-lisible`…).
- **Pas d'échelle de tailles.** Les 35 variables CSS globales sont des couleurs, plus une seule
  taille (`--cible-min`). Il n'y a ni échelle d'espacement, ni tailles de carte, de tuile ou
  d'image communes. 137 `!important` et 81 `@media` montrent que la mise en page se gagne règle
  contre règle. Il n'y a aucun `@container`, alors que chaque moteur vit dans un cadre de taille
  variable.
- **Les tests coûtent plus que le produit.** 61 000 lignes de tests (unitaires 31 k, composants
  17 k, E2E 13 k) pour 48 000 lignes de produit. Beaucoup d'E2E vérifient un défaut précis d'un
  moteur au lieu d'une règle commune. Ils cassent ensemble au moindre changement de navigation :
  le 26 septembre, un seul changement de navigation vers le campement a mis près de 100 cas au rouge (85 en E2E, 14 en qualité).
- **Les commentaires sont des journaux de chantier.** 22 % à 30 % des lignes sont des
  commentaires, souvent des récits de lot, de dates et de mesures plutôt que l'explication du code
  (`VoileGrisaille.tsx` : 222 lignes de commentaire pour 142 de code). Lire et modifier un
  fichier coûte deux fois plus que nécessaire.
- **La documentation s'est étalée** : ≈ 140 fichiers dans `Docs/`, dont
  `questions-en-attente.md` à 8 534 lignes. L'état réel ne se lit plus d'un coup d'œil.

### Ce que je propose : un socle d'activité commun, puis migrer

1. **Socle de mise en page des activités** (`client/src/activite/`) : des zones fixes (consigne +
   écouter, scène, plateau, réserve, actions), une échelle de tailles en jetons CSS (tuile,
   carte, vignette, cible tactile), des composants communs `Tuile`, `Carte`, `Vignette` et
   `Emplacement`, et un glisser-poser commun. La taille se règle par `@container`, pas par
   des `@media` moteur par moteur.
2. **Une garde générique au lieu de dizaines de gardes ciblées** : pour chaque moteur, à 3 formats
   (tablette paysage, tablette portrait, téléphone), on vérifie automatiquement :
   - aucun défilement nécessaire pour jouer ;
   - aucune image sous une taille minimale ;
   - aucune cible tactile trop petite ;
   - aucun recouvrement entre éléments ;
   - une consigne écoutable.

   Elle se vérifie **ROUGE** sur l'existant avant migration, et c'est aussi elle qui donnera la
   liste réelle des défauts d'affichage.
3. **Migrer les 14 moteurs un par un** sur le socle. Chaque migration supprime le CSS spécifique
   et rend obsolètes les tests de correctifs ponctuels qu'elle remplace (retrait proposé, jamais
   silencieux).
4. **Les maths reconçues sur ce même socle**, avec les mêmes gardes : elles hériteront
   gratuitement de ce qui marche en français.
5. **Hygiène** : commentaires ramenés à ce qu'ils expliquent (l'historique va dans `git log` et
   `Docs/`) ; un `Docs/etat.md` court qui fait foi, le reste archivé.

### Gobi et les compagnons (précision du parent : « les bons animaux »)

Le parent parlait de Gobi et des compagnons, qui n'étaient pas les bons partout. Il pense que
c'est corrigé. Mesuré le 9 octobre :

- Aucun chemin d'image de compagnon n'est écrit en dur hors de `Compagnon.tsx`.
- La correspondance **stade → image de Gobi existe en trois exemplaires** : `RANG_PAR_STADE`
  dans `composants/Gobi.tsx`, une table locale dans `monde/carte/ChoixCompagnon.tsx` et une
  fonction locale dans `GalerieEvolutionsGobi.tsx`. Les trois concordent aujourd'hui, mais rien
  ne les empêche de diverger. C'est exactement le motif d'un « Gobi pas bon à un endroit ».
- Six écrans affichent Gobi (campement, nœud, récompense, maths, `MoteurPhrase`, choix du
  compagnon). Chacun reçoit son stade par son propre chemin.

À intégrer au socle (§ 7) : une seule source pour l'image de Gobi et des compagnons, et une garde
générique qui vérifie, sur chaque écran qui les montre, que **Gobi est au stade courant du
profil** et que **le compagnon est celui de la sortie**.

## 8. Campagne de référence « avant » — `npm run verifier`, 9 octobre

Lancée après le retrait du verrou. Rapport `tests/rapports/RAPPORT.md` daté
`2026-10-09T07:04:01.736Z`, code 1. **Durée totale : 1 217,9 s (20,3 min).**

| Étape | Durée | Échecs |
|---|---:|---:|
| `test` (avec couverture) | 112,6 s | 7 / 3 071 |
| `test:e2e` | 729,2 s | 2 / 928 |
| `test:visuel` | 9,2 s | 3 / 13 |
| `test:qualite` | 349,2 s | 12 / 321 |
| autres (lint, TS, contenu, constructions, rejeu, contrôles) | ≈ 18 s | 0 |

Ce sont les mêmes échecs que dans la mesure étape par étape du § 1. Aucun nouvel échec. L'étape
`bundle` est marquée en échec à 0 ms : elle n'a pas tourné, parce qu'elle est enchaînée par `&&`
derrière la qualité rouge. Ce n'est pas un dépassement de budget. **Ce chiffre de 20,3 min est la
base de comparaison du chantier « moins de 5 min ».**

## 9. Suite : socle commun lancé

Le parent valide le socle commun le 9 octobre. Le diagnostic aux formats réels de la tablette
trouve **55 nœuds sur 76** qui obligent à défiler ou cachent une commande. Cause probable : toute
la QA tourne à 1920×1200 **CSS**, alors que la tablette offre environ 800×1100 en portrait.
Contrat, règles et ordre de travail : [contrat du socle d'activité](contrat-socle-activite.md).

### Gobi resté œuf pendant les exercices — corrigé le 9 octobre

Signalé par le parent : « Gobi a évolué et l'image ne changeait jamais » en jouant. Cause :
`EcranNoeud.tsx` affichait `<Gobi>` sans lui passer `stade`. Gobi prenait donc la valeur par
défaut `oeuf` pendant **tous** les exercices, alors que l'écran lisait déjà le monde (et donc le
stade) pour la jauge. Le campement, la récompense et les maths, eux, recevaient le bon stade.
Le test `tests/composants/EcranNoeudStadeGobi.test.tsx` a été vu rouge (`expected 'oeuf' to be
'crete'`), puis vert après le correctif d'une ligne. Les 19 tests de l'écran passent.

Reste connu : les images d'**animation** (`assets/gobi/animation/joie.webp`, `aide`,
`hesitation`, `apparition`) sont uniques et ne suivent pas le stade. Aucun écran d'exercice ne les
emploie aujourd'hui, mais elles devront être déclinées si on les utilise. La règle S5 du
[contrat du socle](contrat-socle-activite.md) gardera le stade sur tous les écrans.
