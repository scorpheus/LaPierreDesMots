# La Pierre des Mots — Annexe P : production d'assets et orchestration par agent

**Complète** les specs v2 et l'annexe T
**Contexte matériel** PC Windows avec GPU conséquent, Docker installé, ComfyUI opérationnel
**Contrainte** tout est créé et vérifié par un LLM, piloté depuis Claude Desktop

---

## 1. Ce que ton matériel change dans les specs

| Décision v2 | Décision révisée | Motif |
|---|---|---|
| Piper, voix `siwis` unique | **Chatterbox** (MIT, clonage zéro-shot) ou **XTTS-v2**, rendu GPU hors ligne — Piper conservé en repli | Sept personnages ont besoin de sept voix distinctes. Une seule voix neutre tue le casting |
| Habillages dessinés à la main ou approximés | **ComfyUI en chaîne de production**, ~600 assets générés et vectorisés | Le volume d'assets était le risque n°3 de la v2. Il devient un problème de débit, pas de faisabilité |
| Installation Node native | **Docker Compose**, Node natif conservé pour le confort de développement | Isole les services GPU, rend l'environnement reproductible pour l'agent |
| Ollama optionnel | **Ollama local activable**, GPU disponible | Répliques de mascotte hors ligne sans passer par une API |

Le reste des specs v2 est inchangé. Ceci est une annexe de production, pas une révision de conception.

---

## 2. Le principe qui gouverne toute la chaîne image

> **La couleur vient du code, pas du modèle.**

ComfyUI ne génère que du **trait noir sur blanc**. La couleur est appliquée par l'application, à partir des jetons de la palette (v2 § 9.2), au moment du rendu.

Quatre conséquences, toutes décisives :

1. **La mécanique de recoloration fonctionne par construction.** Une zone grise n'est pas un filtre appliqué à une image colorée : c'est l'état par défaut d'un SVG dont les remplissages ne sont pas encore assignés. Impossible de « rater » l'effet.
2. **La palette est cohérente à 100 %**, sur 600 assets, sans jamais dépendre de la stabilité chromatique d'un modèle de diffusion — qui n'existe pas.
3. **Le problème de cohérence de style s'effondre.** Générer un trait épais noir cohérent est un problème résolu ; générer 600 illustrations couleur cohérentes ne l'est pas.
4. **Le coloriage à consigne devient trivial.** Les régions coloriables sont exactement les régions fermées du trait, déjà identifiées par la vectorisation.

C'est le choix technique le plus important de cette annexe. Tout le reste en découle.

---

## 3. Chaîne image

### 3.1 Ce qui est généré, ce qui ne l'est pas

| Asset | Origine |
|---|---|
| Décors de région, calques de recoloration | ComfyUI → SVG |
| Objets du campement, accessoires, butins | ComfyUI → SVG |
| Compagnons (Gobi, Filou, Bulle, Roc, Plume), poses et expressions | ComfyUI → SVG, à partir d'une fiche de personnage |
| Vignettes d'exercices (images de mots, illustrations de textes) | ComfyUI → SVG ou WebP |
| Pages de coloriage neuves | ComfyUI → SVG à régions fermées |
| **Avatar de l'enfant** | **Non généré.** Reste un SVG paramétrique écrit à la main (v2 § 4.1) — il doit être combinable, pas illustré |
| Interface, icônes, boutons | Non générés. Écrits en SVG/CSS, c'est plus rapide et plus propre |
| Fiches existantes du dossier PNG/JPG | Ingérées, pas générées (v2 § 13.4) |

### 3.2 Le pipeline, étape par étape

```
prompt + workflow ComfyUI
   ↓  génération 1536², trait noir sur blanc, sans texte
   ↓  contrôle qualité automatique (§ 3.5)  ──── échec ──▶ régénération avec correctif
   ↓  nettoyage : seuil adaptatif, suppression du bruit, fermeture morphologique
   ↓  VÉRIFICATION DES RÉGIONS FERMÉES  ─────── échec ──▶ régénération
   ↓  vectorisation potrace → chemins de trait
   ↓  étiquetage des composantes connexes → régions coloriables
   ↓  assemblage SVG : calques nommés, ids stables, classes de palette
   ↓  validation du schéma d'asset
contenu/habillages/<region>/<nom>.svg  +  entrée dans assets.lock.json
```

