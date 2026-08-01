# -*- coding: utf-8 -*-
"""Chargeur de workflows figes, avec liste blanche BLOQUANTE.

Pourquoi ce fichier existe. `environnement-et-outillage.md` section 3 exige que le chargement
d'un modele hors liste blanche soit une **erreur bloquante, pas un defaut silencieux** ; et
l'annexe P section 3.4 interdit a l'agent de toucher a la structure du graphe. Une liste blanche
ecrite dans un document ne bloque rien. Celle-ci s'execute.

Ce que le chargeur garantit mecaniquement :

  1. tout nom de modele apparaissant dans le graphe est dans la liste blanche, sinon `ValueError` ;
  2. seuls le prompt, la graine, la resolution et le prefixe de fichier sont modifiables ;
     toute autre cle refusee par `patcher()` leve `KeyError` ;
  3. les cles de commentaire (`_...`) sont retirees avant l'envoi a ComfyUI.

Usage :
    from charger import charger, patcher, soumettre
    g = charger("personnage-exploration.api.json")
    g = patcher(g, sujet="a small round companion creature ...", graine=1001)
    images = soumettre(g)
"""
import json
import os
import time
import urllib.parse
import urllib.request
import uuid

HOTE = os.environ.get("COMFYUI_HOTE", "127.0.0.1:8188")
ICI = os.path.dirname(os.path.abspath(__file__))

# --- LISTE BLANCHE ----------------------------------------------------------------------
# Contrainte produit : application pour un enfant de 7 ans, produite par un agent. La
# bibliotheque de cette installation compte 15 checkpoints, 19 UNET et 48 LoRA, dont une
# large part orientee adulte. Rien n'entre ici sans raison ecrite.
#
# MESURE = la configuration a franchi la porte technique du depot, chiffres a l'appui.
# SOUS_RESERVE = le fichier est present et documente pour cet usage, mais AUCUNE mesure de ce
# depot ne l'appuie encore. Le chargeur l'accepte et le signale ; le premier usage doit
# produire une mesure.
AUTORISES_MESURES = {
    "flux1-schnell-fp8.safetensors":
        "6/6 a la porte technique (essais/qc-technique.csv, lignes A-trait/flux)",
    "qwen_image_edit_2511_bf16.safetensors":
        "declinaison depuis canonique, mesuree dans Docs/guide-comfyui.md section 4",
    "qwen_2.5_vl_7b_fp8_scaled.safetensors": "encodeur de qwen_image_edit_2511",
    "qwen_image_vae.safetensors": "VAE de qwen_image_edit_2511",
}

AUTORISES_SOUS_RESERVE = {
    "qwen_image_edit_2511_fp8mixed.safetensors": "meme modele, empreinte VRAM reduite",
    "flux1-fill-dev.safetensors": "inpainting regional de la crete de cristaux",
    "flux1-dev.safetensors": "rendu final plus lent que schnell — a mesurer avant adoption",
    "flux1-dev-kontext_fp8_scaled.safetensors": "repli d'edition si Qwen Edit derive",
    "flux1-canny-dev.safetensors": "guidage de structure par contour",
    "flux1-depth-dev.safetensors": "guidage de structure par profondeur",
    "clip_l.safetensors": "encodeur Flux (1/2)",
    "t5xxl_fp8_e4m3fn_scaled.safetensors": "encodeur Flux (2/2)",
    "ae.safetensors": "VAE Flux",
    "FLUX\\FLUX.1-dev-ControlNet-Union-Pro-2.0.safetensors": "ControlNet de la chaine Flux",
    "Qwen-Image-InstantX-ControlNet-Union.safetensors": "ControlNet de la chaine Qwen",
    "FLUX.1-Turbo-Alpha.safetensors": "LoRA technique — distillation Flux 8 pas, aucun style",
    "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors":
        "LoRA technique — distillation Qwen Edit 4 pas, aucun style. ATTENTION : l'activer "
        "ramene le modele a CFG 1 et rend le prompt negatif INERTE",
}

AUTORISES = {**AUTORISES_MESURES, **AUTORISES_SOUS_RESERVE}

# Motif d'exclusion explicite, pour qu'aucune session ne les redecouvre comme candidats.
EXCLUS = {
    "damnPonyIllustrious_rebornIllustrious.safetensors":
        "0/24 mesure a la porte technique, dans les quatre conditions testees "
        "(essais/qc-technique.csv). Ne sait pas dessiner au trait : il photographie un objet. "
        "A coute la serie 05 entiere.",
    "juggernautXL_juggXIByRundiffusion.safetensors":
        "base photorealiste. A produit des super-heros adultes musclés — la serie 04 entiere.",
    "cyberrealisticPony_v110.safetensors": "base photorealiste orientee adulte",
    "cyberrealistic_v80Inpainting.safetensors": "base photorealiste orientee adulte",
    "lustifySDXLNSFW_oltFIXEDTEXTURES.safetensors": "explicitement pour adultes",
    "NetaYumev35_pretrained_all_in_one.safetensors": "corpus anime non maitrise",
    "colossusProjectFlux_v12BehemothAIO.safetensors": "fusion tierce, corpus non maitrise",
    "SDXL\\controlnet-union-sdxl-1.0\\diffusion_pytorch_model_promax.safetensors":
        "aucun modele SDXL n'etant autorise, ce ControlNet n'a plus de modele auquel "
        "s'appliquer. L'inventaire le proposait en meme temps qu'un checkpoint SDXL "
        "d'exploration : les deux tombent ensemble.",
}

