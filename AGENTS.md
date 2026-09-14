# La Pierre des Mots — consignes communes

Projet de lecture CE1 en français : code, commentaires, documents, commits et échanges.
Conserver les termes métier existants. Exceptions : identifiants imposés par les outils.

## Démarrer au bon endroit

- Pour la réhabilitation, lire la section du lot concerné dans
  [le plan actif](Docs/plan-rehabilitation-site.md). Pour « où en sommes-nous », lire
  [l'état courant](Docs/etat-courant-et-file.md), seule file de travail.
- Une correction au fichier connu commence par ce fichier et son contrat. Ne pas recharger
  une référence ou un skill déjà présent au contexte. Les archives sont historiques.
- Charger un skill quand sa procédure est nécessaire ; un renvoi n'impose pas sa lecture.
  Les skills actifs du projet sont dans `.agents/skills/`.
- Git et fichiers concernés d'abord ; préserver changements préexistants, assets et données.
  Travaux temporaires dans `bac-a-sable/`, jamais dans le temporaire système.

## Travail et délégation

- Conserver la file cumulative du parent. Un ajout ne remplace pas une demande inachevée.
  Avancer sur les choix réversibles ; demander seulement l'arbitrage réellement manquant.
- Le plan partagé porte résultat, fichiers, exclusions et preuve de sortie. Un écrivain par
  fichier ; aucun agent ne reprend un autre lot sans coordination. Lire les rapports demandés.
- Répartition modèle/effort proposée dans le plan, section 7. Briefs neufs et courts, sans
  copie intégrale de la conversation. Déléguer seulement une tâche indépendante utile,
  pas une commande isolée ni un second audit du même sujet.
- Une seule compilation/campagne à la fois. L'orchestrateur détient le jeton ; il peut le
  transférer explicitement à un exécutant nommé, puis attend sa restitution. Aucun banc de
  mutation pendant des écritures concurrentes. Pas de nouvelle campagne sans motif précis.
- Une règle commune ici ; procédure dans son skill ; décision et preuve dans le document
  propriétaire. Mettre à jour l'existant, pas un journal ou un nouveau skill après chaque outil.
  Une procédure réellement réutilisable rejoint le skill pertinent.
- Clôture : résultat, validation, limites et demandes restantes. Message de commit court :
  `Portee: phrase décrivant le changement`. Aucun commit/push implicite dans une simple analyse.

## Contrats à préserver

- Le journal `tentatives` fait foi. Préserver acquis et récompenses légitimes, sans crédit
  artificiel ni écriture sur une sauvegarde familiale pour faire passer un contrôle.
- Conserver la séparation moteur × habillage × contenu ; un habillage reste déclaratif.
  Aléatoire et temps par `Alea`/`Horloge`, effets externes derrière leurs interfaces.
  Pas de `Math.random`, `Date.now` ou `new Date()` hors de ces abstractions.
- Aucune synthèse de voix à l'exécution : audio préproduit, référencé et servi en fichier.
  Les crochets `window.__test` restent absents de la production. Verrous assets/voix conservés.
- Aucun écran d'échec, vie ou score négatif. Un acquis n'est jamais repris ; chaque session
  finit sur une réussite. L'aide de Gobi est gratuite, sans jugement d'échec ; elle ne change
  que les étoiles. L'enfant choisit sa difficulté.
- Consigne audible en un tap, réécoute illimitée et gratuite. Déchiffrage sur parchemin,
  Andika, sans animation dans le champ de lecture. Tout nouveau texte enfant passe le
  contrôle lexical CE1. Les voix clonées appartiennent à des personnes consentantes du foyer.
- Contenu généré dans `contenu/brouillons/`, puis validation parent avant publication dans
  `contenu/exercices/`, `contenu/habillages/` ou `contenu/audio/`.
- Workflow ComfyUI, `production/style.txt`, palette et référentiel de compétences ne changent
  pas sans validation explicite. Le visa esthétique appartient au parent : présenter un
  échantillon court et cohérent ; mesurer les propriétés techniques plutôt que décrire les pixels.
- Dépendances dans le dépôt : npm local, `.venv/`, `outils/bin/`, données dans `donnees/`.
  Jamais d'installation globale. Socle npm des specs, potrace et faster-whisper autorisés ;
  les autres installations sont à proposer. ComfyUI et llama.cpp sont des services externes
  tolérés, avec comportement correct lorsqu'ils sont absents. Docker n'est pas requis pour jouer.

## Vérifier ce qui a changé

- Défaut fonctionnel : cas discriminant rouge pour la bonne raison, correction minimale,
  famille concernée, puis `npm run verifier` à la clôture du lot intégré selon l'annexe T.
  Lire le rapport final avec sa date et son code de sortie. Ne pas certifier le jeu par une
  suite partielle ni répéter une campagne verte sans modification ou doute pertinent.
- Commandes ciblées existantes : `test:progression`, `test:tactile -- --grep <cas>`,
  `test:responsive -- --grep <cas>`. Choisir selon le risque ; commandes exactes dans package.json.
- Vérifier effet attendu et effets parasites : acquis exacts, delta des récompenses,
  persistance et reprise depuis la carte avec le même profil ; pour le rendu, asset effectif,
  cadrage, occlusion et gestes. Un bouton visible, HTTP 200 ou attribut DOM ne suffit pas.
- Ne jamais désactiver un test, assouplir une assertion ou introduire `waitForTimeout` pour
  verdir. Attendre un état. Un test contraire aux specs se signale avec le passage concerné.
- Références visuelles et de rejeu protégées : aucune mise à jour automatique. Divergence du
  rejeu : expliquer l'écart pédagogique et attendre l'arbitrage. Aucun crochet contourné.
- Séparer preuve mécanique, composition, compréhension de la consigne et reconnaissance de
  l'image. L'oracle connaissant la réponse ne juge pas sa clarté. Les agents détectent les
  défauts ordinaires ; l'inventaire manuel du parent n'est pas un préalable.
- Documentation/consignes seules : relecture, liens, encodage et conservation des règles.
  Aucun build ou parcours navigateur ne constitue une validation utile de cette prose.

## Références et préséance

Les quatre originaux ne se modifient pas sans validation :
[specs v2](Docs/la-pierre-des-mots-specs-v2.md),
[annexe T](Docs/annexe-T-strategie-de-test.md),
[annexe P](Docs/annexe-P-production-et-agent.md),
[addendum](Docs/addendum-animation-et-brief-de-reprise.md).
En technique, P révise la v2 et l'addendum complète P ; en pédagogie, la v2 fait foi sauf
arbitrage parent documenté. Lire les sections pertinentes, pas les quatre livres à chaque tâche.
Les décisions, paramètres et mesures qui font foi sont dans `Docs/` ; ne pas inventer un seuil
pédagogique. Une tranche complète et convaincante précède la généralisation.
La publication GitHub Pages nécessite le livrable préparé puis l'accord explicite du parent.

Les anciennes consignes complètes sont conservées à l'identique dans
[leur archive](Docs/archives/consignes-avant-rehabilitation-2026-09-14.md) ; ne les charger
que pour une question historique, pas comme seconde procédure de démarrage.
