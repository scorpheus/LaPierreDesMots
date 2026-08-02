/**
 * REPRODUCTION DU DÉFAUT n° 2, côté écran — pourquoi le `d` paraît impossible.
 *
 * Le moteur `trace` impose l'ordre des traits (`capacites.ordreEtapesImpose === true`), et
 * l'ordre du `d` est l'INVERSE de celui du `b` : le `b` commence par la grande barre, le `d`
 * commence par le rond. Les deux lettres sont dans le MÊME exercice
 * (`galeries-miroir-bd-01`), l'une après l'autre. Un joueur qui vient de réussir le `b` par
 * la barre recommence naturellement par la barre sur le `d` — et se fait refuser.
 *
 * Or `GuidageLettre.tsx` rend le trait ATTENDU (`etat === 'en-cours'`) et le trait à venir
 * (`etat === 'a-tracer'`) avec **exactement les mêmes propriétés graphiques** : même couleur
 * de couloir, même couleur et même pointillé de modèle, même disque de départ, même flèche.
 * Seul `data-trait-etat` — invisible — les sépare. L'enfant voit donc deux points de départ
 * identiques et rien ne lui dit lequel vient d'abord.
 *
 * Ce fichier ne corrige rien. Il compare les attributs RENDUS des deux groupes, et il échoue
 * tant qu'ils sont indiscernables.
 */
import { useCallback, useState } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { moteurTrace } from '@partage/moteurs/trace/moteur';
import { renduTrace } from '@client/moteurs/trace/index';

import type {
  ActionTrace,
  ContenuTrace,
  EtatTrace,
} from '@partage/moteurs/trace/index';
import type { Exercice, Habillage } from '@pierre/partage';

import {
  aleaDeTest,
  horlogeDeTest,
  lireJson,
  servicesDeTest,
} from '../configuration/preparation.js';

const contenu = lireJson<Exercice>('contenu/exercices/galeries/miroir-bd-01.json').jeu
  .contenu as unknown as ContenuTrace;
const habillage = lireJson<Habillage>(
  'contenu/habillages/galeries/tracer-cristal.habillage.json',
);

/** R16, CLAUDE.md règle 5 : toute cible que le doigt doit viser fait au moins 64 px. */
const CIBLE_MIN_PX = 64;
/** `min(100%, 420px)` de `MoteurTrace.tsx`, sur un `viewBox` large de 100 unités. */
const PX_PAR_UNITE = 420 / 100;

function Harnais({ contenu: c }: { readonly contenu: ContenuTrace }): ReturnType<
  typeof renduTrace.Composant
> {
  const services = servicesDeTest();
  const [etat, setEtat] = useState<EtatTrace>(() =>
    moteurTrace.creerEtat({ contenu: c, habillage, alea: aleaDeTest(), horloge: horlogeDeTest() }),
  );
  const emettre = useCallback((action: ActionTrace) => {
    setEtat((courant) =>
      moteurTrace.reduire(courant, action, { alea: aleaDeTest(), horloge: horlogeDeTest() }),
    );
  }, []);
  const Composant = renduTrace.Composant;
  return (
    <Composant
      contenu={c}
      habillage={habillage}
      etat={etat}
      emettre={emettre}
      services={services}
      animationsDesactivees
    />
  );
}

/** Les attributs graphiques d'un groupe de trait, tels qu'ils atteignent l'écran. */
function apparence(etatTrait: string): string {
  const groupe = document.querySelector(`[data-trait-etat="${etatTrait}"]`);
  if (groupe === null) return `(aucun groupe ${etatTrait})`;
  const decrire = (selecteur: string): string => {
    const noeud = groupe.querySelector(selecteur);
    if (noeud === null) return `${selecteur}:absent`;
    const attributs = ['stroke', 'stroke-width', 'stroke-dasharray', 'fill', 'r']
      .map((a) => `${a}=${noeud.getAttribute(a) ?? '-'}`)
      .join(' ');
    return `${selecteur}[${attributs}]`;
  };
  return [
    decrire('[data-guide="couloir"]'),
    decrire('[data-guide="modele"]'),
    decrire('[data-guide="depart"]'),
    decrire('[data-guide="sens"]'),
  ].join(' | ');
}

afterEach(() => {
  cleanup();
});

describe('le trait à tracer MAINTENANT se distingue de celui d’après', () => {
  it('les deux traits du `b` sont bien rendus, l’un en cours, l’autre à tracer', () => {
    // Contrôle de la mesure : sans les deux groupes, le cas suivant ne compare rien.
    render(<Harnais contenu={contenu} />);
    expect(document.querySelectorAll('[data-trait-etat="en-cours"]').length).toBe(1);
    expect(document.querySelectorAll('[data-trait-etat="a-tracer"]').length).toBe(1);
  });

  it('leur APPARENCE diffère — sinon l’ordre imposé est invisible', () => {
    render(<Harnais contenu={contenu} />);
    const enCours = apparence('en-cours');
    const aTracer = apparence('a-tracer');
    expect(enCours, `en-cours : ${enCours}`).not.toBe(aTracer);
  });

  it('un seul point de départ est offert au doigt à la fois', () => {
    // Deux disques jaunes identiques à l'écran, c'est deux invitations à poser le doigt.
    // Celle qui n'est pas la bonne est refusée sans rien expliquer.
    render(<Harnais contenu={contenu} />);
    const departs = document.querySelectorAll('[data-guide="depart"]');
    expect(departs.length).toBe(1);
  });
});

describe('R16 — le disque de départ est une cible tapable', () => {
  it('il mesure au moins 64 px CSS de diamètre', () => {
    render(<Harnais contenu={contenu} />);
    const depart = document.querySelector('[data-trait-etat="en-cours"] [data-guide="depart"]');
    const rayonUnites = Number(depart?.getAttribute('r') ?? '0');
    const diametrePx = 2 * rayonUnites * PX_PAR_UNITE;
    expect(diametrePx, `r=${String(rayonUnites)} unités viewBox`).toBeGreaterThanOrEqual(
      CIBLE_MIN_PX,
    );
  });
});
