# État du projet — 2026-08-03, campagne sans GPU

Trois minutes de lecture. Tout ce qui suit a été **exécuté**, pas supposé. Les commandes et leurs
codes de sortie sont dans le tableau plus bas ; quand un chiffre est cité, il vient d'une sortie
réelle.

---

## Si tu ne l'as pas encore fait hier soir

**Ferme la Pierre et relance-la** (`arreter.bat`, puis `demarrer.bat`). C'est la réparation du bug
de coloriage figé, décrite dans la version d'hier de cette page. Elle se fait toute seule au
démarrage. Si tu as déjà relancé depuis hier, il n'y a rien à faire.

---

## Tes six retours du 2026-08-03 — où ils sont écrits

Vingt minutes de jeu réel, **six défauts**. La QA en comptait alors 2 498 cas automatisés et n'en
avait trouvé **aucun** — non par faiblesse, mais parce qu'elle vérifie que le code fait ce qu'il
dit, là où ces six défauts sont tous « le code fait ce qu'il dit, et l'enfant ne voit rien ».

Chacun porte sa mesure et son état dans **[retours-de-jeu.md](retours-de-jeu.md)** :

| | | état |
|---|---|---|
| **R1** | Le rallumage levait 8 % d'un gris — invisible | ✅ corrigé (**D51**, `32b20f8`) |
| **R2** | La luciole n'est pas dessinée dans son SVG | ouvert |
| **R3** | Fin d'exercice sans chemin vers le suivant | ouvert |
| **R4** | Une étoile sans qu'on dise pourquoi | ouvert |
| **R5** | Particules qui resteraient à l'écran | **non reproduit** — ma mesure était invalide |
| **R6** | Montrer Gobi quand il évolue | demandé |
| **R7** | La maîtresse avait la tête dans le sol | ✅ corrigé (`8aa1fc6`) |
| **R8** | Aucune police sur le disque — jamais d'Andika | ✅ 6/8 (`839febc`, `524019a`) |
| **R9** | 12 moteurs sur 14 ne dessinaient aucun décor | ✅ 14/14 (`e2de431`) |
| **R10** | 11 « Écouter » muets, 11 Gobi en double | ✅ corrigé (`e0679d9`) |
| **R11** | L'éclair partait sans prévenir, options illisibles | ✅ corrigé (`1cc6dd7`) |
| **R12** | L'ordre ignorait le graphe des prérequis | ✅ 3 → 0 (`07cec3d`) |
| **R13** | 32 % des libellés échappent au contrôle lexical | ouvert |
| **R14** | **La bonne réponse était toujours le 1ᵉʳ bouton (34/34)** | ✅ corrigé |
| **R15** | Gobi « a aidé » après 45 s d'inactivité, sans qu'on demande | ouvert — cause trouvée |
| **R16** | « Range » appelle un glisser que le moteur n'offre pas | ouvert |
| **R17** | Gobi ne répond pas dans certains exercices | ouvert |
| **R18** | La carte ne montre ni l'avancement ni le lien entre régions | ouvert |
| **R19** | L'histoire de la Pierre passe seule (6 s/panneau) | ouvert — mesuré |
| **R20** | Il faut faire défiler alors que l'écran est assez grand | ouvert |
| **R21** | Rafraîchir ou revenir en arrière perd la partie | ouvert |
| **R22** | Changer de région ramène au même exercice | à reproduire |

---

## Ce que cette campagne a fait

Le GPU n'était pas disponible : **aucune image n'a été générée**. Tout ce qui suit est du SVG écrit
à la main, du CSS, du code ou du test.

1. **Les trois défauts que la QA ne voyait pas sont bouchés.** L'audit par mutation avait trouvé
   trois défauts qu'*aucun* test du dépôt n'aurait attrapés. Les trois ont maintenant leur garde,
   et ces gardes ont été mises à l'épreuve : on réinjecte le défaut, le test doit hurler.
