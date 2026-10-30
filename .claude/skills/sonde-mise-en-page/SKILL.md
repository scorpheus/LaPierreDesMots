---
name: sonde-mise-en-page
description: Mesurer pourquoi un moteur rogne, déborde ou change de disposition dans le navigateur — client de test figé, test Playwright ciblé à fils limités, sonde jetable qui relève la géométrie, comparaison avec une construction sans le changement. À utiliser dès qu'un test responsive, la garde du socle (socle-activite) ou un parcours signale « commande rognée », « hors écran », « géométrie instable » ou « positions différentes après rotation », ou avant de toucher une cascade de disposition mesurée (vagues, cliquets, filet).
---

# Sonde de mise en page

Rôle : remplacer une hypothèse sur la mise en page par une mesure, sans saturer la machine du
parent (8 fils logiques au plus, priorité basse — `scripts/priorite-basse.mjs`).

## 1. Construire le client figé (≈ 2 min)

```
PIERRE_FILS=4 npm run construire:test -w @pierre/client -- --outDir ../tests/rapports/client-fige-rapide --emptyOutDir > bac-a-sable/<dossier>/construction.log 2>&1
```

Toute modification de `client/` exige de reconstruire avant de relancer un test navigateur.
Pour comparer avec une variante (fonction désactivée), construire dans un AUTRE dossier
(`--outDir ../tests/rapports/client-fige-sans-X`) puis restaurer le fichier source : on garde
les deux clients et on lance la même sonde sur chacun (`PIERRE_CLIENT_TEST=...`).

## 2. Lancer un test ciblé

```
PIERRE_FILS=4 PIERRE_CLIENT_TEST=tests/rapports/client-fige-rapide FORCE_COLOR=0 \
  node scripts/playwright.mjs test <spec> --project=<parcours|qualite|responsive> --no-deps --workers=2 --reporter=line -g "<filtre>"
```

- Lire `Error:`, `Expected/Received` et le n° de ligne ; `--repeat-each=4` pour une instabilité.
- Plus de 10 min : `run_in_background`, jamais de boucle d'attente.
- Le bloc `aucune commande ne disparaît` de `responsive-tous-ecrans` est **sériel** : un échec
  laisse les lots suivants « did not run ». Le relancer seul (`-g`), 1 travailleur.
- Un délai dépassé (`waitForFunction`, `Test timed out`) sous charge se relance seul avant
  d'être cru. Vitest complet sous charge : idem, relancer les fichiers en échec seuls.

## 3. La sonde jetable

Un fichier `tests/qualite/sonde-<sujet>.spec.ts` (projet `qualite`), en-tête
`// SONDE JETABLE (<date>) : <question>`, qui écrit un JSON dans `bac-a-sable/<dossier>/`.
Ce qu'on relève : boîtes (`getBoundingClientRect`) de la scène, de la grille, des cibles,
attributs de décision du moteur (`data-vagues`, `data-filet-defilement`, `data-disposition-*`),
`document.fonts.status`, styles calculés utiles.

Pièges vécus (30 oct. 2026) :

- **Le projet `responsive` émule un mobile** (`isMobile`, `hasTouch`, `deviceScaleFactor: 2`) :
  une sonde dans `qualite` ne reproduit pas ses arrondis. Ajouter
  `test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 2 })` pour comparer.
- **Les lots responsive mesurent dès que l'écran est visible**, sans attendre la stabilité :
  relever aussi l'état « au moment de la mesure », pas seulement après
  `attendreGeometrieStable`.
- **Reproduire le chemin réel** : un lot visite 30 écrans dans la même page
  (`recettesDEcrans().slice(0, 30)`), un parcours passe par une vraie sortie. Une entrée directe
  (`entrerDansLeNoeud`) peut ne pas reproduire.
- **Journal des images** : `page.addInitScript` posé AVANT la première navigation
  (`appliquerReglagesLectureReels` navigue), avec un `MutationObserver` qui pousse une ligne
  quand l'état change ; des marqueurs (`--- avant rotation`) bornent les phases.
- Un débordement d'une grille **centrée** sort aussi vers le HAUT : `scrollHeight` ne le voit
  pas ; mesurer les boîtes des cibles.
- **Le dernier choix est-il fait sur l'état final ?** (31 oct., `paires`) Rejouer le calcul du
  moteur DANS la sonde, sur l'état final (essais des colonnes, `serree` basculé) : s'il redonne
  autre chose que ce qui est affiché, le choix a été pris sur une géométrie transitoire (phrase
  repliée après coup, rotation) et aucun observateur ne l'a revu. Observer la scène ne suffit
  pas ; observer les cibles avec un nombre de corrections borné.
- Une sonde dans `tests/e2e/` doit s'appeler `parcours-sonde-<sujet>.spec.ts` (filtre
  `testMatch` du projet `parcours`), et importer `appendFileSync` (pas de `require` en ESM).

## 4. Nettoyer

La sonde n'est jamais commitée : copie dans `bac-a-sable/<dossier>/sondes/`, puis suppression
**nommée** (`rm "tests/qualite/sonde-<sujet>.spec.ts"`), après `git status --short` qui doit la
montrer `??`. Jamais de joker.

## 5. Consigner

La cause mesurée, les chiffres (avant/après) et ce qui reste instable vont dans le document du
chantier sous `Docs/` ; une conclusion sans la ligne de mesure qui la porte ne s'écrit pas.
