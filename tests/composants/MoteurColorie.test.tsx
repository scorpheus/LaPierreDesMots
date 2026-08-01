/**
 * Le moteur `colorie` monté isolément — annexe T § T1, « un test par moteur pour : bonne
 * réponse, mauvaise réponse, aide de Gobi, double-tap rapide, désordre de rendu ».
 *
 * Le composant de L-E est **contrôlé** : il reçoit `etat` et `emettre` (contrat § 4.4). Le
 * harnais ci-dessous referme la boucle avec le vrai réducteur `moteurColorie.reduire`, de
 * sorte que ce fichier teste l'assemblage réel logique + rendu, pas une maquette.
 *
 * Aucun réseau : `fetch` est servi depuis `contenu/` sur disque. C'est l'application de
 * l'annexe T § 2.3 — un test ne parle jamais au réseau réel.
 */
import { readFileSync } from 'node:fs';
import { useCallback, useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { moteurColorie } from '@partage/moteurs/colorie/moteur';
import { renduColorie } from '@client/moteurs/colorie/index';

import type { ActionColorie, ContenuColorie, EtatColorie } from '@partage/moteurs/colorie/types';
import type { Exercice, Habillage } from '@pierre/partage';

import {
  CHEMIN_EXERCICE_ECOLE,
  RACINE_DEPOT,
  habillageEcole,
  lireJson,
  servicesDeTest
} from '../configuration/preparation.js';

const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
const contenu = exercice.jeu.contenu as ContenuColorie;
const habillage: Habillage = habillageEcole();

/**
 * Sert `contenu/**` depuis le disque, quelle que soit la forme d'URL choisie par L-E
 * (`/api/contenu/assets/…` ou chemin relatif). Toute autre URL est un appel sortant : on la
 * refuse bruyamment plutôt que de la laisser passer (R10).
 */
function installerFetchLocal(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown): Promise<Response> => {
      const url = String(
        typeof entree === 'string' ? entree : ((entree as { url?: string }).url ?? entree)
      );
      const apres = url.split('/api/contenu/assets/')[1] ?? url.split('contenu/')[1];
      if (apres === undefined) {
        throw new Error(`appel sortant interdit en test : ${url}`);
      }
      const corps = readFileSync(new URL(`contenu/${apres}`, RACINE_DEPOT), 'utf8');
      return new Response(corps, {
        status: 200,
        headers: { 'content-type': apres.endsWith('.svg') ? 'image/svg+xml' : 'application/json' }
      });
    })
  );
}

/** Harnais : le vrai réducteur derrière le vrai rendu. */
function Harnais({
  surEtat
}: {
  readonly surEtat?: (etat: EtatColorie) => void;
}): React.ReactElement {
  const services = servicesDeTest();
  const [etat, setEtat] = useState<EtatColorie>(() =>
    moteurColorie.creerEtat({
      contenu,
      habillage,
      alea: services.alea,
      horloge: services.horloge
    })
  );

  const emettre = useCallback(
    (action: ActionColorie) => {
      setEtat((courant) => {
        const suivant = moteurColorie.reduire(courant, action, {
          alea: services.alea,
          horloge: services.horloge
        });
        surEtat?.(suivant);
        return suivant;
      });
    },
    [services.alea, services.horloge, surEtat]
  );

  const Composant = renduColorie.Composant;
  return (
    <Composant
      contenu={contenu}
      habillage={habillage}
      etat={etat}
      emettre={emettre}
      services={services}
      animationsDesactivees
    />
  );
}

function godet(couleur: string): HTMLElement {
  const element = document.querySelector(`[data-godet="${couleur}"]`);
  if (!element) throw new Error(`aucun godet « ${couleur} » dans le nuancier rendu`);
  return element as HTMLElement;
}

function region(id: string): HTMLElement {
  const element = document.querySelector(`[data-region-svg="${id}"]`);
  if (!element) throw new Error(`aucune région « ${id} » dans la scène rendue`);
  return element as HTMLElement;
}

const premiereCible = contenu.consignes[0]!.cibles[0]!;

/** Une couleur du nuancier qui n'est pas celle attendue par la première cible. */
const couleurFausse =
  contenu.nuancierAutorise.find((c) => c !== premiereCible.couleur) ?? premiereCible.couleur;

beforeEach(() => {
  installerFetchLocal();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MoteurColorie — rendu', () => {
  it('rend la consigne active et les godets du nuancier autorisé', async () => {
    render(<Harnais />);
    const consigne = await screen.findByText(contenu.consignes[0]!.texte);
    expect(consigne).toBeTruthy();
    for (const couleur of contenu.nuancierAutorise) {
      expect(godet(couleur)).toBeTruthy();
    }
  });

  it('rend une région par région coloriable de l’habillage, toutes non peintes', async () => {
    render(<Harnais />);
    await screen.findByText(contenu.consignes[0]!.texte);
    const regions = document.querySelectorAll('[data-region-svg]');
    const coloriables = habillage.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions);
    expect(regions.length).toBe(coloriables.length);
    for (const element of regions) {
      expect(element.getAttribute('data-peinte')).toBe('non');
    }
  });

  it('n’émet JAMAIS `data-etat="echec"` — R14', async () => {
    render(<Harnais />);
    await screen.findByText(contenu.consignes[0]!.texte);
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });
});

