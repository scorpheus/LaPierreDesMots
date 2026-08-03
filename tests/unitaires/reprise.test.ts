/**
 * OÙ L'ENFANT REPREND, ET OÙ IL VA ENSUITE — R3.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CE FICHIER GARDE
 *
 * « quand l'exercice est fini, il y a soit rejoué ou retour a la carte ? il n'y a pas d'autres
 * exercice dans la clairiere ? » — retour de jeu du père, 2026-08-03. Il y en a **douze**, et la
 * carte l'affichait même. L'écran de récompense, lui, ne menait nulle part : pour qui ne
 * repassait pas par la carte, **le jeu s'arrêtait au premier exercice**. Il s'y est arrêté deux
 * fois avant de le signaler.
 *
 * La règle de reprise vivait dans un `useCallback` de `EcranCarte`. La recopier dans l'écran de
 * récompense aurait donné deux règles pour un même choix — la faute exacte trouvée deux fois
 * dans la même journée (les polices, les décors des moteurs). Elle est donc extraite, pure, et
 * gardée ici.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, test } from 'vitest';

import { noeudSuivant, repriseDeRegion } from '@client/monde/reprise.js';

import type { IdNoeud } from '@pierre/partage';

/** Les douze nœuds de la Clairière, dans l'ordre réel du contenu. */
const CLAIRIERE = Array.from(
  { length: 12 },
  (_, rang) => `clairiere-${String(rang + 1).padStart(2, '0')}` as IdNoeud
);

const faits = (...ids: readonly string[]): ReadonlySet<string> => new Set(ids);

describe('repriseDeRegion — par où l’on entre dans une région', () => {
  test('profil neuf : le premier nœud, rang 1', () => {
    expect(repriseDeRegion(CLAIRIERE, faits())).toEqual({ noeud: 'clairiere-01', rang: 1 });
  });

  test('le premier NON FAIT, et le rang que la carte affiche', () => {
    const point = repriseDeRegion(CLAIRIERE, faits('clairiere-01', 'clairiere-02'));
    expect(point).toEqual({ noeud: 'clairiere-03', rang: 3 });
  });

  test('un trou au milieu se rattrape : on n’avance pas en laissant un nœud derrière', () => {
    const point = repriseDeRegion(CLAIRIERE, faits('clairiere-01', 'clairiere-03'));
    expect(point.noeud, 'le 02 doit être repris avant le 04').toBe('clairiere-02');
  });

  test('région ENTIÈRE : on renvoie sur le premier, jamais sur rien (R14, v2 § 6.2)', () => {
    // Une prise qui cesserait de répondre serait un état sans issue — le pire défaut possible
    // sur une appli d'enfant. Rejouer un nœud à trois étoiles reste du plaisir.
    const point = repriseDeRegion(CLAIRIERE, faits(...CLAIRIERE.map(String)));
    expect(point).toEqual({ noeud: 'clairiere-01', rang: 1 });
  });

  test('région sans contenu : aucun nœud, rang 0 — et pas une exception', () => {
    expect(repriseDeRegion([], faits())).toEqual({ noeud: null, rang: 0 });
  });
});

describe('noeudSuivant — LE DÉFAUT CORRIGÉ : le chemin vers l’exercice d’après', () => {
  test('après le premier, on propose le deuxième', () => {
    expect(noeudSuivant(CLAIRIERE, faits('clairiere-01'), 'clairiere-01' as IdNoeud)).toBe(
      'clairiere-02'
    );
  });

  test('on saute ceux qui sont déjà faits, dans l’ordre de la région', () => {
    const suivant = noeudSuivant(
      CLAIRIERE,
      faits('clairiere-01', 'clairiere-02', 'clairiere-03'),
      'clairiere-01' as IdNoeud
    );
    expect(suivant).toBe('clairiere-04');
  });

  test('rien après lui : on revient chercher le trou laissé AVANT', () => {
    // Sinon un nœud sauté ne serait plus atteignable qu'en repassant par la carte, ce qui est
    // le défaut qu'on corrige, déplacé d'un cran.
    const faitsSaufDeux = faits(...CLAIRIERE.filter((id) => id !== 'clairiere-02').map(String));
    expect(noeudSuivant(CLAIRIERE, faitsSaufDeux, 'clairiere-12' as IdNoeud)).toBe('clairiere-02');
  });

  test('RÉGION ENTIÈRE : `null`, et donc AUCUN bouton « suivant »', () => {
    // Ici la règle diffère volontairement de `repriseDeRegion` : proposer un exercice déjà à
    // trois étoiles ferait croire à une progression qui n'existe plus. Revenir à la carte est
    // le bon geste — c'est là que le rallumage de la région se voit (D51).
    const tout = faits(...CLAIRIERE.map(String));
    expect(noeudSuivant(CLAIRIERE, tout, 'clairiere-12' as IdNoeud)).toBeNull();
  });

  test('un nœud courant inconnu de la région ne rend JAMAIS un cul-de-sac', () => {
    // Région recomposée entre-temps : on propose le premier non fait plutôt que rien.
    expect(noeudSuivant(CLAIRIERE, faits('clairiere-01'), 'galeries-07' as IdNoeud)).toBe(
      'clairiere-02'
    );
  });

  test('PROPRIÉTÉ — le nœud proposé n’est jamais un nœud déjà fait', () => {
    // Vraie pour toute combinaison, et c'est ce qui compte : un « exercice suivant » qui
    // reproposerait ce qu'on vient de finir serait pire que pas de bouton du tout.
    for (let masque = 0; masque < 1 << CLAIRIERE.length; masque += 617) {
      const ensemble = faits(
        ...CLAIRIERE.filter((_, rang) => (masque & (1 << rang)) !== 0).map(String)
      );
      for (const courant of CLAIRIERE) {
        const propose = noeudSuivant(CLAIRIERE, ensemble, courant);
        if (propose !== null) {
          expect(ensemble.has(String(propose)), `${courant} → ${String(propose)}`).toBe(false);
        }
      }
    }
  });
});