# Les champs de chaque noeud susceptibles de nommer un modele.
CHAMPS_MODELE = ("ckpt_name", "unet_name", "clip_name", "clip_name1", "clip_name2",
                 "vae_name", "lora_name", "control_net_name", "style_model_name",
                 "clip_vision_name", "model_name")

# VAE approximatifs integres a ComfyUI, sans fichier : ils ne sont pas des modeles tiers.
VAE_INTEGRES = {"taef1", "taesd", "taesd3", "taesdxl", "pixel_space"}


class ModeleInterdit(ValueError):
    """Un graphe reference un modele absent de la liste blanche. Erreur BLOQUANTE."""


def verifier_liste_blanche(graphe, chemin="<memoire>"):
    """Leve ModeleInterdit au premier modele hors liste. Renvoie la liste des noms sous reserve."""
    sous_reserve = []
    for id_noeud, noeud in graphe.items():
        if id_noeud.startswith("_"):
            continue
        for champ, valeur in (noeud.get("inputs") or {}).items():
            if champ not in CHAMPS_MODELE or not isinstance(valeur, str):
                continue
            if valeur in VAE_INTEGRES:
                continue
            if valeur in EXCLUS:
                raise ModeleInterdit(
                    f"{chemin} noeud {id_noeud}.{champ} = {valeur!r}\n"
                    f"  EXCLU : {EXCLUS[valeur]}")
            if valeur not in AUTORISES:
                raise ModeleInterdit(
                    f"{chemin} noeud {id_noeud}.{champ} = {valeur!r}\n"
                    f"  hors liste blanche. Ajouter une entree motivee dans "
                    f"production/workflows/charger.py, ou changer de modele.")
            if valeur in AUTORISES_SOUS_RESERVE:
                sous_reserve.append(valeur)
    return sous_reserve


def charger(nom, verbeux=True):
    """Lit un workflow fige, retire les commentaires, verifie la liste blanche."""
    chemin = nom if os.path.isabs(nom) else os.path.join(ICI, nom)
    with open(chemin, encoding="utf-8") as f:
        brut = json.load(f)
    graphe = {k: v for k, v in brut.items() if not k.startswith("_")}
    sous_reserve = verifier_liste_blanche(graphe, os.path.basename(chemin))
    if verbeux and sous_reserve:
        for m in sorted(set(sous_reserve)):
            print(f"  [sous reserve] {m} — {AUTORISES_SOUS_RESERVE[m]}")
    return graphe


def _noeud(graphe, classe):
    ids = [i for i, n in graphe.items() if n["class_type"] == classe]
    if len(ids) != 1:
        raise KeyError(f"{len(ids)} noeud(s) {classe} dans ce graphe, 1 attendu")
    return ids[0]


def _noeuds(graphe, classe):
    return [i for i, n in graphe.items() if n["class_type"] == classe]


def patcher(graphe, sujet=None, instruction=None, cristal=None, graine=None,
            largeur=None, hauteur=None, prefixe=None, image=None, masque=None,
            megapixels=None):
    """Applique les SEULES modifications autorisees (annexe P 3.4).

    Le sujet est substitue au marqueur {SUJET} / {INSTRUCTION} / {CRISTAL} a l'interieur
    de la clause de rendu figee : le fragment de style n'est jamais reecrit, il est
    complete. C'est la traduction mecanique de l'annexe P 3.3.
    """
    g = json.loads(json.dumps(graphe))

    if sujet is not None or instruction is not None or cristal is not None:
        remplace = {"{SUJET}": sujet, "{INSTRUCTION}": instruction, "{CRISTAL}": cristal}
        touche = 0
        for i, n in g.items():
            champ = "prompt" if "prompt" in n["inputs"] else (
                "text" if "text" in n["inputs"] else None)
            if champ is None or not isinstance(n["inputs"][champ], str):
                continue
            for marqueur, valeur in remplace.items():
                if valeur is not None and marqueur in n["inputs"][champ]:
                    n["inputs"][champ] = n["inputs"][champ].replace(marqueur, valeur)
                    touche += 1
        if touche == 0:
            raise KeyError("aucun marqueur {SUJET}/{INSTRUCTION}/{CRISTAL} trouve dans ce "
                           "graphe — le workflow ne correspond pas a l'appel")

    if graine is not None:
        g[_noeud(g, "KSampler")]["inputs"]["seed"] = int(graine)

    if largeur is not None or hauteur is not None:
        ids = _noeuds(g, "EmptySD3LatentImage") + _noeuds(g, "EmptyLatentImage")
        if not ids:
            raise KeyError("ce workflow n'a pas de canevas vide : sa resolution est celle "
                           "de l'image de reference, elle se regle par `megapixels`")
        for i in ids:
            if largeur is not None:
                g[i]["inputs"]["width"] = int(largeur)
            if hauteur is not None:
                g[i]["inputs"]["height"] = int(hauteur)

    if megapixels is not None:
        for i in _noeuds(g, "ImageScaleToTotalPixels"):
            g[i]["inputs"]["megapixels"] = float(megapixels)

    if image is not None:
        g[_noeud(g, "LoadImage")]["inputs"]["image"] = image

    if masque is not None:
        g[_noeud(g, "LoadImageMask")]["inputs"]["image"] = masque

    if prefixe is not None:
        g[_noeud(g, "SaveImage")]["inputs"]["filename_prefix"] = prefixe

    verifier_liste_blanche(g, "<apres patch>")
    return g