L'étape en majuscules est celle qui casse tout si on l'oublie : un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image. Le test est un remplissage par diffusion depuis l'extérieur ; s'il atteint l'intérieur d'une forme censée être fermée, l'asset est rejeté.

### 3.3 Cohérence de style et de personnages

**Style.** Une LoRA de style entraînée sur 40 à 60 références produites à la main lors du lot L1, ou à défaut un IPAdapter de style avec image de référence figée. Verrouillage systématique : même checkpoint, même sampler, même CFG, même nombre de pas, résolution fixe. Le prompt de style est un **fragment partagé** stocké dans `production/style.txt`, jamais réécrit asset par asset.

**Personnages.** Une fiche par compagnon (vue de face, profil, trois-quarts, 6 expressions), validée manuellement une fois, puis une petite LoRA par personnage. Cinq LoRAs à entraîner, une soirée de GPU. C'est ce qui évite que Gobi ait cinq têtes différentes selon l'écran.

**Propriété intellectuelle.** Les prompts décrivent des créations originales. Aucun prompt ne nomme une œuvre, un personnage ou un studio existant. Les inspirations de la v2 § 2 sont des principes de conception, pas des cibles visuelles à reproduire.

### 3.4 Pilotage de ComfyUI

ComfyUI tourne en natif sous Windows (il a déjà tes modèles et ton GPU), et est piloté par HTTP :

- `POST /prompt` avec un workflow au format API + `client_id`
- WebSocket `/ws` pour la progression
- `GET /history/{prompt_id}` puis `GET /view` pour récupérer l'image

Les workflows sont versionnés dans `production/workflows/*.api.json`. Un workflow = un usage : `decor.api.json`, `personnage.api.json`, `objet.api.json`, `coloriage.api.json`. Les seuls champs modifiés par l'agent sont le prompt positif, la graine et la résolution — **jamais la structure du graphe**. Si un workflow doit changer, c'est une modification versionnée, relue, avec régénération des assets concernés.

### 3.5 Contrôle qualité automatique des images

Trois passes. Un asset ne rejoint la bibliothèque que s'il passe les trois.

**Passe technique** (déterministe, rapide) :

| Critère | Seuil |
|---|---|
| Régions fermées | 100 % des régions attendues, aucune fuite |
| Nombre de régions coloriables | entre 6 et 40 selon le type d'asset |
| Épaisseur du trait après vectorisation | 3 à 5 px à l'échelle de référence |
| Nombre de chemins SVG | ≤ 400 (au-delà, la vectorisation a bavé) |
| Poids du fichier | ≤ 120 Ko |
| Texte détecté dans l'image | zéro — un modèle de diffusion écrit toujours mal, et ici il écrirait du faux français devant un enfant qui apprend à lire |

**Passe sémantique** (modèle de vision, Claude ou VLM local) : l'image montre-t-elle bien ce qui était demandé ? style conforme à la référence ? anatomie cohérente ? élément parasite ? Sortie en JSON noté sur 5 par critère, seuil d'acceptation à 4.

**Passe d'intégration** : l'asset est chargé dans l'application, colorié via les jetons de palette, capturé, et comparé à la capture de référence de l'habillage (annexe T § T4).

Budget de régénération : **5 tentatives maximum par asset**, avec correctif de prompt à chaque échec, puis mise en file d'attente humaine. Un agent qui relance 40 fois le même prompt brûle du GPU sans converger.

### 3.6 Reproductibilité

Chaque asset produit une entrée dans `production/assets.lock.json` :

```jsonc
{
  "id": "clairiere.decor.arbre-maison",
  "fichier": "contenu/habillages/clairiere/arbre-maison.svg",
  "empreinte": "sha256:…",
  "generation": {
    "workflow": "decor.api.json@3",
    "checkpoint": "…", "lora_style": "…@1.2", "lora_perso": null,
    "prompt": "…", "prompt_negatif": "…",
    "graine": 774512, "pas": 28, "cfg": 5.5, "sampler": "dpmpp_2m_sde", "resolution": [1536,1536]
  },
  "qc": { "technique": "ok", "semantique": 4.6, "integration": "ok", "tentatives": 2 },
  "valide_par": "parent", "valide_le": "2026-09-03T20:14:00Z"
}
```

