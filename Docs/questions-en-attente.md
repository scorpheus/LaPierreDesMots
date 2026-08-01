# Questions de design en attente

Ce fichier est le SEUL du dépôt où plusieurs lots écrivent. Règle (contrat des features
v2 § 9) : **on ajoute toujours à la fin, on ne réécrit jamais le contenu existant.**

Chaque section porte le lot qui l'a écrite, la question, le défaut retenu et implanté, et
l'endroit exact où le changer.


---

## L2-H — dashboard parent (2026-08-01)

### H1. Comment le code du foyer est-il POSÉ la première fois ?

**Défaut retenu et implanté : la première ouverture réussie pose le code.**
`POST /api/parent/ouvrir` avec un code à 4 chiffres, sur une base où `code_parent` est vide,
enregistre ce code et ouvre la zone.

*Pourquoi ce défaut.* La v2 § 11 décrit la protection (« code à 4 chiffres, `scrypt`,
verrouillage après 5 échecs ») mais jamais la pose du code, et le contrat gelé § 5.3 n'accorde
que quatre routes parent — aucune « définir le code ». Inventer une cinquième route sortirait du
contrat ; livrer une zone inatteignable serait pire. Le verrou couvre le risque : un enfant qui
tape au hasard ferme la zone pour un quart d'heure avant d'avoir pu poser quoi que ce soit
d'utile, et le parent, lui, sait qu'il pose son code.

*Où le changer.* `serveur/src/routes/parent.ts`, branche `stocke === null`. L'écran
`client/src/ecrans/EcranCodeParent.tsx` l'annonce en toutes lettres au parent.

*Ce qui n'est pas tranché.* Faut-il, à la place, un écran de première configuration ? Et
faut-il pouvoir CHANGER le code ensuite ? `ecrireCodeParent` sait déjà remplacer ; aucune route
ne l'appelle pour l'instant.

### H2. Durée de vie du jeton de session parent

**Défaut retenu : 30 minutes** (`DUREE_JETON_MS`, `serveur/src/routes/parent.ts`).

Assez pour lire le dashboard et lancer les exports, assez peu pour qu'un onglet oublié sur la
tablette de l'enfant ne laisse pas la zone ouverte. Le jeton vit en **mémoire du processus** :
redémarrer la Pierre referme la zone. C'est voulu — une session qui survivrait au redémarrage
serait une session que personne n'a choisi d'ouvrir.

Distinct de **Q6** (durée du verrou après 5 échecs, 15 minutes), qui était déjà tranchée par le
contrat gelé et n'est pas rouverte ici.

### H3. Écart au-delà duquel une région est « coloriée mais fragile »

**Défaut retenu : 25 points** (`ECART_ALERTE_COUVERTURE`, `partage/src/parent/indicateurs.ts`).

Une région dont le taux de recoloration dépasse la maîtrise moyenne de plus de 0,25 lève le
drapeau. Aucune source ne donne ce seuil ; il a été choisi pour que le drapeau reste **rare**,
donc lisible. Trop bas, il s'allumerait partout et ne dirait plus rien.

*Réversible sans code* : l'argument `ecartAlerte` de `croiserCouverture` est déjà paramétrable
appel par appel ; seule la valeur par défaut est à changer. Si le seuil doit vivre en données
(convention C2), il rejoindra `contenu/referentiel/parametres-*.json` — il n'y est pas allé
parce que ce n'est ni une valeur pédagogique, ni un seuil de récompense, ni un délai d'aide :
c'est un seuil d'affichage.

### H4. Séparateur décimal des exports CSV

**Défaut retenu : virgule décimale** pour les nombres non entiers
(`serveur/src/services/export-csv.ts`, fonction `cellule`).

Le contrat impose le séparateur de colonnes `;` et le BOM UTF-8 « pour Excel FR ». La virgule
décimale suit la même intention : avec un point, `0.42` est du texte pour l'Excel français et
aucune somme ne fonctionne. Les entiers ne sont pas touchés.

*Le risque assumé* : un tableur configuré en anglais lira ces nombres comme du texte. Si le
foyer utilise LibreOffice en anglais, c'est cette ligne-là qu'on change.

### H5. Où persister les réglages de confort du parent (volumes, animations calmes) ?

**Défaut retenu : `localStorage`, sur l'appareil du parent**
(`client/src/parent/ReglagesParent.tsx`, clé `pierre.reglages-parent`).

Le contrat gelé § 5.3 n'accorde aucune route pour ces trois réglages, et en inventer une
sortirait du contrat. Rien de pédagogique n'y est écrit : ce sont des préférences de confort,
qui n'entrent dans aucun rejeu et dont la perte ne coûte rien. Le jour où une route existe,
seul ce fichier bouge.

*Conséquence à connaître* : ces réglages ne suivent pas le profil d'un appareil à l'autre.

### H6. La région d'une compétence n'existe nulle part en base

**Défaut retenu : elle se déduit du nœud** où la compétence a été travaillée, par la convention
de nommage de `contenu/noeuds/` (`clairiere-01`, `marais-jumeau-03`) — voir `regionDuNoeud`
dans `serveur/src/services/indicateurs.ts`. Un nœud dont l'identifiant ne commence par aucune
des six régions est **ignoré** plutôt que rangé au hasard : une carte de couverture fausse est
pire qu'une carte incomplète.

*Ce qui la rend réversible* : `contenu/monde/regions.json` (L2-F) porte le mapping
région → compétences. Le jour où il est chargé au serveur, `couvertureDuProfil` le lit et cette
déduction disparaît. C'est un point où le contrat gelé ne dit rien, signalé au rapport.

---

## Lot L2-G — ingestion des 105 fiches (F7)

Quatre questions tranchées par défaut, marquées dans le code, à valider.

### QG1 — Le manifeste ne peut pas à la fois « porter l'écart » et rester identique au bit près

*Défaut retenu* : les deux comptes (`fichesIngerees`, `fichesRefusees`) restent des champs du
manifeste ; l'**écart** n'en est pas un. Il est calculé par `scripts/ingestion/manifeste.py`,
imprimé, et il **conditionne l'écriture** — `ecrire_manifeste` lève `ComptabiliteOuverte` et
n'écrit aucun manifeste si l'égalité est fausse.

