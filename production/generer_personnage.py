# -*- coding: utf-8 -*-
"""Pilote ComfyUI par son API HTTP pour produire des propositions de personnage.

Conforme a l'annexe P section 3.4 : la structure du graphe est figee, seuls le prompt,
la graine et la resolution sont modifiables. Trait noir sur blanc uniquement --
la couleur vient du code (annexe P section 2).

Usage : python production/generer_personnage.py
"""
import json, os, sys, time, urllib.request, urllib.parse, uuid

sys.stdout.reconfigure(encoding="utf-8")

HOTE = "127.0.0.1:8188"
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERIE = "serie-05-heros-enfant"
SORTIE = os.path.join(RACINE, "production", "personnages", "gobi", SERIE)

# --- Style partage : figé, jamais reecrit proposition par proposition (annexe P 3.3) -----
# NOTE : a CFG 1 (Flux schnell) le prompt negatif est INERTE. Toute contrainte doit etre
# formulee en POSITIF dans le prompt principal, sinon elle est ignoree.
# Serie 02 : la serie 01 etait trop "kawaii". On vise un COMPAGNON D'AVENTURE qui guide,
# pas une peluche. Leviers correctifs, tous formules en positif :
#   - yeux PETITS a pupille nette + SOURCILS marques  (c'est le sourcil qui fait le caractere)
#   - trait franchement EPAIS, encre au pinceau, epaisseur variable
#   - posture de trois-quarts, dynamique, jamais de face statique
#   - des BRAS : la contrainte "pas de bras" de la v2 4.2 est levee (voir D24)
STYLE = (
    "bold black and white ink illustration, thick heavy confident brush outlines with "
    "varying line weight, pure flat white background, no shading, no hatching, no grey, "
    "european adventure comic book character design, ligne claire, shonen hero energy, "
    "expressive character with strong silhouette, full body, single character, "
    "three-quarter view, dynamic confident stance"
)

# Serie 03 : la serie 02 a corrige le kawaii mais a bascule vers l'ANTAGONISTE -- regard en
# coin, sourcils fronces, sourire narquois. Or les specs bannissent l'antagoniste incarne
# (v2 3.1) et veulent un "grand frere bienveillant, jamais le maitre" (v2 2).
# Principe correctif : CARACTERE N'EST PAS DURETE. L'energie et la complicite font le "cool"
# a 7 ans, pas la menace. Base retenue : la proposition 06 (rond + bras + accessoire),
# dont on corrige l'expression, plus le dynamisme de la 08.
# Serie 04 : les series 01-03 ont echoue en trois temps -- trop bebe, trop antagoniste,
# puis trop dodu et trop proche de l'orc. Cap fixe par l'utilisateur : UN HEROS.
# Silhouette ATHLETIQUE et elancee, visage NOBLE et bienveillant, allure fiere.
# Le negatif (actif a CFG 7) interdit desormais explicitement corpulence, orc et grimace.
# Serie 05. Quatre echecs successifs ont cadre la cible par elimination :
#   01 trop bebe · 02 trop antagoniste · 03 trop dodu et proche de l'orc · 04 adulte musclé.
# La cle etait dans les specs depuis le debut (v2 section 2, Les Legendaires) :
# LES HEROS SONT DES ENFANTS, ET C'EST UNE CONDITION, PAS UN HANDICAP.
# Donc : proportions ENFANTINES -- grosse tete, petit corps, membres courts --
# mais posture, equipement et regard de HEROS. Petit, parce qu'il tient a cote de
# l'enfant a l'ecran ; heroique, parce qu'il guide.
VISAGE = (
    "a kind youthful child-like face, big round friendly eyes with large bright pupils, "
    "soft thin arched eyebrows, a warm open confident smile, "
    "brave encouraging expression, the look of a trusted big brother"
)

ENFANT_HEROS = (
    "chibi child proportions, large head, small compact body, short arms and short legs, "
    "small stature, cute but brave, "
    "a few faceted crystal shards growing on its shoulders like light natural armour, "
    "one glowing faceted crystal set in the middle of its chest"
)

PROPOSITIONS = [
    ("17-felin-cape",
     f"a small heroic cat-like creature cub standing on two legs, {ENFANT_HEROS}, {VISAGE}, "
     "a flowing tattered hero cape caught in the wind, one small fist raised high in triumph, "
     "brave little hero striking a victory pose"),
    ("18-gardien-echarpe",
     f"a small young guardian spirit creature, {ENFANT_HEROS}, {VISAGE}, "
     "smooth skin with simple carved geometric marks, short pointed ears, "
     "a long light scarf streaming behind in the wind, "
     "one arm outstretched pointing the way forward, eager to lead"),
    ("19-louveteau",
     f"a small wolf cub creature standing on two legs, {ENFANT_HEROS}, {VISAGE}, "
     "a long scarf and a little explorer satchel at the hip, bushy tail, "
     "caught mid-run leaning forward with one arm reaching ahead, full of momentum"),
    ("20-porte-cristal",
     f"a small heroic creature cub, {ENFANT_HEROS}, {VISAGE}, short cape, "
     "holding a large radiant faceted crystal above its head with both small hands, "
     "standing proudly on tiptoes, triumphant, sharing the light it just won"),
]

