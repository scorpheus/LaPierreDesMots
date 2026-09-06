# Audit des sept fiches `chemin` — 2026-09-05

> Suite de l'audit : `recette-attrape-chemins-2026-09-05.md` décrit l'arbitrage réalisé
> sous le mandat de refonte du parent. Les visites sont désormais locales à l'étape,
> ce qui permet de réutiliser les anciens mots comme vrais leurres sans reprendre leurs
> acquis. Les 20 étapes de lettres/sons gardent toutes au moins deux choix par pas :
> l'hypothèse de couloirs ci-dessous concernait le filtre strict **sans** ce correctif.
> Les résumés UI équivalents et le nouveau plateau sont préparés pour essai local ;
> aucune fiche de contenu/audio n'est générée ou remplacée dans ce lot. La Cité reste
> en attente de validation d'un nouveau contenu, pas déclarée corrigée pédagogiquement.

## Périmètre et méthode

Audit de lecture seule des sept contenus publiés du moteur `chemin`, du graphe déclaré et de
`partage/src/moteurs/chemin/{validation,moteur}.ts`. Aucune fiche publiée n'a été modifiée,
aucun test ni compilation n'a été lancé.

Les sept graphes ont été remesurés : voisinages symétriques, chaque transition
`départ → parcours[0] → …` est adjacente, et les cibles de deux étapes sont disjointes. Ils sont
donc tous traversables **dans l'ordre encodé actuel**. Cette propriété ne prouve pas que la règle
visible autorise justement ce seul ordre.

## Défaut commun constaté

`evaluerChemin` refuse d'abord toute case déjà dans `etat.acquis`, puis n'accepte que
`etape.restantes[0]`. La règle française, la compétence et le libellé de la pierre ne
participent pas à la décision. Une réponse voisine conforme à la consigne, mais prévue plus
tard, devient donc `case-hors-parcours` et compte comme une erreur.

Exemples reproductibles sans interprétation pédagogique :

| Fiche / étape | Case voisine accessible | Règle affichée | Verdict actuel | Pourquoi c'est un refus injustifié |
| --- | --- | --- | --- | --- |
| `galeries-passage-chemin-01` c1, depuis `pierre-depart` | `pierre-robe` (« robe ») | « où tu lis un b » | refusée, `pierre-bol` est exigée | *robe* contient bien `b`. |
| `galeries-passage-chemin-01` c2, depuis `pierre-depart` | `pierre-dame` (« dame ») | « où tu lis un d » | refusée, `pierre-dos` est exigée | *dame* contient bien `d`. |
| `volcan-coulee-chemin-01` c2, depuis `case-balle` | `case-montagne` (« montagne ») | « où tu n'entends pas le même son que dans fille » | refusée, `case-salle` est exigée | *montagne* porte /ɲ/, pas /j/. |
| même fiche c2, depuis `case-salle` puis `case-colle` | `case-ligne`, puis `case-signe` | même règle négative | refusées, `case-colle`, puis `case-pile` sont exigées | /liɲ/ et /siɲ/ ne contiennent pas le son de *fille*. |

Les mots déjà acquis aggravent ce contrat : ils sont refusés avant toute considération de la
consigne. C'est incompatible avec des étapes qui répètent le même critère (« aussi », « autres »,
« derniers »), sauf à rendre le lotissement explicitement visible et à ne plus présenter ces
anciennes réponses comme des choix de la règle courante.

## Résultat linguistique, fiche par fiche