*Pourquoi* : le contrat features v2 § 3.7 demande deux choses qui se heurtent. « Le manifeste
porte les deux comptes et leur écart (C4) » et « **le manifeste du niveau 1 doit rester
identique au bit près** après refactorisation », cette seconde exigence étant le chiffre du lot
au § 10.4. Ajouter un champ `ecart` casse la seconde, qui est la plus forte et la seule
mécaniquement vérifiable. Un champ qui vaudrait toujours 0 serait par ailleurs exactement le
« détecteur qui déclare un poids qu'il n'applique jamais » que CLAUDE.md met en garde ; refuser
d'écrire l'applique.

*Ce qui la rend réversible* : ajouter `"ecart": 0` à `manifeste.composer()` est une ligne, et
il faudra alors régénérer `tests/fixtures/ingestion/manifeste-niveau-1.json` — geste qui doit
être **explicitement validé**, jamais pris à l'initiative d'un agent (annexe T § 6).

### QG2 — L'empreinte sha256 de potrace n'est pas épinglée

*Défaut retenu* : l'entrée `potrace` de `scripts/telecharger-outils.mjs` porte son URL
officielle (`potrace-1.16.win64.zip`) mais `empreinte: null`, et le drapeau `optionnel: true`.
Tant que l'empreinte est nulle, `npm run preparer` **saute l'outil bruyamment** et sort en 0 ;
`scripts/ingestion/vectoriser.py` refuse alors en nommant un défaut d'**environnement**
(contrat § 2.2), jamais un défaut de code.

*Pourquoi* : inventer une empreinte serait produire du faux, et exécuter un binaire non vérifié
est précisément ce que ce fichier refusait déjà. Le geste d'épinglage a été ajouté et il est
explicite : `npm run preparer -- --epingler potrace` télécharge, n'installe rien, et imprime le
sha256 à recopier après comparaison avec la somme publiée par l'éditeur.

*Ce qui la rend réversible* : une ligne à renseigner. Aucun autre fichier ne bouge.

### QG3 — Le niveau 5 porte DEUX exercices, le contrat n'en nomme qu'un

*Défaut retenu* : les deux sont extraits, dans deux champs distincts — `etapes` (le
« Numérote de 1 à 5 » que le contrat retient, moteur `chrono`) et `reperages` (le
« Cherche et colorie la réponse dans le texte », 5 questions appariées chacune à une couleur).

*Pourquoi* : mesuré sur les 15 pages de `NIVEAU 5.pdf`, les deux en-têtes sont présents sur
15/15, et chacun porte 5 items. N'extraire que l'ordre jetterait 75 questions de repérage.
Le contrat ne les interdit pas, il ne les avait pas vues.

*Ce qui la rend réversible* : `reperages` est un champ à part, ignorable par qui ne veut que
`chrono`. Aucun moteur n'est encore associé au repérage colorié.

### QG4 — Les fixtures d'ingestion embarquent du texte tiers dans le dépôt suivi

*Défaut retenu* : `tests/fixtures/ingestion/brouillon-niveau-2.json` et
`brouillon-niveau-5.json` sont de **vraies** sorties de la chaîne, texte des fiches compris —
deux fiches sur 105.

*Pourquoi* : une fixture réécrite à la main cesse d'être une sortie de la chaîne et dérive
silencieusement ; c'est le contraire de ce que le contrat demande d'elle. `contenu/brouillons/`
est ignoré par git, mais `tests/fixtures/` ne l'est pas.

*Ce qui la rend réversible* : `Docs/fiches-origine-analyse.md` § 5, F5 note que ces
illustrations et ces textes sont du matériel tiers à usage familial privé — « sans objet en
pratique », mais « à noter si le projet devait sortir du foyer ». Si c'était le cas, les deux
fixtures se réduisent à leur structure, et seul le test de schéma en dépend.

---

## Lot L2-B — typographie et réglages de lecture (F2)

Ajouté par L2-B. Les questions Q1 et Q2 du contrat des features v2 § 9 sont déjà tranchées par
défaut dans ce contrat ; on ne les recopie pas. Les cinq ci-dessous sont **nouvelles**, elles
ont toutes reçu un défaut raisonnable marqué `PLACEHOLDER` dans le code, et aucune n'a bloqué.

### B1. La teinte de la syllabe alternée

*Où* : `client/src/styles/polices.css`, variable `--lecture-syllabe-alternee`.

*Défaut retenu* : `var(--lagon)`, appliqué aux seules syllabes de rang impair — le rang pair
garde l'encre de lecture. Deux teintes, jamais plus, et surtout jamais de rouge : la coloration
syllabique est un appui de déchiffrage, pas une correction.

*Pourquoi ce défaut* : le lagon est le seul jeton froid de la palette v2 § 9.2 et il n'est
associé à aucun refus dans tout le jeu. Colorer les DEUX rangs rendrait le texte bicolore et se
lirait moins bien qu'une seule encre — l'alternance doit se voir, pas s'imposer.

*Ce qui la rend réversible* : une variable CSS, dans un seul fichier. Aucune ligne de code.

### B2. Le texte de l'aperçu des réglages

*Où* : `client/src/lecture/ApercuReglages.tsx`, constante `TEXTE_APERCU`.

*Défaut retenu* : « Le petit dragon boit / de la belle eau du puits. »

*Pourquoi ce défaut* : vocabulaire CE1, deux lignes pour que l'interligne se voie, et les quatre
lettres miroir `b`, `d`, `p`, `q` — ce sont elles qu'il confond (D18, D23), et c'est sur elles
qu'un réglage d'espacement doit se juger. Ces trois contraintes, elles, ne sont pas des
placeholders. Seul le texte l'est.

*Ce qui la rend réversible* : une constante exportée ; `ApercuReglages` accepte déjà une
propriété `texte` qui l'écrase.

### B3. Nombre de mesures avant de nommer un bras favorable

*Où* : `partage/src/lecture/essai-typographie.ts`, `TENTATIVES_MIN_PAR_BRAS = 20`.

*Défaut retenu* : 20 tentatives par bras, soit une quarantaine d'items en tout.

*Pourquoi ce défaut* : à quelques items par session, cela fait « quelques semaines », qui est
l'ordre de grandeur que D19 annonce lui-même. La valeur n'a aucun effet sur la mesure : elle ne
décide que du moment où l'on ose nommer un gagnant.

*Ce qui la rend réversible* : une constante exportée, couverte par table dans
`tests/unitaires/essai-typographie.test.ts`. En dessous du seuil, `brasFavorable` vaut `null` —
et c'est cette prudence-là qui compte, pas le nombre exact.

### B4. Les bornes des trois réglages que la v2 ne chiffre pas

*Où* : `partage/src/lecture/defauts.ts`, `BORNES_REGLAGES`.