N'importe quel asset est régénérable à l'identique. Sans ce fichier, la bibliothèque devient un cimetière d'images dont personne ne sait comment elles ont été faites — le mode d'échec classique des pipelines génératifs.

---

## 4. Chaîne voix

### 4.1 Modèles

| Rôle | Modèle | Raison |
|---|---|---|
| Voix principales des personnages | **Chatterbox** (Resemble AI, MIT, clonage zéro-shot, français) | Licence propre, clonage à partir d'un échantillon court, contrôle d'expressivité |
| Alternative | **XTTS-v2** (Coqui) | Clonage de référence, français solide ; licence CPML non commerciale — sans objet pour un usage familial privé, à noter si le projet sortait du foyer |
| Repli léger | **Kokoro-82M** (Apache 2.0) ou **Piper** | Rapide, peu de VRAM, pour les rendus de masse ou si le GPU est occupé |

Tout est rendu **hors ligne, en lot, à la validation du contenu**. Aucune synthèse à l'exécution. L'application ne connaît que des fichiers Opus et un manifeste.

### 4.2 Casting

Sept voix : narrateur, Gobi, Filou, Bulle, Roc, Plume, et une voix de secours neutre pour les consignes système.

Gobi ne parle pas français : uniquement des onomatopées et des sons, rendus puis transposés. Cela règle d'un coup son intelligibilité, son coût de production et son intemporalité.

**Une suggestion qui vaut plus que le modèle choisi :** enregistre dix minutes de toi et dix minutes de Léa comme voix de référence pour deux compagnons. C'est propre juridiquement, gratuit, immédiatement identifiable, et l'effet sur un enfant de sept ans est sans commune mesure avec n'importe quelle voix synthétique. Le clonage ne se fait qu'à partir de voix dont la personne a donné son accord — pas de voix de tiers, pas de célébrité.

### 4.3 Pipeline

```
scan de contenu/exercices/**.json + répliques de personnages
   ↓  extraction des lignes à dire, avec locuteur, vitesse, émotion
   ↓  clé = sha256(texte | locuteur | modèle | vitesse | version_lexique)
   ↓  lignes déjà en cache → ignorées
   ↓  synthèse GPU par lots de 64
   ↓  normalisation loudness (-16 LUFS), suppression des silences de bord, fondu 20 ms
   ↓  contrôle qualité par ASR inverse (§ 4.4)
   ↓  encodage Opus 48 kbps mono
contenu/audio/<cle>.opus  +  manifeste voix.lock.json
```

Rendu supplémentaire pour tout mot cible : une version **syllabée**, marqueurs de temps inclus, pour la coloration synchronisée.

### 4.4 Le contrôle qualité qui justifie le GPU

L'ASR a été retirée de l'exécution. Elle revient **au moment du build**, et c'est là qu'elle est utile :

chaque clip synthétisé est repassé dans Whisper, et la transcription est comparée au texte source. Si la distance dépasse le seuil, le clip est rejeté et re-synthétisé avec une graine ou une prononciation différente.

Cela attrape automatiquement ce qu'aucun humain n'ira écouter sur 3 000 clips : les mots tronqués, les fins avalées, les liaisons fautives, les nombres lus de travers, les hallucinations de fin de phrase. Sur une application qui apprend à lire, un mot mal prononcé n'est pas un défaut cosmétique — c'est un contresens pédagogique.

Contrôles complémentaires : durée cohérente avec le nombre de syllabes attendu (± 40 %), absence de silence terminal de plus de 400 ms, pic de loudness dans la plage.

### 4.5 Lexique de prononciation

Un fichier `production/lexique.json` corrige les cas récalcitrants — prénoms inventés, noms de régions, onomatopées, graphèmes prononcés isolément (`[ou]` doit se dire « ou », pas « o-u »). Toute entrée du lexique invalide le cache des clips concernés via `version_lexique` dans la clé de hachage.

---

## 5. Docker

### 5.1 Composition

```yaml
services:
  app:            # Node 24, Fastify, Vite — profil: defaut
  tts:            # GPU, API HTTP autour de Chatterbox/XTTS — profil: build
  ollama:         # GPU, répliques et indices locaux — profil: build, ia
  tests:          # image Playwright, lance la suite contre app — profil: test
# ComfyUI reste natif sous Windows, joint via host.docker.internal:8188
```

