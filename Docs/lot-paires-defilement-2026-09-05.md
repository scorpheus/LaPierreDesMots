# Paires : défilement tactile réel — 5 septembre 2026

## Mandat et périmètre

Photo parent : `cite-des-histoires-02`, huit paires illustrées, portrait tablette.
Les dernières cartes dépassent ; le geste vertical sur les grandes cartes ne défile pas.
Ce retour s'ajoute à la file, sans annuler les validations de contenu et d'animation en attente.
Base : `1d5a637`, arbre déjà modifié, aucun écrasement ni publication GitHub/APK.

Mesure avant écriture : 141 sources partage, 149 client, 25 serveur, 272 tests,
11 migrations, 76 exercices et 76 nœuds. Ces chiffres remplacent les comptes anciens d'AGENTS.md.

## Organisation

- Orchestrateur : `MoteurPaires.tsx`, règles de conteneur dans `global.css`, tests de
  défilement au doigt, recette et livraison locale. Seul compilateur et lanceur des suites.
- Sous-agent : audit **en lecture seule** des gestes bloquant le défilement dans les autres
  moteurs. Rapport dans la messagerie, aucune édition, compilation, installation ou campagne.
- Aucun changement de contenu, de réponse attendue, de progression, de profil familial,
  de référence visuelle ou d'asset.

## Validation attendue

Reproduire le rouge avant correctif sur la fiche photographiée ; faire glisser le doigt
depuis une carte (pas `scrollIntoView`, pas une injection de `scrollTop`). Atteindre la
dernière carte et le pied d'aide sans défilement imbriqué, sans appariement ou erreur
déclenchés par le geste. Garder les deux taps, le glisser souris et le glisser tactile
intentionnel. Étendre à toutes les fiches Paires, portrait/paysage et grands caractères.
Images décodées, cadres stabilisés, controles négatifs pour un vrai blocage tactile.

Boucle courte : cas photographié, puis famille ; clôture : `npm run verifier`, rapport lu,
écarts historiques de contenu/références conservés. Reconstruction puis empreinte réseau
du serveur local avant de demander un nouvel essai.

## Référence technique consultée

