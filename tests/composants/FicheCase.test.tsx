/**
 * VOIR EN GRAND UNE FORME ACQUISE, SANS RÉVÉLER LES FORMES FUTURES.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * La demande du 10 septembre 2026 révise R24 pour les formes de Gobi : une forme future reste
 * visible en creux dans l'étagère, mais ne s'ouvre plus et ne révèle jamais sa couleur.
 *
 * La moitié existait : l'étagère montrait déjà les cases VIDES (D44, D25 point 3 — « ce qui donne
 * envie, c'est de voir la case suivante encore vide »). Ce qui manquait, c'est que la case vide ne
 * disait pas CE QU'ELLE ATTEND.
 *
 * ── LA DÉCISION QUI A FAILLI ÊTRE UNE FAUTE ───────────────────────────────────────────────────
 * Le catalogue ne déclare NI couleur NI description : `grapheme`, `libelle`, `cristal`, rien
 * d'autre. J'ai failli dériver une teinte du graphème pour tenir la demande — ç'aurait été une
 * promesse FAUSSE, et une promesse fausse vaut moins que pas de promesse du tout.
 *
 * Mesuré : les cristaux portent déjà leurs couleurs sur disque (`fill="#ADC8E0"`,
 * `fill="#C5EAFA"`). Les montrer EN PLEINE COULEUR, même non obtenus, EST donc ce qui était
 * demandé. Le contour en pointillé et une phrase explicite disent que c'est encore à gagner.
 *
 * ── CE QUE CE FICHIER GARDE, ET QUI NE SE VOIT PAS SUR UNE CAPTURE ────────────────────────────
 * La fiche acquise montre bien le dessin en couleur. Son repli défensif, s'il recevait malgré
 * tout une forme future, la conserve en silhouette secrète. La sortie existe par TROIS portes.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FicheCase } from '@client/monde/FicheCase.js';

import type { CaseEtagere } from '@pierre/partage/monde';

function uneCase(obtenue: boolean): CaseEtagere {
  return {
    rang: 3,
    grapheme: 'b' as CaseEtagere['grapheme'],
    libelle: 'Gobi-B',
    cristal: 'assets/gobi/formes/b.svg' as CaseEtagere['cristal'],
    obtenue,
    obtenueLe: null
  };
}

afterEach(() => {
  cleanup();
});

describe('R24 — la fiche dit ce qu’une case attend', () => {
  it('la fiche garde le dessin centré sans cercle parasite et laisse le nom en tête', () => {
    const { container } = render(
      <FicheCase une={uneCase(true)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const fiche = container.querySelector('[data-fiche-case]') as HTMLElement;
    const visuel = fiche.querySelector('[data-fiche-visuel]') as HTMLElement;
    const titre = fiche.querySelector('h2');
    expect(visuel.getAttribute('data-fiche-visuel-cadre')).toBe('rectangle');
    expect(visuel.style.borderRadius).toBe('');
    expect(visuel.style.display).toBe('grid');
    expect(titre).not.toBeNull();
    expect(fiche.firstElementChild?.firstElementChild).toBe(titre);
  });

  it('la fenêtre reste contenue et défilable sur une tablette 16:10', () => {
    const { container } = render(
      <FicheCase une={uneCase(true)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const fenetre = container.querySelector('[data-fiche-modal] > div') as HTMLElement;
    expect(fenetre.style.inlineSize).toContain('42rem');
    expect(fenetre.style.maxBlockSize).toBe('calc(100dvh - 2rem)');
    expect(fenetre.style.overflowY).toBe('auto');
  });

  it('une forme FUTURE ne révèle pas sa couleur, même si la fiche est montée par erreur', () => {
    const { container } = render(
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const fiche = container.querySelector('[data-fiche-case]');
    expect(fiche?.getAttribute('data-obtenue')).toBe('non');

    const visuel = container.querySelector<HTMLElement>('[data-fiche-visuel]');
    expect(visuel?.getAttribute('data-couleur-revelee')).toBe('non');
    expect(visuel?.style.filter).toContain('saturate(0)');
    expect(container.querySelector('[data-couleur-a-deviner]')).not.toBeNull();
  });

  it('une forme future n’annonce plus sa couleur comme une promesse', () => {
    const { container } = render(
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    expect(container.querySelector('[data-promesse-couleur]')).toBeNull();
    expect(container.textContent).toMatch(/couleurs sont encore secrètes/iu);
  });

  it('et une case GAGNÉE ne porte pas cette phrase — elle est à lui', () => {
    const { container } = render(
      <FicheCase une={uneCase(true)} commentLObtenir={null} surFermer={() => undefined} />
    );
    expect(container.querySelector('[data-promesse-couleur]')).toBeNull();
    expect(container.textContent).toMatch(/elle est à toi/iu);
  });

  it('AUCUN cadenas, AUCUN rouge, aucun mot d’échec (R14)', () => {
    const { container } = render(
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const texte = (container.textContent ?? '').toLowerCase();
    for (const interdit of ['verrou', 'bloqué', 'cadenas', 'raté', 'échec', 'perdu']) {
      expect(texte, `« ${interdit} » n’a rien à faire ici`).not.toContain(interdit);
    }
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('TROIS portes de sortie — le bouton, Échap, et le tap à côté (D46)', () => {
    // « Aucun écran intermédiaire obligatoire, nulle part. » Un panneau dont on ne sait pas
    // sortir est un état sans issue, et c'est le pire défaut possible sur une appli d'enfant.
    const fermer = vi.fn();
    const { container } = render(
      <FicheCase une={uneCase(true)} commentLObtenir={null} surFermer={fermer} />
    );

    fireEvent.click(container.querySelector('[data-fermer-fiche]') as Element);
    expect(fermer, 'le bouton de sortie ne referme pas').toHaveBeenCalledTimes(1);

    fireEvent.keyDown(globalThis.document, { key: 'Escape' });
    expect(fermer, 'Échap ne referme pas').toHaveBeenCalledTimes(2);

    fireEvent.click(container.querySelector('[data-fiche-case]') as Element);
    expect(fermer, 'le tap hors du panneau ne referme pas').toHaveBeenCalledTimes(3);
  });

  it('taper le CONTENU ne referme pas : on peut regarder sans perdre la fiche', () => {
    const fermer = vi.fn();
    const { container } = render(
      <FicheCase une={uneCase(true)} commentLObtenir={null} surFermer={fermer} />
    );
    fireEvent.click(container.querySelector('[data-fiche-visuel]') as Element);
    expect(fermer, 'regarder le dessin fait sortir du panneau').not.toHaveBeenCalled();
  });

  it('le focus part sur la sortie — un panneau sans porte au clavier est un piège', () => {
    const { container } = render(
      <FicheCase une={uneCase(true)} commentLObtenir={null} surFermer={() => undefined} />
    );
    expect(globalThis.document.activeElement).toBe(
      container.querySelector('[data-fermer-fiche]')
    );
  });
});
