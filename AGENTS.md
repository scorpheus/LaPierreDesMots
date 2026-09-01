# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

**Langue du projet : français, partout.** Documents, code, noms de variables, messages de commit,
commentaires, rapports d'agents, et réponses à l'utilisateur. Les specs sont en français et le
vocabulaire métier l'est aussi (`Alea`, `Horloge`, `FournisseurVoix`, `tentatives`, `noeuds`) — s'y
tenir évite un dépôt à deux langues. Seules exceptions : les identifiants imposés par un outil
externe.

## État du dépôt : l'application existe et tourne

> **Corrigé par le lot N5** (contrat de finition v3 § 1.1 et § 4.5). Cette section affirmait
> « Il n'y a aucun code », « pas de `package.json`, pas de `src/` », et « ne pas écrire de code ».
> C'était vrai le premier jour ; ça ne l'est plus depuis sept commits. Un document de cadrage qui
> décrit un dépôt vide devant un dépôt plein est pire qu'un document absent : il fait prendre des
> décisions justes pour un projet qui n'existe plus.

**Mesuré, jamais rapporté** — commandes exécutées le 2026-08-02, sorties citées :

```
$ find partage/src -name "*.ts" | wc -l                            → 110
$ find client/src \( -name "*.ts" -o -name "*.tsx" \) | wc -l      →  89
$ find serveur/src -name "*.ts" | wc -l                            →  29
$ find tests \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" \) | wc -l → 82
$ ls serveur/migrations/*.sql | wc -l                              →   6
$ find contenu/exercices -name "*.json" | wc -l                    →   7
$ ls contenu/noeuds/*.json | wc -l                                 →   7
```

**Les 14 moteurs existent tous** (`client/src/moteurs/`), la chaîne de test tourne, les migrations
SQL sont numérotées et appliquées, `demarrer.bat` lance le jeu. **Toutes les commandes `npm run`
listées plus bas existent.** Le travail en cours est la **finition**, décrite lot par lot dans
[contrat-finition-v3.md](Docs/contrat-finition-v3.md) : le ductus, les voix, Gobi décliné, la
séquence d'ouverture, la zone parent, le campement, le décor, le contenu.

**Ces chiffres périment.** Plusieurs campagnes écrivent en parallèle sur ce dépôt ; le contrat de
finition v3 § 11, point 6, en fait une règle qui vaut plus que lui-même : *un lot relance les
commandes ci-dessus avant sa première écriture, et signale tout écart au lieu de recopier ce
document.* Un document gelé décrit un dépôt à un instant ; il ne le fige pas.

Ce qui reste vrai, et qui n'a pas changé : **ce qui n'est pas dans `Docs/` n'a pas été décidé.**
Une valeur, un nom de fichier, un seuil qui n'y figure pas est à proposer, jamais à supposer acquis.
Et les quatre documents de référence ne se modifient pas sans validation (voir plus bas).

## Les documents et leur autorité

| Fichier | Portée |
|---|---|
| [la-pierre-des-mots-specs-v2.md](Docs/la-pierre-des-mots-specs-v2.md) | Document de référence : univers, game design, pédagogie, direction artistique, socle technique, lots L0→L8, critères de recette R11→R18 |
| [annexe-T-strategie-de-test.md](Docs/annexe-T-strategie-de-test.md) | Testabilité, six niveaux T1→T6, boucle de travail de l'agent, définition de « terminé » |
| [annexe-P-production-et-agent.md](Docs/annexe-P-production-et-agent.md) | Chaîne ComfyUI, chaîne voix GPU, Docker, serveur MCP « atelier », orchestration |
| [addendum-animation-et-brief-de-reprise.md](Docs/addendum-animation-et-brief-de-reprise.md) | Animation (§ P.10) + brief de reprise, ordre de démarrage, 5 premières tâches |

