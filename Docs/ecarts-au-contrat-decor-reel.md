# Écarts au contrat gelé — campagne « décor réel »

Fichier de complément, écrit conformément à CLAUDE.md § « Discipline de fin de tâche » : les
quatre documents de référence et `journal-des-decisions.md` ne sont pas touchés ; le contrat
`contrat-technique-v1.md` non plus. Ce qui suit est ce que la campagne a **ajouté** ou
**retiré** par rapport à lui, avec sa raison, pour qu'aucune de ces décisions ne se reperde.

## Ce que la campagne a corrigé

Une revue adverse avait établi que deux comportements du contrat étaient **morts sur le décor
réel** — celui que l'enfant voit — alors qu'ils fonctionnaient sur le décor bouchon, qui
n'ira jamais devant lui.

La cause commune, mesurée, était plus profonde que les deux défauts : **le décor réel
n'était monté par aucun test.** Le stub `fetch` de `tests/composants/MoteurColorie.test.tsx`
lisait `new URL(\`contenu/${…}\`, RACINE_DEPOT)`. Or `RACINE_DEPOT` est un chemin système
depuis sa propre correction, pas une URL `file:` :

```
new URL('contenu/habillages/clairiere/ecole.svg', 'C:\…\LaPierreDesMots\')
→ TypeError [ERR_INVALID_URL]: Invalid URL
```

Le `.catch()` de `MoteurColorie` avalait l'exception — c'est sa règle, l'asset peut manquer et
le jeu doit rester jouable (aucun état sans issue, test `singe`) — et les 13 cas de la suite
composant jouaient donc tous le décor de repli. **Un chemin d'exécution que personne
n'emprunte ne se dégrade pas : il ne fonctionne simplement jamais.**

## Écart n° 1 — surface de `@pierre/partage/validation`

Le contrat § 11.2 fige quatre symboles : `ProblemeValidation`, `RapportValidation`,
`validerExercice`, `validerBlocJeu`. Deux s'y ajoutent :

| Symbole | Pourquoi ici, et pas ailleurs |
|---|---|
| `estCheminFerme(d)` | Vivait dans `client/src/moteurs/colorie/SceneSvg.tsx`, exporté « destiné à L-G », **et appelé nulle part** : un script Node ne sait pas importer un `.tsx`. |
| `validerSceneSvg(texteSvg, habillage)` | Applique la fermeture à un fichier entier, en ne jugeant que les calques `coloriable`. |

C'est le seul module que `scripts/test-contenu.mjs` (Node pur, via `dist/`) **et** les tests
TypeScript atteignent tous les deux. Aucune dépendance à Ajv n'est introduite, et le client
n'importe pas ce sous-chemin : le budget de 250 Ko gzip (contrat § 3.1) n'est pas concerné.

## Écart n° 2 — un septième contrôle dans `test:contenu`

Le contrat § 9.8 fige 6 contrôles actifs et 4 désactivés avec leur raison. Un **septième**
s'ajoute, nommé `P3.2` parce qu'il ne vient pas de l'annexe T § T1 mais de l'**annexe P
§ 3.2**, reprise par CLAUDE.md : « un trait interrompu d'un pixel fait fuiter le remplissage
sur toute l'image ». C'est l'étape **bloquante** de la chaîne image, et `test:contenu`
n'ouvrait jusqu'ici aucun fichier `.svg`.

Trois règles : `svg-calque-absent`, `svg-region-absente`, `svg-chemin-ouvert`. Les calques
`trait` et `fond` ne sont pas jugés sur la fermeture — le trait est fait de segments ouverts
par construction, et c'est correct : il n'est jamais rempli.

Le contrôle part des **SVG présents sur disque**, pas des habillages : un `.svg` qu'aucun
habillage ne déclare est soit du contenu mort, soit une déclaration manquante, et les deux
méritent d'être dits. La note du rapport porte le compte `contrôlés / présents`.

## Écart n° 3 — retrait de quatre symboles de `client/src/moteurs/colorie/index.ts`

`SCENE_BOUCHON`, `VIEWBOX_BOUCHON`, `RegionBouchon` et `estCheminFerme` disparaissent de ce
barillet. Aucun ne figurait au contrat § 11.2, qui n'ouvre ici que `renduColorie` et
`jouerRecoloration` : **ce retrait rapproche le fichier de sa surface gelée.**

## Décision de conception — une seule géométrie fait autorité : l'habillage

Le moteur portait un décor de repli **écrit à la main**, avec les mêmes 30 `id` que
l'habillage et **aucune de ses coordonnées** — mesuré : la région `banc` à `[95, 495]` côté
habillage contre `[797, 503]` côté code, soit 702 unités d'écart, aux bords opposés de
l'image.

Or `regionSousLeDoigt(habillage, point)` lit **toujours** les centroïdes de l'habillage, y
compris quand le décor affiché venait du code. Sur ce décor-là, le repli de visée peignait
donc une région située ailleurs dans l'image, en silence, et le comptait comme une erreur de
l'enfant.

Deux géométries sous les mêmes `id` ne peuvent pas coexister. **L'habillage l'emporte**, pour
trois raisons :

1. C'est lui que le contrat § 1.6 désigne comme le décor (`ecole.svg`, lot L-F) ; le décor en
   dur, lui, n'avait aucun propriétaire au contrat.
2. `RegionColoriable` (§ 4.1) ne transporte que `centroide` et `surface`. Dessiner le repli
   comme le **disque de rayon `√(surface/π)`** — exactement l'approximation qu'emploie
   `regionSousLeDoigt` (§ 5.2) — rend l'accord *exact par construction*, et non plausible :
   ce qui est dessiné sous un point **est** ce que la visée nomme en ce point.
3. Le moteur ne connaît plus aucun décor : ni forme, ni libellé, ni coordonnée. C'est la
   traduction littérale de « zéro ligne de code par habillage » (v2 § 7). Un second habillage
   n'ajoute pas une ligne dans `SceneSvg.tsx` — condition des critères R12 et R13.

L'attribut `data-decor` vaut désormais `habillage` ou **`repli`** (et non plus `bouchon`) :
le repli n'est plus une maquette provisoire, c'est le mode dégradé permanent quand l'asset
manque. Aucun test ni document ne dépendait de l'ancienne valeur (vérifié par recherche).

## Ce qui garde chaque risque

| Risque | Test |
|---|---|
| Le décor réel n'est monté par personne | `tests/composants/MoteurColorie.test.tsx` › « monte bien le décor déclaratif, et non le repli » |
| Aucun retour sur erreur (D16) | idem › « l'erreur fait osciller la région SUR LE DÉCOR RÉEL » |
| Actionnable au clavier en apparence seulement | idem › « le décor réel s'annonce actionnable au clavier ET répond à Entrée », « la barre d'espace peint aussi » |
| Deux géométries sous les mêmes `id` | idem › « dessine chaque région là où `regionSousLeDoigt` la nomme » |
| Un décor codé en dur dans le moteur | idem › « le moteur ne code en dur aucune cour d'école » (lit le source et refuse son vocabulaire) |
| Un trait ouvert fait fuiter la couleur | `tests/unitaires/contenu-validation.test.ts` › « régions fermées — étape bloquante de l'annexe P § 3.2 » (10 cas) |
