import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as KeyboardEventReact, MouseEvent as MouseEventReact, ReactElement } from 'react';
import type { CouleurColoriage, IdRegionSvg, RegionColoriable } from '@pierre/partage';
import { hexDeCouleur } from '@pierre/partage';

import { urlAsset } from '../../api/client.js';
import { CercleAccessible } from '../../composants/CercleAccessible.js';
import type { ProprietesSceneLibre } from './SceneLibre.js';
import { indexerRegionsDuMasque, regionAuPixel } from './raster-indexe.js';

const DIAMETRE_PRISE_MINIMAL = 96;

function chargerImage(chemin: string): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const image = new Image();
    image.onload = () => resoudre(image);
    image.onerror = () => rejeter(new Error(`Image raster introuvable : ${chemin}.`));
    image.src = urlAsset(chemin);
  });
}

function couleurRgb(couleur: CouleurColoriage): readonly [number, number, number] {
  const hex = hexDeCouleur(couleur).replace('#', '');
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function toucheDeValidation(touche: string): boolean {
  return touche === 'Enter' || touche === ' ';
}

/**
 * Rendu raster indexé : le fond et le trait restent des images d'auteur ; le code fabrique
 * uniquement les aplats entre les deux depuis un masque RGB invisible. Aucun filtre ne recolore
 * l'illustration entière et aucune approximation géométrique ne remplace ses vraies régions.
 */
export function SceneRasterIndexee({
  habillage,
  regionsOffertes,
  remplissages,
  onColorier,
  repli,
}: ProprietesSceneLibre & { readonly repli: ReactElement }): ReactElement {
  const raster = habillage.scene.rasterIndexe;
  if (raster === undefined) throw new Error('Une scène raster indexée doit déclarer ses trois couches.');

  const regions = useMemo<readonly RegionColoriable[]>(
    () => habillage.scene.calques.filter((c) => c.role === 'coloriable').flatMap((c) => c.regions),
    [habillage],
  );
  const offertes = useMemo(() => new Set(regionsOffertes.map(String)), [regionsOffertes]);
  const index = useMemo(() => indexerRegionsDuMasque(regions), [regions]);
  const masqueRef = useRef<ImageData | null>(null);
  const toileRef = useRef<HTMLCanvasElement | null>(null);
  const [revisionMasque, fixerRevisionMasque] = useState(0);
  const [masquePretPour, fixerMasquePretPour] = useState<string | null>(null);
  const [rasterIndisponible, fixerRasterIndisponible] = useState(false);

  useEffect(() => {
    let vivant = true;
    masqueRef.current = null;
    fixerMasquePretPour(null);
    fixerRasterIndisponible(false);
    void Promise.all([
      chargerImage(String(raster.fond)),
      chargerImage(String(raster.trait)),
      chargerImage(String(raster.masque)),
    ]).then(([, , image]) => {
      if (!vivant) return;
      const tampon = document.createElement('canvas');
      tampon.width = raster.largeur;
      tampon.height = raster.hauteur;
      const contexte = tampon.getContext('2d', { willReadFrequently: true });
      if (contexte === null) return;
      contexte.drawImage(image, 0, 0, raster.largeur, raster.hauteur);
      masqueRef.current = contexte.getImageData(0, 0, raster.largeur, raster.hauteur);
      fixerRevisionMasque((revision) => revision + 1);
      fixerMasquePretPour(String(raster.masque));
    }).catch(() => {
      if (!vivant) return;
      masqueRef.current = null;
      fixerMasquePretPour(null);
      fixerRasterIndisponible(true);
    });
    return () => { vivant = false; };
  }, [raster]);

  useEffect(() => {
    const toile = toileRef.current;
    const masque = masqueRef.current;
    if (toile === null || masque === null) return;
    const contexte = toile.getContext('2d');
    if (contexte === null) return;
    const sortie = contexte.createImageData(raster.largeur, raster.hauteur);
    for (let pixel = 0; pixel < masque.data.length; pixel += 4) {
      const region = regionAuPixel(
        index,
        masque.data[pixel] ?? 0,
        masque.data[pixel + 1] ?? 0,
        masque.data[pixel + 2] ?? 0,
        masque.data[pixel + 3] ?? 0,
      );
      if (region === null) continue;
      const couleur = remplissages[String(region)] as CouleurColoriage | undefined;
      const [rouge, vert, bleu] = couleur === undefined ? [217, 222, 231] : couleurRgb(couleur);
      sortie.data[pixel] = rouge;
      sortie.data[pixel + 1] = vert;
      sortie.data[pixel + 2] = bleu;
      sortie.data[pixel + 3] = 255;
    }
    contexte.putImageData(sortie, 0, 0);
  }, [index, raster, remplissages, revisionMasque]);

  const colorierDepuisPixel = (evenement: MouseEventReact<HTMLCanvasElement>): void => {
    const masque = masqueRef.current;
    if (masque === null) return;
    const boite = evenement.currentTarget.getBoundingClientRect();
    if (boite.width <= 0 || boite.height <= 0) return;
    const echelle = Math.min(boite.width / raster.largeur, boite.height / raster.hauteur);
    const largeurRendue = raster.largeur * echelle;
    const hauteurRendue = raster.hauteur * echelle;
    const decalageX = (boite.width - largeurRendue) / 2;
    const decalageY = (boite.height - hauteurRendue) / 2;
    const xRendu = evenement.clientX - boite.left - decalageX;
    const yRendu = evenement.clientY - boite.top - decalageY;
    if (xRendu < 0 || yRendu < 0 || xRendu >= largeurRendue || yRendu >= hauteurRendue) return;
    const x = Math.min(raster.largeur - 1, Math.floor(xRendu / echelle));
    const y = Math.min(raster.hauteur - 1, Math.floor(yRendu / echelle));
    const pixel = (y * raster.largeur + x) * 4;
    const region = regionAuPixel(index, masque.data[pixel] ?? 0, masque.data[pixel + 1] ?? 0, masque.data[pixel + 2] ?? 0, masque.data[pixel + 3] ?? 0);
    if (region !== null && offertes.has(String(region))) {
      onColorier(region, { clientX: evenement.clientX, clientY: evenement.clientY });
    }
  };

  const surClavier = (region: IdRegionSvg, evenement: KeyboardEventReact<SVGCircleElement>): void => {
    if (!toucheDeValidation(evenement.key)) return;
    evenement.preventDefault();
    onColorier(region, { clientX: 0, clientY: 0 });
  };

  if (rasterIndisponible) return repli;

  return (
    <div
      role="group"
      aria-label={habillage.libelle}
      data-scene-libre={habillage.id}
      data-decor="raster-indexe"
      data-masque-raster={masquePretPour === String(raster.masque) ? 'pret' : 'chargement'}
      style={{ position: 'relative', inlineSize: '100%', blockSize: '100%', overflow: 'hidden' }}
    >
      <img data-raster-couche="fond" src={urlAsset(String(raster.fond))} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, inlineSize: '100%', blockSize: '100%', objectFit: 'contain' }} />
      <canvas ref={toileRef} data-raster-couche="couleurs" width={raster.largeur} height={raster.hauteur} aria-hidden="true" onClick={colorierDepuisPixel} style={{ position: 'absolute', inset: 0, inlineSize: '100%', blockSize: '100%', objectFit: 'contain', cursor: 'pointer' }} />
      <img data-raster-couche="trait" src={urlAsset(String(raster.trait))} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, inlineSize: '100%', blockSize: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
      <svg
        viewBox={habillage.scene.viewBox}
        role="group"
        aria-label="Zones à colorier"
        style={{ position: 'absolute', inset: 0, inlineSize: '100%', blockSize: '100%', pointerEvents: 'none' }}
      >
        {regions.filter((region) => offertes.has(String(region.id))).map((region) => (
          <CercleAccessible
            key={region.id}
            cx={region.centroide[0]}
            cy={region.centroide[1]}
            rayonMinimal={DIAMETRE_PRISE_MINIMAL / 2}
            fill="transparent"
            data-cible-frappe="oui"
            data-region-svg={region.id}
            role="button"
            tabIndex={0}
            aria-label={region.libelle}
            onClick={(evenement) => onColorier(region.id, { clientX: evenement.clientX, clientY: evenement.clientY })}
            onKeyDown={(evenement) => surClavier(region.id, evenement)}
            // La prise reste un bouton pour le clavier et les technologies d'assistance.
            // Elle ne reçoit jamais le doigt : le canvas nomme la vraie couleur du masque.
            style={{ pointerEvents: 'none', cursor: 'pointer' }}
          />
        ))}
      </svg>
    </div>
  );
}
