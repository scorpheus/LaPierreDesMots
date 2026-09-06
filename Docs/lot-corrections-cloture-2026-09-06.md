# Corrections avant sauvegarde — 6 septembre 2026

## Mandat

« Maintenant corrige et puis sauvegarde tout et commit tout. » Le parent autorise les
corrections déjà proposées avant la sauvegarde, sans dérogation aux crochets Git. Pas de
publication, de nouvelle histoire, de nouvel atlas ni de remplacement de référence visuelle.
Base `1d5a637`. Les travaux des lots précédents sont conservés avec leurs sources et rapports.

## Textes : 24 incohérences corrigées dans huit fiches

Le contrôle initial reproduit les 14 écarts de la campagne précédente. Une relecture séparée
retrouve les critères des paniers, eux aussi affichés mais oubliés du garde. Un témoin rouge
est ajouté ; le garde renforcé trouve dix occurrences supplémentaires dans quatre tris.

- Lucioles de la Clairière : six consignes « Retrouve le mot que tu viens de lire. », sans
  révéler le mot pendant le choix. Aucun mot cible, choix ou temps d'exposition modifié.
- Grenouilles et poissons des Marais : quatre consignes remplacent « le son de gant » par
  « le même son que dans « gant » ». Même compétence nasale, mêmes réponses.
- Les quatre tris des Marais et du Volcan : dix critères reprennent le mot-repère explicite,
  y compris « pas le même son que dans « fille » ». Aucun panier ni classement modifié.
- Ponts de la Cité : trois consignes nomment les **phrases**, pas des images absentes.
  Les trois mots-clés associés deviennent `phrase`. Les douze récits ne sont pas réécrits :
  `proposition-chemin-cite-2026-09-05.md` reste à valider séparément.
- Fresque du Volcan : « Une abeille se pose sur son nez. », conforme au récit et à l'image
  déjà approuvés. Aucune nouvelle génération.

Les versions intermédiaires sont déposées dans
`contenu/brouillons/corrections-cloture-2026-09-06/` puis contrôlées avant promotion.
Comparaison mécanique : 27 substitutions de chaînes seulement, dont les trois mots-clés ;
aucune structure, réponse, compétence, image, position ou liaison modifiée. Le correctif final
dans Git est la source de vérité ; les brouillons restent locaux.

Couverture lexicale vérifiée : les seuls mots de ces substitutions absents de la petite
liste locale sont `Retrouve`, `viens`, `se`, `pose`. Ce sont les limites déjà documentées de
ce lexique, pas une certification du niveau CE1 ni quatre difficultés établies. Aucun ajout
au lexique ou changement de seuil. « se pose » appartenait déjà au texte et au récit approuvé.
Commande locale de comparaison : `bac-a-sable/cloture-git-2026-09-06/preparer-textes.mjs`
(préparateur avant promotion, pas un outil à relancer pour restaurer un ancien état).

## Étoiles et appui tactile

Le test Cassecou attendait une seule étoile après 40 erreurs sans appel volontaire. Le retour
parent R15 de `retours-de-jeu.md` distingue pourtant l'aide proposée et demandée ; le lot
précédent avait déjà aligné Colorie sur les douze autres moteurs. Attention : ce R15 est
l'identifiant du retour parent, pas le R15 « consigne audible » des specs.

La recette joue désormais **les deux cas**, avec les 40 erreurs dans chacun :

- automatique seulement : deux étoiles pour la tentative ;
- demande volontaire après le palier automatique : une étoile pour la tentative.

Dans les deux cas, la troisième étoile n'est pas accordée, les trois étoiles déjà acquises
restent intactes, l'aide se propose au deuxième essai et la sortie se termine en réussite.
La demande volontaire est un vrai tap, après vérification de l'état `aideDemandee` initial.
Aucun barème, calcul pédagogique ou journal de référence n'est changé dans cette clôture.

