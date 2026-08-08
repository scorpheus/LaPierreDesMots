# Décision — la mise en scène de `phrase` portée (ou non) à `libre` et `trace`, et R49 (doublon de consigne)

Fichier **nouveau** (CLAUDE.md : les quatre documents de référence ne se modifient pas sans
validation). Enregistre ce qui a été **mesuré** et **décidé** le 2026-08-08 en portant la mise
en scène validée par le père (R51/R52, `Docs/decision-decor-de-fond-et-mots-poses.md`) aux deux
derniers moteurs : `libre` et `trace`. Ils ferment la marche — les douze autres avaient déjà
leur scène ou l'ont reçue en parallèle par trois autres agents.

---

## D — `libre` : mesuré sans décor, aucune forme, aucune couleur

`client/src/moteurs/libre/MoteurLibre.tsx`, avant ce lot, rendait pour chaque région et chaque
couleur un simple `<button>` portant le NOM en texte :

```
<button data-region-svg="grande-paroi">grande-paroi</button>
<button data-couleur="rouge">rouge</button>
```

Aucun SVG, aucune forme, aucun trait, aucune couleur posée à l'écran. `libre` était le **seul**
des quatorze moteurs sans le moindre décor — pas même le papier peint à 14 % de `DecorDeFond`,
qu'il recevait pourtant (il n'était pas dans `MOTEURS_AVEC_SCENE_PROPRE`), simplement parce
qu'aucun habillage n'était jamais lu : seul l'`id` d'une région traversait le texte du bouton.
« Peindre comme on veut » n'avait ni pinceau ni toile.

### D — `SceneLibre` porte le décor ACTIONNABLE, pas celui de `phrase`

`libre` n'a pas de mots à poser sur des régions : il peint. La mécanique qui lui correspond est
donc celle de `colorie` (`client/src/moteurs/colorie/SceneSvg.tsx`), pas celle de `phrase`. Un
nouveau fichier, `client/src/moteurs/libre/SceneLibre.tsx` :

- charge le SVG déclaratif de l'habillage (`chargerSceneHabillage`, réutilisé en lecture seule
  depuis `client/src/habillages/chargeur.ts`) ; à défaut (asset absent, réseau indisponible —
  **c'est le cas sous les tests de composant**, qui ne chargent aucun asset), un repli DÉRIVÉ de
  l'habillage : un disque par région, au centroïde déclaré, de rayon équivalent à sa surface —
  mêmes maths que `colorie` ;
- pose la couleur choisie par l'enfant sur la région tapée (`hexDeCouleur`, source unique
  `NUANCIER`/`PALETTE` de `@pierre/partage`) ;
- restreint le TAP à `contenu.regions` (les régions que CET exercice offre) ; les régions que
  l'habillage déclare en plus (`galeries.paroi-libre` en déclare neuf, l'exercice
  `galeries-paroi-libre-01` n'en offre que six) restent DESSINÉES, dans leur couleur neutre, pour
  que le dessin garde son sens — mais ne reçoivent ni `role="button"`, ni geste.

**Preuve du zéro-code** : `SceneLibre` ne connaît ni forme, ni couleur, ni coordonnée propres à
un habillage — tout vient de `habillage.scene.calques` (population, centroïde, surface) et de la
couleur choisie par l'enfant. Les trois habillages de `libre` (`galeries.paroi-libre`,
`galeries.tracer-*` non concernés, `campement.chaudron`) s'y branchent sans une ligne ajoutée.

### D — `preserveAspectRatio="xMidYMid meet"`, et NON `slice` comme `phrase`

Décision délibérément CONTRAIRE à celle de `phrase`. `phrase` couvre (`slice`) parce que son
décor est un FOND : seuls les mots comptent, et une région hors champ ne prive l'enfant de rien
(`regionsVisibles` les écarte déjà de la dérivation). Pour `libre`, le décor **est** le jeu :
chaque région coloriable doit rester ATTEIGNABLE, sans quoi peindre « comme on veut » perdrait
justement les régions que l'enfant choisit de peindre. `meet` (contenir) garantit que la toile
entière reste visible et tapable, quitte à laisser une marge plutôt que de rogner une couleur.

### D — la dette R16, chiffrée et non rabotée

Mesuré par `bac-a-sable/mesurer-cibles-libre.mjs` (sortie citée), aux deux mêmes hypothèses de
cadre portrait que `Docs/decision-decor-de-fond-et-mots-poses.md` (la largeur CSS réelle de la
Galaxy Tab S10 FE reste non mesurée) :

