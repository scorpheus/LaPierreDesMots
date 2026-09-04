# Boucle de tests rapide — 2 septembre 2026

## Décision

La chaîne `npm run verifier` reste la preuve de finition avant un commit ou une livraison, mais
elle n’est plus relancée après chaque petite retouche visuelle. Sur la machine mesurée, elle prend
environ six minutes à quatre travailleurs et peut dépasser vingt minutes avec un parallélisme mal
adapté.

Pendant l’itération, on exécute seulement le test du composant ou de la route touchée, accompagné
du contrôle de contenu si un JSON ou un asset change. Exemples réellement employés :

```powershell
npx vitest run tests/composants/MoteurPlace.test.tsx
npx vitest run tests/api/recuperation-code-parent.test.ts
npm run test:contenu
```

Une capture navigateur ciblée complète cette boucle lorsqu’un rendu change. La chaîne entière est
relancée une seule fois quand le lot est prêt à être committé.

## Parallélisme de la recette navigateur

Dix travailleurs ont produit `ERR_NO_BUFFER_SPACE` sur Windows. Un seul travailleur a évité la
saturation mais a rendu faux le contrat de couverture globale, qui attend 88 recettes parallèles
et expire après 270 secondes. Une campagne à six travailleurs a reproduit l’épuisement des sockets
après 318 cas le 4 septembre 2026 ; les quatre échecs ont tous repassé isolément, 8/8. Quatre
travailleurs constituent donc le plafond prudent pour ce dépôt :

```powershell
$env:PIERRE_TRAVAILLEURS='4'
npm run verifier
```

Le run du 2 septembre 2026 à six travailleurs avait terminé ses 12 étapes sans échec en 378,8
secondes, avant l’ajout des décors raster et l’augmentation de la campagne.

## Agrégation de la couverture sans quatrième parcours

Le 4 septembre 2026, les 521 scénarios E2E ont montré un autre coût artificiel : après que trois
familles avaient déjà atteint et éprouvé chacune des 89 recettes d’écran, le contrat final les
rejouait toutes une quatrième fois dans un unique test. Ce test monolithique a dépassé son
garde-fou de 270 secondes au milieu de la recette parent, puis a présenté les 80 recettes restantes
comme fermées avec le navigateur.

Le contrat final agrège désormais les destinations de `recettesDEcrans()` après leur validation
réelle par le projet `parcours`, dont le projet `couverture` dépend explicitement. Il continue de
comparer cet ensemble aux `data-ecran` dérivés du code et de refuser tout écran orphelin. Aucune
assertion fonctionnelle n’est retirée : une recette qui n’atteint pas son écran échoue dans la
campagne préalable ; seul son quatrième rejeu identique disparaît.
