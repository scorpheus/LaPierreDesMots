# Reconception de la Vallée des Nombres — 9 octobre 2026

> **Remplacé par [reconception-maths-ce1-ce2-2026-10-09.md](reconception-maths-ce1-ce2-2026-10-09.md)**
> (niveau CP jugé trop bas par le parent le 9 oct.).

**Statut : proposition.** Rien n'est décidé avant les réponses du parent (§ 7). Ce document
remplace les tâches M-1 à M-6 du [bilan du 9 octobre](bilan-audit-2026-10-09.md) § 3.3, comme le
parent l'a demandé (§ 6 du bilan). Il se bâtit sur le [contrat du socle d'activité](contrat-socle-activite.md)
et sur la décision [le décor est le fond](decision-decor-de-fond-et-mots-poses.md). Les trois documents
de conception de la vallée ([spécifications](specifications-vallee-des-nombres.md),
[catalogue](catalogue-jeux-mathematiques.md), [plan](plan-vallee-des-nombres.md)) ne sont pas modifiés :
ce qui les contredit est signalé ici.

Verdict du parent, qui fait foi : « même pour un adulte, on ne comprend pas ce qu'il faut faire ;
des boutons, toute une séquence ; c'est tout petit, il faut décaler ; il y a des bonnes idées mais
rien n'est bon ; un enfant ne peut pas jouer avec ça ».

---

## 1. Diagnostic

1. **Un formulaire, pas un jeu.** Le décor est une bande au-dessus du jeu (`EcranMathematiques.tsx:412-416`). On joue dessous, avec des boutons : « Ajouter / Retirer » (`AteliersJardin.tsx:94-97`) et « −10 −1 +1 +10 » (`AteliersPonts.tsx:128-132`). Rien ne se touche dans la scène.
2. **Des séquences.** Pour poser une planche, il faut choisir le module, puis toucher une position sur une bande qu'on fait défiler (`AteliersPonts.tsx:285-295`). Au Chantier, on choisit « Sommet A », puis une case (`AteliersChantier.tsx:31-34`).
3. **Trop de commandes autour du jeu.** On compte 4 boutons de navigation (`EcranMathematiques.tsx:324-328`, `:358-359`) et 2 boutons d'annulation (`AteliersJardin.tsx:124-125` et `EcranMathematiques.tsx:433-434`). S'y ajoutent « Vérifier » et « Voir une idée ».
4. **Rien n'est audible.** Les consignes du Jardin et du Moulin n'ont aucun segment audio (`jardin/index.ts:65`, `moulin/index.ts:49` : `segments: []`). Celles des Ponts pointent vers des clips restés en brouillon (182 fichiers dans `contenu/brouillons/mathematiques/audio/ponts`). D'où « Audio en préparation » (`EcranMathematiques.tsx:418-420`).
5. **Du texte d'adulte.** On relève 766 textes, dont 516 mots hors lexique (bilan § 3.2, B5). Exemple : « Forme 24 graines avec des unités, des bottes de dix et des sacs de cent » (`jardin/index.ts:99`).
6. **Gobi décrit au lieu de montrer.** Sa démonstration est une phrase (`description-geste.ts:3`).
7. **Le jeu ne tient pas à l'écran, et aucune garde ne le voit.** La garde du socle ne vise que `[data-ecran="noeud"]` (`tests/qualite/socle-activite.spec.ts:57`). L'écran maths porte `data-ecran="mathematiques"` (`EcranMathematiques.tsx:322`).
8. **Trop de choix avant de jouer.** Il faut choisir un lieu, un projet, trois niveaux, puis « Démarrer ». Cela donne 18 familles, 18 projets et 3 niveaux, avant même un premier geste.

---

## 2. Principes de conception — chacun avec sa mesure

