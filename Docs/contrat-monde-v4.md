# Contrat du monde v4 — mettre du contenu partout, et rendre le jeu beau

**Gelé le** 2026-08-02, sur l'état du dépôt au commit `6107861` (« La QA cesse de vérifier ce qui
est facile et se met à chercher ce qui casse », 2026-08-02 13:24:13 +0200).

**Ce document ne modifie aucun des quatre documents de référence ni le journal des décisions.** Il
n'ajoute aucune loi : il applique celles qui existent (v2 § 3, § 7, § 9 ; R11→R18 ; D1→D49) à un
inventaire mesuré, et il en tire huit lots à fichiers disjoints.

**Il ne contient aucun code d'application et aucun asset.** C'est un plan. Les huit lots écrivent.

> **Le dépôt bougeait pendant l'écriture.** `git status --porcelain` rend deux lignes :
> `M contenu/habillages/clairiere/ecole.svg` et `?? scripts/qa/recettes-nouvelles.mjs`. Une
> campagne « super-QA » finit d'écrire. Aucun des deux fichiers n'est possédé par un lot ci-dessous.
> Chaque lot **relance les commandes du § 1 avant sa première écriture** et signale l'écart plutôt
> que de recopier ce document (CLAUDE.md, contrat de finition v3 § 11 point 6).

---

## 1. L'inventaire — mesuré, jamais rapporté

Toutes les valeurs de cette section sortent d'une commande exécutée le 2026-08-02. Aucune n'est
recalculée à partir d'un document ; quand un document dit autre chose, l'écart est nommé.

### 1.1 Le contenu

**Exercices et nœuds, par région** — `contenu/exercices/*/*.json` et `contenu/noeuds/*.json` :

| Région | ordre | nœuds | exercices | dont PLACEHOLDER | cible v2 § 3.3 | écart |
|---|---|---|---|---|---|---|
| La Clairière | 1 | **6** | **6** | 3 | 10-14 | **−6** |
| Les Galeries | 2 | **12** | **12** | 6 | 10-14 | **−2** |
| Le Marais Jumeau | 3 | **0** | **0** | — | 10-14 | **−12** |
| La Forêt Muette | 4 | **0** | **0** | — | 10-14 | **−12** |
| Le Volcan | 5 | **0** | **0** | — | 10-14 | **−12** |
| La Cité des Histoires | 6 | **0** | **0** | — | 10-14 | **−14** |
| **total** | | **18** | **18** | **9** | **60-84** | **−58** |

**Régions ayant du contenu : 2 sur 6. Régions vides : 4 sur 6.**
**Exercices marqués PLACEHOLDER : 9 sur 18** — la moitié exacte.

**Exercices par moteur** — les 14 moteurs sont tous atteignables, aucun n'est orphelin :

```
colorie 1 · place 1 · phrase 1 · eclair 2 · attrape 1 · tri 2 · histoire 1
paires 1 · chrono 1 · trace 2 · libre 1 · chemin 1 · grave 2 · assemble 1
```

**Consignes réellement écrites : 47** réparties sur 18 exercices, plus 5 énoncés hors `consignes`
(`histoire`, `trace`, `libre`), soit **52 unités de texte à lire**.

**Le référentiel de compétences ne porte que 5 codes** (`contenu/referentiel/competences.json`) :
`comp.consigne.simple`, `comp.consigne.multiple`, `lex.couleur`, `gph.miroir.gauche-droite`,
`gph.miroir.haut-bas`. C'est pour cette raison que **quatre régions sur six déclarent
`competences: []`** dans `contenu/monde/regions.json` : le référentiel est un objet protégé
(annexe P § 6.4), et `tests/unitaires/carte.test.ts` échoue si une région invente un code.
**C'est le vrai verrou du contenu, pas l'écriture des exercices.**

**Défaut mesuré, et il n'est pas cosmétique.** `gph.miroir.haut-bas` est déclaré au référentiel et
**porté par zéro exercice**. Les deux exercices qui travaillent réellement l'axe haut-bas —
`galeries-miroir-bp-01` et `galeries-pierre-bp-01`, mesurés : leur contenu porte bien `b`/`p` —
déclarent `comp.consigne.simple`. Conséquence : le BKT et le Leitner ne verront **jamais** l'axe
haut-bas, et le « Top 10 des confusions » du tableau de bord, que D23 conséquence 3 désigne comme
« une pièce centrale, pas un ornement », est aveugle sur la moitié du problème que l'enfant a
aujourd'hui. **M1 le corrige, et c'est sa première écriture.**

**R12 (≥ 3 moteurs par compétence) est tenue sur les 4 codes employés** — mesuré :

```
comp.consigne.multiple      3  [colorie, place, tri]
comp.consigne.simple        8  [attrape, chrono, colorie, grave, histoire, phrase, place, trace]
gph.miroir.gauche-droite    6  [assemble, chemin, eclair, grave, paires, tri]
lex.couleur                 7  [attrape, colorie, eclair, histoire, libre, phrase, tri]
```

**R13 (jamais deux fois le même habillage dans une sortie) est tenue** : 18 exercices, 18 habillages
distincts, aucune réutilisation.

**Les 105 fiches du corpus : 90 ingérées, 15 refusées, et 0 exploitée.**

| Niveau | fiches | statut | moteur cible | matière brute |
|---|---|---|---|---|
| 1 | 15 | `brouillon-non-jouable` | — | 75 consignes + 90 affirmations |
| 2 | 15 | `brouillon-non-jouable` | `histoire` | 120 affirmations vrai/faux |
| 3 | 15 | `brouillon-non-jouable` | `paires` | 75 questions à réponse illustrée |
| 4 | 15 | `brouillon-non-jouable` | `histoire` | 75 QCM à 3 options |
| 5 | 15 | `brouillon-non-jouable` | `chrono` | 75 étapes à ordonner |
| 6 | 15 | `brouillon-non-jouable` | `grave` | 60 phrases à compléter |
| 7 | 0 | **refusé** — `format-non-tranche` | aucun | — |

**570 items de matière brute, et pas un seul n'atteint l'enfant.** Deux exercices seulement portent
un champ `origine` (`clairiere-ecole-01`, `clairiere-ecole-02-place`) — les 88 autres fiches n'ont
donné naissance à rien.

Le motif de refus est écrit dans chaque brouillon et il est juste : niveau 1, « aucune cible
(region, couleur) n'est déductible du PDF » — les identifiants de région appartiennent au décor SVG,
qui n'existe pas ; niveaux 2 à 6, « aucune valeur de vérité n'est déductible du PDF : le corrigé n'y
figure pas ». **Ce n'est pas un défaut d'ingestion, c'est un travail humain ou de LLM qui reste à
faire**, et c'est le cœur de M2.

**Le socle phonologique existe mais est squelettique** — `contenu/brouillons/phonologie/`, 7
fichiers, tous `brouillon-non-jouable`, mesurés :

```
clairiere/voyelles.json                7 items
clairiere/syllabes-cv.json            50 items
clairiere/mots-outils.json            20 items
galeries/syllabes-cvc.json            16 items
galeries/sons-proches.json             4 items
galeries/miroir-gauche-droite.json    8 + 8 mots, 4 paires
galeries/miroir-haut-bas.json         8 + 8 mots, 4 paires
```

**Marais Jumeau, Forêt Muette et Volcan n'ont aucun matériau phonologique.** C'est le point ouvert
**O10**, intact.

**La voix est le seul chantier du dépôt qui soit à 100 %.** Mesuré : `contenu/audio/manifeste.json`
porte **174 clips** pour 190 fichiers Opus sur disque, et **52 consignes déclarées / 52 couvertes
par un clip — écart nul**. Répartition : 49 clips `mot/`, 11 `campement/`, 7 `locuteur/`,
5 `ouverture/`, 52 de consignes. Moteur `piper/2023.11.14-2`, contrôle qualité par transcription
inverse `faster-whisper/large-v3`, seuil 0,85 : **161 clips à 1,0 et 13 à 0,9, aucun sous le seuil**.
La résolution se fait par convention de clé `<idExercice>/<idConsigne>` ; le champ `audio` des
consignes vaut `null` partout et **ce n'est pas un défaut** — le manifeste est la source.

### 1.2 Les assets

**Habillages : 44 déclarés, 39 sont des bouchons géométriques.** Critère mécanique — taille du SVG
servi sous 1 000 octets, un seul `<path>` et sept primitives. Les 39 sont **le même fichier à
l'identifiant près** : un `<rect>` de fond beige, six `<rect>` arrondis de 200 × 160 disposés en
grille 3 × 2, un cadre. Exemple intégral, `clairiere/lucioles.svg`, 787 octets :

```xml
<g id="calque-zones">
  <rect id="luciole-haute" x="90"  y="110" width="200" height="160" rx="12"/>
  <rect id="luciole-basse" x="380" y="110" width="200" height="160" rx="12"/>
  <rect id="buisson"       x="670" y="110" width="200" height="160" rx="12"/>
  <rect id="herbe-haute"   x="90"  y="340" width="200" height="160" rx="12"/>
  <rect id="lune"          x="380" y="340" width="200" height="160" rx="12"/>
  <rect id="sentier"       x="670" y="340" width="200" height="160" rx="12"/>
</g>
```

Une luciole, un buisson, la lune et un sentier y sont **le même rectangle**. `galeries/pierre.svg`
déclare six régions de surface `32000.0` exactement identique. C'est la réponse littérale à
« comment déterminer la maîtresse ? » : on ne peut pas, parce qu'il n'y a rien à déterminer.

**Cinq habillages sur 44 dépassent le bouchon**, et deux seulement sont présentables :

| habillage | SVG servi | octets | régions | verdict |
|---|---|---|---|---|
| `clairiere.ecole` | `ecole-v2.svg` | 13 064 | **31** | **présentable.** Maîtresse 1,54 × plus haute qu'une élève, tableau sur pieds entre elle et le premier rang, arbres à tronc et houppier lobé à six lobes, géométrie 100 % polygonale donc surfaces et centroïdes exacts |
| `galeries.grottes` | `grottes-v2.svg` | 3 791 | 6 | **présentable.** Voûte, stalactite qui pend, flaque étalée, trois bouches de grotte de trois tailles — aucune paire ne se ressemble |
| `galeries.tracer-paroi` | `tracer-paroi.svg` | 2 537 | 1 | support de tracé, suffisant pour son rôle, mais nu |
| `clairiere.ecole-place` | `ecole-place.svg` | 2 461 | 3 | trois zones seulement pour un moteur `place` qui exerce la localisation spatiale |
| `galeries.tracer-cristal` | `tracer-cristal.svg` | 1 738 | 1 | idem |

**54 SVG dans `contenu/habillages/`, 44 déclarés par un habillage, 10 non déclarés** — la carte
(v1 et v2), le campement, les cinq tableaux d'ouverture, et les deux v1 archivées (`ecole.svg`,
`grottes.svg`). Les orphelins ont un propriétaire écrit dans `contenu/registre-svg.json` ; aucun
n'est à supprimer.