2. **Les douze écrans ont un test.** Il y en avait deux sur douze. C'était la plus grande zone
   aveugle du projet : un écran sans test peut cesser de répondre au doigt sans que rien ne le
   dise.
3. **La carte du monde ne montrait aucun gris.** « Un monde gris que l'enfant rallume » est la
   promesse du jeu ; le voile de Grisaille repeignait en fait chaque région dans *sa propre
   couleur*. Six régions sur six étaient colorées sous le voile ; elles sont zéro sur six
   aujourd'hui.
4. **Le campement répond enfin au doigt.** Les trente prises étaient des boutons transparents sans
   aucun signe qu'on peut les toucher — c'est ça que tu n'avais pas compris, pas le dessin. Les
   quatorze points qui *promettaient* un mouvement unique faisaient tous exactement le même.
5. **Les six objets rapportés existaient dans les données et n'atteignaient aucun écran.** L'enfant
   terminait la Clairière, en rapportait le fanion, revenait au campement — et rien n'avait changé.
6. **Vérifier le jeu prend maintenant trois minutes au lieu de dix.** Et la suite ne rougit plus au
   hasard : cinq campagnes complètes d'affilée, cinq fois vertes. Détail juste en dessous.

---

## Les chiffres des commandes

Mesurés le 2026-08-03, sur un dépôt dont je suis le seul écrivain.

| Commande | Code | Résultat |
|---|---|---|
| `npx tsc -b` | **0** | — |
| `npx eslint .` | **0** | 0 erreur, 17 avertissements (variables inutilisées) |
| `npm run test` | **0** | **2 005 tests, 138 fichiers, 0 échec** (1 975 la veille) |
| `npm run test:contenu` | **0** | **590 contrôles, 0 problème** |
| `npm run test:e2e` | **0** | **372 verts, 0 rouge** — et **5 fois de suite** |
| `npm run test:rejeu` | **0** | vert |
| `npm run test:qualite` | **0** | vert, budget de bundle tenu |
| `npm run qa:trompeurs` | **0** | 0 bloquant, **66** avertissements (plafond gelé à 66) |
| `npm run qa:mutations` | **0** | voir juste en dessous |
| `npm run verifier` | **1** | **10 étapes vertes sur 11**, en **2 min 55 s** — voir plus bas |

Couverture, mesurée avec les seuils par zone de l'annexe T : **94,2 % des instructions**,
85,8 % des branches. **20 critères évalués sur 5 zones, aucun sous son seuil** — et ces seuils
mordent enfin : jusqu'ici leurs globs ne désignaient aucun fichier sur Windows, ce qui les rendait
satisfaits sans rien mesurer.

---

## La vérification est redevenue une boucle courte

**`npm run verifier` : 10 min 18 s → 2 min 55 s.** Facteur **3,5**. C'est le chiffre qui décide si
on vérifie avant chaque changement ou une fois par jour. Trois chaînes complètes chronométrées :
**178,5 · 178,8 · 174,6 s** — le tableau ci-dessous détaille la deuxième.

| Étape | Avant | Après | Facteur |
|---|---:|---:|---:|
| `test:e2e` (372 recettes) | 390 s | **87,8 s** | 4,4 × |
| `test` (2 005 tests) | 78 s | **43,2 s** | 1,8 × |
| `test:qualite` (106 audits) | 100 s | **22,6 s** | 4,4 × |
| `test:visuel` (15 captures) | 39 s | **14,2 s** | 2,7 × |
| lint, TypeScript, constructions, contenu, rejeu | 10 s | **11,0 s** | — |
| **total** | **618 s** | **178,8 s** | **3,5 ×** |

**Ce qui a changé, et ce qui n'a PAS changé.** Les 372 recettes s'exécutaient une par une sur une
machine à 32 cœurs, et ce réglage avait une bonne raison : elles partageaient un serveur et une
base. La réponse n'a pas été de les paralléliser quand même, mais de **supprimer le partage** —
chaque recette reçoit maintenant un serveur neuf, base vierge, port réservé par le système. Contrôle
qui l'établit : à isolation active mais **une seule recette à la fois**, la campagne dure 393 s
contre 390 s avant. **L'isolation coûte 0,8 % ; tout le reste du gain vient du parallélisme.**

