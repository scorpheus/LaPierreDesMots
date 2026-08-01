# La Pierre des Mots — Addendum animation + brief de reprise

**À joindre en premier** dans la nouvelle conversation Claude Desktop, avec les trois documents de référence.

---

# PARTIE A — Animation (§ P.10, complète l'annexe P)

## A.1 La ligne de partage

ComfyUI sait produire de l'animation. Ça ne veut pas dire qu'elle a sa place partout, et sur ce projet la frontière est nette.

| Reste en code (SVG + Motion + CSS) | Produit par ComfyUI |
|---|---|
| Toutes les micro-interactions : appui, dépôt, aimantation, secousse d'erreur | Cinématiques de fin de région |
| **La recoloration** — c'est le mécanisme central, il doit rester vectoriel et piloté par les jetons de palette | Cycles d'animation des compagnons |
| Avatar de l'enfant et ses réactions (calques paramétriques combinables) | Boucles d'ambiance de décor, en référence ou en séquence vectorisée |
| Interface, transitions d'écran, étoiles, particules | Références de mouvement pour animer à la main |

**Règle dure : aucune vidéo dans la boucle courte.** Les 30 à 90 secondes d'un mini-jeu ne contiennent que du vectoriel. Une vidéo qui se lance, c'est du décodage, de la mémoire, une chute de framerate, et une recoloration qui ne peut plus s'appliquer par-dessus. La vidéo est une récompense rare, pas un matériau courant.

## A.2 Les trois usages retenus

### Cinématiques de fin de région — 6 au total

10 à 15 secondes, plein écran, une par Éclat obtenu. C'est le seul moment du jeu où l'enfant regarde sans agir, et il l'aura mérité par plusieurs semaines de travail. Ça justifie d'y mettre le paquet.

Format WebM VP9, 1280×720, ≤ 2,5 Mo, préchargée pendant le dernier nœud de la région, systématiquement passable au tap.

### Cycles d'animation des compagnons

Cinq personnages × cinq états (repos, joie, aide, hésitation, apparition) × 8 à 12 images. Générés en séquence, **vectorisés image par image**, joués comme une séquence SVG.

Pourquoi vectoriser plutôt que garder des PNG : les compagnons apparaissent par-dessus des décors en cours de recoloration, à des échelles variables, et doivent rester nets sur un écran à DPR 2. Une séquence de 10 SVG légers pèse moins qu'une planche de sprites en 2048².

### Boucles d'ambiance

Eau qui coule, feuillage, lucioles, fumée. Deux voies au choix selon le rendu obtenu : soit générées puis converties en boucle vectorielle, soit — souvent plus simple et plus léger — animées directement en CSS à partir des calques SVG existants. À arbitrer asset par asset, la génération n'étant pas toujours le chemin le plus court.

## A.3 L'instabilité comme parti pris

Un modèle de diffusion ne tient pas parfaitement un trait d'une image à l'autre : les contours frémissent. C'est le défaut annoncé de la génération d'animation.

Sur ce projet, **on l'assume comme style**. Le trait qui bouillonne légèrement est une signature de l'animation traditionnelle dessinée à la main — c'est exactement ce qu'on voit dans les dessins animés que l'enfant regarde. À deux conditions :

- **8 à 12 images par seconde, jamais 24.** À basse fréquence, le frémissement se lit comme du dessin ; à haute fréquence, comme un bug.
- **La silhouette doit rester stable.** Le trait peut vibrer, la forme non. C'est le critère de rejet en QC.

Ce parti pris a un bénéfice direct : il divise par deux ou trois le nombre d'images à générer et à vectoriser.

## A.4 Contrôle qualité de l'animation

En plus des passes de l'annexe P § 3.5, appliquées à chaque image :

