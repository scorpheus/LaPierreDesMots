/**
 * Garde des frontières hors ligne que le portage Android n’avait pas entièrement fermées.
 *
 * Un `PortApiLocal` correct ne suffit pas si un composant conserve une route `/api` en dur :
 * en PWA, cette route serait demandée à GitHub Pages et rendrait du HTML 404 à la place d’un
 * manifeste, d’un réglage, d’un son ou d’une image. Ce fichier épingle les six portes mesurées
 * avant l’implantation PWA et la réécriture des images liées à l’intérieur des SVG.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { reecrireLiensAssetsDuSvg } from '@client/habillages/chargeur';
import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';
import { lireTexte } from '../configuration/preparation.js';

const FICHIERS_SANS_ROUTE_DIRECTE = [
  'client/src/services/voix-fichier.ts',
  'client/src/lecture/TexteSyllabe.tsx',
  'client/src/lecture/reglages-du-profil.tsx',
  'client/src/ecrans/EcranReglagesLecture.tsx',
  'client/src/composants/Gobi.tsx',
  'client/src/lecture/polices.ts'
] as const;

function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

describe('frontières du mode autonome Web', () => {
  it('fait passer chaque ressource et chaque réglage par le port local', () => {
    const fautifs = FICHIERS_SANS_ROUTE_DIRECTE.flatMap((fichier) => {
      const lignes = sansCommentaires(lireTexte(fichier)).split(/\r?\n/u);
      return lignes
        .map((ligne, index) => ({ fichier, ligne: index + 1, texte: ligne.trim() }))
        .filter(({ texte }) => /["'`]\/(?:api|polices)\//u.test(texte));
    });

    expect(
      fautifs,
      'une route absolue contournerait `PortApiLocal` ou la base Vite de GitHub Pages'
    ).toEqual([]);
  });

  it('réécrit les images `/api/contenu/assets/…` incluses dans un SVG chargé', () => {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '  <image href="/api/contenu/assets/assets/decors/ecole.png?version=1#fond"/>',
      "  <image href='/api/contenu/assets/assets/objets/soleil.svg'/>",
      '</svg>'
    ].join('\n');

    const reecrit = reecrireLiensAssetsDuSvg(
      svg,
      (chemin) => `/LaPierreDesMots/assets-produits/${chemin.replaceAll('/', '--')}`
    );

    expect(reecrit).toContain(
      'href="/LaPierreDesMots/assets-produits/assets--decors--ecole.png?version=1#fond"'
    );
    expect(reecrit).toContain(
      "href='/LaPierreDesMots/assets-produits/assets--objets--soleil.svg'"
    );
    expect(reecrit).not.toContain('/api/contenu/assets/');
  });

  it('le chargeur protège tous les SVG d’habillage actuellement livrés', () => {
    const exemple = readFileSync('contenu/habillages/clairiere/ecole-v2.svg', 'utf8');
    expect(exemple).toContain('/api/contenu/assets/');
    expect(
      reecrireLiensAssetsDuSvg(exemple, (chemin) => `/LaPierreDesMots/assets/${chemin}`)
    ).not.toContain('/api/contenu/assets/');
  });

  it('embarque le manifeste audio aussi bien que les clips qu’il référence', () => {
    expect(
      urlAssetAutonome('audio/manifeste.json'),
      '`VoixFichier` résout maintenant le manifeste par `urlAsset`, il doit donc être indexé'
    ).not.toBeNull();
  });
});