describe('MoteurColorie — bonne réponse', () => {
  it('peint la région et marque la consigne faite', async () => {
    const utilisateur = userEvent.setup();
    render(<Harnais />);
    await screen.findByText(contenu.consignes[0]!.texte);

    await utilisateur.click(godet(premiereCible.couleur));
    expect(godet(premiereCible.couleur).getAttribute('data-choisie')).toBe('oui');

    await utilisateur.click(region(premiereCible.region));

    const peinte = region(premiereCible.region);
    expect(peinte.getAttribute('data-peinte')).toBe('oui');
    expect(peinte.getAttribute('data-couleur')).toBe(premiereCible.couleur);
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('enchaîne automatiquement sur la consigne suivante — aucun bouton « valider »', async () => {
    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    for (const cible of contenu.consignes[0]!.cibles) {
      await utilisateur.click(godet(cible.couleur));
      await utilisateur.click(region(cible.region));
    }

    expect(dernier).not.toBeNull();
    expect((dernier as unknown as EtatColorie).indexConsigne).toBe(1);
    const ligne = document.querySelector(`[data-consigne="${contenu.consignes[1]!.id}"]`);
    expect(ligne?.getAttribute('data-consigne-etat')).toBe('courante');
  });
});

describe('MoteurColorie — mauvaise réponse', () => {
  it('ne peint pas, ne montre aucun échec, et compte une erreur', async () => {
    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    await utilisateur.click(godet(couleurFausse));
    await utilisateur.click(region(premiereCible.region));

    expect(region(premiereCible.region).getAttribute('data-peinte')).toBe('non');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
    const etat = dernier as unknown as EtatColorie;
    expect(etat.consignes[etat.indexConsigne]!.nbErreurs).toBe(1);
  });

  it('toucher sans avoir choisi de couleur ne compte pas d’erreur', async () => {
    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    await utilisateur.click(region(premiereCible.region));

    const etat = dernier as unknown as EtatColorie;
    expect(etat.consignes[etat.indexConsigne]!.nbErreurs).toBe(0);
    expect(etat.dernierRefus?.motif).toBe('aucune-couleur-choisie');
  });
});

describe('MoteurColorie — aide de Gobi', () => {
  it('la 2ᵉ erreur fait passer le niveau d’aide à « indice »', async () => {
    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    await utilisateur.click(godet(couleurFausse));
    await utilisateur.click(region(premiereCible.region));
    await utilisateur.click(region(premiereCible.region));

    expect((dernier as unknown as EtatColorie).niveauAide).toBe('indice');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('l’aide n’est jamais retirée une fois acquise', async () => {
    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    await utilisateur.click(godet(couleurFausse));
    await utilisateur.click(region(premiereCible.region));
    await utilisateur.click(region(premiereCible.region));
    // Puis on répond juste : le niveau ne redescend pas.
    await utilisateur.click(godet(premiereCible.couleur));
    await utilisateur.click(region(premiereCible.region));

    expect((dernier as unknown as EtatColorie).niveauAide).not.toBe('aucune');
  });
});

describe('MoteurColorie — double-tap rapide', () => {
  it('deux touchers immédiats ne produisent qu’un remplissage et aucune erreur', async () => {
    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    await utilisateur.click(godet(premiereCible.couleur));
    const cible = region(premiereCible.region);
    await utilisateur.dblClick(cible);

    const etat = dernier as unknown as EtatColorie;
    expect(Object.keys(etat.remplissages).filter((id) => id === premiereCible.region)).toHaveLength(
      1
    );
    expect(etat.remplissages[premiereCible.region]).toBe(premiereCible.couleur);
    // `region-deja-peinte` ne compte pas comme erreur — contrat § 5.5.
    expect(etat.consignes[0]!.nbErreurs).toBe(0);
  });
});

describe('MoteurColorie — désordre de rendu', () => {
  it('à l’intérieur d’une consigne, l’ordre des cibles est libre — contrat § 5.3', async () => {
    const consigneMultiple = contenu.consignes.find((c) => c.cibles.length >= 2);
    if (!consigneMultiple) throw new Error('aucune consigne à plusieurs cibles dans la v1');

    const utilisateur = userEvent.setup();
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await screen.findByText(contenu.consignes[0]!.texte);

    // Atteindre la consigne à plusieurs cibles, dans l'ordre imposé.
    for (const consigne of contenu.consignes) {
      if (consigne.id === consigneMultiple.id) break;
      for (const cible of consigne.cibles) {
        await utilisateur.click(godet(cible.couleur));
        await utilisateur.click(region(cible.region));
      }
    }

    // Puis peindre ses cibles à l'envers.
    for (const cible of [...consigneMultiple.cibles].reverse()) {
      await utilisateur.click(godet(cible.couleur));
      await utilisateur.click(region(cible.region));
    }

    const etat = dernier as unknown as EtatColorie;
    for (const cible of consigneMultiple.cibles) {
      expect(etat.remplissages[cible.region]).toBe(cible.couleur);
    }
  });

  it('les godets restent tous disponibles : le nuancier n’est jamais restreint à la consigne', async () => {
    render(<Harnais />);
    await screen.findByText(contenu.consignes[0]!.texte);
    const nuancier = document.querySelectorAll('[data-godet]');
    expect(nuancier.length).toBe(contenu.nuancierAutorise.length);
    for (const element of nuancier) {
      expect((element as HTMLElement).hasAttribute('disabled')).toBe(false);
    }
  });

  it('chaque godet porte un libellé accessible — a11y, annexe T § T5', async () => {
    render(<Harnais />);
    await screen.findByText(contenu.consignes[0]!.texte);
    for (const couleur of contenu.nuancierAutorise) {
      const element = godet(couleur);
      const libelle =
        element.getAttribute('aria-label') ??
        element.getAttribute('title') ??
        within(element).queryByText(/\S/)?.textContent ??
        '';
      expect(libelle.trim().length).toBeGreaterThan(0);
    }
  });
});
