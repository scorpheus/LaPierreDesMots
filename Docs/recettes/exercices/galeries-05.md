# Recette — galeries-05 / galeries-pierre-bd-01

Date : 2026-09-03
Moteur : `grave`
Habillage : `galeries.pierre`

## Parcours joué

Les six consignes font graver la lettre manquante dans `bol` (b), `dos` (d), `bus` (b), `dame`
(d), puis dans `cabane` (b) et `radis` (d). Les trous sont placés alternativement au début et au
milieu du mot : la stratégie « toujours b au début » ne fonctionne pas. Le clavier ne propose que
`b` et `d`, ce qui cible précisément la confusion gauche-droite.

Le tap sur une touche puis sur le trou est le geste effectif ; les cibles sont visibles et
atteignables sur tablette. Une mauvaise lettre est refusée sans écran d'échec et la consigne reste
jouable. L'aide Gobi relit, souffle ou surligne gratuitement. Les six réussites terminent
l'exercice et transmettent la récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel couvre le défaut d'un trou non ciblable au tap et d'un ordre de position
prévisible. Les tests composants couvrent bonne/mauvaise lettre, refus sans échec, aide et fin ;
les réducteurs couvrent les transitions.

```text
npm test -- --run tests/composants/MoteurGrave.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne.

## Verdict tablette

Le clavier b/d et le trou sont des cibles tactiles explicites ; aucune écriture libre ni
coordination fine n'est demandée. Le rendu met en évidence la position du trou dans le mot.

**BLOQUÉ-ASSET** — l'asset final de `galeries.pierre` reste à valider ; aucun asset n'a été
généré.
