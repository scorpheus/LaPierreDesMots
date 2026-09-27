import { describe, expect, it, vi } from 'vitest';

import type { CleAudio } from '@pierre/partage';
import { creerVoixFichier } from '@client/services/voix-fichier';

class LecteurFaux extends EventTarget {
  preload = '';
  volume = 1;
  currentTime = 0;
  readonly play = vi.fn(async () => undefined);
  readonly pause = vi.fn();

  constructor(readonly source: string) { super(); }
  finir(): void { this.dispatchEvent(new Event('ended')); }
}

function manifeste(...cles: readonly string[]): unknown {
  return {
    version: 1, genereLe: '2026-09-26T00:00:00.000Z', moteurTts: 'piper/2023.11.14-2',
    clips: cles.map((cle) => ({ cle, rendu: 'normal', locuteur: 'narrateur', texte: cle,
      fichier: `audio/maths/${cle.replaceAll('/', '-')}.opus`, dureeMs: 500, octets: 2048,
      empreinteTexte: 'a'.repeat(64), qcScore: 1 })),
  };
}

function monter(cles: readonly string[] = ['maths/a', 'maths/b']) {
  const lecteurs: LecteurFaux[] = [];
  const voix = creerVoixFichier({ creerLecteur: (source) => {
    const lecteur = new LecteurFaux(source); lecteurs.push(lecteur); return lecteur as unknown as HTMLAudioElement;
  } });
  voix.chargerManifeste(manifeste(...cles));
  return { voix, lecteurs };
}

describe('direSequence — consigne maths segmentée', () => {
  it('attend ended avant de lancer le segment suivant', async () => {
    const { voix, lecteurs } = monter();
    const sequence = voix.direSequence?.([
      { texte: 'Mesure ', cle: 'maths/a' as CleAudio }, { texte: 'huit.', cle: 'maths/b' as CleAudio },
    ]);
    await Promise.resolve();
    expect(lecteurs).toHaveLength(1);
    expect(lecteurs[1]).toBeUndefined();
    lecteurs[0]?.finir();
    await Promise.resolve();
    expect(lecteurs).toHaveLength(2);
    lecteurs[1]?.finir();
    await sequence;
  });

  it('taire annule la séquence sans lancer un segment en attente', async () => {
    const { voix, lecteurs } = monter();
    const sequence = voix.direSequence?.([
      { texte: 'Mesure ', cle: 'maths/a' as CleAudio }, { texte: 'huit.', cle: 'maths/b' as CleAudio },
    ]);
    await Promise.resolve();
    voix.taire();
    await sequence;
    expect(lecteurs[0]?.pause).toHaveBeenCalledTimes(1);
    expect(lecteurs).toHaveLength(1);
  });

  it('refuse toute la séquence si un segment n’a pas de clip', async () => {
    const { voix, lecteurs } = monter(['maths/a']);
    await voix.direSequence?.([
      { texte: 'Mesure ', cle: 'maths/a' as CleAudio }, { texte: 'huit.', cle: 'maths/b' as CleAudio },
    ]);
    expect(lecteurs).toHaveLength(0);
  });

  it('un nouvel appel interrompt la séquence en cours avant son propre clip', async () => {
    const { voix, lecteurs } = monter();
    const sequence = voix.direSequence?.([
      { texte: 'Mesure ', cle: 'maths/a' as CleAudio }, { texte: 'huit.', cle: 'maths/b' as CleAudio },
    ]);
    await Promise.resolve();
    await voix.dire({ texte: 'Autre consigne', cle: 'maths/b' as CleAudio });
    await sequence;
    expect(lecteurs[0]?.pause).toHaveBeenCalledTimes(1);
    expect(lecteurs).toHaveLength(2);
  });
});
