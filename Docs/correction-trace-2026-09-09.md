# Correction du tracé du 9 septembre 2026

Le parent demande explicitement que le `b` commence par sa barre du haut vers le bas,
puis par sa panse du milieu vers le bas. Cette demande tranche la question Q-C2-1
jusqu'ici laissée ouverte dans le référentiel. La géométrie reste identique ; seuls
l'ordre des points, le départ, l'arrivée et le chemin de la panse changent. Les deux
copies livrées dans `miroir-bd-01` et `miroir-bp-01` sont synchronisées exactement.

Le parent a confirmé qu'il parle du `d` minuscule. Sa demande du 9 septembre
remplace explicitement l'ordre D33 pour cette lettre : barre de haut en bas,
puis panse du milieu vers le bas côté gauche. La panse avait déjà ce parcours ;
seuls l'ordre des traits et leurs numéros changent. Le modèle et sa copie dans
`miroir-bd-01` sont synchronisés. Le `q` conserve son rond initial et reste inchangé.
Le référentiel déclare désormais le `d` dans une règle séparée ; les assertions
historiques d'ordre sont remplacées par celles du nouvel arbitrage. Les tests
de refus dans le mauvais ordre tracent maintenant le rond avant la barre.

Le message de refus créait une ligne dans une rangée de grille jusque-là vide, ce
qui réduisait le SVG. Le composant réserve maintenant la hauteur des messages
existants, y compris leurs retours à la ligne, avec des éléments invisibles exclus
de l'accessibilité. Le texte visible reste dans la même cellule. Aucun message
nouveau destiné à l'enfant n'est ajouté.

L'orchestrateur a constaté les deux régressions avant correction : départ de la
panse `[30, 100]` au lieu de `[30, 60]` ; sur PC 1366 × 768, échelle SVG passant de
2,7177 à 2,4777 et translation horizontale de 547 à 559 lors du refus. Le nouveau
test du `d` a également échoué avant correction sur l'ordre rond/barre.

Vérifications à exécuter par l'orchestrateur : test unitaire
`trace-correction-parent.test.ts`, famille trace et ductus, test navigateur
« le refus ne change ni la taille ni la position de la lettre sur PC » dans
`parcours-trace.spec.ts`. Ce dernier mesure la matrice réelle du dessin avant et
après le refus, puis après reprise réussie du trait. Le résultat intégré sera
consigné par l'orchestrateur après exécution.

La campagne globale a révélé un ancien comptage dans `trace-validation.test.ts` :
il attendait deux panses identiques parmi seize gestes miroirs. La panse descendante
du `b` demandée par le parent est désormais identique à celle du `p` : neuf points,
départ `[30,60]`, arrivée `[30,100]`, écart maximum mesuré nul. Les panses `d/q`
restent identiques entre elles, avec neuf points de `[70,60]` à `[70,100]`.
L'oracle attend donc exactement les quatre cas `b/p`, `p/b`, `d/q`, `q/d` pour
le rond, tous acceptés sans axe de confusion. Les douze autres gestes doivent
tous être refusés ; le seuil de diagnostic de 90 % et l'axe exact sont conservés.

Résultats du lot intégré : 143 tests unitaires/composants de tracé et ductus passent ; les deux parcours navigateur de tracé passent, dont la stabilité après refus sur PC 1366 × 768. La compilation de production réussit et le serveur local est relancé sur http://127.0.0.1:8080/. Les journaux sont dans bac-a-sable/corrections-2026-09-09/.

La clôture ciblée confirme les 27cas de trace-validation, intégrés à un passage69tests réussi, puis cinq parcours cascade/tracé réussis. La compilation finale et TypeScript passent. Le résultat global et les écarts visuels historiques sont détaillés dans correction-progression-galeries-2026-09-09.md.
