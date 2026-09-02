/**
 * L'affordance du campement — R18, R11 mesurée sur le mouvement. Lot S5.
 *
 * ── CE QUE CE FICHIER MESURE, ET QUE RIEN NE MESURAIT ────────────────────────────────────────
 *
 * « Le père n'a pas compris le campement » (D45). Le brief de ce lot le dit sans détour : « ce
 * n'est pas le graphisme, c'est l'affordance ». Mesuré avant d'écrire, dans `PointLibre.tsx` :
 *
 *   - les trente prises sont des `<button>` `background: transparent`, `border: none`, posés
 *     sur une image de fond. **Rien** ne dit qu'elles répondent au doigt ;
 *   - les quatorze points marqués `data-animation-unique="oui"` faisaient tous le MÊME
 *     `scale(1.06)`. R11 en demande dix DISTINCTS. Deux recettes comptaient l'attribut.
 *
 * `EcranCampement.test.tsx` (L2-F) compte les attributs et reste la recette de référence de
 * R11 ; ce fichier-ci ne la double pas, il mesure ce qu'elle ne peut pas voir : le mouvement
 * et l'invitation. Il porte un nom qui n'est PAS `Ecran*.test.tsx` — un autre lot de cette
 * campagne écrit les écrans nus, et deux écrivains sur un fichier est la seule règle qui
 * n'admet pas d'exception.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';

import { campementDuDocument, stadesDuDocument } from '@pierre/partage/monde';
import type { EtatMonde } from '@pierre/partage';
import { EcranCampement } from '@client/ecrans/EcranCampement';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { ANIMATIONS_CAMPEMENT, animationDuPoint } from '@client/monde/animations-campement';

import { R11_ANIMATIONS_UNIQUES_MIN } from '@partage/monde/campement.js';
import { lireJson, servicesDeTest } from '../configuration/preparation.js';

const CAMPEMENT = campementDuDocument(lireJson('contenu/monde/campement.json'));
const STADES = stadesDuDocument(lireJson('contenu/monde/gobi-stades.json'));

/**
 * Le plancher de prises — trente au 2026-08-03, et le contrat du lot en visait ≥ 25.
 *
 * Il est là pour une raison mécanique : toutes les égalités de ce fichier comparent le DOM au
 * fichier de contenu. « zéro prise → zéro invitation » les satisfait TOUTES. Le plancher est
 * ce qui empêche un campement vidé de rendre ce fichier vert d'un bout à l'autre.
 */
const PRISES_MIN = 25;

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

/** Un monde nu : rien d'acquis. C'est l'état du PREMIER jour, celui où R18 se joue. */
function monde(): EtatMonde {
  return {
    carte: { ouvertesEnParallele: 2, regions: [] },
    gobi: { stade: 'oeuf', formeActive: null, formes: [] },
    compagnons: [],
    campement: []
  };
}

function monter(animationsDesactivees = false): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const magasin = creerMagasin(services());
  // `sauterAnimations` est le SEUL chemin du magasin vers « animations calmes » (D21) — le
  // même que `window.__test.sauterAnimations()` emprunte. On passe par lui plutôt que d'écrire
  // l'état à la main : un test qui fabriquerait l'état ne prouverait rien du chemin réel.
  if (animationsDesactivees) magasin.getState().sauterAnimations();
  render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: services(), magasin }}>
        <EcranCampement
          campement={CAMPEMENT}
          monde={monde()}
          stades={STADES}
          surOuvrirChaudron={() => undefined}
        />
      </FournisseurJeu>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