| # | Principe | Mesure qui le prouve (garde `socle-maths`, § 4.4) |
|---|---|---|
| P1 | **Un geste unique, dans la scène, sur les objets.** Pour toute la vallée : **prendre un objet et le poser**. On glisse, ou on touche l'objet puis sa place. Pour reprendre un objet posé, on le touche. Pas de compteur, pas de case à cocher, pas de bouton « Ajouter ». | 0 élément dont le texte vaut `/^[+−-]\d+$/` ou « Ajouter » / « Retirer ». Tout `[data-objet-maths]` est **dans** `.disposition-moteur__scene` ou `__reserve`. |
| P2 | **On entend la consigne d'abord.** Elle se joue seule à l'ouverture d'une activité neuve, pas à la reprise (spécifications § 3.3, l.142). Elle se réécoute en un tap. Le texte affiché tient en une phrase courte. | S7 : un `[data-clip]` non nul. Consigne affichée ≤ 12 mots. Chaque mot est contrôlé par le lexique choisi (Q6). |
| P3 | **Une seule décision par écran.** L'écran d'activité ne propose ni niveau, ni projet, ni compagnon. | Hors objets : au plus 4 boutons (Pause, Écouter, Gobi, et « C'est prêt » pour A seulement). |
| P4 | **Tout tient à l'écran**, sur les 7 formats du socle (`socle-activite.spec.ts:18-27`). | S1, S2, S3 (64 px), S4 (96 px), S5, S8, S10. On mesure sur l'**état le plus chargé** (§ 4.4), pas sur l'état vide. |
| P5 | **L'aide de Gobi montre le geste.** Au palier 2, un « fantôme » de l'objet glisse de la réserve à sa place. C'est ensuite l'enfant qui fait le geste. Gobi n'a pas de mains (spécifications § 2.3, l.85-86). | Le palier 2 rend un `[data-fantome-maths]` animé, et l'état ne change pas tant que l'enfant n'a pas touché (révision inchangée). |
| P6 | **Aucun écran d'échec.** Une proposition fausse laisse les objets en place. Le message dit ce qu'on attend (règle R58), jamais « non » ni « erreur ». Chaque activité se finit par une réussite, avec l'aide s'il le faut. | Aucun texte ne contient « non », « erreur », « raté » ou « perdu ». Banc : un bot qui se trompe 3 fois, puis suit le fantôme, aboutit à la réussite. |
| P7 | **Le décor est le fond.** La scène est le lieu lui-même. Les objets s'y posent, chacun sur sa pastille opaque (contraste indépendant du fond). | Contraste chiffre / pastille ≥ 4,5:1, mesuré comme dans la décision R37. |

---

## 3. Le parcours de l'enfant — du campement au premier succès

**Deux touchers avant de jouer ; le troisième est déjà un geste de jeu.**

| Écran | Ce qu'il voit | Ce qu'il entend | Ce qu'il touche |
|---|---|---|---|
| 0. Campement | Le bouton « La Vallée des Nombres », qui existe déjà (`EcranCampement.tsx:306-310`) | Rien de nouveau | **Toucher 1** : le bouton |
| 1. La vallée | Le décor de la vallée en plein écran. Trois lieux posés dessus, grands (≥ 160 px) : le pommier, le pont cassé, le moulin. Gobi saute devant le pommier la première fois. Pause en haut à gauche, le haut-parleur à côté. | « Choisis où aller. » (une fois par entrée, puis en un tap) | **Toucher 2** : un lieu |
| 2. L'activité | Le lieu en grand, qui sert de scène. Les objets sont dans la réserve, Gobi est sur le côté. Pas de choix de niveau. | La consigne du lieu (§ 4), d'elle-même | **Toucher 3** : prendre le premier objet. **Il joue.** |
| 3. Réussite | Dans la même scène : Gobi saute, une portion du lieu se rallume, les étoiles s'affichent. Deux grands boutons à pictogramme : « Encore » et « Retour à la vallée ». | « Bravo ! … » (phrase propre à l'activité) | Encore, ou retour |

Règles du parcours :
- Une partie en cours dans un lieu **reprend directement** quand on touche ce lieu : il n'y a pas d'écran « Reprendre ». C'est l'API existante (`lirePartie`, `contrats.ts:14`) qui le fait.
- Pause, à tout moment : la partie est sauvegardée, puis on revient au campement (`pause`, `contrats.ts:16`, et la logique de sortie `EcranMathematiques.tsx:243-265`, à garder).
- La portion rallumée se compte depuis le journal des tentatives (`EtatMaths.tentatives`, `contrats.ts:28`), par exemple 5 portions par lieu. Rien n'est stocké à côté.

