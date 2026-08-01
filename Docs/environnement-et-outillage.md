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

## 6. Ce qui manque avant L1

- [ ] `potrace` (vectorisation)
- [ ] Serveur MCP « atelier » (annexe P § 6.2) — au moins `etat_projet`, `lancer_tests`, `capturer_ecran`
- [ ] Modèle TTS (Chatterbox ou XTTS-v2, annexe P § 4.1) — aucun n'est installé à ce jour
- [ ] Liste blanche de checkpoints et LoRA dans les workflows figés
- [ ] Les fiches d'exercices d'origine (PNG/JPG) — dossier non encore fourni au dépôt
