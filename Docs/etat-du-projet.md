# État du projet — 2026-08-02, au réveil

Trois minutes de lecture. Tout ce qui suit a été **exécuté**, pas supposé.

---

## En un coup d'œil

| | |
|---|---|
| **Le jeu se joue** | Deux régions ouvertes, **18 nœuds**, les **14 moteurs** jouables |
| **Rien n'est perdu** | Les 14 moteurs écrivent bien en base — c'était **4 sur 14 qui perdaient tout** |
| **Ce qui reste rouge** | `test:visuel` seulement, et **il attend tes yeux**, pas une correction |
| **Ce qui t'attend** | **9 exercices sur 18** sont des brouillons marqués « à valider par le parent » |

---

## Ce qui marche, et se joue vraiment aujourd'hui

**Le défaut le plus grave est mort.** Une tentative terminée pouvait ne rien enregistrer : l'écran
de récompense s'affichait, les étoiles tournaient, et le journal restait vide. La note de la nuit
n'accusait qu'un moteur (`phrase`) ; l'audit par objet en a trouvé **quatre** — `assemble`,
`chrono`, `paires`, `phrase`. Chacun rendait une erreur 500 qui annulait toute la transaction.
Pour un enfant, cela veut dire : *il a fini son exercice, et le lendemain rien ne s'en souvient*.
C'est exactement ce que R14 interdit.

Vérifié par mes soins, en montant les 14 moteurs sur leurs **vrais exercices** et en relisant la
**base de données**, pas la réponse du serveur :

```
moteur     http   tentative  étapes  progression  maîtrise
assemble   201    1          3       oui          oui
… les 14 lignes, toutes identiques …
MOTEURS QUI JOURNALISENT : 14 / 14
recalculerMaitrise       : ok
```

**Les 14 moteurs sont atteignables.** Six d'entre eux — `assemble`, `chemin`, `chrono`,
`histoire`, `libre`, `paires` — étaient du code écrit, testé, monté, et **introuvable dans le
jeu** : aucun exercice ne les citait. Ils ont maintenant chacun leur exercice, leur habillage et
leur nœud (`galeries-07` à `galeries-12`). Mesuré : **8/14 avant, 14/14 après.**

**La carte ne ment pas.** J'ai terminé les 12 nœuds des Galeries un par un et relu le pourcentage
après chaque réussite : 0 → 0,083 → 0,167 → … → 1. Un douzième par nœud, exactement, et l'Éclat
tombe au douzième. Ce que l'enfant voit correspond à ce qu'il a fait.

**Aucun état sans issue.** Le graphe des 18 nœuds : 0 cycle, 0 prérequis pointant dans le vide,
0 nœud impossible à ouvrir. Le bot « casse-cou » donne 40 réponses fausses d'affilée sans
provoquer un seul écran d'échec ; le « singe » tape 5000 fois au hasard sans rien casser.

---

## Les chiffres qui comptent

| Commande | Sortie | Résultat |
|---|---|---|
| `npx tsc -b` | **0** | — |
| `npx eslint .` | **0** | 0 erreur, 17 avertissements (variables inutilisées) |
| `npx vitest run` | **0** | **1478 tests, 96 fichiers, 0 échec** |
| `npm run test:contenu` | **0** | **226 contrôles, 0 problème** |
| `npm run test:e2e` | **0** | **186 tests** (parcours + robustesse) |
| `npm run verifier` | **1** | **10 étapes vertes sur 11** — seul `test:visuel` est rouge |

En plus : `test:qualite` **48 tests verts**, `test:rejeu` vert.

| Couverture | |
|---|---|
| Moteurs qui **journalisent** en base | **14 / 14** |
| Moteurs **atteignables** par l'enfant | **14 / 14** |
| Écrans déclarés / recettes d'écran auditées en accessibilité | **13 / 29 recettes** |
| Consignes **audibles** (un tap = une voix) | **69 clés couvertes, 174 clips, 0 refusé** |
| Nœuds livrés / cités par la carte | **18 / 18**, écart 0 |
| Fichiers **supprimés** cette session | **0** |
| Commits | **4** (17 au total) |

---

## Ce qui ne marche pas encore

**`test:visuel` est rouge, et c'est voulu.** 8 captures sur 15 diffèrent de leur référence : la
carte du monde, le décor v2, le nœud colorie, l'écran de récompense. **Aucune image ne se fige
sans qu'un adulte l'ait regardée** (D39) — donc le rouge ne se répare pas en codant, il se lève
en ouvrant les images. Elles sont dans `tests/rapports/artefacts/`. Si l'écart te va :
`npm run test:visuel -- --maj`.

**La moitié du contenu est un brouillon.** 9 exercices sur 18 portent la marque
`PLACEHOLDER — À VALIDER PAR LE PARENT AVANT D'ÊTRE JOUÉ`, dont les 6 nouveaux des Galeries. Ils
sont mécaniquement valides — schémas, syllabation vérifiée contre le code, lexique CE1 à 93 % —
mais **personne n'a jugé s'ils sont bons pour ton fils**. C'est le vrai reste à faire.

**Un piège dormant, sans conséquence aujourd'hui.** La tolérance de tap de 24 px (R16) est bien
appliquée à l'enfant, mais par **11 copies privées** dans les composants du client, pendant que
les deux constantes prévues pour cela dans `partage` (`TOLERANCE_ATTRAPE_PX`, `TOLERANCE_TRI_PX`)
ne sont **lues par personne**. Changer la constante ne changerait rien. À unifier un jour.

**23 symboles exportés ne sont appelés nulle part**, dont trois recalculs intégraux côté serveur
(`recalculerToutesLesCascades`, `recalculerToutesLesMaitrises`, `recalculerToutesLesProgressions`).
Filet d'exploitation à garder, ou code mort ? À trancher.

---

## Ce qui attend ta décision

Détail et mesures dans **`Docs/questions-en-attente.md`** — section **Q-INT** en fin de fichier.

1. **Les 8 captures visuelles** — les regarder, puis figer ou refuser. C'est ce qui débloque
   `npm run verifier`.
2. **Le seuil de couverture lexicale CE1** (Q-INT-2). 93,0 % des mots lus sont au lexique. Les
   4 absents sont `b` et `d` — *les graphèmes que l'exercice fait justement travailler* —, `gobi`
   et `voit`. Exiger 100 % interdirait D23. Choisir 90 % serait inventer une loi : c'est à toi.
3. **Les 15 fichiers `.pyc` suivis par git.** Ce sont des artefacts de compilation Python. Les
   retirer est une suppression : **je n'ai rien supprimé**, je te le signale.

---

## La prochaine chose à faire — une seule

**Ouvre les 9 exercices marqués PLACEHOLDER et dis lesquels ton fils peut jouer.**

C'est ce qui débloque le plus, et de loin. Tout le reste est vert : la chaîne compile, les 14
moteurs enregistrent, la carte dit la vérité, aucun écran ne coince. Ce qui manque n'est plus du
code — c'est le seul jugement qu'aucun agent n'a le droit de rendre : *est-ce que ce texte-là,
pour cet enfant-là qui confond encore `b` et `d`, est juste ?*

Les six nouveaux sont dans `contenu/exercices/galeries/` (`stalagmites-assemble`,
`passage-chemin`, `frise-chrono`, `echo-conte-histoire`, `echos-paires`, `paroi-libre`), les
trois autres dans `contenu/exercices/clairiere/`. Chacun explique dans son `$commentaire` ce qui a
été mesuré et ce qui a été supposé.