---

## 4. Première tranche à prototyper — trois activités

Les trois actions mathématiques sont différentes : **compter et grouper** (A), **mesurer en mettant
bout à bout** (B), **partager également** (C). Le geste moteur reste le même (P1) : on l'apprend une
fois pour toute la vallée.

### 4.1 A — Le panier de pommes (`MAT-JAR-01`, Jardin)

- **Scène** : le pommier du jardin. Au premier plan, le panier dessiné comme **deux cadres de dix** (2 × 5 cases), placés l'un sous l'autre. Au-dessus, une pancarte avec le nombre demandé (ex. « 7 ») et une pomme dessinée.
- **Objets à manipuler (réserve)** : un tas de pommes, qui ne s'épuise pas. Dès que la cible dépasse 10, une **caisse de dix pommes** apparaît aussi.
- **Geste** : glisser une pomme dans le panier. Elle prend la première case libre. Glisser la caisse remplit un cadre entier. Toucher une pomme ou une caisse du panier la rend au tas.
- **Domaine V1** : de 3 à 20. Pas de 0, et pas d'échange de dix contre un.
- **Consigne parlée** : « Place {n} pommes dans le panier. » (n de 3 à 20, 18 phrases entières). Quand la caisse apparaît pour la première fois : « Dix pommes, c'est une caisse. »
- **Validation** : le bouton « C'est prêt » (icône ✓). C'est la seule activité qui en a un, parce que c'est l'enfant qui décide qu'il a fini.
- **Réussite** : somme = n. Le panier part sur la brouette, et Gobi dit « Bravo ! Le panier est prêt. »
- **Si ce n'est pas juste** : au-dessus de la cible, « Il y en a trop. Enlève des pommes. », et l'erreur est comptée. En dessous de la cible : « Il manque des pommes. » (voir Q4).
- **Aide de Gobi** :
  1. *Palier 1* : « Comptons ensemble. » Gobi compte les pommes du panier à voix haute ; chaque pomme s'allume quand il la compte (clips « un » à « vingt »).
  2. *Palier 2* : « Regarde Gobi. À toi ! » Un fantôme de pomme (ou de caisse) va du tas au panier. Le geste vient de `prochainGesteJardin` (`jardin/index.ts:443`).
- **Ce qu'on réutilise** :
  - `genererJardin` (`jardin/index.ts:200`), avec ses `options` `cible` et `uniteObjet: 'fruit'` (`:28-29`) ;
  - `appliquerGesteJardin`, qui sait déjà placer et retirer une unité ou une dizaine (`:224-234`) ;
  - `validerJardin` (`:312-337`) ;
  - `construireTemoinJardin` (`:375`) pour l'état le plus chargé ;
  - `prochainGesteJardin` (`:443`).
- **Ce qui manque** :
  - Le domaine V1. Le niveau Découverte tire entre 0 et 99 (`jardin/index.ts:80`), et `creerInstanceMathsBrute` ne transmet aucune option (`registre.ts:29`). Il faut un modèle `mat-jar-01-v2` avec son domaine, et non une option glissée en douce : l'instance garde la version de son modèle (catalogue, l.17).
  - Une consigne réécrite avec sa clé de clip. Sans caisses imposées, le texte actuel en mode fruit afficherait « Montre 1.7 caisses » (`jardin/index.ts:98`, `cible / 10`).
  - Le composant de scène (cadres de dix, pancarte, tas, caisse) sur `DispositionMoteur`.
- **Assets** :
  - fond : `jardin-vallee-v1.png` (en brouillon, en attente de visa), avec une zone calme au centre ;
  - SVG au trait : pomme, caisse de dix, tas de pommes, panier en cadres de dix (la grille peut être dessinée par le code), brouette.
