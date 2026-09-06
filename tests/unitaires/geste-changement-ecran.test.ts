// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { protegerChangementEcran } from '@client/interaction/proteger-changement-ecran.js';

afterEach(() => { document.body.replaceChildren(); });

describe('un geste appartient à un seul écran', () => {
  it('le relâchement qui termine le coloriage ne rejoue pas la récompense', () => {
    document.body.innerHTML = '<main data-ecran="noeud"><button>peindre</button></main>';
    const retirer = protegerChangementEcran(document);
    document.querySelector('button')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.body.innerHTML = '<main data-ecran="recompense"><button>encore une fois</button></main>';
    const bouton = document.querySelector('button')!;
    const rejouer = vi.fn();
    bouton.addEventListener('click', rejouer);
    bouton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    expect(rejouer).not.toHaveBeenCalled();
    bouton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    bouton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(rejouer).toHaveBeenCalledTimes(1);
    retirer();
  });

  it('la lecture clavier et les taps sans changement d’écran restent libres', () => {
    document.body.innerHTML = '<main data-ecran="noeud"><button>lire</button></main>';
    const retirer = protegerChangementEcran(document);
    const bouton = document.querySelector('button')!;
    const lire = vi.fn();
    bouton.addEventListener('click', lire);
    bouton.click();
    bouton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    bouton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(lire).toHaveBeenCalledTimes(2);
    retirer();
  });
});
