# -*- coding: utf-8 -*-
"""Mesure technique des images d'essai, et extraction du trait (condition C).

Rien n'est affirme ici : tout est compte. Les grandeurs mesurees sont celles dont depend
la suite du pipeline (annexe P section 3.2 et 3.5) :

  saturation_moy   saturation HSV moyenne du sujet -- une image "noir et blanc" doit etre a 0
  fond_blanc_%     part de pixels blancs purs dans la bordure exterieure (2 %)
  encre_%          part de pixels d'encre apres binarisation
  epaisseur_px     epaisseur mediane du trait, estimee par transformee de distance (4*moy)
  regions          nombre de regions fermees coloriables (composantes du blanc, hors fond)
  fuite            le remplissage par diffusion depuis l'exterieur atteint-il l'interieur ?
  composantes      nombre de composantes connexes d'encre (proxy du nombre de chemins SVG)

Le test de fuite est celui de l'annexe P : on inonde le blanc depuis les quatre coins ; si
l'inondation couvre plus de 55 % de l'interieur de la boite englobante du sujet, la
silhouette n'est pas fermee et l'asset serait rejete.

Usage : python production/essais/qc_technique.py
"""
import csv, glob, json, os, sys
import cv2
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
ESSAIS = os.path.dirname(os.path.abspath(__file__))


def xdog(gris, sigma=0.8, k=1.6, tau=0.98):
    """Difference de gaussiennes etendue -- l'extracteur de trait standard pour
    l'illustration. Rend un trait continu, la ou Canny rend des bords brises."""
    g1 = cv2.GaussianBlur(gris, (0, 0), sigma)
    g2 = cv2.GaussianBlur(gris, (0, 0), sigma * k)
    d = g1 - tau * g2
    d = (d - d.min()) / max(d.max() - d.min(), 1e-6)
    return (d * 255).astype(np.uint8)


def binariser(bgr, mode):
    gris = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if mode == "extraction":
        gris = xdog(gris.astype(np.float32))
        _, b = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        encre = (b == 0).astype(np.uint8)
        # fermeture morphologique : le pipeline la fait aussi (annexe P 3.2)
        encre = cv2.morphologyEx(encre, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    else:
        _, b = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        encre = (b == 0).astype(np.uint8)
    return encre


def mesurer(chemin, mode):
    bgr = cv2.imread(chemin)
    h, w = bgr.shape[:2]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    sat = float(hsv[:, :, 1].mean())

    m = max(2, int(0.02 * h))
    bord = np.concatenate([bgr[:m].reshape(-1, 3), bgr[-m:].reshape(-1, 3),
                           bgr[:, :m].reshape(-1, 3), bgr[:, -m:].reshape(-1, 3)])
    fond_blanc = float((bord.min(axis=1) >= 250).mean() * 100)

    encre = binariser(bgr, mode)
    encre_pct = float(encre.mean() * 100)

    dt = cv2.distanceTransform(encre, cv2.DIST_L2, 5)
    epaisseur = float(4 * dt[encre > 0].mean()) if encre.any() else 0.0

    n_comp, _ = cv2.connectedComponents(encre, connectivity=8)
    composantes = n_comp - 1

    blanc = 1 - encre
    n_lab, lab, stats, _ = cv2.connectedComponentsWithStats(blanc, connectivity=4)
    fond_ids = {lab[0, 0], lab[0, w - 1], lab[h - 1, 0], lab[h - 1, w - 1]}
    mini = 0.0005 * h * w
    regions = sum(1 for i in range(1, n_lab)
                  if i not in fond_ids and stats[i, cv2.CC_STAT_AREA] >= mini)

    ys, xs = np.nonzero(encre)
    if len(xs) == 0:
        return dict(saturation_moy=sat, fond_blanc=fond_blanc, encre=encre_pct,
                    epaisseur=0, regions=0, composantes=0, fuite=True, remplissage=100.0)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    interieur = np.isin(lab[y0:y1 + 1, x0:x1 + 1], list(fond_ids))
    remplissage = float(interieur.mean() * 100)   # % de la boite envahi par le fond
    return dict(saturation_moy=sat, fond_blanc=fond_blanc, encre=encre_pct,
                epaisseur=epaisseur, regions=regions, composantes=composantes,
                fuite=bool(remplissage > 55), remplissage=remplissage)


def main():
    lignes = []

    # conditions A / B / D / E : mesure directe
    for f in sorted(glob.glob(os.path.join(ESSAIS, "*", "*.png"))):
        nom = os.path.basename(f)[:-4]
        if "_extrait" in nom:
            continue
        modele, condition, graine = nom.split("_")
        lignes.append(dict(condition=condition, modele=modele, graine=graine,
                           fichier=nom, **mesurer(f, "direct")))

    # condition C : extraction du trait a partir des images COULEUR de la condition B
    dossier_c = os.path.join(ESSAIS, "C-extraction")
    os.makedirs(dossier_c, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(ESSAIS, "*", "*_B-couleur_*.png"))):
        nom = os.path.basename(f)[:-4]
        bgr = cv2.imread(f)
        encre = binariser(bgr, "extraction")
        dest = os.path.join(dossier_c, nom.replace("B-couleur", "C-extrait") + ".png")
        cv2.imwrite(dest, ((1 - encre) * 255).astype(np.uint8))
        modele, _, graine = nom.split("_")
        lignes.append(dict(condition="C-extrait", modele=modele, graine=graine,
                           fichier=os.path.basename(dest)[:-4], **mesurer(f, "extraction")))

    champs = ["condition", "modele", "graine", "fichier", "saturation_moy", "fond_blanc",
              "encre", "epaisseur", "regions", "composantes", "remplissage", "fuite"]
    with open(os.path.join(ESSAIS, "qc-technique.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, champs)
        w.writeheader()
        for l in lignes:
            w.writerow({k: (round(v, 2) if isinstance(v, float) else v)
                        for k, v in l.items() if k in champs})

    print(f"{len(lignes)} images mesurees\n")
    entete = f"{'condition':14}{'mod':6}{'sat':>7}{'fond%':>8}{'encre%':>8}" \
             f"{'ep.px':>7}{'regions':>9}{'compos.':>9}{'fuites':>8}"
    print(entete)
    print("-" * len(entete))
    cles = sorted({(l["condition"], l["modele"]) for l in lignes})
    for c, m in cles:
        g = [l for l in lignes if l["condition"] == c and l["modele"] == m]
        moy = lambda k: sum(x[k] for x in g) / len(g)
        print(f"{c:14}{m:6}{moy('saturation_moy'):7.1f}{moy('fond_blanc'):8.1f}"
              f"{moy('encre'):8.2f}{moy('epaisseur'):7.1f}{moy('regions'):9.1f}"
              f"{moy('composantes'):9.0f}"
              f"{sum(1 for x in g if x['fuite']):5d}/{len(g)}")


if __name__ == "__main__":
    main()
