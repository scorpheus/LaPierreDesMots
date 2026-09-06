# Sauvegarde Git des lots locaux — 6 septembre 2026

## Résultat courant

**Intégration sauvegardée : `2970567` — `Jeu: finaliser les corrections tablette et renforcer la QA`.**
180 fichiers, 12 202 insertions et 1695 suppressions textuelles ; les quatre anciens décors
sont reconnus comme déplacements identiques, pas comme destructions. Lint, 2675 T1/T2 et
détecteur de tests trompeurs ont passé le crochet normal. Aucun `LEFTHOOK=0`, aucun push.
Les deux documents de suivi sont finalisés dans le commit de documentation suivant.

Les corrections autorisées, rouges reproduits, voix et limites sont détaillés dans
`lot-corrections-cloture-2026-09-06.md`. Le guide QA a reçu les trois pièges réutilisables
(appui qui rétrécit, critères de panier oubliés, répertoire des captures nettoyé) ; validation
du skill réussie. Les autres brouillons, photos et données de profils restent locaux.

### Dernière vérification complète

`npm run verifier` : **823,5 s**, rapport du 6 septembre à 11:12:04 UTC lu intégralement.
Copie conservée : `bac-a-sable/cloture-git-2026-09-06/RAPPORT-apres-corrections.md`.

| Porte | Résultat |
|---|---|
| Cohérence des 76 fiches | Zéro incohérence signalée après les 24 corrections |
| Unitaires, composants, API | 2675/2675 |
| Structure du contenu | 655/655 |
| Parcours et robustesse | 869/869, zéro sauté, zéro instable |
| Qualité et responsive | 320/320, zéro sauté, zéro instable |
| Captures de référence | **10/13**, trois différences Colorie, références inchangées |
| Types, lint, builds, ressources, budget, rejeu, méta-gardes | Verts ; cinq zones de couverture au-dessus des seuils |

Le résultat global reste rouge sur **un seul étage**, le visuel. Il ne faut pas le rebaptiser
« tout validé ». Les trois différences ont été reproduites sans mise à jour dans un dossier
dédié : `bac-a-sable/cloture-git-2026-09-06/captures-a-valider/`. La planche voisine
`comparaison-visuelle.html` affiche références et rendus. Les 18 avertissements ESLint et
les 93 avertissements historiques du détecteur restent connus, aucun seuil augmenté.

### Serveur local et file restante

Serveur reconstruit puis relancé : **http://192.168.1.19:8080/**. Huit fiches corrigées sont
identiques entre l'API et le disque. HTML, JS, CSS, quatre portraits et décor des Galeries
comparés par SHA-256 ; aucun profil remis à zéro. Lanceur PID 27840, serveur PID 62544 à la
vérification. CSS `style-D8Xe68Pb.css`, SHA-256
`d2e8892a1ff8041f1cb2cc4ebc9e697064b95f679aa7458650e563bcb4deccfd`.

Restent volontairement distincts de cette sauvegarde : validation des trois captures,
des nouveaux atlas de compagnons et des douze textes de la Cité, lexique CE1 complet et
seuil associé, essais parent sur appareil réel, prochaine recette/publication PWA/APK.
Avant celle-ci : exclure les 11,7 Mo de décors archivés du paquet et améliorer la conservation
automatique des artefacts QA par étage. Ces deux améliorations ne sont pas annoncées faites.
Leurs preuves actuelles et les propositions sont conservées, pas effacées par le dernier retour.

## Mandat et point de départ

### Suite autorisée : corriger avant de commiter

Nouvelle demande explicite du parent : « Maintenant corrige et puis sauvegarde tout et commit
tout. » Elle remplace la demande de dérogation ci-dessous : aucun contournement du crochet.
Le lot applique les corrections textuelles déjà proposées dans l'audit pédagogique (sans
changer réponses, compétences ou images), nomme les phrases du chemin de la Cité comme telles,
et rapproche Cassecou de la distinction aide automatique/demandée déjà documentée dans
`retours-de-jeu.md` R15 et testée par les treize moteurs. Les trois nouvelles histoires de la
Cité restent une proposition distincte, pas une validation implicite. Les références de
captures restent gelées ; leurs divergences seront rapportées, pas écrasées.

La revue déléguée est en lecture seule : cohérence des reformulations, procédure vocale
existante et couverture lexicale. L'orchestrateur reste seul écrivain, lanceur et intégrateur.

Le parent demande de documenter et commiter les travaux accumulés. Ce mandat ne demande
ni publication GitHub, ni nouvelle APK, ni validation implicite des contenus en attente.
Base : `1d5a637` ; index initial vide, arbre de travail modifié par plusieurs lots antérieurs.
Inventaire avant écriture : 141 sources partage, 150 client, 25 serveur, 274 fichiers de
tests, 11 migrations, 76 fiches d'exercice et 76 nœuds.

## Organisation

L'orchestrateur est seul écrivain et lanceur de tests/compilations/commits. Une revue
indépendante éventuelle reste en lecture seule : regroupement des changements, imports
et fichiers oubliés, protection des données locales. Aucun agent ne modifie les sources.

Regroupement de revue, en respectant les dépendances entre moteurs et CSS commun :

1. Coloriages : dessins et archives, consignes, masques, provenance et voix.
2. Livraison et QA : ressources autonomes, recettes, inventaires, aides de test et guides.
3. Jeu : interactions, composition tablette, compagnons, moteurs et régressions associées.
4. Suivi : état exact des commits et anomalies restantes.

