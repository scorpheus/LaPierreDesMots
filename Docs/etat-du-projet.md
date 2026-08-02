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
été démarré hier soir à 23:17 et ne connaît pas le correctif.

Rien n'est perdu au passage — ni ses étoiles, ni ses deux Éclats. C'est vérifié plus bas, sur sa
vraie base.

---

## Le bug que tu as rencontré : mesuré, corrigé, vérifié sur TA base

**Ce qui s'était passé.** Le pourcentage de coloriage de chaque région était *calculé une fois puis
figé en base*. Quand Ezékiel a fini `clairiere-01`, la Clairière ne comptait qu'un seul nœud : elle
est donc passée à 100 %, Éclat compris. Depuis, seize nœuds se sont ajoutés — et personne n'a
recalculé. Les deux régions se croyaient finies, la carte ne proposait plus qu'elles, et **plus
aucun monde n'était cliquable**.

C'était une violation du principe fondateur du projet : *le journal fait foi, tout indicateur se
recalcule depuis lui*. Cette colonne était devenue une seconde vérité, plus collante que le journal.

**Vérifié sur une copie de `donnees/pierre.db`**, profil `prf-0fbbeba7fb27d3f7`, serveur monté sur
le port 8099 — jamais sur l'original :

| Région | Avant | Après | Nœuds faits | Éclat |
|---|---|---|---|---|
| Clairière | **100 %** | **16,67 %** | 1 / 6 | conservé (01/08 21:44) |
| Galeries | **100 %** | **16,67 %** | 2 / 12 | conservé (02/08 07:27) |

```
regionsOuvertes (ce que le doigt peut toucher) : [clairiere, galeries]
  clairiere → clairiere-02  (etape 2/6)   GET /api/contenu/noeuds/clairiere-02 → 200
  galeries  → galeries-03   (etape 3/12)  GET /api/contenu/noeuds/galeries-03  → 200

sorties qui REPONDENT : 2        noeuds jouables : 18 / 18
Eclats conserves (R14) : 2       noeuds termines / etoiles : 3 / 7

L'ENFANT PEUT-IL REJOUER ? OUI
```

**Et le recalcul est réel.** Je n'ai pas cru le rapport : j'ai remis de force les six régions à
100 % dans la base, puis relu la carte par la route. Elles sont revenues à 16,67 / 16,67 / 0 %, et
les deux Éclats étaient toujours là.

---

## Un SECOND blocage, que tu n'avais pas encore rencontré — et que tu aurais rencontré

Trouvé par les nouveaux tests de « profils vécus », sur un enfant qui termine **honnêtement** les
18 nœuds livrés : les deux régions qui portent du contenu passent à 100 %, la carte les retire, et
les deux qu'elle ouvre à la place **n'ont aucun exercice**. Zéro sortie. L'enfant qui a tout réussi
se retrouvait aussi bloqué que celui dont la base mentait.

**Corrigé** : quand il n'y a plus rien de neuf, la carte repropose les régions déjà conquises —
rejouer est gratuit et ne reprend aucun acquis. Et une région sans exercice n'est plus jamais
proposée : elle produisait un bouton « Partir vers Le Marais Jumeau » qui ne faisait rien.

---

## Les chiffres

| Commande | Sortie | Résultat |
|---|---|---|
| `npx tsc -b` | **0** | — |
| `npx eslint .` | **0** | 0 erreur, 17 avertissements (variables inutilisées) |
| `npx vitest run` | **0** | **1745 tests, 113 fichiers, 0 échec** |
| `npm run test:contenu` | **0** | **226 contrôles, 0 problème** |
| `npm run test:qualite` | **0** | **48 verts** · bundle 176,5 Ko gzip sur 250 Ko |
| `npm run test:rejeu` | **0** | vert |
| `npm run test:e2e` | **1** | **196 verts, 2 rouges** — voir « ce qui reste rouge » |
| `npm run verifier` | **1** | rouge tant que `test:visuel` attend tes yeux (D39) |

**L'invariant « l'enfant peut toujours faire quelque chose »**, mesuré sur les cinq profils qui ont
un passé — c'est la question qui compte, et elle est vraie partout :