# --- Modele : SDXL a CFG 7, ou le prompt NEGATIF fonctionne reellement ------------------
# Flux schnell tournait a CFG 1 : le negatif y est inerte, impossible d'interdire quoi que ce
# soit. C'est ce qui a laisse passer les dents pointues, les yeux inquietants et la corpulence.
# juggernautXL accepte un vrai guidage : les interdits ci-dessous sont enfin opposables.
# juggernautXL (photorealiste) a produit des super-heros ADULTES musclés en costume moulant,
# avec des facettes et des gris. On passe sur un modele d'illustration, mieux adapte au
# design de personnage stylise jeunesse.
CHECKPOINT = "damnPonyIllustrious_rebornIllustrious.safetensors"
PAS, CFG, SAMPLER, ORDONNANCEUR = 28, 6.0, "dpmpp_2m", "karras"

NEGATIF = (
    # corpulence et registre monstrueux (echecs des series 02 et 03)
    "fat, chubby, obese, round belly, blob, potato shaped, "
    "orc, goblin, troll, ogre, gremlin, grotesque, ugly, "
    "sharp fangs, snarling, bared teeth, too many teeth, drool, warts, "
    # regard (echec signale : les yeux ne font pas gentil)
    "menacing, sinister, creepy, scary, angry, smirking, side-eye, squinting, "
    "furrowed brows, thick black eyebrows, eyelashes, huge kawaii eyes, "
    # adulte et super-heros (echec de la serie 04)
    "adult, grown man, muscular, bodybuilder, six-pack, abs, tall, long legs, "
    "superhero costume, spandex, bodysuit, armor plating, sexy, "
    # rendu
    "color, colored, grey shading, gradient, crosshatching, faceted polygons, "
    "watermark, text, signature, logo, background scenery"
)

GRAPHE = {
    "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
    "2": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["1", 1]}},
    "3": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIF, "clip": ["1", 1]}},
    "4": {"class_type": "EmptyLatentImage",
          "inputs": {"width": 832, "height": 1216, "batch_size": 1}},
    "5": {"class_type": "KSampler",
          "inputs": {"seed": 0, "steps": PAS, "cfg": CFG, "sampler_name": SAMPLER,
                     "scheduler": ORDONNANCEUR, "denoise": 1.0,
                     "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
                     "latent_image": ["4", 0]}},
    "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
    "7": {"class_type": "SaveImage",
          "inputs": {"images": ["6", 0], "filename_prefix": "gobi"}},
}


def poster(chemin, charge):
    donnees = json.dumps(charge).encode("utf-8")
    req = urllib.request.Request(f"http://{HOTE}{chemin}", data=donnees,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def lire(chemin):
    with urllib.request.urlopen(f"http://{HOTE}{chemin}", timeout=30) as r:
        return json.loads(r.read())


def telecharger(nom, sous_dossier, type_dossier, destination):
    q = urllib.parse.urlencode({"filename": nom, "subfolder": sous_dossier, "type": type_dossier})
    with urllib.request.urlopen(f"http://{HOTE}/view?{q}", timeout=60) as r:
        with open(destination, "wb") as f:
            f.write(r.read())


def main():
    os.makedirs(SORTIE, exist_ok=True)
    client = str(uuid.uuid4())
    attentes = []

    for index, (nom, sujet) in enumerate(PROPOSITIONS):
        graphe = json.loads(json.dumps(GRAPHE))          # copie profonde
        graphe["2"]["inputs"]["text"] = f"{STYLE}, {sujet}"
        graphe["5"]["inputs"]["seed"] = 100000 + index * 7717   # graine fixe = reproductible
        graphe["7"]["inputs"]["filename_prefix"] = f"gobi_{nom}"
        reponse = poster("/prompt", {"prompt": graphe, "client_id": client})
        attentes.append((nom, reponse["prompt_id"]))
        print(f"soumis  {nom}  -> {reponse['prompt_id']}")

    print("\nattente des rendus...")
    produits = []
    debut = time.time()
    for nom, pid in attentes:
        while True:
            if time.time() - debut > 600:
                print(f"ABANDON apres 600 s : {nom}")
                break
            hist = lire(f"/history/{pid}")
            if pid in hist:
                sorties = hist[pid].get("outputs", {})
                images = sorties.get("7", {}).get("images", [])
                if not images:
                    print(f"AUCUNE IMAGE pour {nom} -- graphe rejete ?")
                    break
                img = images[0]
                dest = os.path.join(SORTIE, f"{nom}.png")
                telecharger(img["filename"], img.get("subfolder", ""), img.get("type", "output"), dest)
                ko = os.path.getsize(dest) // 1024
                print(f"recupere {nom:24} {ko:5} Ko  -> {dest}")
                produits.append(dest)
                break
            time.sleep(2)

    print(f"\nCONTRAT DE SORTIE : {len(produits)}/{len(PROPOSITIONS)} images produites")
    if len(produits) != len(PROPOSITIONS):
        sys.exit(1)


if __name__ == "__main__":
    main()
