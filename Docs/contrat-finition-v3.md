# Contrat de finition v3 — gelé le 2026-08-02

Ce document gèle le périmètre, l'arborescence, les types partagés et les frontières des **huit
lots de finition N1 à N8**. Il succède au [contrat technique v1](contrat-technique-v1.md)
(lots L-A à L-G) et au [contrat des features v2](contrat-features-v2.md) (lots L2-A à L2-H),
qui restent en vigueur pour tout ce qu'ils ont déjà gelé.

**Il ne rediscute aucune décision de [journal-des-decisions.md](journal-des-decisions.md).**
D1 à D46 sont la loi. Ce contrat les applique.

---

## 0. Conventions

Les conventions du contrat v1 § 0 et les quatre du contrat v2 § 0 (C1 à C4) s'appliquent **sans
exception** : français partout, identifiants sans diacritiques, ESM strict, `nodenext`,
**extension `.js` sur tout import relatif**, `import type` obligatoire, `kebab-case.ts` /
`PascalCase.tsx`, `Alea` et `Horloge` seuls, UTF-8 sans BOM, LF, valeurs pédagogiques en données
(C2), fait mécanique mesuré et cité (C3), contrat de sortie chiffré par livrable (C4).

Trois conventions **nouvelles**, propres à cette campagne :

| # | Règle | Motif |
|---|---|---|
| **C5** | **Aucune donnée n'existe en deux exemplaires sans un test qui prouve leur égalité.** Si un modèle de lettre est recopié dans un exercice, un test compare octet à octet la copie et la source. | Mesuré ici : `contenu/modeles-lettres/minuscules.json` et `contenu/exercices/galeries/miroir-bd-01.json` portent chacun leur copie du `b` et du `d`. Corriger l'un sans l'autre laisse le jeu enseigner l'ancien ductus, en silence. |
| **C6** | **Un générateur refuse d'écrire plutôt que d'émettre du faux**, et il le prouve en **remesurant sa propre sortie**. Le générateur de modèles de lettres recalcule le sens de rotation de la géométrie qu'il vient de produire et le compare au sens **déclaré** ; s'ils diffèrent, il sort en code 1 sans écrire. | D33 : « un moteur qui enseigne un mauvais sens détruit le mécanisme pour lequel il existe ». Un ductus déclaré mais non vérifié n'est pas une donnée déclarée, c'est un commentaire. |
| **C7** | **Tout texte destiné à l'enfant traverse `enonceUnePerte()`**, et un test échoue si une formulation énonce ce qui manque au lieu de ce qu'il peut rendre. | D35, conséquence 2. Le père a buté sur une phrase ; la règle qui l'évite doit être mécanique, pas une intention. |

**Interdiction de créer un fichier non listé au § 4.** Un lot qui pense avoir besoin d'un fichier
absent le signale dans son rapport au lieu de le créer.

---

## 1. Inventaire mesuré de l'existant

**Le code fait foi. Aucune ligne de cette section n'est tirée d'un document.**

### 1.1 État du dépôt à l'instant du gel

```
$ git log --oneline -3
9bc00a5 Ce qui reste à trancher, écrit dans le dépôt plutôt que dans une réponse
5e241cc Accessibilité, game feel, et les seuils de couverture de l'annexe T
532dfdc Les parcours E2E passent au vert : 23 sur 23

$ git status --porcelain
 M Docs/journal-des-decisions.md
 M Docs/questions-en-attente.md
?? production/personnages/gobi/references/
?? tests/composants/BoutonEcouter-reponse.test.tsx
?? tests/composants/MoteurTrace-ordre-visible.test.tsx
?? tests/e2e/parcours-issues-de-secours.spec.ts
?? tests/unitaires/clairiere-sortie-complete.test.ts
?? tests/unitaires/consignes-audibles.test.ts
?? tests/unitaires/decor-lisible.test.ts
?? tests/unitaires/lancement-decouvrable.test.ts
?? tests/unitaires/trace-geste-enfant.test.ts
```

Sept commits sur `main`. **Huit fichiers de test non suivis** : une campagne d'audit a terminé
d'écrire pendant que ce contrat était en cours de rédaction. Ces huit fichiers sont des tests de
constat — ils **mesurent** les défauts que les lots N1 à N8 doivent solder. Aucun lot ne les
supprime ; ils deviennent les tests de non-régression du travail.

**`CLAUDE.md` est périmé** : il affirme « Il n'y a aucun code », « pas de `package.json`, pas de
`src/` ». Mesuré : 110 fichiers `.ts` dans `partage/src`, 88 dans `client/src`, 29 dans
`serveur/src`. La mise à jour de `CLAUDE.md` appartient à **N5** (§ 4.5).

### 1.2 Volumétrie

```
$ find partage/src -name "*.ts" | wc -l                          → 110
$ find client/src -name "*.ts" -o -name "*.tsx" | wc -l          → 88
$ find serveur/src -name "*.ts" | wc -l                          → 29
$ find tests -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | wc -l → 79
$ ls serveur/migrations/*.sql | wc -l                            → 6
$ find contenu/habillages -name "*.json" | wc -l                 → 37
$ find contenu/habillages -name "*.svg" | wc -l                  → 39
$ find contenu/exercices -name "*.json" | wc -l                  → 6
$ ls contenu/noeuds/*.json | wc -l                               → 3
```

**Total : 227 fichiers source TypeScript, 79 fichiers de test, 6 migrations.**

### 1.3 Les 14 moteurs existent tous

```
$ ls -d client/src/moteurs/*/
assemble attrape chemin chrono colorie eclair grave histoire libre paires phrase place trace tri
```

Quatorze moteurs, chacun avec son `moteur.ts` / `types.ts` / `validation.ts` /
`schema-contenu.ts` côté `partage` et son composant de rendu côté `client`. L'union `CodeMoteur`
(`partage/src/identifiants.ts:77-91`) en compte bien quatorze. **Aucun moteur n'est à écrire.**

### 1.4 Écrans et routes

Neuf routes client (`client/src/routeur.tsx:51-69, 190-225`) :

| Chemin | Écran | Piloté par |
|---|---|---|
| `/` | `EcranProfils` (ou `EcranChargement`) | `EtatMagasin.ecran` |
| `/carte` | `EcranCarte` | `EtatMagasin.ecran` |
| `/noeud` | `EcranNoeud` | `EtatMagasin.ecran` |
| `/recompense` | `EcranRecompense` | `EtatMagasin.ecran` |
| `/campement` | `EcranCampement` | navigation explicite |
| `/coffre` | `EcranCoffre` | navigation explicite |
| `/reglages-lecture` | `EcranReglagesLecture` | navigation explicite |
| `/parent` | `EcranCodeParent` | navigation explicite |
| `/parent/dashboard` | `EcranDashboard` | navigation explicite |

**Il n'existe aucune route `/ouverture`** — la séquence d'ouverture de D35 n'existe pas.
**Il n'existe aucune route `/parent/galerie`** — la galerie de D34 n'existe pas.

Quinze routes HTTP servies (`serveur/src/routes/`), dont quatre sous `/api/parent/`.

### 1.5 Contenu livré

> **Cette table a été RE-MESURÉE à 00:39, juste avant conclusion. Elle a changé pendant la
> rédaction** — voir § 1.10. Les chiffres ci-dessous sont les plus récents.

| Poste | Compte mesuré | Cible |
|---|---|---|
| Nœuds La Clairière | **5** (`clairiere-01` … `-05`) | 4 à 6 par sortie (R13) ✓ |
| Nœuds Les Galeries | **2** (`galeries-01`, `galeries-02`) | idem |
| Exercices | **7** | — |
| Habillages déclarés | 37 JSON / 39 SVG | — |
| Fiches ingérées niveau 1 | **15** brouillons, 75 consignes | à câbler |
| Points d'interaction du campement | **30**, dont 6 objets | ≥ 25 (R11) ✓ |
| Stades de Gobi | **5** | **8 à 10** (D43) |
| Modèles de lettres | **26** minuscules | ≥ 14 avec ductus (N1) |

**Un défaut mesuré et non résolu** : `contenu/monde/regions.json` cite toujours **un seul nœud**
pour La Clairière alors que cinq existent.

```
$ node -e "…" (lecture de contenu/monde/regions.json)
clairiere -> ["clairiere-01"]
galeries  -> ["galeries-01","galeries-02"]
```

Le commentaire du fichier dit lui-même que « `noeuds` … c'est lui qui fait le pourcentage de
recoloration ». **Les quatre nouveaux nœuds sont donc invisibles sur la carte et ne comptent pas
dans la recoloration.** Correction confiée à **N7**, propriétaire de `regions.json` (§ 6.2), sur
la liste que **N8** lui transmet.

Contrôle des références croisées, en revanche, **sain** :

```
OK   clairiere-01.json -> clairiere-ecole-01
OK   clairiere-02.json -> clairiere-luciole-couleurs-01
OK   clairiere-03.json -> clairiere-paniers-couleurs-01
OK   clairiere-04.json -> clairiere-ecole-02-place
OK   clairiere-05.json -> clairiere-guirlande-phrase-01
OK   galeries-01.json  -> galeries-miroir-bd-01
OK   galeries-02.json  -> galeries-miroir-bp-01
NOEUDS ORPHELINS: 0
```

### 1.6 Le bouton « écouter » — D42 est appliquée, l'audio ne l'est pas

**Corrigé après re-mesure** (§ 1.10). `client/src/composants/BoutonEcouter.tsx` rend désormais
`ReactElement | null` et se masque :

```ts
// client/src/composants/BoutonEcouter.tsx:78-80
if (clip === null || !reglagesFoyer.boutonEcouter) {
  return null;
}
```

**D42 est donc satisfaite dans son mécanisme.** Un réglage foyer `boutonEcouter` (défaut `true`,
`client/src/parent/reglages-foyer.ts:48-53`) permet en outre au parent de le retirer.

Mais le masquage n'a aujourd'hui **aucune condition à évaluer** : `clip` vaut `null` partout,
donc le bouton est masqué **partout**. C'est exactement la conséquence que D42 annonçait — « R15
reste visiblement non satisfaite, et l'enfant n'a aucune aide à la lecture d'ici la livraison des
voix ». **Le travail de N2 sur ce fichier est donc réduit** : brancher la résolution par
manifeste, pas implanter le masquage.

```
$ ls contenu/audio
ls: cannot access 'contenu/audio': No such file or directory

$ find . -iname "*piper*" -o -iname "*tts*" -o -iname "*whisper*" | grep -v node_modules
(aucune sortie)
```

**Aucun audio n'existe. Aucun outil TTS n'est installé.** `production/voix.lock.json` est absent.
Le fournisseur réel est `client/src/services/voix-navigateur.ts`, c'est-à-dire la synthèse du
navigateur — donc **pas hors ligne, pas reproductible, pas syllabée**.

Couverture audio mesurée sur les six exercices livrés :

```
contenu/exercices/clairiere/ecole-01.json            audio non nul= 0  audio null= 4
contenu/exercices/clairiere/ecole-02-place.json      audio non nul= 0  audio null= 3
contenu/exercices/clairiere/luciole-couleurs-01.json audio non nul= 0  audio null= 4
contenu/exercices/clairiere/paniers-couleurs-01.json audio non nul= 0  audio null= 2
contenu/exercices/galeries/miroir-bd-01.json         audio non nul= 0  audio null= 1
contenu/exercices/galeries/miroir-bp-01.json         audio non nul= 0  audio null= 1
--- TOTAL 15 champs `audio`, tous à `null`. Couverture : 0 / 15 = 0 %.
```

`Locuteur` (`partage/src/fournisseurs/voix.ts:12`) ne compte que **quatre** locuteurs —
`gobi | narrateur | maitresse | enfant`. D41 en demande **sept**.

### 1.7 Le campement — D45 tient, D46 non

`contenu/monde/campement.json` : **30 points**, 6 objets. Le compte R11 est atteint et
`tests/unitaires/campement-audit.test.ts` le vérifie déjà. **D45 est satisfaite en données** — ce
qui manque est le graphisme (N7), exactement comme D45 le dit.

**D46 n'est pas satisfaite.** Mesuré sur le parcours réel : à l'ouverture, l'application montre
`EcranProfils`. Un tap choisit le profil et mène à `/carte`. Un second tap sur un nœud mène à
`/noeud`. **Deux taps minimum, et aucun bouton « partir en sortie » n'existe** : `EcranCarte`
n'expose que « Le campement » (`data-vers="campement"`) et « Changer de joueur ».

### 1.8 La zone parent — deux défauts mesurés