Volumes montés : `contenu/`, `donnees/`, `modeles/`, `production/`. Réseau interne, seul `app` expose un port sur le LAN.

Profils : `docker compose up` lance le strict nécessaire pour jouer ; `--profile build` réveille les services GPU pour une session de production d'assets ; `--profile test` lance la vérification.

### 5.2 GPU sous Windows

Docker Desktop, backend WSL2, NVIDIA Container Toolkit, `deploy.resources.reservations.devices` sur les services GPU. Vérification au démarrage : le service `tts` échoue explicitement si CUDA est indisponible, plutôt que de basculer silencieusement sur CPU et de rendre 3 000 clips en une nuit au lieu de vingt minutes.

### 5.3 Verrou GPU

ComfyUI, le TTS et Ollama veulent tous la même VRAM. Sans arbitrage, une session de production d'assets fait échouer une génération de voix, avec des messages d'erreur incompréhensibles pour un agent.

Un **verrou consultatif** : fichier `production/.gpu.lock` contenant le détenteur, le PID et l'horodatage, acquis par tout job GPU, expiration automatique à 30 minutes. Les jobs s'attendent au lieu de se marcher dessus. C'est dix lignes de code et ça évite une catégorie entière de faux bugs.

### 5.4 Ce que Docker n'apporte pas ici

Le `demarrer.bat` destiné à l'usage quotidien **ne passe pas par Docker** : Node natif démarre en deux secondes, Docker Desktop en trente. Docker sert à la production d'assets, aux tests et à la reproductibilité de l'environnement de développement. Il ne doit jamais être un préalable pour que ton fils puisse jouer.

---

## 6. Orchestration par LLM depuis Claude Desktop

### 6.1 Répartition des rôles