| Fiche | Cibles déclarées | Vérification | Cas hors étape qui satisfont néanmoins la règle |
| --- | --- | --- | --- |
| `clairiere-lianes-voyelles-01` | `chat/papa/lac`, `lit/midi/riz`, `dos/moto/pot`, `mur/lune/jus` | Toutes les lettres demandées (`a`, `i`, `o`, `u`) sont présentes et les parcours sont des lignes sans raccourci cible. | `l’arbre`, départ de c1, contient aussi `a` ; ce n'est pas une réponse, à condition qu'il reste explicitement marqué départ. |
| `foret-muette-pas-japonais-chemin-01` | pluriels `fleurs/arbres/livres`, singuliers `fleur/arbre/livre`, puis `mots/amis/feuilles` | Chaque cible porte bien, ou ne porte pas, la lettre `s` suivant la consigne. | c1 et c3 décrivent toutes deux les mots avec `s` : `chats`, les trois cibles de c1 et les trois de c3 satisfont ce même critère. « aussi » ne rend pas la frontière des lots lisible. |
| `marais-jumeau-nenuphars-chemin-01` | /u/ : `jour/loup/poule`, puis `tour/cour/route` ; /wa/ : `soir/toit/poire` | Toutes les cibles prononcent bien /u/ comme *trou*, ou /wa/ comme *noir*. | c1 et c3 sont deux lots du même /u/ ; `boule` et `four` sont aussi des départs qui satisfont leur règle. « autres » atténue le problème, sans faire apparaître le critère de lot. |
| `marais-jumeau-nenuphars-chemin-02` | /ɛ̃/ : `matin/jardin/sapin`, puis `copain/raisin/dinde` ; /ɔ̃/ : `citron/savon/bonbon` | Toutes les cibles correspondent aux nasales de *main* ou *pont*. | Même découpage artificiel du /ɛ̃/ entre c1 et c3 ; `lapin` et `pain` sont des départs conformes. |
| `galeries-passage-chemin-01` | `bol/bus/bec`, `dos/dur/dix`, `robe/barbe/botte`, `dame/radis/ronde` | Chaque cible contient bien `b` ou `d`; aucune ne mélange les deux axes. | Les six mots en `b` relèvent tous de c1 **et** c3 ; les six mots en `d` relèvent tous de c2 **et** c4. Les contre-exemples immédiats de c1 et c2 figurent ci-dessus. |
| `volcan-coulee-chemin-01` | /j/ : `bille/quille/famille`; non-/j/ : `salle/colle/pile`; /ɲ/ : `ligne/signe/agneau` | Toutes les cibles sont phonologiquement correctes. | La règle négative c2 accepte aussi tous les futurs mots en `gn` : `montagne/ligne/signe/agneau`. Trois sont voisins avant la fin de c2, donc refusés à tort. |
| `cite-des-histoires-ponts-chemin-01` | trois séquences de phrases | L'ordre imposé est ici légitime **si** les phrases forment une chronologie vérifiée : c'est la règle annoncée, pas un ordre secret. | La source `fiches-origine/NIVEAU 2.pdf` n'est pas versionnée à l'emplacement déclaré : la conformité des douze phrases ne peut pas être certifiée. Le commentaire dit que le renard « tient le guidon », tandis que `pont-quatre` dit qu'il « porte le vélo » ; `pont-six` (« Le vélo marche ») et les séquences c2/c3 ne sont pas étayés par ce commentaire. |

Le dernier contenu a en outre un blocage déjà identifié dans
`Docs/recettes/marais-volcan-cite-2026-09-02.md` : les consignes demandent des « images », mais
les douze cases sont des phrases et aucun asset n'est déclaré. Dire « phrases », ou fournir des
images, requiert le visa parent et la régénération des clips audio.

## Arbitrage de mécanique recommandé

Accepter n'importe quelle case conforme parmi tous les lots résoudrait les refus, mais casserait
la mécanique de trajet : les catégories répétées sont réparties sur des segments disjoints. Un
choix valide comme `robe` en c1 des Galeries peut quitter le segment `bol → bus → bec` sans chemin
de retour, car les pierres déjà franchies ne sont pas réutilisables. Cette voie demanderait de
redessiner les sept graphes ou d'ajouter du retour arrière ; elle n'est pas la correction minimale.

Le compromis recommandé est donc le **plateau filtré par étape** :

1. N'afficher/interagir, pour l'étape courante, qu'avec son départ, son segment de parcours et
   des leurres qui contredisent réellement la règle courante.
2. Masquer les futures cases qui satisfont la règle courante (en particulier
   `montagne/ligne/signe/agneau` durant le c2 du Volcan). Une ancienne coche reste une trace de
   progression, pas une réponse de la nouvelle règle ; elle doit être hors du plateau interactif.
