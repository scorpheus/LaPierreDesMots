# État du projet — 2026-08-02, fin de journée

Trois minutes de lecture. Tout ce qui suit a été **exécuté**, pas supposé.

---

## LA CHOSE À FAIRE EN PREMIER, ce matin, avant tout le reste

**Ferme la Pierre et relance-la.** Double-clic sur `arreter.bat`, puis sur `demarrer.bat`.

C'est tout. La réparation se fait toute seule au démarrage : le serveur applique la migration
`010`, recalcule la recoloration de chaque profil, et l'écrit. Tu verras passer cette ligne :

```
[pierre] migrations appliquees : 10 (schema en version 10)
[pierre] recoloration recalculee pour 1 profil(s).
```

Tant que le serveur n'est pas relancé, **Ezékiel reste bloqué** : celui qui tourne en ce moment a
été démarré hier soir à 23:17 et ne connaît pas le correctif. Rien n'est perdu au passage — ni ses
étoiles, ni ses deux Éclats.

---

## Le bug que tu as rencontré : mesuré, corrigé, vérifié sur TA base

Le pourcentage de coloriage de chaque région était *calculé une fois puis figé en base*. Quand
Ezékiel a fini `clairiere-01`, la Clairière ne comptait qu'un seul nœud : elle est passée à 100 %.
Seize nœuds se sont ajoutés depuis, personne n'a recalculé, et **plus aucun monde n'était
cliquable**. Vérifié sur une copie de sa base, jamais sur l'originale :

| Région | Avant | Après | Nœuds faits | Éclat |
|---|---|---|---|---|
| Clairière | **100 %** | **16,67 %** | 1 / 6 | conservé |
| Galeries | **100 %** | **16,67 %** | 2 / 12 | conservé |

Un **second blocage** a été trouvé au passage, que tu aurais rencontré : l'enfant qui termine
honnêtement les 18 nœuds livrés se retrouvait devant deux régions vides. La carte repropose
désormais les régions déjà conquises, et une région sans exercice n'est plus jamais proposée.

---

## CE QUE LA QA GARANTIT — la section à lire si tu n'en lis qu'une

Tu as demandé « un super QA, c'est comme ça qu'on gagnera du temps ». Voici ce qu'elle vaut,
mesuré en la cassant exprès : on abîme le code de production, un défaut à la fois, et on regarde si
la suite hurle. C'est la seule mesure honnête — *une QA qu'on ne teste pas est une QA qu'on croit
sur parole.*

### Le chiffre

```
                                          AVANT ce lot     APRÈS ce lot
mutations qui valent                           27               27
détectées                                      16               18
survivantes                                    11                9
   dont un test E2E nommé les attrape           7                5
   dont PERSONNE ne les voit                    4                4
taux de survie                                41 %             33 %
contrôles négatifs verts                      5 / 5            5 / 5
base verte avant ET après le banc              oui              oui
```

Les deux mesures ont tourné sur le **même code**, à quelques minutes d'écart : la seule différence
est la suite de tests. `npm run qa:mutations` rejoue tout et refuse de publier un chiffre si sa
propre base n'est pas verte.

**Les deux défauts nouvellement attrapés sont ceux qui t'ont coûté le plus cher** :

- le bouton « La carte » qui disparaît de l'écran du nœud — **ton défaut n° 1**, un écran sans
  issue. Il passait ; il est maintenant attrapé **sans build**, en huit secondes ;
- la carte de profil qui ne répond plus au tap — la porte du jeu.

### Ce qu'elle attrape aujourd'hui, et qui ne l'était pas

- **Les impasses, mesurées sur la propriété et non sur l'indice.** Une sentinelle vit dans la page
  et regarde chaque image peinte : quel geste a fait changer d'écran, depuis quel écran.
  12 écrans habités, **12 à sortie prouvée, 0 impasse**. Compter les boutons ne suffisait pas —
  c'est exactement ce qui avait laissé passer ton défaut n° 1.
- **La perte silencieuse d'une tentative, en plein parcours.** Un contrôle permanent coupe
  `POST /api/tentatives` au réseau : l'enfant voit ses étoiles, le journal reste vide, la QA le dit.
- **Le sens du ductus sur 43 traits** au lieu de 23.
- **29 propriétés** (1 000 cas chacune, graine fixée) dont l'échec est *démontré* : 12 mutations
  sur 12 les font rougir.
- **Deux fuzzers** : 25 100 cas de contenu, 2 019 cas d'API, 29 routes sur 29, **aucun 5xx**.
  Cinq plantages trouvés, cinq corrigés.
- **Les tests qui rassurent sans rien prouver.** `npm run qa:trompeurs` tourne au `pre-commit` :
  un test désactivé, un cas sans assertion, un « 14 sur 14 » asserté `> 0` — c'est **ton défaut
  n° 6** — font échouer le commit. Vérifié en le réinjectant : 2 bloquants nommés, code 1.