# --- pilotage HTTP (annexe P 3.4) -------------------------------------------------------

def _poster(chemin, charge):
    req = urllib.request.Request(f"http://{HOTE}{chemin}",
                                 data=json.dumps(charge).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def _lire(chemin):
    with urllib.request.urlopen(f"http://{HOTE}{chemin}", timeout=60) as r:
        return json.loads(r.read())


def televerser(chemin_local, nom_distant=None, sous_dossier=""):
    """POST /upload/image — depose une image dans le dossier d'entree de ComfyUI.

    Indispensable a personnage-declinaison / -planche / -cristal : leur noeud LoadImage
    ne connait que des fichiers deja presents cote serveur.
    """
    nom = nom_distant or os.path.basename(chemin_local)
    frontiere = "----" + uuid.uuid4().hex
    corps = []

    def champ(nom_champ, valeur):
        corps.append(f"--{frontiere}\r\nContent-Disposition: form-data; "
                     f'name="{nom_champ}"\r\n\r\n{valeur}\r\n'.encode("utf-8"))

    corps.append(f"--{frontiere}\r\nContent-Disposition: form-data; name=\"image\"; "
                 f'filename="{nom}"\r\nContent-Type: image/png\r\n\r\n'.encode("utf-8"))
    corps.append(open(chemin_local, "rb").read())
    corps.append(b"\r\n")
    champ("overwrite", "true")
    if sous_dossier:
        champ("subfolder", sous_dossier)
    corps.append(f"--{frontiere}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        f"http://{HOTE}/upload/image", data=b"".join(corps),
        headers={"Content-Type": f"multipart/form-data; boundary={frontiere}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        rep = json.loads(r.read())
    return rep["name"] if not rep.get("subfolder") else f"{rep['subfolder']}/{rep['name']}"


def soumettre(graphe, destination=None, delai=900):
    """Soumet, attend, telecharge. Renvoie la liste des chemins locaux ecrits.

    Le graphe est renvoye tel quel a ComfyUI : si un champ est invalide, l'API repond 400
    avec `node_errors`, et c'est cette erreur qu'on veut voir, pas un silence.
    """
    client = str(uuid.uuid4())
    rep = _poster("/prompt", {"prompt": graphe, "client_id": client})
    pid = rep["prompt_id"]
    id_save = _noeud(graphe, "SaveImage")

    debut = time.time()
    while time.time() - debut < delai:
        hist = _lire(f"/history/{pid}")
        if pid in hist:
            images = hist[pid].get("outputs", {}).get(id_save, {}).get("images", [])
            if not images:
                raise RuntimeError(f"aucune image pour {pid} — "
                                   f"{hist[pid].get('status', {}).get('messages')}")
            sortis = []
            for k, img in enumerate(images):
                q = urllib.parse.urlencode({"filename": img["filename"],
                                            "subfolder": img.get("subfolder", ""),
                                            "type": img.get("type", "output")})
                with urllib.request.urlopen(f"http://{HOTE}/view?{q}", timeout=120) as r:
                    donnees = r.read()
                if destination:
                    cible = destination if len(images) == 1 else \
                        f"{os.path.splitext(destination)[0]}-{k}.png"
                    os.makedirs(os.path.dirname(cible), exist_ok=True)
                    open(cible, "wb").write(donnees)
                    sortis.append(cible)
            return sortis
        time.sleep(1.5)
    raise TimeoutError(f"{delai} s ecoulees sans rendu pour {pid}")


if __name__ == "__main__":
    import glob
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"liste blanche : {len(AUTORISES_MESURES)} mesures + "
          f"{len(AUTORISES_SOUS_RESERVE)} sous reserve = {len(AUTORISES)} fichiers autorises")
    print(f"exclusions motivees : {len(EXCLUS)}\n")
    for f in sorted(glob.glob(os.path.join(ICI, "*.api.json"))):
        try:
            g = charger(f, verbeux=False)
            print(f"  OK   {os.path.basename(f):34} {len(g):2} noeuds")
        except Exception as e:
            print(f"  ECHEC {os.path.basename(f):34} {e}")
