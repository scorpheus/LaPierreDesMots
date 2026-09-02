# Boucle de tests rapide — 2 septembre 2026

## Décision

La chaîne `npm run verifier` reste la preuve de finition avant un commit ou une livraison, mais
elle n’est plus relancée après chaque petite retouche visuelle. Sur la machine mesurée, elle prend
environ six minutes à six travailleurs et peut dépasser vingt minutes avec un parallélisme mal
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
et expire après 270 secondes. Six travailleurs constituent le compromis validé pour ce dépôt :

```powershell
$env:PIERRE_TRAVAILLEURS='6'
npm run verifier
```

Le run du 2 septembre 2026 avec cette valeur a terminé ses 12 étapes sans échec en 378,8 secondes.