describe('R11 — le campement répond DIFFÉREMMENT selon ce qu’on touche', () => {
  it('rend au moins 10 mouvements distincts dans le DOM, pas 10 attributs', () => {
    monter();
    const prometteurs = [
      ...document.querySelectorAll('[data-animation-unique="oui"][data-animation]')
    ].map((element) => element.getAttribute('data-animation'));
    const distincts = new Set(prometteurs);
    console.log(
      `[S5] DOM monté : ${String(prometteurs.length)} point(s) animationUnique → ` +
        `${String(distincts.size)} mouvement(s) distinct(s)`
    );
    // LE DÉNOMINATEUR, ET C'EST LUI LE SUJET DU CAS : « dans le DOM, pas 10 attributs ». Sans
    // cette ligne, un écran qui ne monterait que dix des quatorze points prometteurs resterait
    // vert — on aurait de nouveau mesuré l'indice au lieu de la propriété (survivant M11b).
    expect(
      prometteurs.length,
      'le DOM ne monte pas tous les points qui promettent un mouvement unique'
    ).toBe(CAMPEMENT.points.filter((point) => point.animationUnique).length);
    expect(distincts.size).toBeGreaterThanOrEqual(R11_ANIMATIONS_UNIQUES_MIN);
  });

  it('nomme un mouvement sur CHAQUE point : aucun ne reste inerte', () => {
    monter();
    const points = [...document.querySelectorAll('[data-interaction="libre"]')];
    expect(points.length).toBe(CAMPEMENT.points.length);
    for (const point of points) {
      const nom = point.getAttribute('data-animation');
      expect(ANIMATIONS_CAMPEMENT).toContain(nom);
      // Le DOM dit la même chose que le module : une seconde source de vérité aurait divergé.
      expect(nom).toBe(animationDuPoint(point.getAttribute('data-point') ?? ''));
    }
  });

  it('pose la classe du mouvement au toucher, et celle-là seulement', () => {
    monter();
    const tente = document.querySelector('[data-point="tente"]')!;
    expect(tente.className).not.toContain('anim-campement-');
    fireEvent.click(tente);
    expect(tente.className).toContain(`anim-campement-${animationDuPoint('tente')}`);

    const feu = document.querySelector('[data-point="feu"]')!;
    fireEvent.click(feu);
    // Deux objets touchés, deux classes différentes : c'est exactement ce que l'ancien
    // `scale(1.06)` en dur rendait impossible.
    expect(feu.className).not.toBe(tente.className);
  });

  it('rend la prise au repos après son mouvement — on peut y revenir sans fin (R14)', () => {
    monter();
    const carillon = document.querySelector('[data-point="carillon"]')!;
    fireEvent.click(carillon);
    expect(carillon.getAttribute('data-reaction')).toBe('reagit');
    fireEvent.animationEnd(carillon);
    expect(carillon.getAttribute('data-reaction')).toBe('repos');
    expect(carillon.hasAttribute('disabled')).toBe(false);
  });

  it('ne revient PAS au repos sur l’animation d’un enfant — le garde de la remontée', () => {
    // Sous `prefers-reduced-motion`, la règle globale ramène l'invitation à une itération :
    // elle FINIT, et son `animationend` remonte jusqu'au bouton. Sans le garde
    // `target === currentTarget`, le point retomberait au repos à cause d'un mouvement qui
    // n'est pas le sien, au beau milieu du sien.
    monter();
    const feu = document.querySelector('[data-point="feu"]')!;
    fireEvent.click(feu);
    const invite = feu.querySelector('[data-invite="oui"]')!;
    fireEvent.animationEnd(invite);
    expect(feu.getAttribute('data-reaction')).toBe('reagit');
  });
});

describe('R18 — le campement dit qu’il se touche, sans une ligne de texte', () => {
  it('pose une invitation sur CHACUNE des trente prises', () => {
    monter();
    const invites = document.querySelectorAll('[data-interaction="libre"] [data-invite="oui"]');
    console.log(
      `[S5] ${String(CAMPEMENT.points.length)} prise(s) → ${String(invites.length)} invitation(s)`
    );
    // Le plancher d'abord : « 0 prise → 0 invitation » satisfait l'égalité et ne prouve RIEN.
    expect(
      CAMPEMENT.points.length,
      'le campement a perdu ses prises : l’égalité qui suit deviendrait creuse'
    ).toBeGreaterThanOrEqual(PRISES_MIN);
    expect(invites.length, 'une prise sans invitation : R18 retombe sur du texte').toBe(
      CAMPEMENT.points.length
    );
  });

  it('déphase les invitations : le campement respire, il ne clignote pas en bloc', () => {
    monter();
    const phases = [
      ...document.querySelectorAll<HTMLElement>('[data-invite="oui"]')
    ].map((element) => element.style.animationDelay);
    expect(new Set(phases).size).toBe(CAMPEMENT.points.length);
    // Toutes négatives : l'animation démarre déjà entamée, sinon les trente halos partiraient
    // ensemble au montage de l'écran — le clignotement en bloc, précisément.
    for (const phase of phases) expect(phase.startsWith('-')).toBe(true);
  });

  it('ne prend jamais le doigt : l’invitation est décorative et rien d’autre', () => {
    monter();
    for (const invite of document.querySelectorAll('[data-invite="oui"]')) {
      expect(invite.getAttribute('aria-hidden')).toBe('true');
      expect(invite.tagName.toLowerCase()).toBe('span');
      expect(invite.className).toBe('point-libre-invite');
    }
  });

  it('disparaît entièrement quand les animations sont coupées (D21)', () => {
    // Un halo FIGÉ sur trente objets serait une grille de cadres permanents, c'est-à-dire le
    // menu déguisé que D45 refuse. « Animations calmes » ne doit pas produire ce décor-là.
    monter(true);
    expect(document.querySelectorAll('[data-invite="oui"]')).toHaveLength(0);
    // Et les prises restent là, entières : couper les animations ne retire aucune prise.
    expect(document.querySelectorAll('[data-interaction="libre"]')).toHaveLength(
      CAMPEMENT.points.length
    );
  });

  it('ne pose aucune classe de mouvement quand les animations sont coupées', () => {
    monter(true);
    const tente = document.querySelector('[data-point="tente"]')!;
    fireEvent.click(tente);
    expect(tente.className).not.toContain('anim-campement-');
    // Mais le point a quand même RÉAGI : le halo de toucher n'est pas une animation.
    expect(tente.getAttribute('data-reaction')).toBe('reagit');
  });
});

