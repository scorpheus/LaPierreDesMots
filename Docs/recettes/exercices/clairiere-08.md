# Recette — clairiere-08 / clairiere-lianes-voyelles-01

Date : 2026-09-02
Moteur : `chemin`
Habillage : `clairiere.lianes`

## Parcours joué

Quatre consignes sont jouables jusqu'à la fin : suivre successivement les mots contenant `a`,
`i`, `o`, puis `u`. Chaque parcours comporte trois cases, soit douze mots distincts (`chat`,
`papa`, `lac`, `lit`, `midi`, `riz`, `dos`, `moto`, `pot`, `mur`, `lune`, `jus`). Le vocabulaire
est court et lisible pour le CE1 ; la formulation « Suis les mots où tu lis un a/i/o/u » reste
compréhensible, même si une reformulation (« Suis le chemin des mots avec la lettre… ») serait
plus idiomatique.

Le plateau offre quatre voisines au départ et les choix sont donc réels (`qcm-4`), non déduits
d'un couloir. Un tap sur une case rendue est suffisant pour avancer ; la cible n'est pas
décorative. Les cases déjà franchies et non adjacentes sont refusées sans erreur bloquante. La
position repart bien de `depart-arbre` à chaque consigne, les parcours restent atteignables et la
quatrième réussite clôt l'exercice avec réussite/récompense. Relecture, aide Gobi et audio restent
gratuits ; aucune consigne n'est uniquement écrite et aucun écran d'échec n'est produit.

Le mélange concerne les choix du plateau, pas l'ordre pédagogique des quatre consignes. Il est
déterministe via `Alea` et non exploitable par une réponse toujours identique.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel du défaut historique vérifie qu'un plateau en couloir ne peut pas
valider l'exercice sans lecture : le branchement maximal attendu est quatre et le moteur dérive
bien `qcm-4`. Les tests composants couvrent le tap, la mauvaise case sans échec, l'aide, la
réécoute et le double-tap ; les réducteurs couvrent la progression et la fin.

```text
npm test -- --run tests/composants/MoteurChemin.test.tsx tests/unitaires/moteurs-reducteurs.test.ts tests/unitaires/competences-trois-moteurs.test.ts
115 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est nécessaire pour cette ligne.

## Verdict tablette

Les cases sont des cibles tactiles distinctes sur un plateau aéré ; le tap ne demande pas de
coordination fine. Le chemin reste lisible et l'état courant est visible sans animation du texte.

**BLOQUÉ-ASSET** — `contenu/habillages/clairiere/lianes.svg` est encore un SVG gris de blockout.

**BLOQUÉ-AUDIO** — la reformulation plus naturelle nécessiterait de régénérer les clips avant
publication ; les `audio: null` actuels ne permettent pas de la livrer telle quelle.
