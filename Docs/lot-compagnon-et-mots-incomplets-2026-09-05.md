# Lot : compagnon au résultat et mots à compléter

Retours parent du 5 septembre : le compagnon choisi disparaît au résultat ; l'exercice
« bateau » affiche `bat_au` avec les choix `o / au / eau / ot` et demande de tracer alors
qu'il se joue en touchant une proposition. Ces deux retours s'ajoutent à la file existante.
Livraison locale uniquement ; aucune publication GitHub ou APK.

Base : `1d5a637c7de334f31a5618ae4bd133d72cb50e51`, avec changements locaux antérieurs à
préserver. Inventaire remesuré : 140 TS partage, 149 TS/TSX client, 25 TS serveur,
264 fichiers de tests, 11 migrations, 76 exercices et 76 nœuds.

## Répartition

- Principal : mécanique et présentation communes `grave`, tests de reconstruction des mots,
  vérification des autres fiches utilisant ce moteur, suites npm, builds, serveur et bilan.
- Agent compagnon : seulement `client/src/ecrans/EcranRecompense.tsx`,
  `tests/composants/EcranRecompense.test.tsx` et
  `Docs/retour-compagnon-resultat-2026-09-05.md`.

Extension après contrôle tactile : le composeur peut répondre 409 et la carte démarre alors
un exercice isolé en effaçant le choix. L'agent reprend aussi `EcranCarte.tsx` et son test.
Le repli conserve le compagnon dans un plan de session local d'une seule étape réelle ;
il ne prétend pas avoir composé une sortie pédagogique et n'archive aucun faux plan serveur.
Le rôle, l'habillage et les compétences proviennent du paquet réellement chargé, l'heure de
l'Horloge injectée. Test rouge avant correction. Pas de changement des règles du sélecteur.

L'agent lit AGENTS, ce contrat et les composants de compagnon existants. Il écrit d'abord
la régression puis attend le rouge exécuté par le principal avant de corriger. Il ne lance
aucune suite npm, compilation, installation, génération d'images, commit ou serveur. Aucun
autre fichier commun ni atlas d'animation non validé ne doit être modifié/promu.

## Critères

Le résultat salue avec le compagnon réellement choisi (les quatre compagnons, et Gobi
si aucun n'est choisi), en utilisant les représentations déjà intégrées. Une récompense
qui concerne explicitement la croissance de Gobi reste distincte et correctement nommée.
La correction doit également fonctionner lors d'une reprise de sortie et au dernier exercice.

Le mot incomplet masque tout le groupe de lettres attendu, pas seulement sa première lettre.
Après insertion, il se reconstruit exactement, sans duplication. La règle visible correspond
au geste réellement demandé ; le modèle éventuel est présenté comme un modèle et non comme
une réponse prétendument cachée. Les mots, compétences et journaux de progression existants
sont conservés. Vérifier toutes les fiches `grave`, pas seulement « bateau ».

Tests ciblés rouge puis vert, gestes réels sur le navigateur, images et polices chargées,
tablette portrait et petit paysage. Exécuter `npm run verifier` avant clôture en distinguant
les régressions du lot des portes déjà rouges documentées dans la file courante. Ne pas
assouplir une assertion, un rejeu ou une référence visuelle pour obtenir du vert.