```
galeries.paroi-libre — 6 régions offertes (galeries-paroi-libre-01.json)
  960×1356 → zone de jeu 960×1020 → échelle 1,0000 px/unité
    SOUS 64px  goutte-de-pluie   diamètre=55,5px      (les 5 autres : 99 à 528 px)
  720×1017 → zone de jeu 720×681 → échelle 0,7500 px/unité
    SOUS 64px  goutte-de-pluie   diamètre=41,6px

campement.chaudron — 3 régions (fixture de test, aucun exercice réel ne le sert encore)
  960×1356 → toutes ≥ 64 px (min. 79,3 px, « l'anse »)
  720×1017 → SOUS 64px  anse   diamètre=59,5px
```

**Une région sur six** de l'exercice réel (« la goutte de pluie », surface 2 415,9) rend un
disque de 42 à 56 px selon l'hypothèse de cadre, sous le seuil de R16. C'est le même conflit que
`colorie` porte déjà (21 régions sous 64 px, connu et non résolu). La règle des 64 px l'emporte
sur « rien ne défile » : la dette est signalée ici, **pas rabotée** — ni en réduisant la marge de
sécurité, ni en ajoutant une zone de tap invisible plus grande que la forme dessinée (ce qui
aurait fait chevaucher les régions voisines pour les petites zones, un défaut pire que celui
qu'il corrige).

### Ce que ce lot N'A PAS porté, délibérément

- **Aucun réceptacle, aucune fente.** `libre` ne range rien nulle part : il colore une surface
  déjà là. Le vocabulaire de `phrase` (`Fente`, `JetonEnVol`) n'a pas de sens ici.
- **Aucune vibration de refus, aucune oscillation.** `MotifRefusLibre = never` : il n'existe
  AUCUN geste refusable dans ce moteur (§ 4.8 du contrat gelé). Poser une secousse « au cas où »
  aurait été la même faute que le bouton qui ne répond pas (R41), sous une autre forme : une
  mécanique qui ment sur ce qu'elle garde.

### Suite requise, hors du périmètre de ce lot

`SceneLibre` est un décor ACTIONNABLE, la même famille que `SceneSvg` (`colorie`) et
`ScenePlace` (`place`). `tests/unitaires/decor-de-fond.test.ts` croise
`MOTEURS_AVEC_SCENE_PROPRE` (`client/src/habillages/DecorDeFond.tsx`, hors périmètre de ce lot —
« lecture seule ») avec le code réel des moteurs. Mesuré, sortie citée :

```
la liste des moteurs à scène propre dit VRAI, dans les deux sens
  × ces moteurs montent leur scène sans être inscrits :
    [ 'attrape', 'chemin', 'eclair', 'grave', 'histoire', 'libre' ]
```

`'libre'` doit être ajouté à `MOTEURS_AVEC_SCENE_PROPRE`, exactement le geste qui a inscrit
`'phrase'` le 2026-08-07 — les cinq autres codes de la liste viennent des trois agents qui
portent la même mise en scène aux douze autres moteurs en parallèle, pas de ce lot.

---

## D — `trace` : mesuré avec sa propre scène, mais ce n'est pas celle de `phrase`

Le brief signalait deux sources contradictoires sur « `trace` a-t-il déjà une scène ? ». Mesuré,
et ce n'est pas une contradiction : deux sens différents du mot « scène » se recouvrent.

- `client/src/moteurs/trace/MoteurTrace.tsx` rend bien `<svg data-scene="trace">` — mais c'est le
  MODÈLE DE LA LETTRE (guidage, couloir de tolérance, tracé), pas un décor d'habillage. Il ne
  connaît aucune région, aucun centroïde d'habillage.
- `client/src/habillages/DecorDeFond.tsx` déclare `MOTEURS_AVEC_SCENE_PROPRE = ['colorie',
  'phrase', 'place']` — `trace` n'y figure PAS. C'est la liste qui fait foi pour la question « ce
  moteur monte-t-il un décor d'HABILLAGE actionnable ou ralluma­ble ? », et `tests/unitaires/
  decor-de-fond.test.ts` la garde en la croisant avec le code réel.

Les deux sources disaient donc VRAI, à propos de deux objets différents.

### D — `trace` ne reçoit PAS de décor ralluma­ble, et c'est un résultat mesuré, pas supposé

Trois faits, tous mesurés sur le code, convergent :

1. **`moteurTrace.capacites.recolorieLeDecor` vaut `false`**
   (`partage/src/moteurs/trace/moteur.ts:469`) — c'est la seule déclaration du genre parmi les
   moteurs « de geste » (`libre` et `colorie` valent `true`). Le moteur pur dit lui-même qu'il ne
   fait pas gagner de décor.
2. **Aucun lien sémantique entre un trait et une région.** Le geste de `phrase` (« ce mot EST posé
   sur CETTE région, et c'est elle qu'il rallume ») a un lien direct : le centroïde de la région
   est le point où le mot atterrit. Un trait de lettre ne se pose sur rien de spatial dans le
   décor — le faire rallumer une région arbitraire aurait été « un mot posé sur un endroit sympa
   mais sans lien », le défaut que `Docs/decision-decor-de-fond-et-mots-poses.md` met en garde
   contre pour `phrase` lui-même.
3. **`tests/unitaires/decor-de-fond.test.ts` interdirait le geste inverse.** Monter `<SceneDecor>`
   dans `MoteurTrace.tsx` sans que `'trace'` soit inscrit dans `MOTEURS_AVEC_SCENE_PROPRE`
   (fichier hors périmètre, lecture seule) ferait échouer ce test — le même mécanisme que celui
   qui oblige `libre` à attendre une inscription, mais ICI sans justification pédagogique aussi
   forte : `libre` a besoin d'un décor actionnable pour EXISTER (peindre est sa seule mécanique),
   `trace` non (le geste, c'est le tracé sur son propre modèle).

**Conclusion, et c'est un résultat valable au sens du brief : `trace` n'a pas besoin d'un décor
qui se rallume.** Rien n'a été monté dans ce sens ; `MOTEURS_AVEC_SCENE_PROPRE` reste inchangé
pour ce moteur.

### D — ce qui restait un vrai défaut, mesuré structurellement : l'ardoise plafonnée

`MoteurTrace.tsx` posait `width: 'min(100%, 420px)'` sur son SVG, et le `<div>` racine n'avait
**aucune** `blockSize` propre — contrairement à `MoteurPhrase`, qui déclare explicitement
`blockSize: '100%'`. Lu dans `EcranNoeud.tsx` (lignes ~416-538) : le porteur direct du moteur
(`<div style={{ blockSize: '100%' }}>`) reçoit une hauteur DÉFINIE de `EcranNoeud`
(`blockSize: '100dvh'`, `flex: '1 1 auto'` sur la ligne du moteur). Sans `blockSize: '100%'`
propre, `MoteurTrace` prenait la hauteur de son CONTENU (consigne + ardoise plafonnée à 420×672 +
deux lignes de texte, environ 800-900 px), pas celle du cadre réservé — l'écart devenait du vide
sous l'ardoise en portrait, la même famille de défaut que R51 sur `phrase` avant sa mise en scène
(« ~250 px de vide, un décor flottant, ~350 px de vide »), en plus modéré puisque l'ardoise
elle-même n'était pas minuscule.

**Correctif, sans décor ajouté** :

- le `<div>` racine passe en grille trois lignes `auto 1fr auto`, `blockSize: '100%'` ;
- le plafond `min(100%, 420px)` de l'ardoise est retiré : elle occupe toute la ligne `1fr`,
  `width: 100%`, `height: 100%`, contenue par `preserveAspectRatio="xMidYMid meet"` (déjà le
  défaut SVG, maintenant écrit en toutes lettres) — jamais déformée, jamais rognée ;
- R16 ne peut que MONTER : `RAYON_DEPART` (`GuidageLettre.tsx`) est un rayon FIXE en unités
  `viewBox`, et l'échelle px/unité ne peut que grandir quand l'ardoise s'agrandit (elle ne
  redescend jamais sous le `420/100 = 4,2 px/unité` déjà mesuré à 67,2 px de diamètre).

### D — la consigne et les deux textes de statut héritent des réglages de lecture, sans passer par `ZoneDeLecture`

Tentative initiale : remplacer `<p data-consigne-texte="oui">{contenu.consigne}</p>` par
`<ZoneDeLecture texte={contenu.consigne} />`, comme `phrase`. **Rejetée après lecture du test qui
la garde** : `tests/composants/MoteurTrace.test.tsx` compare `consigne.textContent` à
`contenuBd.consigne` À L'IDENTIQUE. Or `TexteSyllabe` (que `ZoneDeLecture` monte pour chaque mot)
rend **deux fois** le texte dans le DOM — un span accessible (`.lecture-accessible`) PLUS les
segments de syllabation, aucun des deux `aria-hidden` sur le premier — donc `textContent`
doublerait chaque mot (« GraveGrave le lele... »). Le même piège existe pour `data-trait-libelle`
(comparé littéralement au libellé du trait).

**Retenu** : le STYLE de lecture (`styleDeLecture`, `useReglagesLecture`, réutilisés en lecture
seule depuis `client/src/lecture/ZoneDeLecture.js`) posé en `style` inline sur les `<p>`/`<span>`
existants — la STRUCTURE ne change pas, un seul nœud de texte par élément, `textContent` reste
l'identité. C'est exactement le procédé que `MoteurPhrase.tsx` emploie déjà pour ses propres
textes de statut (refus, aide) : ni l'un ni l'autre n'est un texte à déchiffrer au sens de
`ZoneDeLecture`, seul le rendu visuel doit rester cohérent avec elle.

⚠ **Tension signalée, non résolue** : le contrat des features v2 § 5.1 réserve l'affichage de
« texte à déchiffrer » à `ZoneDeLecture` seule. `contenu.consigne` (une phrase complète, à
déchiffrer) en relève probablement — mais c'était déjà vrai AVANT ce lot (le `<p>` brut existait
déjà), ce n'est pas une régression introduite ici, et le résoudre proprement demanderait de
toucher `tests/` (hors périmètre). Signalé pour la campagne qui possède `tests/`.

### Ce que ce lot N'A PAS porté, délibérément

- **Aucun `<Scene*>`, aucun décor ralluma­ble.** Justifié ci-dessus par trois faits mesurés
  (`recolorieLeDecor: false`, absence de lien sémantique trait↔région, garde du test).
- **Aucune mécanique de récompense visuelle par trait.** Le geste, c'est tracer ; rien de plus.

---

## Contraste et hauteur de page — mesurés

**Contraste.** Aucun texte visible n'est posé sur une couleur variable dans ce lot :

- `libre` : le nom de chaque couleur est dans le DOM (nom accessible du godet) mais
  visuellement caché (technique clip-rect à 1×1 px, la même que la note vocale de
  `MoteurPhrase.tsx`) — aucun texte à mesurer sur les godets. Le texte de statut (aide de Gobi)
  garde le style par défaut, inchangé par ce lot.
- `trace` : la consigne et les deux textes de statut reprennent EXACTEMENT `styleDeLecture`, donc
  le même rapport déjà mesuré dans `Docs/decision-decor-de-fond-et-mots-poses.md` — `#1B2440` sur
  `#FFF6E3`, **14,23:1**, AA et AAA très au-delà.

**Hauteur de page en portrait.** Format utilisé pour raisonner : les deux mêmes hypothèses que le
lot `phrase` (**960×1356**, rapport 1,5, et **720×1017**, rapport 2,0) — la largeur CSS réelle de
la Galaxy Tab S10 FE reste non mesurée sur l'appareil. Les deux moteurs utilisent désormais une
grille à trois/quatre lignes `auto ... 1fr auto`, `blockSize: '100%'` sur la racine : la ligne qui
grandit absorbe tout l'espace restant à l'intérieur du cadre que `EcranNoeud` réserve
(`blockSize: '100dvh'`, `flex: '1 1 auto'`), donc **aucun débordement vertical par construction**
— la même garantie structurelle que `MoteurPhrase`, pas une valeur mesurée au pixel près (aucun
navigateur réel n'a été lancé pour ce lot — voir la note ci-dessous).

**Format du banc** : R39 s'applique — le banc (`playwright.config.ts`) mesure en **1920×1200
paysage** ; l'enfant joue en portrait. Comme pour `phrase`, ce lot ne prétend pas avoir mesuré la
tablette réelle.

---

---

## D — R49 : `trace` et `place` cessent de redire la consigne (2026-08-08, suite à revue)

L'agent QA a recensé, par objet et non par forme (`data-consigne-texte`, la seule marque
fiable — chercher `<ZoneDeLecture texte=…>` accuse à tort `histoire`, `eclair`, `grave`, `tri`,
`libre`, qui y rendent autre chose qu'une consigne) : **2 moteurs sur 14 redisaient encore la
consigne, `place` et `trace`**, alors qu'`EcranNoeud` la porte seule depuis R49 (« la phrase est
en haut et en bas, il y a doublon », le père, 2026-08-07) — lui seul possède la clé du
`BoutonEcouter`.

Retiré des deux, aucun remplacement inventé :

- **`trace`** (`client/src/moteurs/trace/MoteurTrace.tsx`) : le `<p data-consigne-texte>` qui
  redisait `contenu.consigne` disparaît. Aucun « meilleur usage » trouvé pour cette ligne — pas
  d'équivalent au « texte en train de se construire » de `phrase` sur un moteur qui trace des
  lettres. L'ardoise récupère l'espace : la grille passe de trois lignes (`auto 1fr auto`) à deux
  (`1fr auto`), ce qui réduit encore le vide déjà traité plus haut dans ce document.
- **`place`** (`client/src/moteurs/place/MoteurPlace.tsx`) : même geste, même absence de
  remplacement. La variable `consigne` (`contenu.consignes[etat.indexConsigne]`) devient inutile
  et est retirée avec la ligne qui la consommait — `etatConsigne`, qui sert par ailleurs à la
  relecture automatique et à `data-consigne`, reste intact.

**Contrat de sortie, sortie citée** :

```
npx vitest run --project unitaires tests/unitaires/consigne-sans-doublon.test.ts
  ✓ la population est DÉRIVÉE de CodeMoteur, et la marque ne désigne que la consigne
  ✓ CONTRÔLE POSITIF — un moteur FABRIQUÉ qui redit la consigne est trouvé, un autre non
  ✓ LE DÉFAUT — aucun moteur ne redit la consigne
  3 passed (3)
```

```
npx tsc -p client/tsconfig.json --noEmit    → aucune sortie (propre)
npx eslint client/src/moteurs/trace/MoteurTrace.tsx client/src/moteurs/place/MoteurPlace.tsx
  → aucune sortie (propre)
node bac-a-sable/detecter-mojibake.mjs client/src/moteurs/trace   → 0 occurrence
node bac-a-sable/detecter-mojibake.mjs client/src/moteurs/place   → 0 occurrence
```

### ⚠ Dette signalée, non corrigée : deux assertions obsolètes dans `tests/` (hors périmètre)

```
npx vitest run --project composants tests/composants/MoteurTrace.test.tsx tests/composants/MoteurPlace.test.tsx
  2 failed | 21 passed (23)

  × MoteurTrace.test.tsx > AIDE : le libellé du trait attendu est disponible pour Gobi…
    → expected undefined to be 'polite'   (querySelector('[data-consigne-texte="oui"]') est null)

  × MoteurPlace.test.tsx > la consigne est LUE à l'écran et annoncée aux lecteurs d'écran
    → expected undefined to be 'Dessine un soleil dans le ciel.'  (même cause)
```

Ces deux assertions testent LITTÉRALEMENT le doublon que R49 supprime — elles vivaient dans
`tests/composants/MoteurTrace.test.tsx` et `tests/composants/MoteurPlace.test.tsx` avant que le
garde `consigne-sans-doublon.test.ts` n'existe, et personne ne les avait retirées quand la règle a
changé. `tests/` appartient à la campagne QA (hors périmètre de ce lot, consigne explicite) : je
ne les ai pas modifiées, ni assouplies, ni contournées. Les 21 autres cas des deux fichiers
restent verts — la panne est localisée exactement aux deux lignes qui vérifiaient l'ancien
comportement. Signalé pour que la campagne QA les retire (l'exigence d'AFFICHAGE qu'elles
protégeaient a déjà son gardien : `tests/composants/EcranNoeud.test.tsx`, cité par
`consigne-sans-doublon.test.ts` lui-même).

---

## Note de méthode : pas de navigateur réel lancé pour ce lot

Consigne du brief : « tu ne compiles pas — je construis quand tu rends » et « pas de captures ».
Les mesures ci-dessus sont donc **structurelles et arithmétiques** (lecture du CSS produit, du
DOM attendu, calcul du rayon équivalent par un script `bac-a-sable/mesurer-cibles-libre.mjs`
exécuté et cité), et **testées** par les suites de composants existantes
(`tests/composants/MoteurLibre.test.tsx` : 8/8 ; `tests/composants/MoteurTrace.test.tsx` : 12/12 ;
`tests/composants/MoteurTrace-ordre-visible.test.tsx` : 4/4 ; `tests/composants/
trace-guidage-sens.test.tsx` : 5/5 — sorties citées dans le rapport de lot), mais AUCUNE n'a été
vérifiée pixel pour pixel dans un navigateur réel. Si l'écart avec le rendu réel devait un jour
se mesurer, `bac-a-sable/mesurer-cibles-libre.mjs` est le point de départ : il lit les habillages
sur disque et ne recalcule aucune surface qui n'y soit déjà déclarée.
