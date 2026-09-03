/**
 * VOIR CE QU'IL Y A À GAGNER, MÊME SANS L'AVOIR — R24.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « même si on ne les a pas, tous les items à récupérer devraient être affichés en grand dans un
 * popup avec une description de ce qu'on peut gagner, et on aura la couleur, et avec une croix ou
 * un bouton retour. »
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
 * Qu'une case NON gagnée s'ouvre comme les autres — si les cases grises ne répondaient pas,
 * l'enfant cesserait de les toucher et le vide cesserait de donner envie —, que la couleur soit
 * annoncée comme une promesse et non comme un acquis, et que la sortie existe par TROIS portes.
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
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
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
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const fenetre = container.querySelector('[data-fiche-modal] > div') as HTMLElement;
    expect(fenetre.style.inlineSize).toContain('42rem');
    expect(fenetre.style.maxBlockSize).toBe('calc(100dvh - 2rem)');
    expect(fenetre.style.overflowY).toBe('auto');
  });

  it('LE DÉFAUT CORRIGÉ — une case NON gagnée s’ouvre et montre sa forme en couleur', () => {
    const { container } = render(
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const fiche = container.querySelector('[data-fiche-case]');
    expect(fiche?.getAttribute('data-obtenue')).toBe('non');

    const image = container.querySelector<HTMLImageElement>('[data-fiche-visuel] img');
    expect(image, 'aucune forme montrée : la case reste muette sur ce qu’elle attend').not.toBeNull();
    expect(
      image?.getAttribute('style') ?? '',
      'la forme est ternie : on ne voit alors PAS la couleur, qui est justement la promesse'
    ).toContain('opacity: 1');
  });

  it('la couleur est annoncée comme une PROMESSE, jamais comme un acquis', () => {
    // Sans cette phrase, un enfant croirait l'avoir déjà gagnée — et la déception vaudrait
    // mieux ne rien montrer du tout.
    const { container } = render(
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    const promesse = container.querySelector('[data-promesse-couleur]');
    expect(promesse).not.toBeNull();
    expect(promesse?.textContent).toMatch(/quand tu l’auras/iu);
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
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={fermer} />
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
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={fermer} />
    );
    fireEvent.click(container.querySelector('[data-fiche-visuel]') as Element);
    expect(fermer, 'regarder le dessin fait sortir du panneau').not.toHaveBeenCalled();
  });

  it('le focus part sur la sortie — un panneau sans porte au clavier est un piège', () => {
    const { container } = render(
      <FicheCase une={uneCase(false)} commentLObtenir={null} surFermer={() => undefined} />
    );
    expect(globalThis.document.activeElement).toBe(
      container.querySelector('[data-fermer-fiche]')
    );
  });
});