*Défaut retenu* : interlettrage `0 → 0.15 em` (pas 0.01), espacement des mots `0 → 0.5 em`
(pas 0.02), interligne `1.2 → 2.4` (pas 0.1). Seul le corps, `16 → 40 px`, est cité par la
v2 § 9.3 et n'est donc **pas** une question ouverte.

*Pourquoi ces défauts* : le repère haut de l'interlettrage vient de Zorzi 2012 — +2,5 pt au
corps 24 vaut ≈ +0,10 em — et on laisse une marge au-dessus plutôt que de plafonner sur la
mesure d'une seule étude. La valeur de départ de l'espacement des mots, `0.08 em`, est celle que
`global.css` du socle v1 appliquait déjà : reprise, pas réinventée.

*Ce qui la rend réversible* : quatre objets littéraux dans un seul fichier, et une propriété
`fast-check` qui vérifie que toute valeur reste dans ses bornes quelles que soient les bornes.

### B5. Où vivent réellement les réglages de lecture : code ou données ?

*Où* : `partage/src/lecture/defauts.ts`, en-tête du fichier.

*Le point* : la convention C2 du contrat des features interdit toute valeur pédagogique en dur.
`BORNES_REGLAGES` et `REGLAGES_PAR_DEFAUT` sont pourtant des constantes TypeScript, et non un
`contenu/referentiel/parametres-*.json`.

*Ce qui a été décidé, et pourquoi* : C2 vise ce qui sera **recalibré par la mesure du jeu** et
doit rester lisible par le rejeu T2. Les réglages de lecture ne sont pas de cette famille : ils
vivent **par profil, en base** (`reglages_lecture`, migration 002), et c'est la base qui fait foi
dès qu'un profil existe. Ce qui est dans le code n'est que le point de départ d'un profil neuf et
les bornes de l'interface — l'équivalent typographique d'un `min`/`max` de curseur. Le protocole
A/B de D19 déplace la valeur **en base**, jamais dans le fichier.

*Ce qui la rend réversible* : si l'arbitrage devait être l'inverse, un seul fichier est à
changer, et sa surface publique — `REGLAGES_PAR_DEFAUT`, `BORNES_REGLAGES` — ne bougerait pas.

---

## Lot L2-C — moteurs `place` et `trace` (F3)

Ajouté le 2026-08-01. Chaque question ci-dessous est **déjà tranchée par un défaut**
implanté et marqué `PLACEHOLDER` dans le code ; aucune n'a bloqué le lot.

### C-Q1 — Le seuil de couverture d'un tracé de lettre

*Défaut retenu* : `COUVERTURE_MINIMALE = 0.8` (Q7 du contrat gelé, reprise telle quelle),
dans `partage/src/moteurs/trace/validation.ts`.

*Ce qui la rend réversible* : c'est une constante exportée, lue par un seul site d'appel. Elle
est à régler **sur l'enfant**, pas sur une moyenne — un enfant qui trace large échouerait à
80 % là où 65 % suffiraient à prouver qu'il a compris l'orientation.

### C-Q2 — La largeur de rendu de la zone de tracé, dont dépend la tolérance R16

*Défaut retenu* : `LARGEUR_RENDU_PX = 420`, dans le même fichier, miroir du
`min(100%, 420px)` de `client/src/moteurs/trace/MoteurTrace.tsx`.

*Pourquoi c'est une question et pas un détail* : les 24 px de R16 valent 24 px **à l'écran**,
pas 24 unités de dessin. Mesuré : appliqués bruts au `viewBox` `0 0 100 160`, le rond du `d`
couvre celui du `b` à **0,89** — au-dessus du seuil de validation. `toleranceViewBox` fait la
conversion en un point unique, et `tests/unitaires/trace-validation.test.ts` garde la
régression. Si la zone de tracé change de taille sur la tablette réelle, **cette constante
doit changer avec elle**.

### C-Q3 — Le pas de rééchantillonnage du geste

*Défaut retenu* : `PAS_ECHANTILLONNAGE = 5` unités `viewBox`, dans
`client/src/moteurs/trace/echantillonnage.ts` — soit environ un échantillon de geste entre
deux points de modèle.

*Ce qui la rend réversible* : la fonction prend le pas en paramètre ; seule la constante par
défaut serait à revoir, après mesure sur la Galaxy Tab S10 FE.

### C-Q4 — L'axe de risque des quatre lettres miroir

*Défaut retenu* : dans `contenu/modeles-lettres/minuscules.json`, `b`, `d`, `p` et `q`
portent `axeRisque: "gauche-droite"` — l'axe des paires `b`/`d` et `p`/`q`. **Chaque exercice
surcharge ce champ par l'axe qu'il travaille** : `miroir-bp-01.json` met `haut-bas` sur ses
deux lettres.

*Pourquoi ce n'est pas un choix libre* : D23 impose une paire, donc un axe, par exercice. Une
lettre ne peut porter qu'un seul `axeRisque` alors qu'un `b` risque les deux ; la
bibliothèque nomme donc le plus fréquent et l'exercice tranche. Si `ModeleLettre.axeRisque`
devenait une liste, ce champ disparaîtrait des exercices — c'est la seule évolution qui
supprimerait la surcharge.

### C-Q5 — DEMANDE À L2-D : deux codes de compétence pour les confusions miroir

Ce n'est pas une question de design, c'est une **dépendance** — consignée ici faute d'un
autre canal entre lots.

`ConfusionObservee.competence` est obligatoire (§ 4.4), et un moteur n'a **aucun accès** aux
compétences de son exercice : elles vivent dans l'enveloppe, jamais dans `jeu.contenu`.
`moteurTrace` dérive donc le code de l'axe :

- `gph.miroir.gauche-droite`
- `gph.miroir.haut-bas`

Ces deux codes sont exactement la clé d'agrégation dont le top 10 du dashboard a besoin
(D23, L2-H). **L2-D possède `contenu/referentiel/competences.json`** (objet protégé, annexe
P § 6.4 : on ajoute, on ne renomme pas). Tant qu'ils n'y sont pas, ils restent des clés
d'agrégation valides mais sans libellé pour le parent.

Conséquence assumée en attendant : les deux exercices `trace` de ce lot déclarent
`comp.consigne.simple`, une compétence **existante**, plutôt qu'un code inventé qui ferait
échouer le contrôle 5 de `test:contenu`. Le jour où les deux codes ci-dessus existent, les
deux fichiers d'exercice sont à mettre à jour.

---

# Lot L2-A — game feel et récompenses (F1)