**Gobi — et c'est le constat le plus important de l'inventaire.**

La chaîne d'image a réussi. `production/personnages/gobi/canonique.png` (1024², empreinte de pixels
consignée dans `gobi.lock.json`) est un vrai personnage de BD jeunesse : corps crème duveteux à
contour dentelé, couronne de sept cristaux facettés froids, grands yeux ronds à deux reflets,
sourcils fins arqués, joues orangées, deux bras courts ouverts, **et l'étoile-cristal dorée
rayonnante au ventre** — la fusion exacte que D36 décrit. Les **10 stades** et les **5 états
d'animation** existent déjà en PNG, produits par déclinaison depuis la canonique.

**Et l'enfant ne voit rien de tout cela.** `client/src/composants/Gobi.tsx` dessine le corps
**en ligne**, dans un `viewBox` de 64 unités, et c'est ce dessin-là qui est monté à l'écran :

```tsx
<circle cx="32" cy="40" r="24" fill="var(--framboise)" stroke="var(--trait)" strokeWidth="4" />
<path d="M32,32 C42,32 48,40 48,48 C48,56 40,62 32,62 C24,62 16,56 16,48 C16,40 22,32 32,32 Z"
      fill="#FFC0D6" .../>
<circle cx="9"  cy="46" r="7" fill="var(--framboise)" .../>   {/* bras gauche */}
<circle cx="55" cy="46" r="7" fill="var(--framboise)" .../>   {/* bras droit  */}
<circle cx="24" cy="36" r="6" fill="var(--parchemin)" .../>   {/* œil gauche  */}
```

Un rond framboise, deux ronds pour les bras, deux ronds pour les yeux, des losanges bleus pour la
crête. **Ce n'est pas seulement plus pauvre que la canonique : c'est un autre personnage.** Le
corps de la canonique est crème (`#FFDDA8`), pas framboise ; le cœur de Pierre — « la seule source
lumineuse autorisée sur le personnage » (D36) — **est absent du composant**. Le motif est écrit
dans le fichier et il est recevable (« un `fetch` par montage coûterait une requête là où le budget
vise une réponse sous 100 ms ») ; il n'en reste pas moins que **le Gobi validé par le père n'a
jamais atteint l'écran**.

Les SVG de `contenu/assets/gobi/`, eux, sont une transposition vectorielle honnête de la canonique
(corps « fourrure » ondulé, cœur-étoile, sourcils, joues, museau) mais **dessinée à la main, pas
tracée depuis le PNG** — 5 à 8 Ko contre 500 à 690 Ko pour la source.

| famille | fichiers | taille | verdict |
|---|---|---|---|
| `animation/*.svg` | 5 | 7,3 à 8,5 Ko | transposition à la main de la canonique, correcte, plus pauvre que le PNG |
| `stades/stade-{1..10}.svg` | 10 | 5,0 à 8,2 Ko | idem, crête croissante 1→9 cristaux |
| `formes/*.svg` | **25** | **893 à 958 octets, 3 `<path>` chacun** | **bouchons.** Le même cristal à trois facettes, dont seuls la silhouette et la teinte varient. Rien n'y évoque le graphème |
| `stade-{1..5}-*.svg` | 5 | 2,2 à 3,6 Ko | archivés v1 (registre), intacts sur disque |

**Les 25 formes de graphèmes sont donc à produire, pas à retoucher** — et le guide dit comment
(§ 6.3 : inpainting régional par `personnage-cristal.api.json`, masque de crête dessiné une fois,
mesuré à 0,31 % de pixels modifiés hors masque, 9 à 17 s par forme).

**La carte du monde — l'élément signature de la v2 § 9.4.** `client/src/ecrans/EcranCarte.tsx:60`
sert bien `carte-monde-v2.svg` : le passage annoncé dans `regions.json` a été fait. Ce qu'elle
montre : un quadrilatère `#FFF6E3` bordé de `#C9B48A` pour le parchemin, **six décagones
irréguliers en aplat**, cinq segments de chemin en pointillés `#1B2440`, six pastilles de marqueur.
C'est un vrai progrès sur la v1 (six hexagones identiques translatés, encore sur disque) et les
formes diffèrent enfin. **Mais il n'y a aucun territoire dessiné** : ni relief, ni arbre, ni grotte,
ni eau, ni brouillard mouvant, ni encre qui se dessine. Ce n'est plus une liste de boutons, c'est
une carte de risk. Il manque exactement ce que la v2 promet : « les régions grises encore voilées
d'un brouillard mouvant, et le chemin qui se dessine à l'encre au fur et à mesure ».

**Le campement.** `contenu/monde/campement.json` déclare **30 points d'interaction** (R11 en demande
25, dont 10 animations uniques) et 6 objets rapportés. `campement.svg`, 3 245 octets, les dessine
en **grille régulière de triangles, cercles et carrés de 80 unités**, quatre couleurs en rotation :

```xml
<path   id="tente"  d="M28,118 L68,38 L108,118 Z" fill="#3DDC97"/>
<circle id="feu"    cx="188" cy="78" r="42"       fill="#FFC93C"/>
<path   id="carte"  d="M268,38 L348,38 L348,118 L268,118 Z" fill="#2FA8E0"/>
<path   id="coffre" d="M388,118 L428,38 L468,118 Z" fill="#FF5D8F"/>
```

Une tente, un feu, une carte et un coffre sont un triangle, un cercle, un carré et un triangle.
**D45 avait raison mot pour mot** : « un campement peuplé de rectangles gris n'est pas un lieu —
c'est un menu déguisé ». Le pari d'Adibou n'a jamais été jugé, parce qu'il n'a jamais été montré.

**Quatre assets déclarés et absents du disque.** `contenu/monde/compagnons.json` nomme
`assets/compagnons/filou.svg`, `roc.svg`, `plume.svg`, `bulle.svg` ; `contenu/assets/compagnons/`
**n'existe pas**. `Compagnon.tsx` dessine un `<path>` en ligne. Voir § 6, repoussé avec motif.

**L'outillage de production, mesuré.** ComfyUI 0.29 sur `127.0.0.1:8188`, 7 workflows dans
`production/workflows/`, liste blanche à 17 fichiers. `outils/bin/` contient `tts` et rien d'autre :
**`potrace` reste absent**, ce qui pèse sur l'arbitrage du § 3.

### 1.3 Ce que l'inventaire oblige à conclure

1. **Le contenu manque à 76 %** (18 nœuds livrés sur 76 visés) et **la moitié de ce qui est livré
   est un brouillon**.
2. **Le verrou n'est pas l'écriture des exercices, c'est le référentiel de compétences** — 5 codes
   pour 6 régions, et quatre régions qui déclarent une liste vide faute de code à citer.
3. **La matière première est là et intacte** : 570 items ingérés, 0 exploité.
4. **La chaîne d'image a réussi et son résultat n'est pas branché.** La canonique de Gobi est bonne,
   ses stades et animations sont produits, et l'écran montre un rond framboise.
5. **89 % des habillages sont le même fichier.** 39 sur 44.
6. **La chaîne voix est la seule à 100 %**, et son coût marginal est un `npm run voix`.

---

## 2. Les huit lots — frontières, propriété, objectifs chiffrés

**Règle d'or : un seul écrivain par fichier.** Les tableaux de propriété du § 4 font foi. Un lot qui
a besoin d'un identifiant possédé par un autre le lit **dans ce document**, qui le gèle — il ne le
demande pas à l'exécution et ne le devine pas.

### Les identifiants gelés ici, pour que personne n'ait à coordonner

**Les 76 nœuds, dans l'ordre de la progression.** Motif `^[a-z0-9]+(-[a-z0-9]+)*$`.

```
clairiere-01 … clairiere-12              (01-06 existent, 07-12 par M1)
galeries-01 … galeries-14                (01-12 existent, 13-14 par M1)
marais-jumeau-01 … marais-jumeau-12      (M2)
foret-muette-01 … foret-muette-12        (M2)
volcan-01 … volcan-12                    (M2)
cite-des-histoires-01 … cite-des-histoires-14  (M2)
```

**Les 30 codes de compétence.** Les 5 premiers existent et **ne se renomment ni ne disparaissent
jamais** — une consigne qui cite un code disparu est un état sans issue. Les 25 suivants sont
créés par **M3, seul écrivain de `contenu/referentiel/competences.json`**, et M1 comme M2 peuvent
les citer dès leur première écriture.

| famille | code | libellé | région de travail |
|---|---|---|---|
| existant | `comp.consigne.simple` | Exécuter une consigne à une cible | toutes |
| existant | `comp.consigne.multiple` | Exécuter une consigne à plusieurs cibles | toutes |
| existant | `lex.couleur` | Reconnaître le nom écrit d'une couleur | Clairière |
| existant | `gph.miroir.gauche-droite` | Distinguer `b`/`d`, `p`/`q` | Galeries |
| existant | `gph.miroir.haut-bas` | Distinguer `b`/`p`, `d`/`q` | Galeries |
| **nouveau** | `gph.voyelle.orale` | Reconnaître les voyelles orales | Clairière |
| **nouveau** | `syl.cv` | Lire une syllabe consonne + voyelle | Clairière |
| **nouveau** | `mot.outil.frequent` | Reconnaître un mot outil sans le déchiffrer | Clairière |
| **nouveau** | `flu.mot.court` | Lire un mot d'une ou deux syllabes sans hésiter | Clairière |
| **nouveau** | `syl.cvc` | Lire une syllabe fermée consonne + voyelle + consonne | Galeries |
| **nouveau** | `gph.confusion.sourde-sonore` | Distinguer `p`/`b`, `t`/`d`, `f`/`v`, `s`/`z`, `ch`/`j` | Galeries |
| **nouveau** | `gph.nasale.on` | Le son `on` et ses graphies | Marais Jumeau |
| **nouveau** | `gph.nasale.an` | Le son `an` et ses graphies (`an`, `en`) | Marais Jumeau |
| **nouveau** | `gph.nasale.in` | Le son `in` et ses graphies (`in`, `ain`, `ein`) | Marais Jumeau |
| **nouveau** | `gph.digramme.ou` | Le digramme `ou` | Marais Jumeau |
| **nouveau** | `gph.digramme.oi` | Le digramme `oi` | Marais Jumeau |
| **nouveau** | `gph.finale.muette` | Reconnaître une lettre finale qui ne se dit pas | Forêt Muette |
| **nouveau** | `enc.pluriel.s` | Le `s` du pluriel qui ne s'entend pas | Forêt Muette |
| **nouveau** | `flu.liaison` | Lire une liaison sans buter | Forêt Muette |
| **nouveau** | `gph.rare.eau` | Le graphème `eau` | Volcan |
| **nouveau** | `gph.rare.ill` | Le graphème `ill` | Volcan |
| **nouveau** | `gph.rare.gn` | Le graphème `gn` | Volcan |
| **nouveau** | `gph.rare.ph` | Le graphème `ph` | Volcan |
| **nouveau** | `gph.rare.ch-qu` | Les graphèmes `ch` et `qu` | Volcan |
| **nouveau** | `comp.litteral` | Répondre à une question dont la réponse est écrite | Cité |
| **nouveau** | `comp.inference` | Répondre à une question dont la réponse se déduit | Cité |
| **nouveau** | `comp.chronologie` | Remettre un récit dans l'ordre | Cité |
| **nouveau** | `comp.vrai-faux` | Juger une affirmation portant sur un texte | Cité |
| **nouveau** | `comp.image` | Choisir l'image qui correspond à la phrase | Cité |
| **nouveau** | `comp.phrase.completee` | Compléter une phrase réponse | Cité |