Trois bénéfices qui n'ont rien à voir avec la vitesse :

- **Les tests ne se marchent plus dessus.** Quatre recettes tenaient au vert grâce à ce qu'une
  *voisine* avait laissé derrière elle — dont le contrat de sortie du verrou parent, qui attendait
  une réponse du serveur d'avant-hier. Elles prouvent maintenant ce qu'elles annoncent.
- **Lancer les tests ne coupe plus la Pierre.** La campagne réclamait le port 8080 et échouait s'il
  était pris — c'est-à-dire quand tu faisais jouer l'enfant.
- **La suite ne rougit plus toute seule** : voir juste en dessous.

### Ce que la QA attrape, mesuré en cassant le code exprès

```
                              AVANT ce lot     APRÈS ce lot
mutations qui valent               27               27
détectées                          18               23
survivantes                         9                4
   dont un test E2E les attrape     5                3
   dont PERSONNE ne les voit        4                1
taux de survie                     33 %             15 %
contrôles négatifs verts          5 / 5            5 / 5
```

**Les trois trous visés sont fermés** — M18 (la flèche du ductus), M20 (la clé d'idempotence),
M26 (l'animation dans le champ de lecture) — plus M23 et M24, fermés par les tests d'écran. Il
reste **un** défaut que rien ne voit : M11b, la marque `data-clip` qui disparaît sans que la
preuve de D42 s'en aperçoive.

**Un avertissement sur ce chiffre**, et il compte : le banc a été lancé une première fois *avant*
le commit et déclarait alors les trois trous encore ouverts — il **exclut les tests que git ne
suit pas encore**. Les chiffres ci-dessus sont ceux d'après le commit. Et M11b a basculé
« détectée » puis « survivante » entre deux exécutions : voir Q-INT-9, c'est un vrai problème de
mesure, pas une coquetterie.

Le dépôt : **28 commits**, **76 exercices** pour **76 nœuds** cités par la carte (écart nul),
**656 clips audio**, **115 SVG** tous contrôlés en régions fermées, **10 migrations**,
**166 fichiers de test** (2 de plus qu'hier, **aucun perdu** — vérifié fichier par fichier).

---

## Ce qui reste rouge

**`test:visuel`** — rouge **par décision** (D39). C'est la SEULE étape rouge sur onze. Le décor et
Gobi vont être refaits ; figer des références maintenant serait les refaire aussitôt. **Aucune
référence n'a été figée par cette campagne** — elles attendent tes yeux. Ça se lève en regardant les
images (`tests/rapports/artefacts/`), puis `npm run test:visuel -- --maj`.

Les **8 rouges** ne disent pourtant pas tous la même chose, et le rapport les nommait mal — il en
annonçait 7 et appelait le huitième une « création », alors que rien n'est plus jamais créé
automatiquement. Corrigé ; ils se lisent maintenant en trois tas :

| | | ce qu'il faut pour le lever |
|---:|---|---|
| **4** | l'image diffère de sa référence | tes yeux, puis `--maj` (D39) |
| **1** | la référence **n'existe pas** — cette capture n'a rien vérifié du tout | tes yeux, puis `--maj` (D39) |
| **3** | **ce ne sont pas des images** — voir juste en dessous | du contenu, pas du graphisme |

Les trois derniers ne s'effaceront pas avec le nouveau graphisme, et ils sont **antérieurs à cette
campagne** :

- Deux attendent « la Clairière est terminée » après **un** nœud joué. La Clairière en compte
  **douze** aujourd'hui, et la règle H1 exige la région **entièrement** recoloriée. La recette dit
  encore, dans son propre commentaire, « l'unique nœud livré » : c'est sa prémisse qui a vieilli
  quand le contenu a grandi, pas le code qui a cassé.
- Un mesure la maîtresse de la cour d'école par rapport à une élève, et ne trouve **ni l'une ni
  l'autre** : le décor v2 n'est pas livré. Il attend le GPU, comme le reste des images.

Je ne les ai pas retouchés : réécrire l'attente d'une recette de recette visuelle demande de savoir
ce que tu veux voir, et c'est du contenu.

**~~La suite peut rougir toute seule~~ — c'est réglé, et la cause n'était pas celle qu'on croyait.**

La version d'hier de cette page annonçait « sept exécutions du même commit, trois rouges », et en
imputait la cause au composeur de sortie posé « au bord d'une falaise ». **Les deux moitiés étaient
fausses.** Mesuré depuis :

- Les trois rouges étaient **rigoureusement identiques**, aux mêmes vingt lignes près. Trois rouges
  identiques ne sont pas de l'aléa. L'horodatage des fichiers l'a montré : une campagne voisine
  modifiait le code du serveur **pendant** la mesure. Un `git status` avant et après une campagne de
  dix minutes ne dit rien de ce qui s'est passé pendant.
- Le « plancher sans marge » du composeur n'existe pas : sondé sur **500 graines**, deux régions
  répondent **500 fois sur 500**, et 200 passes rendent une empreinte unique. La décision S3-Q2
  reste utile pour l'enfant — elle ne conditionne plus la fiabilité de la QA.

Éprouvé après correction, et c'est le chiffre à retenir :

```
suite E2E complète, 5 exécutions consécutives ....... 5 codes 0,  372 verts à chaque fois
suite unitaire,    10 exécutions consécutives ....... 10 codes 0, 2 005 verts à chaque fois
serveurs de test encore vivants après tout ça ....... 0     (port 8080 libre)
```

**Ce que ça change pour le banc de mutation** : il comptait tout rouge comme « la QA a détecté le
défaut », donc un rouge spontané gonflait son score. Le banc empreinte désormais l'arbre avant et
après chaque essai ; un rouge qui survit à la restauration du code devient **indécis**, sort du
dénominateur, et fait échouer le banc plutôt que de mentir sur la valeur de la QA.

---

## Ce qui attend le GPU — la seule chose que cette campagne ne pouvait pas faire

ComfyUI est resté **arrêté** de bout en bout. Rien de ce qui suit n'a été tenté, et il faut le
traiter comme **non su**, pas comme fait :

- **Les décors des six régions** en trait noir vectorisé, et leurs déclinaisons.
- **Gobi décliné** — les stades, les formes de graphèmes, les animations : ce qui existe
  aujourd'hui est du SVG fait main, suffisant pour jouer et pour tester, pas une direction
  artistique arrêtée.
- **Les vignettes d'exercice** et les pages de coloriage produites par diffusion.
- **La vérification esthétique elle-même.** D50 est clair : le jugement esthétique t'appartient.
  Aucun agent n'a regardé une planche pour dire « c'est joli » — ce qui a été vérifié, ce sont des
  grandeurs : saturation, épaisseur de trait, régions fermées, empreintes.
- **`potrace` est toujours absent** du dépôt, et il sera nécessaire à la vectorisation
  (annexe P § 3.2).

La chaîne voix (Piper) et `faster-whisper` tournent sur le processeur : elles n'étaient pas
bloquées, et les 656 clips sont là.

---

## Ce que tu dois savoir, même si ça n'est pas agréable

**Trois compétences ne peuvent JAMAIS recevoir une réussite, et le contrôle R12 les déclare
vertes.** Quand l'enfant réussit une étape, le serveur impute cette réussite à la *première*
compétence déclarée par l'exercice, et à elle seule. Une compétence qui n'est jamais en première
position n'apparaît donc jamais dans le journal — mais le contrôle « ≥ 3 moteurs par compétence »
la compte comme couverte, parce qu'il regarde ce qui est *déclaré*, pas ce qui est *joué*.
Trois compétences sont dans ce cas (`comp.consigne.multiple`, `gph.rare.gn`, `gph.rare.ph`) : leur
suivi restera vide pour toujours.

**Je ne l'ai pas corrigé, exprès.** Changer cette imputation modifie ce que reçoivent le BKT et le
Leitner, donc les journaux de rejeu — c'est une décision pédagogique, pas une correction technique,
et la règle du projet dit d'attendre ton arbitrage. Trois options chiffrées dans
`questions-en-attente.md`, Q-INT-4.

**Ça ne se voit pas depuis la tablette** : les 76 nœuds sont jouables, aucun écran d'échec, aucune
impasse. Ça se voit dans ton tableau de suivi.

**Le linter jugeait des fichiers qui ne seront jamais livrés.** `npm run lint` — première étape de
`verifier`, donc du crochet de poussée — lisait `bac-a-sable/`, que git ignore. Un dépôt fraîchement
cloné était **vert** là où cette machine était **rouge**, sur un code identique. Corrigé, avec les
deux mesures écrites dans `eslint.config.js`.

**Les tests neufs de la campagne dépassaient le plafond des « tests trompeurs » — de 17
exactement.** La dette antérieure valait *exactement* le plafond (66) ; le dépassement était
*entièrement* le travail de cette campagne. Le plafond n'a pas été monté : les 17 ont été corrigés.
Deux d'entre eux ne se contentaient pas d'être muets, ils étaient **faux** — dont un qui aurait pu
« prouver » une correspondance entre groupes de réglages et boutons d'écoute qui n'existe pas.
Détail en Q-INT-3.

---

## Ce qui attend ta décision

Détail et mesures dans **`Docs/questions-en-attente.md`**.

1. **Les captures visuelles** — les regarder, puis figer ou refuser. C'est ce qui débloque
   `npm run verifier`.
2. **Le verrou du composeur de sortie** (S3-Q2) — toujours à trancher pour ce que l'enfant peut
   jouer (10 nœuds sur 76 en sortie), mais **plus du tout urgent pour la QA** : la prémisse de
   Q-INT-9, qui en faisait la cause des rouges spontanés, est réfutée (Q-INT-10). Ce point ne
   bloque plus rien d'autre que lui-même.
3. **Les trois compétences muettes** (Q-INT-4) — contenu, garde, ou code. C'est la décision qui a
   le plus d'effet sur ce que tu liras dans le suivi.
4. **Le seuil de couverture lexicale CE1**, inchangé : 93,0 % des mots lus en jeu figurent dans la
   liste. Les 4 absents sont `b`, `d` (les graphèmes travaillés, D23), `gobi` et `voit`. Exiger
   100 % interdirait D23 ; choisir 90 % serait inventer une loi.
5. **R15 couvre-t-il les bascules ?** Cinq des six groupes de réglages ont un bouton d'écoute ; le
   sixième — les bascules « Aides à la lecture » — n'en a pas, ses contrôles portant leur propre
   intitulé (Q-INT-5).
6. **Quand tout est terminé, rejouer ou réviser ?** Inchangé depuis hier.

---

## Les outils, si tu en as besoin

| Commande | Ce qu'elle te dit |
|---|---|
| `npm run qa:mutations` | Casse le code exprès et mesure ce que la QA rate. ~20 min |
| `npm run qa:trompeurs` | Les tests qui rassurent sans rien prouver. 2 s, tourne au `pre-commit` |
| `npm run qa:tableau` | Une page : moteurs gardés, écrans gardés, survivants, trous |
| `npm run profil:reinitialiser` | Remet un profil à zéro. Sauvegarde la base avant d'écrire |

**Un piège d'outillage, à connaître avant de lancer le banc de mutation** : il **exclut de chaque
essai les tests que git ne suit pas encore**. C'est une protection — un test non commité peut
appartenir à une autre campagne en vol — mais ça veut dire qu'un banc lancé *avant* de commiter
mesure la QA *sans* le travail du jour, et rend donc de faux survivants. **On commite, puis on
mesure.**

L'onglet **« Le profil »** de l'espace parent montre, pour chaque région, ce que la base *stocke* et
ce que le journal *dit vraiment*, avec l'écart.
