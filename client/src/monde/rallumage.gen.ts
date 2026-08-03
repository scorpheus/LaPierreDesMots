// ⚠ FICHIER ENGENDRÉ — ne pas éditer à la main.
// Produit par `node scripts/generer-rallumage.mjs` depuis
// `contenu/habillages/carte/carte-monde-v3.svg` et la table `ANCRES` de `client/src/ecrans/EcranCarte.tsx`.
//
// QUANTILES DE DISTANCE À L'ANCRE, par région. Indice `i` sur 21 valeurs
// ⇒ part de territoire `i / 20`. Le quantile à 25 % EST le rayon qui
// contient le quart du territoire : c'est ce qui rend « chaque exercice rallume la même part »
// vrai par construction, là où `R·√(k/N)` le rendait faux (palier 1 à 19,5 %, palier 12 à 0 %).
//
// Mesuré sur une grille au pas de 1 unité :
//   clairiere             49382 pts · médiane 88.6 · portée 147
//   galeries              35519 pts · médiane 75.3 · portée 148
//   marais-jumeau         43398 pts · médiane 86.6 · portée 146
//   foret-muette          39952 pts · médiane 79.8 · portée 150
//   volcan                40789 pts · médiane 80.6 · portée 153
//   cite-des-histoires    53596 pts · médiane 92.3 · portée 162

export const QUANTILES_RALLUMAGE: Readonly<Record<string, readonly number[]>> = {
  'clairiere': [0, 28.1, 39.6, 48.5, 56, 62.6, 68.7, 74.2, 79.3, 84.1, 88.6, 93, 97.1, 101.1, 104.9, 108.7, 112.6, 116.8, 121.7, 127.9, 147],
  'galeries': [0, 23.8, 33.6, 41.1, 47.5, 53.2, 58.2, 63, 67.2, 71.3, 75.3, 79.2, 82.9, 86.6, 90.4, 94.4, 98.7, 103.6, 110, 119.5, 148],
  'marais-jumeau': [0, 26.2, 37.1, 45.5, 52.8, 59.4, 65.5, 71.2, 76.5, 81.6, 86.6, 91.5, 96.3, 101.1, 105.7, 110.4, 115.2, 120.2, 125.4, 131.5, 146],
  'foret-muette': [0, 25.2, 35.7, 43.7, 50.4, 56.4, 61.8, 66.7, 71.3, 75.7, 79.8, 83.6, 87.3, 91, 94.6, 98.5, 102.8, 107.8, 113.8, 122.2, 150],
  'volcan': [0, 25.5, 36.1, 44.1, 51, 57, 62.4, 67.4, 72.1, 76.4, 80.6, 84.5, 88.4, 92.3, 96.3, 100.6, 105.1, 109.9, 116, 123.7, 153],
  'cite-des-histoires': [0, 29.2, 41.2, 50.6, 58.4, 65.3, 71.6, 77.2, 82.6, 87.7, 92.3, 96.9, 101.2, 105.5, 109.9, 114.2, 118.6, 123.1, 128.1, 134.1, 162]
};

export const NB_QUANTILES_RALLUMAGE = 21;