Le motif du schéma d'exercice est `^(gph|syl|mot\.outil|lex|flu|comp|enc)\.[a-z0-9.\-]+$` : les 30
le respectent, vérifié caractère par caractère.

**Les 14 nouveaux habillages**, créés par **M6, seul écrivain de `contenu/habillages/`** hors
campement. M2 les cite dès sa première écriture. Motif `^[a-z0-9]+(\.[a-z0-9\-]+)+$`.

| région | identifiant | moteur | ce qu'il montre |
|---|---|---|---|
| Marais Jumeau | `marais.grenouilles` | `tri` | deux nénuphars-réceptacles, des grenouilles à ranger |
| Marais Jumeau | `marais.roseaux` | `phrase` | des roseaux porteurs d'étiquettes-mots |
| Marais Jumeau | `marais.brume` | `colorie` | une berge que la brume quitte quand on lit |
| Forêt Muette | `foret.feuilles` | `attrape` | des feuilles qui tombent, chacune une lettre |
| Forêt Muette | `foret.souche` | `tri` | deux souches creuses, des glands à trier |
| Forêt Muette | `foret.veillee-automne` | `histoire` | un feu sous les arbres roux, Plume assise |
| Forêt Muette | `foret.tapis` | `colorie` | un tapis de feuilles à recolorier |
| Volcan | `volcan.forge` | `colorie` | une forge, son enclume, ses braises |
| Volcan | `volcan.coulee` | `chemin` | des pierres à sauter sur une coulée |
| Volcan | `volcan.geodes` | `paires` | des géodes à ouvrir deux à deux |
| Cité | `cite.ponts` | `chemin` | des ponts de livres entre deux tours |
| Cité | `cite.rayonnages` | `tri` | deux rayonnages, des livres à ranger |
| Cité | `cite.enseigne` | `assemble` | une enseigne dont les lettres se posent |
| Cité | `cite.fresque-murale` | `colorie` | une fresque sur un mur de la Cité |

Après M6, chaque région dispose de **au moins 8 habillages couvrant 8 moteurs distincts** :
Clairière 9, Galeries 12, Marais 8, Forêt 8, Volcan 8, Cité 10. C'est ce qui rend **R13 tenable sur
une sortie de 4 à 6 nœuds** sans coordination entre M1, M2 et M6.

---

### M1 — Contenu de la Clairière et des Galeries

**C'est le contenu dont l'enfant a besoin aujourd'hui. Il passe avant tout le reste.**

**Objectif chiffré :**

| | Clairière | Galeries | total |
|---|---|---|---|
| nœuds aujourd'hui | 6 | 12 | 18 |
| nœuds à livrer | **12** | **14** | **26** |
| nœuds à créer | **6** (`clairiere-07`…`-12`) | **2** (`galeries-13`, `-14`) | **8** |
| exercices à créer | **6** | **2** | **8** |
| exercices PLACEHOLDER à réécrire | **3** | **6** | **9** |
| **fichiers d'exercice écrits par M1** | **9** | **8** | **17** |
| moteurs distincts par région, cible | ≥ 9 | ≥ 10 | — |
| consignes par exercice, plancher | 4 | 4 | — |
| **consignes livrées, cible** | ≥ 48 | ≥ 56 | **≥ 104** |

**Contenu par région, conforme à la v2 § 3.3 :**

- **Clairière** — voyelles orales, syllabes CV, premiers mots outils. Codes visés :
  `gph.voyelle.orale`, `syl.cv`, `mot.outil.frequent`, `flu.mot.court`, plus les trois existants.
- **Galeries** — syllabes CVC, confusions de lettres miroir **par axe**, sons proches. Codes visés :
  `syl.cvc`, `gph.miroir.gauche-droite`, `gph.miroir.haut-bas`, `gph.confusion.sourde-sonore`.

**Correction obligatoire et prioritaire (D23 conséquence 1).** `galeries-miroir-bp-01` et
`galeries-pierre-bp-01` travaillent l'axe **haut-bas** et déclarent `comp.consigne.simple`. Elles
passent à `gph.miroir.haut-bas`. **Aucun exercice ne mélange jamais les deux axes** : ni dans ses
`competences`, ni dans son clavier, ni dans ses intrus. Un enfant gêné par un seul axe ne doit
jamais payer la confusion de l'autre — c'est écrit dans le `$commentaire` de `pierre-bd-01` et ce
lot l'étend à tous.

**Contraintes opposables :**

- **R13** — dans toute fenêtre de 6 nœuds consécutifs d'une même région, 6 habillages distincts.
  M1 n'emploie **que** des identifiants d'habillage déjà déclarés (9 en Clairière, 12 aux Galeries) ;
  il n'en crée aucun.
- **R12** — chaque code cité par la région est atteignable par ≥ 3 moteurs mécaniquement distincts.
  Le lot **imprime la table** code → moteurs, comme au § 1.1.
- **v2 § 3.3** — le rythme des `temps` de nœud reste `presentation` → `developpement` →
  `retournement` → `maitrise`, deux cycles par région de 12 à 14 nœuds.
- **D46** — un nœud est jouable en moins de 5 minutes. Plancher 4 consignes, plafond 8.
- **Vocabulaire CE1** obligatoire, consignes très brèves, une idée par consigne.
- **`audio: null`** partout : la résolution passe par le manifeste, M4 la fournit.
- Tout exercice neuf naît dans `contenu/brouillons/` et n'entre dans `contenu/exercices/` qu'après
  `npm run valider-brouillons` **et** relecture parent (annexe P § 6.4). **Aucune exception.**

**Contrat de sortie de M1 — chiffres à calculer et à imprimer, le lot échoue s'ils sont faux :**

```
noeuds clairiere = 12          noeuds galeries = 14
exercices clairiere = 12       exercices galeries = 14
exercices PLACEHOLDER restants dans ces deux regions = 0
consignes totales des deux regions >= 104
codes de competence portes par >= 3 moteurs distincts = tous
habillages repetes dans une fenetre de 6 noeuds = 0
exercices melangeant les deux axes miroir = 0
gph.miroir.haut-bas porte par >= 3 moteurs = vrai
```

---

### M2 — Contenu des quatre régions vides

**Objectif chiffré :**

| région | nœuds | exercices | moteurs distincts | consignes, plancher | source principale |
|---|---|---|---|---|---|
| Marais Jumeau | **12** | **12** | ≥ 8 | ≥ 48 | M3 (nasales, digrammes) |
| Forêt Muette | **12** | **12** | ≥ 8 | ≥ 48 | M3 (finales muettes, pluriels, liaisons) |
| Volcan | **12** | **12** | ≥ 8 | ≥ 48 | M3 (graphèmes rares) |
| La Cité des Histoires | **14** | **14** | ≥ 8 | ≥ 56 | **les 90 fiches ingérées** |
| **total** | **50** | **50** | | **≥ 200** | |

**La Cité s'appuie massivement sur le corpus, et c'est le seul endroit où il rend.** Les 90 fiches
des niveaux 2 à 6 sont exactement de la compréhension de texte. Correspondance mesurée au § 1.1 :

| niveau | matière | moteur | code visé | rendement attendu |
|---|---|---|---|---|
| 2 | 120 affirmations V/F sur texte documentaire | `histoire` | `comp.vrai-faux` | 3 nœuds |
| 3 | 75 questions à réponse illustrée | `paires` | `comp.image` | 3 nœuds |
| 4 | 75 QCM à 3 options | `histoire` | `comp.litteral`, `comp.inference` | 3 nœuds |
| 5 | 75 étapes à ordonner | `chrono` | `comp.chronologie` | 3 nœuds |
| 6 | 60 phrases amorcées | `grave` | `comp.phrase.completee` | 2 nœuds |

**Le travail réel sur ces fiches n'est pas l'extraction — elle est faite — c'est la production du
corrigé.** Chaque brouillon dit pourquoi il est non jouable : « aucune valeur de vérité n'est
déductible du PDF : le corrigé n'y figure pas, et la déduire du texte est un jugement humain ».
M2 produit ce jugement, le consigne, et **le fait vérifier** :

- une affirmation V/F ne devient jouable que si sa valeur de vérité **se lit dans le texte fourni**,
  citation à l'appui dans le `$commentaire` ;
- toute affirmation dont la vérité dépend d'un savoir extérieur au texte est **écartée, nommée,
  comptée** — un générateur refuse d'écrire plutôt que d'émettre du faux ;
- `p_devinette` (D13) impose que le vrai/faux ne domine pas : **au plus 4 des 14 nœuds de la Cité
  emploient `comp.vrai-faux`**.

**Ce que M2 ne fait pas.** Le niveau 1 du corpus (15 fiches, 75 consignes, 90 affirmations) reste
non exploité : chaque fiche demande **son propre décor SVG à régions nommées**, soit 15 décors que
M6 ne peut pas absorber en plus de ses 53. Repoussé, motif au § 6.

**Contraintes opposables :** identiques à M1 (R12, R13, temps de nœud, vocabulaire CE1, brouillon
puis validation), plus :

- M2 est **seul écrivain de `contenu/monde/regions.json`**. Il y inscrit les `noeuds` **des six
  régions** — y compris les 26 de M1, dont les identifiants sont gelés ci-dessus — et les
  `competences` des six régions, prises **exclusivement** dans les 30 codes du tableau. C'est la
  reprise littérale du point de synchronisation N7/N8 : *un lot lit la liste des nœuds livrés et
  l'inscrit ; l'autre ne touche pas au fichier.*
- M2 emploie les 14 identifiants d'habillage gelés ci-dessus, et aucun autre.
- Textes de la Cité : longueur bornée à **8 lignes** comme les fiches d'origine ; police et fond de
  la zone de lecture non négociables (parchemin, Andika, aucune animation).

**Contrat de sortie de M2 :**

```
noeuds marais-jumeau = 12   foret-muette = 12   volcan = 12   cite-des-histoires = 14
exercices correspondants   = 12 / 12 / 12 / 14
regions a 0 noeud = 0 sur 6
regions declarant competences: [] = 0 sur 6
fiches du corpus reellement exploitees (exercice portant `origine`) >= 14
affirmations ecartees faute de corrigé deductible : nombre imprimé, motif par fiche
noeuds de la Cite employant comp.vrai-faux <= 4
```

---

### M3 — Contenu phonologique (point ouvert O10)

