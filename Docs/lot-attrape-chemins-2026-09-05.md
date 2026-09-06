# Lot : mélange d'Attrape et règles des chemins

Base : `1d5a637c7de334f31a5618ae4bd133d72cb50e51`, arbre déjà modifié, à conserver.
Inventaire mesuré : 140 TS partagés, 149 fichiers client, 25 serveur, 266 tests,
11 migrations, 76 fiches et 76 nœuds. Sept fiches Attrape et sept Chemin.

## Mandat et répartition

Les retours du parent s'ajoutent au compagnon au résultat et aux mots incomplets,
dont la recette navigateur finale et la remise en service restent à faire.

- Agent Attrape : uniquement `client/src/moteurs/attrape/MoteurAttrape.tsx`,
  `tests/composants/MoteurAttrapeMelange.test.tsx` (nouveau),
  `Docs/retour-attrape-melange-2026-09-05.md`. Mélanger les positions avec Alea,
  stabilité pendant la lecture, vérifier les sept fiches et le redémarrage.
  Écrire les tests puis prévenir pour RED avant de corriger.
- Agent audit Chemin : lecture des sept contenus, phonologie, graphe, validation,
  écriture seule de `Docs/audit-chemins-2026-09-05.md`. Repérer tous les mots
  conformes refusés, les réponses contraires à la règle, les routes sans issue.
  Aucun contenu publié modifié. Proposer une correction globale exploitable.
- Orchestrateur : moteur partagé Chemin, présentation commune, tests natifs,
  compilation, exécution de toutes les suites, intégration et serveur local.

Pas d'installation, compilation ou tests par les agents. Pas de commit, publication,
modification des références, génération d'image ou nouvelle dépendance.
Un seul écrivain par fichier ; préserver les changements déjà présents.

## Critères

Ordre de lecture non prédictible dans Attrape, contenu conservé, tap accessible.
Pour Chemin : règle et cible courante distinguées ; changement perceptible sans
texte animé ; aucune ancienne coche présentée comme réponse de la nouvelle règle.
Une réponse correcte ne doit pas être refusée à cause d'un ordre secret.
Vérifier aussi l'aide, la fin de chaque étape et les petits formats avec le vrai
profil de lecture agrandi. Attendre images, polices et géométrie stable.
Le contenu corrigé passe par un brouillon et une validation humaine, conformément
à AGENTS.md ; séparer les corrections de moteur du visa pédagogique de nouvelles fiches.

## Extension après lecture de l'audit

Agent audit Chemin reçoit aussi `partage/src/moteurs/chemin/plateau.ts` et
`tests/unitaires/chemin-plateaux-semantique.test.ts`, tests d'abord puis feu vert RED.
Contrat `preparerPlateauChemin(contenu, indexEtape)` : cases de l'étape et vrais
leurres, voisinages filtrés, `regleCourte` équivalente, `critereReconnu` explicite.
Pas d'invention de réponse à partir d'un texte inconnu : repli conservateur et audit.
Les visites sont locales à l'étape, les acquis restent permanents pour la progression.
Ainsi un ancien mot peut servir de leurre pour une nouvelle lettre, sans coche ambiguë
ni rejet gratuit « déjà franchi ». Le nombre de choix sera remesuré après ce changement.
La Cité (phrases appelées images et chronologie non étayée) reste à arbitrer séparément.
