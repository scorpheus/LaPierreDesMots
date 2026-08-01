# Écarts au contrat gelé — chaîne `npm run verifier`

Complément à `ecarts-au-contrat-decor-reel.md`. Les quatre documents de référence
(specs v2, annexes T et P, addendum), `journal-des-decisions.md` et `contrat-technique-v1.md`
n'ont **pas** été modifiés.

Chaque écart est écrit ici avec ce qui l'a rendu nécessaire, mesuré.

---

## 1. `package.json` — trois scripts ajoutés à la section prescrite au § 8

Le § 8 donne la section `scripts` verbatim. Trois entrées s'y ajoutent, aucune n'est retirée,
aucune des 14 d'origine ne change de nom.

| Script | Pourquoi |
|---|---|
| `prepare` → `lefthook install` | Sans lui, sur une machine neuve, les crochets git ne sont jamais posés : le premier commit passe sans lint ni tests. Un filet qu'il faut penser à tendre n'est pas un filet. `lefthook.yml` documentait déjà l'écart en creux (« aucun script `prepare` n'est déclaré »). |
| `preparer:navigateurs` → `node scripts/playwright.mjs install chromium` | Voir l'écart n° 2 : c'est le seul moyen d'installer Chromium **dans le dépôt**. |
| `test:e2e` et `test:qualite` passent par `node scripts/playwright.mjs test …` au lieu de `playwright test …` | Idem — la variable `PLAYWRIGHT_BROWSERS_PATH` doit être posée avant le chargement de `playwright-core`, ce qu'un `npm run` seul ne sait pas faire de façon portable. Les projets, l'ordre et le sens de chaque commande sont inchangés. |

## 2. `scripts/playwright.mjs` — un fichier qui ne figure pas au § 1.7

**Motif : la décision D9.** `npx playwright install chromium`, laissé à lui-même, écrit
~450 Mo dans `%LOCALAPPDATA%\ms-playwright`, c'est-à-dire **hors du dépôt**. Le contrat § 8.2
prescrit pourtant cette commande telle quelle dans ses prérequis. Les deux ne peuvent pas être
vrais en même temps : D9 l'emporte.

`PLAYWRIGHT_BROWSERS_PATH` doit être en place **avant** que `playwright-core` ne soit chargé —
ce module calcule son dossier de registre au chargement, pas au lancement du navigateur. La
poser dans `playwright.config.ts` serait trop tard, et `.npmrc` ne sait poser que des
`npm_config_*`. D'où un lanceur unique, que les trois commandes Playwright empruntent.

Mesuré, après installation :

```
outils/navigateurs/chromium-1234/chrome-win64/chrome.exe
git check-ignore -v outils/navigateurs/chromium-1234/chrome-win64/chrome.exe
  → .gitignore:7:outils/
```

## 3. `playwright.config.ts` — `PIERRE_RAPPORT_JSON` remplace `PLAYWRIGHT_JSON_OUTPUT_NAME`

`verifier.mjs` posait `PLAYWRIGHT_JSON_OUTPUT_NAME` pour donner à chaque étape son propre
rapport machine. **Cette variable n'existe plus dans Playwright 1.62** — mesuré :

```
grep -rn "PLAYWRIGHT_JSON_OUTPUT" node_modules/     → aucune ligne
```

Conséquence avant correction : `test:e2e`, `test:visuel` et `test:qualite` écrivaient toutes
dans `tests/rapports/brut/playwright.json`, chacune écrasant la précédente. Le dépouillement
ne trouvait jamais son rapport, et le RAPPORT.md affichait « 1 échec sur **0** cas » sans
jamais nommer le scénario fautif. Le contrat § 8.2 exige `{ etape, statut, dureeMs, total,
echecs, details }` — `details` était vide et `total` faux : l'étape mentait.

`PIERRE_RAPPORT_JSON` est lue par notre propre configuration, donc elle, elle marche.

## 4. `.env.exemple` — deux variables ajoutées aux cinq du § 1.1