**Le corpus ne couvre pas la progression phonologique** — les 105 fiches supposent le déchiffrage
acquis, or l'enfant déchiffre encore (D14). M3 produit le matériau manquant des **cinq premières
régions**. C'est le lot dont M1 et M2 dépendent pour leurs mots.

**Objectif chiffré :**

| région | fichier | aujourd'hui | cible |
|---|---|---|---|
| Clairière | `voyelles.json` | 7 | **7** graphèmes, chacun avec sa mnémonique et 8 mots porteurs |
| Clairière | `syllabes-cv.json` | 50 | **50** syllabes + **60 mots CV/CVCV** |
| Clairière | `mots-outils.json` | 20 | **40** mots outils |
| Galeries | `syllabes-cvc.json` | 16 | **60** syllabes CVC + **60 mots** |
| Galeries | `sons-proches.json` | 4 | **12** paires sourde/sonore, **8 mots par membre** |
| Galeries | `miroir-gauche-droite.json` | 8 + 8 | **30 + 30** mots, aucun portant les deux lettres |
| Galeries | `miroir-haut-bas.json` | 8 + 8 | **30 + 30** mots, aucun portant les deux lettres |
| Marais Jumeau | **5 fichiers neufs** | 0 | **5** graphèmes (`on`, `an`, `in`, `ou`, `oi`), **60 mots** |
| Forêt Muette | **3 fichiers neufs** | 0 | **6** finales muettes, **60 mots**, **20 liaisons** |
| Volcan | **5 fichiers neufs** | 0 | **5** graphèmes rares, **60 mots** |
| | | | **≥ 28 mnémoniques, ≥ 430 mots distincts** |

**Règles de production :**

- **Vocabulaire CE1.** Chaque mot passe le contrôle de couverture lexicale ; le fichier **imprime le
  taux** et **nomme** les mots hors échelle plutôt que de les taire (aujourd'hui 93,0 %, Q-INT-2).
- **Aucun mot ne porte les deux lettres d'une paire miroir** — le générateur le remesure, comme le
  fait déjà `miroir-gauche-droite.json`.
- **Mnémonique = une image, une phrase de 6 mots au plus**, dicible par Gobi. Pas de règle
  orthographique écrite : l'enfant ne la lira pas.
- **llama.cpp est disponible** (D5, port 8001, à lancer au besoin). Il sert à **proposer**, jamais à
  décider : tout mot proposé passe le contrôle lexical et la relecture. Le contenu écrit à la main
  est souvent meilleur, et le lot a le droit de l'écrire à la main.
- **M3 est seul écrivain de `contenu/referentiel/competences.json`.** Il y ajoute les 25 codes
  nouveaux, **sans en renommer ni en supprimer aucun des 5 existants**, avec leurs `prerequis` —
  graphe acyclique, vérifié par `scripts/verifier-prerequis.mjs`.
- **Aucun aléatoire non injecté.** Ces générateurs sont des scripts de build : la graine vient de
  `ATELIER_GRAINE`, jamais de `Math.random`.

**Contrat de sortie de M3 :**

```
codes au referentiel = 30 (5 conserves a l'identique + 25 ajoutes)
graphe des prerequis acyclique = vrai (sortie de verifier-prerequis.mjs citee)
fichiers de socle phonologique = 20 (7 existants enrichis + 13 neufs)
mots distincts produits >= 430
taux de couverture lexicale CE1 : imprime, mots hors echelle nommes un par un
mots portant les deux lettres d'une paire miroir = 0
mnemoniques = 28, aucune de plus de 6 mots
```

---

### M4 — Voix du nouveau contenu

**R15 est aujourd'hui satisfaite à 100 % sur ce qui est livré** (52 / 52 consignes couvertes) **et
D42 la rendra invisiblement fausse dès que M1 et M2 écriront** : sans clip, le bouton disparaît.
Le rôle de M4 est de tenir le 100 % sur un contenu quatre fois plus gros.

**Objectif chiffré :**

| | aujourd'hui | après M1 + M2 |
|---|---|---|
| exercices | 18 | **76** |
| consignes et questions à rendre | 52 | **≥ 304** |
| clips `mot/` | 49 | **≥ 300** |
| clips totaux au manifeste | 174 | **≥ 640** |
| **couverture consignes** | **100 %** | **100 %, sans exception** |

**Règles de production, toutes déjà outillées :**

- `npm run voix` rend ce qui manque ; `scripts/rendre-voix.mjs` porte déjà les **trois remesures
  bloquantes** (fichier non vide et `ffprobe` cité, durée plausible pour le texte, transcription
  inverse ≥ `SEUIL_QC` = 0,85). **Ne pas les assouplir.**
- Un clip sous le seuil **n'entre pas au manifeste** : il est nommé, compté, absent — et D42 masque
  alors son bouton. C'est le bon comportement. Le lot **imprime la liste des refusés**.
- Sept locuteurs, attribution inchangée : `narrateur` lit les consignes, `maitresse` les énoncés de
  classe, `gobi` l'aide, un compagnon par région.
- **Le moteur reste Piper.** Motif au § 6.
- M4 est **seul écrivain de `contenu/audio/`** et de `production/voix.lock.json`.

**Contrat de sortie de M4 :**

```
consignes declarees par contenu/exercices/**  = N
consignes couvertes par un clip du manifeste  = N        (ecart = 0, imprime)
clips refuses par le controle qualite : nombre + liste nominative + motif
qcScore minimum du manifeste >= 0.85
manifeste reproductible octet a octet a horodatage fige = vrai
```

---

### M5 — Gobi, vraiment beau, et enfin à l'écran

**Le défaut central mesuré au § 1.2 n'est pas un défaut d'asset, c'est un défaut de branchement.**
La canonique est validée (D36), les 10 stades et les 5 animations sont produits en PNG, et l'écran
montre un rond framboise sans cœur de Pierre. **La première écriture de M5 est `Gobi.tsx`.**

**Objectif chiffré :**

| livrable | aujourd'hui | à produire | format | destination |
|---|---|---|---|---|
| états d'animation | 5 SVG dessinés à la main | **5 SVG dérivés de la canonique** | SVG couleur, `viewBox 0 0 200 200` | `contenu/assets/gobi/animation/` |
| stades d'évolution | 10 SVG dessinés à la main | **10 SVG dérivés de la canonique** | idem | `contenu/assets/gobi/stades/` |
| formes de graphèmes | **25 bouchons de 900 octets** | **25 cristaux réels** | PNG 1024² puis SVG `viewBox 0 0 64 64` | `production/personnages/gobi/formes/` puis `contenu/assets/gobi/formes/` |
| ce que l'écran affiche | un rond framboise en ligne | **le dessin du stade** | — | `client/src/composants/Gobi.tsx` |

**Procédure — le skill `generer-asset` et `Docs/guide-comfyui.md` font foi, en cas d'écart c'est le
guide qui tranche :**

- **Chaque déclinaison repart de `production/personnages/gobi/canonique.png`**, jamais de la
  précédente (D32, profondeur de chaîne 1). `gobi.lock.json` porte déjà, pour chaque déclinaison,
  **l'empreinte de sa source** : c'est ce qui rend la règle vérifiable après coup.
- **Les 25 formes sont le cas facile**, et le guide § 6.3 le mesure : inpainting régional par
  `personnage-cristal.api.json`, **un masque de crête dessiné une seule fois**, réutilisé 25 fois.
  Mesuré : 0,31 % de pixels modifiés hors masque, 9,4 à 16,6 s par forme. **Recomposer le résultat
  avec la canonique en se servant du masque** — la différence hors masque devient nulle par
  construction, et c'est la voie que le guide recommande.
- **Ne jamais changer le modèle, le CFG, le sampler ou la résolution pour corriger un design** :
  c'est l'erreur qui a produit 20 personnages au lieu de 20 variantes (D31).
- **Formuler ce qu'on veut voir, jamais ce qu'on veut être** (guide § 6.4) : « calme », « attentif »,
  « complice » — jamais « determined », qui a mesurablement produit un visage fâché en une passe.
- L'empreinte qui fait foi est celle **des pixels**, jamais celle du fichier (le graphe ComfyUI est
  écrit dans le PNG).
- La palette des SVG vient de `gobi.lock.json`, **mesurée sur les pixels de la canonique** ; aucune
  couleur n'est choisie à la main. Corps crème `#FFDDA8`, contour `#4B2207`, cœur `#F7C21B`.

**Invariants opposables :**

- **Le groupe `gobi-corps` est octet pour octet identique dans les 15 fichiers** qui montrent Gobi
  (D20, D28, D36). C'est déjà la règle ; M5 la maintient et la **mesure**.
- **Le cristal, et lui seul, porte la déclinaison.** Le corps ne change jamais.
- **Les 25 formes ont 25 silhouettes distinctes** — « deux formes identiques ne se
  collectionneraient pas » (D44). Recouvrement deux à deux mesuré, plafond 0,90.
- **L'évolution est irréversible** : un acquis n'est jamais repris (R14).
- Gobi est **en couleur** et ne se recolorie jamais (D29). Il ne subit **aucun** contrôle de régions
  fermées destiné aux décors.

**Contrat de sortie de M5 :**

```
fichiers montrant Gobi                                    = 15
groupes `gobi-corps` identiques octet pour octet          = 15 / 15  (empreinte imprimee)
formes de grapheme livrees                                = 25
paires de formes dont le recouvrement depasse 0.90        = 0
profondeur de chaine de declinaison maximale              = 1  (verifiee sur gobi.lock.json)
le dessin monte a l'ecran est celui du fichier du stade   = vrai (test DOM contre SVG)
coeur de Pierre present a l'ecran                         = vrai
```

---

### M6 — Les décors des six régions

**C'est le lot le plus lourd du plan, et c'est celui qui répond à « comment déterminer la
maîtresse ? ». 39 habillages sur 44 sont aujourd'hui le même fichier.**

**Objectif chiffré :**

| travail | fichiers | détail |
|---|---|---|
| bouchons à redessiner | **36** | Clairière 7 · Galeries 9 · Marais 5 · Forêt 4 · Volcan 5 · Cité 6 |
| habillages à enrichir | **3** | `ecole-place` (3 zones), `tracer-cristal` (1), `tracer-paroi` (1) |
| habillages neufs | **14** | les 14 identifiants gelés au § 2 |
| **SVG écrits par M6** | **53** | |
| **`.habillage.json` écrits par M6** | **14** | un par habillage neuf |
| **`.habillage.json` mis à jour** | **39** | centroïdes et surfaces recalculés après redessin |

Les 3 habillages du campement (`chaudron`, `page-blanche`, `vitrail-libre`) **appartiennent à M8**,
pas à M6 : le campement se juge d'un bloc.

**Ordre de priorité à l'intérieur du lot — il est opposable :**

1. **Vague 1, bloquante — les 16 bouchons que les 26 nœuds de M1 servent aujourd'hui** :
   Clairière `collier`, `guirlande`, `lianes`, `luciole`, `lucioles`, `paniers`, `veillee` ;
   Galeries `cristal`, `echo-conte`, `echos`, `frise`, `paroi-libre`, `passage`, `pierre`,
   `stalagmites`, `veine`. Plus les 3 à enrichir. **C'est ce que l'enfant voit dès demain.**