**Ordre de préséance — c'est le piège du corpus.** La v2 est la base, mais l'annexe P **révise**
certaines de ses décisions techniques (§ 1) : Piper → **Chatterbox/XTTS-v2** (Piper en repli),
ajout de **Docker Compose**, Ollama passé d'optionnel à activable. L'addendum ajoute l'animation.
Sur un point technique, lire **v2 puis annexe P puis addendum** : le plus récent gagne. Sur un point
de conception ou de pédagogie, la v2 fait foi et l'annexe P ne la révise pas (elle le dit
elle-même : « annexe de production, pas révision de conception »).

## Environnement de travail

Détail mesuré et commandes exactes dans [environnement-et-outillage.md](Docs/environnement-et-outillage.md).
En résumé : **RTX 5090 (32 Go), 100 Go de RAM, Node 24.13, Docker 29.5, Python 3.13, ffmpeg** —
tout ce que les specs demandent est là. **ComfyUI 0.29 tourne déjà** sur `127.0.0.1:8188`.
**llama.cpp** est dans `D:\Projet_perso\llama` (serveur à lancer au besoin sur le port 8001, une
douzaine de modèles GGUF locaux dont Qwen3.6-27B et gemma-4-31B multimodal). **`potrace` est absent**
et sera nécessaire à la vectorisation (annexe P § 3.2).

**Projet solo.** Un seul développeur, un seul écrivain par fichier, pas de coordination d'équipe à
prévoir. Les sous-agents sont autorisés et bienvenus pour paralléliser.

### Les fichiers de travail vont dans `bac-a-sable/`, jamais dans le dossier temporaire du système

**Règle posée par l'utilisateur.** Pages HTML d'essai, scripts d'inspection, captures
intermédiaires, scripts de campagne, sorties brutes : tout s'écrit dans
[bac-a-sable/](bac-a-sable/LISEZ-MOI.md), qui appartient au projet et **ne demande donc aucune
autorisation**. Il est ignoré par git, à l'exception de son `LISEZ-MOI.md`.

Bénéfice au-delà du confort : ce qui est écrit là **reste visible**. Un script d'inspection posé
dans le dossier temporaire du système disparaît de la mémoire collective ; ici, la session suivante
le retrouve — et évite de le réécrire.

Ce qui n'y va **pas** : le code applicatif (`partage/`, `serveur/`, `client/`), les tests
(`tests/`), les décisions et mesures qui font foi (`Docs/`), les assets de production (`contenu/`,
`production/`).

### Économie des images (décision D50)

**Une image ne se regarde que si le jugement demandé est esthétique** ; tout le reste se mesure.
Fond blanc, épaisseur de trait, régions fermées, changement d'asset, cohérence d'un personnage :
saturation HSV, `stroke-width`, remplissage par diffusion, empreinte SHA-256. Quand il faut
regarder : une vignette de 512 px, et un échantillon de 2 ou 3 variantes — jamais la série
entière. **Le jugement esthétique appartient au parent** : une planche de vignettes chez lui coûte
moins qu'une description par agent, et vaut mieux.

### Le dépôt est auto-contenu — règle dure (décision D9)

**On clone, on lance, ça marche.** Rien ne s'installe hors du dossier du projet, jamais :
`node_modules/` local et **jamais `npm install -g`** · venv Python dans `.venv/` à la racine, jamais
de `pip install` global · binaires tiers dans `outils/bin/`, téléchargés par
`outils/installer-outils.mjs` · base dans `donnees/` · lancement par `demarrer.bat`.

Une dépendance installée globalement est une dépendance invisible : elle marche sur la machine où
elle a été posée, et nulle part ailleurs. ComfyUI et llama.cpp font exception — ce sont des
**services** de la machine, pas des dépendances du projet : le dépôt porte les scripts qui les
pilotent et doit se comporter correctement quand ils sont absents.

**Installations : demander avant.** Le socle npm des specs, `potrace` et `faster-whisper` sont
autorisés (décision D4). Toute dépendance hors de cette liste se propose et s'attend.