Ajouté le 2026-08-01. Chaque question ci-dessous a été **tranchée par un défaut**, marquée
`PLACEHOLDER` dans le code, et le travail a continué. Aucune n'a bloqué.

## QA-1. Que montre la jauge du palier `etoile` ?

*Ce qui est certain* : D25 point 3 exige que **toute** jauge de palier montre le reste à
parcourir, et le contrat gelé impose « toujours les trois jauges, toujours dans l'ordre
`etoile`, `intermediaire`, `rare` ». D25 ne décrit pourtant que **deux** jauges — « trois
étoiles sur cinq » et « sept tampons sur dix ». La troisième, celle du palier fréquent, n'a
pas de contenu naturel : on ne gagne pas une fraction d'étoile.

*Défaut retenu* : lecture **uniforme** des trois jauges — « combien reste-t-il avant la
prochaine récompense de ce palier, et en quelle monnaie ». Pour `etoile`, la monnaie est le
nœud terminé : `requis = 1`, `acquis = 0`, `restant = 1`. La jauge est donc constante, et elle
dit une chose vraie et utile : *la prochaine étoile est à un exercice*.

*Où* : `partage/src/recompenses/cascade.ts`, fonction `jaugesDe`.
*Ce qui la rend réversible* : `jaugesDe` est une fonction pure de six lignes, et
`JaugePalier.acquis` / `requis` / `restant` ne changeraient pas de forme. Une autre lecture —
par exemple « étoiles gagnées au total » — se substitue sans toucher un seul appelant.

## QA-2. Qui NOMME la récompense d'un palier intermédiaire ou rare ?

*Ce qui est certain* : D25 dit **ce que rapporte** chaque palier (forme de Gobi, objet de
campement, zone recoloriée), et `RecompenseObtenue` porte les champs `reference`, `asset` et
`region` pour le dire.

*Défaut retenu* : `appliquerEtoiles` rend ces trois champs à `null`. La cascade dit *qu'*une
récompense est due et *de quelle nature* ; elle ne choisit pas **laquelle**. Choisir la forme
de Gobi ou la zone à rallumer suppose l'état du monde (`@pierre/partage/monde`, lot L2-F), que
la cascade n'a pas et ne doit pas avoir — sans quoi une fonction pure de six lignes tirerait
tout le monde derrière elle.

*Où* : `partage/src/recompenses/cascade.ts`, commentaire de `appliquerEtoiles`.
*Ce qui la rend réversible* : les trois champs existent déjà dans le type. Le jour où L2-F
expose `prochaineFormeGobi(etat)`, c'est l'appelant — le magasin, ou une route serveur — qui
les remplit, sans que la signature de `appliquerEtoiles` bouge.

## QA-3. Durée des vibrations `palier-franchi` et `apparition`

*Ce qui est certain* : D26 fixe **20 ms** pour le dépôt correct, et rien d'autre.

*Défaut retenu* : `palier-franchi` → `[20, 40, 30]` (deux impulsions, pour que le palier se
distingue du dépôt) ; `apparition` → `[12]` (plus court encore : c'est une annonce, pas un
geste). Toutes restent sous 50 ms par impulsion — au-delà, une tablette posée sur une table
fait du bruit, et le bruit réveille la maison avant de récompenser l'enfant.

*Où* : `client/src/gamefeel/haptique-navigateur.ts`, constante `MOTIFS`.
*Ce qui la rend réversible* : une table de trois lignes. À régler **sur la tablette réelle**,
pas sur une moyenne — c'est exactement le genre de valeur qui ne se décide pas au clavier.

## QA-4. Combien de particules par bonne réponse, et selon quoi ?

*Ce qui est certain* : **14 au maximum** (v2 § 8). Rien sur le minimum ni sur la progression.

*Défaut retenu* : `6 + 2 × (série − 1)`, écrêté à 14. La gerbe grossit avec la série, comme la
hauteur du son monte : c'est la même idée, sur le canal visuel. Mesuré :
`tests/unitaires/gamefeel-serie.test.ts` vérifie que la première gerbe est strictement sous la
borne et que le pic l'atteint sans jamais la dépasser, sur une série de 200.

*Où* : `client/src/gamefeel/retour.ts`, fonction `nombreDeParticules`.

## QA-5. Les phrases de la cascade

*Ce qui est certain* : aucune formulation ne compare, ne juge ni ne regrette (R14).

*Défaut retenu* : « Une étoile de plus ! », « Un cadeau spécial ! », « Une zone du monde se
rallume ! », et pour les jauges « Encore N avant la prochaine … ». Elles disent **le reste**,
jamais le score — c'est la phrase de D25, pas une paraphrase.

*Où* : `client/src/composants/CascadeRecompense.tsx` (`ANNONCE`, `NATURE_DITE`) et
`client/src/composants/JaugePalier.tsx`.
*Ce qui la rend réversible* : deux tables de trois et quatre entrées. À relire avec le parent,
et à confronter à la couverture lexicale CE1 (règle non négociable de CLAUDE.md) avant que
l'enfant ne les voie.

## QA-6. Au-delà de combien de cases une jauge passe-t-elle en barre continue ?

*Ce qui est certain* : rien. D25 dit seulement « voir la case suivante vide ».

*Défaut retenu* : **12**. Dix cases se lisent d'un coup d'œil, trente non — et la jauge du
palier rare en demande dix aujourd'hui, ce qui tient. Au-delà, la jauge devient une barre, qui
montre le même vide sans le compter.

*Où* : `client/src/composants/JaugePalier.tsx`, constante `CASES_MAX`.

---

## Lot L2-F — carte, campement, Gobi (F6)

Cinq questions tranchées par un défaut, marquées `PLACEHOLDER` dans le code ou la donnée.
Aucune ne bloque, et aucune ne demande une ligne de code pour changer d'avis.

### F6-Q1 — À quelle région chaque compagnon est-il rattaché ?

**Ce que disent les sources.** La v2 § 4.3 nomme quatre compagnons et dit « chacun est
rencontré au bout d'une région », avec pour chacun une **valeur** et un **domaine**. La v2
§ 3.3 nomme **six** régions. Aucun document du corpus n'apparie les deux listes, et six ne se
divise pas par quatre.

**Défaut retenu**, par le seul critère écrit — le domaine :

| Compagnon | Domaine (v2 § 4.3) | Région retenue | Domaine de la région (v2 § 3.3) |
|---|---|---|---|
| Filou | Mots outils, vitesse de reconnaissance | **La Clairière** | premiers mots outils |
| Roc | Encodage, orthographe | **Les Galeries** | CVC, confusions `b/d/p/q` |
| Plume | Phrases, fluence | **La Forêt Muette** | pluriels, liaisons |
| Bulle | Compréhension, récits | **La Cité des Histoires** | textes, inférences |