`PIERRE_HOTE` et `PIERRE_CLIENT` sont **réellement lues** par
`serveur/src/configuration.ts` (`lireConfiguration`), et ne figuraient nulle part au modèle.
`PIERRE_CLIENT` est celle dont dépend toute la suite E2E. Une variable lue par le code et
absente du modèle est un piège.

## 5. `tests/api/contenu.test.ts` — un fichier de test qui ne figure pas au § 1.7

Le contrat se contredit sur ce point :

- l'annexe T § 7, reprise dans `vitest.config.ts`, exige **≥ 80 %** sur
  `serveur/src/routes/**/*.ts` ;
- le § 1.7 ne nomme aucun test pour `serveur/src/routes/contenu.ts`.

Mesuré avant ce fichier : `contenu.ts` couvert à **39,8 % de lignes, 55 % de branches**, et la
zone entière à **64,47 %**. C'est la route qui sert le décor et les consignes à l'enfant, et
la seule barrière entre un exercice mal formé et son écran. Un seuil qu'on ne peut pas
atteindre finit par être baissé : mieux vaut l'écart, déclaré.

**⚠ Ce fichier n'a PAS pu être exécuté** — voir la note sur l'écriture concurrente, plus bas.

## 6. `client/src/testabilite/crochets.ts` — ce que fait `chargerProfil`

Le § 7.1 gèle la signature (`chargerProfil(fixture: FixtureProfil): Promise<void>`) et le type
`FixtureProfil`, mais ne dit pas ce que le crochet doit faire de `fixture.progression`, ni sur
quel écran il laisse l'application. Les deux choix retenus :

1. **`fixture.progression` est installée**, en journalisant une tentative qui vaut exactement
   les étoiles demandées (il n'existe aucune route pour écrire une progression : elle se
   recalcule depuis le journal, § 6.2). Avant, le champ était ignoré en silence, et
   `cassecou.spec.ts` — dont c'est l'assertion centrale, « aucune étoile déjà acquise n'est
   retirée » — lisait `0` au lieu de `3`.
2. **L'écran reste `profils`.** Le crochet appelait `choisirProfil`, qui pose `ecran: 'carte'` :
   l'écran de choix devenait inatteignable en E2E, et trois suites qui l'attendaient
   échouaient. Charger un profil et le choisir sont deux gestes distincts ; seul le second
   appartient à l'enfant, et il doit rester testable.

## 7. `tests/e2e/parcours-nominal.spec.ts` — deux corrections de TEST, citées au contrat

Rappel de la règle : on corrige le code, jamais le test, **sauf si le test contredit le
contrat gelé**. C'est le cas ici deux fois.

1. `locator.click()` vise le centre de la BOÎTE ENGLOBANTE de la région. Le contrat § 5.2 dit
   pourtant : « **1. Si le point tombe dans une région coloriable, c'est elle.** » C'est le
   POINT qui décide, jamais l'élément qu'on croit viser. Sur une région percée d'un trou, ce
   centre appartient à une autre région, et Playwright refusait d'agir. Le test demande
   désormais au navigateur un point qui est à la fois dans le remplissage (`isPointInFill`,
   qui respecte `fill-rule`) et au-dessus dans l'empilement (`elementFromPoint`).
   L'assertion en sort **renforcée** : c'est bien cette région-là qui doit devenir peinte.
2. Le test exigeait `data-peinte="oui"` après **chaque** tap, y compris le dernier. Or le
   contrat § 5.3 impose le passage automatique à la récompense dès la dernière cible :
   `EcranNoeud` est démonté et la région n'existe plus. Le parcours échouait *parce qu'il
   avait réussi*. Il attend maintenant l'un des deux états — région peinte, ou récompense
   affichée — et la récompense reste vérifiée en entier juste après la boucle.

## 8. `client/src/moteurs/colorie/PaletteConsigne.tsx` et `client/src/styles/global.css`

