---
name: banc-de-mutation
description: >-
  Mesurer ce que la QA du projet attrape réellement, et détecter les tests qui rassurent sans rien
  prouver. À utiliser dès qu'il s'agit de tester la QA elle-même — taux de survie des mutations,
  tests sans assertion, tests désactivés, assertions tautologiques, écrans ou moteurs sans garde,
  tableau de bord de la QA. Couvre aussi les pièges qui rendent une mesure de mutation fausse :
  contrôles négatifs absents, campagne parallèle qui écrit dans tests/, rapport partiel écrasant
  le rapport complet, restauration qui écrase le travail d'un autre.
---

# Le banc de mutation, et le détecteur de tests trompeurs

**Sources qui font foi, à lire, jamais à recalculer :**

| Fichier | Ce qu'il porte |
|---|---|
| `Docs/audit-qa.md` | La mesure de référence du 2026-08-02 : 27 mutations, 11 survivantes, 6 tests trompeurs, 6 zones aveugles |
| `scripts/qa/recettes.mjs` | Les recettes, leur verdict de RÉFÉRENCE et la justification écrite de chaque survivant |
| `tests/rapports/qa/mutations.json` | La dernière mesure complète |
| `tests/rapports/TABLEAU-DE-BORD-QA.md` | L'état de la QA sur une page |

---

## Les trois commandes

```
npm run qa:mutations     # ≈ 30–35 min · casse le code 33 fois et regarde si la suite hurle
npm run qa:trompeurs     # ≈ 2 s   · les tests qui n'assertent rien, ou pas ce qu'ils disent
npm run qa:tableau       # < 1 s   · la page à lire en trente secondes
```

`qa:tableau` LIT les deux rapports précédents ; il ne recalcule rien. Une case qui dit
« non mesuré » n'est pas un zéro, c'est un ordre à taper.

---

## AVANT de lancer le banc — les trois vérifications qui décident de tout

### 1. La base doit être verte, et le banc le vérifie lui-même

```
npm run test
```

Si elle est rouge, **arrêter là**. Toute « détection » mesurée sur une base rouge est un faux
positif. Le banc refuse de jouer une seule recette dans ce cas, et il le dit.

Mesuré le 2026-08-02, deux fois de suite sur ce dépôt : la base a rendu ROUGE puis VERTE à
trois minutes d'écart, sans qu'aucune recette ne tourne entre les deux — une campagne
parallèle écrivait un fichier de test *suivi par git*. Le garde a fonctionné : il a refusé de
mesurer.

### 2. Aucune campagne ne doit écrire les fichiers-cibles

Le banc imprime, au démarrage, la liste de ses fichiers-cibles qui sont déjà modifiés dans
l'arbre de travail. **Ce n'est pas un refus, c'est un avertissement** — mais lancer le banc
pendant qu'un autre agent écrit `client/src/api/client.ts` fait courir un risque réel : si
l'autre écrit pendant les 9 secondes où le fichier est muté, sa version reprendra la mutation.

Le banc se protège dans l'autre sens : avant de restaurer, il relit le disque. Si le contenu
n'est plus celui qu'il a écrit, **il ne restaure pas** et crie `COLLISION`. Écraser le travail
d'un autre pour nettoyer le sien coûte infiniment plus cher que de s'arrêter.

### 3. Les tests non suivis par git sont exclus — automatiquement, à chaque essai

```
git ls-files --others --exclude-standard -- tests
```

Ce sont exactement les fichiers qu'une autre campagne est en train d'écrire. Le banc recalcule
cette liste **à chaque recette**, pas une fois au départ : une campagne en ajoute pendant que
le banc tourne.

> **C'est la leçon la plus chère de l'audit.** Son premier passage a rendu 23 détectées sur 23.
> Résultat flatteur, donc suspect. Les cinq contrôles négatifs ont tous rougi : le banc comptait
> la rougeur d'une autre campagne comme sa propre détection. Sans eux, le document aurait publié
> « 0 survivant » et le père aurait cru sa QA parfaite.

---

## Les cinq invariants du banc

| # | Invariant | Ce qu'il coûte de l'oublier |
|---|---|---|
| 1 | **Ancrage unique**, sinon refus de démarrer | La mutation frappe ailleurs qu'on croit ; `d-panse` et `q-panse` portent le même `chemin` (D33) |
| 2 | **Restauration dans un `finally`, et jamais aveugle** | On écrase le travail d'un autre écrivain |
| 3 | **Tests non suivis exclus, recalculés à chaque essai** | On compte le bruit des autres comme sa détection |
| 4 | **Cinq contrôles négatifs**, qui doivent RESTER verts | La mesure entière ne vaut rien, sans qu'on le sache |
| 5 | **Base verte avant ET après** | Avant : faux positifs. Après : une restauration a échoué, le dépôt est sale |