### Campagnes multi-agents (décision D10)

Contrat gelé sur disque → implantation parallèle à fichiers disjoints → revue → **compilation par
l'orchestrateur uniquement** (jeton unique, aucun agent ne compile ni n'installe). Le plan partagé
s'écrit **une fois** et on donne son chemin ; le recopier dans N briefs, c'est N occasions de le
déformer. Un rapport commandé **se lit avant** l'action qu'il devait informer.

## Discipline de fin de tâche — non optionnelle

L'information qui n'est pas écrite dans le dépôt est perdue au changement de conversation.
Donc, **à la fin de chaque tâche** :

1. **Mettre à jour les documents concernés** dans `Docs/`. Une décision prise, un seuil mesuré, un
   chemin découvert, un arbitrage rendu : ça va dans les docs, pas seulement dans la réponse.
   Corollaire de l'addendum § B.8 : ce qui n'est pas écrit n'a pas été décidé.
2. **Extraire en skill** (`.Codex/skills/`) toute procédure qui a été exécutée une fois et le sera
   à nouveau : lancer llama.cpp, soumettre un workflow ComfyUI, produire un lot de voix, vérifier
   les régions fermées, régénérer les captures de référence. Une procédure refaite de mémoire à
   chaque session est une procédure qui dérive.
3. **Ne jamais modifier les quatre documents de référence sans validation.** Ce sont les documents
   de l'utilisateur. Les compléments s'écrivent dans de **nouveaux** fichiers `Docs/` ; une
   modification des quatre originaux se propose et s'attend.

## Le projet en trois phrases

Application de lecture pour un enfant de 7 ans (CE1), servie en local sur le LAN depuis un PC
Windows, jouée sur une Galaxy Tab S10 FE, **entièrement hors-ligne**. Un monde gris que l'enfant
rallume : chaque mini-jeu réussi recolorie une portion de décor — c'est simultanément la barre de
progression, la récompense et la justification narrative. Six régions, dont l'ordre **est** l'ordre
de la progression phonologique.

## Les axes d'architecture (ce qui se comprend en croisant les documents)

**Moteur × habillage × contenu.** Un mini-jeu = un moteur (la mécanique, dans le code, 12 moteurs)
× un habillage (SVG en calques, palette, timings, sons — **déclaratif, zéro ligne de code**) × un
contenu (JSON validé par JSON Schema, produit par agent). C'est cet axe qui porte la promesse de
variété (R12 : ≥ 3 moteurs par compétence ; R13 : jamais deux fois le même habillage dans une
sortie). Si ajouter un habillage demande du code, la variété ne tiendra pas et la contrainte est
violée.

**« La couleur vient du code, pas du modèle » (annexe P § 2).** ComfyUI ne produit que du trait noir
sur blanc ; l'application applique la couleur depuis les jetons de palette au rendu. Une zone grise
n'est donc pas un filtre sur une image colorée, c'est l'état par défaut d'un SVG dont les
remplissages ne sont pas assignés. Ce seul choix rend la recoloration correcte par construction,
la palette cohérente sur 600 assets, et le coloriage à consigne trivial (les régions coloriables
sont les régions fermées de la vectorisation). **Tout le pipeline image en découle** — d'où la
vérification bloquante des régions fermées : un trait interrompu d'un pixel fait fuiter le
remplissage sur toute l'image.

**Le journal fait foi.** `tentatives` est un journal append-only ; toute progression, tout
indicateur du dashboard, tout état pédagogique **se recalcule depuis lui**. Le test de rejeu
(annexe T § T2) rejoue des journaux de référence et compare : c'est le filet contre les régressions
silencieuses du BKT, du Leitner et du sélecteur.