1. **Aucune route de première définition du code.** `serveur/src/routes/parent.ts:21` l'écrit
   noir sur blanc : « Le contrat gelé n'accorde aucune route "definir le code" ». À la place,
   `POST /api/parent/ouvrir` **pose silencieusement le code du foyer au premier appel**
   (lignes 184-190) : `if (stocke === null) { … ecrireCodeParent(…) ; return poserJeton(…) }`.
   Un enfant curieux qui tape `1234` devient propriétaire du code parent, sans qu'un écran l'ait
   jamais demandé.
2. **Aucune galerie d'exercices.** D34 n'a aucun fichier.

### 1.9 bis — CE QUI A CHANGÉ PENDANT LA RÉDACTION DE CE CONTRAT

**À lire avant tout lancement de lot.** Une campagne parallèle écrivait pendant que ce contrat se
rédigeait. Entre la première mesure (00:07) et la dernière (00:39) :

```
$ git status --porcelain | wc -l
10  →  28

$ ls contenu/noeuds/*.json | wc -l
3   →  7

$ find contenu/exercices -name "*.json" | wc -l
6   →  7

$ find tests -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | wc -l
79  →  81
```

Fichiers apparus ou modifiés dans l'intervalle, et **ce que chacun retire au périmètre initial** :

| Fichier | Effet sur ce contrat |
|---|---|
| `client/src/composants/BoutonEcouter.tsx` (M) | **D42 est implantée.** § 1.6 et § 5.6 réécrits ; le travail de N2 sur ce fichier se réduit à la résolution par manifeste |
| `client/src/parent/reglages-foyer.ts` (C) | Nouveau type partagé `ReglagesFoyer` (volume effets, volume voix, animations calmes, bouton écouter). **N2 et N5 le lisent, ne le réécrivent pas** |
| `contenu/noeuds/clairiere-{02..05}.json` (C) | **La Clairière passe de 1 à 5 nœuds.** N8 n'en crée plus que **1** au lieu de 5 |
| `contenu/exercices/clairiere/guirlande-phrase-01.json` (C) | 7ᵉ exercice |
| `client/src/routeur.tsx`, `EcranNoeud.tsx`, `ReglagesParent.tsx` (M) | Fichiers touchés. **N4, N5 et N6 relisent leur état réel avant d'y écrire** |

**Le dépôt était encore en écriture à l'instant du gel** : `guirlande-phrase-01.json` n'existait
pas lors de la mesure de 00:37 et existait à 00:39. **Aucun lot ne démarre sans avoir relancé les
commandes du § 1.2 et du § 1.5**, et un lot qui trouve un écart le signale au lieu de recopier ce
document.

Ce qui **n'a pas** changé, et qui fonde ce contrat : `contenu/audio` n'existe toujours pas, aucun
outil TTS n'est installé, aucun ductus n'est déclaré, aucune route `/ouverture` ni
`/parent/galerie` n'existe, `gobi-stades.json` compte toujours 5 stades.

### 1.9 Ce qui existe déjà et n'est PAS à refaire

Ces acquis sont **hissés dans ce contrat** pour qu'aucun lot ne les reconstruise :

- **Le nuancier de 11 couleurs de D37 EXISTE** — `partage/src/palette.ts:26` déclare
  `CouleurColoriage` (11 membres) et `NUANCIER` (ligne 65), à côté des 7 `JetonCouleur`
  (ligne 16) intacts. **N7 n'a aucune couleur à ajouter** ; il a une validation à consigner.
- **Les cases en creux existent déjà** — `client/src/ecrans/EcranCoffre.tsx:52` : « En creux : la
  même case, en Grisaille. Jamais une case vide, jamais un cadenas ». N6 étend le principe à
  l'étagère, il ne l'invente pas.
- **Les jauges montrent le vide restant** — `JaugePalier.tsx`, `CascadeRecompense.tsx`,
  `Etoiles.tsx`. D25 point 3 est déjà tenu.
- **`stade_gobi.stade_code` n'a AUCUNE contrainte `CHECK`**
  (`serveur/migrations/005_monde.sql:39-44`). Passer de 5 à 10 stades **ne demande aucune
  migration**.
- **Le moteur `trace` valide déjà le sens** : `couvertureOrientee`
  (`partage/src/moteurs/trace/validation.ts:124`) est orientée par construction, et le motif
  `sens-inverse` existe. **Le mécanisme est là ; c'est la donnée qui est fausse.** Voir § 2.

---

## 2. LE VERDICT SUR LE DUCTUS — mesuré, pas rapporté

C'est le point le plus important de ce contrat.

### 2.1 Dans quel sens le `d` se trace-t-il aujourd'hui ?

**Réponse : il part d'EN BAS À DROITE, sur la ligne de base, et tourne dans le SENS HORAIRE.**

D33 exige qu'il parte **en haut à droite** et tourne dans le sens **ANTIHORAIRE**. Les deux sont
faux.

Convention de mesure, contrôlée avant usage — en coordonnées SVG l'axe `y` descend, donc l'aire
signée (formule du lacet) est **positive pour un parcours horaire à l'écran** :

```
$ node -e "…" (triangle témoin (0,0)→(1,0)→(1,1), horaire à l'écran)
CONTROLE convention: triangle horaire a l ecran => shoelace=1 (positif = HORAIRE)
```

Mesure sur `contenu/modeles-lettres/minuscules.json` — repères du fichier : ligne de base
`y = 100`, hauteur d'x `y = 60`, haut de hampe `y = 20`, bas de jambage `y = 140`.

```
--- d viewBox= 0 0 100 160 axeRisque= gauche-droite nbTraits= 2
   trait 1 d-panse | le rond | depart [70,100] arrivee [70,60] | shoelace +2541.9 => HORAIRE
   trait 2 d-hampe | la grande barre | depart [70,20] arrivee [70,100] | shoelace 0.0 => lineaire

points de d-panse :
(70,100) -> (57.67,100) -> (45.76,97.16) -> (35.76,90.38) -> (30,80)
        -> (35.76,69.62) -> (45.76,62.84) -> (57.67,60) -> (70,60)
```

Le geste part de `(70, 100)` — **le coin bas droit, sur la ligne de base** — file vers la gauche
le long de la ligne de base, remonte par la gauche et se termine en haut à droite. C'est le
**sens horaire**, et le point de départ est le **bas**.

**Ce qui est juste, et qu'il ne faut pas casser** : `d-panse` porte bien `ordre: 1` et `d-hampe`
`ordre: 2`. **La boucle vient avant la haste**, comme D33 l'exige. Ce seul point est acquis.

### 2.2 Le `o` de référence est faux aussi — et c'est ce qui rend le `d` irréparable isolément

D33 dit « tourne dans le sens antihoraire — **comme pour tracer un `o`** ». Le `o` est donc la
référence. Mesuré :

```
--- o : trait 1 o-rond | depart [50,100] | shoelace +2262.4 => HORAIRE
points : (50,100) -> (35.86,94.14) -> (30,80) -> (35.86,65.86) -> (50,60)
      -> (64.14,65.86) -> (70,80) -> (64.14,94.14) -> (50,100)
```

Le `o` part **du bas** et tourne **horaire**. La référence à laquelle D33 rattache le `d` est
elle-même à l'envers. Corriger le `d` sans corriger le `o` produirait deux gestes incohérents
dans la même famille.

### 2.3 Toute la famille des ronds est à l'envers

```
a  a-rond   depart [60.59,70]  shoelace +2079.1  => HORAIRE
c  c-arc    depart [62.86,64.68] shoelace +2229.2 => HORAIRE
g  g-rond   depart [60.59,70]  shoelace +2079.1  => HORAIRE
o  o-rond   depart [50,100]    shoelace +2262.4  => HORAIRE
d  d-panse  depart [70,100]    shoelace +2541.9  => HORAIRE
```

**Cinq lettres sur cinq de la famille des ronds tournent dans le sens horaire.** Aucune ne part
du haut à droite. `q-panse` est la seule antihoraire — et seulement parce qu'elle est le miroir
mécanique du `p` (§ 2.4), pas par intention.

### 2.4 Le `c` n'est pas un `c` — il est ouvert en HAUT

```
points de c-arc :
(62.86,64.68) -> (69.32,74.82) -> (68.79,86.84) -> (61.47,96.38) -> (50,100)
             -> (38.53,96.38) -> (31.21,86.84) -> (30.68,74.82) -> (37.14,64.68)
```

Rapportés au centre `(50, 80)`, ces points balaient de ~1 h à ~11 h **en passant par 3 h, 6 h et
9 h**. L'ouverture n'est donc pas à droite, elle est **en haut**. La forme rendue est une coupe,
pas un `c`. Le `chemin` SVG le confirme : la polyligne ne referme pas le sommet.

### 2.5 Le défaut de structure — `b` et `d` sont des miroirs EXACTS, par construction assumée

```
d-panse est-il le miroir gauche-droite EXACT de b-panse ?  true
q-panse est-il le miroir gauche-droite EXACT de p-panse ?  true
d-panse est-il le miroir haut-bas EXACT de q-panse ?       true
```

Et le fichier le revendique dans son propre champ `note` :

> « b/d/p/q sont images exactes les uns des autres par reflexion autour du centre (50, 80) du
> viewBox — c'est cette propriete que le moteur `trace` mesure pour nommer l'axe de la confusion »

**Cette propriété est utile au diagnostic et nuisible à l'enseignement, et les deux sont vrais en
même temps.** Elle permet à `axeDuTrait` de nommer l'axe par réflexion géométrique — c'est bien
mesuré, c'est bien conçu. Mais elle fait aussi du `d` « le `b` retourné », alors que D33 pose
que `b` et `d` **appartiennent à des familles gestuelles différentes** et que « c'est précisément
ce geste différent qui les distingue ».