---

## La règle d'échec, et pourquoi elle n'est pas « zéro survivant »

Le banc sort en **1** dès qu'un de ces cinq faits est vrai :

- une mutation attendue `DETECTEE` a **survécu** → la QA a régressé ;
- un contrôle négatif a rougi → la mesure n'est pas opposable ;
- la base n'était pas verte, avant ou après ;
- un ancrage a été perdu → une recette pourrit sans le dire ;
- une collision d'écriture a été détectée.

Une mutation attendue `SURVIT` qui se fait **détecter** n'échoue pas : c'est une AMÉLIORATION.
Le banc imprime la ligne exacte à changer dans `recettes.mjs`. **Le cliquet ne se resserre qu'à
la main, mais il ne se desserre jamais tout seul.**

> ### Une AMÉLIORATION se CONFIRME avant de resserrer quoi que ce soit
>
> Mesuré le 2026-08-02, et payé sur pièce. Le banc a rendu `🎉 AMÉLIORATION` sur M2 (« le bouton
> *La carte* disparaît de l'écran du nœud »). J'ai passé son `attendu` à `DETECTEE`. Le banc
> suivant l'a vue **SURVIVRE**, et il a sorti 1 — le garde a fonctionné, contre son propre auteur.
>
> La détection venait de `tests/composants/exploration-modele.test.tsx`, qu'une campagne
> parallèle écrivait : **au premier banc le fichier n'existait pas encore, au second il existait
> mais n'était pas suivi par git**, donc l'invariant 3 l'excluait. Deux mesures justes, deux
> dépôts différents.
>
> ```
> npm run qa:mutations -- --seulement=<id>     # confirmer AVANT d'éditer `attendu`
> ```
>
> **On ne resserre pas un cliquet sur une mesure qu'on n'a pas reproduite.** Un cliquet resserré
> à tort transforme le prochain banc en faux rouge, et un faux rouge se fait désactiver.

> Pourquoi pas « rouge dès qu'une mutation survit » ? Parce que 10 des 27 survivent aujourd'hui
> pour des raisons écrites et acceptées — un écran sans test de composant, une taille rendue
> qu'un DOM sans mise en page ne peut pas mesurer. Une commande rouge en permanence est une
> commande qu'on cesse de lire, et c'est le mode de défaillance que ce banc combat.
> **Tout survivant porte donc son `pourquoi` dans `recettes.mjs` ; tout NOUVEAU survivant
> fait rougir.**

---

## Ajouter une recette

1. Écrire l'ancrage **sur une seule ligne**. Le dépôt est sur Windows et git normalise
   LF ↔ CRLF : un ancrage littéral multi-ligne casse au premier `git checkout`. Si le défaut
   demande plusieurs lignes, utiliser une expression régulière qui traverse par `[\s\S]`
   (voir `M1`).
2. Vérifier l'unicité **sans rien exécuter** :
   ```
   npm run qa:mutations -- --liste
   ```
   Cette commande contrôle chaque ancrage et sort en 1 si l'un a rouillé. Une seconde.
3. Mesurer la recette seule :
   ```
   npm run qa:mutations -- --seulement=M27
   ```
   Un banc partiel écrit `mutations-partiel.json` et **ne touche pas** au rapport de référence.
4. Inscrire le verdict MESURÉ dans `attendu`. Si c'est `SURVIT`, écrire `pourquoi` — un
   survivant sans justification est un trou de QA maquillé en décision.

---

## Le détecteur de tests trompeurs

Six détecteurs, deux gravités :

| code | ce qu'il attrape | gravité |
|---|---|---|
| `TEST-DESACTIVE` | `.skip` / `.only` / `.todo` / `.fixme` | **bloquant** |
| `FICHIER-SANS-ASSERTION` | un fichier de test sans une seule assertion | **bloquant** |
| `CAS-SANS-ASSERTION` | un `it(...)` qui n'assert rien, ni directement ni par une aide du fichier | **bloquant** |
| `FRACTION-NON-ASSERTEE` | on imprime « X sur Y » et rien ne relie X à Y | avertissement |
| `CHIFFRE-JAMAIS-ASSERTE` | un chiffre imprimé qui n'entre dans aucune assertion du cas | avertissement |
| `ASSERTION-TAUTOLOGIQUE` | le sujet de l'assertion est aussi son attendu | avertissement |
| `MESSAGE-QUI-SURPROMET` | le message affirme une propriété que le matcher ne mesure pas (D48) | avertissement |

**Bloquants : tolérance zéro.** Avertissements : un **plafond gelé**, mesuré, qui ne descend
qu'à la main. Le détecteur imprime lui-même la valeur à laquelle resserrer le plafond dès
qu'il mesure moins.

### Les faux positifs qu'il a fallu payer, et qu'il ne faut pas réintroduire

Ce détecteur a rendu **33 bloquants** à son premier jet, tous faux. Un détecteur qui crie faux
se fait désactiver, ce qui est pire que pas de détecteur. Les cinq causes, toutes mesurées :

1. **`it.each(table)(…)`** — la parenthèse à équilibrer est la **dernière** du motif, pas la
   première ; sinon le corps du cas n'est jamais lu.
2. **`.test(f)` d'une expression régulière** lu comme un cas — d'où le `(?<![.\w$])`.
3. **`fc.assert(fc.property(…))`** de fast-check est une assertion, même sans `expect`.
4. **Une aide locale qui assert pour le cas** (`function refuse(…) { … expect(…) }`) : on
   énumère les FONCTIONS qui assertent, pas les occurrences du mot `expect` (D48).
5. **`test.slow()`, `test.describe(…)`, `test.beforeEach(…)`** ne sont pas des cas : un cas a un
   corps (`=>` ou `function`) et son suffixe appartient à une liste blanche.

---

## Prouver que ces outils peuvent échouer

Un garde qu'on n'a jamais vu se déclencher n'a pas fait ses preuves. Les trois chemins :

```
# 1. le banc — un jeu de recettes de preuve, sans toucher aux recettes gelées
npm run qa:mutations -- --recettes=<chemin>/recettes-de-preuve.mjs
#    P1  mutation attendue DETECTEE dont le remplacement est inerte  → ROUGE « a SURVÉCU »
#    P2  ancrage inexistant                                          → ROUGE « ancrage perdu »
#    PN1 contrôle négatif qui casse vraiment                         → ROUGE « mesure non opposable »

# 2. le détecteur — poser un fichier de test qui porte les deux défauts, puis le supprimer
#    un `it()` sans expect + un `it.skip()`                          → ROUGE, 2 bloquants

# 3. le tableau de bord — le pointer sur un dossier vide
npm run qa:tableau -- --racine=<un dossier vide>                     → ROUGE, 4 populations nulles
```

---

## Auditer une régression responsive vue sur un appareil réel

Une capture laide peut rester verte si la sonde ne mesure que « aucun bouton coupé ». Reproduire
alors les **trois dimensions de l'état réel**, pas seulement la largeur de l'écran :

1. le viewport CSS utile, barres du navigateur déjà retranchées ;
2. l'orientation ;
3. les réglages de lecture du profil (`corpsPx`, interlettrage et interligne).

Écrire d'abord un cas ciblé dans `tests/qualite/responsive-tous-ecrans.spec.ts` et constater le
rouge sur l'ancien rendu. Les assertions doivent nommer la composition attendue : zones qui ne se
recouvrent pas, largeur minimale du texte, proportion maximale d'un réceptacle, absence de
sous-scroll indésirable. Une simple assertion de visibilité ou de débordement de page ne prouve
pas cela.

Après correction : cas ciblé, puis `npm run test:responsive`. Cette campagne reste la boucle
courte ; `npm run verifier` ne vient qu'à la clôture du lot. Si le nouveau garde ne rougit jamais
sur l'ancien rendu, il n'explique pas la photo et ne doit pas être présenté comme sa régression.

Le balayage de toutes les recettes ne suffit toujours pas : il prouve l'atteignabilité, pas que
chaque famille de jeu garde sa composition. Maintenir une table de sondes indexée par moteur,
comparer exactement ses clés à l'union déclarée dans le code, puis ouvrir au moins un nœud de
chaque moteur avec le profil réel. Un moteur ajouté sans sonde doit faire rougir l'inventaire.

---

## Ce que le banc ne mesure PAS, et qu'il ne faut pas taire

**Les E2E ne sont pas un étage de ce banc.** `playwright.config.ts` sert
`node serveur/dist/index.js` : les parcours exigent un build, et la compilation appartient à
l'orchestrateur (D10). Les recettes couvertes en E2E portent le champ `assertionE2E`, qui
**nomme le fichier et l'assertion**. C'est plus faible qu'une exécution, et c'est écrit comme
tel partout où le chiffre apparaît.

Trois étages tournent, dans cet ordre, et le premier qui rougit tranche :
`vitest` (unitaires + composants + api) → `test:contenu` → `test:rejeu`. Aucun n'exige de
compilation : `test:rejeu` charge `partage/src` par `tsx`, `test:contenu` est un script Node.
