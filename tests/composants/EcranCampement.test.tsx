/**
 * R11 comptée DANS LE DOM MONTÉ — annexe T § T3, contrat des features v2 § 3.6. Lot L2-F.
 *
 * C'est le troisième chiffre du contrat de sortie de L2-F, et le plus difficile à truquer :
 * `campement-audit.test.ts` prouve que le FICHIER déclare 25 points, 10 animations et
 * 6 répliques ; ce fichier-ci prouve que l'ÉCRAN les rend vraiment. Un écran qui n'afficherait
 * que les sept éléments majeurs passerait le premier test et tomberait sur celui-là.
 *
 * Les données viennent du disque, jamais d'une maquette : `contenu/monde/campement.json` réel.
 * Le monde du profil est injecté — la route est celle de L2-H, et ce test n'a pas à en dépendre.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { campementDuDocument, stadesDuDocument } from '@pierre/partage/monde';
import type { EtatMonde } from '@pierre/partage';
import { EcranCampement } from '@client/ecrans/EcranCampement';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

import { R11_ANIMATIONS_UNIQUES_MIN, R11_POINTS_MIN, R11_REPLIQUES_MIN }
  from '@partage/monde/campement.js';
import { lireJson, servicesDeTest } from '../configuration/preparation.js';

const CAMPEMENT = campementDuDocument(lireJson('contenu/monde/campement.json'));
const STADES = stadesDuDocument(lireJson('contenu/monde/gobi-stades.json'));

/** Les services de test, complétés des deux membres que L2-A a ajoutés à `ServicesJeu`. */
function services() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      animationsDesactivees: true,
      emettreParticules: () => undefined
    })
  };
}

/** Un monde minimal : Gobi au stade `crete`, deux formes, aucun objet rapporté. */
function monde(): EtatMonde {
  return {
    carte: {
      ouvertesEnParallele: 2,
      regions: [
        {
          region: 'clairiere',
          ordre: 1,
          ouverte: true,
          pourcentageColorie: 1,
          eclatObtenuLe: '2026-09-01T08:00:00.000Z',
          compagnon: 'filou',
          noeuds: ['clairiere-01']
        }
      ]
    },
    gobi: {
      stade: 'crete',
      formeActive: 'ou',
      formes: [
        {
          grapheme: 'ou',
          libelle: 'Gobi-OU',
          cristal: 'assets/gobi/cristal-base.svg',
          obtenueLe: '2026-09-01T08:00:00.000Z'
        },
        {
          grapheme: 'ch',
          libelle: 'Gobi-CH',
          cristal: 'assets/gobi/cristal-base.svg',
          obtenueLe: '2026-09-01T08:00:00.000Z'
        }
      ]
    },
    compagnons: [
      {
        code: 'filou',
        libelle: 'Filou',
        valeur: 'La malice',
        domaine: 'Mots outils',
        region: 'clairiere',
        asset: 'assets/compagnons/filou.svg',
        rallieLe: null
      }
    ],
    campement: [
      {
        code: 'fanion-clairiere',
        libelle: 'le fanion de la Clairière',
        asset: 'habillages/campement/campement.svg',
        region: 'clairiere',
        placeLe: null
      }
    ]
  };
}

function monter(surcharges: Partial<Parameters<typeof EcranCampement>[0]> = {}): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const magasin = creerMagasin(services());
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: services(), magasin }}>
        <EcranCampement
          campement={CAMPEMENT}
          monde={monde()}
          stades={STADES}
          {...surcharges}
        />
      </FournisseurJeu>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('R11 comptée dans le DOM', () => {
  it('rend AU MOINS 25 points d’interaction libres', () => {
    monter();
    const points = document.querySelectorAll('[data-interaction="libre"]');
    console.log(`[L2-F] DOM monté : ${String(points.length)} [data-interaction="libre"]`);
    expect(points.length).toBeGreaterThanOrEqual(R11_POINTS_MIN);
  });

  it('rend AU MOINS 10 animations uniques', () => {
    monter();
    const uniques = document.querySelectorAll('[data-animation-unique="oui"]');
    console.log(`[L2-F] DOM monté : ${String(uniques.length)} [data-animation-unique="oui"]`);
    expect(uniques.length).toBeGreaterThanOrEqual(R11_ANIMATIONS_UNIQUES_MIN);
  });

  it('rend AU MOINS 6 points porteurs d’une réplique', () => {
    monter();
    const repliques = document.querySelectorAll('[data-replique="oui"]');
    console.log(`[L2-F] DOM monté : ${String(repliques.length)} [data-replique="oui"]`);
    expect(repliques.length).toBeGreaterThanOrEqual(R11_REPLIQUES_MIN);
  });

  it('rend exactement les points du fichier, ni un de plus par accident', () => {
    monter();
    const rendus = [...document.querySelectorAll('[data-interaction="libre"][data-point]')].map(
      (element) => element.getAttribute('data-point')
    );
    // Égalité STRICTE, dans les deux sens : ni un point oublié, ni une prise inventée qui
    // gonflerait R11. Le chaudron, par exemple, est déjà un point du fichier — son bouton
    // d'entrée ne porte donc pas `data-interaction`.
    expect(new Set(rendus).size).toBe(CAMPEMENT.points.length);
    expect(document.querySelectorAll('[data-interaction="libre"]')).toHaveLength(
      CAMPEMENT.points.length
    );
  });

  it('ne pose `data-animation-unique` QUE là où le fichier le déclare avec une réaction', () => {
    monter();
    const attendus = CAMPEMENT.points
      .filter((point) => point.animationUnique && point.reaction !== 'aucune')
      .map((point) => point.id)
      .sort();
    const rendus = [...document.querySelectorAll('[data-animation-unique="oui"]')]
      .map((element) => element.getAttribute('data-point'))
      .sort();
    expect(rendus).toEqual(attendus);
  });
});

