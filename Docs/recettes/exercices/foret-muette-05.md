# Recette — foret-muette-05 / foret-muette-pas-japonais-chemin-01

Date : 2026-09-02
Moteur : `chemin`
Habillage : `foret.pas-japonais`

## Parcours joué

Trois consignes sont jouables jusqu'à la fin : mots avec `s`, mots sans `s`, puis de nouveau
mots avec `s`. Les formulations (« Marche sur les mots qui ont un s. » / « … qui n'ont pas de
s. ») sont courtes, audibles et adaptées au CE1. L'aide Gobi propose relecture, souffle,
surlignage et montre-cible, sans coût.

Le départ et les cases voisines sont de vraies cibles tactiles ; chaque tap déclenche le passage
du pion. Les embranchements mettent en regard singulier/pluriel (`chat`/`chats`, etc.), donc le
choix demande la lecture et ne se réduit pas à un couloir. Une case non adjacente est ignorée avec
le motif `case-non-adjacente`, sans erreur ni état bloqué. Chaque parcours est disjoint et la
troisième réussite clôt le moteur avec réussite/récompense.

## Contrôle rouge et tests ciblés

Le test rouge fonctionnel du défaut de parcours sans choix vérifie le voisinage et le refus doux
d'un pas hors portée. Les tests composants couvrent tap, mauvaise case sans écran d'échec, aide,
réécoute et double-tap ; les réducteurs couvrent progression et fin.

```text
npm test -- --run tests/composants/MoteurChemin.test.tsx tests/unitaires/moteurs-reducteurs.test.ts
106 tests passés, 0 échec
```

Aucun correctif moteur ou contenu n'est requis pour cette ligne. Audio hors campagne, conformément
à la demande.

## Verdict tablette

Les cases sont espacées et ciblables au doigt ; le tap suffit et aucune coordination fine n'est
requise. Le texte de consigne reste séparé du décor animé.

**BLOQUÉ-ASSET** — l'habillage `foret.pas-japonais` reste à contrôler pour son asset final ; la
recette fonctionnelle ne valide pas une illustration non fournie. Aucun asset n'a été généré.
