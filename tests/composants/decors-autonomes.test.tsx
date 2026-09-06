import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MoteurPlace } from '@client/moteurs/place/MoteurPlace';
import { MoteurColorie } from '@client/moteurs/colorie/MoteurColorie';
import { moteurPlace } from '@partage/moteurs/place/moteur';
import { moteurColorie } from '@partage/moteurs/colorie/moteur';
import type { ContenuPlace, ContenuColorie, Exercice, Habillage } from '@pierre/partage';
import { lireJson, servicesDeTest, habillageEcole, CHEMIN_EXERCICE_ECOLE } from '../configuration/preparation.js';

vi.mock('@client/api/client', () => ({ urlAsset: (chemin: string) => `/paquet/${chemin}` }));
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    expect(url.startsWith('/paquet/')).toBe(true);
    return new Response(readFileSync(join(process.cwd(), 'contenu', url.slice('/paquet/'.length)), 'utf8'));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function verifierFond(conteneur: HTMLElement): Promise<void> {
  await waitFor(() => {
    const images = [...conteneur.querySelectorAll('svg image')];
    expect(images.length, 'le vrai décor doit être chargé avant de juger ses URL').toBeGreaterThan(0);
    expect(images.map(image => image.getAttribute('href'))).toContain('/paquet/assets/decors/ecole.png');
    expect(conteneur.querySelectorAll('[href^="/api/"]')).toHaveLength(0);
  });
}

it('le placement résout aussi les images internes de son SVG, sans serveur LAN', async () => {
  const contenu = lireJson<Exercice>('contenu/exercices/clairiere/ecole-02-place.json').jeu.contenu as ContenuPlace;
  const habillage = lireJson<Habillage>('contenu/habillages/clairiere/ecole-place.habillage.json');
  const services = servicesDeTest();
  const etat = moteurPlace.creerEtat({ contenu, habillage, alea: services.alea, horloge: services.horloge });
  const vue = render(<MoteurPlace contenu={contenu} habillage={habillage} etat={etat} services={services} emettre={() => undefined} animationsDesactivees />);
  await verifierFond(vue.container);
});

it('le coloriage résout aussi les images internes de son SVG, sans serveur LAN', async () => {
  const contenu = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE).jeu.contenu as ContenuColorie;
  const habillage = habillageEcole();
  const services = servicesDeTest();
  const etat = moteurColorie.creerEtat({ contenu, habillage, alea: services.alea, horloge: services.horloge });
  const vue = render(<MoteurColorie contenu={contenu} habillage={habillage} etat={etat} services={services} emettre={() => undefined} animationsDesactivees />);
  await verifierFond(vue.container);
});
