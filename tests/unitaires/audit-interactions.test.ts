// @vitest-environment happy-dom
import type { Page } from '@playwright/test';
import { webcrypto } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import {
  auditerInteractions, empreintesCouleurs, repererCommandes, taperCommandeReperee, valeursFormulaires, type AdaptateurInteractions,
} from '../e2e/audit-interactions.js';

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function scenario(options: { retrait?: boolean; remplacement?: boolean; derive?: boolean; amorcage?: boolean }) {
  let ecran = 'origine';
  let cibles = ['amorce', 'cible'];
  let amorce = false;
  const tapes: string[] = [];
  const adaptateur: AdaptateurInteractions = {
    async restaurer() { ecran = 'origine'; cibles = ['amorce', 'cible']; amorce = false; },
    async ecran() { return ecran; },
    async inventorier() { return [...cibles]; },
    async taper(cible) {
      if (!cibles.includes(cible)) return null;
      tapes.push(`${ecran}:${cible}`);
      if (cible === 'amorce') {
        amorce = true;
        if (options.retrait) cibles = ['amorce'];
        if (options.remplacement) cibles = ['amorce', 'intrus'];
        if (options.derive) { ecran = 'ailleurs'; cibles = ['amorce', 'intrus']; }
        return { cible, effet: true };
      }
      return { cible, effet: cible === 'intrus' || Boolean(options.amorcage && amorce) };
    },
  };
  return { adaptateur, tapes };
}

it('une cible disparue en avant doit être réellement testée à froid', async () => {
  const { adaptateur, tapes } = scenario({ retrait: true });
  expect(await auditerInteractions(adaptateur)).toContainEqual({ cible: 'cible', statut: 'muet' });
  expect(tapes).toContain('origine:cible');
});

it('le remplacement au même rang ne prouve rien sur la cible initiale', async () => {
  const { adaptateur, tapes } = scenario({ remplacement: true });
  expect(await auditerInteractions(adaptateur)).toContainEqual({ cible: 'cible', statut: 'muet' });
  expect(tapes).toContain('origine:cible');
  expect(tapes).not.toContain('origine:intrus');
});

it('une cible jamais retrouvée après inventaire reste non vérifiée', async () => {
  const { adaptateur } = scenario({});
  const taper = adaptateur.taper;
  adaptateur.taper = async (cible) => cible === 'cible' ? null : taper(cible);
  expect(await auditerInteractions(adaptateur)).toContainEqual({ cible: 'cible', statut: 'non-verifie' });
});

it('la reprise teste seule une réponse vivante avant que l’autre change la question', async () => {
  const { adaptateur } = scenario({ retrait: true });
  const taper = adaptateur.taper;
  adaptateur.taper = async (cible) => {
    const observation = await taper(cible);
    return observation === null ? null : { ...observation, effet: true };
  };
  expect(await auditerInteractions(adaptateur)).toContainEqual({ cible: 'cible', statut: 'observe' });
});

it('la passe de reprise ne teste pas une cible sur un autre écran', async () => {
  const { adaptateur, tapes } = scenario({ derive: true });
  expect(await auditerInteractions(adaptateur)).toContainEqual({ cible: 'cible', statut: 'muet' });
  expect(tapes).not.toContain('ailleurs:intrus');
});

it('un contrôle rendu actif par amorçage reste observé', async () => {
  const { adaptateur } = scenario({ amorcage: true });
  expect(await auditerInteractions(adaptateur)).toEqual([
    { cible: 'amorce', statut: 'observe' }, { cible: 'cible', statut: 'observe' },
  ]);
});

it('une identité ambiguë refuse le bilan avant de taper', async () => {
  const { adaptateur, tapes } = scenario({});
  adaptateur.inventorier = async () => ['cible', 'cible'];
  await expect(auditerInteractions(adaptateur)).rejects.toThrow('Inventaire ambigu');
  expect(tapes).toEqual([]);
});

it('une observation portant une autre identité ne valide pas la cible', async () => {
  const { adaptateur } = scenario({});
  adaptateur.taper = async () => ({ cible: 'intrus', effet: true });
  expect(await auditerInteractions(adaptateur)).toEqual([
    { cible: 'amorce', statut: 'non-verifie' }, { cible: 'cible', statut: 'non-verifie' },
  ]);
});

const pageDom = {
  async evaluate(fonction: (argument: string) => unknown, argument: string) { return fonction(argument); },
} as unknown as Page;