3. Préserver l'ordre du segment parce qu'il est alors matérialisé par le seul chemin visible,
   non parce qu'une autre réponse apparemment juste est sanctionnée. `restantes[0]` devient une
   contrainte de route visible, jamais le substitut silencieux d'une règle de lecture.
4. Calculer le mode de réponse et `p_devinette` sur les **choix effectivement visibles et
   atteignables**, pas sur le degré maximal du graphe complet qui peut être masqué.

Ce filtre doit être accompagné d'une garde : une case ancienne affichée de nouveau comme leurre
serait rejetée par `case-deja-franchie` avant d'être classée contre la règle. Il faut donc soit la
masquer, soit lui donner un état de leurre local, non inscrit dans `acquis` global.

### Proposition de résumé court, à valider par le parent

Le résumé de plateau ne remplace ni la consigne complète ni son clip audio : il rend le critère
actuel visible pendant le trajet. Éviter `Le son de fille`, formulation trop elliptique qui perd
le rapport de comparaison. Les formes proposées tiennent sur une ligne et gardent le mot
référence : `Avec la lettre b`, `Sans la lettre s`, `Même son que dans « fille »` et
`Pas le son de « fille »`. Elles sont des textes enfant, donc ne deviennent visibles qu'après le
visa parent ; aucune consigne publiée ni audio n'est modifié par cette proposition.

## Conséquence : choix réels après filtrage

Les sept chemins restent jouables, mais le filtre strict crée des couloirs sur les fins de
séquence. Il ne faut pas les présenter comme des QCM à plusieurs choix ni mesurer leur hasard
comme tels.

| Fiche | Segments qui deviennent sans leurre non acquis après filtrage strict |
| --- | --- |
| Clairière | c4 entier (`mur → lune → jus`). |
| Forêt muette | c3, après `mots`, puis après `amis`. |
| Marais 01 | c3, après `tour`, puis après `cour`. |
| Marais 02 | c3, après `copain`, puis après `raisin`. |
| Galeries | c4, après `dame` (le voisin `robe` est une ancienne case). |
| Volcan | c2 après `salle` et `colle`; c3 après `ligne` et `signe`. |
| Cité | c3 : les transitions n'offrent plus de concurrent si les anciennes étapes sont retirées. |

Deux options nécessitent un arbitrage parent : assumer ces segments en couloir, avec une
présentation de trajet et un `modeReponse` correspondant ; ou préparer dans
`contenu/brouillons/` de nouveaux leurres adjacents, non acquis et réellement contraires à chaque
règle. Aucun de ces ajouts ne doit être écrit dans les fiches publiées sans relecture et visa.

## Oracles indépendants à exiger avant la correction

Ne pas recopier `parcours` comme oracle : cela ne détecterait jamais une règle fausse. Introduire
dans les tests une table linguistique indépendante, limitée à ces corpus, qui classe les libellés
par : lettre `a/i/o/u`, présence de `s`, lettres `b/d`, et phonèmes /u/, /wa/, /ɛ̃/, /ɔ̃/, /j/ et
/ɲ/. Elle permettra d'affirmer pour chaque état affiché :

- toute cible visible satisfait le critère de son étape ;
- aucun leurre visible ne le satisfait ;
- aucun mot conforme, mais hors segment, n'est visible et cliquable ;
- chaque transition cible déclarée est voisine ;
- les choix visibles disposent du nombre annoncé, ou le segment est explicitement déclaré
  couloir.

Pour la Cité, l'oracle ne doit être écrit qu'après dépôt/versionnage du texte source et validation
parent de la chronologie, des images ou de la formulation « phrases ».

## Décisions attendues

1. Valider le plateau filtré par étape et le statut assumé des segments-couloirs, ou demander des
   leurres supplémentaires en brouillon.
2. Valider la correction de la Cité : phrases plutôt qu'images, et réécriture sourcée des douze
   événements avec audio régénéré.
3. Ne modifier les sept contenus publiés qu'après ces visas ; les corrections linguistiques et
   topologiques proposées ci-dessus sont des pistes, pas une validation de contenu.
