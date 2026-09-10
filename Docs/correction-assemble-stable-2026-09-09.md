# Décor stable pendant un refus de syllabe

Retour parent : le message « On cherche la syllabe qui vient à cette place-là. »
rétrécissait l'illustration quand l'enfant choisissait une syllabe dans le mauvais ordre.

Dans `client/src/moteurs/assemble/MoteurAssemble.tsx`, la bande de réponse est
mesurée par un `ResizeObserver` et sa hauteur est retranchée du décor. La hauteur
minimale du message vide ne réservait pas les retours à la ligne du texte visible.

La zone de retour réserve désormais tous les messages de refus avec une grille
superposée. Les copies de mesure sont invisibles et exclues de l'accessibilité ; le
message réel reste dans sa région d'annonce. Aucun texte enfant, contenu,
seuil pédagogique ou acquis n'est modifié.

Le test navigateur `tests/e2e/parcours-assemble-stable.spec.ts` ouvre le vrai nœud
`galeries-07` sur PC (1366 × 768) et tablette (800 × 1100), avec les réglages de
lecture familiaux. Il compare la matrice réellement rendue du SVG avant le refus,
après le refus et après une réponse correcte. Il vérifie aussi que le refus
n'acquiert aucune syllabe et que la reprise acquiert uniquement la syllabe attendue.
L'orchestrateur a constaté les deux échecs attendus avant la correction :
`bac-a-sable/corrections-2026-09-09/assemble-rouge.log`.

La validation après correction et la campagne intégrée sont exécutées par
l'orchestrateur du lot des fenêtres de récompenses.
