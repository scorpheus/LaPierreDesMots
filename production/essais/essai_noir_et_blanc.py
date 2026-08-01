# -*- coding: utf-8 -*-
"""Essai controle : le noir et blanc impose degrade-t-il la generation ?

Protocole. UN sujet fixe, tire de la fiche de personnage. Deux familles de modeles.
Deux conditions de rendu qui ne different QUE par la clause de rendu et son negatif.
Les MEMES six graines partout. Aucune autre variable ne bouge.

  condition A  trait noir sur blanc impose par le prompt   (la methode actuelle)
  condition B  couleur, illustration jeunesse, sans contrainte de trait
  condition C  extraction du trait a partir de B           (post-traitement, autre script)

Usage : python production/essais/essai_noir_et_blanc.py
"""
import json, os, sys, time, urllib.request, urllib.parse, uuid

sys.stdout.reconfigure(encoding="utf-8")

HOTE = "127.0.0.1:8188"
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SORTIE = os.path.join(RACINE, "production", "essais")
JOURNAL = "journal-essai.json"

# --- LE SUJET, IDENTIQUE DANS TOUTES LES CONDITIONS -------------------------------------
# Tire de fiche-personnage-gobi.md section 2 et des decisions D20 (structure cristalline),
# D24 (deux bras courts) et D27 (sourcils releves, pupille nette, sourire franc, posture
# ouverte). Aucune oeuvre, aucun studio, aucun personnage existant n'est nomme (annexe P 3.3).
SUJET = (
    "a small round companion creature the size of a ball, "
    "one continuous rounded body outline covered in very short dense velvet fur, "
    "two short sturdy arms with simple round hands, two small round feet, no neck, "
    "two large round wide-set eyes with clear round pupils, raised friendly eyebrows, "
    "a wide open warm smile, "
    "a crest of five faceted crystal shards of uneven sizes growing along its head and back, "
    "one glowing faceted crystal shard at the center of its chest, "
    "open welcoming posture facing the viewer, full body, single character, centered"
)

# --- LES DEUX CONDITIONS : SEULE LA CLAUSE DE RENDU CHANGE -------------------------------
RENDU_A = (
    "black and white line art, clean bold black ink outlines of even weight, "
    "pure flat white background, no color, no shading, no grey, no hatching, "
    "coloring book style, closed clean contours"
)
RENDU_B = (
    "children's picture book illustration, soft warm colors, clean flat color shapes, "
    "gentle friendly modern cartoon style, simple plain pale background, "
    "appealing to a seven year old child"
)

# Base negative commune aux deux conditions -- rien qui touche au rendu.
NEG_BASE = (
    "text, letters, watermark, signature, logo, frame, border, "
    "extra limbs, extra arms, deformed hands, malformed, mutated, disfigured, "
    "menacing, sinister, creepy, scary, angry, snarling, sharp fangs, bared teeth, "
    "photorealistic, photograph, 3d render"
)
# La condition A ajoute SA contrainte de rendu -- c'est exactement cela qu'on teste.
NEG_A = NEG_BASE + ", color, colored, colorful, grey shading, gradient, painted"
NEG_B = NEG_BASE

CONDITIONS = {"A-trait": (RENDU_A, NEG_A), "B-couleur": (RENDU_B, NEG_B)}

# --- LES DEUX FAMILLES DE MODELES -------------------------------------------------------
# flux1-schnell : famille Flux, transformeur de flot rectifie, latent 16 canaux, CFG 1.
# damnPonyIllustrious : famille SDXL (entrainement Illustrious, illustration), CFG reel.
# Ce sont deux architectures distinctes, pas deux reglages du meme modele.
MODELES = {
    "flux": dict(ckpt="flux1-schnell-fp8.safetensors", pas=8, cfg=1.0,
                 sampler="euler", ordonnanceur="simple", latent="EmptySD3LatentImage"),
    "sdxl": dict(ckpt="damnPonyIllustrious_rebornIllustrious.safetensors", pas=28, cfg=6.0,
                 sampler="dpmpp_2m", ordonnanceur="karras", latent="EmptyLatentImage"),
}

