# Recette de la Clairière — 2026-09-02

## Périmètre et méthode

Les 12 nœuds `clairiere-01` à `clairiere-12` citent bien les 12 exercices présents dans
`contenu/exercices/clairiere/`. La recette rapide vérifie les références de gameplay, l'égalité
consigne/clip du manifeste et le mélange des éléments de tri :

```text
npx vitest run tests/unitaires/recette-clairiere.test.ts --reporter=dot
3 tests passés
npm run test:contenu -- --region clairiere
620 contrôles, 0 problème
```

Le nouveau décor raster `contenu/assets/decors/ecole.png` est au même ratio que
`ecole-place.svg` (1536×1024 contre 922×615). Les trois zones de placement ont été remesurées
sur cette image : `ciel` (x 1000–1267, y 33–158), `toit-ecole` (x 525–866, y 72–283) et
`a-cote-du-banc` (x 92–458, y 558–750). Elles correspondent respectivement au ciel, au toit
central et à la zone immédiatement voisine du banc gauche. Aucun ajustement géométrique n'est
nécessaire.

## Tableau 12/12

`BLOQUÉ-ASSET` signifie que le gameplay est vérifiable mais que l'habillage livré reste un SVG
gris de blockout, ou qu'un élément attendu reste sans asset raster final. `BLOQUÉ-AUDIO` signifie
qu'une formulation meilleure est identifiée, mais ne peut pas être publiée sans régénérer son clip
pour conserver l'égalité texte visible/texte parlé.