describe('le campement ne peut rien rater', () => {
  it('n’émet jamais `data-etat="echec"`, même après avoir tout touché', () => {
    monter();
    for (const point of document.querySelectorAll('[data-interaction="libre"]')) {
      fireEvent.click(point);
    }
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });

  it('marque le point touché sans jamais le désactiver — on peut y revenir sans fin', () => {
    monter();
    const premier = document.querySelector('[data-point="tente"]');
    expect(premier).not.toBeNull();
    fireEvent.click(premier!);
    expect(premier!.getAttribute('data-reaction')).toBe('reagit');
    expect(premier!.hasAttribute('disabled')).toBe(false);
  });

  it('offre une boîte tapable d’au moins 64 px à chaque point (R16)', () => {
    monter();
    for (const point of document.querySelectorAll<HTMLElement>('[data-interaction="libre"]')) {
      // happy-dom ne calcule pas la mise en page : on vérifie la RÈGLE posée, qui est ce que
      // le composant garantit. La mesure réelle est faite par `tests/qualite/a11y.spec.ts`.
      expect(point.style.minInlineSize).toBe('64px');
      expect(point.style.minBlockSize).toBe('64px');
    }
  });
});

describe('le campement montre le monde sans jamais le cacher', () => {
  it('affiche le stade de Gobi sur la racine du composant', () => {
    monter();
    expect(document.querySelector('[data-stade-gobi="crete"]')).not.toBeNull();
  });

  it('porte le cristal de la forme active, et non un second corps (D20)', () => {
    monter();
    const cristal = document.querySelector('[data-cristal]');
    expect(cristal?.getAttribute('data-cristal')).toBe('assets/gobi/cristal-base.svg');
  });

  /**
   * MODIFIÉ PAR N3, hors de son périmètre déclaré, et c'est signalé. Les deux valeurs
   * attendues étaient celles de la table à CINQ stades ; D43 la porte à dix, donc le stade
   * qui suit `crete` n'est plus `equipe` (rang 4 sur 5) mais `couronne` (rang 6 sur 10).
   *
   * Elles sont désormais LUES DANS LA TABLE plutôt qu'écrites en dur : ce cas mesure que la
   * jauge montre le vide restant, pas que la table vaut telle ou telle valeur. Un seuil
   * recopié ici en était une seconde source de vérité, et c'est lui qui a cassé.
   */
  it('annonce le VIDE restant avant le prochain stade, pas seulement l’acquis (D25)', () => {
    monter();
    const jauge = document.querySelector('[data-prochain-stade]');
    const rangDeCrete = STADES.find((stade) => stade.code === 'crete')!.rang;
    const suivant = STADES.find((stade) => stade.rang === rangDeCrete + 1)!;
    expect(jauge?.getAttribute('data-prochain-stade')).toBe(suivant.code);
    // Le monde factice porte 2 formes ; le reste est ce que le seuil du suivant exige.
    expect(jauge?.getAttribute('data-formes-restantes'))
      .toBe(String(suivant.formesRequises - 2));
  });

  it('grave les formes acquises au mur des noms, et n’en retire aucune', () => {
    monter();
    expect(screen.getByRole('button', { name: 'Réécouter Gobi-OU' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Réécouter Gobi-CH' })).toBeDefined();
  });

  it('montre un compagnon non rallié plutôt que de le cacher', () => {
    monter();
    const filou = document.querySelector('[data-compagnon="filou"]');
    expect(filou).not.toBeNull();
    expect(filou!.getAttribute('data-rallie')).toBe('non');
  });

  it('ouvre le chaudron sans jamais afficher d’erreur quand aucun nœud libre n’existe', () => {
    monter();
    const chaudron = document.querySelector('[data-chaudron-entree="oui"]');
    expect(chaudron).not.toBeNull();
    fireEvent.click(chaudron!);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    expect(document.body.textContent).toContain('mijote');
  });
});