Le **Marais Jumeau** et le **Volcan** n'ont donc pas de compagnon. C'est le choix le moins
inventif : plutôt que d'attribuer deux compagnons à deux régions dont le domaine ne leur
correspond pas, on laisse deux régions sans rencontre, ce qui est un manque VISIBLE et donc
corrigeable, là où un mauvais appariement serait invisible.

**Ce qui la rend réversible.** L'appariement vit dans `contenu/monde/compagnons.json`, champ
`region`. `EtatRegion.compagnon` en est dérivé. Changer une ligne de JSON suffit ; aucune ligne
de code ne cite un couple compagnon–région.

### F6-Q2 — Que signifie exactement « deux régions en parallèle dès la troisième » ?

**Ce que dit la source.** v2 § 3.3 : « Les régions s'ouvrent dans l'ordre, mais deux régions
restent ouvertes en parallèle **dès la troisième** : l'enfant choisit où aller. » Deux lectures
sont possibles, et elles ne produisent pas le même jeu :

- **A** — on n'ouvre la troisième que lorsque la deuxième est terminée ; à partir de là, deux
  régions sont ouvertes à la fois ;
- **B** — la troisième s'ouvre dès que la deuxième est ouverte ; à partir de là, l'enfant a
  toujours deux destinations.

**Défaut retenu : B.** Motif : la phrase donne sa raison d'être — « l'enfant choisit où aller ».
En lecture A, le choix n'apparaît qu'après avoir terminé DEUX régions entières, soit
vingt-quatre nœuds ; en lecture B, il apparaît dès la deuxième. La lecture B honore l'intention
plus tôt, sans jamais ouvrir une région dont les prérequis phonologiques ne sont pas vus, car
l'ordre d'ouverture reste strictement celui de la progression.

**Ce qui la rend réversible.** Une seule fonction, `ouvrirCeQuiDoitLEtre`
(`partage/src/monde/carte.ts`), décide ; `tests/unitaires/carte.test.ts` la couvre. Le nombre
de régions simultanées est en outre une donnée : `ouvertesEnParallele` dans
`contenu/monde/regions.json`.

### F6-Q3 — D'où viennent les « mots maîtrisés » du mur des noms ?

**Ce que dit la source.** v2 § 3.4 : « le mur des noms (mots maîtrisés, chacun rejouable en un
tap) ». Le seul acquis lexical journalisé à ce jour est le **graphème** (`formes_gobi`) ; la
maîtrise par ITEM appartient au Leitner de L2-D et n'est pas exposée par une route du § 5.3.

**Défaut retenu.** Le mur affiche les **formes de Gobi**, c'est-à-dire les graphèmes acquis. Ils
sont rejouables en un tap — le tap les fait dire par `FournisseurVoix` — et **aucun n'est jamais
retiré**, ce qui est la seule propriété non négociable de cet objet (R14).

**Ce qui la rend réversible.** `MurDesNoms` prend une liste `NomDuMur` ; `EcranCampement` la
construit. Brancher `GET /api/profils/:id/revisions` à la place ne touche que ce point de
construction.

### F6-Q4 — Que fait le chaudron tant qu'aucun exercice `libre` n'existe ?

**Ce que disent les sources.** Le chaudron est « la sortie de secours à un tap, sans
culpabilité » (v2 § 5.4) et D15 lui réserve le geste de frottement. Les trois habillages `libre`
du campement appartiennent à L2-E ; **aucun exercice `libre` n'est livré** par cette campagne, et
le contrat des features v2 § 3.6 n'en attribue aucun à L2-F.

**Défaut retenu.** Le bouton existe et est toujours tapable. Sans rappel `surOuvrir`, il répond
par une phrase calme — « Le chaudron mijote encore. Reviens le voir bientôt. » — dite à voix
haute. **Jamais un écran d'erreur, jamais un bouton grisé** : un bouton désactivé se lit comme
un verrou, et il n'y a rien à verrouiller ici.

**Ce qui la rend réversible.** Une propriété optionnelle, `surOuvrir`. Le jour où un nœud
`libre` existe, on la passe et rien d'autre ne bouge.

### F6-Q5 — Toute la forme de Gobi et des compagnons reste NON VALIDÉE

Reprise de la question Q9 du contrat des features v2 § 9, et étendue aux compagnons.

D7 et D31 (étape A) sont formels : choisir **une** image canonique n'est pas automatisable,
c'est une validation humaine. Les onze SVG livrés par ce lot — cinq stades, le cristal de base,
le décor du campement, le décor de la carte — sont donc des **bouchons écrits à la main** (D2),
régions fermées par construction, chacun portant son `<desc>` `PLACEHOLDER`. Ils deviennent le
cas de test permanent de la vraie chaîne, exactement comme le prévoit D2.

Deux choix de forme y sont pris, et ils suivent le journal plutôt que la fiche de personnage :

- **Gobi a deux bras courts** (D24), alors que `Docs/fiche-personnage-gobi.md` § 2 déclare
  « Bras : Aucun ». Le journal fait foi (CLAUDE.md, règle 11) ; la fiche est antérieure et n'est
  pas modifiée par ce lot.
- **Les personnages sont en COULEUR** (D29) : le trait noir sur blanc ne vaut que pour les
  décors coloriables, et Gobi ne se recolorie jamais.

---

## Lot L2-D — pédagogie (BKT, Leitner, sélecteur)

Ajouté le 2026-08-01. Questions tranchées **par un défaut raisonnable**, implantées, marquées dans
le code, et qui restent à valider. Aucune n'a bloqué le lot.

### D-Q1. Qu'est-ce qu'une étape « réussie » pour le BKT ?

**Défaut retenu : `nbErreurs === 0`.** — `partage/src/pedagogie/` n'en décide pas ; c'est
`serveur/src/depots/tentatives.ts` (`alimenterPedagogie`) et
`serveur/src/depots/maitrise.ts` (`observationDeLEtape`) qui le fixent.

`ResumeTentative.reussi` vaut **toujours** `true` — c'est R14, aucun écran d'échec, toute session
finit sur une réussite. Le prendre pour le BKT ferait monter `p` à chaque passage quoi qu'il
arrive : le BKT deviendrait un compteur de tentatives déguisé, c'est-à-dire le « détecteur qui
déclare un poids qu'il n'applique jamais ». D'où : est réussie une étape **aboutie du premier
coup**. Aucun document ne tranche ce point ; il commande pourtant toute la courbe de maîtrise.

