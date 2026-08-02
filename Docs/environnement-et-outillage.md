# Environnement et outillage — état mesuré

**Mesuré le** 2026-08-01, sur la machine de développement
**Statut** relevé factuel, à réactualiser quand la machine change
**But** qu'aucune session ne redécouvre ce qui est déjà installé, et qu'aucune ne suppose présent
ce qui manque

---

## 1. Matériel et système

| Poste | Valeur |
|---|---|
| GPU | **NVIDIA GeForce RTX 5090, 32 Go** (pilote 596.36) |
| CUDA | pilote → **13.2** max · toolkit `nvcc` installé → **13.1.80** (cible des roues et images : cu13.1) |
| RAM | 100 Go |
| OS | Windows 11 Home 26200 |
| Shell | PowerShell 5.1 (primaire), Bash disponible |

Le dimensionnement de l'annexe P (~600 assets, 2 à 3 week-ends de GPU) est confortable sur cette
machine. Le facteur limitant reste le temps de relecture parent, comme annoncé.

## 2. Chaîne applicative

| Outil | Version | Note |
|---|---|---|
| Node.js | **24.13.1** | Conforme aux specs (Node 24 LTS, `node:sqlite` intégré) |
| npm | 11.14.1 | |
| Docker | **29.5.3**, démon actif, 0 conteneur | Pour la production d'assets et les tests, jamais pour jouer |
| Git | 2.49.0 | Dépôt initialisé, branche `main`, un commit, `origin` configuré |
| Python | 3.13.3 | |
| ffmpeg | 8.1.1 full | Utile à l'encodage Opus et aux cinématiques WebM |
| **potrace** | **ABSENT** | **Nécessaire à la vectorisation (annexe P § 3.2). À installer avant le lot L1b** |

## 3. ComfyUI

**Installé et en fonctionnement.** Une panne survenue le 2026-08-01 a été résolue le jour même ;
version passée de 0.29.0 à **0.29.2**, mesurée à `30,3 Go de VRAM libre sur 31,8`. Piloté par le
plugin `comfy@comfyui-mcp`.

> **Réflexe avant toute campagne de génération** : vérifier `http://127.0.0.1:8188/system_stats`.
> Un agent qui suppose ComfyUI disponible et le trouve absent brûle son budget de tentatives sur
> des erreurs réseau incompréhensibles.

| Poste | Valeur |
|---|---|
| Version | 0.29.0, frontend 1.47.11 |
| API | `http://127.0.0.1:8188` — répond à `/system_stats` |
| Lancement | build autonome Windows : `.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build` |
| PyTorch | 2.13.0+cu130 |
| VRAM vue | 34,2 Go |

### Modèles pertinents pour la chaîne image

L'installation est généraliste et contient bien plus que ce projet n'utilisera. Ceux qui comptent
ici :

| Usage visé | Candidats présents |
|---|---|
| Trait noir sur blanc, style BD | `flux1-dev` (+ LoRA `FLUX.1-Turbo-Alpha`), `juggernautXL_juggXIByRundiffusion`, `damnPonyIllustrious_rebornIllustrious` |
| Édition et cohérence de personnage | `qwen_image_edit_2511` (+ LoRA Lightning 4 pas) — le meilleur levier pour tenir une fiche de personnage |
| Guidage de structure | `flux1-canny-dev`, `flux1-depth-dev` |
| Animation (addendum § A.2) | `wan2.2_t2v` / `wan2.2_i2v` haute et basse résolution de bruit, + LoRA Lightning 4 pas |

### Pilotage par le plugin MCP — testé le 2026-08-01

Le plugin `comfy@comfyui-mcp` (v0.1.0) pilote le serveur de bout en bout depuis Claude Code :
bilan de santé, soumission, suivi de file, récupération et inspection des images. Test réel :
trois itérations d'une fiche de Gobi en trait noir sur blanc.

| Mesure | Valeur |
|---|---|
| Checkpoint testé | `flux1-schnell-fp8` (tout-en-un, chargé par `CheckpointLoaderSimple`) |
| Réglages | 1536², 6 pas, euler/simple, CFG 1, graine fixée |
| Durée par image | **8 à 12 s** (première image plus lente, chargement du modèle compris) |

Deux enseignements de prompt à retenir pour la chaîne d'assets :