it('le repère suit le même objet DOM après déplacement et refuse son remplaçant', async () => {
  document.body.innerHTML = '<button>Autre</button><button>Cible</button>';
  const [, cible] = await repererCommandes(pageDom, 'button');
  const element = document.querySelectorAll('button')[1]!;
  let taps = 0;
  element.addEventListener('click', () => { taps += 1; });
  document.body.prepend(element);
  expect(await taperCommandeReperee(pageDom, cible!)).not.toBeNull();
  expect(taps).toBe(1);
  element.replaceWith(Object.assign(document.createElement('button'), { textContent: 'Cible' }));
  expect(await taperCommandeReperee(pageDom, cible!)).toBeNull();
  expect(taps).toBe(1);
});

it('deux objets portant le même repère ne reçoivent aucun tap', async () => {
  document.body.innerHTML = '<button>Cible</button><button>Cible</button>';
  const [cible] = await repererCommandes(pageDom, 'button');
  let taps = 0;
  document.body.addEventListener('click', () => { taps += 1; }, { once: true });
  expect(await taperCommandeReperee(pageDom, cible!)).toBeNull();
  expect(taps).toBe(0);
});

it('les identifiants des cibles distinguent deux réponses de même texte', async () => {
  document.body.innerHTML = '<button data-cible="un">a</button><button data-cible="deux">a</button>';
  const identites = await repererCommandes(pageDom, 'button');
  expect(new Set(identites).size).toBe(2);
  expect(await taperCommandeReperee(pageDom, identites[1]!)).not.toBeNull();
});

it('les lancements de galerie sont identifiés par exercice, pas par leur libellé commun', async () => {
  document.body.innerHTML = '<button data-galerie-lancer="un">Lancer</button><button data-galerie-lancer="deux">Lancer</button>';
  const identites = await repererCommandes(pageDom, 'button');
  expect(new Set(identites).size).toBe(2);
  expect(await taperCommandeReperee(pageDom, identites[0]!)).not.toBeNull();
});

it('les pixels du coloriage changent le signal même quand le DOM reste identique', async () => {
  vi.stubGlobal('crypto', webcrypto);
  document.body.innerHTML = '<canvas data-raster-couche="couleurs" width="1" height="1"></canvas>';
  const toile = document.querySelector('canvas')!;
  const pixels = new Uint8ClampedArray([0, 0, 0, 0]);
  vi.spyOn(toile, 'getContext').mockReturnValue({
    getImageData: () => ({ data: pixels }),
  } as unknown as CanvasRenderingContext2D);
  const dom = document.body.innerHTML;
  const avant = await empreintesCouleurs(pageDom);
  expect(await empreintesCouleurs(pageDom), 'un dessin inchangé reste inerte').toEqual(avant);
  pixels.set([255, 0, 0, 255]);
  expect(document.body.innerHTML).toBe(dom);
  expect(await empreintesCouleurs(pageDom), 'la couleur réellement peinte doit être observée').not.toEqual(avant);
});

it('les champs de réglage gardent leur identité propre', async () => {
  document.body.innerHTML = '<input type="range" data-reglage="volume-effets"><input type="range" data-reglage="volume-voix">';
  expect(new Set(await repererCommandes(pageDom, 'input')).size).toBe(2);
});

it('la relecture distingue les commandes identiques de deux exercices', async () => {
  document.body.innerHTML = '<section data-relecture="un"><input type="text"><button>Valider</button></section><section data-relecture="deux"><input type="text"><button>Valider</button></section>';
  expect(new Set(await repererCommandes(pageDom, 'input, button')).size).toBe(4);
});

it.each([
  '<input type="text" value="">',
  '<input type="search" value="">',
  '<input type="range" min="0" max="100" step="5" value="100">',
  '<select><option value="a">A</option><option value="b">B</option></select>',
])('le contrôle de saisie modifie réellement sa valeur : %s', async (html) => {
  document.body.innerHTML = html;
  const champ = document.querySelector('input, select') as HTMLInputElement | HTMLSelectElement;
  const avant = champ.value;
  const changements: string[] = [];
  champ.addEventListener('input', () => changements.push('input'));
  champ.addEventListener('change', () => changements.push('change'));
  const [cible] = await repererCommandes(pageDom, 'input, select');
  await taperCommandeReperee(pageDom, cible!);
  expect(champ.value).not.toBe(avant);
  expect(changements).toEqual(['input', 'change']);
});

it('la sonde de formulaire lit les propriétés réelles et reste stable après refus de saisie', async () => {
  document.body.innerHTML = '<input type="text" value="initial">';
  const champ = document.querySelector('input')!;
  const dom = document.body.innerHTML;
  const avant = await valeursFormulaires(pageDom);
  champ.value = 'nouveau';
  expect(document.body.innerHTML).toBe(dom);
  expect(await valeursFormulaires(pageDom)).not.toEqual(avant);
  champ.addEventListener('input', () => { champ.value = 'initial'; });
  const [cible] = await repererCommandes(pageDom, 'input');
  await taperCommandeReperee(pageDom, cible!);
  expect(await valeursFormulaires(pageDom)).toEqual(avant);
});