| Critère | Seuil |
|---|---|
| Bouclage | Dernière image raccord avec la première, écart visuel < 3 % |
| Stabilité de silhouette | Aire de la forme principale : variation < 8 % entre images consécutives |
| Dérive de position | Le centre de masse ne dérive pas hors d'une tolérance de 5 % sur un cycle de repos |
| Régions fermées | Vérifiées sur **chaque** image, pas seulement la première |
| Poids d'un cycle | ≤ 200 Ko pour 12 images vectorisées |
| Cinématique | ≤ 2,5 Mo, passable au tap, aucun texte à l'écran |

Workflows dédiés, versionnés comme les autres : `cinematique.api.json`, `cycle-perso.api.json`. Cohérence assurée par une image de départ figée et un guidage de pose ; la graine et le prompt sont les seuls champs modifiables par l'agent.

## A.5 Volumétrie ajoutée

| Poste | Volume | Temps GPU estimé |
|---|---|---|
| 6 cinématiques | 6 × ~150 images | 3 à 6 h, régénérations comprises |
| 25 cycles de compagnons | ~250 images à vectoriser | 2 à 3 h |
| Boucles d'ambiance | ~15 boucles | 1 à 2 h |

Ces postes vont dans les lots **L5** (cinématiques, en même temps que les régions 2 et 3) et **L4** (cycles, avec la production de masse des habillages). Aucun n'est nécessaire à L1 : un compagnon peut très bien démarrer avec trois poses statiques animées en CSS.

---

# PARTIE B — Brief de reprise pour Claude Desktop

## B.1 Ce qui est acté

Quatre documents, à joindre à la nouvelle conversation :

1. `la-pierre-des-mots-specs-v2.md` — conception, univers, game design, pédagogie, socle technique
2. `annexe-T-strategie-de-test.md` — testabilité, six niveaux de test, boucle de travail de l'agent
3. `annexe-P-production-et-agent.md` — ComfyUI, voix GPU, Docker, MCP, orchestration
4. Ce document — animation et point de départ

Rien n'est codé. Tout est spécifié.

## B.2 Les décisions structurantes, en une page

- **Aucun écran d'échec, jamais.** Un acquis n'est jamais repris. Toute session se termine sur une réussite.
- **La couleur vient du code, pas du modèle.** ComfyUI génère du trait noir sur blanc, l'application colorie via les jetons de palette.
- **Le décor s'agite, le texte jamais.** Dès qu'il y a du déchiffrage : fond parchemin, police Andika, aucune animation dans le champ de lecture.
- **L'aide de Gobi ne coûte rien**, elle change seulement le nombre d'étoiles. C'est l'enfant qui choisit sa difficulté.
- **Aucun contenu généré n'atteint l'enfant sans relecture parent.**
- **Testabilité en L0**, pas après : aléatoire injecté, horloge injectée, effets externes derrière interface, crochets `window.__test`.
- **Docker n'est jamais un prérequis pour jouer.** Le `.bat` quotidien reste en Node natif.
- **L1 décide de tout** : une région complète et amusante, testée sur lui, avant de construire les cinq autres.

## B.3 À trancher avant la première ligne de code

1. **Le nom du jeu** — « La Pierre des Mots » est un titre de travail. À lui faire choisir : c'est de l'adhésion gagnée gratuitement.
2. **Ollama ou API Claude** pour les répliques et indices en jeu.
3. **Vingt fiches du dossier existant**, à examiner pour calibrer l'ingestion avant de l'industrialiser.
4. **HTTPS ou non** — sans micro, c'est devenu un simple confort (PWA, icône sur l'écran d'accueil).

## B.4 Ordre de démarrage

```
L0  socle + testabilité + MCP atelier minimal + docker-compose + verrou GPU
 ↓
L1a 40-60 références de style à la main, LoRA de style, workflows ComfyUI figés
 ↓
L1b pipeline vectorisation + QC bout en bout, prouvé sur 10 assets
 ↓
L1c La Clairière : carte, 3 moteurs, recoloration, Gobi, étoiles, SRS
 ↓
     ── TEST AU RÉEL SUR TON FILS, SANS RIEN LUI EXPLIQUER ──
 ↓
L2  voix (casting 7 locuteurs, enregistrements familiaux, QC ASR inverse)
```