*Variante possible* : compter réussie une étape à `nbErreurs <= 1` (le premier essai de D16 est
une exploration, pas une erreur de lecture). À décider sur les données réelles.

### D-Q2. Le Leitner promeut-il au délai de la boîte de départ ou d'arrivée ?

**Défaut retenu : la boîte d'ARRIVÉE.** — `partage/src/pedagogie/leitner.ts`, `promouvoir`.

La v2 § 12.2 donne les cinq délais sans dire lequel s'applique après une promotion. Réussir en
boîte 1 fait donc revenir l'item à J+3 (délai de la boîte 2), pas à J+1. C'est la lecture
classique d'un système espacé — sinon la boîte 5 ne servirait jamais son délai de 35 jours.

### D-Q3. Un item Leitner tout neuf est-il dû immédiatement ?

**Défaut retenu : oui.** — `itemLeitnerInitial` pose `echeanceLe = maintenant`.

La signature gelée au contrat ne reçoit aucun paramètre, donc aucun délai n'y est disponible. Le
comportement est aussi le bon : différer la première révision d'un item qu'on vient de rencontrer
perdrait la seule occasion où il est encore frais.

### D-Q4. Une révision réussie AVEC l'aide de Gobi promeut-elle ?

**Défaut retenu : non.** — `revueReussie` dans `serveur/src/depots/leitner.ts` exige
`reussi && aideUtilisee === 'aucune'`.

Un item retrouvé grâce à Gobi n'est pas mémorisé ; le réespacer comme une réussite le ferait
revenir trop tard. **Ce n'est pas une punition** : l'aide reste gratuite en étoiles (R15), elle
informe la pédagogie sans coûter à l'enfant. À vérifier sur les données : si l'enfant demande
l'aide très souvent, cette règle bloquerait ses items en boîte 1.

### D-Q5. `nbTentativesFaibleDevinette` compte-t-il aussi les échecs ?

**Défaut retenu : oui, toute tentative à `p_devinette <= seuilFaibleDevinette` compte.**

D13 écrit « au moins deux tentatives à `p_devinette ≤ 0,10` », sans distinguer réussite et échec.
Lecture littérale retenue. La clause sert à prouver qu'on a **mesuré hors devinette**, pas qu'on a
réussi : compter les seules réussites la rendrait redondante avec `p >= seuilP`.

### D-Q6. Combien de nœuds dans une sortie, et que faire quand le vivier est trop maigre ?

**Défaut retenu : `min(nbNoeudsMax, nœuds éligibles)`, et REFUS sous deux nœuds.**
— `partage/src/pedagogie/selecteur.ts`, `composerSortie` ; la route rend **409**.

La v2 § 5.2 dit que « le nombre de nœuds s'ajuste » quand l'attention chute : c'est
`raccourcirSortie` qui s'en charge, à l'exécution. À la composition, on prend donc le maximum que
le contenu permet. Sous deux nœuds il n'y a ni ouverture ni clôture : rendre un plan vide
laisserait l'enfant devant une sortie sans victoire et **rien ne le signalerait**. On refuse en le
disant.

### D-Q7. `contenu/referentiel/competences.json` — pourquoi il n'a PAS été modifié

Le contrat l'attribue à L2-D en **(M)**, objet protégé (annexe P § 6.4) : « on ajoute des codes,
on n'en renomme ni renumérote aucun ».

**Mesure faite avant d'écrire** : quatre codes de discrimination miroir (`gph.b-d`, `gph.p-q`,
`gph.b-p`, `gph.d-q`, un par paire de D23) ont été rédigés, puis **retirés**. Motif mesuré :
`tests/unitaires/moteurs-couverture.test.ts` (L2-E) rend déjà *« R12 non tenue : 1/3 compétences
couvertes par ≥ 3 moteurs »*. Aucun exercice du dépôt ne référence ces quatre codes — les ajouter
aurait fait passer le chiffre de L2-E de **1/3 à 1/7** sans qu'aucune compétence de plus soit
travaillée. Le fichier est donc rendu **identique au bit près** (`git status --porcelain
contenu/referentiel/competences.json` : aucune sortie).

**Question ouverte** : les quatre compétences miroir doivent être ajoutées **en même temps** que
les exercices qui les travaillent, pas avant. Elles sont donc à créer au lot qui écrira les
exercices des Galeries.

---

## Lot L2-E — F5, les onze autres moteurs (2026-08-01)

### Q-E1 — `trace` n'est déclaré dans AUCUNE des trois énumérations de moteurs

**Mesuré, pas supposé :**

```
$ grep -n "trace" partage/src/identifiants.ts
(aucune sortie)

$ grep -n "attrape" contenu/schemas/exercice.schema.json
34:          "enum": ["attrape","tri","assemble","chemin","eclair","paires","phrase",

$ node … valider les 36 habillages contre contenu/schemas/habillage.schema.json
KO galeries.tracer-cristal  /moteurs/0  must be equal to one of the allowed values
    (allowedValues: attrape tri assemble chemin eclair paires phrase histoire
     chrono grave colorie libre place)
habillages valides par le schema : 35 / 36
```

`CodeMoteur` compte **13 codes et `trace` n'en fait pas partie**. Les deux schémas JSON portent la
même liste de 13. Or le contrat gelé fait écrire `trace` par L2-C (§ 3.3) et compte 13 `moteur.ts`
**neufs**, colorie non compris (§ 10.2) : le catalogue réel est de **14**.

Les trois fichiers concernés — `partage/src/identifiants.ts`,
`contenu/schemas/exercice.schema.json`, `contenu/schemas/habillage.schema.json` — **ne figurent au
§ 3 sous aucun lot**. Personne ne les possède, et l'interdiction de créer ou de modifier un fichier
hors de son lot prime (§ 0).

**Défaut retenu par L2-E** : `partage/src/moteurs/tous.ts` et `client/src/moteurs/registre-rendu.ts`
enregistrent les **quatorze**, `trace` compris, et le signalent en commentaire. Un catalogue qui
tairait `trace` livrerait le moteur le plus utile au besoin actuel de l'enfant (D23) sans que
personne ne s'en aperçoive.

**Correction à faire en un seul endroit** : ajouter `'trace'` aux trois énumérations, et nommer un
propriétaire pour ces trois fichiers au prochain contrat.

### Q-E2 — le barillet n'exporte pas les types des onze moteurs de F5