- **Mesure** :
  - état témoin n = 20 (2 cadres pleins) ;
  - chaque case ≥ 64 px, panier + tas + caisse sans défilement sur les 7 formats ;
  - S10 sur chaque pomme posée.

### 4.2 B — Le pont cassé (`MAT-PON-03`, Ponts)

- **Scène** : la rivière des Ponts. Le pont est coupé par **un trou**, entre deux bouts de tablier. Le trou est quadrillé en cases, avec son nombre de cases sur une pastille (ex. « 7 »).
- **Objets à manipuler (réserve)** : 3 planches, chacune découpée en cases, avec son nombre sur une pastille. Au niveau Découverte, la logique fournit `a`, `portée − a` et `portée + 1` (`ponts/index.ts:275-278`).
- **Geste** : glisser une planche vers le trou. Elle **s'aimante au bout** de la dernière planche posée, et c'est le client qui calcule la position (`placer-piece`, `ponts/index.ts:419-426`). Toucher la **dernière** planche posée la rend à la réserve (`retirer`, `:427-431`). Seule la dernière peut revenir : ainsi on ne crée jamais de trou au milieu.
- **Domaine V1** : portée de 5 à 10 cases (la logique va jusqu'à 12, `ponts/index.ts:270`).
- **Consigne parlée** : « Le pont est cassé. Place des planches pour boucher le trou. » C'est une seule phrase : les nombres sont vus sur les pastilles, et chaque pastille dit son nombre quand on la touche.
- **Validation** : automatique, dès que le bout du tablier atteint ou dépasse l'autre bord. Tant que le tablier est trop court, on ne valide pas. Sinon, la logique répondrait « incorrecte » : `ponts/index.ts:510-512` refuse moins de 2 planches.
- **Réussite** : le tablier atteint exactement l'autre bord. Le pont se rallume, Gobi le traverse : « Bravo ! Le pont est réparé. »
- **Si ce n'est pas juste** : quand le tablier dépasse, la planche bute et reste penchée au-dessus du bord. L'écart se voit en cases (`ecart`, `:520`). Gobi dit « Cette planche est trop longue. », et l'erreur est comptée.
- **Aide de Gobi** :
  1. *Palier 1* : « Compte les cases du trou. » Les cases s'allument une à une, avec les clips de nombres.
  2. *Palier 2* : « Regarde Gobi. À toi ! » Un fantôme de planche va se poser au bout du tablier. Le geste vient de `prochainGestePont` (`:569-572`).
- **Ce qu'on réutilise** :
  - `genererPont('MAT-PON-03', 'decouverte', alea, { porteeFixee })` (`ponts/index.ts:354`) ;
  - `appliquerGestePont` (`:371`) et `validerPont` (`:498-521`) : ils vérifient les raccords sans trou ni chevauchement et la portée exacte ;
  - `temoinsPont` (`:227`) et `prochainGestePont` (`:525`).
- **Ce qui manque** :
  - La consigne. L'actuelle dit « Assemble des modules pour franchir {n} centimètres. » (`:302`). Il faut un modèle `ponts-tablier-v2` et le mot « case » au lieu de « centimètre ».
  - Le seuil d'aide. `proposerAidePont` monte de palier selon le nombre d'erreurs (`:577-578`), mais le registre lui passe toujours 0 (`registre.ts:101-106`), alors que le Jardin et le Moulin ignorent ce paramètre. Il faut **un seul** propriétaire pour la règle « 2 erreurs → indice, 3 → démonstration » (spécifications § 4.3, l.195).
  - La scène, avec le trou quadrillé et l'aimantation.
- **Assets** :
  - fond : `contenu/assets/mathematiques/ponts-des-rives-v1.png`, qui existe déjà ;
  - le pont, le trou et les planches sont **dessinés par le code** (SVG paramétré par le nombre de cases), pour que la longueur affichée soit exacte par construction ;
  - un SVG de texture de planche.
- **Mesure** :
  - case ≥ 32 px, donc une planche de 2 cases fait ≥ 64 px (S3) ;
  - portée 10 avec la planche de 11 en réserve : 11 × 32 = 352 px, qui tiennent dans 390 − 2 × 16 = 358 px (téléphone) ;
  - état témoin : toutes les planches de la solution posées.

### 4.3 C — Les sacs du meunier (`MAT-MOU-02`, Moulin)

- **Scène** : l'intérieur du moulin. Sur le sol, de 2 à 4 sacs ouverts, alignés, de même taille.
- **Objets à manipuler (réserve)** : les pots de farine, posés sur la table du meunier (un pot = une mesure). Au niveau Découverte, il y en a de 4 à 20 (`moulin/index.ts:88-91`).
- **Geste** : glisser un pot dans un sac. On peut aussi toucher un pot, puis un sac. Le pot se range dans le sac, en grille visible. Toucher un pot dans un sac le rend à la table.
- **Consigne parlée** : « Partage la farine. Mets autant de pots dans chaque sac. » C'est une seule phrase, sans nombre : l'enfant voit les sacs et les pots.
- **Validation** : automatique quand la table est vide (`stock:a = 0`). Avant cela, `validerMoulin` répond « incomplète » (`moulin/index.ts:261`) et rien n'est envoyé.
- **Réussite** : tous les sacs sont égaux. Les sacs se ferment, la roue tourne : « Bravo ! Chaque sac a autant de pots. »
- **Si ce n'est pas juste** : la table est vide mais les sacs sont inégaux (`:265`). Gobi aligne les sacs côte à côte pour qu'on voie les hauteurs, et dit « Chaque sac doit avoir autant de pots. ». L'erreur est comptée, les pots restent en place.
- **Aide de Gobi** :
  1. *Palier 1* : « Un pot dans chaque sac, chacun son tour. » Gobi saute d'un sac à l'autre, de gauche à droite.
  2. *Palier 2* : « Regarde Gobi. À toi ! » Un fantôme de pot va vers le prochain sac. Le geste vient de `prochainGesteMoulin` (`:335-360`), qui commence par retirer le surplus.
- **Ce qu'on réutilise** :
  - `genererMoulin('MAT-MOU-02', 'decouverte', …)` (`:142`) ;
  - `appliquerGesteMoulin`, avec `placer` et `retirer` sur `sac:a:i` (`:196-206`) ;
  - `validerMoulin` (`:250-270`) ;
  - `construireTemoinMoulin` (`:290`) et `prochainGesteMoulin`.
- **Ce qui manque** :
  - La consigne. L'actuelle dit « Partage {n} mesures entre {k} sacs, une mesure à la fois. » (`:114`) et n'a pas de clip (`:49`). Il faut un modèle `mat-mou-02-v2`.
  - Le comportement « table vide = validation ».
  - La scène.
- **Assets** :
  - fond : `moulin-vallee-v1.png` (en brouillon), vu de l'intérieur, ou à défaut le moulin avec une table au premier plan ;
  - SVG au trait : sac ouvert, sac fermé, pot de farine, table.
- **Mesure** :
  - état témoin 4 sacs × 5 pots ;
  - chaque pot ≥ 64 px, chaque sac ≥ 96 px (S4) ;
  - table + sacs sans défilement sur les 7 formats ;
  - S10 sur chaque pot.

### 4.4 Ce qui est commun aux trois

- **Le socle.** Chaque activité monte `DispositionMoteur` (`client/src/activite/DispositionMoteur.tsx:35`) avec `scene`, `reserve` et `pied`. Le prop `moteur` attend un `CodeMoteur` de lecture (`:12`, `partage/src/identifiants.ts:77-91`). Il faut l'élargir à un `CodeMoteurMaths` (`'panier' | 'pont' | 'partage'`). Les objets se glissent et se posent avec `ZoneDeGlisser`, `useJetonGlissable` et `useCibleDeDepot` (`client/src/moteurs/commun/glisser.tsx:66,102,138`), avec le tap en double. Le guide Gobi et le bouton écouter sont ceux de la lecture (`BoutonEcouter.tsx:144`, `data-clip`). On n'appelle plus `assetDeStadeGobi` directement (`EcranMathematiques.tsx:413`).
- **L'écriture vers le serveur.** On garde la mécanique de `soumettre` : clé de geste stable, gestion du conflit, réessai (`EcranMathematiques.tsx:135-165`). On l'extrait dans un hook. L'API (`PortApiMaths`, `contrats.ts:9-19`) ne change pas.
- **La garde.** On crée `tests/qualite/socle-maths.spec.ts`, qui reprend `relever()` de `socle-activite.spec.ts` en visant `[data-ecran="activite-maths"]`. Elle ouvre chaque activité par un crochet `window.__test.allerAActiviteMaths(famille, graine, 'temoin')`. Ce crochet charge **l'état témoin**, c'est-à-dire l'état le plus chargé. Elle relève ensuite S1–S10 et P1/P3 aux 7 formats.
  - Contrat de sortie : **21 cas** (3 activités × 7 formats), à voir **rouges** sur l'écran actuel avant toute écriture. Le bilan relève déjà le premier bouton jouable vers y = 1 020 à 1280 × 800 (bilan § 3.2, B1). Ensuite, ils doivent passer au vert.
- **Les étoiles.** Barème inchangé : `1 + sans aide + sans erreur` (spécifications § 4.3, `partage/src/etoiles.ts`).

### 4.5 Les phrases à enregistrer — 53 clips, voix de Gobi, phrases entières

| Clé proposée | Phrase exacte | Nombre |
|---|---|---:|
| `maths/vallee/choisir` | Choisis où aller. | 1 |
| `maths/commun/demonstration` | Regarde Gobi. À toi ! | 1 |
| `maths/nombres/{1…20}` | un … vingt (mot seul, pour compter et pour les pastilles) | 20 |
| `maths/panier/consigne-{3…20}` | Place {n} pommes dans le panier. | 18 |
| `maths/panier/caisse` | Dix pommes, c'est une caisse. | 1 |
| `maths/panier/manque` | Il manque des pommes. | 1 |
| `maths/panier/trop` | Il y en a trop. Enlève des pommes. | 1 |
| `maths/panier/indice` | Comptons ensemble. | 1 |
| `maths/panier/bravo` | Bravo ! Le panier est prêt. | 1 |
| `maths/pont/consigne` | Le pont est cassé. Place des planches pour boucher le trou. | 1 |
| `maths/pont/trop-longue` | Cette planche est trop longue. | 1 |
| `maths/pont/indice` | Compte les cases du trou. | 1 |
| `maths/pont/bravo` | Bravo ! Le pont est réparé. | 1 |
| `maths/partage/consigne` | Partage la farine. Mets autant de pots dans chaque sac. | 1 |
| `maths/partage/refus` | Chaque sac doit avoir autant de pots. | 1 |
| `maths/partage/indice` | Un pot dans chaque sac, chacun son tour. | 1 |
| `maths/partage/bravo` | Bravo ! Chaque sac a autant de pots. | 1 |

Les clips de nombres déjà rendus (`contenu/brouillons/mathematiques/audio/ponts/gobi--nombres--*.opus`)
viennent de la chaîne par fragments, refusée le 26 septembre. Pour un mot seul, ils sont peut-être
réutilisables : c'est à l'écoute du parent d'en décider.

**Mesure lexicale, exécutée le 9 octobre.** Les phrases ci-dessus ont été passées dans `estAuLexique`
(`scripts/generer-phonologie.mjs:301`), les noms de nombres étant exclus. Sortie : 109 mots, dont
**29 mots distincts hors du lexique déclaré** (546 entrées). On y trouve « Gobi », « c'est », « toi »,
« regarde », « encore » et « écouter ». Une liste où manquent le nom du héros et « regarde » ne peut
pas arbitrer : c'est la tâche L-6 du bilan (mesure circulaire). La réponse à Q6 est un préalable pour
promouvoir ces phrases.

---

## 5. Ce qu'on garde, ce qu'on jette

Comptage par `find` sur `partage/src/mathematiques` (16 fichiers) et `client/src/mathematiques` (24),
plus `client/src/parent/SuiviMathematiques.tsx`.

**Partage — 16 gardés, 0 jeté.** La logique est testée (`tests/unitaires/mathematiques/*`, 11 fichiers).

| Fichier | Sort | Raison |
|---|---|---|
| `types.ts`, `contrats.ts`, `entrees.ts`, `index.ts`, `secours.ts` | Garder | Contrats sérialisables, API, décodage des gestes : l'interface n'y est pour rien. |
| `registre.ts` | Garder, compléter | Branchement des modèles v2 du § 4 (`:29`) et propriétaire unique de la règle d'aide (§ 4.2). |
| `catalogue.ts` | Garder | Les 18 familles restent décrites ; la V1 n'en expose que 3. |
| `jeux/jardin/index.ts` | Garder | `MAT-JAR-01` sert dans la V1 ; `02` et `03` sont en sommeil. Textes des consignes à réécrire. |
| `jeux/ponts/index.ts`, `ponts/compatibilite.ts` | Garder | `MAT-PON-03` sert dans la V1 ; `01` et `02` sont en sommeil. |
| `jeux/moulin/index.ts` | Garder | `MAT-MOU-02` sert dans la V1 ; `01` et `03` sont en sommeil. |
| `jeux/marche`, `jeux/chantier`, `jeux/horloge` (`index.ts`) | Garder, en sommeil | Testés, non exposés. |
| `projets.ts`, `jeux/ponts/projets.ts` | Garder, en sommeil | Projets hors V1 (§ 6). |

**Client — 6 gardés, 19 jetés.**

| Fichier | Sort | Raison |
|---|---|---|
| `EcranMathematiques.tsx` | Jeter | Machine à 4 vues, en-tête et navigation à 4 boutons, choix de niveau en cours de défi. **On en extrait** `soumettre` (`:135-165`) et la sortie après pause (`:243-265`). |
| `ChoixVallee.tsx`, `exemples-niveaux.ts` | Jeter | Choix du projet et des 3 niveaux : hors V1 (P3). |
| `AteliersPonts.tsx`, `ateliers-ponts.css` | Jeter | Règle, bornes et tablier en formulaire (`:128-132`, `:285-295`). |
| `lieux/Ateliers{Jardin,Moulin,Marche,Chantier,Horloge}.tsx`, `lieux/PartsEgales.tsx`, `lieux/ateliers-*.css` (5) | Jeter (11 fichiers) | Boutons « Ajouter / Retirer », « + pale », « Sommet A ». |
| `DecorVallee.tsx`, `styles-mathematiques.css` | Jeter | Décors SVG provisoires en bande au-dessus du jeu, contraires à P7. Le fond passe par la scène du socle. |
| `description-geste.ts` | Jeter | Décrit le geste en mots ; remplacé par le fantôme (P5). |
| `presentation.ts` | Garder, réduire | `lieuFamille`, `nomLieu` ; `incompatibiliteProjet` et `premiersNiveaux` partent avec les projets. |
| `conseil-parent.ts` | Garder | Zone parent, sans effet sur le journal. |
| `collection.ts`, `CollectionMaths.tsx`, `collection-maths.css` | Garder, en sommeil | Les cadeaux sont liés aux projets, hors V1. |
| `parent/SuiviMathematiques.tsx` | Garder | Le bilan parent se lit sur les tentatives, et la V1 en produit. |

**Serveur et base** : `serveur/src/routes/mathematiques.ts`, `partage/src/base/services/mathematiques.ts`,
`partage/src/base/depots/mathematiques.ts` et les migrations 013 et 014 sont gardés. La V1 n'a besoin
d'aucun changement de schéma.

**Tests** : les tests de composant `tests/composants/mathematiques/Ateliers*.test.tsx` et
`EcranMathematiques.test.tsx`, le test unitaire `tests/unitaires/mathematiques/description-geste.test.ts`, ainsi que les e2e `parcours-mathematiques`,
`parcours-projets-mathematiques` et `parcours-vallee-lieux`, visent l'écran jeté. Ils sont **listés pour
retrait** et soumis au parent (socle § 5.4). Aucun n'est mis en `skip`. Les tests de logique et d'API
restent.

---

## 6. Ce qui sort de la V1

On simplifie franchement. Le premier jour, un enfant de 7 ans a besoin d'**une** activité qu'il comprend
seul, pas de 18 familles.

| Sort de la V1 | Pourquoi | Quand y revenir |
|---|---|---|
| 15 des 18 familles | Une activité qu'on comprend vaut mieux que six lieux qu'on ne comprend pas | Une par une, après observation R18 de la V1 |
| Les 3 lieux Marché, Chantier, Horloge | Monnaie, géométrie et heure demandent chacune leur propre geste | Après la V1, à raison d'un lieu et d'une activité à la fois |
| Les 18 projets à 3 étapes et la fête | Une séquence de 3 défis liés, c'est exactement la « séquence » que le parent rejette | Quand les familles sont comprises une à une |
| Le choix de niveau (Découvrir, Explorer, Défi) et le changement en cours de défi | Une décision de plus avant de jouer (P3) | Plus tard : Gobi propose « Plus dur ? » après 3 réussites, sans choix imposé |
| Les échanges dix contre un, les deux décompositions, les fractions, le reste | Domaines Exploration et Défi | Avec les niveaux |
| Le choix du compagnon avant une activité | Un écran de plus | Avec les projets |
| Les cadeaux et la collection maths au coffre | Liés aux projets | Avec les projets |
| L'annulation par bouton | Remplacée par « toucher l'objet posé le rend » | Jamais, si P1 tient |

L'anti-répétition (`choisirInstanceMaths`, `registre.ts:63`) et la reprise sont gardées : elles ne
coûtent rien à l'enfant.

---

## 7. Questions au parent

1. **V1 réduite à 3 lieux et 3 activités (panier, pont, sacs), sans projets, sans fête, sans choix de niveau** ?
   *Recommandation : oui.* On observe l'enfant (R18) sur ces trois activités avant d'en ajouter une seule.
2. **Validation : automatique quand la scène est « finie »** (table vide, trou atteint), **avec un bouton
   « C'est prêt » seulement au panier**, où c'est l'enfant qui décide qu'il a fini ? La spécification
   prévoit un « C'est prêt » partout (§ 4.2, l.174).
   *Recommandation : oui.* Un bouton de moins là où la fin se voit.
3. **Au Jardin, des pommes plutôt que des graines** ? Une pomme se dessine grande (≥ 64 px) et se
   reconnaît ; une graine est minuscule. La logique sait déjà compter des fruits (`uniteObjet: 'fruit'`).
   *Recommandation : des pommes, et une caisse de dix.*
4. **Valider avec trop peu de pommes, est-ce une erreur ?** La spécification dit oui (« sept unités pour
   une cible de huit est une réponse complète incorrecte », § 4.2, l.180-181). Le code dit non : il répond
   « incomplète » (`jardin/index.ts:315`), donc sans erreur comptée, alors que le cas « trop » compte une
   erreur (`:316`).
   *Recommandation : garder le code.* L'enfant entend « Il manque des pommes. », sans perdre d'étoile.
   Il faut alors corriger la spécification, dans un fichier nouveau.
5. **Les voix : 53 phrases entières, dites par la voix de Gobi de la lecture**, plutôt que l'assemblage de
   fragments refusé le 26 septembre ?
   *Recommandation : oui.* Le domaine V1 est volontairement borné (3 à 20 pommes, portée de 5 à 10,
   aucun nombre dans les consignes du pont et des sacs) pour que chaque phrase puisse être enregistrée
   en entier.
6. **Quelle liste fait foi pour le lexique CE1** (tâche L-6) ? La liste déclarée (546 mots) rejette
   « Gobi », « regarde » et « c'est » (§ 4.5).
   *Recommandation : une liste externe de fréquence par niveau scolaire, comme Manulex au niveau CE1,
   plus une liste nommée de mots exemptés* (noms des personnages, nombres, et les mots de la scène qui
   sont dessinés : pomme, planche, pot, sac).