Le test au réel n'est pas une étape symbolique. Si L1 ne l'amuse pas, aucun des lots suivants ne le rendra amusant, et il vaudra mieux le savoir après trois semaines qu'après six mois.

## B.5 Cinq premières tâches concrètes

1. Initialiser le dépôt : Node 24, Fastify, Vite, React 19, Tailwind v4, SQLite, Vitest, Playwright, lefthook. Vérifier que `npm run verifier` tourne à vide et sort en code 0.
2. Implémenter `Alea`, `Horloge`, les interfaces `FournisseurVoix` / `FournisseurAudio` / `FournisseurLLM`, avec leurs implémentations de test, plus la règle ESLint interdisant `Math.random` et `Date.now`. Écrire les tests d'abord.
3. `demarrer.bat` : Node, `npm ci`, pare-feu, IP LAN, mDNS, QR code. Testé sur une machine propre.
4. Schéma SQLite, migrations, profils, écran de choix de profil, avatar paramétrique avec la configuration par défaut (châtain, yeux bleus). Un E2E : je me connecte depuis la tablette, je crée mon héros.
5. Serveur MCP « atelier » minimal : `etat_projet`, `lancer_tests`, `capturer_ecran`. À partir de là, l'agent peut voir ce qu'il fait.

## B.6 Squelette de `CLAUDE.md`

À placer à la racine du dépôt, à compléter au fil du projet :

```markdown
# La Pierre des Mots

Application de lecture pour un enfant de 7 ans (CE1), servie en local sur le LAN
depuis un PC Windows. Specs de référence dans /docs.

## Avant toute chose
Lire /docs/specs-v2.md pour la conception, /docs/annexe-T.md pour les tests,
/docs/annexe-P.md pour la production d'assets. En cas de doute, les specs priment.

## Règles non négociables
- Aucun écran d'échec, jamais. Un acquis n'est jamais repris.
- Aucun Math.random, aucun Date.now : passer par Alea et Horloge.
- Aucune écriture dans contenu/exercices|habillages|audio : brouillons uniquement.
- Aucune consigne uniquement écrite : tout est audible en un tap.
- Ne jamais mettre un test en skip. Ne jamais assouplir une assertion.
- Ne jamais mettre à jour une référence de test ou de rejeu de sa propre initiative.

## Boucle de travail
1. Lire la section des specs concernée.
2. Écrire le test, le voir échouer pour la bonne raison.
3. Implémenter le plus petit incrément qui le fait passer.
4. npm run verifier ; lire tests/rapports/RAPPORT.md.
5. Vérifier la définition de « terminé » (annexe T § 6) avant d'annoncer la fin.

## Commandes
npm run test | test:contenu | test:e2e | test:visuel | test:qualite | test:rejeu | verifier
```

## B.7 MCP à configurer dans Claude Desktop

- **Filesystem** sur le dossier du projet.
- **atelier** — le serveur MCP maison de l'annexe P § 6.2. À écrire en L0, même en version minimale.
- Éventuellement un connecteur Docker si tu veux piloter les services GPU depuis la conversation.

Pour le travail sur le dépôt lui-même — code, tests, refactor, debug — utilise **Claude Code**, accessible depuis l'application de bureau. La conversation Desktop orchestre, arbitre et produit du contenu ; elle ne tient pas un dépôt entier en tête.

## B.8 Phrase d'amorce

> Je démarre le développement de La Pierre des Mots. Les quatre documents joints sont les specs de référence. Commence par la tâche 1 du § B.5 : initialiser le dépôt et vérifier que la chaîne de test tourne à vide. Applique la boucle de travail de l'annexe T § 6 : test d'abord, puis implémentation, puis `npm run verifier`.

---

**Un dernier point.** Ces documents sont le seul support qui traverse le changement de conversation — d'où l'importance de les joindre. Tout ce qui a été décidé y figure ; ce qui n'y figure pas n'a pas été décidé.