| Profil | Ce qu'il a vécu | Sorties qui répondent |
|---|---|---|
| à mi-parcours | Clairière finie, 4 Galeries sur 12 | **1** — galeries-05 |
| **a tout fini** | les 18 nœuds livrés | **2** — clairiere-01, galeries-01 *(était 0)* |
| a beaucoup échoué | 12 échecs avec aide, puis une réussite | **2** |
| absent 40 jours | révisions Leitner dues | **2** |
| **catalogue agrandi** | **le cas d'Ezékiel** | **2** — clairiere-02, galeries-03 *(était 0)* |

---

## Ce qui reste rouge

**`test:visuel`** — rouge **par décision** (D39) : le décor et Gobi vont être refaits, figer des
références maintenant serait les refaire aussitôt. Ça ne se corrige pas en codant, ça se lève en
regardant les images (`tests/rapports/artefacts/`), puis `npm run test:visuel -- --maj`.

**Deux tests E2E, tous deux dans `parcours-zz-invariants.spec.ts`** — ils échouent dans la suite
complète et **passent seuls en 2,5 s**. Ils ne viennent pas de ce lot : ce fichier a été écrit
aujourd'hui à 12:14 par une autre campagne qui travaillait sur le dépôt en même temps que moi.
Vérifié par **expérience témoin** : annuler mes corrections, recompiler et relancer la suite
entière **ne les rend pas verts**. C'est un fichier encore en vol, pas une régression.

Deux autres rouges de la chaîne `verifier` étaient de **mon** ressort, et sont réparés :
`test:qualite` (l'audit d'accessibilité comptait deux onglets parent alors que H2 en a livré
trois) et le budget de bundle qui n'en était que la conséquence.

**La moitié du contenu est un brouillon.** 9 exercices sur 18 portent la marque
`PLACEHOLDER — À VALIDER PAR LE PARENT AVANT D'ÊTRE JOUÉ`. Inchangé, et c'est toujours le vrai
reste à faire.

---

## Ce que tu dois savoir, même si ça n'est pas agréable

**Le dépôt a eu deux campagnes qui écrivaient dessus en même temps.** Le brief de cette intégration
disait « tu es seul sur le dépôt » ; c'était faux. Mesuré par horodatage : 17 specs E2E réécrites à
11:51, `tests/e2e/invariants.ts` créé à 12:21, `partage/src/monde/carte.ts` — mon propre fichier —
touché à 12:28.

Ça m'a coûté trois exécutions E2E perdues sur des conflits de port et une fausse piste : j'ai
d'abord cru que mes corrections cassaient un test. Il a fallu une expérience témoin pour établir
que non. Le détail est dans `Docs/questions-en-attente.md`, section **Q-INTH-5**.

**Conséquence concrète pour toi** : ce commit ne contient **que** les fichiers des lots H1, H2, H3
et de leur intégration. Le travail de l'autre campagne est encore dans l'arbre de travail, non
livré — c'est à elle de le finir.

---

## Ce qui attend ta décision

Détail et mesures dans **`Docs/questions-en-attente.md`**, section **Q-INTH** en fin de fichier.

1. **Les captures visuelles** — les regarder, puis figer ou refuser. C'est ce qui débloque
   `npm run verifier`.
2. **Quand tout est terminé, rejouer ou réviser ?** Aujourd'hui la carte renvoie sur le *premier*
   nœud de la région conquise. Le Leitner sait déjà quelles compétences sont dues : une sortie
   « révision » serait pédagogiquement meilleure. Je ne l'ai pas fait — ce serait inventer une
   règle que rien dans `Docs/` ne porte.
3. **Faut-il montrer les régions vides ?** Le Marais Jumeau et la Forêt Muette sont dévoilés et
   n'ont aucun exercice. Ils ne sont plus cliquables, donc plus trompeurs — mais faut-il les
   laisser voilés jusqu'à ce qu'ils aient du contenu ? C'est de la mise en scène, pas du code.
4. **Le seuil de couverture lexicale CE1** (Q-INT-2), inchangé : 93,0 % des mots lus y figurent.

---

## Un outil nouveau, si tu en as besoin

Le lot H2 a ajouté un onglet **« Le profil »** dans l'espace parent. Il montre, pour chaque région,
ce que la base **stocke** et ce que le journal **dit vraiment**, avec l'écart — c'est ce qui aurait
rendu ce bug visible en dix secondes. Il porte aussi une **remise à zéro** de profil, en deux
portées, qui demande de retaper le prénom de l'enfant avant d'effacer quoi que ce soit.

Hors interface : `npm run profil:reinitialiser`. Elle sauvegarde la base avant d'écrire.
