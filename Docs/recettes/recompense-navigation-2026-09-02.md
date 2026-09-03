# Recette — récompense et navigation du campement — 2026-09-02

## Décision de finition

L'écran de récompense conserve le raster validé `assets/gobi/animation/joie.webp` comme image
centrale. Les signes de la cascade ne sont plus des mini-illustrations SVG : ils deviennent de
petits emblèmes typographiques, strictement décoratifs et masqués aux lecteurs d'écran. Le vrai
personnage reste donc la seule grande image de célébration, sans nouvel asset ni faux dessin.

Les informations immobiles suivent désormais cette hiérarchie : Gobi et « Bravo ! », étoiles,
explication calme des étoiles, gain éventuel, puis choix de la suite. Les actions sont des pastilles
à relief : une seule est dorée et principale (« On y va ! » ou « Au campement ! »), les autres sont
des retours volontaires (« Encore une fois », « Voir la carte »).

Dans la barre du campement, les accès sont trois cartes illustrées et non des boutons techniques :

| Action | Promesse visible | Indice non textuel |
| --- | --- | --- |
| La carte | Choisir un chemin | carte dans un médaillon vert |
| Le coffre | Mes trouvailles | coffre dans un médaillon doré |
| Revoir l’histoire | La Pierre raconte | livre dans un médaillon violet |
| On y va | sortie du jour | pastille dorée existante, remise en relief par la même règle CSS |

Le comportement, les `data-*` de parcours et les zones tactiles sont conservés. La modification
concurrente du chaudron n'a pas été touchée.

## Vérification ciblée

Commande exécutée, sans compilation globale ni régénération de capture :

```powershell
npx vitest run --project composants tests/composants/EcranRecompense.test.tsx tests/composants/EcranCampement.test.tsx tests/composants/JaugePalier.test.tsx
```

Résultat : **3 fichiers, 39 tests réussis**. Les deux nouveaux garde-fous vérifient le libellé
« On y va » pour l'étape suivante et la présence, pour les trois destinations du campement, de la
carte illustrée, de son emblème et de sa promesse courte.