### Ce qu'elle ne peut PAS attraper — les quatre trous connus, et ils sont réels

Ils sont nommés, chiffrés, et le banc les réimprime à chaque exécution. Une lacune connue vaut
mieux qu'une garantie fausse.

| # | Le défaut | Pourquoi personne ne le voit |
|---|---|---|
| M18 | **La flèche du guidage du ductus pointe à l'envers** | La flèche est vérifiée *présente*, jamais *orientée*. L'enfant obéit à ce qu'il voit et le moteur le punit. C'est ton défaut n° 3, déplacé d'un cran — **et c'est le plus grave des quatre.** |
| M26 | **Une animation entre dans le champ de lecture** | « Le décor s'agite, le texte jamais » n'a aucune traduction mécanique. Une règle non négociable sans test est une intention. |
| M11b | La marque `data-clip` disparaît | Le seul garde de D42 est un `toHaveCount(0)` : quand l'attribut n'existe plus, le sélecteur ne désigne plus rien et l'assertion reste verte. Le garde se désarme tout seul. |
| M20 | La clé d'idempotence oublie le nœud | La fonction qui décide si une tentative est un doublon n'est appelée par aucun test. Sévérité faible en usage réel, coût du test : dix lignes. |

**Zones aveugles par nature**, en clair : la QA est excellente sur ce que le DOM porte comme
**donnée** (`data-*`) et sur les fonctions pures ; elle est presque aveugle à ce que l'enfant
**voit** — un angle, une couleur, une taille rendue par le CSS, une animation. Le seul outil qui
couvre ça est `test:visuel`, à l'arrêt en attendant tes yeux (D39). **Dix écrans sur douze n'ont
toujours pas de test à leur nom** ; l'explorateur de navigation en monte onze à travers le routeur,
ce qui n'est pas la même chose.

### L'épreuve de généralisation : cinq défauts que personne n'avait anticipés

Rejouer les mutations d'un audit mesure qu'on n'a pas régressé, pas qu'on sait chercher. Cinq
défauts neufs ont donc été inventés après coup, dans cinq organes qu'aucune recette existante ne
touchait. **Quatre sur cinq attrapés. Le cinquième était un vrai trou, et il est fermé.**

| Le défaut injecté | Sort |
|---|---|
| `Alea.melanger` ne mélange plus : la bonne réponse ne bouge plus de place | attrapé |
| La coupe syllabique se décale d'une lettre — l'enfant lit « mam-man » | attrapé |
| `Horloge.avancer` n'avance que de moitié : **le temps simulé ment à toute la QA** | attrapé |
| La normalisation replie l'apostrophe à l'envers : l'enfant a raison, l'appli dit non | attrapé |
| **La zone de lecture perd Andika et retombe sur Verdana** | **SURVIVAIT — corrigé** |

Le dernier mérite trois lignes, parce qu'il dit ce qui reste fragile. Le dépôt contenait
**quatre** assertions portant le mot « Andika ». Aucune ne gardait la règle : l'une lisait la pile
d'*OpenDyslexic*, les trois autres vérifiaient le *code* `'andika'`, jamais ce que ce code désigne.
La police que l'enfant lit pouvait devenir Verdana sans qu'une ligne rougisse.
`tests/unitaires/polices-piles.test.ts` le ferme, et la fermeture est prouvée en réinjectant le
défaut.

---

## Les chiffres des commandes

Mesurés sur un dépôt **calme**, entre 12:37 et 13:25.

| Commande | Sortie | Résultat |
|---|---|---|
| `npx tsc -b` | **0** | — |
| `npx eslint .` | **0** | 0 erreur, 17 avertissements (variables inutilisées) |
| `npx vitest run` | **0** | **1745 tests, 113 fichiers, 0 échec** |
| `npm run test:contenu` | **0** | **226 contrôles, 0 problème** |
| `npm run test:rejeu` | **0** | vert |
| `npm run test:e2e` | **0** | **198 verts, 0 rouge** |
| `npm run qa:mutations` | **0** | 27 mutations, 18 détectées, 9 survivantes, 4 trous |
| `npm run qa:trompeurs` | **0** | 0 bloquant, 66 avertissements (plafond gelé à 66) |
| `npm run verifier` | **1** | rouge tant que `test:visuel` attend tes yeux (D39) |

---

## Ce qui reste rouge

**`test:visuel`** — rouge **par décision** (D39) : le décor et Gobi vont être refaits, figer des
références maintenant serait les refaire aussitôt. Ça se lève en regardant les images
(`tests/rapports/artefacts/`), puis `npm run test:visuel -- --maj`.