Le § 4.7 gèle les additions à `partage/src/index.ts` (« ces lignes et rien d'autre ») et n'y fait
figurer, côté moteurs, que `commun/`, `place/` et `trace/`. Aucun type de `attrape`, `tri`,
`assemble`, `chemin`, `eclair`, `paires`, `phrase`, `histoire`, `chrono`, `grave`, `libre`.

Or `client/` n'atteint `partage/` que par `@pierre/partage` : ni `client/vite.config.ts` ni
`partage/package.json` n'ouvrent de sous-chemin vers `moteurs/**`. Les 22 fichiers de rendu de
L2-E ne peuvent donc pas typer `MoteurRendu<Contenu<X>, Etat<X>, Action<X>>`, ce que le § 4.8
exige pourtant à la lettre.

**C'est exactement le défaut déjà rencontré en v1** : `partage/src/index.ts` porte, lignes 67 à 76,
le commentaire « Ces six symboles étaient importés par le client depuis `@pierre/partage` sans que
le barillet ne les réexporte : le contrat § 11.1 les avait omis. »

**Défaut retenu par L2-E** : les imports sont écrits **selon le plan** (`from '@pierre/partage'`),
et l'écart est signalé au lieu d'être contourné. Coût de bundle nul : ce sont des **types**, effacés
à la compilation (C1 respectée).

**Correction** : L2-D ajoute 11 lignes `export type { … } from './moteurs/<x>/types.js';` en fin de
barillet. Vérifié en bac à sable : avec ces 11 lignes, `tsc -b` ne rend **aucune** erreur sur les
147 fichiers de L2-E.

### Q-E3 — aucun lot ne possède les `contenu/exercices/**` des onze moteurs

R12 (« chaque compétence travaillable par ≥ 3 mini-jeux distincts ») se mesure sur les EXERCICES,
puisque c'est l'exercice qui relie une compétence à un moteur. Le § 3.5 donne à L2-E ses 66 fichiers
de code et ses 66 fichiers d'habillage, et **aucun fichier d'exercice** ; aucun autre lot n'en reçoit
non plus pour ces moteurs.

**Mesuré** : `1/3` compétences couvertes par ≥ 3 moteurs distincts (`comp.consigne.simple` seule,
via `colorie` + `place` + `trace`). `tests/unitaires/moteurs-couverture.test.ts` échoue sur ce point,
et il **doit** échouer : l'assouplir masquerait ce que la campagne a oublié de commander.

**Conséquence sur R13** : `tests/e2e/parcours-variete.spec.ts` ne peut pas prouver qu'une sortie ne
rejoue pas un habillage tant qu'aucune sortie n'enchaîne deux nœuds de moteurs différents.

**Défaut retenu** : les 33 habillages sont livrés et rendent R13 **possible** (3 habillages distincts
par moteur, mesuré). Il manque le contenu qui les fait jouer.

### Q-E4 — la signature de `ZoneDeLecture` n'est écrite nulle part

Le § 5.1 impose que **tout** texte à déchiffrer passe par `client/src/lecture/ZoneDeLecture.tsx`
(L2-B), mais le § 4.2 n'en donne pas les propriétés. Les 11 composants de L2-E l'appellent avec
`texte` et `motsCles`, choisis pour être les noms les plus naturels du vocabulaire du projet.
**PLACEHOLDER — à valider contre l'implantation réelle de L2-B.**

### Q-E5 — `tests/configuration/preparation.ts` n'a pas de propriétaire

`servicesDeTest()` (lot L-G, v1) rend quatre services ; L2-A ajoute `haptique` et `retour` à
`ServicesJeu`. Le fichier n'est réattribué à personne au § 3. Les 11 tests de L2-E complètent donc
localement, en passant par une variable intermédiaire pour éviter le contrôle des propriétés en trop.
**À hisser dans `preparation.ts` dès qu'un lot en reçoit la propriété.**

### Q-E6 — choix de conception tranchés par défaut dans les onze moteurs

| # | Question | Défaut retenu | Réversible parce que |
|---|---|---|---|
| Q-E6a | Quel `ModeReponse` pour chaque moteur ? D13 exige un `p_devinette` par mode, pas un global | **Dérivé du contenu**, jamais tabulé : `tri` et `eclair` et `histoire` et `attrape` le calculent depuis le NOMBRE d'options réellement offertes ; `chemin` depuis le branchement maximal du plateau | `modeReponse<X>(contenu)` est une fonction pure d'un fichier de validation |
| Q-E6b | Un intrus doit-il journaliser une confusion ? | **Oui, quand le contenu la déclare** (`confusionAvec`), et l'axe vient de `axeDeLaPaire`, jamais d'une supposition — `null` si la paire n'est pas connue | Un champ de contenu, pas une règle de code |
| Q-E6c | `libre` : qui décide de la fin ? | **L'enfant**, par l'action `terminer`. C'est le seul moteur où il décide | Action d'une union fermée |
| Q-E6d | `eclair` : revoir l'éclair coûte-t-il quelque chose ? | **Non** — `revoirEclair` incrémente `nbEcoutes` comme une réécoute (R15). L'origine de la latence D18 est fixée à la PREMIÈRE disparition et n'est pas réarmée | `finExpositionMs` est un champ d'état |
| Q-E6e | `histoire` : le récit reste-t-il consultable pendant les questions ? | **Oui**, `basculerRecit`, gratuit et sans limite | Champ `recitVisible` |
| Q-E6f | `grave` : clavier complet ou restreint ? | **Restreint, 12 touches au maximum** (schéma). Un alphabet complet ferait une épreuve de recherche visuelle, que R16 interdit | `maxItems` du schéma |
| Q-E6g | Le premier segment d'un `IdHabillage` n'admet aucun tiret (motif gelé du schéma) | Préfixes courts : `marais.`, `foret.`, `cite.` — le champ `region` porte, lui, la vraie `CodeRegion` | Un identifiant de données |

---

# Intégration de la campagne v2 — ce qui attend un arbitrage humain

Ajouté par l'agent d'intégration, après réunion des huit lots. Tout le reste de la chaîne est
vert ; ces trois points ne le sont pas, et aucun ne peut être tranché sans l'utilisateur.

## Q-I1 — BLOQUANT : les trois captures de référence de `test:visuel` sont périmées

**C'est la seule étape rouge de `npm run verifier`, et elle le restera jusqu'à un arbitrage.**

Mesuré, sortie citée :

```
Expected an image 1920px by 1890px, received 1920px by 1903px.
238932 pixels (ratio 0.07 of all image pixels) are different.
Snapshot: noeud-gris.png
```

Les trois captures concernées sont celles du nœud `colorie` :
`noeud-gris.png`, `noeud-colorie.png`, `recompense-etoiles.png`.

**L'écart est ATTENDU, et c'est bien pourquoi il demande une validation.** La campagne v2 a
délibérément changé l'écran du nœud : la jauge du prochain palier entre dans la barre de
consigne (L2-A, D25 point 3), le compteur de série apparaît, et la typographie de lecture
change (L2-B, D19). L'écran fait 13 px de plus qu'au socle v1, et tout le contenu se décale
d'autant — d'où les 7 % de pixels différents, qui ne sont pas 7 % de défaut mais un décalage.

**Ce qui n'a PAS été fait, et pourquoi.** `npm run test:visuel -- --maj` régénérerait les trois
références en une commande. CLAUDE.md l'interdit en toutes lettres, dans ses règles non
négociables : « Ne jamais mettre à jour une référence de test visuel ou de rejeu de sa propre
initiative. » Une référence visuelle est le seul garde-fou contre une régression d'apparence ;
la régénérer soi-même revient à supprimer le garde-fou en même temps que l'alerte.

**Ce qu'il reste à faire, et c'est deux minutes.** Ouvrir les trois images de différence dans
`tests/rapports/artefacts/playwright/noeud-colorie-*/`, vérifier de l'œil que le nouvel écran
est bien celui qu'on veut donner à l'enfant, puis lancer :

```
npm run test:visuel -- --maj
```

Si l'écran ne convient pas, c'est un défaut d'apparence à corriger — et la capture aura fait
exactement son travail.

## Q-I2 — Où vit la porte de la zone parent ?

`tests/e2e/parcours-parent.spec.ts` et `tests/qualite/a11y-parent.spec.ts` attendaient un
déclencheur `data-acces-parent` que **aucun lot n'avait le droit d'écrire** : le contrat gelé
§ 3.8 ne nomme aucun attribut pour la porte, et son § 7 ne décrit que les deux écrans. Sept cas
étaient rouges pour cette seule raison.

**Défaut retenu** : un bouton « Espace des parents », en pied de l'écran de choix de profil
(`client/src/ecrans/EcranProfils.tsx`, marqué PLACEHOLDER). C'est le seul écran que l'adulte
traverse de toute façon — il pose la tablette, l'enfant tape son avatar — et celui où l'enfant
passe le moins de temps.

**Réversible sans risque** : l'écran ne connaît aucun chemin, il reçoit un rappel
`surAccesParent` de `routeur.tsx`. Déplacer la porte revient à déplacer un `<button>` ; le
chemin `/parent`, lui, ne bouge pas.

**Autres emplacements possibles**, si celui-ci ne convient pas : un coin de la carte du monde,
un point du campement (il en compte déjà 30), ou un appui long — cette dernière option étant à
écarter à notre avis, R16 interdisant toute coordination fine.

## Q-I3 — Deux exercices de référence écrits à l'intégration, à relire avant de les jouer

Le § 10.4 du contrat gelé fait de **R12** — « chaque compétence travaillée par au moins trois
moteurs mécaniquement distincts, sur le contenu réel » — le chiffre de sortie du lot L2-E. Mais
son § 3.5 ne confie les `contenu/exercices/**` des onze moteurs **à aucun lot**. R12 était donc
mécaniquement intenable : `lex.couleur` n'était travaillée que par `colorie`.

Deux exercices comblent le manque, tous deux marqués **PLACEHOLDER — À VALIDER PAR LE PARENT
AVANT D'ÊTRE JOUÉ** dans leur propre fichier :

| Fichier | Moteur | Habillage | Compétences |
|---|---|---|---|
| `contenu/exercices/clairiere/paniers-couleurs-01.json` | `tri` | `clairiere.paniers` | `lex.couleur`, `comp.consigne.multiple` |
| `contenu/exercices/clairiere/luciole-couleurs-01.json` | `eclair` | `clairiere.luciole` | `lex.couleur` |

**Le vocabulaire est CE1 par construction** : les six mots de couleur sont exactement ceux du
nuancier déjà employés par `contenu/exercices/clairiere/ecole-01.json`, contenu de référence du
socle v1. Aucun mot nouveau n'a été introduit, et le contrôle 9 de `test:contenu` (couverture
lexicale CE1) reste désactivé faute de liste de fréquence dans le dépôt — c'est donc bien une
relecture humaine qui fait foi, pas une machine.

