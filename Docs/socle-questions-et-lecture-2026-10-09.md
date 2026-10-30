# Socle commun : ce qu'on demande, ce qu'on répond, et la lecture colorée — 9 octobre 2026

Retours du parent traités : **T19**, **E09**, **E08** (points 2 à 5 ; le point 1, bords coupés,
attend une capture). Sources : `Docs/tableau-retours.md`. Plans de référence :
[contrat-socle-activite.md](contrat-socle-activite.md),
[socle-etape-et-gestes-2026-10-09.md](socle-etape-et-gestes-2026-10-09.md) (T10, le jaune de E03).
Sondes, journaux et captures : `bac-a-sable/socle-questions/`.

## 0. Ce qu'il faut savoir avant tout : la coloration est ÉTEINTE dans le profil de l'enfant

Le défaut du jeu est bien `colorationSyllabique: true` (`partage/src/lecture/defauts.ts`). Mais
le profil réel de la base l'a éteint depuis le 3 août. Commande (lecture seule) :

```
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('donnees/pierre.db',{readOnly:true});console.log(JSON.stringify(db.prepare('select * from reglages_lecture').all()))"
→ [{"profil_id":"prf-0fbbeba7fb27d3f7","police":"andika","corps_px":27,…,"coloration_syllabique":0,…,"modifie_le":"2026-08-03T20:20:44.396Z"}]
```

Donc, même branchée partout, la lecture colorée **ne se verra pas** chez l'enfant tant que le
réglage n'est pas rallumé (zone parent → réglages de lecture). Rien n'a été changé dans la base :
ce sont les données du foyer. **Question au parent** (§ 8).

## 1. Inventaire avant (mesuré)

Sonde : `bac-a-sable/socle-questions/inventaire-diagnostic.spec.ts` (76 nœuds, 1280×720, Andika
27 px, interligne 2, coloration allumée), résumée par `distincts.mjs avant`. Chaque texte visible :
fond et bord effectifs, police, taille, touchable ou non, coloré ou non.

| Moteur | Ce qu'on DEMANDE (fond · police/taille) | Ce qu'on RÉPOND (fond · police/taille) |
|---|---|---|
| tous | consigne de la barre : parchemin, sans bord propre · Andika 27 | — |
| 10 moteurs | repère d'étape (T10) : jaune 28 %, bord trait 2 px · Atkinson 20,25 (+ Andika 27 pour la cible d'`attrape`) | — |
| assemble | — | syllabes `.cible` : parchemin, bord 4 · Andika 27 |
| attrape | cible « À attraper : bleu » dans le repère | mots `.cible` : parchemin · Andika 27 |
| chemin | notice : parchemin, liseré gauche jaune/lagon · Andika 27 gras + Atkinson 20,25 ×2 (**3 styles, 2 tailles**) ; lettre cible soulignée **lagon** | cases : parchemin (case actuelle : lagon 28 %, **opacité 0,5**) · Andika 27 |
| chrono | repère « 3 images à ranger » | vignettes : parchemin · Andika 27 |
| colorie | cible « Colorie la montagne en rouge » : parchemin, bord **soleil** 3 px · Andika 27 | godets de couleur (fond = la couleur) |
| eclair | mot montré : parchemin + halo soleil · Atkinson 20 (légende) + Andika (mot) | options : parchemin · Andika 27 |
| grave | « Modèle : chat » : parchemin, bord 3, ombre · Andika 27 | touches : parchemin · Andika 27 |
| histoire | « À toi de choisir » + question : **parchemin, bord 4 — comme les réponses** · Atkinson 20,25 (opacité 0,72) + Andika 27 | options : parchemin, bord 4 · Andika 27 |
| libre | — | godets |
| paires | compteur dans le repère | cartes : parchemin, bord 3 · Andika 27 |
| phrase | phrase modèle : `ZoneDeLecture` parchemin | étiquettes : parchemin · Andika 27 |
| place | compteur « 3 dessins à placer · 2 intrus » : sans fond · Atkinson 20,25 | jetons : **blanc**, bord 1 · Atkinson 20,25 |
| trace | « Lettre : b » : parchemin, bord, ombre · Andika 27 ; « la grande barre » : Atkinson 20,25 | — (on trace) |
| tri | critère du panier : `ZoneDeLecture` transparente · Andika 27 ; « Touche un mot… » : Atkinson 20,25, opacité 0,9 | mots : parchemin · Andika 27 |

Constat : aucune couleur commune aux questions ; la question d'`histoire` est habillée comme ses
réponses (E09) ; la notice de `chemin` mêle trois styles (E08).

## 2. Les deux thèmes