**La moitié du contenu est un brouillon.** 9 exercices sur 18 portent la marque
`PLACEHOLDER — À VALIDER PAR LE PARENT AVANT D'ÊTRE JOUÉ`. C'est toujours le vrai reste à faire.

---

## Ce que tu dois savoir, même si ça n'est pas agréable

**Trois campagnes ont écrit sur ce dépôt aujourd'hui, en même temps.** Chaque brief disait « tu es
seul sur le dépôt » ; c'était faux à chaque fois. Mesuré, pas ressenti : un `npm run verifier`
lancé par une autre session à 12:38, une campagne Playwright concurrente à 12:47 qui a fait tomber
trois recettes innocentes, deux commits étrangers à 12:48 et 12:54, puis une passe de contenu de
**159 fichiers** commencée vers 13:56 et encore en vol au moment où j'écris.

**Ce que ça change pour toi, concrètement** : au moment où cette page est écrite, `npx vitest run`
rend **25 rouges**, tous dans des tests qui lisent `contenu/` — nœuds cités mais pas encore livrés,
consignes sans clip, compétences sans exercice. **Ce n'est pas une régression, c'est un chantier de
contenu à moitié posé.** Il se refermera quand cette campagne aura fini. Les chiffres du tableau
ci-dessus ont été pris avant qu'elle ne commence, sur un dépôt calme, et le banc de mutation refuse
par construction de publier quoi que ce soit sur une base rouge.

**Six fichiers de cette campagne sont PRÊTS mais PAS ENCORE COMMITÉS**, et il faut que tu le
saches. Le crochet `pre-commit` lance `eslint .` et la suite entière : l'un et l'autre sont rouges
à cause du chantier de contenu ci-dessus (une erreur de lint dans `scripts/generer-phonologie.mjs`,
18 fichiers de test rouges). **Je n'ai pas utilisé `--no-verify`** — c'est une règle, et la
contourner aurait été exactement le genre de raccourci que cette campagne combat. Les six fichiers
sont donc **posés dans l'index** (`git status` les montre en `A`/`M`, distincts des 274 autres) et
partiront au prochain commit qui passe :

```
scripts/qa/recettes.mjs                          (cliquet resserré sur M2 et M25)
scripts/qa/recettes-nouvelles.mjs                (les 5 mutations neuves)
tests/unitaires/polices-piles.test.ts            (ferme le trou trouvé)
tests/unitaires/qa-navigation-en-memoire.test.ts (garde le défaut n° 2)
Docs/etat-du-projet.md · Docs/questions-en-attente.md
```

Chacun a été vérifié **seul** et rend vert : `2 fichiers, 10 tests, 0 échec`.

**Une leçon d'outillage, notée pour la prochaine fois** : le banc de mutation restaure le fichier
qu'il abîme dans un `finally` — mais un `finally` ne survit pas à un processus tué. Une
interruption a laissé `partage/src/pedagogie/leitner.ts` muté sur le disque. Repéré par
`git status`, restauré. C'est le genre d'accident qui finit dans un commit si personne ne regarde.

---

## Ce qui attend ta décision

Détail et mesures dans **`Docs/questions-en-attente.md`**.

1. **Les captures visuelles** — les regarder, puis figer ou refuser. C'est ce qui débloque
   `npm run verifier`.
2. **Les quatre trous de QA ci-dessus** — M18 (la flèche du ductus) est le seul qui mérite un lot à
   lui seul, et il coûte une quarantaine de lignes. Les trois autres sont écrits et chiffrés.
3. **Quand tout est terminé, rejouer ou réviser ?** Aujourd'hui la carte renvoie sur le *premier*
   nœud de la région conquise. Le Leitner sait déjà quelles compétences sont dues.
4. **Faut-il montrer les régions vides ?** Elles ne sont plus cliquables, donc plus trompeuses.
5. **Le seuil de couverture lexicale CE1** (Q-INT-2), inchangé : 93,0 % des mots lus y figurent.

---

## Les outils, si tu en as besoin

| Commande | Ce qu'elle te dit |
|---|---|
| `npm run qa:mutations` | Casse le code exprès, 33 fois, et mesure ce que la QA rate. ~20 min |
| `npm run qa:trompeurs` | Les tests qui rassurent sans rien prouver. 2 s, tourne au `pre-commit` |
| `npm run qa:tableau` | Une page : moteurs gardés, écrans gardés, survivants, trous |
| `npm run profil:reinitialiser` | Remet un profil à zéro. Sauvegarde la base avant d'écrire |

L'onglet **« Le profil »** de l'espace parent montre, pour chaque région, ce que la base *stocke*
et ce que le journal *dit vraiment*, avec l'écart — c'est ce qui aurait rendu ton bug visible en
dix secondes.
