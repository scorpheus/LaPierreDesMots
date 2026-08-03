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

---

## Les chiffres des commandes

Mesurés le 2026-08-03, sur un dépôt dont je suis le seul écrivain.

| Commande | Code | Résultat |
|---|---|---|
| `npx tsc -b` | **0** | — |
| `npx eslint .` | **0** | 0 erreur, 17 avertissements (variables inutilisées) |
| `npx vitest run` | **0** | **1 975 tests, 136 fichiers, 0 échec** (1 787 la veille) |
| `npm run test:contenu` | **0** | **590 contrôles, 0 problème** |
| `npm run test:e2e` | **0** | **372 verts, 0 rouge** |
| `npm run test:rejeu` | **0** | vert |
| `npm run test:qualite` | **0** | vert, budget de bundle tenu |
| `npm run qa:trompeurs` | **0** | 0 bloquant, **66** avertissements (plafond gelé à 66) |
| `npm run qa:mutations` | **0** | voir juste en dessous |
| `npm run verifier` | **1** | **9 étapes vertes sur 11** — voir « ce qui reste rouge » |

Couverture, mesurée avec les seuils par zone de l'annexe T : **94,2 % des instructions**,
85,8 % des branches.

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

Le dépôt : **25 commits**, **76 exercices** pour **76 nœuds** cités par la carte (écart nul),
**656 clips audio**, **115 SVG** tous contrôlés en régions fermées, **10 migrations**,
**164 fichiers de test**.

---

## Ce qui reste rouge

**`test:visuel`** — rouge **par décision** (D39), inchangé. Le décor et Gobi vont être refaits ;
figer des références maintenant serait les refaire aussitôt. **Aucune référence n'a été figée par
cette campagne** — elles attendent tes yeux. Ça se lève en regardant les images
(`tests/rapports/artefacts/`), puis `npm run test:visuel -- --maj`.

**La suite peut rougir toute seule** — mesuré : sept exécutions du **même commit**, sur un arbre
propre, **trois rouges**. Et ce n'est pas un caprice d'outillage, c'est le signal d'un vrai
problème de conception que le lot S3 avait déjà trouvé.

Les trois mêmes cas tombent à chaque fois, et ils passent tous par le composeur de sortie. Le plus
parlant est celui-ci : *« les six régions demandées, au moins deux répondent »*. Or pour un profil
neuf, **exactement deux régions sur six répondent** — les quatre autres refusent avec
« 0 nœud éligible ». L'assertion est donc posée **sur son propre plancher, sans un millimètre de
marge** : il suffit qu'une région bascule pour qu'elle passe au rouge.

Ce n'est pas un test à détendre. C'est un test honnête **posé au bord d'une falaise** : « partir en
sortie » ne sait proposer que **10 nœuds sur 76**, parce qu'un exercice qui déclare en compétence
secondaire un code plus avancé se ferme lui-même. Tant que ce point n'est pas tranché (S3-Q2), ces
trois recettes resteront au bord du vide.

**Ce que ça coûte** : le banc de mutation compte tout échec comme « la QA a détecté le défaut ». Un
rouge intermittent gonfle donc son score. C'est pour ça que je **n'ai pas resserré le cliquet** sur
les cinq mutations que le banc proposait de graver : on ne grave pas un chiffre qu'un bruit a
fabriqué. Détail complet en Q-INT-9.

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
2. **Le verrou du composeur de sortie** (S3-Q2) — c'est devenu la décision la plus urgente : elle
   commande à la fois ce que l'enfant peut jouer (10 nœuds sur 76 en sortie) et la fiabilité de
   toute la QA (Q-INT-9).
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
