// Décision du parent du 9 oct. 2026 : la parole est ÉTEINTE par défaut, et un seul réglage du
// foyer la commande partout (bouton « Écouter », répliques du campement, consignes des maths).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CleAudio, DemandeVoix, FournisseurVoix } from '@pierre/partage';
import { brancherReglageVoix } from '@client/services/voix-reglee';
import { readFileSync } from 'node:fs';
import { chargerManifesteVoix, creerServicesParDefaut } from '@client/etat/services';
import {
  CLE_STOCKAGE_FOYER,
  ecrireReglagesFoyer,
  lireReglagesFoyer,
  oublierReglagesFoyer
} from '@client/parent/reglages-foyer';

const CLE = 'clairiere-ecole-01/c1' as CleAudio;

function voixEspionne(): FournisseurVoix & { readonly dits: DemandeVoix[] } {
  const dits: DemandeVoix[] = [];
  return {
    dits,
    disponible: true,
    dire: vi.fn(async (demande: DemandeVoix) => { dits.push(demande); }),
    direSequence: vi.fn(async (demandes: readonly DemandeVoix[]) => { dits.push(...demandes); }),
    taire: vi.fn(),
    aUnClip: (cle: CleAudio | null) => cle === CLE
  };
}

afterEach(() => {
  globalThis.localStorage?.removeItem(CLE_STOCKAGE_FOYER);
  oublierReglagesFoyer();
});

describe('la voix suit le réglage du foyer', () => {
  it('par défaut, la parole est éteinte (décision du parent)', () => {
    expect(lireReglagesFoyer().boutonEcouter).toBe(false);
  });

  it('éteinte : rien n’est dit, aucun clip n’est annoncé, donc aucun bouton « Écouter »', async () => {
    const voix = voixEspionne();
    const reglee = brancherReglageVoix(voix, () => false);
    await reglee.dire({ texte: 'Bonjour', cle: CLE });
    await reglee.direSequence?.([{ texte: 'Cinq plus sept.', cle: CLE }]);
    expect(voix.dits).toEqual([]);
    expect(reglee.aUnClip(CLE)).toBe(false);
  });

  it('allumée : tout passe, et le reste du fournisseur est intact', async () => {
    const voix = voixEspionne();
    const reglee = brancherReglageVoix(voix, () => true);
    await reglee.dire({ texte: 'Bonjour', cle: CLE });
    expect(voix.dits).toHaveLength(1);
    expect(reglee.aUnClip(CLE)).toBe(true);
    expect(reglee.disponible).toBe(true);
    reglee.taire();
    expect(voix.taire).toHaveBeenCalledTimes(1);
  });

  it('les services du jeu branchent bien ce réglage, et il agit sans rechargement', () => {
    const services = creerServicesParDefaut(1);
    // Le manifeste RÉEL des voix livrées : une clé qui a vraiment un clip.
    const manifeste = JSON.parse(readFileSync('contenu/audio/manifeste.json', 'utf8')) as { clips: { cle: string }[] };
    const cleLivree = manifeste.clips[0]!.cle as CleAudio;
    chargerManifesteVoix(services, manifeste);
    expect(services.voix.aUnClip(cleLivree), 'parole éteinte par défaut : aucun clip annoncé').toBe(false);
    ecrireReglagesFoyer({ boutonEcouter: true });
    expect(services.voix.aUnClip(cleLivree), 'le parent rallume : le clip réapparaît aussitôt').toBe(true);
  });
});
