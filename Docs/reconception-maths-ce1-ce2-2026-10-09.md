# Reconception de la Vallée des Nombres au niveau CE1-CE2 — 9 octobre 2026

**Statut : proposition.** Rien n'est décidé avant les réponses du parent (§ 6). Ce document remplace
le **contenu pédagogique** de la [proposition du matin](reconception-maths-2026-10-09.md), que le
parent a jugée de niveau CP. Il en garde la partie interaction, qui ne dépend pas du niveau :
- le diagnostic (§ 1) ;
- les principes P1 à P7 (§ 2), y compris leurs mesures ;
- le parcours en deux touchers (§ 3) ;
- la garde `socle-maths` (§ 4.4) ;
- l'inventaire garder/jeter (§ 5), avec les écarts listés ici au § 5.

**Ce que le parent a dit (fait foi).** Sur les maths actuelles : « même pour un adulte on ne comprend
pas… rien n'est bon », des boutons et des séquences, tout est trop petit, il faut faire défiler. Sur
la proposition du matin : « compter, grouper par 10, poser des planches bout à bout et partager, j'ai
l'impression que c'est peut-être plus du CP. Donc vérifier. » Puis : « Il y a les additions et
soustractions aussi quand même. » Le public visé est un enfant de **CE1-CE2**. Les fiches papier
(PDF NIVEAU 1–7) ne sont plus la base.

**Sources qui font foi.**
- [reference-programmes-ce1-ce2.md](reference-programmes-ce1-ce2.md), abrégé **« réf. »**. Il porte
  les programmes de l'arrêté du 22/10/2024. Une citation s'écrit **« réf. 1.3 CE1 … »** : la section
  du référentiel, le niveau, puis l'intitulé de la ligne. Ce que le référentiel marque NON TROUVÉ
  reste NON TROUVÉ ici.
- [contrat-socle-activite.md](contrat-socle-activite.md), règles S1 à S10. Le socle est
  `client/src/activite/DispositionMoteur.tsx`, avec trois zones : scène, réserve et pied.
- Les règles non négociables de `CLAUDE.md` :
  - aucun écran d'échec ;
  - l'aide de Gobi est gratuite ;
  - aucune consigne n'existe seulement à l'écrit ;
  - le texte ne bouge jamais ;
  - pas de texte pour l'enfant sans contrôle de vocabulaire CE1.

---

## 1. Verdict sur l'ancienne proposition

### 1.1 Niveau réel des trois activités

