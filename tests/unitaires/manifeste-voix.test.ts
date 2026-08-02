/**
 * Le manifeste des voix — lot N2, contrat de finition v3 § 4.2 et § 5.4.
 *
 * CE QUE CE FICHIER GARANTIT, et que rien d'autre ne garantit : `aUnAudio` est la fonction sur
 * laquelle D42 s'appuie pour masquer le bouton « écouter ». Si elle rend `true` sur une clé
 * sans clip, l'enfant retombe exactement sur le défaut n° 3 du père — « j'ai cliqué et je n'ai
 * rien eu ». Si elle rend `false` sur une clé qui en a un, l'aide à la lecture disparaît en
 * silence. Les deux sens sont testés.
 *
 * Tout est PUR ici : aucun disque, aucun réseau. Le manifeste réel est éprouvé par
 * `couverture-audio.test.ts`, qui est le contrat de sortie chiffré du lot.
 */
import { describe, expect, it } from 'vitest';

import {
  LOCUTEURS,
  MANIFESTE_VIDE,
  RENDU_PAR_DEFAUT,
  SEUIL_QC,
  aUnAudio,
  clipDe,
  couvertureConsignes,
  estLocuteur,
  lireManifeste,
  rendusDe,
} from '@pierre/partage/voix';
import type { ClipVoix, ManifesteVoix, RenduVoix } from '@pierre/partage/voix';

function clip(
  cle: string,
  rendu: RenduVoix = 'normal',
  qcScore = 0.99,
): ClipVoix {
  return {
    cle,
    rendu,
    locuteur: 'narrateur',
    texte: `texte de ${cle}`,
    fichier: `audio/essai/${cle.replaceAll('/', '-')}.${rendu}.opus`,
    dureeMs: 1200,
    octets: 4096,
    empreinteTexte: 'a'.repeat(64),
    qcScore,
  };
}

function manifeste(...clips: readonly ClipVoix[]): ManifesteVoix {
  return {
    version: 1,
    genereLe: '2026-09-01T08:00:00.000Z',
    moteurTts: 'piper/2023.11.14-2',
    clips,
  };
}

describe('D41 — les sept locuteurs', () => {
  it('l’union en compte exactement sept, et la valeur suit le type', () => {
    expect(LOCUTEURS).toHaveLength(7);
    expect([...LOCUTEURS].sort()).toEqual(
      ['bulle', 'filou', 'gobi', 'maitresse', 'narrateur', 'plume', 'roc'],
    );
  });

  it('`enfant` a bien été RETIRÉ de l’union v1 — D41 écarte l’enregistrement familial', () => {
    expect(estLocuteur('enfant')).toBe(false);
    expect(estLocuteur('narrateur')).toBe(true);
  });
});

describe('D42 — le bouton n’existe que si le clip existe', () => {
  it('rend faux sur un manifeste vide : c’est l’état d’une installation neuve', () => {
    expect(aUnAudio(MANIFESTE_VIDE, 'clairiere-ecole-01/c1')).toBe(false);
    expect(MANIFESTE_VIDE.clips).toHaveLength(0);
  });

  it('rend faux sur `null` et sur la chaîne vide, sans lever', () => {
    expect(aUnAudio(MANIFESTE_VIDE, null)).toBe(false);
    expect(aUnAudio(manifeste(clip('a/b')), '')).toBe(false);
  });

  it('rend vrai UNIQUEMENT sur une clé dont le rendu `normal` existe', () => {
    const m = manifeste(clip('a/b', 'normal'));
    expect(aUnAudio(m, 'a/b')).toBe(true);
    expect(aUnAudio(m, 'a/c')).toBe(false);
  });

  it('une clé qui n’a QUE sa variante syllabée ne rend pas le bouton', () => {
    // Le bouton joue le rendu `normal`. S'il se rendait sur la seule présence d'un
    // `syllabe`, il jouerait autre chose que ce qu'il promet — et D42 vise précisément
    // « rien ne ment ».
    const m = manifeste(clip('mot/luciole', 'syllabe'));
    expect(aUnAudio(m, 'mot/luciole')).toBe(false);
    expect(rendusDe(m, 'mot/luciole')).toEqual(['syllabe']);
  });
});