[Documentation dnd-kit des capteurs tactiles](https://dndkit.com/legacy/api-documentation/sensors/touch/)
et [limitations du capteur Pointer](https://dndkit.com/legacy/api-documentation/sensors/pointer/).
`touch-action:none` sur toute une carte interdit le défilement qui démarre dessus.
La combinaison Mouse/Touch avec activation tactile différée préserve le glisser intentionnel
sans enlever le défilement normal. Aucune dépendance ajoutée.

## Mesure et correction

Le nouveau pilote envoie `Input.dispatchTouchEvent` (départ, mouvement interpolé, fin),
jamais un `scrollTop` ou un `scrollIntoView`. Son contrôle négatif garde la page immobile
sous `touch-action:none` ; son témoin positif défile sous `manipulation`. La première
tentative avec `Input.synthesizeScrollGesture` ne déplaçait même pas ce témoin positif sur
ce Chromium : elle a été écartée comme preuve, avant de corriger l'application.

Avec le pilote prouvé, photo reproduite rouge (déplacement de page nul), puis verte après :

- capteurs Mouse/Touch distincts ; maintien de 250 ms, tolérance 5 px avant annulation par
  un balayage ; `touch-action:manipulation` sur les cartes ;
- annonce de grille longue par `data-plateau-defilant`, partagée avec Chemin : hauteur du
  moteur propagée à ses parents, défilement du document, sans sous-scroll ;
- mesure `clientHeight` stable sur mobile, comme le correctif Chemin précédent.

Première campagne : **41/41 en 37,6 s**, soit les huit fiches Paires dans cinq formats
et le témoin du pilote. Toutes les dernières cartes sont atteintes au doigt puis sélectionnées
au tap ; défiler ne sélectionne ni ne crée une erreur. Aucun texte ni visuel modifié.
Deux tests supplémentaires vérifient le glisser souris et le maintien-glisser tactile.

Campagne finale ciblée : **43/43 en 45 s**, étendue jusqu'au bouton d'aide sous la dernière
rangée ; le balayage depuis la carte sélectionnée conserve ce choix. Pilote réutilisable
dans `tests/e2e/gestes-defilement.ts`, guide QA enrichi, validateur de skill vert.
TypeScript/lint verts, 18 avertissements préexistants.

Serveur reconstruit, lanceur PID 65548, HTML/JS/CSS et portraits vérifiés par empreintes :
`index-D2yc_cvk.js`, SHA-256
`fc25f2731419412ee4aaa52dbeac695f01c3b10d7052fbaf5a9d8721c161fb59`.
Preuves/captures : `bac-a-sable/paires-defilement-2026-09-05/`.
La vérification globale est lancée une seule fois à la clôture ; ne pas présenter la
campagne ciblée comme une validation de tous les autres chantiers.

## Clôture globale et contre-vérifications

`npm run verifier` a fini en **980 s** : qualité responsive **320/320**, contenu structurel
**655/655**, build/budget/rejeu et contrôles QA verts. E2E : **819 réussites, un échec au
chargement, 14 bilans dépendants non exécutés** sur 834 cas ; ces bilans ne sont pas des
réussites. Les 43 nouveaux cas Paires sont verts dans cette campagne aussi.

Rouges conservés : 14 incohérences textuelles déjà dans la file, trois références visuelles,
et `galeries-13` qui n'a pas obtenu `window.__test` avant tout geste. La suite unitaire avait
deux échecs sur 2635 (chronologie mouche/abeille et garde syntaxique R17), plus un timeout
RPC Vitest `onTaskUpdate` ; aucune couverture n'était produite. Ce défaut d'infrastructure
n'est pas à confondre avec une assertion applicative. Rapport complet et JSON bruts archivés
dans le dossier de preuves avant les contre-vérifications.

### Le test d'aide vérifie maintenant la demande, pas une expression régulière

Le sous-agent a confirmé en lecture seule : le test R17 exigeait que `aideDemandee` soit
la dernière clause d'une garde. La nouvelle garde Chemin est correcte mais plus précise ;
son ordre n'est pas un contrat. Aucune garde de production n'a été réordonnée pour le test.

Remplacement de ce seul contrôle par des scénarios exécutables sur **les treize moteurs
avec aide**, inventoriés contre le registre : horloge au seuil d'indice, puis éventuellement
de démonstration, battement, demande réelle, résumé de tentative et erreurs. Le même oracle
rejette l'ancien comportement « demande ignorée » passé comme témoin négatif.

Ce contrôle plus fort a découvert un **vrai défaut Colorie** : son résumé recopiait encore
le palier automatique, contrairement aux douze autres. Deux rouges reproduits sur 32 cas.
Correction du résumé de chaque consigne et du maximum de la tentative vers `aideDemandee`.
Les demandes explicites restent comptées, la lenteur seule ne l'est plus. Le rejeu de
référence est vert sans aucun changement de journal, profil ou paramètres pédagogiques.
TypeScript, lint et les 33 ancrages QA restent verts après ce correctif.

Contre-vérifications après correction : **57/57** pour l'aide et Colorie, puis **2660/2661**
sur toute la suite unitaire/composants/API. Seule la chronologie mouche/abeille reste rouge.
`galeries-13` passe **3/3 répétitions isolées** en 6,5 s ; cela ne transforme pas le premier
échec de démarrage en réussite, ni ses 14 bilans dépendants en cas exécutés.

### Couverture conservée même quand un test est rouge

La relance sans timeout ne produisait toujours aucune couverture. Cause distincte confirmée
dans le Vitest installé : `coverage.reportOnFailure` vaut `false` par défaut. Le rouge de
contenu suffisait à supprimer le rapport. Option passée à `true`, aucun seuil abaissé.
Nouvelle suite complète : **2660/2661**, couverture produite, cinq zones non vides et tous
leurs seuils atteints (preuves `unitaires-couverture.json` et `couverture-zones.json`).
Ce chiffre ne vaut pas validation esthétique, lexicale ou pédagogique des contenus rouges.

### Livraison finale en local

Les **43 gestes Paires repassent en 44,3 s** après le correctif Colorie. Nouvelle construction,
budget **239,5 Ko gzip / 250**, contrôle des ressources servies puis redémarrage : lanceur
23212, serveur 5544. JS `index-DRWzcVGh.js`, empreinte
`327f6a1af1860bdd80297f38bec8e5296486fed64ef80671752a2aeff17e01c6`.
HTML, JS, CSS, quatre portraits et décor des grottes comparés aux fichiers locaux.
Les identifiants de la première livraison plus haut restent historiques. Profils conservés,
aucune publication ni modification des références ; aucun commit contournant les crochets rouges.

## Risques analogues ajoutés à la file, pas déclarés corrigés

Audit du sous-agent en lecture seule : Tri est prioritaire pour une prochaine reproduction
(`volcan-02`/`volcan-10`, 14 éléments, même conflit Pointer/touch-action). Place comporte cinq
jetons à vérifier si la réserve déborde. Pas de généralisation à Trace/Colorie, dont le geste
de dessin a besoin de capturer le doigt, ni à Assemble qui n'affiche que deux ou trois blocs.
Ces constats de code ne sont pas des bugs reproduits ; aucune modification de ces moteurs.
La capture finale montre encore de petites vignettes au sein des grands cartons Paires :
finition artistique/composition à reprendre séparément, pas assimilée à une validation parentale
du dessin par les 43 gestes verts. L'objectif mesuré ici est de pouvoir atteindre chaque carte.