- **À CFG 1, le prompt négatif est inerte** (Flux schnell). Toute contrainte — pas de bras, pas
  de texte, pas de couleur — doit être **formulée en positif** dans le prompt principal
  (« son corps est une boule lisse, seuls deux pieds y sont attachés »), sinon elle est ignorée.
- Le fond blanc porte un léger grain résiduel : sans conséquence à l'écran, mais **à surveiller
  au seuillage de la vectorisation** (potrace) — à vérifier au lot L1b.

> **Point de vigilance produit.** La bibliothèque de LoRA de cette installation est en grande partie
> orientée adulte. C'est une application pour un enfant de 7 ans, produite par un agent : les
> workflows figés de `production/workflows/*.api.json` doivent porter une **liste blanche explicite
> de checkpoints et de LoRA**, et le chargement de tout modèle hors liste doit être une erreur
> bloquante, pas un défaut silencieux. C'est un durcissement de l'annexe P § 3.4, qui interdit déjà
> à l'agent de toucher à la structure du graphe.

## 4. llama.cpp local

**Racine** `D:\Projet_perso\llama` · **Binaire** `llama\llama-server.exe` (build b8967, CUDA 13.1)
· **Port conventionnel** 8001 · **API** compatible OpenAI

Serveur **à lancer au besoin**, il ne tourne pas en permanence. Scripts prêts à l'emploi dans le
dossier : `launch_llama.bat` (Qwen3.5-27B distillé) et `launch_llama_9b.bat` (Qwen3.5-9B, léger).
`install.txt` conserve les lignes de commande d'une douzaine d'autres configurations.

### Modèles GGUF réellement présents

| Modèle | Taille | Intérêt pour le projet |
|---|---|---|
| `unsloth/Qwen3.6-27B-UD-Q5_K_XL` (et Q6) | 18,7 / 23,9 Go | Le plus capable en dense — génération et revue de contenu |
| `unsloth/Qwen3.6-35B-A3B-UD-Q5_K_XL` | 24,8 Go | MoE, rapide à l'inférence — bon pour les lots massifs |
| `unsloth/gemma-4-31B-it-UD-Q4_K_XL` + `mmproj` | 17,5 Go | **Multimodal** — candidat naturel à la passe de QC sémantique des images (annexe P § 3.5) et à l'ingestion des fiches papier |
| `unsloth/Qwen3.5-35B-A3B-UD-Q4_K_XL` | 20,7 Go | |
| `unsloth/Qwen3.5-9B-Q4_K_M` | 5,3 Go | Léger, pour les tâches mécaniques à haut débit |
| `Qwen/Qwen3-14B-GGUF` et `-128K` | 8,4 Go chacun | |
| `embeddings/bge-m3-Q8_0` | 0,6 Go | Embeddings multilingues |
| `embeddings/gte-Qwen2-1.5B-instruct-Q8_0` | 1,8 Go | Embeddings |

Deux conséquences pour les specs :

- Le point à trancher « **Ollama ou API Claude** » (v2 § 18.2, addendum § B.3.2) peut se reformuler :
  **llama.cpp est déjà là, avec les modèles**. Ollama n'apporterait qu'une couche de gestion.
- La passe de **QC sémantique** de l'annexe P § 3.5 (« modèle de vision, Claude ou VLM local ») a un
  candidat local identifié : **gemma-4-31B-it multimodal**, avec son `mmproj`.

> **À signaler.** `D:\Projet_perso\llama\install.txt` contient en clair, ligne 61, ce qui ressemble à
> un **jeton Discord**. Hors périmètre de ce projet, mais à révoquer.

## 5. Contention GPU

ComfyUI, le TTS et llama.cpp visent tous la même VRAM. Le verrou consultatif
`production/.gpu.lock` de l'annexe P § 5.3 n'est pas une précaution théorique : ComfyUI est
**déjà résident** sur le GPU. Tout job GPU l'acquiert, y compris une session llama.cpp lancée pour
générer du contenu.

## 6. Le nuancier de coloriage — validation de D37, consignée (lot N7)

**D37 valide le nuancier de 11 couleurs. Cette section consigne CE QUI A ÉTÉ VÉRIFIÉ**, parce
qu'une décision sans sa mesure n'est pas opposable.

### 6.1 Le nuancier existe déjà, et N7 n'y ajoute rien

Mesuré, pas rapporté :