describe('clipDe — aucun repli d’un rendu sur un autre', () => {
  it('rend le clip du rendu demandé, et `null` pour les autres', () => {
    const normal = clip('a/b', 'normal');
    const syllabe = clip('a/b', 'syllabe');
    const m = manifeste(normal, syllabe);

    expect(clipDe(m, 'a/b')).toBe(normal);
    expect(clipDe(m, 'a/b', RENDU_PAR_DEFAUT)).toBe(normal);
    expect(clipDe(m, 'a/b', 'syllabe')).toBe(syllabe);
    // Pas de repli : `lent` n'existe pas, donc `null`. Servir le `normal` ferait passer une
    // lecture ordinaire pour un ralenti, et le palier d'aide de D16 cesserait d'aider.
    expect(clipDe(m, 'a/b', 'lent')).toBeNull();
  });
});

describe('couvertureConsignes — le contrat de sortie de N2, en fonction', () => {
  it('compte les clés DISTINCTES : un doublon ne gonfle pas le taux', () => {
    const m = manifeste(clip('a/1'), clip('a/2'));
    const couverture = couvertureConsignes(m, ['a/1', 'a/1', 'a/1', 'a/2']);
    expect(couverture.total).toBe(2);
    expect(couverture.couverts).toBe(2);
    expect(couverture.taux).toBe(1);
  });

  it('nomme les manquants, plutôt que de rendre un taux sans coupable', () => {
    const couverture = couvertureConsignes(manifeste(clip('a/1')), ['a/1', 'a/2', 'a/3']);
    expect(couverture.taux).toBeCloseTo(1 / 3, 10);
    expect(couverture.manquants).toEqual(['a/2', 'a/3']);
  });

  it('un recensement vide rend 1, et c’est `recenser-textes.mjs` qui refuse alors', () => {
    // Rendre 0 ici ferait échouer le contrat de sortie pour une raison — « rien à couvrir » —
    // qui n'est pas celle qu'il mesure. Le refus appartient au recenseur, pas au calcul.
    expect(couvertureConsignes(MANIFESTE_VIDE, []).taux).toBe(1);
  });
});

describe('lireManifeste — un manifeste abîmé rend le jeu muet, jamais noir', () => {
  it('ne lève sur aucune saisie, si bizarre soit-elle', () => {
    for (const brut of [null, undefined, 0, 'texte', [], {}, { clips: 'non' }]) {
      expect(() => lireManifeste(brut)).not.toThrow();
      expect(lireManifeste(brut).clips).toEqual([]);
    }
  });

  it('écarte le clip mal formé et GARDE les autres — la panne reste proportionnelle', () => {
    const lu = lireManifeste({
      version: 1,
      genereLe: '2026-09-01T08:00:00.000Z',
      moteurTts: 'piper/2023.11.14-2',
      clips: [clip('bon/1'), { cle: 'casse/1' }, clip('bon/2')],
    });
    expect(lu.clips.map((c) => c.cle)).toEqual(['bon/1', 'bon/2']);
  });

  it('refuse un clip sous SEUIL_QC — un clip inintelligible est pire qu’un bouton absent', () => {
    const lu = lireManifeste({
      clips: [clip('net/1', 'normal', 0.99), clip('brouille/1', 'normal', SEUIL_QC - 0.01)],
    });
    expect(lu.clips.map((c) => c.cle)).toEqual(['net/1']);
    expect(aUnAudio(lu, 'brouille/1')).toBe(false);
  });

  it('refuse un locuteur hors des sept — une voix inconnue n’entre pas dans le jeu', () => {
    const lu = lireManifeste({
      clips: [{ ...clip('a/1'), locuteur: 'enfant' }, clip('a/2')],
    });
    expect(lu.clips.map((c) => c.cle)).toEqual(['a/2']);
  });
});