Après correction, ces lots sont intégrés dans **un commit atomique** : nouveaux décors,
masques, styles communs et moteurs doivent voyager ensemble. Les dossiers de revue sont
conservés pour la traçabilité ; ils ne justifient pas quatre états intermédiaires incomplets.
Le crochet normal relance lint, T1/T2 et le détecteur de tests trompeurs sur l'ensemble.

Les photos `.codex-remote-attachments/`, profils, bases, brouillons non approuvés, builds,
rapports bruts et fichiers de travail ne sont pas embarqués. Les photos restent sur disque.
Les anciennes images déjà déplacées doivent être reconnues comme archives identiques,
pas comme suppressions sans sauvegarde. Aucun test ni référence n'est affaibli pour commiter.

## Revue de l'inventaire

Les quatre PNG archivés ont le même identifiant de blob Git que les anciens fichiers à la
base `1d5a637`, et leurs SHA-256 correspondent au manifeste des archives. Ils restent récupérables.
Les cinq SVG sources nommés dans le registre sont inclus explicitement malgré l'ignore des
brouillons. Trois de ces SVG emploient un PNG relatif : ces trois sources sont aussi incluses,
sans modifier leur contenu. Leurs blobs sont identiques aux PNG promus, donc Git les déduplique.
Les autres brouillons (dont les quatre atlas de compagnons non approuvés) restent hors Git.

Revue indépendante en lecture seule : aucun import absent ni dépendance npm ajoutée relevés
dans le périmètre des outils ; les assertions remplacées ont leurs justifications dans les
rapports des lots. Les aides de test, scripts et tests associés sont conservés. Cela ne remplace
pas les résultats exécutés de la recette.

Dette de livraison relevée : le glob autonome `contenu/assets/**/*.png` embarque aussi les
quatre anciens PNG archivés, soit 11 718 757 octets. Leur exclusion du paquet est à faire avant
une prochaine livraison PWA/APK ; cette sauvegarde Git ne modifie pas le conditionnement.

## Vérification et limites

`npm run verifier` exécuté entièrement en **867,2 s**, puis `tests/rapports/RAPPORT.md` lu.
Copie historique : `bac-a-sable/cloture-git-2026-09-06/RAPPORT-complet.md`.
Les contrôles existants restent actifs ; un commit ne constitue pas un visa de recette.

- 2660/2661 T1/T2 ; seule vignette du Volcan en échec. Les cinq seuils de couverture passent.
- 655/655 contrôles structurels de contenu ; 14 incohérences pédagogiques toujours signalées.
- 853 parcours passés, un échec Cassecou (étoiles), 14 bilans dépendants **non exécutés**.
  Ne pas convertir le total affiché 868 en « 867 réussites ».
- 320/320 qualité/responsive ; aucun défaut de chargement rencontré cette fois, ce qui
  n'efface pas l'intermittence observée dans les campagnes antérieures.
- 10/13 captures conformes ; les trois références Colorie restent inchangées.
- Lint, TypeScript, constructions, ressources, ancrages, rejeu et méta-contrôles verts.
  Bundle : 11/11. Aucun changement de sources applicatives pendant cette campagne.

Les anomalies à traiter et les propositions en attente restent dans `etat-courant-et-file.md`.

### Tentative normale, sans dérogation

Le commit `Coloriages: conserver les scènes locales et leurs sources` a réellement été tenté
avec les crochets actifs : refus après 107,2 s, HEAD inchangé. Lint vert (18 avertissements
anciens), T1/T2 : 2660/2661, seul échec sur la vignette du Volcan (« mouche » / « abeille »).
Le détecteur QA signale aussi 94 avertissements pour le plafond inchangé de 93.

Le nouvel avertissement est un faux positif reproduit isolément :
`expect(cible).toHaveAttribute('data-aide-cible', 'oui')` est pris pour une auto-comparaison,
car le mot `cible` apparaît dans une chaîne littérale. Revue croisée concordante, preuve rouge
dans `bac-a-sable/cloture-git-2026-09-06/sonder-tautologie.mjs`. Aucun seuil n'a été augmenté,
aucune assertion supprimée. Le correctif doit distinguer texte littéral et référence de variable,
avec témoins conservant les vraies auto-comparaisons.

À ce stade historique, une autorisation explicite de sauvegarde malgré le rouge avait été
demandée. Le parent a ensuite demandé de corriger : cette dérogation n'a pas été utilisée.

### Faux positif du contrôleur corrigé après la campagne

Onze témoins sont ajoutés à `tests-trompeurs-masquage.test.ts`, en chargeant l'analyseur réel
sans lancer son CLI. Quatre faux positifs rouges (attribut, chaîne, regex, commentaire), puis
**18/18 tests verts** après masquage lexical de l'attendu. Les auto-comparaisons réelles,
bornes vides et références interpolées restent détectées. L'attendu interpolé conserve par
prudence l'ancien traitement : ce correctif ne prétend pas analyser tout JavaScript.

`qa:trompeurs` repasse à **93 avertissements / plafond 93**, zéro bloquant ; seuil inchangé,
assertion du parcours inchangée, lint ciblé vert. Le bilan complet précédent reste distinct
de cette contre-vérification. Preuves : `detecteur-rouge.json`, `detecteur-vert.json` et
`trompeurs-avant.json` dans le dossier de travail du lot.

À la fin de cette première tentative, le Volcan bloquait encore le contrôle Git, les lots
étaient inventoriés dans `lots.json` et le premier était dans l'index. Cet état historique
est **remplacé par les corrections autorisées et le commit `2970567` ci-dessus**. Aucun
push ni publication n'a été effectué dans cette clôture.