describe('les destinations du campement se lisent sans savoir lire', () => {
  it('donne un pictogramme à chaque section du hub, pas seulement aux sorties', () => {
    monter();
    const pictogrammes = [...document.querySelectorAll('[data-pictogramme]')].map((element) =>
      element.getAttribute('data-pictogramme')
    );
    console.log(`[S5] pictogrammes rendus : ${pictogrammes.join(', ')}`);
    // ══════════════════════════════════════════════════════════════════════════════════════
    // LA LISTE ÉCRITE À LA MAIN A DISPARU — ELLE S'ÉTAIT DÉJÀ PÉRIMÉE DEUX FOIS
    //
    // Elle disait `['carte', 'coffre', 'butin']`. R27 en a fait tomber `etagere` ; l'arbitrage
    // du 2026-08-07 — « déplace le butin dans le coffre » — en a fait tomber `butin`. **Deux
    // déménagements, deux fois rouge, deux fois pour une bonne raison.** Une liste de noms ne
    // survit pas à un écran qui bouge : c'est le recensement par OCCURRENCE que ce dépôt
    // combat partout ailleurs.
    //
    // La règle DÉRIVÉE dit la même chose sans se périmer : **toute destination que cet écran
    // rend porte un pictogramme.** La population, ce sont les `[data-vers]` réellement montés —
    // trois aujourd'hui, quatre demain si l'on en ajoute une, et le garde suivra tout seul.
    // Un panneau qui déménage n'y figure plus ; une destination neuve y entre sans qu'on
    // touche ce fichier.
    // ══════════════════════════════════════════════════════════════════════════════════════
    const destinations = [...document.querySelectorAll('[data-vers]')];
    expect(
      destinations.length,
      'le campement ne rend aucune destination : la règle serait vraie par vacuité'
    ).toBeGreaterThanOrEqual(2);
    const sansPictogramme = destinations
      .filter((lien) => lien.querySelector('[data-pictogramme]') === null &&
        !lien.hasAttribute('data-pictogramme'))
      .map((lien) => lien.getAttribute('data-vers'));
    expect(
      sansPictogramme,
      'ces destinations du hub n’ont pas de pictogramme : un enfant qui ne sait pas encore ' +
        'lire ne peut pas les distinguer'
    ).toEqual([]);

    // ── LES DEUX OBJETS QUI ONT DÉMÉNAGÉ, ET LEUR EXIGENCE LES A SUIVIS ─────────────────────
    //
    // « Dans le coffre, il y a aussi les Gobi. Je pense qu'il faut les laisser dans le coffre »
    // (R27) puis « déplace le butin dans le coffre » (2026-08-07). Exiger leurs pictogrammes
    // ICI reviendrait à exiger qu'ils reviennent.
    //
    // **L'exigence n'est pas perdue : elle suit l'objet.** `tests/composants/EcranCoffre.test.tsx`
    // porte désormais les deux — « le coffre rend les pictogrammes des collections qui l'ont
    // rejoint ». Une exigence qui disparaîtrait avec un déménagement n'aurait jamais rien gardé.
    for (const parti of ['etagere', 'butin']) {
      expect(
        pictogrammes,
        `« ${parti} » est revenu au campement : il appartient au coffre`
      ).not.toContain(parti);
    }
  });

  it('n’affiche jamais d’échec au campement, quoi qu’on touche', () => {
    monter();
    for (const point of document.querySelectorAll('[data-interaction="libre"]')) {
      fireEvent.click(point);
    }
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });
});
