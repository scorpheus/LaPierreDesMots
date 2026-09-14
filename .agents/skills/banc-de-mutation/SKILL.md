---
name: banc-de-mutation
description: Mesurer la capacité de la QA à détecter des défauts et repérer les tests trompeurs. À utiliser pour les recettes de mutation, leurs rapports ou le tableau de bord QA ; pas pour diagnostiquer un défaut produit ordinaire.
---

# Banc de mutation et tests trompeurs

Ce skill contrôle la QA elle-même. Pour un défaut fonctionnel, suivre le test discriminant et la
validation proportionnée d'`AGENTS.md` sans charger ce banc.

## Sources propriétaires

| Source | Responsabilité |
|---|---|
| `scripts/qa/recettes.mjs` | recettes, verdict attendu et justification de chaque survivant |
| `tests/rapports/qa/mutations.json` | dernière mesure complète |
| `tests/rapports/qa/mutations-partiel.json` | mesure filtrée, sans remplacer la référence |
| `tests/rapports/TABLEAU-DE-BORD-QA.md` | synthèse lisible des rapports existants |
| `Docs/audit-qa.md` | historique et limites de conception |

Un compte historique n'est jamais l'état courant. Ne modifier ni une recette ni son verdict pour
faire passer une campagne.

## Choisir la commande

```text
npm run qa:ancrages                         # prévol rapide, sans mutation
npm run qa:mutations -- --seulement=M27     # une ou plusieurs recettes nommées
npm run qa:mutations                        # campagne complète, longue et exclusive
npm run qa:trompeurs                        # tests désactivés, sans assertion ou suspects
npm run qa:tableau                          # relit les rapports ; ne recalcule rien
```

La campagne complète et toute mutation appartiennent à l'orchestrateur qui détient le jeton de
suite. Ne jamais les lancer pendant des écritures concurrentes. Une exécution filtrée sert à
reproduire ou confirmer ; elle ne remplace pas la dernière mesure complète.

## Gardes obligatoires

Avant une campagne complète :

1. constater une base verte avec `npm run test` ;
2. inspecter les fichiers cibles déjà modifiés et les écrivains actifs ;
3. vérifier que les ancrages sont uniques avec `npm run qa:ancrages` ;
4. laisser le banc exclure à chaque recette les tests non suivis par Git ;
5. conserver les contrôles négatifs et la seconde base verte après restauration.

Le banc restaure dans un `finally`. S'il relit un contenu différent de la mutation qu'il vient
d'écrire, il doit signaler `COLLISION` et ne jamais écraser ce contenu. Une base rouge, un ancrage
perdu, un contrôle négatif rouge ou une collision rendent la mesure non opposable.

## Lire le verdict

- Une mutation attendue `DETECTEE` qui survit est une régression de la QA.
- Une mutation attendue `SURVIT` qui est détectée est une amélioration à confirmer par une seconde
  exécution ciblée avant de resserrer manuellement son verdict.
- Un nouveau survivant exige une justification dans `scripts/qa/recettes.mjs`.
- `qa:tableau` affichant « non mesuré » demande une mesure ; ce n'est pas un zéro.
- Un champ `assertionE2E` nomme seulement une couverture hors du banc. Il ne prouve pas que le
  parcours Playwright a été exécuté.

Le détecteur de tests trompeurs bloque les tests désactivés, les fichiers sans assertion et les cas
sans assertion. Ses heuristiques supplémentaires restent des avertissements à revoir ; ne pas
durcir leur plafond sans avoir éliminé les faux positifs.

## Ajouter ou modifier une recette

1. Employer un ancrage unique sur une seule ligne. Pour plusieurs lignes, utiliser une expression
   régulière explicite qui traverse les retours à la ligne.
2. Exécuter `npm run qa:ancrages`.
3. Mesurer seulement la recette concernée avec `--seulement=<id>`.
4. Inscrire le verdict observé. Si la mutation survit, écrire la raison précise.
5. Laisser la campagne complète à l'orchestrateur lorsqu'elle est réellement justifiée.

Pour vérifier les gardes du banc sans toucher aux recettes de référence, passer un jeu dédié avec
`npm run qa:mutations -- --recettes=<chemin>/recettes-de-preuve.mjs`. Il doit couvrir au moins une
mutation attendue détectée qui survit, un ancrage absent et un contrôle négatif qui casse. Pour le
tableau, un dossier de rapports vide doit produire un échec explicite.

## Limites du résultat

Le banc exécute ses étages Vitest, contenu et rejeu. Il ne remplace ni les parcours tactiles et
responsive, ni la reconnaissance d'une image, ni la validation pédagogique, ni le visa esthétique
du parent. Rapporter la commande, le code de sortie, le caractère complet ou filtré de la mesure,
les survivants et toute collision ou base rouge.