2. **Vague 2 — les 20 bouchons et les 14 neufs des quatre autres régions.**

**L'arbitrage de production, et il est tranché ici : les décors se dessinent à la main, en SVG.**

Trois faits mesurés le commandent, et aucun n'est un jugement de goût :

- **`potrace` est absent de `outils/bin/`** (mesuré). La vectorisation de l'annexe P § 3.2 n'a pas
  d'outil, et l'installer ne suffirait pas : il faudrait encore nommer chaque région une par une.
- **La porte technique de l'annexe P rejette à tort les décors** (guide § 9.3, deux faux rejets
  mesurés le même jour) : elle inonde le blanc depuis les quatre coins et suppose *un* sujet
  détouré. Un décor est une scène ouverte qui touche les bords.
- **Un décor doit porter des `id` de région stables, fermés, à centroïde et surface exacts.** Un
  identifiant peut naître, jamais mourir : une consigne qui nomme une région disparue est un état
  sans issue, et c'est le pire défaut possible ici. Une trace raster ne donne ni l'un ni l'autre.

**`ecole-v2.svg` prouve que la méthode marche** : 13 Ko, 31 régions nommées, géométrie 100 %
polygonale (`M`/`L`/`Z`, aucun arc) donc surfaces et centroïdes **calculables exactement** et
opposables aux valeurs déclarées par le `.habillage.json`. `grottes-v2.svg` le confirme sur 6
régions. **ComfyUI reste la chaîne des personnages et des objets** (M5), où la couleur et la
richesse comptent et où aucune région n'a besoin d'être fermée.

**Règles de dessin, non négociables (v2 § 9, annexe P § 2) :**

