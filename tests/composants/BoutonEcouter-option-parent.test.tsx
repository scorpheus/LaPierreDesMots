/**
 * LE RÉGLAGE PARENT DU BOUTON « ÉCOUTER » — demande du père, verbatim :
 *
 *   « une option pour activer ou desactiver du cote parent le bouton ecouter (pour l instant
 *     j ai clique et je n ai rien eu) »
 *
 * Deux choses distinctes se cachent dans cette phrase, et ce fichier les sépare :
 *
 *   • « j'ai cliqué et je n'ai rien eu » → **D42**, l'honnêteté. Le bouton est masqué quand
 *     aucun clip n'existe. Mesuré par `tests/composants/BoutonEcouter-reponse.test.tsx`.
 *   • « une option pour activer ou désactiver du côté parent » → le réglage lui-même, mesuré
 *     ici. Il vaut MÊME QUAND UN CLIP EXISTE : sinon il ne servirait à rien le jour où les
 *     voix (D41) seront produites, c'est-à-dire précisément le jour où le père en aura besoin.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EST GARDÉ ICI, ET QU'AUCUN AUTRE FICHIER NE GARDE :
 *
 * 1. le réglage existe et se pose **depuis la zone parent**, pas depuis un écran de l'enfant ;
 * 2. il agit **sans rechargement** — un parent qui bascule l'interrupteur et retourne au jeu
 *    doit voir l'effet, sinon il conclura que le réglage ne marche pas (c'est déjà ce qui
 *    s'est passé avec le bouton muet) ;
 * 3. il **ne peut pas défaire D42** : rallumé, il ne fait pas réapparaître un bouton muet.
 *    C'est le cas qui empêche la correction de se retourner contre elle-même.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BoutonEcouter } from '@client/composants/BoutonEcouter';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { ReglagesParent } from '@client/parent/ReglagesParent';
import {
  CLE_STOCKAGE_FOYER,
  ecrireReglagesFoyer,
  lireReglagesFoyer,
  normaliserReglagesFoyer,
  oublierReglagesFoyer
} from '@client/parent/reglages-foyer';

import type { CleAudio } from '@pierre/partage';

import { servicesDeTest } from '../configuration/preparation.js';

/** Un clip PRÉSENT : sans lui, D42 masquerait le bouton et le réglage ne prouverait rien. */
// ADAPTÉ PAR N2 : la propriété du bouton passe d'un CHEMIN de clip à une CLÉ de manifeste
// (§ 5.6). L'assertion de ce fichier — « le réglage du parent vaut MÊME QUAND UN CLIP
// EXISTE » — est inchangée ; seul l'oracle bouge, du chemin passé par l'appelant au
// manifeste consulté par le fournisseur. `VoixMuette.clesConnues` est vide par défaut, donc
// le test DÉCLARE sa clé, et devient lisible sur ce qu'il suppose.
const CLE = 'galeries-miroir-bd-01/c1' as CleAudio;

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

function monterBouton(cle: CleAudio | null = CLE): void {
  const jeu = services();
  if (cle !== null) {
    jeu.voix.clesConnues.add(cle);
  }
  render(
    <FournisseurJeu valeur={{ services: jeu, magasin: creerMagasin(jeu) }}>
      <BoutonEcouter texte="Trace la lettre d." cle={cle} />
    </FournisseurJeu>
  );
}

const bouton = (): Element | null => document.querySelector('[data-action="ecouter"]');
const interrupteur = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('[data-reglage="bouton-ecouter"]');

afterEach(() => {
  cleanup();
  // Le stockage ET l'instantané en mémoire : oublier l'un sans l'autre laisserait fuir le
  // réglage d'un cas dans le suivant, et un test qui fuit ne garde rien.
  globalThis.localStorage?.removeItem(CLE_STOCKAGE_FOYER);
  oublierReglagesFoyer();
});

describe('le réglage parent « proposer le bouton Écouter »', () => {
  it('par défaut le bouton est proposé — R15 tient sans qu’on touche à rien', () => {
    // Contrôle de la mesure : si ce cas échouait, tous les suivants seraient verts pour la
    // mauvaise raison (un bouton absent partout « prouve » n'importe quel masquage).
    expect(lireReglagesFoyer().boutonEcouter).toBe(true);
    monterBouton();
    expect(bouton()).not.toBeNull();
  });

  it('réglage éteint : le bouton n’est pas rendu, MÊME avec un clip', () => {
    ecrireReglagesFoyer({ boutonEcouter: false });
    monterBouton();
    expect(
      bouton(),
      'le parent a retiré le bouton ; un clip disponible ne le lui rend pas'
    ).toBeNull();
  });

  it('la bascule agit sans rechargement, dans les deux sens', () => {
    monterBouton();
    expect(bouton()).not.toBeNull();

    act(() => {
      ecrireReglagesFoyer({ boutonEcouter: false });
    });
    expect(bouton(), 'le parent éteint, le jeu suit tout de suite').toBeNull();

    act(() => {
      ecrireReglagesFoyer({ boutonEcouter: true });
    });
    expect(bouton(), 'et se rallume aussi vite — aucun acquis n’est repris (R14)').not.toBeNull();
  });

  it('rallumé, il ne fait PAS réapparaître un bouton muet — D42 prime', () => {
    // Le piège que ce cas ferme : un réglage « activer le bouton écouter » invite à traiter
    // les deux conditions comme un OU. Ce serait rendre au père exactement le bouton qui l'a
    // déçu, et par le levier censé le protéger.
    ecrireReglagesFoyer({ boutonEcouter: true });
    monterBouton(null);
    expect(bouton()).toBeNull();
  });

  it('le réglage se pose depuis la ZONE PARENT, et il persiste', () => {
    // Le chemin réel du père : il ouvre l'espace parent et coche la case. Passer par
    // `ecrireReglagesFoyer` seul prouverait le magasin, pas l'existence de la commande.
    render(<ReglagesParent />);
    const commande = interrupteur();
    expect(commande, 'aucune commande dans la zone parent pour ce réglage').not.toBeNull();
    expect(commande?.checked).toBe(true);

    fireEvent.click(commande as HTMLInputElement);

    expect(lireReglagesFoyer().boutonEcouter).toBe(false);
    expect(interrupteur()?.checked).toBe(false);

    // Persistance : le réglage doit survivre à la fermeture de l'onglet, sinon le parent le
    // reposera à chaque session et finira par ne plus s'en servir.
    const stocke = globalThis.localStorage?.getItem(CLE_STOCKAGE_FOYER) ?? 'null';
    expect(
      normaliserReglagesFoyer(JSON.parse(stocke) as Record<string, never>).boutonEcouter
    ).toBe(false);
  });

  it('un enregistrement écrit AVANT ce réglage garde son bouton', () => {
    // Le foyer a déjà joué : `localStorage` porte les trois réglages d'origine et pas le
    // quatrième. Lire `=== true` au lieu de `!== false` retirerait le bouton à tout le monde
    // à la mise à jour — une régression silencieuse, invisible en développement où le
    // stockage est vide.
    globalThis.localStorage?.setItem(
      CLE_STOCKAGE_FOYER,
      JSON.stringify({ volumeEffets: 0.8, volumeVoix: 1, animationsCalmes: false })
    );
    oublierReglagesFoyer();
    expect(lireReglagesFoyer().boutonEcouter).toBe(true);
  });
});