Deux valeurs de style changent pour tenir le WCAG AA, mesuré par axe-core sur le rendu réel.
**Aucun des 7 jetons de la palette (v2 § 9.2) n'est touché.**

| Où | Avant | Après | Contraste |
|---|---|---|---|
| `.pierre-consigne--a-venir` / `--faite` | `opacity: .55` | `opacity: .7` | 3,39:1 → 5,57:1 |
| `.cible-secondaire` (bouton « Gobi ») | `color: var(--parchemin)` | `color: var(--trait)` | 2,70:1 → 5,25:1 |

---

## Note — écriture concurrente dans le même arbre de travail

Le 2026-08-01 à partir de 18h29, une **seconde campagne** a commencé à écrire dans ce dépôt
(nouveaux moteurs `attrape` et `place`, `pedagogie/`, `parent/`, migrations `004` et `006`,
`Docs/contrat-features-v2.md`, et une réécriture de `serveur/src/application.ts`). Le brief de
cette phase déclarait pourtant « tu es le seul agent actif ».

Rien de cette campagne n'a été touché, ni modifié, ni supprimé. Mais elle rend impossible,
tant qu'elle est en vol, de mesurer honnêtement `npm run verifier` : `tsc -b`, `eslint .` et
`vitest` portent sur tout le dépôt. Le détail des mesures est dans le rapport de phase.

---

# Écarts introduits à l'INTÉGRATION de la campagne v2

Ajoutés après réunion des huit lots, quand le dépôt est revenu à un seul écrivain. Les quatre
documents de référence, `journal-des-decisions.md` et `contrat-technique-v1.md` n'ont **pas**
été modifiés.

## I.1 — `'trace'` entre dans quatre énumérations

`partage/src/identifiants.ts` (`CodeMoteur`), `contenu/schemas/exercice.schema.json`,
`contenu/schemas/habillage.schema.json` et la copie inline de `partage/src/contenu/validation.ts`.

Motif : le contrat des features v2 § 3.3 fait écrire le moteur `trace` par L2-C et son § 10.2
compte 13 `moteur.ts` neufs, `colorie` non compris — quatorze au total. Aucun de ces quatre
fichiers n'est attribué à un lot au § 3 ; L2-C et L2-E l'ont signalé et posé deux transtypages
provisoires plutôt que d'écrire hors de leur lot. Les deux transtypages sont retirés.

Conséquence mesurée avant correction : le serveur répondait **422** sur `galeries-01`
(`/jeu/moteur must be equal to one of the allowed values`) et `galeries.tracer-cristal` était le
seul habillage sur 36 refusé par son schéma.

`tests/unitaires/enumerations-moteurs.test.ts` compare désormais les quatre listes au registre.

## I.2 — 33 types de moteur réexportés par le barillet

`partage/src/index.ts` gagne `Contenu<X>`, `Etat<X>`, `Action<X>` pour les onze moteurs de L2-E.
Le § 4.7 fige les additions au barillet et n'y met que `place` et `trace`, alors que le § 4.8
fait typer les onze rendus client avec ces trois types — que le client ne peut nommer que par
`@pierre/partage`. 87 des 88 erreurs de `tsc -b` venaient de là. **Convention C1 respectée** :
ce sont des types, effacés à la compilation, coût de bundle nul.

## I.3 — `frameworkErrors` sur l'instance Fastify

`serveur/src/application.ts`. `onBadUrl` et `onMaxParamLength` écrivent directement dans la
réponse Node : ni les crochets, ni `setErrorHandler` ne les voient. Une URL au pourcentage
tronqué rendait `{ code: "FST_ERR_BAD_URL" }` — un vocabulaire étranger au projet, et un nom de
dépendance exposé au réseau du salon. Le contrat v1 § 3.3 exige `ErreurApi` sur **toute** erreur.

## I.4 — Le contrôle P3.2 accepte une seconde source de déclaration