**Testabilité en L0, pas après (annexe T § 2).** Aléatoire injecté (`Alea`, mulberry32, graine
`ATELIER_GRAINE`), horloge injectée (`Horloge.figer` / `Horloge.avancer` — sans quoi tester le
Leitner à J+35 est impossible), effets externes derrière interfaces (`FournisseurVoix`,
`FournisseurAudio`, `FournisseurLLM`, `DepotContenu`), crochets `window.__test` absents du bundle de
production. Ce sont des contraintes d'architecture ; les rétro-ajouter coûterait une réécriture.

**Rien n'est synthétisé à l'exécution.** Voix et audio sont des artefacts de **build** : rendus en
lot au moment de la validation du contenu, encodés en Opus, servis depuis le cache avec un
manifeste. L'application ne connaît que des fichiers. L'ASR n'est plus dans le jeu — elle revient au
build comme contrôle qualité (transcription inverse des clips synthétisés).

**Deux chemins d'exécution distincts.** `demarrer.bat` en **Node natif** pour jouer au quotidien
(deux secondes) ; **Docker** pour la production d'assets, les tests et la reproductibilité. Docker
ne doit jamais devenir un prérequis pour que l'enfant puisse jouer.

**Reproductibilité par fichiers de verrou.** `production/assets.lock.json` et
`production/voix.lock.json` enregistrent workflow, checkpoint, LoRA, prompt, graine, pas, CFG,
sampler, résolution, résultats de QC et validation parent. Sans eux la bibliothèque devient un
cimetière d'images irrégénérables.

## Règles non négociables

Issues de la v2 § 5.4, de l'annexe P § 6.4 et de l'annexe T § 6. Elles sont opposables : un travail
qui les enfreint n'est pas terminé, il est à refaire.

- **Aucun écran d'échec, jamais.** Pas de vies, pas de défaite, pas de score négatif. Un acquis
  n'est jamais repris. Toute session se termine sur une réussite.
- **L'aide de Gobi ne coûte rien** et n'est jamais présentée comme un échec — elle change seulement
  le nombre d'étoiles. C'est l'enfant qui choisit sa difficulté.
- **Aucune consigne n'existe uniquement à l'écrit.** Tout est audible en un tap, réécoutable sans
  limite, sans coût en étoiles.
- **Le décor s'agite, le texte jamais.** Dès qu'il y a du déchiffrage : fond parchemin, police
  Andika, aucune animation dans le champ de lecture.
- **Aucun `Math.random`, aucun `Date.now`, aucun `new Date()`** hors de `Alea` et `Horloge` — règle
  ESLint à l'appui.
- **Aucune écriture directe dans `contenu/exercices/`, `contenu/habillages/` ou `contenu/audio/`.**
  Tout contenu généré passe par `contenu/brouillons/` puis par la relecture parent. Aucun contenu
  n'atteint l'enfant sans validation humaine.
- **Ne jamais mettre un test en `skip`, ne jamais assouplir une assertion** pour faire passer une
  suite. Un test désactivé est un mensonge dans le rapport.
- **Ne jamais mettre à jour une référence** de test visuel ou de rejeu de sa propre initiative. En
  cas de divergence du rejeu : s'arrêter, expliquer l'écart pédagogique en clair, attendre
  l'arbitrage.
- **Ne jamais introduire d'attente arbitraire** (`waitForTimeout`) : attendre un état, jamais une
  durée.
- Ne pas modifier un workflow ComfyUI, `production/style.txt`, la palette ou le référentiel de
  compétences sans validation explicite.
- Aucun texte français destiné à l'enfant sans vérification de couverture lexicale CE1.
- Ne cloner que des voix de personnes consentantes du foyer.

## Boucle de travail — quand le développement aura commencé

Annexe T § 6, à appliquer telle quelle :

1. Lire la section des specs concernée, puis écrire le test qui décrit le comportement attendu. Le
   lancer, **constater qu'il échoue pour la bonne raison** — un test qui passe avant
   l'implémentation ne teste rien.
2. Le plus petit incrément qui le fait passer.
3. `npm run verifier`, puis lire `tests/rapports/RAPPORT.md` — pas la sortie brute.
4. En cas d'échec : corriger le code, jamais le test, sauf si le test contredit les specs — dans ce
   cas citer le passage et attendre l'arbitrage.