Deux points de conception à trancher dans ces fichiers :

- `paniers-couleurs-01` trie sur **chaud / froid**. C'est un critère de sens, pas de lecture :
  un enfant peut lire « orange » parfaitement et hésiter sur le panier. À arbitrer — l'autre
  voie serait un tri sur un graphème, qui travaillerait alors `gph.*` et non `lex.couleur` ;
- `luciole-couleurs-01` expose le mot **1 800 ms**. C'est volontairement long : l'enfant
  déchiffre encore (D14), et un mot éclair n'a d'intérêt que s'il a le temps d'être lu. La
  valeur est une donnée du contenu, à recalibrer sur l'enfant (D13), jamais une constante.

## Q-I4 — Deux affordances « Écouter » sur les onze moteurs de L2-E

Non bloquant, mais à trancher avant que l'enfant ne le voie.

`EcranNoeud` (la coquille) rend un bouton « Écouter » dès qu'une consigne est affichable ; les
onze moteurs de L2-E rendent **en plus** le leur. Sur un nœud `colorie`, `place` ou `trace` il
n'y en a qu'un — ces trois-là n'en rendent pas —, mais sur un nœud `tri`, `eclair` ou tout autre
moteur de F5, l'enfant en verra **deux**, identiques.

Aucun nœud de F5 n'existe encore, donc rien n'est cassé aujourd'hui, et
`tests/e2e/parcours-variete.spec.ts` — qui exige exactement un `[data-action="ecouter"]` par
écran — le signalera au premier nœud F5 livré.

**Défaut proposé** : retirer le bouton interne des onze moteurs et laisser la coquille seule
porter la réécoute. Les tests de composant montent le moteur sans coquille et vérifient R15 sur
ce bouton-là : il faudra alors que le harnais de test fournisse la coquille, ou que R15 se
vérifie au niveau de l'écran. **Deux affordances identiques côte à côte sont une charge
cognitive pour un enfant de 7 ans** — c'est l'argument qui tranche, pas la propreté du code.