`scripts/test-contenu.mjs`. La campagne apporte 8 SVG qui ne sont pas des scènes d'exercice — la
carte, le campement, les 5 stades de Gobi et son cristal — et qu'aucun `*.habillage.json` ne peut
déclarer. Le contrôle les traitait en « contenu mort ». Il lit désormais aussi `contenu/monde/*.json`,
et leur applique un contrôle **structurel** : tout tracé rempli est fermé. Extrait en
`scripts/svg-remplissage.mjs` et discriminé par 8 cas dans `tests/unitaires/svg-remplissage.test.ts`.

Mesure : **44/44 SVG contrôlés**, contre 36/44 avant.

`contenu/monde/regions.json` déclare en conséquence la scène de la carte, et
`contenu/schemas/monde.schema.json` l'exige — `carte-monde.svg` n'était déclaré que dans
`client/src/ecrans/EcranCarte.tsx`, et un décor coloriable déclaré dans du code n'est pas déclaré.

## I.5 — `$commentaire` admis à la racine d'un exercice

`contenu/schemas/exercice.schema.json` et sa copie inline. Même convention que
`contenu/monde/*.json`. Motif : un exercice marqué PLACEHOLDER n'avait aucun endroit où porter sa
marque, et une marque qui ne vit que dans un document est une marque que le relecteur du fichier
ne voit pas.

## I.6 — `--texte-secondaire`, AJOUTÉ à côté de la palette

`client/src/styles/global.css`. Les sept jetons de la v2 § 9.2 gardent leur valeur au bit près.
`--grisaille` (#8E97A8) est le jeton du **voile**, pas une couleur de texte ; les écrans parent
l'employaient comme telle, à **2,74:1** sur le parchemin là où WCAG AA exige 4,5:1 — 32 nœuds en
violation `serious` relevés par axe-core. `--texte-secondaire` (#5F6371) vaut **5,57:1**, valeur
déjà calculée et justifiée ailleurs dans le dépôt pour le même fond.

## I.7 — Trois fichiers de test restructurés, aucune assertion assouplie

| Fichier | Ce qui ne pouvait pas s'exécuter |
|---|---|
| `tests/api/migrations.test.ts` | Attendait UNE migration en dur ; le § 6 en ajoute cinq. La valeur attendue est maintenant lue sur disque, versions **et** noms comparés — plus strict qu'avant, et sans retouche à la migration 007 |
| `tests/e2e/parcours-parent.spec.ts` | Le verrou parent est global, en base, et se lève sur l'horloge SERVEUR qu'aucun test ne peut avancer. Le bloc qui le ferme s'exécutait avant les deux écrans, qui se heurtaient au 423. Ordre corrigé, préambule redondant du dernier cas retiré, deux assertions ajoutées |
| `tests/e2e/parcours-trace.spec.ts` | `MoteurTrace` ne rend que la lettre courante — ce que le fichier affirme lui-même vingt lignes plus haut. Le sondage attendait un `[data-trait]` disparu avec sa lettre. L'état « la lettre a été quittée » est accepté, et **uniquement pour le dernier trait d'une lettre** |
| `tests/qualite/gamefeel-latence.spec.ts` | Rappuyait dans la fenêtre de 120 ms où `data-appui` valait encore `oui` : aucune mutation, aucun relevé, attente infinie. On attend maintenant que la marque soit retombée — un état, pas une durée |

## I.8 — Un habillage `trace` de plus, et deux exercices de référence

`contenu/habillages/galeries/tracer-paroi.{habillage.json,svg}` : les deux nœuds `trace` livrés
pointaient tous deux sur `galeries.tracer-cristal`, seul habillage `trace` du § 3.3, ce qui viole
R13. Ajouter un habillage n'a coûté **aucune ligne de code** (v2 § 7) — la promesse de variété
vérifiée en acte.

`contenu/exercices/clairiere/{paniers-couleurs-01,luciole-couleurs-01}.json` : voir Q-I3 de
`Docs/questions-en-attente.md`. Ils comblent le manque qui rendait **R12 mécaniquement
intenable**, et attendent tous deux une relecture parent.
