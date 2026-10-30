---
name: retours
description: Tient à jour le tableau des retours du parent sur les exercices (Docs/tableau-retours.md). À utiliser quand le parent dicte un retour sur un exercice (« E12 : … », « T02 : … », ou le nom d'un exercice).
---

# Le tableau des retours

Fichier qui fait foi : `Docs/tableau-retours.md`. Une ligne par exercice (E01–E76) et par point
transverse (T01…), chacune avec un **statut** et ses **notes datées**. Claude seul l'écrit ; le
parent dicte, souvent en reconnaissance vocale : la phrase est parlée, pas écrite. Lire le fond.

## « Où on en est ? » : résumer

Le panneau latéral `/tableau` (mod du même nom) affiche le tableau en direct. Si le parent
demande quand même un résumé dans la conversation : lire `Docs/tableau-retours.md` et répondre **dans la conversation** :

1. Une ligne de compte : combien de lignes par statut (✅, 🟨, 🔧, ❓, 🟦).
2. **D'abord ce qui attend le parent** : les ❓ (questions de Claude) et les 🟨 (corrigés, à revoir),
   chacun avec son numéro, son titre, son lien « ouvrir » cliquable et la note en une phrase.
3. Puis les 🔧 en cours, avec ce qui reste à faire.
4. Les 🟦 « à tester » sont seulement comptés, et regroupés par région, avec leurs numéros.
   On ne liste pas les 76 lignes.
5. Rappeler en une ligne comment tester : `demarrer.bat`, puis le lien. Le lancement est hors journal.

## Un retour dicté : le ranger, puis agir

Le parent enchaîne : il ouvre un exercice, parle, en ouvre un autre, parle. Les retours peuvent
se mélanger.

1. **Identifier la ligne** : par son numéro (« E12 »), sinon par le titre ou le nœud cités. En
   cas de doute entre deux lignes, demander lequel, en une phrase ; ne pas deviner.
2. **Consigner** le retour sous la ligne, dans la colonne Notes : la date, puis le retour
   reformulé en une phrase claire. Jamais d'effacement d'un retour précédent.
3. **Changer le statut** :
   - quelque chose ne va pas → 🔧 ;
   - « c'est bon », « ça marche » → ✅ ;
   - le parent pose une question ou hésite → ❓, avec la question notée.
4. **Agir** : corriger si la cause est claire. Pour un défaut d'affichage, mesurer d'abord avec la
   garde du socle (`tests/qualite/socle-activite.spec.ts`) ou une sonde (`bac-a-sable/socle/`),
   jamais à l'estime. Une fois corrigé et vérifié, passer en 🟨 et le dire au parent en une ligne,
   avec le lien à rouvrir.
5. **Ne jamais passer une ligne en ✅ sans que le parent l'ait dit.**

## Règles

- Un retour qui touche plusieurs exercices (« partout les images sont trop petites ») est un
  défaut du **socle commun** : le corriger une fois dans `client/src/activite/`, ajouter un point
  transverse (T…) et le relier aux lignes concernées.
- Le contenu (texte, nombre de phrases) d'un exercice ne se modifie pas sans l'accord du parent :
  proposer, noter ❓, attendre.
- Les liens pointent vers `http://localhost:8080/debug/exercice?noeud=<nœud>`. Si un exercice est
  ajouté, ajouter sa ligne avec le numéro suivant.