| Travail | Où |
|---|---|
| Code, tests, refactor, debug | **Claude Code** (disponible dans l'application de bureau) — c'est son terrain : il lit le dépôt, exécute, itère sur les erreurs |
| Production d'assets, génération de contenu, revue, arbitrages | **Claude Desktop + MCP**, conversationnel, avec la boucle de validation humaine |
| Lots massifs et répétitifs (300 exercices, 600 assets) | Sous-agents, modèles moins coûteux pour l'exécution, modèle fort pour la revue |

Ne pas demander à une conversation Desktop de tenir un dépôt entier en tête : elle orchestre, elle ne compile pas.

### 6.2 Le serveur MCP « atelier »

C'est la pièce maîtresse. Plutôt que de laisser un agent lancer des commandes arbitraires, on lui expose une surface d'outils typée, avec ses garde-fous :

| Outil | Effet |
|---|---|
| `generer_image` | Soumet un workflow ComfyUI, attend, lance le QC, renvoie le rapport |
| `vectoriser` | PNG → SVG en calques, avec vérification des régions fermées |
| `generer_voix` | Synthèse d'un lot de lignes + QC par ASR inverse |
| `valider_contenu` | Exécute `test:contenu` sur un ou plusieurs JSON |
| `lancer_tests` | Exécute une suite de l'annexe T, renvoie le rapport JSON |
| `etat_projet` | Assets manquants, exercices en attente, couverture par compétence, échecs récents |
| `deposer_brouillon` | Écrit dans `contenu/brouillons/` **uniquement** |
| `capturer_ecran` | Capture Playwright d'un écran donné, pour que l'agent voie son propre résultat |

`capturer_ecran` mérite une mention particulière : un agent qui ne peut pas regarder ce qu'il a produit corrige à l'aveugle. Lui donner des yeux sur l'interface change complètement la qualité de la boucle.

### 6.3 Boucle autonome

```
etat_projet ──▶ choisir la tâche manquante la plus prioritaire
     ▲                    │
     │              produire (image, voix, exercice, code)
     │                    │
     │              QC automatique
     │                    │
     └── échec ◀──────────┤ (≤ 5 tentatives, correctif à chaque passe)
                          │
                     réussite
                          │
                  file de relecture parent ──▶ validation humaine ──▶ bibliothèque
```

L'agent peut tourner longtemps sans supervision **sur la production**. Il ne peut jamais franchir seul la dernière étape.

### 6.4 Interdits

- Écrire directement dans `contenu/exercices/`, `contenu/habillages/` ou `contenu/audio/`. Tout passe par les brouillons et la relecture parent.
- Modifier un workflow ComfyUI, `style.txt`, la palette ou le référentiel de compétences sans validation explicite.
- Mettre à jour une référence de test (visuelle ou de rejeu) de sa propre initiative — règle déjà posée en annexe T § 6.
- Dépasser le budget de régénération sans le signaler.
- Cloner une voix qui n'est pas celle d'une personne consentante du foyer.
- Écrire du texte français destiné à l'enfant sans qu'il passe la vérification de couverture lexicale CE1.

### 6.5 Fichiers d'orchestration

```
CLAUDE.md                      # règles du projet, boucle de travail, interdits
.claude/agents/
   producteur-images.md        # spécialiste ComfyUI + QC
   producteur-voix.md          # spécialiste TTS + QC ASR
   auteur-exercices.md         # génération de contenu pédagogique
   testeur.md                  # annexe T, exécution et diagnostic
production/
   style.txt  lexique.json  workflows/  assets.lock.json  voix.lock.json
```

Chaque fiche d'agent contient : son périmètre, ses outils MCP autorisés, ses critères de qualité chiffrés, et sa définition de « terminé ». Un agent sans critères chiffrés produit du plausible.

---

## 7. Volumétrie et débit

Ordres de grandeur pour dimensionner les sessions de production, à recalibrer après les premiers lots réels :

| Poste | Volume estimé | Temps GPU |
|---|---|---|
| Décors et calques, 6 régions | ~180 SVG | 2 à 4 h avec régénérations |
| Habillages, 12 moteurs × 3 | ~250 assets | 3 à 5 h |
| Compagnons, poses et expressions | ~80 assets + 5 LoRAs | 1 soirée d'entraînement + 1 h |
| Objets de campement et butins | ~120 assets | 2 h |
| Vignettes d'exercices | ~400 assets | 4 h |
| Lignes de voix, 7 locuteurs | 2 500 à 4 000 clips | 30 à 90 min, QC ASR compris |

Total de l'ordre de deux à trois week-ends de production GPU, étalés sur les lots. Le facteur limitant n'est pas le GPU : c'est le **temps de relecture parent**. Prévoir des lots de 30 à 50 éléments, pas des vagues de 400 — l'écran de relecture (v2 § 9.2) doit permettre d'en enchaîner un toutes les dix secondes.

---

## 8. Risques nouveaux

| Risque | Parade |
|---|---|
| Dérive de style sur 600 assets | LoRA de style figée, `style.txt` partagé, passe de QC sémantique, capture d'intégration comparée à la référence |
| Régions non fermées → coloriage cassé | Vérification par remplissage extérieur, bloquante, avant vectorisation |
| Texte halluciné dans une image | Détection de texte en QC technique, rejet automatique. Zéro tolérance : c'est une appli d'apprentissage de la lecture |
| Mot mal prononcé passé inaperçu | QC par ASR inverse systématique au build |
| Contention GPU entre ComfyUI, TTS et Ollama | Verrou consultatif `production/.gpu.lock` |
| Agent qui brûle du GPU sans converger | Plafond de 5 tentatives, correctif obligatoire à chaque passe, escalade humaine |
| Bibliothèque d'assets non reproductible | `assets.lock.json` et `voix.lock.json`, entrées obligatoires |
| Docker devenu prérequis pour jouer | `demarrer.bat` en Node natif, Docker réservé à la production et aux tests |
| Goulot de relecture humaine | Lots courts, écran de relecture au clavier, priorisation par `etat_projet` |

---

## 9. Impact sur les lots

| Lot | Ajout |
|---|---|
| **L0** | Serveur MCP « atelier » minimal (`etat_projet`, `lancer_tests`, `capturer_ecran`), `docker-compose.yml`, verrou GPU |
| **L1** | Les 40-60 références de style faites à la main, LoRA de style, workflows ComfyUI figés, pipeline vectorisation + QC complet sur la première région |
| **L2** | Pipeline voix, casting des 7 locuteurs, enregistrement des voix familiales, QC par ASR inverse, lexique |
| **L4** | LoRAs de personnages, production de masse des habillages |

**L1 reste le lot qui décide de tout.** Une région complète, avec sa chaîne d'assets bout en bout, un enfant qui joue, et le pipeline prouvé — avant de lancer la production des cinq autres.