| Activité | Ce que l'enfant y fait | Champ | Niveau réel | Ligne qui le prouve |
|---|---|---|---|---|
| A — Le panier de pommes | Placer de 3 à 20 pommes ; une caisse vaut dix | 3–20 | **CP**, et même en dessous | réf. 3 « Nombres », fin de CP : « entiers jusqu'à cent », « groupements par dix (unités, dizaines) ». Le CE1 commence au-dessus : réf. 1.1 CE1 « nombres jusqu'à mille », « groupements par dix et cent ». |
| B — Le pont cassé | Combler un trou de 5 à 10 cases avec des planches de 1 à 11 cases | ≤ 11 | **CP** | Une décomposition d'un nombre ≤ 10 est un fait des tables d'addition : réf. 3 « Calcul mental », CP. Les problèmes parties-tout du CP vont jusqu'à 100 (réf. 3 « Problèmes », CP), et l'activité reste bien en dessous. |
| C — Les sacs du meunier | Partager de 4 à 20 pots entre 2 à 4 sacs, à la main | ≤ 20 | **CP** | réf. 3 « Opérations », CP : « problèmes de partage résolus par manipulation (pas d'opération "division" nommée) ». réf. 3 « Problèmes », CP : « multiplicatifs en une étape sur champ ≤ 30 ». Au CE1, ce partage devient un problème multiplicatif à une étape jusqu'à 1 000 (réf. 1.4 CE1). Au CE2, on y ajoute le sens de la division et le signe « ÷ » (réf. 1.3 CE2 « division »). |

**Le parent a raison sur les trois.** Il y a plus grave : **ni l'addition ni la soustraction n'ont
d'activité, dans la proposition comme dans le code.**
- Les 18 familles du catalogue sont dans `partage/src/mathematiques/catalogue.ts:43-114`.
- Les 17 notions proposées sont dans `contenu/brouillons/mathematiques/competences-proposees.json`.
  Aucune ne porte `math.calcul.addition` ni `math.calcul.soustraction`.
- Une recherche de « soustra », « addition » et « retenue » dans `partage/src/mathematiques` et
  `client/src/mathematiques` ne ramène que des cas à côté :
  - `catalogue.ts:84`, « soustraire », pour rendre la monnaie (`MAT-MAR-02`) ;
  - `catalogue.ts:69`, « addition répétée » (`MAT-MOU-01`) ;
  - trois textes d'aide (`marche/index.ts:39`, `chantier/index.ts:216`, `ponts/index.ts:305`).

La remarque « il y a les additions et soustractions aussi » ne signale donc pas un niveau mal
réglé : elle **signale un trou**.

La logique existante vise plus haut que la proposition qui l'utilisait. `MAT-JAR-01` sait déjà
monter jusqu'à 1 000 avec les centaines, aux niveaux « exploration » (100–499) et « défi » (100–1 000).
Voir `catalogue.ts:45-46` et `jeux/jardin/index.ts:80`. La proposition du matin l'avait ramenée à 3–20.

### 1.2 Ce qui se recycle, ce qui sort

| Élément de l'ancienne proposition | Sort | Ce qu'il devient |
|---|---|---|
| Le geste « prendre un objet et le poser », pour toute la vallée (P1) | **Gardé** | Il vaut pour les six activités du § 3. Les chiffres deviennent des objets : les **pierres-chiffres** (§ 3.0). |
| A — le panier : cadres de dix, caisse de dix, bouton « C'est prêt » | **Recyclé, champ monté** | Activité A, **Le grenier** : cagettes de 10, caisses de 100, tonneaux de 1 000. Champ ≤ 1 000 au CE1, ≤ 10 000 au CE2. |
| B — le pont : planches dessinées par le code à leur longueur exacte | **Recyclé comme dessin** | Le **schéma en barres** de l'aide de Gobi, dans l'activité D (réf. 1.4 CE1 « schémas en barres »). |
| B — l'activité « boucher un trou de 5 à 10 cases » | **Sort** | — |
| C — le partage à la main | **Sort de la V1** | Il reviendra plus tard comme **problème de partage** dans D (réf. 1.4 CE1 « multiplicatifs en 1 étape »). La manipulation ne sera alors plus que l'aide de Gobi. |
| Les 53 phrases du § 4.5 | **Sortent**, sauf `maths/vallee/choisir` et `maths/commun/demonstration` | Les nombres de 1 à 20 entrent dans la banque des nombres (§ 3.0). |
| Le parcours (§ 3), la garde `socle-maths` (§ 4.4), la reprise, l'anti-répétition (§ 6) | **Gardés** | La garde compte désormais 4 activités V1 × 7 formats, soit **28 cas** (au lieu de 21). |

---

## 2. Carte des attendus CE1-CE2 retenus pour le jeu

Cette table a **une ligne par attendu CE1 ou CE2** des sections 1.1 à 1.7 du référentiel. Le
référentiel range la section 1.5 par domaine, avec CE1 et CE2 dans la même ligne : ici, chaque
domaine est donc découpé en une ligne CE1 et une ligne CE2. Deux lignes du référentiel ne sont pas
reprises, parce qu'elles disent qu'il n'y a **pas** d'attendu :
- réf. 1.2 CP, « pas de rubrique Fractions » ;
- réf. 1.5 Contenances CE1, « pas de rubrique ».

La colonne « Décision » prend l'une de ces trois valeurs :

| Décision | Sens |
|---|---|
| **retenu V1** | Construit dans la première version. |
| **plus tard** | Faisable en jeu, mais après observation de la V1 (R18). |
| **hors jeu** | Ne se fait pas bien au doigt sur un écran, ou ne relève pas de l'annexe de mathématiques. |

| Id | Réf. | Attendu (résumé) | Décision | Activité | Pourquoi |
|---|---|---|---|---|---|
| NB1 | 1.1 CE1 | Nombres jusqu'à mille, suite orale et écrite | retenu V1 | A, B, C, D | Champ de toutes les activités V1 au CE1 |
| NB2 | 1.1 CE1 | Groupements par dix et cent ; unités de numération supérieures à 10 (« 2 centaines, 27 dizaines et 14 unités ») | retenu V1 | A | C'est le geste même du grenier : poser des cagettes et des caisses, avec un stock limité |
| NB3 | 1.1 CE1 | Écrire en chiffres un nombre dicté, le lire, l'écrire en lettres ; décompositions | retenu V1 | A (palier 3), C | En chiffres : avec les pierres-chiffres. En lettres : plus tard, car il faudrait un clavier de lettres, et `grave` refuse un alphabet complet (`partage/src/moteurs/grave/types.ts:43-45`) |
| NB4 | 1.1 CE1 | Comparer, encadrer, intercaler, ranger jusqu'à 5 nombres ; demi-droite graduée | plus tard | variante de A | Ranger 5 nombres, c'est ordonner des étiquettes : les moteurs `phrase` et `chrono` le font déjà. La demi-droite reprend la logique `MAT-PON-02` (`catalogue.ts:59-62`) |
| NB5 | 1.1 CE1 | Nombres ordinaux jusqu'à cent | plus tard | — | Peu d'apport pour un jeu ; un rang dans une file pourra passer par le moteur `place` |
| NB6 | 1.1 CE1 | Parité : pair ou impair | plus tard | — | C'est un tri en deux paniers, « pair » et « impair » : le moteur `tri` le fait tel quel |
| NB7 | 1.1 CE2 | Nombres jusqu'à 10 000 | retenu V1 | A, B, C, D (paliers CE2) | Champ des paliers CE2. Leur ouverture dépend de Q1 |
| NB8 | 1.1 CE2 | Groupements par dix, cent, mille ; écriture en chiffres et en lettres jusqu'à 10 000 ; ranger ; demi-droite | retenu V1 | A (tonneaux de mille) | Le groupement et l'écriture en chiffres sont en V1. Les lettres et le rangement viennent plus tard, comme pour NB3 et NB4 |
| FR1 | 1.2 CE1 | Fractions d'un tout ≤ 1, dénominateurs 2, 3, 4, 5, 6, 8, 10 ; moitié, quart ; lire et écrire 1/2 … 1/10 | plus tard | F | Le geste existe déjà (colorier une part). Le parent a demandé le calcul en priorité |
| FR2 | 1.2 CE1 | Comparer ; additionner et soustraire des fractions de même dénominateur | plus tard | F | Même raison que FR1 |
| FR3 | 1.2 CE2 | Fractions ≤ 1, dénominateur ≤ 12 ; égalités (5/10 = 1/2) | plus tard | F | Même raison que FR1 |
| FR4 | 1.2 CE2 | Fraction d'une unité de longueur, règle graduée en fractions ; comparer, additionner, soustraire | plus tard | F | La règle graduée demande la règle virtuelle de `MAT-PON-01`, qui est en sommeil |
| CA1 | 1.3 CE1 | Addition posée de 2 ou 3 nombres à 1, 2 ou 3 chiffres ; soustraction posée, introduite au plus tard en période 3 | retenu V1 | B | Demande explicite du parent |
| CA2 | 1.3 CE1 | Multiplication : signe ×, commutativité (la multiplication posée n'est pas au CE1) | plus tard | C (variante) | Le gué accepte n'importe quelle égalité. Le parent a demandé + et − d'abord |
| CA3 | 1.3 CE1 | Tables d'addition dans les deux sens ; 12 égalités à trou en 1 min | retenu V1 | C | Les égalités à trou sont le gué. La durée est notée dans le journal, jamais affichée |
| CA4 | 1.3 CE1 | Tables de multiplication ; 8 égalités à trou en 1 min | plus tard | C (variante) | Même moteur, après + et − |
| CA5 | 1.3 CE1 | Faits usuels : doubles, moitiés, multiples de 25 | retenu V1 | C | Les doubles et les moitiés s'écrivent en égalité à trou (25 + 25 = ▢ ; 15 + ▢ = 30) |
| CA6 | 1.3 CE1 | Calcul mental : ajouter et soustraire des dizaines ou des centaines entières ; + 9, + 19, + 29 ; − 9 ; jusqu'à 1 000 ; 12 résultats en 3 min | retenu V1 | C | Le cœur du gué. Les procédures × 10 et 13 × 7 viendront avec la multiplication |
| CA7 | 1.3 CE2 | Addition et soustraction posées jusqu'à 10 000 ; vocabulaire terme, somme, différence | retenu V1 | B (paliers CE2), E | Demande explicite du parent |
| CA8 | 1.3 CE2 | Multiplication posée, 2 ou 3 chiffres par 1 ou 2 chiffres | plus tard | B (variante) | Elle a plusieurs lignes de produits partiels : il reste à mesurer si elle tient à l'écran |
| CA9 | 1.3 CE2 | Sens de la division et signe ÷, en problèmes de partage ou de groupement | plus tard | D (variante) | Elle viendra avec les problèmes de partage. La division posée est NON TROUVÉ dans le référentiel : elle n'est pas proposée |
| CA10 | 1.3 CE2 | Tables d'addition (15 égalités en 1 min) et de multiplication (12 en 1 min) | retenu V1 | C | L'addition est en V1, la multiplication plus tard (CA4) |
| CA11 | 1.3 CE2 | Faits usuels : doubles de 1 à 20, moitiés des pairs de 2 à 40, décompositions de 60, multiples de 25 | retenu V1 | C | Doubles et moitiés en V1. Les décompositions multiplicatives de 60 viennent plus tard |
| CA12 | 1.3 CE2 | Calcul mental : + 8, 9, 18, 19, 28, 29, 38 ; − 9, 19, 29, 39 ; × 10, × 100, × 4, × 8 ; jusqu'à 10 000 ; 15 résultats en 3 min | retenu V1 | C | Les procédures additives sont en V1, les procédures multiplicatives plus tard |
| PB1 | 1.4 CE1 | Problèmes jusqu'à 1 000 : additifs à 1 et 2 étapes, multiplicatifs à 1 étape, mixtes à 2 étapes ; schémas en barres | retenu V1 | D | Les problèmes additifs sont en V1. Les multiplicatifs et les mixtes viennent plus tard |
| PB2 | 1.4 CE2 | Problèmes jusqu'à 10 000 ; au-delà de 2 étapes, rester sous 100 ; mixtes, comparaison multiplicative, produits cartésiens | retenu V1 | D (paliers CE2) | Les problèmes additifs sont en V1. Les structures multiplicatives viennent plus tard |
| PB3 | 1.4 tous | Modèle en quatre phases (comprendre, modéliser, calculer, répondre) ; « est-ce possible ? » | retenu V1 | D | Les paliers de l'aide de Gobi suivent ces phases, et Gobi pose la question après une réponse impossible |
| GM1 | 1.5 Longueurs CE1 | m, cm, km ; mesurer à la règle ; estimer | plus tard | — | On mesurerait au doigt sur la règle virtuelle de `MAT-PON-01` : il faut d'abord prouver la précision sur la tablette |
| GM2 | 1.5 Longueurs CE2 | dm, mm ; conversions sans tableau ; tracer un segment ; périmètre | plus tard | — | Conversions et périmètre viendront plus tard. Tracer un segment d'une longueur donnée est hors jeu : le doigt n'est pas précis au millimètre |
| GM3 | 1.5 Masses CE1 | g, kg ; peser ; ordonner quatre masses | plus tard | — | La logique de balance `MAT-CHA-03` est en sommeil |
| GM4 | 1.5 Masses CE2 | Tonne ; conversions du type 5 462 g = 5 kg 462 g | plus tard | — | Même raison que GM3 |
| GM5 | 1.5 Contenances CE2 | L, dL, cL ; conversions | plus tard | — | Aucun geste fiable à l'écran pour transvaser : à concevoir |
| GM6 | 1.5 Monnaie CE1 | Euros et centimes ; constituer une somme ; rendre la monnaie | plus tard | E | La première activité après la V1 : même geste que A, et la logique `marche` existe déjà |
| GM7 | 1.5 Monnaie CE2 | Écriture à virgule ; addition et soustraction posées de montants | plus tard | E | Elle se fera avec le moteur `calcul`, étendu à la virgule |
| GM8 | 1.5 Heure CE1 | Lire l'heure : heures entières, demi-heures, quarts d'heure ; ajouter des durées | plus tard | — | La logique `MAT-HOR-01` est en sommeil. Un cadran demande un geste à lui |
| GM9 | 1.5 Heure CE2 | Lire l'heure à la minute, sur cadran ou affichage digital ; durée écoulée | plus tard | — | Même raison que GM8 |
| GM10 | 1.5 Calendrier | NON TROUVÉ dans l'annexe de mathématiques | hors jeu | — | Le référentiel le renvoie au domaine « Questionner le monde » |
| ES1 | 1.6 CE1 solides | Nommer les solides ; compter faces, arêtes, sommets ; construire | hors jeu | — | Un solide se construit avec de vrais objets, et une image plate cache des faces |
| ES2 | 1.6 CE1 géométrie plane | Vocabulaire des figures ; reproduire à la règle et à l'équerre sur quadrillage | hors jeu | — | On ne trace pas à l'équerre avec le doigt. Reconnaître les figures pourrait revenir par `tri` |
| ES3 | 1.6 CE1 repérage | Plans, itinéraires ; déplacements programmés d'au plus quinze instructions | plus tard | — | Un programme de flèches sur un quadrillage : le moteur `chemin` est à étudier |
| ES4 | 1.6 CE2 solides | Perspective ; construire cube, pavé, pyramide | hors jeu | — | Même raison que ES1 |
| ES5 | 1.6 CE2 géométrie plane | Polygones, losange, rayon, diamètre ; règle, équerre, compas ; axe de symétrie | hors jeu | — | Les constructions aux instruments sont hors jeu. Compléter une figure symétrique sur quadrillage pourrait revenir par `colorie` |
| DO1 | 1.7 CE1 | Enquête qualitative, tableau, diagramme en barres ; tableau à double entrée | plus tard | — | Les logiques `MAT-JAR-03` et `MAT-HOR-03` sont en sommeil |
| DO2 | 1.7 CE2 | Données quantitatives ; échelle adaptée ; problèmes à partir de données | plus tard | — | Même raison que DO1 |

**Lecture de la table.** La V1 couvre les **nombres**, le **calcul** (mental et posé) et les
**problèmes additifs**. C'est la part que le programme veut majoritaire. D'après le principe du
programme cité en tête de réf. § 1, au moins les deux tiers du temps vont à « Nombres, calcul et
résolution de problèmes ». La monnaie (E) et les fractions (F) sont conçues dès maintenant (§ 3.5 et
§ 3.6), pour vérifier que le geste commun les porte, mais elles sont construites après la V1.

---

## 3. Activités proposées

### 3.0 Ce qui est commun aux six

> **Révisé par le parent le 9 oct. (§ 6 bis)** : pour entrer des nombres, pavé de chiffres type
> calculatrice sur tablette, clavier sur PC, choix de réponses aux niveaux simples.

- **Un seul geste : prendre et poser (P1).**
  - On prend un objet dans la réserve et on le pose dans la scène, en le glissant ou en touchant
    l'objet puis sa place (le tap en double de `client/src/moteurs/commun/glisser.tsx:66,102,138`).
  - Pour écrire un nombre, la réserve contient **dix pierres-chiffres**, de 0 à 9. Chacune fait au
    moins 88 px, en deux rangées de cinq.
  - Toucher une pierre la pose dans **la case marquée** : un cadre épais de couleur, **immobile**.
    L'opération est un champ de lecture et rien n'y bouge, car « le décor s'agite, le texte jamais ».
  - Il n'y a ni pavé de calculatrice, ni touche « effacer », ni bouton « Vérifier ».
- **Chaque chiffre est vérifié dès qu'il est posé.** C'est la proposition par défaut ; voir Q5.
  - Un chiffre juste reste en place : c'est un acquis, qui ne se reprend jamais.
  - Un chiffre faux **retourne doucement à sa place dans la réserve**. Il n'est jamais coloré en
    rouge, comme les touches de `grave` (`MoteurGrave.tsx:32-34`).
  - Gobi dit alors ce qu'on attend (règle R58). Il ne dit jamais « non », « faux » ni « erreur ».
- **Les nombres ne sont jamais assemblés dans une phrase.** C'est la leçon du refus du 26 septembre :
  trop de silences entre les fragments.
  - La consigne est une phrase entière, toujours la même.
  - Un nombre est **un clip à part**, dit d'une traite (« trois cent quarante-sept »). On l'entend
    quand Gobi le montre, ou quand l'enfant le touche.
  - On ne rend un clip que pour les nombres qui servent dans la **banque d'instances validée**. Il
    y en a au plus 1 001 pour le CE1.
  - Les indices sont des phrases entières, en nombre fini. Par exemple « cinq plus sept » : 100
    phrases couvrent tous les faits d'une colonne d'addition.
- **L'aide de Gobi** reprend la règle existante (`specifications-vallee-des-nombres.md:195`).
  - Elle se déclenche après deux erreurs sur la même étape (palier 1, l'indice) et après trois
    (palier 2, la démonstration).
  - On peut aussi la demander à tout moment en touchant Gobi.
  - Elle ne coûte qu'une étoile : le barème reste `1 + sans aide + sans erreur`.
  - **La démonstration ne traverse pas le champ de lecture.** Gobi montre la case marquée, et la
    pierre à prendre **s'allume dans la réserve**. C'est l'enfant qui la pose.
- **Pas de chronomètre à l'écran.** Les seuils de fluence du programme sont mesurés en silence.
  - Seuils : réf. 1.3 CE1 tables, « 12 égalités à trou en 1 minute » ; réf. 1.3 CE1 calcul mental,
    « 12 résultats en 3 minutes ».
  - La durée de chaque étape va dans le journal `tentatives`, et la zone parent la lit.
  - L'enfant ne voit jamais de temps et ne peut pas « manquer » de temps.
- **Le socle.** Chaque activité monte `DispositionMoteur` avec ses zones `scene`, `reserve` et `pied`.
  - Le prop `moteur` attend un `CodeMoteur` de lecture (`DispositionMoteur.tsx:12`). Il faut
    l'élargir à `CodeMoteurMaths = 'grenier' | 'calcul' | 'probleme'`, puis `'marche'` et
    `'fraction'` plus tard.
  - La garde `socle-maths` de l'ancienne proposition (§ 4.4) est gardée. Elle mesure l'**état
    témoin**, c'est-à-dire l'état le plus chargé.
- **Un moteur neuf, `calcul`, sert trois activités** (B, C, D), plus le palier 3 de A et le CE2 de E.
  - Son modèle côté client est `grave` : une case à trous dans un cartouche statique, sur parchemin
    opaque (`MoteurGrave.tsx:21`), et un clavier restreint dans la réserve du socle
    (`MoteurGrave.tsx:264`). `grave` est déjà migré sur le socle, et sa garde est verte (socle § 8).
  - Sa logique est **neuve**, dans `partage/src/mathematiques/jeux/calcul/` : aucune famille
    existante ne porte l'addition ni la soustraction (§ 1.1).
  - Les instances se décrivent comme des données : les nombres, et l'**ordre des cases** à remplir
    (unités, retenue, dizaines…).
- **Le vocabulaire.**
  - Les phrases de Gobi ci-dessous évitent tout mot d'adulte.
  - Les mots du programme (unité, dizaine, centaine, retenue, somme, différence) font partie de ce
    qu'il faut apprendre : ils vont dans la liste nommée des mots exemptés, comme le propose l'ancienne
    Q6 (tâche L-6).
  - **Le contrôle par `estAuLexique` n'a pas été exécuté** sur ces phrases. Il est à faire avant
    d'enregistrer les voix.

### 3.1 Activité A — Le grenier (nombres ; V1)

**Ce que l'enfant voit.**
- La scène est le grenier du moulin, en fond.
- En haut, la **pancarte de commande**, avec un nombre écrit en chiffres (« 347 »).
- Au milieu, la **charrette**, divisée en colonnes, une par sorte d'objet. Chaque colonne est un
  cadre de dix vertical, de 2 × 5 places.
- La réserve contient trois tas qui ne s'épuisent pas : des **pommes**, des **cagettes de dix**, des
  **caisses de cent**. Au CE2 s'ajoute un quatrième tas, les **tonneaux de mille**.

**Ce qu'il fait, geste par geste.**
1. Il écoute la consigne, qui se joue seule.
2. Il glisse un objet d'un tas vers la charrette, ou il touche le tas puis la charrette. L'objet se
   range seul dans sa colonne, à la première place libre.
3. S'il en a trop mis, il touche un objet de la charrette, qui retourne au tas.
4. Quand il pense avoir fini, il touche **« C'est prêt »**. C'est le seul bouton de l'activité,
   comme le recommandait l'ancienne Q2 : c'est l'enfant qui décide qu'il a fini.

**Consigne audible.** « Prépare la commande. Mets dans la charrette le nombre de pommes écrit sur la
pancarte. » Ensuite, dans un énoncé séparé et non assemblé, Gobi montre la pancarte et dit le nombre
(« trois cent quarante-sept »). Toucher la pancarte redit le nombre.

**Progression interne.**

| Palier | Ce qui change | Champ | Réf. |
|---|---|---|---|
| CE1-1 | Pommes, cagettes et caisses en stock illimité | 100 à 1 000 | réf. 1.1 CE1 « nombres jusqu'à mille » ; réf. 1.1 CE1 « groupements par dix et cent » |
| CE1-2 | Stock limité : « Il ne reste que deux caisses. » Pour 347, il faut alors 2 caisses, 14 cagettes et 7 pommes | ≤ 1 000 ; une seule colonne dépasse 10, et jamais 20 | réf. 1.1 CE1 « unités de numération supérieures à 10 (2 centaines, 27 dizaines et 14 unités) » |
| CE1-3 | Sens inverse : la charrette arrive pleine, et l'enfant écrit le nombre avec les pierres-chiffres (moteur `calcul`) | ≤ 1 000 | réf. 1.1 CE1 « écrire en chiffres un nombre dicté, le lire » ; « décompositions 600 + 30 + 5 » |
| CE2-1 | Les tonneaux de mille entrent dans la réserve | 1 000 à 10 000 | réf. 1.1 CE2 « nombres jusqu'à 10 000 » ; « groupements par dix, cent, mille » |
| CE2-2 | Stock limité, comme au palier CE1-2 | ≤ 10 000 | réf. 1.1 CE2 « groupements par dix, cent, mille » |

**Après une erreur.**
- S'il manque des objets, Gobi dit : « Il manque des caisses. », avec un clip par sorte d'objet.
  Aucune erreur n'est comptée : c'est le comportement du code (`jardin/index.ts:315`), que recommandait
  l'ancienne Q4.
- S'il y en a trop, Gobi dit : « Il y a trop de cagettes. Rends-en au tas. », et l'erreur est comptée.
  Gobi nomme toujours la colonne qui ne va pas. Cela fait 8 phrases entières, 4 sortes d'objets fois
  « manque » ou « trop ».
- Les objets restent en place.

**Aide de Gobi.**
- *Palier 1, l'indice* : « Comptons les caisses. » Gobi touche chaque objet de la colonne et dit le
  total qui monte (« cent, deux cents, trois cents »). Le chiffre correspondant de la pancarte
  s'entoure d'un cadre fixe.
- *Palier 2, la démonstration* : le tas à prendre s'allume. L'enfant pose l'objet.

**Socle et moteurs.**

| Zone ou rôle | Contenu |
|---|---|
| Scène | Le grenier, la pancarte et la charrette |
| Réserve | Les 3 ou 4 tas, chacun d'au moins 96 px (S4) |
| Pied | « C'est prêt » et les messages |
| Logique gardée | `genererJardin`, `appliquerGesteJardin`, `validerJardin`, `prochainGesteJardin` (cités par l'ancienne proposition, § 4.1), aux niveaux exploration et défi |
| Ce qui manque | Le **mille** : le stock ne connaît que unités, dizaines et centaines (`jardin/index.ts:12`). Une version de modèle avec la consigne et sa clé de clip. La scène |

**Mesure.**
- Une colonne mesure 2 × 64 + 8 = 136 px de large.
- Pour l'état témoin du CE1-2, 3 colonnes dont une double, on obtient 136 + 136 + 272 + 2 × 24 =
  **592 px**. Il y a 768 px de place (800 − 2 × 16).
- Au CE2, avec 4 colonnes dont une double, on obtient 136 × 3 + 272 + 3 × 24 = **752 px** pour 768.
  Il reste 16 px de marge : **à mesurer**. Si ça ne tient pas, la colonne double est interdite au CE2.

```
┌──────────────────────────────────────────────┐
│ [Pause] [Écouter]                        ★★★ │
├──────────────────────────────────────────────┤
│        ┌──────────────┐    (grenier, fond)   │
│        │   347        │  ← pancarte          │
│        └──────────────┘    (touchée : « 347 »)│
│  ┌────────────── charrette ───────────────┐  │
│  │ caisses   │ cagettes  │ pommes         │  │  SCÈNE
│  │ [■][■]    │ [▬][▬]    │ [●][●]         │  │
│  │ [■][ ]    │ [▬][▬]    │ [●][●]         │  │
│  │ [ ][ ]    │ [ ][ ]    │ [●][●]         │  │
│  │ [ ][ ]    │ [ ][ ]    │ [●][ ]         │  │
│  │ [ ][ ]    │ [ ][ ]    │ [ ][ ]         │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│   ( tas de    )  ( tas de   )  ( tas de   )  │  RÉSERVE
│   (  caisses  )  ( cagettes )  (  pommes  )  │  ≥ 96 px
├──────────────────────────────────────────────┤
│ [Gobi]  « Il manque des caisses. »           │  PIED
│                          [ C'est prêt  ✓ ]   │
└──────────────────────────────────────────────┘
```

### 3.2 Activité B — La pierre à calcul (calcul posé ; V1)

**Ce que l'enfant voit.**
- La scène est la carrière de Roc, le personnage qui grave déjà dans les habillages de `grave`.
- Une grande pierre plate porte **l'opération déjà posée**, sur parchemin, en police Andika :
  - les colonnes, avec au palier CE1-1 les en-têtes « c d u » ;
  - les cases du résultat, d'au moins 80 px ;
  - au-dessus de chaque colonne, une case de retenue d'au moins 64 px.
- La réserve contient les dix pierres-chiffres.

**Ce qu'il fait, geste par geste.**
1. La case des unités du résultat est marquée.
2. Il touche une pierre-chiffre, ou la glisse : le chiffre se grave dans la case.
3. Si le chiffre est juste, Roc frappe un coup de burin (un son) et la case suivante se marque. Si
   la colonne fait une retenue, c'est la **case de retenue** de la colonne suivante (si Q4 = a), puis
   la case du résultat de cette colonne. On avance ainsi de droite à gauche.
4. Quand la dernière case est remplie, la pierre s'éclaire et une portion du décor se rallume.

**La soustraction** suit l'algorithme de l'école (Q3). Pour le moteur, la méthode ne change qu'une
chose : **la liste des cases à remplir, et leur ordre**.
- Par cassage : l'enfant écrit la valeur de la colonne après l'échange.
- Par compensation : il écrit le « 1 » ajouté en haut et la retenue en bas.

Le geste reste le même.

**Consigne audible.**

| Niveau | Phrase de Gobi |
|---|---|
| CE1 | « Calcule sur la pierre. Commence par la colonne des unités. » |
| CE2, addition | « Calcule la somme. Commence par les unités. » |
| CE2, soustraction | « Calcule la différence. Commence par les unités. » |

Au CE2, ces mots viennent de réf. 1.3 CE2 « vocabulaire terme, somme, différence ». Toucher un nombre
de l'opération le fait dire.

**Progression interne.**

| Palier | Ce qui change | Champ | Réf. |
|---|---|---|---|
| CE1-1 | Addition de deux nombres à 3 chiffres, sans retenue | somme ≤ 999 | réf. 1.3 CE1 « additions de deux ou trois nombres à 1, 2 ou 3 chiffres (245 + 437) » |
| CE1-2 | Une retenue, puis deux | ≤ 1 000 | même ligne |
| CE1-3 | Trois termes de tailles différentes (76 + 7 + 568) | ≤ 1 000 | même ligne |
| CE1-4 | Soustraction posée à 3 chiffres, d'abord sans échange, puis avec | ≤ 1 000 | réf. 1.3 CE1 « soustraction posée introduite en période 3 au plus tard ; un seul algorithme par école » |
| CE2-1 | Addition et soustraction à 4 chiffres ; en-têtes « c d u » retirés | ≤ 10 000 | réf. 1.3 CE2 « addition/soustraction posées : entiers ≤ 10 000 » |
| CE2-2 | Les mots « somme » et « différence » entrent dans les phrases de Gobi | ≤ 10 000 | réf. 1.3 CE2 « vocabulaire terme, somme, différence » |
| plus tard | Multiplication posée | — | réf. 1.3 CE2 « multiplication posée » (CA8) |

**Après une erreur.** La pierre retourne à la réserve, et Gobi dit : « Pas encore. Regarde la colonne
des unités. » Il y a 5 phrases, une par colonne : unités, dizaines, centaines, milliers, et une pour
la retenue. L'erreur est comptée. L'opération reste sur la pierre jusqu'à la réussite, avec de l'aide
s'il le faut.

**Aide de Gobi.**
- *Palier 1, l'indice* : Gobi dit le fait de la colonne, en une phrase entière : « Cinq plus sept. »,
  ou « Cinq plus sept, plus la retenue. » Cela fait environ 400 phrases en tout, chiffres de 0 à 9,
  addition et soustraction, avec ou sans retenue. On les enregistre entières, sans fragments.
- *Palier 2, la démonstration* : la bonne pierre s'allume dans la réserve, et Gobi la montre.

**Socle et moteurs.**

| Zone ou rôle | Contenu |
|---|---|
| Scène | La pierre et l'opération : statique, sur parchemin opaque, avec la case marquée en cadre fixe |
| Réserve | Les 10 pierres-chiffres, de 88 px, en deux rangées de 5 : 5 × 88 + 4 × 16 = 504 px de large |
| Pied | Les messages |
| Moteur | Le moteur neuf **`calcul`**, en disposition « en colonnes ». Son modèle côté client est `grave` |

**Mesure.**
- **Hauteur** : on mesure l'état témoin le plus chargé, le palier CE1-3 avec ses 3 termes et sa
  retenue.
  - Opération : en-têtes 40 + retenue 64 + 3 lignes × 72 + résultat 80 = 400 px.
  - Réserve : 2 × 88 + 16 = 192 px.
  - Avec le bandeau (80 px) et Gobi (150 px), on arrive à environ 822 px, à comparer aux 1 100 px de
    la tablette en portrait. **À mesurer** sur l'état témoin.
- **Largeur** : au CE2, 5 colonnes (le signe et 4 chiffres) × 96 px = 480 px.

```
┌──────────────────────────────────────────────┐
│ [Pause] [Écouter]                        ★★★ │
├──────────────────────────────────────────────┤
│   (carrière de Roc, fond)                    │
│   ┌──────────── pierre (parchemin) ───────┐  │
│   │          c       d       u            │  │
│   │                [ 1 ]  ← retenue        │  │
│   │          2       4       5            │  │  SCÈNE
│   │   +      4       3       7            │  │  (rien n'y bouge)
│   │   ───────────────────────────         │  │
│   │        [   ]   [   ]   [ 2 ]          │  │
│   │                 ╚═╝ ← case marquée     │  │
│   └───────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│     (0)   (1)   (2)   (3)   (4)              │  RÉSERVE
│     (5)   (6)   (7)   (8)   (9)              │  pierres-chiffres
├──────────────────────────────────────────────┤
│ [Gobi]  « Cinq plus sept. »                  │  PIED
└──────────────────────────────────────────────┘
```

### 3.3 Activité C — Le gué des calculs (calcul mental ; V1, à prototyper en premier)

**Ce que l'enfant voit.**
- La scène est une rivière, avec Gobi sur la rive.
- Un **gué de 12 pierres plates** traverse l'eau : c'est la barre de progression.
- Sur la pierre devant Gobi, une **égalité à trou** est écrite sur parchemin, par exemple
  « 234 + 60 = [ ][ ][ ] » ou « 7 + [ ] = 15 ».
- La réserve contient les dix pierres-chiffres.

**Ce qu'il fait, geste par geste.**
1. Il pose les chiffres du nombre qui manque, de gauche à droite, dans l'ordre où le nombre
   s'écrit.
2. Chaque chiffre est vérifié dès qu'il est posé (Q5).
3. Le nombre complet, la pierre du gué sort de l'eau, et Gobi saute dessus. L'égalité suivante
   apparaît.
4. Après 12 égalités, Gobi a traversé : c'est la réussite.

Le nombre de cases annonce le nombre de chiffres de la réponse. C'est un appui voulu au CE1.

**Consigne audible.** « Trouve le nombre qui manque. À chaque calcul, Gobi avance d'une pierre. »
Toucher un nombre de l'égalité le fait dire.

**Progression interne.**

| Palier | Ce qui change | Champ | Réf. |
|---|---|---|---|
| CE1-1 | Tables d'addition dans les deux sens : 8 + 7 = ▢ ; 7 + ▢ = 15 ; 15 − 8 = ▢ | ≤ 20. Justifié : les tables portent sur des nombres de 0 à 10 | réf. 1.3 CE1 « tables d'addition connues dans les deux sens ; 12 égalités à trou en 1 minute » |
| CE1-2 | Doubles et moitiés : 25 + 25 ; 150 + 150 ; 15 + ▢ = 30 | ≤ 1 000 | réf. 1.3 CE1 « faits usuels : doubles de 1 à 15 ; de 20 à 50 ; de 100 à 500 ; moitiés » |
| CE1-3 | Ajouter et soustraire des dizaines ou des centaines entières : 234 + 60 ; 765 − 200 ; 746 + 80 | ≤ 1 000 | réf. 1.3 CE1 « calcul mental (procédures) ; champ ≤ 1 000 » |
| CE1-4 | Ajouter 9, 19, 29 ; soustraire 9 | ≤ 1 000 | même ligne |
| CE2-1 | Tables d'addition (cible : 15 en 1 min) ; doubles de 1 à 20 ; moitiés jusqu'à 40 | ≤ 40 pour les faits | réf. 1.3 CE2 « tables » ; réf. 1.3 CE2 « faits usuels » |
| CE2-2 | Ajouter 8, 9, 18, 19, 28, 29, 38 ; soustraire 9, 19, 29, 39 | ≤ 10 000 | réf. 1.3 CE2 « calcul mental (procédures) ; champ ≤ 10 000 » |
| plus tard | Tables de multiplication ; × 10, × 100 | — | réf. 1.3 CE1 et CE2 « tables de multiplication » (CA4) |

**La fluence.** Une traversée compte 12 égalités, le nombre du seuil de fin de CE1. Sa durée est
notée dans le journal et n'est montrée qu'au parent (§ 3.0).

**Après une erreur.** La pierre retourne à la réserve, et Gobi dit : « Pas encore. Essaie un autre
chiffre. » L'erreur est comptée. L'égalité ne change pas avant d'être réussie.

**Aide de Gobi.**
- *Palier 1, l'indice* : une phrase entière par procédure.

  | Procédure | Phrase de Gobi |
  |---|---|
  | + 9 | « Ajoute dix, puis enlève un. » |
  | 234 + 60 | « Compte les dizaines. » |
  | 8 + 7 | « Pense au double. » |

  Pour les tables du CE1, deux cadres de dix apparaissent à côté de la pierre, avec 8 points et
  7 points. Ce sont les cadres du panier de l'ancienne proposition, réutilisés.
- *Palier 2, la démonstration* : la bonne pierre s'allume dans la réserve.

**Socle et moteurs.**

| Zone ou rôle | Contenu |
|---|---|
| Scène | La rivière, le gué et l'égalité |
| Réserve | Les pierres-chiffres |
| Pied | Les messages |
| Moteur | Le moteur **`calcul`** (le même que B), en disposition « en ligne ». C'est la forme la plus proche de `grave` : un mot à trous devient une égalité à trous |

```
┌──────────────────────────────────────────────┐
│ [Pause] [Écouter]                        ★★★ │
├──────────────────────────────────────────────┤
│  (rivière, fond)                             │
│  [Gobi]  ▭ ▭ ▭ ▭ ▭ ▭ ▭ ▭ ▭ ▭ ▭ ▭  rive     │  ← gué : 3 pierres sorties
│   ▲▲▲                                         │
│   ┌──────────────── parchemin ────────────┐  │  SCÈNE
│   │   234  +  60  =  [ 2 ][   ][   ]      │  │
│   │                       ╚═╝ marquée      │  │
│   └───────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│     (0)   (1)   (2)   (3)   (4)              │  RÉSERVE
│     (5)   (6)   (7)   (8)   (9)              │
├──────────────────────────────────────────────┤
│ [Gobi]  « Compte les dizaines. »             │  PIED
└──────────────────────────────────────────────┘
```

### 3.4 Activité D — Les histoires du village (problèmes ; V1)

**Ce que l'enfant voit.**
- En haut de la scène, une **image de la situation**, par exemple le boulanger et ses pains. Les
  objets y font au moins 96 px.
- Dessous, l'**énoncé** sur parchemin : 3 lignes au plus en tablette portrait, police Andika,
  statique, avec le bouton Écouter.
- Puis la **phrase réponse à trou** : « Il reste [ ][ ][ ] pains. »
- La réserve contient les pierres-chiffres.

**Ce qu'il fait, geste par geste.**
1. Il écoute l'histoire, qui se lit seule à l'ouverture.
2. Il pose les chiffres de la réponse dans la phrase.
3. La réponse est vérifiée **quand le nombre est complet**. Un problème se juge sur le nombre
   entier, pour que Gobi puisse demander « est-ce possible ? ».

**Consigne audible.**
- L'énoncé : un clip entier par problème. Les énoncés forment une banque finie, validée par le
  parent ; ils sont écrits dans `contenu/brouillons/` puis relus.
- Puis : « Écris la réponse avec les pierres. »

Exemples d'énoncés pour le CE1 :

| Type | Énoncé |
|---|---|
| Additif, 1 étape | « Le boulanger a cuit 245 pains. Il en vend 120. Combien de pains lui reste-t-il ? » |
| Additif, 2 étapes | « Lou cueille 125 pommes, puis 230 pommes. Elle en donne 100 à Gobi. Combien de pommes lui reste-t-il ? » |

**Progression interne.**

| Palier | Ce qui change | Champ | Réf. |
|---|---|---|---|
| CE1-1 | Additif à 1 étape, parties-tout : on cherche le tout, ou une partie | ≤ 1 000 | réf. 1.4 CE1 « champ jusqu'à 1 000 ; additifs en 1 étape (parties-tout, comparaison) » |
| CE1-2 | Additif à 1 étape, comparaison : « de plus », « de moins » | ≤ 1 000 | même ligne |
| CE1-3 | Additif à 2 étapes | ≤ 1 000 | réf. 1.4 CE1 « additifs en 2 étapes » |
| CE2-1 | Additifs à 1 et 2 étapes | ≤ 10 000 | réf. 1.4 CE2 « champ jusqu'à 10 000 ; additifs 1 et 2 étapes » |
| CE2-2 | Plus de 2 étapes, ou problème atypique | < 100. Justifié par la ligne citée | réf. 1.4 CE2 « les structures les plus complexes (plus de 2 étapes, atypiques) restent < 100 » |
| plus tard | Multiplicatifs, mixtes, partages (les sacs du meunier), comparaison multiplicative, produits cartésiens | — | réf. 1.4 CE1 et CE2 (PB1, PB2) ; réf. 1.3 CE2 « division » (CA9) |

**Après une erreur.** Les chiffres retournent à la réserve.
- Si la réponse est impossible, Gobi pose une question de vraisemblance, en une phrase par
  structure : « Il reste plus de pains qu'au début ? Est-ce possible ? » (réf. 1.4 tous, « régulation
  du résultat »).
- Sinon : « Pas encore. Écoute encore l'histoire. »

L'erreur est comptée.

**Aide de Gobi.** Les paliers suivent les quatre phases (réf. 1.4 tous).
- *Palier 1, comprendre et modéliser* : Gobi pose le **schéma en barres** dans la scène. Ce sont les
  planches du pont recyclées : une longue barre pour le tout, des barres pour les parties, les
  nombres sur des pastilles, et « ? » sur la partie inconnue (réf. 1.4 CE1 « schémas en barres »).
- *Palier 2, calculer* : l'opération à faire apparaît **déjà posée** sur une pierre, comme dans
  l'activité B. L'enfant la calcule avec le même geste, puis le résultat remonte dans la phrase
  réponse.
- *Répondre* : Gobi dit « Bravo ! Tu as trouvé. »

**Socle et moteurs.**

| Zone ou rôle | Contenu |
|---|---|
| Scène | L'image, l'énoncé et la phrase réponse |
| Réserve | Les pierres-chiffres |
| Pied | Les messages |
| Moteur | **`probleme`**, c'est-à-dire `calcul` plus une scène de récit. Son modèle côté client est `histoire` : texte statique et bouton Écouter |

**Mesure.**
- Image 240 + énoncé 3 × 54 + 40 + réponse 90 + réserve 192 + bandeau 80 + Gobi 150 = 954 px, pour
  1 100.
- Une ligne de lecture vaut 54 px, d'après le corps 27 et l'interligne 2 du socle (§ 1).
- **Contrainte de contenu** : un énoncé tient en 3 lignes au plus. On mesure sur l'état témoin.

```
┌──────────────────────────────────────────────┐
│ [Pause] [Écouter]                        ★★★ │
├──────────────────────────────────────────────┤
│  ┌──────────── image de la situation ────┐   │
│  │   (le boulanger, ses paniers de pains) │   │
│  └────────────────────────────────────────┘   │
│  ┌──────────── parchemin ────────────────┐   │  SCÈNE
│  │ Le boulanger a cuit 245 pains.        │   │
│  │ Il en vend 120. Combien de pains      │   │
│  │ lui reste-t-il ?            [Écouter] │   │
│  └────────────────────────────────────────┘   │
│     Il reste  [ 1 ][   ][   ]  pains.        │
├──────────────────────────────────────────────┤
│     (0)   (1)   (2)   (3)   (4)              │  RÉSERVE
│     (5)   (6)   (7)   (8)   (9)              │
├──────────────────────────────────────────────┤
│ [Gobi]  « Écris la réponse avec les pierres. »│  PIED
└──────────────────────────────────────────────┘
```

### 3.5 Activité E — Le marché (monnaie ; plus tard)

**Ce que l'enfant voit et fait.**
- La scène est l'étal, avec une **étiquette de prix** et le comptoir.
- La réserve contient des pièces et des billets, de 1 € à 50 €, puis de 10 c à 50 c. Chacun fait au
  moins 96 px.
- Le geste est celui de A : poser des pièces sur le comptoir, toucher une pièce posée pour la
  reprendre, puis « C'est prêt ».
- Pour rendre la monnaie, le client donne un billet, et l'enfant pose ce qu'il rend.

**Consigne audible.**
- Payer : « Paie le marchand. Pose sur le comptoir le prix écrit sur l'étiquette. »
- Rendre : « Le client donne ce billet. Rends-lui la monnaie. »

**Progression interne.**

| Palier | Ce qui change | Champ | Réf. |
|---|---|---|---|
| CE1-1 | Euros entiers ; constituer une somme | ≤ 1 000 €. Le référentiel ne donne pas de borne propre à la monnaie : on reprend celle des nombres (réf. 1.1 CE1), avec des prix vraisemblables (un vélo à 245 €) | réf. 1.5 Monnaie CE1 « euros ; constituer une somme » |
| CE1-2 | Centimes ; rendre la monnaie | 100 centimes = 1 € | réf. 1.5 Monnaie CE1 « centimes au plus tard en période 2 ; rendre la monnaie » |
| CE2-1 | Montants à virgule, addition et soustraction posées dans le moteur `calcul`, avec une colonne pour la virgule | ≤ 100,00 €, soit 10 000 centimes | réf. 1.5 Monnaie CE2 « addition posée de montants à virgule ; soustraction posée (4,56 € + 15,30 € ; 74,56 € − 15,30 €) » |

**Après une erreur.** Les pièces restent posées. Gobi dit « Il manque des pièces. » ou « Il y en a
trop. Reprends une pièce. »

**Aide de Gobi.**
- *Palier 1* : Gobi compte la somme posée, pièce après pièce, avec les clips de nombres.
- *Palier 2* : la pièce à prendre s'allume dans la réserve.

**Socle et moteurs.**

| Zone ou rôle | Contenu |
|---|---|
| Scène | L'étal |
| Réserve | Les pièces et les billets |
| Pied | « C'est prêt » et les messages |
| Logique | `marche/index.ts` (familles `MAT-MAR-01` à `03`, `catalogue.ts:79-90`). Le moteur `marche` est le grenier avec d'autres valeurs |

```
┌──────────────────────────────────────────────┐
│ [Pause] [Écouter]                        ★★★ │
├──────────────────────────────────────────────┤
│   (étal du marché, fond)   ┌──────────┐      │
│                            │  37 €    │ ←étiquette
│                            └──────────┘      │  SCÈNE
│   ┌─────────── comptoir ─────────────┐       │
│   │ [20 €] [10 €] [5 €] [2 €]        │       │
│   └───────────────────────────────────┘       │
├──────────────────────────────────────────────┤
│  (1 €) (2 €) [5 €] [10 €] [20 €] [50 €]       │  RÉSERVE
├──────────────────────────────────────────────┤
│ [Gobi]                      [ C'est prêt ✓ ] │  PIED
└──────────────────────────────────────────────┘
```

### 3.6 Activité F — Les tartes de Gobi (fractions ; plus tard)

**Ce que l'enfant voit et fait.**
- La scène est une **tarte** (un disque) ou une **tablette** (un rectangle), partagée en *n* parts
  égales. Le dessin est au trait, en régions fermées.
- À côté, la fraction est écrite en grand : « 3/4 ».
- L'enfant **touche une part pour la colorier**, et la touche encore pour l'effacer, tant qu'il n'a
  pas validé. Puis il touche « C'est prêt ».
- Il n'y a pas de réserve : la couleur est unique.

**Consigne audible.** « Colorie trois quarts de la tarte. » C'est une phrase entière par fraction.
Il y en a environ 45 pour les fractions ≤ 1 de dénominateur 2 à 10, et environ 77 jusqu'à 12.

**Progression interne.**

| Palier | Ce qui change | Champ | Réf. |
|---|---|---|---|
| CE1-1 | Moitié et quart (1/2, 1/4), puis les autres fractions unitaires de 1/3 à 1/10 | dénominateur ≤ 10. Justifié par la ligne citée | réf. 1.2 CE1 « fractions d'un tout ≤ 1 ; dénominateurs 2, 3, 4, 5, 6, 8 ou 10 ; moitié, demi, quart ; fractions unitaires dès la période 2, puis non unitaires » |
| CE1-2 | Fractions non unitaires (3/4, 2/5) ; additionner deux fractions de même dénominateur, avec deux couleurs | ≤ 1 | réf. 1.2 CE1 « additionner et soustraire des fractions de même dénominateur (2/5 + 3/5 = 1) » |
| CE2-1 | Dénominateurs jusqu'à 12 ; égalités : colorier 5/10, puis voir que c'est 1/2 | dénominateur ≤ 12. Justifié | réf. 1.2 CE2 « fractions ≤ 1, dénominateur ≤ 12 ; égalités (5/10 = 1/2) » |

**Après une erreur.** Les parts coloriées restent. Gobi dit « Il en faut trois. Compte les parts
coloriées. »

**Aide de Gobi.**
- *Palier 1* : « La tarte a quatre parts. Colorie-en trois. » (une phrase par fraction).
- *Palier 2* : la prochaine part à colorier prend un bord épais fixe.

**Socle et moteurs.**

| Zone ou rôle | Contenu |
|---|---|
| Scène | La tarte et la fraction |
| Pied | « C'est prêt » et les messages |
| Côté client | La scène de **`colorie`**, qui touche une région fermée pour la remplir (`client/src/moteurs/colorie/SceneSvg.tsx`) |
| Logique | **Elle est propre aux maths** : n'importe quelles 3 parts sur 4 sont justes, alors que `moteurColorie` attend des régions nommées (à vérifier). Les logiques de fractions `MAT-JAR-02` et `MAT-MOU-03` (`catalogue.ts:47-50`, `:75-78`) servent de base |

```
┌──────────────────────────────────────────────┐
│ [Pause] [Écouter]                        ★★★ │
├──────────────────────────────────────────────┤
│        ┌───────┬───────┐                     │
│        │ ░░░░░ │ ░░░░░ │        ┌──────┐     │
│        │ ░░░░░ │ ░░░░░ │        │  3   │     │  SCÈNE
│        ├───────┼───────┤        │ ──── │     │
│        │ ░░░░░ │       │        │  4   │     │
│        │ ░░░░░ │       │        └──────┘     │
│        └───────┴───────┘   (tarte en 4)      │
├──────────────────────────────────────────────┤
│ [Gobi]  « Colorie trois quarts de la tarte. » │  PIED
│                            [ C'est prêt ✓ ]  │
└──────────────────────────────────────────────┘
```

---

## 4. Ordre de construction

1. **Le moteur `calcul` et l'activité C, le gué des calculs, en premier.** Trois raisons :
   - C'est la demande du parent : additions et soustractions, à 1 000 dès le CE1.
   - C'est la forme **la plus proche d'un moteur qui existe et qui tient l'écran**. Le mot à trous de
     `grave`, avec son clavier restreint dans la réserve du socle, devient une égalité à trous. Ce
     moteur est déjà migré sur `DispositionMoteur`, et sa garde est verte (socle § 8 et § 9).
   - C'est la seule activité de calcul **qui n'attend aucune réponse du parent** hors Q1. Le calcul
     posé (B) dépend de l'algorithme de soustraction de l'école (Q3) et de la retenue (Q4).

   On teste avec l'enfant le geste des pierres-chiffres (R18) avant de bâtir le reste dessus.
   Voix à prévoir : la consigne, environ 10 indices, et les nombres de la banque.
2. **L'activité B, la pierre à calcul**, sur le même moteur, une fois Q3 et Q4 tranchées. Elle ajoute
   les colonnes, la retenue et l'ordre des cases. Elle commence par l'addition, qui n'attend pas Q3.
3. **L'activité D, les histoires du village.** Elle réutilise `calcul` et le schéma en barres. Son
   délai le plus long est le **contenu** : la banque d'énoncés et leur voix doivent passer par
   `contenu/brouillons/` et la relecture du parent. On commence donc à l'écrire pendant l'étape 1.
4. **L'activité A, le grenier.** La logique `MAT-JAR-01` existe, mais il faut des assets neufs (pomme,
   cagette, caisse, tonneau, charrette) et ajouter le mille à la logique.
5. **E puis F**, après observation de la V1.

À chaque étape, la garde `socle-maths` est vue rouge sur l'état témoin avant d'écrire, puis passe
verte, puis on observe l'enfant (R18).

---

## 5. Écarts à l'inventaire de l'ancienne proposition (§ 5)

L'inventaire du matin reste valable, à ces écarts près.

| Élément | Avant (proposition du matin) | Maintenant |
|---|---|---|
| `partage/src/mathematiques/jeux/jardin/index.ts` | `MAT-JAR-01` au domaine 3–20 | `MAT-JAR-01` aux niveaux exploration et défi (100–1 000, `jardin/index.ts:80`), puis le mille à ajouter |
| `partage/src/mathematiques/jeux/calcul/` | absent | **Neuf** : la logique de B, C et D. Il faut proposer de nouvelles notions dans `contenu/brouillons/mathematiques/competences-proposees.json` (non fait ici) : `math.calcul.addition-posee`, `math.calcul.soustraction-posee`, `math.calcul.mental`, `math.problemes.additifs` |
| `jeux/ponts` (`MAT-PON-03`) | servait en V1 | **En sommeil.** Seul son dessin de planches revient, côté client, comme schéma en barres dans D |
| `jeux/moulin` (`MAT-MOU-02`) | servait en V1 | **En sommeil**, jusqu'aux problèmes multiplicatifs |
| `jeux/marche` | en sommeil | En sommeil, puis activité E |
| Fractions `MAT-JAR-02`, `MAT-MOU-03` | en sommeil | En sommeil, puis activité F |
| Client | 19 fichiers jetés | Même liste de fichiers jetés. **Ajout** : un moteur client `calcul`, sur le modèle de `client/src/moteurs/grave/MoteurGrave.tsx` |
| Garde `socle-maths` | 3 activités × 7 formats = 21 cas | **4 activités V1 × 7 formats = 28 cas** |

---

## 6. Questions au parent

Six questions fermées, celles qui changent la construction. Les anciennes Q5 (phrases entières
plutôt que fragments) et Q6 (quelle liste fait foi pour le lexique CE1) restent ouvertes et valent
aussi ici.

1. **Quel niveau pour la V1 ?**
   (a) Le CE1 d'abord, jusqu'à 1 000 ; les paliers CE2 restent fermés jusqu'à ce que le CE1 soit
   réussi.
   (b) Le CE1 et le CE2 ensemble dès la V1, chaque activité montant d'elle-même du CE1 au CE2.
   *Recommandation : (a), si l'enfant est en CE1 cette année.*
2. **Par quoi commencer le calcul ?**
   (a) Le calcul en ligne (le gué, égalités à trou), puis le calcul posé sur le même moteur.
   (b) Le calcul posé en colonnes d'abord.
   (c) Les deux en même temps.
   *Recommandation : (a)*, pour les raisons du § 4.
3. **Quelle soustraction posée ?** Le programme impose « un seul algorithme par école »
   (réf. 1.3 CE1).
   (a) Par **cassage** : on échange une dizaine contre dix unités, et on barre.
   (b) Par **compensation**, la méthode « traditionnelle » : on ajoute dix unités en haut et une
   dizaine en bas.
   (c) Je demande à l'enseignant ; en attendant, on construit l'addition.
4. **La retenue de l'addition posée :**
   (a) l'enfant l'écrit lui-même, dans sa case au-dessus de la colonne ;
   (b) elle s'écrit toute seule, et l'enfant la voit.
   *Recommandation : (a)*, c'est l'algorithme du programme.
5. **Quand vérifier un calcul ?**
   (a) Chiffre par chiffre : un chiffre faux retourne à sa place aussitôt.
   (b) À la fin : l'enfant remplit tout, puis touche « C'est prêt ».
   *Recommandation : (a)*. Pas de bouton de plus, et l'erreur se montre là où elle est.
6. **Quelle taille pour la V1 ?**
   (a) Les quatre activités : le gué, la pierre à calcul, les histoires et le grenier.
   (b) Le calcul seulement (le gué et la pierre), puis on observe l'enfant avant d'ajouter les
   histoires et le grenier.
   *Recommandation : (b)*. L'ancienne proposition le disait déjà : une activité que l'enfant
   comprend seul vaut mieux que plusieurs qu'il ne comprend pas.

### 6 bis. Réponses du parent (9 octobre 2026) — elles font foi sur ce qui précède

| # | Réponse | Conséquence |
|---|---|---|
| Saisie | « À un moment, il faut bien rentrer les chiffres. » Sur tablette, un **pavé de chiffres type calculatrice** à l'écran quand il y a besoin ; sur PC, les **touches chiffres du clavier** marchent aussi. Aux niveaux simples, des **choix** (2 à 4 réponses à toucher). Un mélange selon ce qu'il y a à faire. | **Remplace le « seul geste » du § 3.0** : la réserve du socle porte soit un pavé 0–9 (grandes touches, disposition de calculatrice), soit des réponses à choisir. Le clavier physique est toujours écouté. Les autres éléments se décalent pour laisser la place au pavé (garde du socle sur les 7 formats). |
| Q1 | Le niveau se règle **en difficulté** : on commence au CE1 facile, on monte vers le CE1 difficile, puis le CE2 vers la fin. L'enfant est en CE1 en octobre 2026. | Un seul parcours qui monte ; pas de choix CE1/CE2. Chaque activité porte des paliers ordonnés (champ numérique, retenue, étapes). |
| Q2 | Calcul en ligne et calcul posé : **les deux**, comme le programme. | Les deux sur le moteur `calcul`, entrelacés selon le palier. |
| Q3 | **(a) Par cassage** : on casse une dizaine en dix unités (la méthode de la classe). | La soustraction posée suit le cassage. |
| Q4 | Pas d'avis du parent. **Décision proposée par Claude** : la retenue monte en paliers — d'abord des additions sans retenue ; puis la retenue s'écrit toute seule et Gobi la montre ; enfin l'enfant l'écrit dans sa case au-dessus de la colonne. Même progression pour le cassage. | À valider au premier essai. |
| Q5 | Non tranchée. On part sur la recommandation **(a) chiffre par chiffre**, à revoir après le premier essai. | — |
| Q6 | « Faire un premier jet pour tester. » | Premier jet : moteur `calcul`, gué des calculs (en ligne) et addition posée, paliers CE1 facile. On observe l'enfant avant le reste. |

---

## 7. Contrôle

Ces comptes sont obtenus par des commandes exécutées sur ce fichier, et leurs sorties sont citées.
On les rejoue après toute modification.

```
(a) $ sed -n '/^## 2\./,/^## 3\./p' Docs/reconception-maths-ce1-ce2-2026-10-09.md \
      | grep -cE '^\| [A-Z]{2}[0-9]+ \|'
    → 44

(b) $ sed -n '/^## 2\./,/^## 3\./p' Docs/reconception-maths-ce1-ce2-2026-10-09.md \
      | grep -E '^\| [A-Z]{2}[0-9]+ \|' | grep -c '| retenu V1 |'
    → 16
    (répartition des 44 : 16 retenu V1, 23 plus tard, 5 hors jeu)

(c) $ awk '/^### 3\.[1-9] Activité/{if(s!="")print s": "n; s=$2; n=0}
          /^## 4\./{print s": "n; exit}
          s!="" && /réf\. 1\.[1-7]( [A-Za-zé]+)? CE[12]/{n++}' Docs/reconception-maths-ce1-ce2-2026-10-09.md
    → 3.1: 5
      3.2: 6
      3.3: 6
      3.4: 6
      3.5: 3
      3.6: 3
    lignes qui citent CE1 ou CE2, par activité ; 6 activités sur 6 en citent au moins une
```

Le premier passage du compte (c) cherchait seulement `réf. 1.x CE1`. Il ne trouvait que 1 citation
en 3.5 : les lignes de la monnaie s'écrivent « réf. 1.5 Monnaie CE1 ». Le motif accepte donc
maintenant un nom de domaine entre la section et le niveau.

Contrôle du champ numérique maximal de chaque activité :

| Activité | Champ maximal |
|---|---|
| A | 10 000 |
| B | 10 000 |
| C | 10 000 |
| D | 10 000 |
| E | 10 000 centimes |
| F | dénominateur ≤ 12 |

Seule F reste sous 100. Elle est justifiée par réf. 1.2 CE1 et réf. 1.2 CE2 : fractions ≤ 1,
dénominateur ≤ 12. Les paliers sous 100 de C (CE1-1, tables) et de D (CE2-2, structures complexes)
citent chacun leur ligne.