- **Trait noir sur blanc, coloriable par le code.** Fond `#FFF6E3`, régions en `#8E97A8`
  (grisaille, l'état par défaut), contour `#1B2440` à 4 px. **La couleur vient du code.**
- **Trois calques, dans cet ordre** : `calque-fond`, `calque-zones`, `calque-trait`. Chaque région
  est un **enfant direct** de `#calque-zones` — `SceneSvg.tsx` sélectionne `#calque-zones > [id]`, et
  un tracé niché dans un sous-groupe échapperait au tap sans qu'aucun message ne le dise.
- **Régions fermées par construction** : chaque `path` finit par `Z`. Vérification bloquante par
  `scripts/verifier-regions-fermees.mjs` — un trait interrompu d'un pixel fait fuiter le
  remplissage sur toute l'image.
- **Reconnaissable sans légende.** Une maîtresse a une silhouette de personne et un objet de classe
  à portée ; un arbre a un tronc et un houppier **lobé** — un disque parfait se lit « ballon », et
  `decor-reconnaissable.test.ts` mesure déjà cette rondeur. Deux régions d'un même décor n'ont
  jamais la même silhouette ni la même surface.
- **Entre 6 et 40 régions coloriables** par décor. Le plafond est un garde-fou, pas une loi : le
  guide § 9.5 mesure un coffre à 42 régions pour une image par ailleurs impeccable. Dépasser se
  signale, ne se cache pas.
- **Le décor s'agite, le texte jamais.** Aucune animation dans le champ de lecture.
- **Zéro ligne de code.** Un habillage est SVG + JSON. Si un décor demandait du code, il est mal
  conçu.

**Contrat de sortie de M6 :**

```
SVG d'habillage sous 1000 octets                          = 0   (etait 39)
SVG livres                                                = 53
habillages declares                                       = 58  (44 + 14)
regions fermees : SVG controles / SVG conformes           = imprime, ecart 0
paires de regions de meme surface dans un meme decor      = 0
paires de regions de meme silhouette dans un meme decor   = 0
centroide et surface declares vs recalcules : ecart max   < 1 unite
habillages par region : Clairiere 9 · Galeries 12 · Marais 8 · Foret 8 · Volcan 8 · Cite 10
```

---

### M7 — La carte du monde

**C'est l'élément signature (v2 § 9.4) : « l'écran qu'on ouvre en premier, celui qu'on montre à ses
parents, et la seule chose à mettre sur une capture d'écran si un jour il faut expliquer le projet
en une image ».** Aujourd'hui c'est six décagones en aplat sur un rectangle beige.

**Objectif chiffré : 1 SVG, 1 écran.**

| livrable | fichier | propriétaire |
|---|---|---|
| la carte | `contenu/habillages/carte/carte-monde-v3.svg` | M7 |
| l'écran | `client/src/ecrans/EcranCarte.tsx` | M7 |
| le pointeur de scène | `contenu/monde/regions.json` → `scene.fichier` | **M2** (M7 ne l'écrit pas) |

Ce que la v3 doit porter, et rien de moins :

1. **Un parchemin qui a l'air d'un parchemin** — bord irrégulier, grain, brûlures d'angle, pliures.
2. **Six territoires dessinés, pas six taches.** Chaque région porte les signes de son ambiance
   (v2 § 3.3) : prairie et arbre-maison pour la Clairière, entrées de grotte pour les Galeries,
   nénuphars pour le Marais, arbres roux pour la Forêt, cône et coulées pour le Volcan, tours et
   ponts de livres pour la Cité. **Reconnaissable sans lire le nom.**
3. **Les régions conquises en couleur, les autres grises sous un brouillard mouvant.** L'état
   d'affichage existe déjà côté modèle : `EtatAfficheRegion = 'voilee' | 'ouverte' | 'terminee'`
   (`partage/src/monde/carte.ts:37`). M7 lui donne trois rendus, pas trois teintes.
4. **Le chemin qui se dessine à l'encre**, segment par segment, à mesure que les Éclats tombent.
5. **Une région partiellement conquise se voit** — `pourcentageColorie` est déjà porté par
   `EtatRegion` et « le VIDE restant est ce que la carte donne à voir » (D25 point 3).

**Ce qui ne bouge pas, et c'est opposable :**

- **Les six `id`, dans le même ordre.** L'ordre EST la progression phonologique.
- **Les six centres de marqueur, à l'unité près** : `(190,640) (450,460) (240,240) (620,150)
  (900,340) (1020,630)`. `EcranCarte.tsx` porte les mêmes six ancres, et
  `tests/unitaires/ids-regions-stables.test.ts` compare les deux fichiers marqueur à marqueur.
  Les déplacer décalerait le tap du dessin — un défaut qui ne se voit qu'à l'usage.
- **Les cinq segments du chemin, aux mêmes points de passage.**
- **`viewBox` `0 0 1200 800`.**
- **Le voile de grisaille est appliqué par le client**, jamais par une teinte différente dans le
  fichier.
- **D46** : partir en sortie doit rester à **un tap** depuis l'ouverture. La carte ne gagne aucun
  écran intermédiaire, aucune animation d'entrée bloquante.
- **R16** : les six marqueurs restent des cibles ≥ 64 px avec 24 px de tolérance.

**Contrat de sortie de M7 :**

```
identifiants de region et leur ordre : identiques a carte-monde-v2.svg      = 6 / 6
centres de marqueur : ecart a carte-monde-v2.svg                            = 0 unite
segments du chemin et leurs points de passage : identiques                  = 5 / 5
regions dont la silhouette porte au moins un signe d'ambiance nomme         = 6 / 6
etats de rendu distincts (voilee / ouverte / terminee)                      = 3
taps pour partir en sortie depuis l'ouverture                               <= 1
cible tapable minimale des marqueurs                                        >= 64 px
```

---

### M8 — Le campement et l'habillage général

**D45 est un pari qu'on n'a jamais joué.** Le père n'a pas compris le campement ; l'arbitrage dit
que le motif est l'asset bouchon, pas le concept, et qu'il faut **rejuger une fois le graphisme
refait, pas avant**. M8 est ce qui rend le jugement possible.

**Objectif chiffré :**

| livrable | fichiers | contrainte |
|---|---|---|
| le campement | `contenu/habillages/campement/campement.svg` | **30 régions fermées**, `id` identiques à `campement.json` **à la lettre**, chacune occupant exactement sa `zone` |
| les 3 habillages de coloriage libre | `chaudron.svg`, `page-blanche.svg`, `vitrail-libre.svg` + leurs `.habillage.json` | ≥ 12 régions chacun (aujourd'hui 6 rectangles) |
| l'étagère à cases vides | `client/src/ecrans/EcranCoffre.tsx` | D44 : les emplacements non gagnés sont **en creux et visibles** |
| l'habillage général | `client/src/styles/global.css` | trait, palette, boutons, étoiles, transitions |
| les récompenses | `client/src/composants/Etoiles.tsx`, `CascadeRecompense.tsx`, `JaugePalier.tsx`, `Particules.tsx` | même trait épais, même palette |

**R11 est déjà tenue sur le papier** — 30 points déclarés pour 25 exigés, dont 10 animations uniques
et 6 répliques vocales — **et invisible à l'écran**, parce que les 30 points sont des triangles,
des cercles et des carrés de 80 unités en grille régulière. M8 leur donne une forme : une tente a
un mât et un pan de toile, un feu a des bûches et des flammes, un chaudron a une anse.

**Contraintes opposables :**

- **D46, point 1 — le campement n'est JAMAIS sur le chemin obligatoire vers le jeu.** Depuis
  l'ouverture, partir en sortie se fait en un tap sans traverser le hub. M8 ne peut rien ajouter
  qui allonge ce chemin, et **aucun écran intermédiaire obligatoire nulle part**.
- **D46, point 2 — mais le campement récompense celui qui s'attarde.** Il est offert, jamais imposé.
- **R16** — toute cible ≥ 64 px, tolérance 24 px. Les zones de `campement.json` font 96 × 96 :
  le dessin les remplit, il ne les rétrécit pas.
- **D29** — le campement ne se recolorie pas : aplats en couleur, et non trait noir sur blanc. C'est
  déjà ce que sa `<desc>` déclare, et c'est juste.
- **Palette v2 § 9.2 sans exception.** `--trait` et `--parchemin` **ne se surchargent jamais** — le
  schéma d'habillage les exclut déjà de `propertyNames`. L'erreur n'a pas de couleur dédiée : elle
  est un mouvement, pas une teinte.
- **L'étagère montre le manque.** « Ce qui motive, c'est de voir la case suivante encore vide »
  (D25, D44). Les 25 cases existent déjà côté modèle — `partage/src/monde/etagere.ts` porte
  `CaseEtagere`, `Etagere` et `construireEtagere`. M8 les dessine, il ne les réinvente pas.

**Contrat de sortie de M8 :**

```
regions du campement.svg                                        = 30
ids du SVG identiques a ceux de campement.json                  = 30 / 30, ecart 0
regions dont la silhouette est un triangle, un cercle ou un carre nu = 0  (etait 30)
recouvrement dessin / zone declaree, par point                   >= 90 %
points d'interaction gratuits                                    >= 25   (R11)
animations uniques                                               >= 10   (R11)
repliques vocales                                                >= 6    (R11)
taps entre l'ouverture et une sortie                             <= 1    (D46)
cases vides visibles sur l'etagere                               = 25 - formes obtenues
```

---

## 3. Les interfaces partagées — code exact et chemin

**Constat qui vaut d'être écrit : les huit lots ne demandent presque aucune interface nouvelle.**
C'est la preuve que l'axe *moteur × habillage × contenu* tient, et que « zéro ligne de code pour
ajouter un habillage » (v2 § 7) est vrai dans ce dépôt. Les quatorze types de contenu ci-dessous
**existent déjà et ne se modifient pas** : M1, M2 et M3 les remplissent, ils ne les négocient pas.

### 3.1 Les types communs — `partage/src/identifiants.ts`

```ts
export type IdNoeud = string;
export type IdExercice = string;
export type IdRegionSvg = string;
export type IdConsigne = string;
export type CheminAsset = string;
```

### 3.2 L'enveloppe d'un exercice — `partage/src/contenu/types.ts`

Contrat identique au JSON Schema `contenu/schemas/exercice.schema.json`, qui fait foi à la
validation. Champs obligatoires : `id`, `version`, `titre`, `competences` (≥ 1, motif
`^(gph|syl|mot\.outil|lex|flu|comp|enc)\.[a-z0-9.\-]+$`), `difficulte` (1 à 5), `jeu`. Le bloc `jeu`
exige `moteur`, `habillage`, `noeud`, `etoiles`, `aideGobi` (≥ 1 parmi `relire-consigne`,
`souffle-syllabe`, `surligne-graphene`, `montre-cible`, `montre-couleur`) et `contenu`.

```ts
export type TempsNoeud = 'presentation' | 'developpement' | 'retournement' | 'maitrise';
export interface OrigineExercice {          // à renseigner dès qu'une fiche du corpus est la source
  readonly source: string;                  // ex. "fiches-origine/NIVEAU 4.pdf"
  readonly niveau: number;                  // 1 à 7
  readonly fiche: number;                   // 1 à 15
}
```

### 3.3 La forme d'une consigne — `partage/src/moteurs/colorie/types.ts`

**C'est le type le plus structurant du contenu, et il porte à lui seul l'observation F3 des fiches
d'origine.** `forme: 'affirmative'` désigne une phrase qui *a la forme d'un constat mais vaut
consigne* (« Le pull de la maîtresse est bleu »). Sur les 79 consignes du niveau 1, `le` (23),
`la` (19) et `les` (9) dominent `dessine` (7) et `colorie` (1). **Transformer toutes les consignes
en impératifs appauvrirait l'exercice** : M1 et M2 conservent le mélange.

```ts
export type FormeConsigne = 'imperative' | 'affirmative';
```

`audio` vaut `null` partout : la résolution passe par `contenu/audio/manifeste.json`, clé
`<idExercice>/<idConsigne>`. `motsCles` porte les mots que l'aide de Gobi peut surligner.

### 3.4 Les quatorze contenus de moteur — chemin, puis code exact

`contenu` du bloc `jeu` est typé par moteur. Aucun de ces fichiers n'est modifié par un lot de ce
plan.

**`partage/src/moteurs/attrape/types.ts`**
```ts
export type IdCibleAttrape = string;
export interface CibleAttrape {
  readonly id: IdCibleAttrape;
  readonly libelle: string;
  readonly bonne: boolean;
  readonly asset: CheminAsset | null;
  readonly depart: readonly [number, number];
  readonly taille: readonly [number, number];
  readonly confusionAvec: string | null;
}
export interface ConsigneAttrape {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly aAttraper: readonly IdCibleAttrape[];
  readonly motsCles: readonly string[];
}
export interface ContenuAttrape {
  readonly consignes: readonly ConsigneAttrape[];
  readonly cibles: readonly CibleAttrape[];
  readonly competence: string;
}
```

**`partage/src/moteurs/tri/types.ts`**
```ts
export type IdElementTri = string;
export type IdReceptacle = string;
export interface ReceptacleTri {
  readonly id: IdReceptacle;
  readonly libelle: string;
  readonly critere: string;
  readonly zone: readonly (readonly [number, number])[];
}
export interface ElementTri {
  readonly id: IdElementTri;
  readonly libelle: string;
  readonly asset: CheminAsset | null;
  readonly receptacleAttendu: IdReceptacle;
  readonly confusionAvec: string | null;
}
export interface ConsigneTri {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly aRanger: readonly IdElementTri[];
  readonly motsCles: readonly string[];
}
export interface ContenuTri {
  readonly consignes: readonly ConsigneTri[];
  readonly receptacles: readonly ReceptacleTri[];
  readonly elements: readonly ElementTri[];
  readonly competence: string;
}
```

**`partage/src/moteurs/assemble/types.ts`**
```ts
export type IdBloc = string;
export interface BlocSyllabe {
  readonly id: IdBloc;
  readonly libelle: string;
  readonly intrus: boolean;
  readonly confusionAvec: string | null;
}
export interface ConsigneAssemble {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly mot: string;
  readonly solution: readonly IdBloc[];
  readonly motsCles: readonly string[];
}
export interface ContenuAssemble {
  readonly consignes: readonly ConsigneAssemble[];
  readonly blocs: readonly BlocSyllabe[];
  readonly competence: string;
}
```

**`partage/src/moteurs/chemin/types.ts`**
```ts
export type IdCase = string;
export interface CaseChemin {
  readonly id: IdCase;
  readonly libelle: string;
  readonly position: readonly [number, number];
  readonly voisines: readonly IdCase[];
  readonly confusionAvec: string | null;
}
export interface ConsigneChemin {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly depart: IdCase;
  readonly parcours: readonly IdCase[];
  readonly motsCles: readonly string[];
}
export interface ContenuChemin {
  readonly consignes: readonly ConsigneChemin[];
  readonly cases: readonly CaseChemin[];
  readonly competence: string;
}
```

**`partage/src/moteurs/eclair/types.ts`**
```ts
export type IdOptionEclair = string;
export interface OptionEclair {
  readonly id: IdOptionEclair;
  readonly libelle: string;
  readonly bonne: boolean;
  readonly confusionAvec: string | null;
}
export interface ConsigneEclair {
  readonly id: IdConsigne;
  readonly mot: string;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly expositionMs: number;
  readonly options: readonly IdOptionEclair[];
  readonly reponse: IdOptionEclair;
  readonly motsCles: readonly string[];
}
export interface ContenuEclair {
  readonly consignes: readonly ConsigneEclair[];
  readonly options: readonly OptionEclair[];
  readonly competence: string;
}
```

**`partage/src/moteurs/paires/types.ts`**
```ts
export type IdCarte = string;
export type IdPaire = string;
export type FaceCarte = 'mot' | 'image';
export interface CartePaires {
  readonly id: IdCarte;
  readonly libelle: string;
  readonly face: FaceCarte;
  readonly asset: CheminAsset | null;
  readonly paire: IdPaire;
}
export interface ConsignePaires {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly aApparier: readonly IdPaire[];
  readonly motsCles: readonly string[];
}
export interface ContenuPaires {
  readonly consignes: readonly ConsignePaires[];
  readonly cartes: readonly CartePaires[];
  readonly competence: string;
}
```

**`partage/src/moteurs/phrase/types.ts`**
```ts
export type IdEtiquette = string;
export interface EtiquettePhrase {
  readonly id: IdEtiquette;
  readonly mot: string;
  readonly intrus: boolean;
}
export interface ConsignePhrase {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly phrase: string;
  readonly ordre: readonly IdEtiquette[];
  readonly motsCles: readonly string[];
}
export interface ContenuPhrase {
  readonly consignes: readonly ConsignePhrase[];
  readonly etiquettes: readonly EtiquettePhrase[];
  readonly competence: string;
}
```

**`partage/src/moteurs/histoire/types.ts`** — le type de la Cité des Histoires
```ts
export type IdOptionHistoire = string;
export interface OptionHistoire {
  readonly id: IdOptionHistoire;
  readonly libelle: string;
  readonly confusionAvec: string | null;
}
export interface QuestionHistoire {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly audio: CheminAsset | null;
  readonly options: readonly IdOptionHistoire[];
  readonly reponse: IdOptionHistoire;
  readonly motsCles: readonly string[];
}
export interface ContenuHistoire {
  readonly titre: string;
  readonly recit: string;
  readonly audioRecit: CheminAsset | null;
  readonly questions: readonly QuestionHistoire[];
  readonly options: readonly OptionHistoire[];
  readonly competence: string;
}
```

**`partage/src/moteurs/chrono/types.ts`**
```ts
export type IdVignette = string;
export interface VignetteChrono {
  readonly id: IdVignette;
  readonly libelle: string;
  readonly asset: CheminAsset | null;
  readonly taille: readonly [number, number];
}
export interface ConsigneChrono {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly recit: string;
  readonly ordre: readonly IdVignette[];
  readonly motsCles: readonly string[];
}
export interface ContenuChrono {
  readonly consignes: readonly ConsigneChrono[];
  readonly vignettes: readonly VignetteChrono[];
  readonly competence: string;
}
```

**`partage/src/moteurs/grave/types.ts`**
```ts
export type IdTrou = string;
export interface TrouGrave {
  readonly id: IdTrou;
  readonly position: number;
  readonly attendu: string;
}
export interface ConsigneGrave {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly mot: string;
  readonly trous: readonly TrouGrave[];
  readonly motsCles: readonly string[];
}
export interface ContenuGrave {
  readonly consignes: readonly ConsigneGrave[];
  readonly clavier: readonly string[];
  readonly competence: string;
}
```

**`partage/src/moteurs/colorie/types.ts`**
```ts
export interface CibleColorie {
  readonly region: IdRegionSvg;
  readonly couleur: CouleurColoriage;
}
export interface ConsigneColorie {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly cibles: readonly CibleColorie[];   // une consigne PEUT porter plusieurs couples (F3)
  readonly motsCles: readonly string[];
}
export interface ContenuColorie {
  readonly consignes: readonly ConsigneColorie[];
  readonly nuancierAutorise: readonly CouleurColoriage[];
}
```

**`partage/src/moteurs/libre/types.ts`**
```ts
export interface ContenuLibre {
  readonly regions: readonly IdRegionSvg[];
  readonly nuancierAutorise: readonly CouleurColoriage[];
  readonly competence: string;
}
```

**`partage/src/moteurs/place/types.ts`** — le moteur qui couvre les 7 consignes « Dessine… » (F1)
```ts
export type IdZoneCible = string;
export type RelationSpatiale =
  | 'dans' | 'sur' | 'sous' | 'a-cote-de'
  | 'devant' | 'derriere' | 'entre' | 'au-dessus' | 'en-dessous';
export interface ZoneCible {
  readonly id: IdZoneCible;
  readonly libelle: string;
  readonly polygone: Polygone;
  readonly centroide: Point;
  readonly relation: RelationSpatiale;
  readonly ancre: string | null;
}
export interface ElementPlacable {
  readonly id: IdElement;
  readonly libelle: string;
  readonly asset: CheminAsset;
  readonly taille: readonly [number, number];
}
export interface DepotAttendu {
  readonly element: IdElement;
  readonly zone: IdZoneCible;
}
export interface ConsignePlace {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  readonly depots: readonly DepotAttendu[];
  readonly motsCles: readonly string[];
}
export interface ContenuPlace {
  readonly consignes: readonly ConsignePlace[];
  readonly zones: readonly ZoneCible[];
  readonly reserve: readonly ElementPlacable[];
}
```

**`partage/src/moteurs/trace/types.ts`** — le geste d'écriture (O11, D23 conséquence 2)
```ts
export type CasseLettre = 'minuscule' | 'majuscule' | 'cursive';
export interface TraitLettre {
  readonly id: IdTrait;
  readonly ordre: number;
  readonly chemin: string;
  readonly points: readonly Point[];
  readonly depart: Point;
  readonly arrivee: Point;
  readonly libelle: string;
}
export interface ModeleLettre {
  readonly lettre: string;
  readonly casse: CasseLettre;
  readonly viewBox: string;
  readonly axeRisque: AxeMiroir | null;   // jamais les deux axes à la fois (D23)
  readonly traits: readonly TraitLettre[];
}
export interface ContenuTrace {
  readonly lettres: readonly ModeleLettre[];
  readonly paire: PaireMiroir | null;
  readonly consigne: string;
  readonly audio: CheminAsset | null;
  readonly consigneId: IdConsigne;
}
```

### 3.5 Les types du monde — déjà là, aucun lot ne les modifie

`partage/src/monde/types.ts` et `partage/src/monde/carte.ts` portent tout ce dont M5, M7 et M8 ont
besoin. **Aucun n'est à créer.**

```ts
export type CodeStadeGobi =                    // 10 membres depuis D43
  | 'oeuf' | 'fissure' | 'boule' | 'premier-cristal' | 'crete'
  | 'couronne' | 'equipe' | 'besace' | 'veilleur' | 'gardien';
export type EtatAnimationGobi = 'repos' | 'joie' | 'aide' | 'hesitation' | 'apparition';
export type CodeReaction = 'animation' | 'replique' | 'son' | 'aucune';
export type EtatAfficheRegion = 'voilee' | 'ouverte' | 'terminee';   // les trois rendus de M7

export interface EtatRegion {
  readonly region: CodeRegion;
  readonly ordre: number;
  readonly ouverte: boolean;
  /** 0 à 1. Le VIDE restant est ce que la carte donne à voir (D25, point 3). */
  readonly pourcentageColorie: number;
  readonly eclatObtenuLe: Horodatage | null;
  readonly compagnon: CodeCompagnon | null;
  readonly noeuds: readonly IdNoeud[];
}
```

L'étagère de D44 existe déjà — `partage/src/monde/etagere.ts` porte `CaseEtagere`, `Etagere`,
`CatalogueFormes` et `construireEtagere`. **M8 dessine les cases, il ne les réinvente pas.**

### 3.6 La seule interface NOUVELLE de ce plan — `partage/src/contenu/phonologie.ts`

**Propriétaire : M3, et lui seul.** Motif : les sept brouillons de `contenu/brouillons/phonologie/`
ont sept formes différentes (`items`, `paires`, `motsA`/`motsB`, `consonnes`/`voyelles`), aucune
typée. Treize fichiers de plus sans forme commune rendraient M1 et M2 illisibles.

```ts
/** Une unité phonologique enseignable : un graphème, une syllabe, ou un mot outil. */
export type NatureUnite = 'grapheme' | 'syllabe' | 'mot-outil' | 'mot' | 'paire';

export interface Mnemonique {
  /** Six mots au plus. Dicible par Gobi, jamais une règle orthographique écrite. */
  readonly phrase: string;
  /** L'image qui la porte, ou `null` tant qu'aucun asset ne l'illustre. */
  readonly asset: CheminAsset | null;
}

export interface UnitePhonologique {
  readonly forme: string;
  readonly nature: NatureUnite;
  /** Les mots où l'unité se rencontre. Tous passés au contrôle de couverture CE1. */
  readonly motsPorteurs: readonly string[];
  /** L'autre membre d'une paire minimale, quand il y en a un. */
  readonly opposeA: string | null;
  readonly mnemonique: Mnemonique | null;
}

export interface SoclePhonologique {
  /** `brouillon-non-jouable` tant que la relecture parent n'a pas eu lieu (annexe P § 6.4). */
  readonly statut: 'brouillon-non-jouable' | 'valide';
  readonly region: CodeRegion;
  readonly unite: string;
  readonly rang: number;
  readonly libelle: string;
  /** Le code du référentiel que ce socle alimente. Toujours l'un des 30. */
  readonly competence: string;
  readonly items: readonly UnitePhonologique[];
  /** REMESURÉ par le générateur, jamais affirmé. Le lot échoue si l'écart est non nul. */
  readonly compte: Readonly<Record<string, number>>;
  /** Taux de couverture lexicale CE1, et les mots hors échelle NOMMÉS un par un. */
  readonly couvertureCE1: { readonly taux: number; readonly horsEchelle: readonly string[] };
  readonly aFaireALaMain: readonly string[];
}
```

---

## 4. L'arborescence complète — chaque fichier et son lot propriétaire

**Un fichier, un lot. Aucune case n'est vide, aucune n'en porte deux.**

### 4.1 Contenu pédagogique

| chemin | lot | action |
|---|---|---|
| `contenu/exercices/clairiere/*.json` | **M1** | 3 réécrits, 6 créés → 12 |
| `contenu/exercices/galeries/*.json` | **M1** | 6 réécrits, 2 créés → 14 |
| `contenu/noeuds/clairiere-0{7..9},1{0..2}.json` | **M1** | 6 créés |
| `contenu/noeuds/galeries-1{3,4}.json` | **M1** | 2 créés |
| `contenu/exercices/marais-jumeau/*.json` | **M2** | 12 créés |
| `contenu/exercices/foret-muette/*.json` | **M2** | 12 créés |
| `contenu/exercices/volcan/*.json` | **M2** | 12 créés |
| `contenu/exercices/cite-des-histoires/*.json` | **M2** | 14 créés |
| `contenu/noeuds/marais-jumeau-*.json` | **M2** | 12 créés |
| `contenu/noeuds/foret-muette-*.json` | **M2** | 12 créés |
| `contenu/noeuds/volcan-*.json` | **M2** | 12 créés |
| `contenu/noeuds/cite-des-histoires-*.json` | **M2** | 14 créés |
| **`contenu/monde/regions.json`** | **M2** | nœuds et compétences des **six** régions |
| `contenu/brouillons/niveau-{2..6}/fiche-*.json` | **M2** | 75 fiches passées à `valide`, corrigé consigné |
| **`contenu/referentiel/competences.json`** | **M3** | 5 conservés + 25 ajoutés |
| `contenu/brouillons/phonologie/**` | **M3** | 7 enrichis + 13 créés |
| `partage/src/contenu/phonologie.ts` | **M3** | créé |
| `scripts/generer-phonologie.mjs` | **M3** | étendu aux 5 régions |

### 4.2 Voix

| chemin | lot |
|---|---|
| `contenu/audio/**` (clips + `manifeste.json`) | **M4** |
| `production/voix.lock.json` | **M4** |
| `scripts/rendre-voix.mjs`, `scripts/qc-voix.mjs`, `scripts/recenser-textes.mjs` | **M4** |

### 4.3 Gobi

| chemin | lot |
|---|---|
| `contenu/assets/gobi/animation/*.svg` (5) | **M5** |
| `contenu/assets/gobi/stades/*.svg` (10) | **M5** |
| `contenu/assets/gobi/formes/*.svg` (25) | **M5** |
| `contenu/assets/gobi/cristal-base.svg` | **M5** |
| `contenu/monde/gobi-stades.json` | **M5** |
| `production/personnages/gobi/**` (PNG, masque, `gobi.lock.json`) | **M5** |
| `scripts/decliner-gobi.mjs` | **M5** |
| **`client/src/composants/Gobi.tsx`** | **M5** |
| `contenu/assets/gobi/stade-{1..5}-*.svg` (archivés) | **personne** — intacts, registre |

### 4.4 Décors

| chemin | lot |
|---|---|
| `contenu/habillages/clairiere/**` | **M6** |
| `contenu/habillages/galeries/**` | **M6** |
| `contenu/habillages/marais-jumeau/**` | **M6** |
| `contenu/habillages/foret-muette/**` | **M6** |
| `contenu/habillages/volcan/**` | **M6** |
| `contenu/habillages/cite-des-histoires/**` | **M6** |
| `contenu/habillages/carte/carte-monde-v3.svg` | **M7** |
| `client/src/ecrans/EcranCarte.tsx` | **M7** |
| `contenu/habillages/campement/**` | **M8** |
| `client/src/ecrans/EcranCampement.tsx`, `EcranCoffre.tsx` | **M8** |
| `client/src/styles/global.css` | **M8** |
| `client/src/composants/{Etoiles,CascadeRecompense,JaugePalier,Particules}.tsx` | **M8** |
| `contenu/habillages/ouverture/*.svg` | **personne** — hors périmètre, voir § 6 |
| `contenu/habillages/{carte/carte-monde.svg, carte/carte-monde-v2.svg, clairiere/ecole.svg, galeries/grottes.svg}` | **personne** — archivés au registre, intacts |

### 4.5 Ce qu'aucun lot n'écrit — et c'est une règle, pas un oubli

`Docs/la-pierre-des-mots-specs-v2.md` · `Docs/annexe-T-strategie-de-test.md` ·
`Docs/annexe-P-production-et-agent.md` · `Docs/addendum-animation-et-brief-de-reprise.md` ·
`Docs/journal-des-decisions.md` · `production/style.txt` · `production/workflows/*.api.json` ·
`donnees/pierre.db` (copie dans `donnees/sauvegardes/` avant toute remise à zéro) ·
tout fichier de `tests/` que la campagne super-QA tient encore.

**Chaque lot consigne ses arbitrages en fin de `Docs/questions-en-attente.md`**, section à son nom.

---

## 5. Les frontières entre lots — les six qui pourraient déraper

1. **M1 et M2 partagent `contenu/monde/regions.json`.** → **M2 est seul écrivain.** Les 26
   identifiants de nœud de M1 sont gelés au § 2 ; M2 les inscrit sans les demander. C'est le
   défaut N7/N8 exactement — cinq nœuds écrits, validés et invisibles sur la carte — et il ne se
   reproduit pas parce que la liste est écrite avant, une fois, à un seul endroit.
2. **M1, M2 et M3 partagent le référentiel de compétences.** → **M3 est seul écrivain.** Les 30
   codes sont gelés au § 2 ; M1 et M2 les citent dès leur première écriture. Aucun lot n'invente un
   code — `tests/unitaires/carte.test.ts` échoue si une région en cite un absent.
3. **M2 dépend de 14 habillages que M6 produit.** → Les 14 identifiants sont gelés au § 2, avec leur
   région et leur moteur. M2 écrit `"habillage": "marais.grenouilles"` avant que le SVG existe ;
   `npm run test:contenu` rougit tant que M6 n'a pas livré, **et c'est le bon comportement** — la
   chaîne dit la vérité plutôt que d'être verte à bon compte (D39).
4. **M4 dépend de tout le texte de M1 et M2.** → M4 passe **après** eux, sur la liste réelle des
   consignes déposées. Il ne devine aucun texte. Si son contrat de sortie mesure un écart non nul,
   c'est que M1 ou M2 a déposé après lui : il relance, il n'ajuste pas son chiffre.
5. **M5 et M8 touchent tous deux au client.** → M5 possède `Gobi.tsx` seul ; M8 possède les écrans
   et le style. Ils ne se croisent pas.
6. **La campagne super-QA écrit peut-être encore dans `tests/`.** → **Aucun lot de ce plan ne
   possède un fichier de `tests/`.** Un lot qui a besoin d'un test le **demande à l'orchestrateur**
   plutôt que d'écrire dans le répertoire d'un autre. Et la compilation reste à l'orchestrateur :
   jeton unique, aucun agent ne compile.

---

## 6. Ce qui est repoussé, et pourquoi — écrit, pas tu

**Le niveau 1 du corpus (15 fiches, 75 consignes, 90 affirmations).** Chaque fiche demande son
propre décor SVG à régions nommées, soit **15 décors de plus** que M6 ne peut pas absorber par-dessus
ses 53. Une fiche du niveau 1 sans son décor est un exercice `colorie` dont les cibles ne désignent
rien. Le seul exemple livré, `clairiere-ecole-01`, aura coûté `ecole-v2.svg` et ses 31 régions.
**Repoussé jusqu'à ce que M6 soit livré et mesuré.**

**Le niveau 7 (15 fiches, rédaction libre) — point ouvert O7.** Aucune validation automatique
possible : le manifeste d'ingestion les compte déjà `fichesRefusees: 15, motif format-non-tranche`.
Les trois voies — LLM juge local, validation parent différée, transformation en phrase à trou façon
niveau 6 — sont trois conceptions différentes, et **l'arbitrage appartient au père**, pas à un lot.
Consigné en question ouverte.

**Les quatre compagnons.** `contenu/monde/compagnons.json` déclare `assets/compagnons/{filou,roc,
plume,bulle}.svg` ; le répertoire `contenu/assets/compagnons/` **n'existe pas**, et `Compagnon.tsx`
dessine un `<path>` en ligne. Les produire demanderait **quatre choix humains de design** : D7 est
formel, « aucun design n'est figé sans accord explicite », et D31 a mesuré ce que coûte de sauter
cette étape — cinq séries, vingt personnages au lieu de vingt variantes. **Aucun lot ne peut
s'accorder ce que seul le père accorde.** À rouvrir une fois Gobi montré et jugé : la canonique de
Gobi servira alors de référence de style, ce qu'aucune des cinq séries n'avait.

**Les cinq tableaux de la séquence d'ouverture** (`contenu/habillages/ouverture/*.svg`, 2,0 à
2,7 Ko). Ce sont des bouchons, mais **la séquence d'ouverture est vue une fois** (D35,
`passableDesMs: 0`). À 53 décors devant lui, M6 ne dépense pas son budget sur l'écran le moins
rejoué du jeu. Repoussé après M6, avec sa raison.

**Le changement de moteur de synthèse vocale.** D41 prescrit Chatterbox ou XTTS-v2, Piper étant le
repli. **Mesuré : Piper tient 174 clips sur 174 au-dessus du seuil de contrôle qualité, 161 à 1,0.**
Changer de moteur au milieu d'une campagne qui multiplie le contenu par quatre obligerait à
**re-rendre les 174 clips existants** pour que la voix reste homogène, pour un gain qu'aucune mesure
de ce dépôt n'établit. La porte reste ouverte — changer de moteur ne change aucune interface.

**La vectorisation par `potrace`.** Absent de `outils/bin/` (mesuré), et rendu sans objet par
l'arbitrage de M6 : les décors se dessinent à la main. D4 l'autorise toujours ; il n'est simplement
plus sur le chemin.

**Les captures visuelles de référence.** `test:visuel` reste rouge **par décision** (D39) : le décor
et Gobi sont précisément ce que M5, M6, M7 et M8 refont. Les figer maintenant serait les refaire
aussitôt. **Aucun lot ne lance `test:visuel -- --maj` de sa propre initiative** — c'est une règle
dure de CLAUDE.md, et la levée passe par les yeux du père.

**« Quand tout est terminé, rejouer ou réviser ? »** La carte renvoie aujourd'hui sur le *premier*
nœud de la région conquise ; le Leitner sait déjà quelles compétences sont dues. Une sortie
« révision » serait pédagogiquement meilleure — et ce serait **inventer une règle que rien dans
`Docs/` ne porte**. Question ouverte, pas travail de lot.

---

## 7. Contrat de sortie du plan — les chiffres mesurés, et ceux à atteindre

**Mesuré le 2026-08-02 sur le commit `6107861`.** Chaque ligne sort d'une commande exécutée, aucune
n'est reprise d'un document.

| Grandeur | Mesuré | À atteindre | Lot |
|---|---|---|---|
| Exercices, La Clairière | **6** | **12** | M1 |
| Exercices, Les Galeries | **12** | **14** | M1 |
| Exercices, Le Marais Jumeau | **0** | **12** | M2 |
| Exercices, La Forêt Muette | **0** | **12** | M2 |
| Exercices, Le Volcan | **0** | **12** | M2 |
| Exercices, La Cité des Histoires | **0** | **14** | M2 |
| **Exercices, total** | **18** | **76** | M1 + M2 |
| Nœuds, par région | **6 · 12 · 0 · 0 · 0 · 0** | **12 · 14 · 12 · 12 · 12 · 14** | M1 + M2 |
| **Nœuds, total** | **18** | **76** | M1 + M2 |
| **Régions vides** | **4 sur 6** | **0 sur 6** | M2 |
| **Exercices PLACEHOLDER** | **9 sur 18** | **0 sur 76** | M1 |
| Régions déclarant `competences: []` | **4 sur 6** | **0 sur 6** | M2 |
| Codes au référentiel de compétences | **5** | **30** | M3 |
| Codes portés par 0 exercice | **1** (`gph.miroir.haut-bas`) | **0** | M1 |
| Consignes et questions déclarées | **52** | **≥ 304** | M1 + M2 |
| Fiches du corpus ingérées | **90 sur 105** | 90 | — |
| **Fiches du corpus exploitées** | **2** | **≥ 16** | M2 |
| Fichiers de socle phonologique | **7** | **20** | M3 |
| Mots distincts au socle | **≈ 120** | **≥ 430** | M3 |
| **Couverture audio des consignes** | **52 / 52 — 100 %** | **≥ 304 / 304 — 100 %** | M4 |
| Clips au manifeste | **174** | **≥ 640** | M4 |
| **Habillages bouchons** (SVG < 1 Ko) | **39 sur 44** | **0 sur 58** | M6 + M8 |
| Habillages présentables | **2** (`ecole-v2`, `grottes-v2`) | **58** | M6 + M8 |
| Habillages déclarés | **44** | **58** | M6 |
| SVG de décor à écrire | — | **53** (M6) **+ 4** (M8) | M6, M8 |
| Formes de graphème de Gobi | **25 bouchons de 900 o** | **25 cristaux réels** | M5 |
| Stades de Gobi à l'écran | **1 rond framboise en ligne** | **10 dessins dérivés de la canonique** | M5 |
| Cœur de Pierre visible à l'écran | **non** | **oui** | M5 |
| Assets de compagnon déclarés / présents | **4 / 0** | repoussé, motif § 6 | — |
| Régions du campement reconnaissables | **0 sur 30** | **30 sur 30** | M8 |
| Régions dessinées sur la carte | **0 sur 6** (six aplats) | **6 sur 6** | M7 |

**Les huit lots sont non vides, et voici le volume que chacun porte :**

| lot | fichiers écrits | grandeur qui le résume |
|---|---|---|
| **M1** | 17 exercices + 8 nœuds = **25** | 26 nœuds jouables dans les deux régions ouvertes, 0 PLACEHOLDER |
| **M2** | 50 exercices + 50 nœuds + `regions.json` + 75 fiches = **176** | 4 régions vides → 4 régions à 12-14 nœuds |
| **M3** | 20 socles + `competences.json` + 1 type + 1 script = **23** | 5 codes → 30, ≈ 120 mots → ≥ 430 |
| **M4** | ≈ 470 clips + manifeste + verrou = **≈ 472** | couverture audio maintenue à 100 % sur 4 × plus de texte |
| **M5** | 40 SVG + 25 PNG + masque + verrou + `Gobi.tsx` = **≈ 68** | le Gobi validé par le père atteint enfin l'écran |
| **M6** | 53 SVG + 53 `.habillage.json` = **106** | 39 bouchons → 0, 44 habillages → 58 |
| **M7** | 1 SVG + 1 écran = **2** | une liste de boutons → une carte au trésor |
| **M8** | 4 SVG + 3 JSON + 6 fichiers client = **13** | 30 formes géométriques → 30 objets, l'étagère montre le manque |

**Total : ≈ 885 fichiers écrits ou réécrits, dont 58 nœuds neufs, 58 exercices neufs, 57 décors et
40 dessins de Gobi.**

---

## 8. Ce que ce plan n'a PAS mesuré — à traiter comme non su

- **Le temps réel d'un lot.** Aucun des huit n'a été exécuté ; les volumes sont des comptages de
  fichiers, pas des durées.
- **La tenue de R13 sur une sortie réellement tirée par le sélecteur.** Le contrat impose « 6
  habillages distincts par fenêtre de 6 nœuds consécutifs », ce qui suppose que le sélecteur
  parcourt les nœuds dans l'ordre. **C'est une hypothèse, pas une mesure.** Le premier lot qui livre
  une région complète la vérifie sur un journal rejoué, et signale l'écart s'il en trouve un.
- **Le rendement réel des 90 fiches.** L'estimation « ≥ 16 fiches exploitées » suppose qu'une fiche
  donne en moyenne 4 à 5 items utilisables après production du corrigé. Le premier lot de la Cité
  mesure le taux réel et **corrige la cible plutôt que de la forcer**.
- **Le coût GPU des 25 formes de Gobi.** Le guide mesure 9,4 à 16,6 s par inpainting sur **deux**
  crêtes. Vingt-cinq n'a pas été exécuté.
- **`decor-reconnaissable.test.ts` sur 53 décors.** Il tourne aujourd'hui sur 2. Que ses seuils —
  rondeur < 0,85 pour un arbre, > 0,95 pour un ballon — tiennent sur cinquante-trois est une
  espérance, pas un résultat.
- **Que le père comprenne le campement une fois redessiné.** D45 le dit : « à rejuger une fois le
  graphisme refait, et pas avant ». **M8 rend le jugement possible ; il ne le rend pas favorable.**