Fichier : `client/src/activite/questions.css` (jetons sur `:root`), composants
`client/src/activite/Question.tsx` (`CadreQuestion`, `useSignalChangement`, `ROLE_QUESTION`,
`ROLE_REPONSE`). Un moteur pose `data-theme-role="question"` ou `"reponse"` et n'écrit plus de
fond, de bord ni de police pour ces éléments.

| Jeton | Valeur | Rôle |
|---|---|---|
| `--question-fond` | `color-mix(--soleil 28 %, --parchemin)` (= le repère de E03) | fond de tout ce qu'on demande |
| `--question-fond-signal` | `--soleil` | « ça vient de changer » (cadre allumé jusqu'au toucher suivant) |
| `--question-bord` / `--question-epaisseur` | `--trait` / 2 px | bord, **à plat** (aucune ombre) |
| `--question-famille` / `--question-corps` | police et corps de lecture du profil | **une seule police, une seule taille** dans toute la question |
| `--reponse-fond` / `--reponse-bord` / `--reponse-encre` | `--parchemin` / `--trait` / `--trait` | réponse : parchemin, **en relief** (l'ombre du bouton `.cible`) |

La distinction se lit sans couleur aussi : la question est un cartouche jaune à plat, la réponse
un bouton parchemin qui dépasse. Le thème réponse est posé à spécificité nulle (`:where`) pour
que les états des moteurs (case actuelle, carte retournée, mot placé) gardent la main.

**Exception gardée** : le repère d'étape garde la police d'interface de T10 (« Étape 1 sur 3 »),
exigée par `tests/composants/RepereEtape.test.tsx` (« reprend le style de E03 … police
d'interface »). Il porte le thème (fond, bord) mais pas l'unification de police. L'aligner sur
le corps de lecture est une question au parent (§ 8).

## 3. La règle de garde

Test dédié `tests/qualite/socle-questions.spec.ts` (14 moteurs × 2 formats, 1280×720 et
800×1100, tous les nœuds livrés). Il **énumère** les objets par moteur, indépendamment du CSS :

- **Q1** : chaque objet « question » porte `data-theme-role="question"`, a pour fond calculé
  `--question-fond`, et une seule taille de police dans tout l'objet ;
- **Q2** : aucun objet « réponse » n'a le fond question, ni ne vit dans une question ; il porte
  `data-theme-role="reponse"` ;
- **L1** : coloration allumée (le défaut), tout texte rendu dans la police de lecture est en
  syllabes colorées ;
- un sélecteur qui ne trouve rien sur tout un moteur fait échouer le cas (énumération morte).

Exemptions nommées : godets de `colorie`/`libre` (leur fond est la couleur choisie) ; `trace`
(aucune réponse posée) ; repère d'`attrape` dont la cible est un mot à lire (2 tailles, compté à
part, § 2).

**Vu ROUGE avant** : `node scripts/playwright.mjs test socle-questions --project=qualite --no-deps`
→ **28 failed** (`bac-a-sable/socle-questions/garde-questions-avant.log`), pour les bonnes
raisons (aucun `data-theme-role`, fonds parchemin, Atkinson + Andika mêlés, texte non coloré).
**VERT après** : **28 passed** (`garde-questions-2.log`).

## 4. État après, par moteur — comptes obtenus par commande

Commande : `node scripts/playwright.mjs test socle-questions --project=qualite --no-deps --reporter=list | grep BILAN`
(mêmes chiffres en paysage et en portrait).

| Moteur | Questions au thème / inventoriées | dont repère à 2 tailles (exempté) | Réponses au thème réponse / inventoriées | Réponses au thème question |
|---|---:|---:|---:|---:|
| assemble | 10 / 10 | 0 | 13 / 13 | 0 |
| attrape | 14 / 14 | 7 | 8 / 8 | 0 |
| chemin | 21 / 21 | 0 | 71 / 71 | 0 |
| chrono | 10 / 10 | 0 | 15 / 15 | 0 |
| colorie | 18 / 18 | 0 | — (godets) | 0 |
| eclair | 12 / 12 | 0 | 16 / 16 | 0 |
| grave | 15 / 15 | 0 | 16 / 16 | 0 |
| histoire | 12 / 12 | 0 | 12 / 12 | 0 |
| libre | 1 / 1 | 0 | — (godets) | 0 |
| paires | 16 / 16 | 0 | 104 / 104 | 0 |
| phrase | 18 / 18 | 0 | 25 / 25 | 0 |
| place | 3 / 3 | 0 | 5 / 5 | 0 |
| trace | 6 / 6 | 0 | — | 0 |
| tri | 46 / 46 | 0 | 122 / 122 | 0 |
| **Total** | **202 / 202, écart 0** | 7 | **407 / 407, écart 0** | **0** |

**Avant** : 0 question au thème sur tous les moteurs (`grep BILAN garde-questions-avant.log`,
`questionsAuTheme: 0` partout ; `data-theme-role` n'existait pas). Le premier passage comptait
24 objets en `colorie` et 4 en `place` : le sélecteur `[data-consigne]` attrapait aussi des
conteneurs d'état ; il est resserré à `.barre-consigne [data-consigne]`.

## 5. E09 (`clairiere-09`, histoire) — ce qui est fait

- **Récit** sur toute la largeur de la scène (donc centré), texte aligné à gauche comme dans un
  livre ; corps 27 px et interligne 2 inchangés (mesuré par le test).
- **Question** au thème question : « À toi de choisir : *Où est Gobi ?* », une seule police, une
  seule taille, lue en couleurs.
- **Réponses** au thème réponse, **juste sous la question** (écart mesuré 9 px), jamais sur le
  décor. Paysage : question sur toute la largeur (elle tient sur une ligne), réponses à gauche,
  décor à droite. Portrait : tout s'empile, décor en bas.
- La question et les réponses ne sont jamais rognées. S'il manque de la place, c'est le récit
  qui défile dans son cadre : **un seul cas mesuré**, `galeries-10` (le plus long récit) en
  1100×700, il manque 40 px (`histoire-diagnostic.spec.ts`). Partout ailleurs, récit entier.

**Dérogation à la décision D** (`decision-decor-de-fond-et-mots-poses.md`, « les mots se posent
sur le décor ») **pour `histoire`** : les réponses ne sont pas posées sur le décor. Raison : le
retour du parent (E09) — la question doit se distinguer, et ses réponses la suivre ; des réponses
à lire posées dans une image qu'on doit aussi comprendre (« dans le lac », « dans la cabane »)
brouillent la question. Les réponses avaient déjà quitté le décor pour la réserve à la migration
du socle, sans que ce soit écrit ; c'est maintenant décidé et écrit. Le décor garde sa
recoloration (dérivée par `mise-en-scene.ts`).

Preuve : `tests/e2e/parcours-retours-parent-e08-e09.spec.ts`, cas E09 en 1280×720 et 800×1100
(vus rouges avant, verts après).

## 6. E08 (`clairiere-08`, chemin) — points 2 à 5

| Point | Fait | Preuve (même fichier de test, vu rouge puis vert) |
|---|---|---|
| 2 — notice | `CadreQuestion` : thème question, une seule taille (corps de lecture). « Avec la lettre a » et « Départ : « l'arbre » » sur la même ligne quand elle tient ; la position et le message (refus, indice) partagent une seule ligne réservée | `2) la notice du haut …` |
| 3 — départ | la case du pion n'est plus grisée (opacité 1) ; au départ, un écriteau sombre « Départ » posé à cheval sur son bord bas (il ne prend aucune place dans la case) | `3) la case de départ …` |
| 4 — rien ne désigne la réponse | la lettre cible est soulignée de **trait**, jamais du bleu ; à l'ouverture, les quatre premiers choix ont exactement le même habillage | `4) aucune mise en valeur …` |
| 5 — changement de lettre | la notice s'allume (fond soleil, liseré) au changement de manche, jusqu'au toucher suivant, comme le repère d'étape ; onde sur le cadre si les animations sont permises ; le texte ne bouge pas | `5) changer de lettre …` |

**Ce que montrait le point 4.** Le seul « chat bleu » que le code peut produire à l'ouverture de
la première manche est **l'indice automatique de Gobi** : après 45 s sans geste
(`partage/src/moteurs/commun/delais.ts`, `indiceMs: 45_000`), la bonne case suivante reçoit un
halo **lagon** et le message « Indice : une case possible brille en bleu. ». Or la lettre cible
était soulignée du même lagon : « a bleu + chat bleu » se lisait comme une règle de couleur. La
lettre n'est plus bleue. L'indice, lui, est de l'aide de Gobi (pédagogie v2) : il est gardé, à
arbitrer (§ 8). Sans indice, aucune case n'est mise en valeur.

Arbitrage de place : avec une seule taille, la notice des plateaux denses grandissait. Mesuré sur
`cite-des-histoires-07` en 1080×670 : 54 px de trop, cases recouvertes (le test
`parcours-chemins-regles` le voyait). Corrigé en faisant partager **une** ligne à la position et
au message, cette ligne d'état ayant l'interligne serré du repère d'étape (1,35) ; la règle garde
l'interligne du profil. La construction figée d'avant (`tests/rapports/client-fige`, servie par
`PIERRE_CLIENT_TEST`) a servi de référence.

## 7. Lecture colorée — où l'enfant lisait sans couleurs

Composant commun neuf : `client/src/lecture/TexteColore.tsx`. Même réglage et même découpe que
`ZoneDeLecture` ; réglage éteint ⇒ le texte brut, DOM inchangé ; allumé ⇒ syllabes en `<span>`
sans copie cachée, donc `textContent` et nom accessible identiques. `ZoneDeLecture` reçoit
`question` (la zone EST une question : phrase modèle, critère de panier) et `dansUneQuestion`.

Comptes, par la sonde d'inventaire (ouverture de chaque nœud, coloration allumée) :
`ETIQ=… TOUS=1 node scripts/playwright.mjs test --config bac-a-sable/socle-questions/playwright.diagnostic.config.ts inventaire`
puis `node bac-a-sable/socle-questions/zones-lecture.mjs avant|apres`.

| | Zones de lecture colorées / recensées | Écart |
|---|---:|---:|
| Avant | 4 / 48 (seules les `ZoneDeLecture` : récit, mot de `grave`, phrase modèle, critère de `tri`) | −44 |
| Après | 55 / 55 | 0 |

Branchées : la consigne de la barre (14 moteurs) ; la bulle de Gobi ; les réponses des 11 moteurs
qui en ont ; la cible d'`attrape` ; la notice de `chemin` ; la cible de `colorie` ; le modèle de
`grave` ; la question d'`histoire` ; le compteur de `place` ; la lettre et le trait de `trace` ;
la consigne du geste de `tri`. Branchés aussi, mais absents à l'ouverture donc hors de ce
comptage : les mots posés dans les fentes (`phrase`, `tri`, `assemble`, `chrono`) et leur vol,
les messages de refus de `grave` et `trace`, la légende du mot d'`eclair`. La garde L1 couvre
tout ce qui est visible à l'ouverture de chaque nœud.

Hors règle, par contrat (texte d'interface, pas de lecture) : « Étape n sur N », les commandes
(« Cacher l'histoire », « Montre-moi le mot », « J'ai fini »), les messages en police
d'interface. **Écart signalé** : les étiquettes des jetons de `place` (« un ballon ») sont des
mots que l'enfant lit, mais en police d'interface ; non colorées (§ 8).

Aucune zone n'a été laissée sans couleur exprès. Le mot d'`eclair` (lu en temps limité) était
déjà coloré par `ZoneDeLecture` ; aucune décision écrite dans `Docs/` ne demande de l'en priver.

## 8. Questions au parent

1. **Rallumer la coloration syllabique** dans le profil de l'enfant (éteinte depuis le 3 août,
   § 0) ? Sans cela, rien de ce lot ne se verra en couleurs.
2. **Repère d'étape** : garder « Étape 1 sur 3 » en police d'interface (T10, E03), ou le passer
   au corps de lecture pour qu'il n'y ait qu'une taille dans la barre ? (Coût mesuré à prévoir :
   environ 10 px d'en-tête.)
3. **E08, indice automatique** : après 45 s sans toucher, Gobi fait briller en bleu la bonne case.
   Le garder ainsi, le retarder, ou ne le donner que sur demande ?
4. **E09** : pour le plus long récit (`galeries-10`) sur la tablette tournée (1100×700), le récit
   défile dans son cadre (40 px). D'accord, ou raccourcir ce récit ?
5. **`place`** : passer les étiquettes des dessins en police de lecture (et donc en couleurs) ?
6. Garder « À toi de choisir : » devant la question d'histoire (une ligne plus longue) ?

## 9. Tests et captures

- Ajoutés : `tests/qualite/socle-questions.spec.ts` (28 cas, 28 rouges → 28 verts) ;
  `tests/e2e/parcours-retours-parent-e08-e09.spec.ts` (6 cas, 6 rouges → 6 verts).
- `tests/e2e/qa-outils.ts` : `appliquerReglagesLectureReels` accepte
  `{ colorationSyllabique }` (défaut inchangé : éteinte, comme la tablette).
- Garde du socle : **97 / 98** (seul `tri` `cite-des-histoires-08` en 1100×700, connu).
- Composants : 27 + 40 fichiers liés, 706 tests verts. Parcours liés (chemins, retours chemin,
  plateau lisible, repère d'étape, glisser) : 65 verts. a11y, réglages de lecture, promesses :
  327 verts. `composition-exercices` (projet responsive) : 4 échecs, **identiques** sur la
  construction d'avant (préexistants).
- **Captures visuelles qui changeront** (aucune mise à jour) : `tests/visuel/noeud-colorie`
  ×3 (barre de consigne, cible du coloriage). Elles sont déjà rouges sur la construction
  d'avant, comme les 4 de `carte` et `decor-v2` (7 rouges avant comme après).