| Nœud / exercice | Consigne | Aide | Gameplay | Choix | Visuel | Réaction / sortie | Audio | Verdict |
|---|---|---|---|---|---|---|---|---|
| `clairiere-01` / `ecole-01` | 4 phrases courtes ; les affirmatives donnent la couleur à appliquer | Le moteur ne donne pas de stratégie concrète : Gobi relit la phrase | 4 couleurs et 4 séries de régions résolubles ; références vérifiées | Une couleur choisie puis une zone ; pas de hasard à exploiter | `ecole-v2.svg` gris, maîtresse sans raster final dans ce parcours | Le coloriage avance ; défaut de particules/récompense transversal hors périmètre | 4/4 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/ecole-v2.svg` ; aide concrète à traiter dans le moteur/coquille |
| `clairiere-02` / `luciole-couleurs-01` | « Touche la luciole de la couleur que tu as lue » est naturelle | Relecture de la consigne, donc aide tautologique | 6 mots, 3 choix par étape, réponses valides | `MoteurEclair` mélange les options par `Alea` | `luciole.svg` gris ; luciole en SVG de blockout | Réponse immédiate ; particules génériques transversales à retirer | 6/6 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/luciole.svg` |
| `clairiere-03` / `paniers-couleurs-01` | 4 consignes compréhensibles, c3/c4 s'appuient sur le critère appris | Relecture de la consigne, tautologique | 12 mots, 2 paniers, groupes disjoints et références valides | Corrigé : les mots sont mélangés à la création de l'état par `Alea` | `paniers.svg` gris ; éléments textuels sans vignettes finales | Dépôt tap ou glissé atteignable ; sortie standard du moteur | 4/4 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/paniers.svg` ; ancien ordre prévisible corrigé |
| `clairiere-04` / `ecole-02-place` | 3 consignes courtes et non ambiguës | « Cherche [objet]. Pose-le [zone]. » après correction, non tautologique | 3 zones remesurées sur le raster école ; références toutes valides | À mélanger par `Alea` au moteur `place` ; correction attendue par la campagne transversale | Fond raster école validé ; objets de réserve encore en SVG | Placement libre, aucune tentative si l'activité est lancée en mode parent | 3/3 clips identiques | **BLOQUÉ-ASSET** — `reserve[].asset` pointe encore vers les SVG d'objets |
| `clairiere-05` / `guirlande-phrase-01` | « Touche les fanions dans l'ordre » ne dit pas explicitement qu'il faut former la phrase | Relecture tautologique | Deux phrases de 4 mots ; toutes les étiquettes existent | `MoteurPhrase` mélange les étiquettes par `Alea` | `guirlande.svg` gris et mots sans illustration raster finale ; texte à contrôler à distance | Ordre imposé, refus sans état bloqué | 2/2 clips identiques à l'ancien texte | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/guirlande.svg`. Proposition de texte plus clair (« Touche les mots dans l'ordre pour faire une phrase ») = **BLOQUÉ-AUDIO** tant que les clips ne sont pas régénérés |
| `clairiere-06` / `lucioles-attrape-01` | 4 consignes naturelles (« Attrape… où tu lis… ») | Relecture tautologique | 4 étapes, cibles et leurres tous référencés | Les cibles sont positionnées de façon déterministe ; pas d'ordre exploitable dans la consigne | `lucioles.svg` gris ; cibles sans asset illustré final | Capture/tap possible, sortie standard | 4/4 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/lucioles.svg`, `cibles[].asset=null` |
| `clairiere-07` / `collier-syllabes-01` | « Assemble les syllabes pour écrire le mot » est court et adapté | Relecture tautologique ; ne souffle pas la première syllabe | 4 mots, 8 blocs utiles et 1 intrus ; références valides | `MoteurAssemble` mélange les blocs par `Alea` | `collier.svg` gris ; blocs de syllabes textuels sans illustration finale | Assemblage atteignable ; refus sans échec | 4/4 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/collier.svg` ; aide concrète à traiter dans la coquille |
| `clairiere-08` / `lianes-voyelles-01` | « Suis les mots où tu lis un a/i/o/u » est compréhensible mais peu idiomatique | Relecture tautologique | 4 parcours, voisinages et 12 cases vérifiés | Le chemin est l'objet pédagogique ; choix disponibles réellement multiples | `lianes.svg` gris ; cases uniquement typographiques | Parcours connexe et sans issue impossible | 4/4 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/lianes.svg`. Reformulation possible (« Suis le chemin des mots avec la lettre… ») = **BLOQUÉ-AUDIO** |
| `clairiere-09` / `veillee-histoire-01` | Récit et 5 questions courtes, vocabulaire enfant | Relecture tautologique ; aucune stratégie de retour au récit | 5 questions, options et réponses distinctes ; références vérifiées | `MoteurHistoire` mélange les options | `veillee.svg` gris ; aucun visuel raster du feu/tente | Récit consultable, questions atteignables, sortie standard | 5 questions + récit présents au manifeste | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/veillee.svg` |
| `clairiere-10` / `ecole-03-mots-outils` | 6 phrases courtes ; affirmatives et impératives cohérentes avec le coloriage | Relecture tautologique | 9 régions cibles valides, surface suffisante et sans doublon | Une couleur puis une zone ; pas de mélange nécessaire pour la compétence | `ecole-v2.svg` gris ; maîtresse et enfants restent du blockout SVG | Avance automatique par consigne ; défaut particules/récompense transversal | 6/6 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/ecole-v2.svg` |
| `clairiere-11` / `luciole-voyelles-01` | « Touche le son que tu lis dans le mot » est compréhensible mais vague | Relecture tautologique | 6 mots, 3 choix par étape, réponses distinctes | `MoteurEclair` mélange les options par `Alea` | `luciole.svg` gris et options sans illustration raster finale | Exposition et réponse atteignables ; sortie standard | 6/6 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/luciole.svg`. Reformulation (« Lis le mot. Touche la voyelle que tu entends ») = **BLOQUÉ-AUDIO** |
| `clairiere-12` / `paniers-voyelles-01` | c1/c2 explicites ; c3/c4 (« ces mots », « derniers mots ») dépendent du contexte appris | Relecture tautologique | 12 mots, deux critères exclusifs a/i, références valides | Corrigé : éléments mélangés par `Alea`, consignes conservées dans l'ordre | `paniers.svg` gris ; éléments textuels sans vignettes finales | Dépôts tap/glissé atteignables, progression sans issue | 4/4 clips identiques | **BLOQUÉ-ASSET** — `contenu/habillages/clairiere/paniers.svg` ; aide concrète à traiter dans le moteur/coquille |

## Corrections réalisées dans ce lot

- `moteurTri.creerEtat` mélange maintenant les éléments une seule fois avec `entree.alea.melanger`.
  L'ordre pédagogique des consignes reste inchangé.
- Ajout de `tests/unitaires/recette-clairiere.test.ts` : couverture 12/12, égalité des 52 clips
  de consigne avec le manifeste, références de régions/zones et preuve du mélange des deux tris.
- Vérification géométrique de `ecole-place.svg` contre le raster école publié : aucune correction
  nécessaire.

## Restes bloquants

1. Remplacer les huit habillages SVG gris et les éléments sans illustration par des assets raster
   validés, en gardant leurs identifiants de régions et leurs repères.
2. Refaire les textes signalés comme vagues, puis régénérer et contrôler les clips audio associés.
3. Donner à chaque moteur une aide spécifique (stratégie/indice) au lieu de faire relire la
   consigne seule ; cette modification appartient à la coquille ou aux moteurs partagés et sort
   du périmètre de cette recette régionale.
4. Retirer les particules génériques des refus/réussites et vérifier la sortie/récompense dans la
   campagne transversale.
