/**
 * ON REPREND AVEC LE MÊME JOUEUR — R21.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « quand on appuie sur rafraîchir ou sur retour en arrière, ça enlève le site… sinon on perd
 * carrément tout. »
 *
 * Ce que la mesure a corrigé dans mon diagnostic : **les routes existaient toutes** — `/carte`,
 * `/noeud`, `/recompense`, `/campement`, `/coffre` — et l'URL suivait bien l'écran. Ce n'est pas
 * la route qui se perdait, c'est le JOUEUR :
 *
 *     grep -rn "localStorage" client/src   →   uniquement `parent/reglages-foyer.ts`
 *
 * Le profil choisi ne vivait qu'en mémoire. Un rafraîchissement rechargeait donc la bonne page
 * **sans savoir quel enfant joue**.
 *
 * ── CE QUE CE FICHIER GARDE, ET POURQUOI CHAQUE CAS EXISTE ────────────────────────────────────
 * Un stockage indisponible — navigation privée stricte, rendu hors navigateur — doit dégrader
 * vers « on redemande qui joue », **jamais** vers un écran cassé. C'est la moitié la plus
 * importante : l'autre moitié, retenir, se voit tout de suite ; celle-ci ne se voit que le jour
 * où elle manque, chez quelqu'un d'autre.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  lireProfilMemorise,
  memoriserProfil,
  oublierProfil
} from '@client/etat/profil-memorise.js';

/** Un `localStorage` de test, avec la possibilité de le rendre HOSTILE. */
function poserStockage(options: { readonly hostile?: boolean } = {}): Map<string, string> {
  const contenu = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (cle: string): string | null => {
      if (options.hostile === true) throw new Error('accès refusé');
      return contenu.get(cle) ?? null;
    },
    setItem: (cle: string, valeur: string): void => {
      if (options.hostile === true) throw new Error('accès refusé');
      contenu.set(cle, valeur);
    },
    removeItem: (cle: string): void => {
      if (options.hostile === true) throw new Error('accès refusé');
      contenu.delete(cle);
    }
  });
  return contenu;
}

beforeEach(() => {
  poserStockage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('R21 — l’appareil retient qui joue', () => {
  test('rien de retenu au départ : on redemande', () => {
    expect(lireProfilMemorise()).toBeNull();
  });

  test('LE DÉFAUT CORRIGÉ — un joueur choisi se retrouve au rafraîchissement suivant', () => {
    memoriserProfil('prf-0fbbeba7fb27d3f7');
    expect(lireProfilMemorise()).toBe('prf-0fbbeba7fb27d3f7');
  });

  test('changer de joueur EFFACE la mémoire', () => {
    // Sans ça, le prochain démarrage rouvrirait la partie de l'enfant précédent — pire que de
    // redemander, parce que personne ne comprendrait pourquoi.
    memoriserProfil('prf-un');
    oublierProfil();
    expect(lireProfilMemorise()).toBeNull();
  });

  test('une valeur vide ou blanche compte pour RIEN, pas pour un identifiant', () => {
    memoriserProfil('   ');
    expect(lireProfilMemorise(), 'un identifiant blanc partirait chercher un profil inexistant')
      .toBeNull();
  });

  test('STOCKAGE HOSTILE — on redemande qui joue, on ne casse jamais l’écran', () => {
    // Navigation privée stricte : `localStorage` existe et LÈVE à chaque appel. Les trois
    // fonctions doivent absorber, parce qu'une exception ici remonterait au démarrage de
    // l'application et laisserait l'enfant devant une page blanche.
    poserStockage({ hostile: true });
    expect(() => memoriserProfil('prf-un')).not.toThrow();
    expect(lireProfilMemorise()).toBeNull();
    expect(() => oublierProfil()).not.toThrow();
  });

  test('STOCKAGE ABSENT — même exigence, sans `localStorage` du tout', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => memoriserProfil('prf-un')).not.toThrow();
    expect(lireProfilMemorise()).toBeNull();
    expect(() => oublierProfil()).not.toThrow();
  });

  test('la clé ne collisionne pas avec celle des réglages du foyer', () => {
    // Deux préférences d'appareil, deux clés. Une collision ferait qu'un changement de joueur
    // effacerait les réglages de lecture du parent.
    const contenu = poserStockage();
    memoriserProfil('prf-un');
    expect([...contenu.keys()]).toEqual(['pierre.joueur']);
  });
});