5. Vérifier la **définition de « terminé »** (annexe T § 6, une ligne par type de travail) avant
   d'annoncer la fin. Ne jamais annoncer « terminé » sans avoir exécuté `npm run verifier` dans le
   même tour.

## Commandes — **elles existent toutes**

> Corrigé par N5 : le titre disait « prévues, aucune n'existe encore ». Mesuré sur
> `package.json`, sortie citée : **7 / 7 présentes** sur les sept ci-dessous, et **21 scripts**
> en tout.

Contrat de l'annexe T § 5, honoré :

```
npm run test              # T1 + T2, sans watch
npm run test:contenu      # validation de tout contenu/exercices/**/*.json
npm run test:e2e          # T3, parcours + robustesse (cassecou, singe)
npm run test:visuel       # T4, captures de référence (--maj pour régénérer)
npm run test:qualite      # T5, a11y + perf + budget de bundle
npm run test:rejeu        # rejeu des journaux de référence
npm run verifier          # tout, un seul code de sortie, rapport consolidé
```

Chaque commande écrit un rapport machine dans `tests/rapports/*.json` **et** un résumé lisible dans
`tests/rapports/RAPPORT.md` ; les artefacts d'échec vont dans `tests/rapports/artefacts/`.
`verifier.bat` enchaîne l'ensemble pour le parent, hors ligne de commande. Crochets git via
**lefthook** : `pre-commit` → lint + T1 sur les fichiers touchés ; `pre-push` → `verifier`.

Deux suites de robustesse méritent d'être connues d'avance parce qu'elles traduisent mécaniquement
une règle de conception : `test:e2e:cassecou` (un bot qui répond faux sur 40 nœuds consécutifs —
vérifie R14, aucun écran d'échec) et `test:e2e:singe` (5 000 taps aléatoires — vérifie qu'aucun état
sans issue n'existe, le pire bug possible sur une appli d'enfant).

## Socle technique prévu

Node 24 LTS avec `node:sqlite` intégré · Fastify 5 · SQLite WAL, migrations SQL numérotées ·
React 19 + TypeScript + Vite · Tailwind v4, Motion, Zustand, TanStack Query/Router, dnd-kit ·
**SVG en calques + Canvas 2D, pas de moteur de jeu** · Tone.js pour la musique générative ·
vite-plugin-pwa · Vitest 3 + happy-dom + Testing Library + fast-check + Ajv 2020 · Playwright +
@axe-core/playwright · Stryker restreint à `pedagogie/` et `validation/` · lefthook.

HTTPS par mkcert **recommandé mais optionnel** depuis le retrait du micro : le `.bat` propose les
deux et démarre en HTTP si l'installation du certificat échoue.

Cibles de performance (Galaxy Tab S10 FE) : premier rendu < 1,2 s, transition entre nœuds < 150 ms,
démarrage d'un son < 80 ms, 60 fps pendant la recoloration, bundle initial < 250 Ko gzip.

## Ce qui reste à trancher

Non décidé à ce jour — v2 § 18 et addendum § B.3 :

1. **Le nom du jeu.** « La Pierre des Mots » est un titre de travail ; il devrait venir de l'enfant.
2. **Ollama local ou API Codex** pour les répliques et indices en jeu.
3. **Vingt fiches du dossier PNG/JPG existant** à examiner pour calibrer l'ingestion avant de
   l'industrialiser.
4. **HTTPS ou non** au premier lancement.

## Le principe de dimensionnement

**L1 décide de tout.** Une région complète — La Clairière — jouable de bout en bout, avec sa chaîne
d'assets prouvée, testée sur l'enfant **sans qu'un adulte lui explique quoi que ce soit** (R18),
avant de construire les cinq autres régions. Si L1 n'amuse pas, aucun lot suivant ne le rendra
amusant.