**Résolution retenue, et elle réconcilie les deux besoins** : la propriété de miroir reste vraie
pour les **formes** (les `chemin` SVG, ce que l'enfant voit), et cesse d'être vraie pour les
**gestes** (les `points`, les `depart`, les `sens`, ce que l'enfant fait). Le `b` s'attaque par la
hampe (famille `boucles`), le `d` par le rond antihoraire (famille `ronds`). `axeDuTrait`
continue de fonctionner : il compare des formes réfléchies, pas des ordres de parcours.

### 2.6 Ce qui manque entièrement

| Exigence D33 | État mesuré |
|---|---|
| 1. Ductus déclaré en données, `contenu/referentiel/ductus-*.json` | **Absent.** `ls contenu/referentiel/` → `competences.json`, `parametres-pedagogie.json`, `parametres-recompenses.json`, `syllabation-exceptions.json`. Aucun ductus |
| 2. Un tracé au bon endroit dans le mauvais sens n'est pas une réussite | **Partiellement tenu** — `sens-inverse` existe et refuse, mais le sens de référence est faux |
| 3. Guidage : départ marqué, flèche de direction, tracé fantôme animé | **2 sur 3.** `GuidageLettre.tsx` rend le disque de départ et la flèche (`flecheDeSens`, ligne 42). **Aucun tracé fantôme animé** : `grep -n "fantome" client/src/moteurs/trace/GuidageLettre.tsx` → aucune sortie |
| 4. Lettres groupées par famille gestuelle | **Absent.** `ModeleLettre` (`types.ts:44-51`) porte `lettre`, `casse`, `viewBox`, `traits`, `axeRisque`. Aucun champ de famille |
| 5. Le sens prime sur la tolérance | Tenu dans l'esprit : `TOLERANCE_TRACE_PX = 24` avec conversion en unités `viewBox` |

### 2.7 Le défaut qui salit l'indicateur de D23

`axeParInversionDeSens` (`validation.ts:281-284`) :

```ts
function axeParInversionDeSens(modele: ModeleLettre, motif: MotifRefusTrace | null): AxeMiroir | null {
  if (motif !== 'sens-inverse') return null;
  return modele.axeRisque;
}
```

Un enfant qui trace **la bonne lettre** dans **le mauvais sens** produit `motif = 'sens-inverse'`,
donc `axe = 'gauche-droite'`, donc une `ConfusionObservee` `b→d` **qu'il n'a pas commise**. Le
top 10 des confusions de D23 — « la seule donnée réelle qu'un orthophoniste pourrait un jour
lire » — enregistre alors du bruit. **N1 doit séparer les deux signaux.**

### 2.8 La duplication qui rendrait toute correction partielle

`contenu/exercices/galeries/miroir-bd-01.json` **recopie intégralement** les modèles du `b` et du
`d` — mêmes `points`, mêmes `depart`, même `axeRisque` — au lieu de les référencer. Corriger
`contenu/modeles-lettres/minuscules.json` seul laisserait le jeu enseigner l'ancien ductus. C'est
la raison d'être de la convention **C5**.

### 2.9 Le ductus normatif — donnée déclarée, opposable

Point de départ, sens et ordre pour les **14 lettres minimales** du périmètre N1, dans le
`viewBox 0 0 100 160` existant (hampe `y=20`, hauteur d'x `y=60`, base `y=100`, jambage `y=140`).
`g` et `q` sont ajoutés parce qu'ils appartiennent à la famille des ronds et que la laisser
incomplète priverait le regroupement de sens.

| Lettre | Famille | Trait, dans l'ordre | Départ | Sens |
|---|---|---|---|---|
| **o** | `ronds` | `o-rond` | `(64, 66)` haut droite | **antihoraire** |
| **c** | `ronds` | `c-arc` | `(64, 66)` haut droite | **antihoraire**, arrivée `(64, 94)` — **ouvert à DROITE** |
| **a** | `ronds` | 1 `a-rond` | `(64, 66)` | **antihoraire**, fermé |
| | | 2 `a-barre` | `(66, 60)` | `lineaire` → `(66, 100)` |
| **d** | `ronds` | 1 `d-panse` | `(70, 60)` **haut droite** | **antihoraire**, fermé |
| | | 2 `d-hampe` | `(70, 20)` | `lineaire` → `(70, 100)` |
| **g** | `ronds` | 1 `g-rond` | `(64, 66)` | **antihoraire**, fermé |
| | | 2 `g-queue` | `(66, 60)` | `lineaire` → `(40, 138)` |
| **q** | `ronds` | 1 `q-panse` | `(70, 60)` | **antihoraire**, fermé |
| | | 2 `q-hampe` | `(70, 60)` | `lineaire` → `(70, 140)` |
| **l** | `boucles` | `l-hampe` | `(50, 20)` | `lineaire` → `(50, 100)` |
| **b** | `boucles` | 1 `b-hampe` | `(30, 20)` | `lineaire` → `(30, 100)` |
| | | 2 `b-panse` | `(30, 60)` **haut de panse** | **horaire** → `(30, 100)` |
| **e** | `boucles` | 1 `e-barre` | `(31, 80)` | `lineaire` → `(69, 80)` |
| | | 2 `e-arc` | `(69, 80)` | **antihoraire** → `(64, 94)` |
| **i** | `ponts` | 1 `i-baton` | `(50, 60)` | `lineaire` → `(50, 100)` |
| | | 2 `i-point` | `(50, 42)` | `lineaire` |
| **u** | `ponts` | 1 `u-creux` | `(32, 60)` | **antihoraire** → `(66, 60)` |
| | | 2 `u-jambe` | `(66, 60)` | `lineaire` → `(66, 100)` |
| **n** | `ponts` | 1 `n-hampe` | `(34, 60)` | `lineaire` → `(34, 100)` |
| | | 2 `n-arche` | `(34, 72)` | **horaire** → `(68, 100)` |
| **m** | `ponts` | 1 `m-hampe` | `(24, 60)` | `lineaire` → `(24, 100)` |
| | | 2 `m-arches` | `(24, 70)` | **horaire** → `(76, 100)` |
| **t** | `ponts` | 1 `t-hampe` | `(46, 30)` | `lineaire` → `(50, 98)` |
| | | 2 `t-barre` | `(30, 60)` | `lineaire` → `(62, 60)` |
| **p** | `ponts` | 1 `p-hampe` | `(30, 60)` | `lineaire` → `(30, 140)` |
| | | 2 `p-panse` | `(30, 60)` | **horaire** → `(30, 100)` |

**Ce que cette table garantit, et qui est la raison d'être de N1** :

- `b` ∈ `boucles`, `d` ∈ `ronds` — **familles différentes**, comme D33 l'exige ;
- `p` ∈ `ponts`, `q` ∈ `ronds` — **familles différentes** ;
- `d` s'attaque exactement comme `o`, `c`, `a`, `g`, `q` : rotation antihoraire depuis le haut
  droite. La consigne verbale devient identique pour toute la famille, ce qui est le point ;
- `b` et `p` s'attaquent tous deux par une descendante, mais l'une part de la hampe (`y = 20`,
  au-dessus) et l'autre de la hauteur d'x (`y = 60`, vers le jambage) : le geste dit le
  haut-bas ;
- **le `t` change** : son trait 1 mesuré aujourd'hui est `antihoraire` avec départ `(46,30)` et
  arrivée `(64,98)` — un crochet. La table le rend `lineaire` avec un crochet final court, pour
  ne pas mettre une rotation dans la famille des ponts.

**Ce que la table NE fait pas** : elle ne donne pas la géométrie. Les tableaux `points` sont
**dérivés** par le générateur (§ 4.1) depuis le départ, le sens et les repères de ligne, puis
**remesurés** par `sensMesure()` et refusés s'ils ne concordent pas (convention C6).

---

## 3. Les huit lots

Comptes **mesurés sur ce document même**, en dénombrant les lignes `C` et `M` des tableaux du
§ 4 — pas estimés (`node scripts/…/verifier-contrat.mjs`, sortie citée au § 9.3) :

| Lot | Feature | Lignes créées | Lignes modifiées | Total | Vague |
|---|---|---|---|---|---|
| **N1** | Ductus et moteur `trace` | 12 | 10 | 22 | 1 |
| **N2** | Voix | 14 | 6 | 20 | 1 |
| **N3** | Gobi décliné | 9 | 3 | 12 | 1 |
| **N4** | Séquence d'ouverture et ton | 11 | 5 | 16 | 2 |
| **N5** | Galerie parent et zone parent | 12 | 8 | 20 | 2 |
| **N6** | Campement et étagère | 8 | 6 | 14 | 2 |
| **N7** | Décor et graphisme | 10 | 4 | 14 | 2 |
| **N8** | Contenu et progression | 13 | 4 | 17 | 3 |
| | **Total** | **89** | **46** | **135** | |

**« Ligne » et non « fichier ».** Sept lignes portent un glob — `contenu/audio/**/*.opus`,
`contenu/assets/gobi/stades/stade-{1..10}.svg`, `contenu/exercices/clairiere/*.json`… — et
représentent chacune plusieurs dizaines de fichiers. Le compte réel de fichiers produits est
**supérieur à 135** et ne sera connu qu'à la livraison ; c'est pourquoi le contrat de sortie du
§ 9.2 porte sur des propriétés (`taux === 1`, `0` divergence) et non sur un nombre de fichiers.

**Aucun des huit lots n'est vide** — vérifié mécaniquement, `lots vides : 0`.

### 3.1 Ordre de lancement — trois vagues, une seule barrière

**Vague 1 — N1, N2, N3.** Fichiers disjoints, lancés ensemble. Ce sont les trois lots dont les
autres dépendent :
- N1 gèle `SensRotation`, `CodeFamilleGestuelle`, le référentiel de ductus ;
- N2 gèle `Locuteur` (7 membres), `CleAudio`, `ManifesteVoix` — **N4, N6 et N8 en dépendent** ;
- N3 gèle `CodeStadeGobi` (10 membres) et produit les assets — **N6 en dépend**.

**BARRIÈRE UNIQUE, après la vague 1.** Elle est justifiée par une raison et une seule : **N4, N6
et N8 écrivent tous des textes destinés à l'enfant, et chacun de ces textes doit avoir un clip
audio.** Sans le manifeste de N2, ils écriraient des `cleAudio` qui ne résolvent nulle part, et
D42 masquerait le bouton partout — c'est-à-dire exactement l'état actuel. La barrière est sur
`contenu/audio/manifeste.json`, rien d'autre.

**Vague 2 — N4, N5, N6, N7.** Fichiers disjoints.
**Vague 3 — N8.** Seul, parce qu'il écrit des exercices qui référencent les habillages de N7, les
lettres de N1 et les clips de N2.

### 3.2 Ce que l'orchestrateur vérifie lui-même

Rappel de D10 : **jeton unique, aucun agent ne compile ni n'installe.** Après chaque vague :

1. `npm run typescript` — la chaîne compile ;
2. `npm run lint` ;
3. **chaque symbole déclaré au § 5 a trouvé son propriétaire** — un contrat gelé n'oblige
   personne tant qu'un fichier n'est pas nommé pour chaque morceau ;
4. **lire le rapport de chaque lot AVANT d'agir dessus.**

---

## 4. Arborescence complète — fichier par fichier, avec son lot propriétaire

**Un seul écrivain par fichier, sans exception.** `C` = créé, `M` = modifié.

### 4.1 N1 — Ductus et moteur `trace`

| | Chemin | Rôle |
|---|---|---|
| C | `contenu/schemas/ductus.schema.json` | Le schéma du référentiel : `depart`, `sens`, `ordre`, `famille` obligatoires |
| C | `contenu/referentiel/ductus-minuscules.json` | **La donnée déclarée de D33.** Les 26 minuscules, dont les 16 de la table § 2.9 |
| C | `contenu/referentiel/ductus-familles.json` | Les 4 familles gestuelles, leur geste d'attaque et leurs lettres |
| C | `partage/src/moteurs/trace/ductus.ts` | Types du ductus, `sensMesure`, `familleDe`, `memeFamille` — **tout pur** |
| C | `client/src/moteurs/trace/TraceFantome.tsx` | Le tracé fantôme animé (D33, conséquence 3) |
| C | `client/src/moteurs/trace/FlecheRotation.tsx` | La flèche **de rotation** : un arc orienté, pas un chevron droit |
| C | `scripts/generer-modeles-lettres.mjs` | Dérive la géométrie depuis le ductus, **remesure sa sortie** (C6), refuse d'écrire sinon |
| C | `tests/unitaires/ductus.test.ts` | Le sens déclaré == le sens mesuré, pour les 26 lettres |
| C | `tests/unitaires/ductus-familles.test.ts` | `b` et `d` de familles différentes ; `p` et `q` aussi ; toute lettre a exactement une famille |
| C | `tests/unitaires/trace-trajectoires-imparfaites.test.ts` | **Le test qui compte** : § 9.1 |
| C | `tests/unitaires/modeles-lettres-sans-derive.test.ts` | Convention C5 : chaque copie inline == le référentiel |
| C | `tests/composants/TraceFantome.test.tsx` | Le fantôme s'anime, se tait sous `prefers-reduced-motion` |
| M | `contenu/modeles-lettres/minuscules.json` | **Régénéré** par le script. N'est plus écrit à la main |
| M | `contenu/exercices/galeries/miroir-bd-01.json` | Modèles régénérés. **N1 possède ces deux exercices**, pas N8 |
| M | `contenu/exercices/galeries/miroir-bp-01.json` | idem |
| M | `partage/src/moteurs/trace/types.ts` | `+ SensRotation`, `+ CodeFamilleGestuelle`, `TraitLettre.sens`, `ModeleLettre.famille`, `EtatTrace.nbRefusGeste` |
| M | `partage/src/moteurs/trace/validation.ts` | `+ 'sens-rotation'`, correction de `axeParInversionDeSens` (§ 2.7), barème de coût |
| M | `partage/src/moteurs/trace/moteur.ts` | Compteur `nbRefusGeste`, `vueAidable` l'agrège |
| M | `partage/src/moteurs/trace/schema-contenu.ts` | `sens` et `famille` obligatoires |
| M | `partage/src/moteurs/trace/index.ts` | Réexporte `ductus.js` |
| M | `client/src/moteurs/trace/GuidageLettre.tsx` | Emploie `FlecheRotation` et `TraceFantome` |
| M | `client/src/moteurs/trace/MoteurTrace.tsx` | Rend le fantôme au palier `demonstration` |

**N1 ne touche à aucun autre moteur, à aucun écran, à aucune migration.**

### 4.2 N2 — Voix

| | Chemin | Rôle |
|---|---|---|
| C | `scripts/telecharger-tts.mjs` | Installe **Piper dans `outils/bin/tts/`** (D9). Aucun `pip install` global |
| C | `scripts/rendre-voix.mjs` | Rendu **en lot, hors ligne**, encodage Opus par `ffmpeg` |
| C | `scripts/qc-voix.mjs` | Transcription inverse `faster-whisper` (D4, D6 : `large-v3`, `fr`, repli CPU/int8) |
| C | `scripts/recenser-textes.mjs` | Énumère **les OBJETS** qui doivent porter un audio, pas les occurrences du mot `audio` |
| C | `contenu/schemas/manifeste-audio.schema.json` | |
| C | `contenu/audio/manifeste.json` | Généré. La **seule** source de vérité de l'existence d'un clip |
| C | `contenu/audio/**/*.opus` | Les clips. Générés |
| C | `production/voix.lock.json` | Modèle, locuteur, vitesse, empreinte du texte, score QC — reproductibilité |
| C | `partage/src/voix/manifeste.ts` | Types + `clipDe`, `aUnAudio`, `couvertureConsignes` — **purs** |
| C | `partage/src/voix/index.ts` | Sous-chemin `@pierre/partage/voix` (convention C1 : valeurs hors barillet) |
| C | `client/src/services/voix-fichier.ts` | `FournisseurVoix` qui joue un clip pré-rendu |
| C | `serveur/src/routes/audio.ts` | `GET /api/audio/manifeste`, service statique de `contenu/audio/` |
| C | `tests/unitaires/manifeste-voix.test.ts` | |
| C | `tests/unitaires/couverture-audio.test.ts` | **Contrat de sortie : 100 % des consignes livrées ont un clip** |
| M | `partage/src/fournisseurs/voix.ts` | `Locuteur` : 4 → **7** ; `DemandeVoix.cle` remplace `clip` |
| M | `partage/src/index.ts` | Réexporte les **types** de `voix/manifeste.ts` |
| M | `client/src/composants/BoutonEcouter.tsx` | **D42 est DÉJÀ implantée (§ 1.9 bis).** N2 remplace seulement la condition `clip === null` par `!services.voix.aUnClip(cle)` |
| M | `client/src/etat/services.ts` | Câble `voix-fichier` ; `voix-navigateur` devient le repli |
| M | `serveur/src/application.ts` | Enregistre `routes/audio.ts` |
| M | `package.json` | `+ "voix": "node scripts/rendre-voix.mjs"`, `+ "voix:qc"` |

**N2 ne modifie AUCUN fichier d'exercice.** La résolution passe par la clé du manifeste, jamais
par le champ `audio` du JSON — c'est ce qui évite deux écrivains sur les mêmes exercices.

### 4.3 N3 — Gobi décliné

| | Chemin | Rôle |
|---|---|---|
| C | `production/personnages/gobi/canonique.png` | **L'image canonique verrouillée.** Fusion des deux références (D36) |
| C | `production/personnages/gobi/gobi.lock.json` | Workflow, modèle, graine, CFG, pas, empreinte de la canonique |
| C | `production/workflows/gobi-declinaison.api.json` | Workflow figé Qwen-Image-Edit / Flux Kontext |
| C | `scripts/decliner-gobi.mjs` | **Repart de la canonique à CHAQUE déclinaison** (D32) |
| C | `contenu/assets/gobi/animation/{repos,joie,aide,hesitation,apparition}.svg` | Les 5 états (5 fichiers) |
| C | `contenu/assets/gobi/stades/stade-{1..10}.svg` | Les 10 stades (D43) |
| C | `contenu/assets/gobi/formes/*.svg` | ≥ 10 formes de graphèmes |
| C | `tests/unitaires/gobi-stades.test.ts` | 8 ≤ stades ≤ 10 ; rangs strictement croissants ; irréversibilité |
| C | `tests/unitaires/gobi-assets.test.ts` | Chaque `asset` déclaré existe sur disque |
| M | `contenu/monde/gobi-stades.json` | **5 → 10 stades**, seuils en formes recalibrés |
| M | `partage/src/monde/types.ts` | `CodeStadeGobi` : 5 → **10** membres |
| M | `partage/src/monde/gobi.ts` | `prochainStade` sur 10 rangs |

**Aucune migration** : `stade_gobi.stade_code` n'a pas de `CHECK` (§ 1.9).
**Aucune suppression** : `stade-1-oeuf.svg` … `stade-5-gardien.svg` restent en place et sont
réutilisés comme stades 1, 3, 5, 7 et 10 — les cinq séries deviennent des stades, pas des échecs
(D28).

### 4.4 N4 — Séquence d'ouverture et ton

| | Chemin | Rôle |
|---|---|---|
| C | `partage/src/ouverture/types.ts` | `TableauOuverture`, `SequenceOuverture` |
| C | `partage/src/ouverture/index.ts` | Sous-chemin `@pierre/partage/ouverture` |
| C | `partage/src/ton/index.ts` | `FORMULATIONS_DE_PERTE`, `enonceUnePerte` — **la mécanique de C7** |
| C | `contenu/monde/ouverture.json` | Les 5 tableaux : la Pierre, la Grisaille, les noms, les habitants, l'appel |
| C | `contenu/schemas/ouverture.schema.json` | |
| C | `contenu/habillages/ouverture/*.svg` | 5 décors de tableau |
| C | `client/src/ecrans/EcranOuverture.tsx` | **Passable au tap dès la première seconde** |
| C | `client/src/monde/TableauOuverture.tsx` | |
| C | `tests/composants/EcranOuverture.test.tsx` | Le tap passe à `t = 0` ; rejouable ; jamais bloquant |
| C | `tests/unitaires/ton-sans-perte.test.ts` | **C7 : aucun texte enfant n'énonce une perte** |
| C | `tests/e2e/parcours-ouverture.spec.ts` | Vue une fois, sautable, rejouable depuis le campement |
| M | `client/src/routeur.tsx` | `+ CHEMINS.ouverture = '/ouverture'` |
| M | `client/src/ecrans/EcranCarte.tsx` | **Ligne 153 : « Le monde t'attend en gris. »** → une formulation d'action |
| M | `partage/src/index.ts` | Réexporte les types d'ouverture |
| M | `serveur/migrations/007_ouverture.sql` | *(voir § 7)* — table `ouverture_vue` |
| M | `serveur/src/depots/monde.ts` | Lecture / écriture de `ouverture_vue` |

**Le seul texte enfant fautif mesuré aujourd'hui est `EcranCarte.tsx:153`** :

```
$ grep -rniE "en gris|perdu|il manque" client/src --include=*.tsx | grep -v "^\s*//"
client/src/ecrans/EcranCarte.tsx:153: Bonjour {profil.prenom} ! Le monde t’attend en gris.
```

Tout le reste des occurrences relevées sont des **commentaires**. N4 relit néanmoins l'intégralité
des chaînes : la mesure dit ce qui est fautif aujourd'hui, pas ce que les autres lots écriront.

### 4.5 N5 — Galerie parent et zone parent complète

| | Chemin | Rôle |
|---|---|---|
| C | `partage/src/parent/galerie.ts` | `EntreeGalerie`, `CatalogueGalerie`, `OptionsLancement` |
| C | `serveur/src/routes/parent-galerie.ts` | `GET /api/parent/:profil/galerie` |
| C | `serveur/src/services/catalogue-exercices.ts` | Énumère **tous** les exercices, quel que soit l'état de progression |
| C | `client/src/parent/GalerieExercices.tsx` | Moteur · habillage · compétences · état de validation affichés |
| C | `client/src/parent/FicheExercice.tsx` | |
| C | `client/src/ecrans/EcranGalerieParent.tsx` | |
| C | `client/src/ecrans/EcranDefinirCode.tsx` | **La première définition du code — ce qui manque aujourd'hui** |
| C | `tests/api/parent-galerie.test.ts` | |
| C | `tests/unitaires/galerie-non-journalisee.test.ts` | **Contrat de sortie : 0 ligne dans `tentatives` après N lancements** |
| C | `tests/e2e/parcours-galerie-parent.spec.ts` | Invisible côté enfant ; tout exercice lançable |
| C | `tests/api/parent-definir-code.test.ts` | Une seconde définition sans jeton est refusée |
| C | `tests/qualite/a11y-galerie.spec.ts` | |
| M | `serveur/src/routes/parent.ts` | **`POST /api/parent/definir` ; `POST /api/parent/ouvrir` ne pose PLUS le code en silence** ; `GET /api/parent/etat` |
| M | `serveur/src/depots/parent.ts` | `codeEstDefini()` |
| M | `client/src/ecrans/EcranCodeParent.tsx` | Redirige vers `EcranDefinirCode` quand aucun code n'est posé |
| M | `client/src/ecrans/EcranDashboard.tsx` | Onglet galerie ; latence, top 10 **par axe**, carte de couverture, exports |
| M | `client/src/parent/TopConfusions.tsx` | Séparation `gauche-droite` / `haut-bas` rendue visible |
| M | `client/src/routeur.tsx` | *(N4 possède ce fichier — voir § 6.2)* |
| M | `README.md` | **Documente le code à 4 chiffres, sa définition, son oubli** |
| M | `CLAUDE.md` | Corrige « Il n'y a aucun code » (§ 1.1) |

### 4.6 N6 — Campement et étagère

| | Chemin | Rôle |
|---|---|---|
| C | `partage/src/monde/etagere.ts` | `CaseEtagere`, `Etagere`, `construireEtagere` — **cases vides comprises** |
| C | `client/src/monde/Etagere.tsx` | L'album de vignettes, cases en creux VISIBLES (D44) |
| C | `client/src/monde/PastilleSortie.tsx` | **Le bouton « partir en sortie » — un tap depuis l'ouverture (D46)** |
| C | `tests/unitaires/etagere.test.ts` | `cases.length === nbTotal` toujours ; aucune case cachée |
| C | `tests/composants/Etagere.test.tsx` | |
| C | `tests/e2e/parcours-un-tap.spec.ts` | **Contrat de sortie : ≤ 1 tap de l'ouverture au premier nœud** |
| C | `tests/e2e/parcours-campement-sans-texte.spec.ts` | R18 : le campement se comprend sans une ligne de texte |
| C | `tests/unitaires/campement-25-gratuits.test.ts` | R11 : ≥ 25 points, ≥ 10 animations uniques |
| M | `contenu/monde/campement.json` | Répliques câblées sur les clés du manifeste N2. **Les 30 points sont CONSERVÉS** (D45) |
| M | `client/src/ecrans/EcranCampement.tsx` | Étagère intégrée ; rejouer l'ouverture (D35, point 3) |
| M | `client/src/ecrans/EcranCoffre.tsx` | Emploie `Etagere` |
| M | `client/src/ecrans/EcranProfils.tsx` | **`PastilleSortie` par profil** : le tap qui choisit le profil part directement en sortie |
| M | `client/src/ecrans/EcranCarte.tsx` | *(N4 possède ce fichier — voir § 6.2)* |
| M | `serveur/migrations/008_etagere.sql` | *(voir § 7)* |

### 4.7 N7 — Décor et graphisme

| | Chemin | Rôle |
|---|---|---|
| C | `contenu/habillages/clairiere/ecole.v2.svg` | Cour d'école **reconnaissable** : maîtresse adulte, tableau, arbres à tronc et houppier |
| C | `contenu/habillages/galeries/grottes.v2.svg` | |
| C | `contenu/habillages/carte/carte-monde.v2.svg` | |
| C | `client/src/monde/NomDeRegion.tsx` | Le nom au survol **et au maintien** (tablette : pas de survol) |
| C | `scripts/verifier-regions-fermees.mjs` | Contrôle **bloquant** : une région ouverte fait fuiter le remplissage |
| C | `tests/unitaires/decor-reconnaissable.test.ts` | Silhouette adulte ≥ 1,35 × élève ; objet de classe présent |
| C | `tests/unitaires/regions-fermees.test.ts` | |
| C | `tests/unitaires/ids-regions-stables.test.ts` | **Contrat de sortie : aucun `id` de région n'a changé** |
| C | `tests/composants/NomDeRegion.test.tsx` | |
| C | `tests/visuel/decor-v2.spec.ts` | |
| M | `contenu/habillages/clairiere/ecole.habillage.json` | Pointe la `.v2.svg`. **Les `id` de région ne changent JAMAIS** |
| M | `contenu/habillages/galeries/grottes.habillage.json` | idem |
| M | `contenu/monde/regions.json` | Libellés et ambiances relus au ton de C7 |
| M | `Docs/environnement-et-outillage.md` | Consigne la validation du nuancier de 11 couleurs (D37) |

**Rappel opposable** : `partage/src/palette.ts` **n'est pas modifié**. Les 11 couleurs y sont déjà
(§ 1.9) ; D37 les valide, elle n'en ajoute aucune. Un lot qui y touche sort de son périmètre.

### 4.8 N8 — Contenu et progression

| | Chemin | Rôle |
|---|---|---|
| C | `scripts/generer-phonologie.mjs` | Pilote llama.cpp (**port 8001**, D5). **Écrit dans `contenu/brouillons/` uniquement** |
| C | `scripts/valider-brouillons.mjs` | Couverture lexicale CE1 ; refuse au lieu d'émettre du faux |
| C | `contenu/brouillons/phonologie/clairiere/*.json` | Voyelles, CV, mots outils — le matériau qui manque (O10) |
| C | `contenu/brouillons/phonologie/galeries/*.json` | CVC, `b`/`d`/`p`/`q` **par axe**, sons proches |
| C | `contenu/exercices/clairiere/*.json` | ≥ 8 exercices neufs, câblés sur les 15 fiches ingérées |
| C | `contenu/exercices/galeries/*.json` | ≥ 8 exercices neufs. **Sauf `miroir-bd-01` et `miroir-bp-01`, qui sont à N1** |
| C | `contenu/noeuds/clairiere-06.json` | **Un seul nœud à créer** : `clairiere-02` à `-05` ont été livrés par la campagne parallèle (§ 1.9 bis). Relire le répertoire avant d'écrire |
| C | `contenu/noeuds/galeries-{03..06}.json` | **Les Galeries passent de 2 à 6 nœuds** |
| C | `tests/unitaires/sortie-variete.test.ts` | **R13 : jamais deux fois le même habillage dans une sortie** |
| C | `tests/unitaires/competences-trois-moteurs.test.ts` | **R12 : ≥ 3 moteurs par compétence** |
| C | `tests/unitaires/phonologie-couverture.test.ts` | **Contrat de sortie : O10 clos, chiffres à l'appui** |
| C | `tests/unitaires/fiches-cablees.test.ts` | Les 15 brouillons du niveau 1 sont tous atteints |
| C | `tests/e2e/parcours-sortie-6-noeuds.spec.ts` | |
| M | `contenu/monde/regions.json` | *(N7 possède ce fichier — voir § 6.2)* |
| M | `contenu/referentiel/competences.json` | `+ gph.miroir.gauche-droite`, `+ gph.miroir.haut-bas` — les deux codes que le moteur `trace` dérive déjà (`moteur.ts:117`) et que le référentiel ne porte pas |
| M | `contenu/referentiel/parametres-pedagogie.json` | `p_devinette` pour `trace` |
| M | `partage/src/pedagogie/selecteur.ts` | Sorties de 4 à 6 nœuds, variation de moteur **et** d'habillage à chaque passage |

---

## 5. Le code exact des types partagés

### 5.1 N1 — `partage/src/moteurs/trace/ductus.ts` (créé)

```ts
/**
 * Le ductus — DONNÉE DÉCLARÉE, jamais dérivée de la forme (D33, conséquence 1).
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM.
 *
 * CE QUE CE FICHIER GARANTIT, et que rien d'autre dans le dépôt ne garantissait :
 * le sens de rotation DÉCLARÉ et le sens de rotation MESURÉ sur la géométrie sont
 * comparables. `sensMesure` est la fonction qui rend la convention C6 exécutable —
 * un ductus déclaré mais jamais remesuré n'est pas une donnée, c'est un commentaire.
 */

import type { AxeMiroir } from '../../pedagogie/types.js';
import type { Point } from '../commun/geometrie.js';
import type { CasseLettre, IdTrait } from './types.js';

/**
 * Le sens de rotation d'un trait.
 *
 * CONVENTION DE SIGNE, contrôlée et opposable : en coordonnées SVG l'axe `y` descend, donc
 * l'aire signée (formule du lacet) est **positive pour un parcours horaire à l'écran**.
 * Témoin vérifiable : le triangle (0,0) → (1,0) → (1,1), horaire à l'écran, donne +1.
 */
export type SensRotation = 'horaire' | 'antihoraire' | 'lineaire';

/**
 * Les quatre familles gestuelles de l'écriture française (D33).
 *
 * On travaille UNE famille à la fois, pour automatiser le geste d'attaque avant de passer à
 * la suivante. C'est ce regroupement — et non la ressemblance visuelle — qui distingue `b`
 * de `d` : `b` s'attaque par une haute descendante, `d` par la rotation antihoraire du `o`.
 */
export type CodeFamilleGestuelle = 'ronds' | 'boucles' | 'ponts' | 'jambages';

/** Sous ce seuil d'aire signée, un trait est déclaré `lineaire` : il ne tourne pas. */
export const AIRE_MINIMALE_ROTATION = 50;

export interface FamilleGestuelle {
  readonly code: CodeFamilleGestuelle;
  readonly libelle: string;
  /** Dit à voix haute avant l'exercice : « on part du haut à droite et on tourne à gauche ». */
  readonly gesteDAttaque: string;
  readonly lettres: readonly string[];
}

export interface DuctusTrait {
  readonly id: IdTrait;
  /** À partir de 1. Le `d` fait le rond AVANT la hampe, jamais l'inverse (D33). */
  readonly ordre: number;
  readonly depart: Point;
  readonly arrivee: Point;
  /** DÉCLARÉ. `generer-modeles-lettres.mjs` refuse d'écrire si la géométrie le contredit. */
  readonly sens: SensRotation;
  /** Vrai quand le trait se referme sur son départ (le rond du `o`, du `a`, du `d`). */
  readonly ferme: boolean;
  /** « le rond », « la grande barre » — dit à voix haute au palier `indice`. */
  readonly libelle: string;
}

export interface DuctusLettre {
  readonly lettre: string;
  readonly casse: CasseLettre;
  /** EXACTEMENT une famille par lettre. Un test échoue s'il y en a zéro ou deux. */
  readonly famille: CodeFamilleGestuelle;
  readonly axeRisque: AxeMiroir | null;
  readonly traits: readonly DuctusTrait[];
}

/** Les repères de ligne du `viewBox`, en unités de dessin. */
export interface LignesEcriture {
  readonly hampe: number;      // 20
  readonly hauteurX: number;   // 60
  readonly base: number;       // 100
  readonly jambage: number;    // 140
}

export interface ReferentielDuctus {
  readonly viewBox: string;
  readonly lignes: LignesEcriture;
  readonly familles: readonly FamilleGestuelle[];
  readonly lettres: readonly DuctusLettre[];
}

/**
 * Le sens de rotation MESURÉ d'une suite de points, par l'aire signée.
 *
 * C'est la fonction de contrôle de la convention C6. Elle est exportée pour que le
 * générateur, le test et le moteur mesurent tous la même chose de la même façon : trois
 * implantations de la même formule finiraient par diverger sur un cas limite.
 */
export function sensMesure(points: readonly Point[]): SensRotation;

/** La famille d'une lettre, `null` si elle n'est pas au référentiel. */
export function familleDe(referentiel: ReferentielDuctus, lettre: string): CodeFamilleGestuelle | null;

/** Les lettres d'une famille, dans l'ordre d'apprentissage déclaré. */
export function lettresDeLaFamille(
  referentiel: ReferentielDuctus,
  famille: CodeFamilleGestuelle,
): readonly string[];

/**
 * Deux lettres partagent-elles leur famille gestuelle ?
 *
 * `memeFamille(ref, 'b', 'd')` DOIT rendre `false` : c'est la propriété que D33 nomme comme
 * le seul levier documenté contre la confusion miroir, et `ductus-familles.test.ts` en fait
 * une assertion.
 */
export function memeFamille(referentiel: ReferentielDuctus, a: string, b: string): boolean;
```

### 5.2 N1 — additions à `partage/src/moteurs/trace/types.ts` (modifié)

```ts
import type { CodeFamilleGestuelle, SensRotation } from './ductus.js';

export interface TraitLettre {
  readonly id: IdTrait;
  readonly ordre: number;
  readonly chemin: string;
  readonly points: readonly Point[];
  readonly depart: Point;
  readonly arrivee: Point;
  readonly libelle: string;
  /** AJOUT N1 — le sens DÉCLARÉ. `sensMesure(points)` doit rendre la même valeur. */
  readonly sens: SensRotation;
}

export interface ModeleLettre {
  readonly lettre: string;
  readonly casse: CasseLettre;
  readonly viewBox: string;
  readonly traits: readonly TraitLettre[];
  readonly axeRisque: AxeMiroir | null;
  /** AJOUT N1 — D33, conséquence 4 : on regroupe par famille, jamais par ressemblance. */
  readonly famille: CodeFamilleGestuelle;
}

export interface EtatTrace {
  // … champs existants inchangés …

  /**
   * AJOUT N1 — **ce qui coûte une étoile**, et c'est désormais le hors-ordre SEUL.
   * Un sens raté, un départ manqué, une couverture insuffisante ne sont pas des erreurs :
   * ce sont des gestes à refaire (R14, R16).
   */
  readonly nbErreurs: number;

  /**
   * AJOUT N1 — les refus qui font MÛRIR L'AIDE sans rien coûter.
   *
   * Sans ce compteur, desserrer le coût du sens (§ 5.3) supprimerait aussi la gradation
   * d'aide de D16 : plus d'erreur comptée, donc plus de palier accordé, donc un enfant seul
   * devant un geste qu'il ne trouve pas. `vueAidable` agrège `nbErreurs + nbRefusGeste`.
   */
  readonly nbRefusGeste: number;
}
```

### 5.3 N1 — `partage/src/moteurs/trace/validation.ts` (modifié)

```ts
export type MotifRefusTrace =
  | 'depart-eloigne'
  | 'sens-inverse'     // le trait est parcouru de la fin vers le début
  | 'sens-rotation'    // AJOUT N1 — bonne extrémité de départ, rotation OPPOSÉE
  | 'trace-incomplet'
  | 'trait-hors-ordre';

/**
 * MODIFIÉ N1 — **le sens ne coûte plus une étoile.**
 *
 * D33, conséquence 5 : « on assouplit la précision (R16), jamais le sens ». Le sens reste
 * REFUSÉ — `acceptee` vaut `false`, le trait se redemande, le guidage se renforce — mais il
 * ne se facture pas. Un enfant de sept ans qui découvre un geste ne doit pas payer sa
 * découverte en étoiles ; R14 dit qu'un acquis n'est jamais repris, et le geste juste n'est
 * pas encore un acquis.
 *
 * Seul `trait-hors-ordre` compte : commencer le `d` par la hampe, c'est avoir compris une
 * AUTRE lettre — c'est ce que le journal doit dire.
 */
export const REFUS_TRACE_COMPTE_ERREUR: Readonly<Record<MotifRefusTrace, boolean>> = {
  'depart-eloigne': false,
  'sens-inverse': false,
  'sens-rotation': false,
  'trace-incomplet': false,
  'trait-hors-ordre': true,
};

/**
 * CORRIGÉ N1 — la fonction qui salissait le top 10 de D23 (§ 2.7 du contrat v3).
 *
 * AVANT : tout `sens-inverse` rendait `modele.axeRisque`, donc un enfant qui traçait la BONNE
 * lettre à l'envers était enregistré comme une confusion `b`→`d` qu'il n'avait pas commise.
 *
 * APRÈS : un sens raté est un sens raté, jamais un miroir. L'axe ne vient plus QUE de la voie
 * géométrique — `axeDuTrait`, qui compare le geste au reflet du modèle et exige que le reflet
 * soit MIEUX couvert que l'original. Une inversion de sens seule ne franchit pas ce test, et
 * c'est correct : elle n'est pas une confusion de lettre.
 */
export function axeParInversionDeSens(): null;

/**
 * AJOUT N1 — la rotation du geste est-elle celle qui est déclarée ?
 *
 * Distincte de `sensRespecte`, et il faut les deux : `sensRespecte` regarde l'ORDRE de
 * parcours des points du modèle ; `rotationRespectee` regarde le SENS DE ROTATION du geste
 * de l'enfant, mesuré sur ses propres échantillons. Un rond parcouru dans l'autre sens peut
 * couvrir le modèle correctement point par point tout en tournant à l'envers.
 */
export function rotationRespectee(
  trait: TraitLettre,
  geste: readonly EchantillonGeste[],
): boolean;
```

### 5.4 N2 — `partage/src/voix/manifeste.ts` (créé)

```ts
/**
 * Le manifeste des voix — la SEULE source de vérité sur l'existence d'un clip.
 *
 * « Rien n'est synthétisé à l'exécution » (CLAUDE.md) : les clips sont des artefacts de build.
 * Tout ce fichier est PUR.
 *
 * POURQUOI LE MANIFESTE ET PAS LE CHAMP `audio` DES EXERCICES : D42 masque le bouton quand
 * aucun audio n'existe, donc l'application doit répondre à « ce texte a-t-il un clip ? » AVANT
 * de rendre quoi que ce soit. Un champ `audio` dans l'exercice obligerait N2 à réécrire les
 * fichiers d'exercices — dont N1 et N8 sont propriétaires. Le manifeste évite le second
 * écrivain, et il reste la seule chose que le contrôle qualité met à jour.
 */

import type { CheminAsset, Horodatage } from '../identifiants.js';

/**
 * Les SEPT locuteurs (D41). Aucun enregistrement familial ; tout est synthétique.
 *
 * `'enfant'` est RETIRÉ de l'union v1 : D41 écarte l'enregistrement familial, et une voix
 * d'enfant synthétique ne sert aucune consigne. Les quatre compagnons entrent, parce que ce
 * sont eux qui parlent en région (`CodeCompagnon`, `pedagogie/types.ts:145`).
 */
export type Locuteur =
  | 'narrateur'
  | 'gobi'
  | 'maitresse'
  | 'filou'
  | 'bulle'
  | 'roc'
  | 'plume';

/**
 * La clé d'un clip, stable et lisible : `<idExercice>/<idConsigne>` pour une consigne,
 * `campement/<idPoint>` pour une réplique, `ouverture/<codeTableau>` pour un tableau.
 * Elle ne contient jamais le locuteur ni le rendu : ceux-ci sont des variantes de la MÊME clé.
 */
export type CleAudio = string;

/**
 * Le rendu demandé. `syllabe` est celui de D33/R15 sur les mots cibles, et le contrat de
 * sortie de N2 l'exige pour **chaque mot cible**, pas seulement pour la consigne entière.
 */
export type RenduVoix = 'normal' | 'syllabe' | 'lent';

export interface ClipVoix {
  readonly cle: CleAudio;
  readonly rendu: RenduVoix;
  readonly locuteur: Locuteur;
  /** Le texte source, tel qu'il est écrit à l'écran (apostrophes typographiques comprises). */
  readonly texte: string;
  /** Relatif à `contenu/`, ex. `audio/clairiere/ecole-01-c1.opus`. */
  readonly fichier: CheminAsset;
  readonly dureeMs: number;
  readonly octets: number;
  /** SHA-256 du texte source. Un texte modifié rend le clip périmé, mécaniquement. */
  readonly empreinteTexte: string;
  /**
   * Similarité de la transcription inverse (faster-whisper `large-v3`, `fr`), 0 à 1.
   * Sous `SEUIL_QC`, le clip N'ENTRE PAS au manifeste : un clip inintelligible est pire
   * qu'un bouton absent (D42).
   */
  readonly qcScore: number;
}

export interface ManifesteVoix {
  readonly version: number;
  readonly genereLe: Horodatage;
  /** Ex. `piper/fr_FR-siwis-medium`. Consigné pour la reproductibilité. */
  readonly moteurTts: string;
  readonly clips: readonly ClipVoix[];
}

export const SEUIL_QC = 0.85;

export function clipDe(
  manifeste: ManifesteVoix,
  cle: CleAudio,
  rendu?: RenduVoix,
): ClipVoix | null;

/** LA fonction de D42 : le bouton « écouter » n'est rendu que si elle vaut `true`. */
export function aUnAudio(manifeste: ManifesteVoix, cle: CleAudio | null): boolean;

export interface CouvertureAudio {
  readonly total: number;
  readonly couverts: number;
  /** `couverts / total`. **Le contrat de sortie de N2 exige 1.** */
  readonly taux: number;
  readonly manquants: readonly CleAudio[];
}

/**
 * CONTRAT DE SORTIE DE N2, sous forme de fonction.
 *
 * `cles` est la liste des OBJETS qui doivent porter un audio — énumérée par
 * `scripts/recenser-textes.mjs` depuis les exercices, le campement et l'ouverture — et non
 * la liste des occurrences du mot `audio`. Auditer une propriété, c'est énumérer les objets
 * qui devraient la porter.
 */
export function couvertureConsignes(
  manifeste: ManifesteVoix,
  cles: readonly CleAudio[],
): CouvertureAudio;
```

### 5.5 N2 — `partage/src/fournisseurs/voix.ts` (modifié)

```ts
import type { CleAudio, Locuteur } from '../voix/manifeste.js';

export type { Locuteur };

export interface DemandeVoix {
  readonly texte: string;
  readonly locuteur?: Locuteur;
  /**
   * REMPLACE `clip` — la clé du manifeste, jamais un chemin de fichier.
   * Le fournisseur résout ; l'appelant n'a pas à connaître l'arborescence de `contenu/audio/`.
   */
  readonly cle?: CleAudio | null;
  readonly vitesse?: number;
  readonly syllabe?: boolean;
}

export interface FournisseurVoix {
  dire(demande: DemandeVoix): Promise<void>;
  taire(): void;
  readonly disponible: boolean;
  /** AJOUT N2 — ce que `BoutonEcouter` interroge avant de se rendre (D42). */
  aUnClip(cle: CleAudio | null): boolean;
}
```

### 5.6 N2 — `client/src/composants/BoutonEcouter.tsx` (modifié)

```ts
export interface ProprietesBoutonEcouter {
  readonly texte: string;
  /** AJOUT N2 — remplace `clip`. `null` ⇒ le bouton ne se rend pas. */
  readonly cle: CleAudio | null;
  readonly locuteur?: Locuteur;
  readonly libelle?: string;
  readonly surEcoute?: () => void;
}

/**
 * D42 EST DÉJÀ IMPLANTÉE — voir § 1.6 et § 1.9 bis. Le composant rend déjà
 * `ReactElement | null` et se masque sur `clip === null || !reglagesFoyer.boutonEcouter`.
 *
 * CE QUE N2 CHANGE, ET RIEN D'AUTRE : la condition de masquage cesse de regarder un chemin
 * de fichier passé par l'appelant, et regarde le MANIFESTE. C'est la seule façon de tenir
 * D42 sans que chaque appelant ait à savoir si un clip existe :
 *
 *     if (!services.voix.aUnClip(cle) || !reglagesFoyer.boutonEcouter) return null;
 *
 * Le second refus, le réglage foyer, est CONSERVÉ tel quel. N2 n'y touche pas.
 */
export function BoutonEcouter(p: ProprietesBoutonEcouter): ReactElement | null;
```

**`reglages-foyer.ts` n'appartient à aucun lot de cette campagne** — il vient de la campagne
parallèle (§ 1.9 bis). N2 et N5 le **lisent** ; aucun des huit lots ne le réécrit.

### 5.7 N3 — `partage/src/monde/types.ts` (modifié)

```ts
/**
 * MODIFIÉ N3 — 5 → 10 stades (D43 : « 8 à 10 stades, à petits pas »).
 *
 * Chaque stade est un changement discret — un cristal de plus, une teinte qui glisse. Le
 * CRISTAL porte l'évolution ; le CORPS ne change jamais (D28, D36).
 *
 * Les cinq codes de la v1 sont CONSERVÉS aux rangs 1, 3, 5, 7 et 10 : les assets existants
 * restent valides, et les cinq séries de production deviennent cinq stades, pas cinq échecs.
 */
export type CodeStadeGobi =
  | 'oeuf'            // 1 — l'asset `stade-1-oeuf.svg` existant
  | 'fissure'         // 2
  | 'boule'           // 3 — `stade-2-boule.svg`
  | 'premier-cristal' // 4
  | 'crete'           // 5 — `stade-3-crete.svg`
  | 'couronne'        // 6
  | 'equipe'          // 7 — `stade-4-equipe.svg`
  | 'besace'          // 8
  | 'veilleur'        // 9
  | 'gardien';        // 10 — `stade-5-gardien.svg`
```

### 5.8 N4 — `partage/src/ouverture/types.ts` (créé)

```ts
/**
 * La séquence d'ouverture — D35. Elle porte le sens de tout le mécanisme de recoloration :
 * sans elle, le gris est une tristesse ; avec elle, c'est un travail qui attend l'enfant.
 */

import type { CheminAsset } from '../identifiants.js';
import type { CleAudio } from '../voix/manifeste.js';

export type CodeTableauOuverture =
  | 'pierre'      // la Pierre se brise
  | 'grisaille'   // ce qui n'a plus de nom perd ses couleurs
  | 'noms'        // toi, tu sais encore lire les noms
  | 'habitants'   // les habitants t'attendent
  | 'appel';      // viens

export interface TableauOuverture {
  readonly code: CodeTableauOuverture;
  /** Relu par `enonceUnePerte` : il dit ce que l'enfant peut rendre, jamais ce qui manque. */
  readonly texte: string;
  readonly cleAudio: CleAudio;
  readonly dureeMs: number;
  readonly asset: CheminAsset;
}

export interface SequenceOuverture {
  readonly tableaux: readonly TableauOuverture[];
  /**
   * **Vaut 0.** D35, point 3 : « passable au tap dès la première seconde ». Le champ existe
   * pour que la valeur soit une donnée relue en revue, et non un `0` perdu dans du JSX.
   */
  readonly passableDesMs: number;
}
```

### 5.9 N4 — `partage/src/ton/index.ts` (créé)

```ts
/**
 * La mécanique de la convention C7 — D35, conséquence 2.
 *
 * « Le jeu ne dit jamais ce qui manque, il dit toujours ce que l'enfant peut rendre. Jamais
 * "le monde est gris", toujours "tu peux lui rendre ses couleurs". »
 *
 * Ce n'est PAS un correcteur automatique : c'est un filet. Il attrape les formulations dont
 * on sait qu'elles énoncent une perte, et il propose le retournement. Un humain écrit la
 * phrase ; le test refuse celles qui retombent dans le piège.
 */

export interface FormulationDePerte {
  readonly motif: RegExp;
  readonly pourquoi: string;
  readonly remede: string;
}

export const FORMULATIONS_DE_PERTE: readonly FormulationDePerte[];

/** `null` quand le texte est bon. Sinon, la règle enfreinte et son remède. */
export function enonceUnePerte(texte: string): FormulationDePerte | null;

/**
 * Tous les textes destinés à l'enfant, énumérés pour le test de C7.
 *
 * ÉNUMÈRE LES OBJETS, jamais les occurrences : la liste est celle des sources de texte —
 * consignes d'exercices, libellés de campement, tableaux d'ouverture, libellés de région,
 * chaînes littérales des écrans — et non le résultat d'un `grep` sur un mot.
 */
export function textesDestinesALEnfant(): readonly string[];
```

### 5.10 N5 — `partage/src/parent/galerie.ts` (créé)

```ts
/**
 * La galerie d'exercices de la zone parent — D34.
 *
 * TROIS PROPRIÉTÉS OPPOSABLES :
 *   1. tout exercice du catalogue est lançable, quel que soit l'état de progression ;
 *   2. **RIEN de ce qui s'y joue n'est journalisé** — sinon un parent qui teste fausse les
 *      statistiques de l'enfant, et le journal cesse de faire foi ;
 *   3. l'entrée est invisible depuis l'espace enfant.
 */

import type {
  CodeCompetence, CodeMoteur, CodeRegion, IdExercice, IdHabillage,
} from '../identifiants.js';

export type StatutValidation = 'en-attente' | 'valide' | 'rejete' | 'livre';

export interface EntreeGalerie {
  readonly exercice: IdExercice;
  readonly titre: string;
  readonly moteur: CodeMoteur;
  readonly habillage: IdHabillage;
  readonly competences: readonly CodeCompetence[];
  readonly statut: StatutValidation;
  readonly region: CodeRegion | null;
  /** Chemin sur disque — c'est aussi l'écran de relecture de l'annexe P § 6.3. */
  readonly chemin: string;
}

export interface CatalogueGalerie {
  readonly entrees: readonly EntreeGalerie[];
  /** Bénéfice de D34 : R12 et R13 deviennent vérifiables À L'ŒIL, pas seulement par un test. */
  readonly moteursParCompetence: Readonly<Record<CodeCompetence, readonly CodeMoteur[]>>;
  readonly habillagesParMoteur: Readonly<Record<CodeMoteur, readonly IdHabillage[]>>;
}

/**
 * Le drapeau qui traverse tout le chemin de lancement.
 *
 * `journalise: false` n'est PAS un filtre appliqué au serveur : le client ne poste rien du
 * tout. Un filtre serveur laisserait la requête partir, donc laisserait un jour quelqu'un
 * l'oublier. `tests/unitaires/galerie-non-journalisee.test.ts` compte les lignes de
 * `tentatives` avant et après N lancements, et exige l'égalité.
 */
export interface OptionsLancement {
  readonly journalise: boolean;
}

export const LANCEMENT_PARENT: OptionsLancement = { journalise: false };
export const LANCEMENT_ENFANT: OptionsLancement = { journalise: true };

/** L'état de la porte parent — ce qui permet de distinguer « pas de code » de « code faux ». */
export interface EtatPorteParent {
  readonly codeDefini: boolean;
  readonly verrouilleJusqua: string | null;
  readonly nbEchecs: number;
}
```

### 5.11 N6 — `partage/src/monde/etagere.ts` (créé)

```ts
/**
 * L'étagère des formes de Gobi — D44.
 *
 * « Comme un album de vignettes : les emplacements non gagnés sont EN CREUX et VISIBLES. »
 * D25, point 3 : ce qui motive, c'est de voir la case suivante encore vide.
 *
 * LA PROPRIÉTÉ QUI FAIT TOUT : `cases.length === nbTotal`, TOUJOURS. Une case non gagnée
 * n'est pas absente de la liste, elle y est avec `obtenue: false`. Un composant ne peut donc
 * pas « oublier » de rendre le vide — il n'a pas de liste où le vide serait absent.
 */

import type { CheminAsset, Horodatage } from '../identifiants.js';
import type { CodeGrapheme, FormeGobi } from './types.js';

export interface CaseEtagere {
  /** Position sur l'étagère, à partir de 1. Stable : une case ne se déplace jamais. */
  readonly rang: number;
  readonly grapheme: CodeGrapheme;
  readonly libelle: string;
  readonly cristal: CheminAsset;
  /** `false` ⇒ rendue EN CREUX, jamais masquée, jamais cadenassée. */
  readonly obtenue: boolean;
  readonly obtenueLe: Horodatage | null;
}

export interface Etagere {
  readonly cases: readonly CaseEtagere[];
  readonly nbObtenues: number;
  readonly nbTotal: number;
}

export interface CatalogueFormes {
  readonly formes: readonly {
    readonly grapheme: CodeGrapheme;
    readonly libelle: string;
    readonly cristal: CheminAsset;
  }[];
}

/**
 * Construit l'étagère complète. `formes` sont celles que l'enfant a gagnées ; toutes les
 * autres apparaissent quand même, en creux.
 */
export function construireEtagere(
  catalogue: CatalogueFormes,
  formes: readonly FormeGobi[],
): Etagere;
```

### 5.12 N8 — additions à `contenu/referentiel/competences.json` (modifié)

Le moteur `trace` **dérive déjà** ces deux codes (`partage/src/moteurs/trace/moteur.ts:117` :
`competence: \`gph.miroir.${axe}\``) alors que le référentiel ne les porte pas. Le référentiel
étant un objet protégé (annexe P § 6.4), l'ajout est ici, une fois, avec sa justification :

```json
{
  "code": "gph.miroir.gauche-droite",
  "libelle": "Distinguer b et d, p et q — miroir gauche-droite",
  "domaine": "graphemes",
  "region": "galeries"
},
{
  "code": "gph.miroir.haut-bas",
  "libelle": "Distinguer b et p, d et q — miroir haut-bas",
  "domaine": "graphemes",
  "region": "galeries"
}
```

**Deux codes, jamais un.** D23, conséquence 1 : « ne jamais traiter b/d/p/q en bloc — un enfant
peut être gêné par un axe et pas par l'autre ».

---

## 6. Frontières — qui exporte, qui importe

### 6.1 Table des frontières

Chaque ligne est opposable **dans les deux sens** : l'exportateur doit produire ces symboles,
l'importateur ne doit pas en attendre d'autres.

| Couple | Chemin d'import | Ce qui passe |
|---|---|---|
| **N1 → N8** | `@pierre/partage` (types) | `SensRotation`, `CodeFamilleGestuelle`, `DuctusLettre` — N8 écrit des exercices `trace` |
| **N1 → N8** | **frontière de fichiers** | `contenu/referentiel/ductus-minuscules.json` : N8 y lit les lettres, n'y écrit jamais |
| **N2 → N4, N6, N8** | `@pierre/partage/voix` | `CleAudio`, `aUnAudio`, `clipDe`, `Locuteur` — **la barrière de vague 1** |
| **N2 → tous (client)** | `client/src/composants/BoutonEcouter.js` | Le bouton devient `ReactElement \| null`. **Six appelants adaptent leur mise en page** |
| **N2 → N1** | `@pierre/partage/voix` | `Locuteur` — la relecture syllabée du palier `indice` du moteur `trace` |
| **N3 → N6** | `@pierre/partage/monde` | `CodeStadeGobi` (10 membres), `prochainStade` — l'étagère et le campement montrent le stade |
| **N3 → N6** | **frontière de fichiers** | `contenu/assets/gobi/formes/*.svg` : les cristaux que l'étagère affiche |
| **N4 → N5, N6, N7, N8** | `@pierre/partage/ton` | `enonceUnePerte`, `FORMULATIONS_DE_PERTE` — **tout lot qui écrit du texte enfant l'importe** |
| **N4 → N6** | `client/src/routeur.js` | `CHEMINS.ouverture` — le campement rejoue l'ouverture (D35, point 3) |
| **N5 → N6** | `@pierre/partage/parent` | `LANCEMENT_PARENT` / `LANCEMENT_ENFANT` — `EcranNoeud` reçoit l'option |
| **N6 → N4** | `client/src/monde/PastilleSortie.js` | L'ouverture rend la main sur un tap qui part en sortie (D46) |
| **N7 → N8** | **frontière de fichiers** | `contenu/habillages/**` : les `id` de région que les exercices citent. **Ils ne changent JAMAIS** |
| **N7 → N6** | `client/src/monde/NomDeRegion.js` | Le nom au survol / maintien, réutilisé au campement |
| **N8 → N5** | **frontière de fichiers** | `contenu/exercices/**` : matière première du catalogue de la galerie |
| **N1, N2, N3 → tous** | — | **Barrière de vague.** Aucun lot de vague 2 ne démarre avant leurs trois rapports lus |

### 6.2 Les trois fichiers à écrivain unique disputé — tranchés ici

Trois fichiers sont naturellement convoités par deux lots. **Un seul écrivain, toujours** :

| Fichier | Propriétaire | Perdant, et ce qu'il fait à la place |
|---|---|---|
| `client/src/routeur.tsx` | **N4** | N5 et N6 ont besoin d'y ajouter une route. Ils **listent leurs routes dans leur rapport** ; N4 les ajoute toutes en un passage. Le contrat les nomme ici : `/ouverture` (N4), `/parent/galerie` et `/parent/definir` (N5) |
| `client/src/ecrans/EcranCarte.tsx` | **N4** | N6 veut y poser `PastilleSortie`. Il ne le fait pas : **la pastille va sur `EcranProfils`**, qui est à N6, et c'est mieux — D46 dit « depuis l'ouverture de l'application », donc avant la carte |
| `contenu/monde/regions.json` | **N7** | N8 veut y ajouter ses nœuds. Il ne le fait pas : N7 lit la liste des nœuds livrés **dans le rapport de N8** et l'inscrit. C'est le seul point de synchronisation de la vague 3 |

### 6.3 Les deux inversions de dépendance assumées

1. **`partage/src/index.ts` réexporte les types de N1, N2, N3 et N4.** Il ne compile qu'une fois
   les quatre rendus. C'est le prix d'un barillet unique — et le prix inverse, quatre barillets
   concurrents, serait quatre sources de vérité sur la surface publique.
2. **`BoutonEcouter` passe de `ReactElement` à `ReactElement | null`.** Les six appelants ne
   compilent plus tant qu'ils n'ont pas traité le cas d'absence. **C'est voulu** : un bouton
   masqué qui laisse un trou dans la mise en page est un bouton masqué qu'on voit, et D42 vise
   exactement l'inverse.

---

## 7. Migrations SQL — 007 à 009, à la suite de `006_parent.sql`

Mécanisme **inchangé** (contrat v1 § 6.1) : `serveur/migrations/NNN_nom.sql`, ordre lexical, une
transaction par fichier, empreinte SHA-256 en base, **une migration modifiée après coup est une
erreur bloquante**. `PRAGMA journal_mode = WAL` et `foreign_keys = ON` restent posés à
l'ouverture de la connexion. Toutes les tables sont `STRICT`.

**Trois migrations seulement — et c'est un résultat, pas une économie.**

| Fichier | Lot | Contenu |
|---|---|---|
| `007_ouverture.sql` | **N4** | `ouverture_vue` |
| `008_etagere.sql` | **N6** | `etagere_rang` |
| `009_parent_definition.sql` | **N5** | `code_parent.defini_par` |

### 7.1 `serveur/migrations/007_ouverture.sql` — N4

```sql
-- La sequence d'ouverture est vue UNE FOIS, puis rejouable a volonte depuis le campement
-- (D35, point 3). On enregistre le fait qu'elle a ete vue, jamais un score : ce n'est pas
-- un exercice, rien n'y est evalue.
CREATE TABLE ouverture_vue (
  profil_id  TEXT PRIMARY KEY REFERENCES profils(id),
  vue_le     TEXT NOT NULL,
  -- Vrai si l'enfant l'a passee au tap. Sert au parent, jamais a l'enfant.
  passee     INTEGER NOT NULL CHECK (passee IN (0, 1)),
  nb_rejeux  INTEGER NOT NULL DEFAULT 0 CHECK (nb_rejeux >= 0)
) STRICT;
```

### 7.2 `serveur/migrations/008_etagere.sql` — N6

```sql
-- Le RANG d'une forme sur l'etagere. Il est fige a l'obtention et ne bouge plus : une case
-- qui se deplace fait perdre le reperage visuel qui est tout l'interet de l'album (D44).
--
-- POURQUOI UNE TABLE ET PAS UN CALCUL : le rang derive de l'ordre d'obtention, et
-- `formes_gobi` (005_monde.sql) porte deja `obtenue_le`. Mais deux formes gagnees dans la
-- meme milliseconde donneraient un ordre instable au rechargement — et l'etagere changerait
-- sous les yeux de l'enfant. Le rang est donc pose une fois, explicitement.
CREATE TABLE etagere_rang (
  profil_id     TEXT    NOT NULL REFERENCES profils(id),
  grapheme_code TEXT    NOT NULL,
  rang          INTEGER NOT NULL CHECK (rang >= 1),
  PRIMARY KEY (profil_id, grapheme_code)
) STRICT;

CREATE UNIQUE INDEX etagere_rang_unique ON etagere_rang (profil_id, rang);
```

### 7.3 `serveur/migrations/009_parent_definition.sql` — N5

```sql
-- Solde le defaut mesure au contrat v3 § 1.8 : `POST /api/parent/ouvrir` posait le code du
-- foyer au premier appel, en silence. Un enfant curieux qui tapait 1234 devenait proprietaire
-- du code parent, sans qu'aucun ecran ne l'ait jamais demande.
--
-- La colonne dit COMMENT le code a ete pose. `ouverture-implicite` est la valeur des bases
-- existantes : elle est conservee plutot que devinee, et le dashboard peut proposer au parent
-- de le redefinir. On ne detruit jamais un code existant — le parent serait enferme dehors.
ALTER TABLE code_parent
  ADD COLUMN defini_par TEXT NOT NULL DEFAULT 'ouverture-implicite'
  CHECK (defini_par IN ('ouverture-implicite', 'ecran-definition', 'redefinition'));
```

---

## 8. Routes HTTP — les 15 existantes, plus 5

N5 possède `partage/src/api/contrats.ts` pour cette campagne et y déclare **tous** les chemins ;
chaque lot implante les siens dans son propre fichier de routes.

| Méthode et chemin | Corps entrant | Réponse | Écrit par |
|---|---|---|---|
| `GET /api/audio/manifeste` | — | `ManifesteVoix` | **N2** |
| `GET /api/profils/:id/ouverture` | — | `{ vue: boolean, nbRejeux: number }` | **N4** |
| `POST /api/profils/:id/ouverture` | `{ passee: boolean }` | `{ vue: true }` | **N4** |
| `GET /api/parent/etat` | — | `EtatPorteParent` | **N5** |
| `POST /api/parent/definir` | `{ code }` | `{ jeton }` ou **409** | **N5** |
| `GET /api/parent/:profil/galerie` | — | `CatalogueGalerie` | **N5** |

`POST /api/parent/definir` répond **409 Conflict** quand un code existe déjà — jamais 200, jamais
un remplacement silencieux. La redéfinition passe par `POST /api/parent/ouvrir` puis
`POST /api/parent/definir` **avec le jeton**.

`POST /api/parent/ouvrir` **cesse de poser le code**. Quand aucun code n'existe, il répond
**404** avec `ErreurApi.code = 'introuvable'` et le client redirige vers `EcranDefinirCode`.

Les fichiers `contenu/audio/*.opus` sont servis en statique depuis `serveur/src/statique.ts`
(modifié par N2), avec `Cache-Control: immutable` : le nom de fichier porte l'empreinte du texte,
donc un clip ne change jamais sous le même nom.

---

## 9. Les tests qui font le contrat de sortie

### 9.1 N1 — `tests/unitaires/trace-trajectoires-imparfaites.test.ts`

**Le test le plus important de cette campagne**, parce que c'est celui qui distingue un moteur
qui marche d'un moteur qui a l'air de marcher.

> « Teste avec des TRAJECTOIRES IMPARFAITES — un test qui ne passe qu'avec le tracé idéal ne
> prouve rien. »

Il génère, par `Alea` ensemencé (jamais `Math.random`), **quatre familles de trajectoires** à
partir de chaque modèle, et assert le verdict attendu pour chacune :

| Famille | Construction | Verdict exigé |
|---|---|---|
| **Tremblée** | Bruit gaussien d'écart-type 6 unités `viewBox` sur chaque point, soit ~25 px à l'écran | **ACCEPTÉE.** Un `b` tremblant mais bien orienté a réussi (R16) |
| **Lente / rapide** | 4 échantillons, puis 300 | **ACCEPTÉE, et identique.** Le verdict ne dépend pas de la vitesse |
| **Écourtée** | Les 15 % de fin retirés | **REFUSÉE** `trace-incomplet`, `compteErreur === false` |
| **Rotation opposée** | Le rond parcouru dans l'autre sens, même forme, même départ | **REFUSÉE** `sens-rotation`, `compteErreur === false`, **`axe === null`** |

La dernière ligne est la correction de § 2.7 : une rotation opposée ne doit **jamais** produire
une `ConfusionObservee`.

Deux assertions de non-régression s'y ajoutent :

- `couvertureOrientee(modele, modele, tolerance) === 1` pour les 26 lettres — la propriété qui
  garantit que le reste du fichier mesure quelque chose ;
- pour chaque paire `(b, d)` et `(p, q)`, un geste tracé sur le modèle de l'une **est** détecté
  comme miroir de l'autre — l'indicateur de D23 n'est pas creux.

### 9.2 Le contrat de sortie chiffré de chaque lot (convention C4)

| Lot | Le chiffre qu'il CALCULE et publie | Échoue si |
|---|---|---|
| **N1** | `sensDeclare === sensMesure` sur **26 / 26** lettres · `memeFamille('b','d') === false` · **4 / 4** familles de trajectoires imparfaites jugées correctement · **0** copie de modèle divergente (C5) | Un seul écart |
| **N2** | `couvertureConsignes(...).taux` | **< 1,0**. Objectif : **100 % des consignes des exercices livrés ont un audio** |
| **N3** | `8 ≤ stades ≤ 10` · **≥ 10** formes de graphème · **5 / 5** états d'animation · **0** déclinaison enchaînée (chacune repart de la canonique, prouvé par le `lock`) | Un seul écart |
| **N4** | `enonceUnePerte(t) === null` pour **tous** les `textesDestinesALEnfant()` · ouverture passable à `t = 0` ms | Un seul texte fautif |
| **N5** | `COUNT(*) FROM tentatives` **identique** avant et après N lancements depuis la galerie · **100 %** des exercices du catalogue lançables | Une seule ligne journalisée |
| **N6** | **≤ 1** tap de l'ouverture au premier nœud (D46) · `cases.length === nbTotal` · **≥ 25** points gratuits, **≥ 10** animations uniques (R11) | Un seul écart |
| **N7** | **0** `id` de région modifié · **0** région ouverte (test bloquant) · silhouette adulte **≥ 1,35 ×** élève | Un seul écart |
| **N8** | **≥ 4** nœuds par sortie et **≥ 3** moteurs par compétence (R12) · **0** habillage répété dans une sortie (R13) · **15 / 15** fiches câblées · O10 clos, compte de matériau phonologique à l'appui | Un seul écart |

**Un lot qui rend « N occurrences » n'a pas répondu à « combien d'objets ».** Chaque chiffre
ci-dessus se calcule en énumérant les objets qui devraient porter la propriété, jamais les
occurrences d'un mot dans les fichiers.

### 9.3 Le contrat de sortie de CE document, mesuré sur lui-même

Ce contrat s'applique à lui-même la convention C4. Sortie du script de contrôle, citée telle
quelle :

```
N1 : 12 créés · 10 modifiés · total 22
N2 : 14 créés ·  6 modifiés · total 20
N3 :  9 créés ·  3 modifiés · total 12
N4 : 11 créés ·  5 modifiés · total 16
N5 : 12 créés ·  8 modifiés · total 20
N6 :  8 créés ·  6 modifiés · total 14
N7 : 10 créés ·  4 modifiés · total 14
N8 : 13 créés ·  4 modifiés · total 17
--- TOTAL : 89 créés, 46 modifiés, 135 lignes de fichier
--- lots vides (doit valoir 0) : 0
--- blocs TypeScript : 13 · blocs SQL : 3
--- lignes de frontière § 6.1 : 14
--- symboles exportés déclarés au § 5 : 52
--- longueur du document : 1661 lignes, 84651 octets
```

**Les 52 symboles inter-lots, nommément** — c'est la liste qu'un orchestrateur vérifie
lui-même après chaque vague, symbole par symbole, pour s'assurer que **chaque symbole déclaré a
trouvé son propriétaire** (D10) :

`SensRotation` · `CodeFamilleGestuelle` · `AIRE_MINIMALE_ROTATION` · `FamilleGestuelle` ·
`DuctusTrait` · `DuctusLettre` · `LignesEcriture` · `ReferentielDuctus` · `sensMesure` ·
`familleDe` · `lettresDeLaFamille` · `memeFamille` · `TraitLettre` · `ModeleLettre` ·
`EtatTrace` · `MotifRefusTrace` · `REFUS_TRACE_COMPTE_ERREUR` · `axeParInversionDeSens` ·
`rotationRespectee` · `Locuteur` · `CleAudio` · `RenduVoix` · `ClipVoix` · `ManifesteVoix` ·
`SEUIL_QC` · `clipDe` · `aUnAudio` · `CouvertureAudio` · `couvertureConsignes` · `DemandeVoix` ·
`FournisseurVoix` · `ProprietesBoutonEcouter` · `BoutonEcouter` · `CodeStadeGobi` ·
`CodeTableauOuverture` · `TableauOuverture` · `SequenceOuverture` · `FormulationDePerte` ·
`FORMULATIONS_DE_PERTE` · `enonceUnePerte` · `textesDestinesALEnfant` · `StatutValidation` ·
`EntreeGalerie` · `CatalogueGalerie` · `OptionsLancement` · `LANCEMENT_PARENT` ·
`LANCEMENT_ENFANT` · `EtatPorteParent` · `CaseEtagere` · `Etagere` · `CatalogueFormes` ·
`construireEtagere`

| Grandeur | Mesuré | Exigé |
|---|---|---|
| Lots non vides | **8 / 8** | 8 |
| Lignes de fichier attribuées | **135** (89 C, 46 M) | > 0 par lot |
| Types partagés donnés en TypeScript exact | **13 blocs**, **52 symboles** | tous ceux qui traversent une frontière |
| Migrations SQL numérotées à la suite | **3** (`007`, `008`, `009`) | à la suite de `006` |
| Lignes de frontière inter-lots | **14** | toute frontière nommée |
| Fichiers existants inventoriés | **227** source, **79** test, **6** migrations | mesuré, jamais rapporté |
| **Verdict sur le ductus actuel** | **le `d` part en BAS à droite et tourne HORAIRE** | D33 exige haut droite, antihoraire |

---

## 10. Ce qui est repoussé — avec sa raison écrite

| Repoussé | Raison |
|---|---|
| **Les cursives.** N1 ne traite que `casse: 'minuscule'` | D33 décrit les familles cursives, mais l'enfant sort du CP et lit des lettres script. Le référentiel de ductus porte déjà `casse` : ajouter la cursive n'ajoutera pas un type, seulement des lignes de données |
| **Les 4 régions restantes** (Marais Jumeau, Forêt Muette, Volcan, Cité des Histoires) | D38 n'en ouvre que deux. Leurs 20 habillages existent déjà et attendent leur contenu. « L1 décide de tout » (CLAUDE.md) |
| **Le clonage de voix familiale** | D41 : voix entièrement synthétiques. La porte reste ouverte — cloner une voix plus tard **ne change aucune interface**, puisque `Locuteur` est déjà une union fermée et le manifeste déjà indexé par locuteur |
| **La LoRA de personnage Gobi** | D32 : `TrainLoraNode` est natif et 15 à 30 images cohérentes donneraient 85-92 % de cohérence. Mais N3 doit d'abord PRODUIRE ces 15 à 30 images. La LoRA est le lot d'après, et il aura sa matière première |
| **Les captures visuelles de référence** | **D39 : elles attendent le nouveau graphisme.** `test:visuel` reste rouge et c'est déclaré comme tel. Les figer avant N3 et N7 serait les refaire aussitôt. Aucune référence n'est figée sans validation humaine |
| **La vidéo d'ouverture** | D22 et D35, point 4, autorisent une vidéo ici. N4 livre du temps réel : le décor de l'ouverture **est** le décor de l'enfant, ce qu'une vidéo ne peut pas être. Le repli WebM VP9 reste ouvert si le rendu déçoit |
| **Le multi-profils exercé** | D17 : le modèle existe en base, l'étanchéité n'est pas exercée. Aucun second enfant |
| **O5** (le vrai/faux mérite-t-il de survivre) et **O7** (le niveau 7 non validable) | Ils portent sur les niveaux 2 à 7 du corpus, hors périmètre de D14 |
| **La suppression de `voix-navigateur.ts`** | Il devient le repli de `voix-fichier.ts`, jamais le chemin nominal. Le supprimer rendrait le jeu muet sur une installation dont `contenu/audio/` n'a pas été généré — exactement le contraire de « on clone, on lance, ça marche » (D9) |

---

## 11. Risques connus de ce contrat

1. **La barrière de vague 1 est réelle et coûteuse.** N4, N6 et N8 attendent le manifeste de N2.
   Si Piper ne s'installe pas dans le dépôt, trois lots sont bloqués. **Atténuation** : N2 livre
   le manifeste **avant** les clips — un manifeste vide est un manifeste valide, et `aUnAudio`
   rend `false`, donc D42 masque le bouton, donc le comportement est exactement l'actuel. Les
   lots de vague 2 démarrent alors sur un manifeste vide et les clips arrivent après, sans
   toucher une ligne de leur code.

2. **N1 modifie deux fichiers d'exercice qui appartiennent à la région de N8.** C'est écrit au
   § 4.1 et au § 4.8 des deux côtés. Si un orchestrateur les confie à N8 par réflexe, deux lots
   écrivent le même fichier. **La table du § 6.2 est le point de contrôle.**

3. **Le ductus normatif du § 2.9 est un choix de conception, pas une mesure.** D33 est explicite
   sur le `d` et sur le `o` de référence ; pour les douze autres lettres, la table applique la
   même logique de famille. Elle est cohérente et enseignable, mais elle **n'est pas issue d'une
   source de l'Éducation nationale ligne à ligne**. Elle est consignée dans
   [questions-en-attente.md](questions-en-attente.md) comme un arbitrage à confirmer par un
   adulte qui a vu l'enfant écrire.

4. **Personne, dans cette campagne, n'a pour mission de refuser la prémisse.** La prémisse est :
   « le moteur `trace` est réparable, il ne faut pas le jeter ». Elle est fondée sur une mesure —
   `couvertureOrientee` est orientée, le motif `sens-inverse` existe, l'ordre `d`-rond-puis-hampe
   est déjà juste — mais **l'orchestrateur et ce contrat la partagent**. Un agent au moins doit
   recevoir pour mission explicite de la contester, et on lui donne le nom du fichier qui la
   porte : `partage/src/moteurs/trace/validation.ts`.

5. **Le nombre de nœuds est le vrai plancher du plaisir, et il est le dernier servi.** Sept nœuds
   au gel, douze visés. N8 est en vague 3, donc le dernier à livrer, donc le plus exposé à un
   arrêt en cours de campagne. Si une seule chose devait être sauvée d'une campagne écourtée,
   **c'est le contenu de N8, pas la beauté de N7.**

6. **Le dépôt était encore en écriture au moment du gel** (§ 1.9 bis). Ce contrat a corrigé trois
   de ses sections après re-mesure — le périmètre de N2 sur `BoutonEcouter.tsx` et celui de N8
   sur les nœuds de La Clairière ont **diminué** entre la première rédaction et la conclusion.
   Rien ne garantit que d'autres livraisons ne soient pas arrivées depuis.

   **Règle qui en découle, et qui vaut plus que ce contrat** : *un lot relance les commandes du
   § 1.2 et du § 1.5 avant sa première écriture, et signale tout écart au lieu de recopier ce
   document.* Un contrat gelé décrit un dépôt à un instant ; il ne le fige pas.

   Le mode de défaillance qu'elle évite est celui déjà payé une fois sur ce projet : agir sur un
   rapport sans l'avoir relu, puis imputer au rapport une erreur d'orchestration.