Cette nouvelle entrée native révèle un défaut réel : le bouton de 64 px passe à 61 px pendant
l'appui avec `scale(0.96)`. Rouge rendu reproductible par appui maintenu : matrice mesurée
`(0.96, 0, 0, 0.96, 0, 2.88)`. La règle commune conserve l'enfoncement de 3 px et son ombre,
mais plus la réduction. Le test contrôle la transformation stabilisée et les deux dimensions
>= 64 px, puis la vraie demande tactile. Aucun contournement de la sentinelle.

## Contre-vérifications ciblées

- `qa:coherence` : 76 fiches, zéro écart après correction (14 puis 24 rouges avant).
- Quatre suites unitaires ciblées : 60/60, dont le témoin des critères et les quinze
  triplets approuvés ; assertions de sujets et ordre inchangées.
- Cassecou : 3/3 en 7,4 s après le rouge tactile reproductible.
- `qa:trompeurs` : zéro bloquant, 93 avertissements pour le plafond inchangé de 93.
- Lint ciblé vert.

Voix : `npm run voix` sans `--tout` ni `--sans-qc` rend 25 nouveaux clips et en réutilise
648. Zéro refus, 673 clips au manifeste, 368/368 consignes couvertes. Les nouvelles phrases
sont transcrites par faster-whisper large-v3 CPU/int8 ; les deux mots courts nouveaux restent
contrôlés par durée/structure selon le protocole vocal existant, pas certifiés par ASR.

Le prévol identifie exactement 23 anciens Opus devenus orphelins (203 531 octets). L'outil
d'archivage refusait de réutiliser une archive déjà créée : ajout d'un nom de lot facultatif,
sans autoriser l'écrasement ni les chemins. Deux témoins rouges puis 11/11 tests verts.
Commande employée après lecture des 23 noms et vérification des chemins par l'outil :

```powershell
node scripts/verifier-ressources-locales.mjs --archiver-orphelins --lot-archive 2026-09-06-cloture
```

Les fichiers restent récupérables dans `bac-a-sable/archives-audio-2026-09-06-cloture/`, avec
manifeste, SHA-256 et chemins de restauration ; l'archive du 5 septembre est conservée.
Prévol après déplacement : six polices, 673 clips et 673 fichiers Opus, aucune divergence.

La campagne complète est consignée à son achèvement dans
`cloture-git-2026-09-06.md`. Les visas esthétiques, le lexique complet CE1, les animations
canoniques non approuvées et la refonte narrative de la Cité ne sont pas déclarés terminés.

## Vérification générale et captures conservées

`npm run verifier` exécuté en 823,5 s et rapport lu : 2675/2675 T1/T2, 655/655 contenu,
869/869 E2E (aucun non-exécuté ni instable), 320/320 qualité/responsive, types/lint,
constructions, ressources, rejeu et budget verts. Aucun seuil ni référence modifié.
La chaîne garde **un étage rouge** : 10/13 comparaisons visuelles, trois écarts Colorie.

Les diffs ont été reproduits dans un dossier séparé, car les invocations suivantes de
Playwright réutilisent sinon le répertoire commun d'artefacts. Commande sans mise à jour :

```powershell
node scripts/playwright.mjs test tests/visuel/noeud-colorie.spec.ts tests/visuel/decor-v2.spec.ts --project=visuel --workers=1 --output=bac-a-sable/cloture-git-2026-09-06/captures-a-valider
```

Deux cas passent, les trois différences sont reproduites en 13,9 s. La planche
`bac-a-sable/cloture-git-2026-09-06/comparaison-visuelle.html` rapproche références et rendus.
Le premier cadre, par exemple, passe de 1344×730 à 1888×658 pixels CSS ; cela suffit à
expliquer un rejet de comparaison sans conclure que la nouvelle composition est approuvée.
Les contraintes géométriques et tactiles sont testées séparément. La conservation automatique
des artefacts **par étage** reste une amélioration à faire dans le lanceur QA ; ici les preuves
sont protégées par `--output` dans le bac à sable, pas par un changement silencieux de référence.
