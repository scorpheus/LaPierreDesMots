# Socle commun : le repère d'étape (T10) et les deux gestes (T11) — 9 octobre 2026

Retours du parent traités : **T10**, **T11**, **E03**, **E05**, **E06** (`Docs/tableau-retours.md`).
Plans de référence : `Docs/contrat-socle-activite.md` (socle d'écran) et
`Docs/decision-decor-de-fond-et-mots-poses.md`. Brouillons, sondes et captures :
`bac-a-sable/socle-etape/`.

## 1. Le repère d'étape commun

**Où est-il.** `client/src/activite/RepereEtape.tsx` et son CSS `client/src/activite/etape.css`
(fichier neuf).

**Sa place exacte.** C'est le moteur qui rend le repère, car lui seul connaît le rang et la cible
de l'étape. Le repère s'affiche pourtant dans une **fente de la barre de consigne d'`EcranNoeud`**,
juste sous le texte de la consigne, sur la même ligne que la jauge du palier
(`.entete-suivi`, rangée 2 de l'en-tête). Il y est envoyé par un portail React
(`FournisseurRepereEtape`). La place est donc la même dans tous les exercices, par construction,
quelle que soit la disposition de la scène. Un moteur monté seul (tests de composant) rend son
repère sur place. Sur écran étroit (≤ 700 px de large), la consigne occupe toute la largeur et le
repère passe dessous.

Pourquoi la ligne de la jauge et pas une ligne à part : une rangée de plus coûtait **37 px** à la
scène et cachait 8 cartes de `paires` `cite-des-histoires-02` en 1100×700. Sur la ligne de la jauge,
le coût tombe à **17 px**, ou 26 px pour une cible à lire (`attrape`). Mesuré par
`bac-a-sable/socle-etape/entete-diagnostic.spec.ts` :

| Nœud | Format | En-tête sans repère | En-tête avec repère |
|---|---|---:|---:|
| clairiere-05 (phrase) | 1280×720 | 99 px | 116 px |
| clairiere-06 (attrape) | 1280×720 | 99 px | 125 px |
| cite-des-histoires-07 (chemin) | 1080×670 | 98 px | 115 px |
| clairiere-01 (colorie) | 800×1100 | 209 px | 226 px |

**Son style.** C'est celui de E03, jugé le plus lisible par le parent : une pastille bordée de
trait (2 px), un fond jaune (`--soleil` à 28 % sur parchemin) et la police d'interface en gras. Le
texte dit « Étape *n* sur *N* », suivi de « ✦ » et de la cible de l'étape quand il y en a une.
Quand cette cible est un mot à déchiffrer (la couleur à attraper, par exemple), elle prend le style
de lecture du profil (`detailALire`), comme la consigne. S'il n'y a qu'une étape, le repère n'écrit
pas « Étape 1 sur 1 ».

**Le signal de changement d'étape.** Il ne porte que sur le cadre, jamais sur le texte.
- À chaque changement de rang, et jamais à l'ouverture, `data-nouvelle-etape="oui"` allume le cadre :
  fond jaune plein et liseré jaune de 3 px. Il reste allumé jusqu'au toucher suivant de l'enfant.
  C'est un état, pas un mouvement, donc il vaut aussi avec `prefers-reduced-motion` et
  `animationsDesactivees`.
- Si le mouvement est permis par le système (`prefers-reduced-motion: no-preference`) et par le jeu
  (`data-animations="vives"`), une onde d'ombre part du cadre, trois fois en 0,7 s. Les images-clés
  n'animent que `box-shadow`. Le test `RepereEtape.test.tsx` interdit `transform`, `opacity`,
  `font` et `color` dans les images-clés.
- **Voix : pas de relecture automatique.** Dans `attrape` et `eclair`, la consigne de l'étape *est*
  le mot à déchiffrer (« bleu », le mot de l'éclair). La lire d'office donnerait la réponse et
  viderait l'exercice de son sens. La consigne reste à un toucher (« Écouter »), sans limite et
  sans coût (R15). Le signal visuel suffit à dire « quelque chose a changé ». **Proposition au
  parent :** si l'on veut aussi un signal sonore, ajouter un effet court et neutre
  « nouvelle-etape » à `CodeEffet` (`partage/src/fournisseurs/audio.ts`). Il ne dirait pas le mot.
  Rien n'est fait sans son accord.

**Étapes qui ne contraignent rien.** `afficherRang={false}` retire « Étape *n* sur *N* » quand le
réducteur accepte tout, dans n'importe quel ordre (voir § 5). `dansLaBarre={false}` garde sur
place un repère qui n'est pas une étape : c'est le compteur de `paires`.

## 2. Tableau des moteurs

| Moteur | Étapes (contenu) | Composant partagé | Rang affiché | Déplace des objets | Glisser au doigt | Toucher | Preuve |
|---|---|---|---|---|---|---|---|
| assemble | oui (5 / 5 exercices) | oui | oui | oui (syllabes) | ✅ (avant : ❌) | ✅ | `parcours-glisser-et-toucher` « T11 — assemble », `parcours-repere-etape` |
| attrape | oui (7 / 7) | oui | oui + cible à lire | non (attraper) | — | — | `MoteurAttrape.test.tsx` (repère), `parcours-repere-etape` |
| chemin | oui (7 / 7) | oui | oui (la règle reste près des cases) | non (choisir la case suivante) | — | — | `MoteurCheminEtapes.test.tsx`, `parcours-chemins-regles` |
| chrono | oui (5 / 5) | oui | **non** (décision du 3 sept., voir § 6) | oui (vignettes) | ✅ (avant : ❌) | ✅ | `parcours-glisser-et-toucher` « T11 — chrono », `MoteurChrono.test.tsx` |
| colorie | oui (6 / 6) | oui | oui | non (peindre) | — | — | `MoteurColorie.test.tsx`, `EcranNoeud.test.tsx` (T10) |
| eclair | oui (6 / 6) | oui | oui | non (choisir) | — | — | `MoteurEclair.test.tsx` |
| grave | oui (5 / 5) | oui | oui | oui (lettres) | ✅ (avant : aucun glisser) | ✅ | `parcours-glisser-et-toucher` « T11 — grave » |
| histoire | oui (6 / 6) | **non** | — | non (choisir) | — | — | voir l'écart ci-dessous |
| libre | non | — | — | non (peindre) | — | — | — |
| paires | oui (8 / 8), non contraignantes | oui (compteur, sur place) | non | oui (carte sur carte) | ✅ (avant : ❌ sans maintien de 250 ms) | ✅ | `parcours-glisser-et-toucher` « T11 — paires », `MoteurPaires.test.tsx` |
| phrase | oui (6 / 6) | oui | oui | oui (mots) | ✅ (avant : ❌, **E05**) | ✅ | `parcours-glisser-et-toucher` « T11 — phrase », `parcours-repere-etape` « E05 » |
| place | oui (1 / 1) | oui | oui + cible | oui (dessins) | ✅ | ✅ | `parcours-glisser-et-toucher` « T11 — place », `parcours-place-responsive` |
| trace | non | — | — | non (tracer) | — | — | — |
| tri | oui (11 / 11), **non contraignantes** | non (retiré, E03) | non | oui (mots) | ✅ | ✅ | `parcours-glisser-et-toucher` « T11 — tri », `tri-etapes-non-contraignantes.test.ts`, `parcours-repere-etape` « E03 » |

### Comptes obtenus par commande

**Moteurs à étapes : 12.** Commande `node bac-a-sable/socle-etape/etapes-par-moteur.mjs`. Elle
compte les exercices de chaque moteur qui ont plus d'une consigne ou question. 12 moteurs en ont au
moins un ; seuls `libre` et `trace` n'en ont aucun.

**Moteurs migrés sur le composant : 10.** Commande
`grep -l "<RepereEtape" client/src/moteurs/*/*.tsx | awk -F/ '{print $4}' | sort -u`. Résultat :
assemble, attrape, chemin, chrono, colorie, eclair, grave, paires, phrase, place.

**Écart signé : 10 − 12 = −2.**
- **tri** : le repère est retiré exprès (E03). Les étapes ne contraignent rien (§ 5).
- **histoire** : non migré. Sa carte « À toi de choisir — *question* » est le texte de la question,
  posé près des réponses, et non un repère d'étape. Un test existant exige l'absence de
  « Étape *n* sur » (`MoteurHistoire.test.tsx`, « sans jargon de rang »). C'est une question au
  parent (§ 6).

Parmi les 10 moteurs migrés, 8 affichent « Étape *n* sur *N* ». Les deux autres :
- `chrono` n'affiche pas de rang, par décision du parent du 3 septembre ;
- `paires` n'en affiche pas non plus, car ses groupes ne contraignent rien ; il garde son compteur
  de paires.

**Moteurs qui déplacent un objet : 7.** C'est un inventaire par lecture du code (geste « prendre
une pièce et la poser ») : assemble, chrono, grave, paires, phrase, place, tri. Les huit fichiers
ci-dessous portent un glisser ; `commun` est le module partagé, pas un moteur. Commande :
`grep -lE "ZoneDeGlisser|useDraggable" client/src/moteurs/*/*.tsx | awk -F/ '{print $4}' | sort -u`,
résultat : assemble chrono commun grave paires phrase place tri.

**Moteurs aux deux gestes prouvés : 7.** Commande :
`node scripts/playwright.mjs test --project=parcours parcours-glisser-et-toucher`. Sortie :
**14 passed**, soit 7 moteurs × 2 gestes. La même commande avant correction donnait **5 failed /
9 passed** : le glisser au doigt échouait sur phrase, assemble, chrono, paires et grave.

**Écart signé : 7 − 7 = 0.**

Moteurs classés « ne déplacent pas » :
- `attrape`, `eclair`, `histoire` : on choisit une réponse ;
- `chemin` : on choisit la case suivante, le pion n'est pas porté ;
- `colorie`, `libre` : on peint, une couleur puis une zone ;
- `trace` : on trace.

**Proposition au parent :** le glisser d'une couleur sur une zone, dans `colorie` et `libre`.
Cela se discute, rien n'est fait.

### La cause de E05 (T11)

Dans `phrase`, `assemble` et `chrono`, la cible de dépôt (`useCibleDeDepot`) était créée dans le
corps du moteur. Elle se trouvait donc **au-dessus** du `DndContext` que ce même moteur rend, et
s'inscrivait auprès d'un contexte vide. Le mot suivait le doigt, mais la ligne n'était jamais
survolée et aucun dépôt n'arrivait. La sonde `bac-a-sable/socle-etape/gestes3-diagnostic.spec.ts`
l'a mesuré à la souris comme au doigt (`data-glisse="oui"`, `data-survolee="non"`, état inchangé).

Correction, une fois pour tous les moteurs, dans `client/src/moteurs/commun/glisser.tsx` :
- un composant `CibleDeDepot` rend la cible **dans** la zone de glisser ;
- `useCibleDeDepot` et `useJetonGlissable` **lèvent une erreur** hors d'un `ZoneDeGlisser`, au lieu
  d'échouer en silence (test `tests/composants/glisser-commun.test.tsx`, vu rouge puis vert).

Pour `grave`, les touches du clavier sont devenues saisissables, et le mot est la zone de dépôt.
Pour `paires`, le maintien de 250 ms avant de glisser n'est plus exigé que lorsque la page peut
défiler (petit écran, même seuil que `socle.css`). Ailleurs, le glisser part à 8 px, comme dans les
autres moteurs.

## 3. Garde du socle, avant et après

Commande :
`node scripts/playwright.mjs test tests/qualite/socle-activite.spec.ts --project=qualite --reporter=json`
(14 moteurs × 7 formats).

| | Cas verts | Écarts |
|---|---:|---|
| **Avant** : rapport `bac-a-sable/socle/garde-7formats.json`, campagne précédente, 9 oct. 10 h 55, non remesuré | 91 / 98 | chemin cite-07 téléphone S10 ; paires volcan-12 portrait S4 ; tri cite-08 × 3 formats ; tri volcan-02 1100×700 ; eclair clairiere-02 640×360 S8 |
| **Après** : `bac-a-sable/socle-etape/garde-apres.json` | 97 / 98 | tri `cite-des-histoires-08` 1100×700, S1 (**E70**, connu, à arbitrer par le parent) |

L'écart entre les deux colonnes ne vient pas entièrement de ce lot : d'autres corrections ont eu
lieu entre 10 h 55 et le début de ce travail, et l'arbre de travail « avant » n'a pas pu être
reconstruit sans toucher aux modifications des autres. Ce qui est mesuré et attribuable à ce lot :
- la sonde avec et sans repère (§ 1) ;
- **un premier essai a fait rougir deux cas**, corrigés avant la fin :
  - `paires` cite-02 en 1100×700, 8 cartes cachées : le compteur est resté sous les cartes ;
  - `chemin` cite-07 en 1080×670, 3 cases recouvertes et une en-tête de 220 px : la règle courte
    est restée près des cases, seul le rang monte dans la barre.

Un cas est **instable sous charge** : `paires` `cite-des-histoires-02` en 1366×768 a échoué une
fois dans une passe complète (16 cartes cachées). Il est passé 3 fois sur 3 en relance ciblée
(`-g paires`), et ni sa barre ni son pied ne changent avec ce lot (en-tête mesurée à 99 px). Ce
nœud est le cas dense **E64**.

Autres suites relancées, ciblées :
- `--project=responsive` : 343 réussis, 2 échecs connus (le coffre en 1920×1200 et E70) ;
- `parcours-chemins-regles`, `parcours-audit-75-noeuds`, `parcours-place-responsive`,
  `parcours-paires-sans-ordre`, `parcours-retours-parent-lucioles-coffre`, `parcours-repere-etape`
  et `parcours-glisser-et-toucher` : tous verts ;
- `parcours-paires-cadrage` : 2 échecs sur `cite-des-histoires-02` (E64), **antérieurs** à ce lot
  (leurs artefacts d'échec existaient avant la première modification) ;
- Vitest : 27 fichiers, 275 tests verts (tous les `Moteur*`, `RepereEtape`, `EcranNoeud`,
  `glisser-commun`, les tests de tri et de liberté d'ordre).

## 4. Captures visuelles qui vont changer (à montrer au parent)

Aucune référence n'a été mise à jour. La suite `--project=visuel` était déjà rouge sur 7 cas avant
ce lot (références connues). Deux captures changent à cause de ce lot : la barre de consigne porte
désormais le repère, et le nuancier perd sa ligne « Étape *n* sur *N* » :
- `tests/visuel/noeud-colorie.spec.ts` : « grise à l'ouverture » ;
- `tests/visuel/noeud-colorie.spec.ts` : « coloriée à une cible de la fin ».

Captures prises pour le parent, dans `bac-a-sable/socle-etape/diagnostic/` :
- `capture-clairiere-05-ouverture.png` et `capture-clairiere-05-nouvelle-etape.png` (E05, le cadre
  allumé) ;
- `capture-clairiere-06-ouverture.png` (E06) ;
- `capture-clairiere-03-ouverture.png` (E03, sans repère) ;
- `capture-cite-des-histoires-07-ouverture.png` (chemin) ;
- `capture-clairiere-01-ouverture.png` (colorie, portrait) ;
- `capture-clairiere-02-ouverture.png` (eclair).

## 5. E03 — ce que fait le réducteur

Mesuré par `tests/unitaires/tri-etapes-non-contraignantes.test.ts`, sur le contenu réel
`clairiere-paniers-couleurs-01` :
- `evaluerTri` (`partage/src/moteurs/tri/validation.ts`) ne vérifie que le **bon panier**, jamais
  l'étape courante ;
- `avancerEtapes` (`moteur.ts`) retire des étapes à venir un mot rangé en avance ;
- pendant l'étape 1, un mot de l'étape 2 posé dans son panier est accepté (`dernierRefus` nul) ;
- les deux sortes de mots rangées en alternance finissent l'exercice **sans un refus**.

Les étapes de `tri` ne contraignent donc rien, dans **tous** les exercices `tri`, car la règle est
dans le moteur et non dans le contenu.

**Ce qui est fait.** Le repère « Étape 1 sur 2 : … » est retiré de `tri` (`MoteurTri.tsx`, et son
CSS `.tri-etape` dans `tri.css`). La consigne du haut (« Range chaque mot dans le bon panier »)
suffit, comme le proposait le parent. Toucher un mot pour le prendre marchait déjà, et le glisser
aussi. Les deux sont prouvés par `parcours-glisser-et-toucher`.

**Proposition de contenu (non appliquée, `contenu/` intouché).** Les `consignes` de `tri`
(`aRanger` par étape) ne servent plus qu'à l'ordre de l'aide de Gobi et au journal par étape. Deux
voies s'offrent au parent :
- **fusionner les étapes en une seule** par exercice. C'est une consigne unique, plus honnête, mais
  le journal perd le détail par série ;
- **les garder telles quelles**, invisibles. C'est l'état actuel, sans rien à changer.

La première modifierait 11 fichiers de `contenu/exercices/` et les journaux de rejeu : elle demande
une validation.

## 6. Questions au parent

1. **chrono** : le 3 septembre, vous avez retiré « Étape 2 / 4 » comme « compteur technique »
   (`Docs/correctif-chronologies-2026-09-03.md`). Le repère commun garde ce choix : « 3 images à
   ranger. », sans rang. Faut-il afficher « Étape *n* sur *N* » ici aussi, maintenant que le repère
   est le même partout ?
2. **histoire** : faut-il un repère « Question *n* sur *N* » en haut, avec le signal de
   changement ? Un test exige aujourd'hui l'absence de rang.
3. **Son au changement d'étape** : faut-il un effet court et neutre (§ 1) ?
4. **phrase** : la barre dit « Touche les mots dans l'ordre… » alors que le glisser marche
   maintenant. Faut-il dire « Touche ou fais glisser les mots… » (couverture lexicale CE1 à
   vérifier) ?
5. **colorie** : la jauge à points du nuancier double le repère. Faut-il la garder ?