GRAINES = [1001, 2002, 3003, 4004, 5005, 6006]
LARGEUR = HAUTEUR = 1024


def graphe(m, positif, negatif, graine, prefixe):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": m["ckpt"]}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": positif, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": negatif, "clip": ["1", 1]}},
        "4": {"class_type": m["latent"],
              "inputs": {"width": LARGEUR, "height": HAUTEUR, "batch_size": 1}},
        "5": {"class_type": "KSampler",
              "inputs": {"seed": graine, "steps": m["pas"], "cfg": m["cfg"],
                         "sampler_name": m["sampler"], "scheduler": m["ordonnanceur"],
                         "denoise": 1.0, "model": ["1", 0], "positive": ["2", 0],
                         "negative": ["3", 0], "latent_image": ["4", 0]}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage",
              "inputs": {"images": ["6", 0], "filename_prefix": prefixe}},
    }


def poster(chemin, charge):
    req = urllib.request.Request(f"http://{HOTE}{chemin}",
                                 data=json.dumps(charge).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def lire(chemin):
    with urllib.request.urlopen(f"http://{HOTE}{chemin}", timeout=60) as r:
        return json.loads(r.read())


def telecharger(img, destination):
    q = urllib.parse.urlencode({"filename": img["filename"],
                                "subfolder": img.get("subfolder", ""),
                                "type": img.get("type", "output")})
    with urllib.request.urlopen(f"http://{HOTE}/view?{q}", timeout=120) as r:
        open(destination, "wb").write(r.read())


def main():
    client = str(uuid.uuid4())
    attentes, journal = [], []

    for cle_m, m in MODELES.items():
        dossier = os.path.join(SORTIE, cle_m)
        os.makedirs(dossier, exist_ok=True)
        for cle_c, (rendu, negatif) in CONDITIONS.items():
            positif = f"{rendu}, {SUJET}"
            for g in GRAINES:
                nom = f"{cle_m}_{cle_c}_g{g}"
                rep = poster("/prompt", {"prompt": graphe(m, positif, negatif, g, nom),
                                         "client_id": client})
                attentes.append((nom, rep["prompt_id"], os.path.join(dossier, nom + ".png")))
                journal.append(dict(nom=nom, modele=cle_m, condition=cle_c, graine=g,
                                    checkpoint=m["ckpt"], pas=m["pas"], cfg=m["cfg"],
                                    sampler=m["sampler"], ordonnanceur=m["ordonnanceur"],
                                    resolution=[LARGEUR, HAUTEUR],
                                    prompt=positif, negatif=negatif))
                print(f"soumis  {nom}")

    print(f"\n{len(attentes)} taches en file. Attente des rendus...")
    produits, debut = [], time.time()
    for nom, pid, dest in attentes:
        while True:
            if time.time() - debut > 2400:
                print(f"ABANDON (2400 s ecoulees) : {nom}")
                break
            hist = lire(f"/history/{pid}")
            if pid in hist:
                images = hist[pid].get("outputs", {}).get("7", {}).get("images", [])
                if not images:
                    print(f"AUCUNE IMAGE pour {nom} -- graphe rejete ?")
                    break
                telecharger(images[0], dest)
                print(f"recupere {nom:28} {os.path.getsize(dest)//1024:5} Ko")
                produits.append(dest)
                break
            time.sleep(2)

    with open(os.path.join(SORTIE, JOURNAL), "w", encoding="utf-8") as f:
        json.dump(journal, f, ensure_ascii=False, indent=2)

    attendu = len(MODELES) * len(CONDITIONS) * len(GRAINES)
    print(f"\nCONTRAT DE SORTIE : {len(produits)}/{attendu} images produites "
          f"en {time.time()-debut:.0f} s")
    sys.exit(0 if len(produits) == attendu else 1)


if __name__ == "__main__":
    main()