```
$ grep -n "CouleurColoriage\|NUANCIER\|JetonCouleur" partage/src/palette.ts
16:export type JetonCouleur =          → 7 membres (v2 § 9.2)
26:export type CouleurColoriage =      → 11 membres
65:export const NUANCIER               → 11 entrées
```

Les **7 jetons** de la v2 § 9.2 sont intacts, à l'octet près, et les **11 couleurs** du
nuancier vivent à côté d'eux sans en modifier aucun. `partage/src/palette.ts` n'est **pas**
modifié par N7 : le contrat de finition v3 § 4.7 est explicite — « D37 les valide, elle n'en
ajoute aucune. Un lot qui y touche sort de son périmètre. »

### 6.2 Les quatre couleurs à valider, et leur origine

Sept des onze reprennent un objet déjà validé ; **quatre sont des propositions** que D37
entérine. La colonne « origine » n'est pas décorative : elle dit ce qui a été décidé et ce qui
a été proposé.

| couleur | valeur | origine |
|---|---|---|
| `jaune` | `#FFC93C` | jeton `soleil` (v2 § 9.2) |
| `bleu` | `#2FA8E0` | jeton `lagon` (v2 § 9.2) |
| `rose` | `#FF5D8F` | jeton `framboise` (v2 § 9.2) |
| `noir` | `#1B2440` | jeton `trait` (v2 § 9.2) |
| `blanc` | `#FFF6E3` | jeton `parchemin` (v2 § 9.2) |
| `gris` | `#8E97A8` | jeton `grisaille` (v2 § 9.2) |
| `brun` | `#7A5230` | cheveux châtains de la v2 § 4.1 |
| **`rouge`** | `#E03131` | **proposée**, entérinée par D37 |
| **`orange`** | `#F76707` | **proposée**, entérinée par D37 |
| **`vert`** | `#2FB344` | **proposée**, entérinée par D37 |
| **`violet`** | `#8B5CF6` | **proposée**, entérinée par D37 |

### 6.3 Ce que le décor en fait — et pourquoi il ne porte AUCUNE de ces couleurs

« La couleur vient du code, pas du modèle » (annexe P § 2). Les décors v2 de N7
(`ecole-v2.svg`, `grottes-v2.svg`) posent `fill="#8E97A8"` — la Grisaille — sur **toutes** leurs
régions coloriables, et rien d'autre. Une région grise n'est pas une image filtrée : c'est
**l'état par défaut d'un SVG dont les remplissages ne sont pas assignés**. C'est `SceneSvg` qui
écrit le `fill` depuis `NUANCIER` au moment où l'enfant peint.

Conséquence opposable pour tout décor à venir : **un décor qui porterait une couleur du
nuancier en dur cesserait d'être recoloriable**, et le défaut ne se verrait qu'à l'usage.

### 6.4 Le contrôle bloquant des régions fermées

`scripts/verifier-regions-fermees.mjs` (lot N7) applique l'annexe P § 3.2 à **tous** les SVG de
`contenu/`, y compris ceux qu'aucun habillage ne déclare — que `scripts/test-contenu.mjs`
laissait hors de portée en les classant « contenu mort ». Sortie citée telle quelle :

```
$ node scripts/verifier-regions-fermees.mjs
verifier-regions-fermees — 93 SVG, 1345 élément(s) dessiné(s), 234 région(s) déclarée(s) par 37 habillage(s)
```

Quatre règles bloquantes (`chemin-ouvert`, `trait-rempli`, `region-declaree-absente`,
`region-non-declaree`) et trois de métrologie (`surface-divergente`, `centroide-hors-region`,
`mesure-impossible`), ces dernières bloquantes sous `--strict`. Le module est aussi exercé par
`tests/unitaires/regions-fermees.test.ts`, qui lui donne d'abord un SVG sain et un SVG fautif :
un contrôle qu'aucun test ne discrimine est un contrôle qu'on croit avoir.

## 7. Ce qui manque avant L1

- [ ] `potrace` (vectorisation)
- [ ] Serveur MCP « atelier » (annexe P § 6.2) — au moins `etat_projet`, `lancer_tests`, `capturer_ecran`
- [ ] Modèle TTS (Chatterbox ou XTTS-v2, annexe P § 4.1) — aucun n'est installé à ce jour
- [ ] Liste blanche de checkpoints et LoRA dans les workflows figés
- [ ] Les fiches d'exercices d'origine (PNG/JPG) — dossier non encore fourni au dépôt
