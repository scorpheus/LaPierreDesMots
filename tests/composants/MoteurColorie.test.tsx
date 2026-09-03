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
import { join } from 'node:path';
import { useCallback, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { moteurColorie } from '@partage/moteurs/colorie/moteur';
import { renduColorie, SceneSvg } from '@client/moteurs/colorie/index';
import { regionSousLeDoigt } from '@pierre/partage';

import type { ActionColorie, ContenuColorie, EtatColorie } from '@partage/moteurs/colorie/types';
import type { Exercice, Habillage } from '@pierre/partage';

import {
  CHEMIN_EXERCICE_ECOLE,
  CHEMIN_SVG_ECOLE,
  RACINE_DEPOT,
  habillageEcole,
  lireJson,
  lireTexte,
  servicesDeTest
} from '../configuration/preparation.js';

const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
const contenu = exercice.jeu.contenu as ContenuColorie;
const habillage: Habillage = habillageEcole();

/**
 * Sert `contenu/**` depuis le disque, quelle que soit la forme d'URL choisie par L-E
 * (`/api/contenu/assets/…` ou chemin relatif). Toute autre URL est un appel sortant : on la
 * refuse bruyamment plutôt que de la laisser passer (R10).
 *
 * ⚠ CE STUB A LONGTEMPS ÉTÉ MUET, ET IL A RENDU DEUX DÉFAUTS INVISIBLES.
 * Il lisait `new URL(\`contenu/${apres}\`, RACINE_DEPOT)`. Or `RACINE_DEPOT` est un CHEMIN
 * SYSTÈME depuis sa correction (`preparation.ts` le dit en toutes lettres), pas une URL
 * `file:` — mesuré :
 *   `new URL('contenu/habillages/clairiere/ecole.svg', 'C:\\…\\LaPierreDesMots\\')`
 *   → `TypeError [ERR_INVALID_URL]: Invalid URL`
 * Le `.catch()` de `MoteurColorie` avalait l'exception en silence — c'est sa règle, l'asset
 * peut manquer et le jeu doit rester jouable — et TOUTE la suite composant jouait donc le
 * décor de repli. Le décor réel, seul à atteindre l'enfant, n'était testé par personne.
 * `join` et non `new URL` : c'est exactement la correction déjà faite dans `lireJson`.
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
      const corps = readFileSync(join(RACINE_DEPOT, 'contenu', ...apres.split('/')), 'utf8');
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

/**
 * Attend que la SCÈNE soit montée — un ÉTAT, jamais un délai (annexe T § 6).
 *
 * Ces cas attendaient jusqu'ici l'apparition du texte de la consigne, qui servait d'accusé de
 * montage. R49 l'a déplacé chez `EcranNoeud` : ce fichier attend désormais ce qu'il teste
 * réellement, la première région coloriable.
 */
async function attendreLaScene(): Promise<void> {
  await waitFor(() => {
    expect(document.querySelector('[data-region-svg]')).not.toBeNull();
  });
}

describe('MoteurColorie — rendu', () => {
  /**
   * ── LA CONSIGNE A QUITTÉ CE FICHIER AVEC R49, ET CE N'EST PAS UN ASSOUPLISSEMENT ──────────
   *
   * « la phrase est en haut et en bas, il y a doublon » (le père, 2026-08-07). `EcranNoeud`
   * porte désormais la consigne SEUL — il est le seul à avoir la clé du `BoutonEcouter`. Ce
   * fichier monte `MoteurColorie` isolément, sans `EcranNoeud` : plus rien ne rend cette
   * phrase ici, et l'exiger reviendrait à exiger le retour du doublon.
   *
   * **L'exigence n'est pas perdue : elle suit l'objet.** `tests/composants/EcranNoeud.test.tsx`
   * porte « R49 — porte la consigne de l'étape, et elle y est LISIBLE », une fois, pour les
   * quatorze moteurs au lieu de dix-sept fois pour un seul. Et
   * `tests/unitaires/consigne-sans-doublon.test.ts` garde le sens inverse — qu'aucun moteur ne
   * la reprenne. Une exigence qui disparaîtrait avec un déménagement n'aurait jamais rien gardé.
   */
  it('rend les godets du nuancier autorisé', async () => {
    render(<Harnais />);
    await attendreLaScene();
    for (const couleur of contenu.nuancierAutorise) {
      expect(godet(couleur)).toBeTruthy();
    }
  });

  it('garde la scène dominante : aucune consigne future en petit, seulement une progression compacte', async () => {
    render(<Harnais />);
    await attendreLaScene();

    for (const consigne of contenu.consignes.slice(1)) {
      expect(screen.queryByText(consigne.texte)).toBeNull();
    }
    const progression = document.querySelector('[data-progression-consignes]');
    expect(progression?.getAttribute('aria-label')).toBe(
      `Consigne 1 sur ${String(contenu.consignes.length)}`
    );
  });

  it('annonce visiblement l’étape et la cible concrète au-dessus du nuancier', async () => {
    render(<Harnais />);
    await attendreLaScene();

    const progression = document.querySelector('[data-progression-consignes]');
    expect(progression?.textContent).toContain(`Étape 1 sur ${String(contenu.consignes.length)}`);

    const regionAttendue = habillage.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions)
      .find((region) => region.id === premiereCible.region);
    const cible = document.querySelector('[data-cible-colorie]');
    expect(cible).not.toBeNull();
    expect(cible?.textContent).toContain(regionAttendue?.libelle ?? premiereCible.region);
    expect(cible?.textContent).toContain(premiereCible.couleur);
    expect(cible?.getAttribute('aria-label')).toBe(
      `Cible : ${regionAttendue?.libelle ?? premiereCible.region}, en ${premiereCible.couleur}`
    );
  });

  it('rend une région par région coloriable de l’habillage, toutes non peintes', async () => {
    render(<Harnais />);
    await attendreLaScene();
    const coloriables = habillage.scene.calques
      .filter((calque) => calque.role === 'coloriable')
      .flatMap((calque) => calque.regions);

    // Le décor déclaratif arrive par `fetch` : ses `data-*` sont posés par un effet, donc
    // APRÈS le commit du markup. On attend l'ÉTAT, jamais une durée (CLAUDE.md). Cette
    // attente était absente parce que le stub `fetch` était muet et que la suite jouait le
    // repli, dont les attributs sont posés au rendu.
    await vi.waitFor(() => {
      const regions = document.querySelectorAll('[data-region-svg]');
      expect(regions.length).toBe(coloriables.length);
      for (const element of regions) {
        expect(element.getAttribute('data-peinte')).toBe('non');
      }
    });
  });

  it('n’émet JAMAIS `data-etat="echec"` — R14', async () => {
    render(<Harnais />);
    await attendreLaScene();
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });
});

describe('MoteurColorie — bonne réponse', () => {
  it('peint la région et marque la consigne faite', async () => {
    const utilisateur = userEvent.setup();
    render(<Harnais />);
    await attendreLaScene();

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
    await attendreLaScene();

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
    await attendreLaScene();

    await utilisateur.click(godet(couleurFausse));
    await utilisateur.click(region(premiereCible.region));

    expect(region(premiereCible.region).getAttribute('data-peinte')).toBe('non');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
    const etat = dernier as unknown as EtatColorie;
    expect(etat.consignes[etat.indexConsigne]!.nbErreurs).toBe(1);
  });

  it('toucher sans avoir choisi de couleur ne compte pas d’erreur', async () => {
    let dernier: EtatColorie | null = null;
    render(<Harnais surEtat={(etat) => (dernier = etat)} />);
    await attendreLaScene();

    // Le moteur écoute le début du geste afin de répondre en moins de 100 ms. Émettre
    // directement l'événement réellement consommé évite que `userEvent.click` dépende du
    // support partiel des pointeurs SVG de happy-dom.
    fireEvent.pointerDown(region(premiereCible.region));
    await waitFor(() => expect(dernier).not.toBeNull());

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
    await attendreLaScene();

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
    await attendreLaScene();

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
    await attendreLaScene();

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
    await attendreLaScene();

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
    await attendreLaScene();
    const nuancier = document.querySelectorAll('[data-godet]');
    expect(nuancier.length).toBe(contenu.nuancierAutorise.length);
    for (const element of nuancier) {
      expect((element as HTMLElement).hasAttribute('disabled')).toBe(false);
    }
  });

  it('chaque godet porte un libellé accessible — a11y, annexe T § T5', async () => {
    render(<Harnais />);
    await attendreLaScene();
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

/**
 * ════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉCOR RÉEL — celui que l'enfant verra.
 *
 * Le harnais ci-dessus sert `contenu/habillages/clairiere/ecole.svg` : `MoteurColorie` le
 * charge et `SceneSvg` bascule sur sa branche `svgMarkup !== null`. Tous les cas au-dessus
 * traversaient déjà ce chemin, mais aucun ne vérifiait ce que cette branche pose sur les
 * nœuds injectés — d'où deux comportements du contrat vivants sur le repli et MORTS sur le
 * décor réel. Les deux cas suivants les gardent.
 * ════════════════════════════════════════════════════════════════════════════════════════
 */
/** Attend que le décor déclaratif ait remplacé le repli. Un état, jamais une durée. */
async function attendreDecorReel(): Promise<void> {
  await vi.waitFor(() => {
    const scene = document.querySelector('[data-decor]');
    expect(scene?.getAttribute('data-decor')).toBe('habillage');
  });
}

describe('MoteurColorie — le décor réel', () => {
  it('monte bien le décor déclaratif, et non le repli', async () => {
    render(<Harnais />);
    await attendreLaScene();
    await attendreDecorReel();
  });

  it('désature réellement le fond illustré avant la première couleur', async () => {
    render(<Harnais />);
    await attendreLaScene();
    await attendreDecorReel();

    await waitFor(() => {
      const fond = document.querySelector('[data-fond-illustre]') as SVGGraphicsElement | null;
      expect(fond, 'le test doit traverser un vrai fond raster illustré').not.toBeNull();
      expect(fond?.getAttribute('class')).toContain('pierre-fond-illustre--gris');
      expect(fond?.getAttribute('data-etat-couleur')).toBe('gris');
    });

    // Une prise transparente ne constitue pas une grisaille : le fond visible lui-même doit
    // être désaturé. Les régions hors de la consigne restent invisibles par-dessus ce fond.
    const horsConsigne = document.querySelector(
      '[data-region-source="feuilles-arbre-1"]'
    ) as SVGGraphicsElement | null;
    expect(horsConsigne?.style.opacity).toBe('0');
  });

  it('l’erreur fait osciller la région SUR LE DÉCOR RÉEL — D16, contrat § 5.6', async () => {
    const utilisateur = userEvent.setup();
    render(<Harnais />);
    await attendreLaScene();
    await attendreDecorReel();

    await utilisateur.click(godet(couleurFausse));
    await utilisateur.click(region(premiereCible.region));

    // Le seul retour d'erreur du jeu (v2 § 8) : 6 px d'oscillation, pas de rouge, pas de
    // son négatif. Sans cette classe, l'enfant qui se trompe ne reçoit RIEN.
    expect(region(premiereCible.region).classList.contains('pierre-region--refus')).toBe(true);
    expect(region(premiereCible.region).getAttribute('data-peinte')).toBe('non');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('le décor réel s’annonce actionnable au clavier ET répond à Entrée', async () => {
    const utilisateur = userEvent.setup();
    render(<Harnais />);
    await attendreLaScene();
    await attendreDecorReel();

    await utilisateur.click(godet(premiereCible.couleur));
    const cible = region(premiereCible.region);
    // `role` et `tabindex` sont ce qu'axe-core voit ; le gestionnaire est ce qu'il ne voit pas.
    expect(cible.getAttribute('role')).toBe('button');
    expect(cible.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(cible, { key: 'Enter' });

    expect(region(premiereCible.region).getAttribute('data-peinte')).toBe('oui');
    expect(region(premiereCible.region).getAttribute('data-couleur')).toBe(premiereCible.couleur);
  });

  it('la barre d’espace peint aussi, et l’événement est consommé', async () => {
    const utilisateur = userEvent.setup();
    render(<Harnais />);
    await attendreLaScene();
    await attendreDecorReel();

    await utilisateur.click(godet(premiereCible.couleur));
    const evenement = fireEvent.keyDown(region(premiereCible.region), { key: ' ' });

    // `false` = `preventDefault()` a été appelé : la page ne défile pas sous le doigt.
    expect(evenement).toBe(false);
    expect(region(premiereCible.region).getAttribute('data-peinte')).toBe('oui');
  });
});

/**
 * ════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉCOR RÉEL DOIT SURVIVRE À UN RE-RENDU QUI NE LE CONCERNE PAS.
 *
 * Le défaut qu'ils gardent, mesuré sur Chromium via `client/dist-test` : 30 régions décorées
 * au montage, puis **0** une centaine de millisecondes plus tard. React 19 ne compare plus le
 * CONTENU de `dangerouslySetInnerHTML`, seulement l'identité de l'objet ; un littéral
 * `{{ __html: … }}` dans le JSX en fabrique un neuf à chaque rendu, et React ré-injecte le
 * markup — effaçant `role`, `tabindex`, `aria-label`, l'écouteur clavier, `data-peinte`,
 * `data-couleur` et le `fill`, c'est-à-dire la couleur que l'enfant venait de poser. Le
 * battement d'une seconde suffisait à effacer son coloriage.
 *
 * Trois suites l'ont vu (T3 parcours, T3 casse-cou, T4 captures) et aucun test de composant
 * ne pouvait le voir : le harnais `Harnais` refabrique ses services à chaque rendu, donc
 * `onPeindre` change, donc l'effet de décoration se rejoue et repose tout. Ces deux cas-ci
 * gardent des props STABLES au niveau du module — c'est la seule façon d'isoler la
 * ré-injection de la redécoration qui la masque.
 * ════════════════════════════════════════════════════════════════════════════════════════
 */
describe('MoteurColorie — le décor réel survit aux re-rendus', () => {
  /** Corps du SVG réel, sans son enveloppe `<svg>` — ce que `MoteurColorie` injecte. */
  const corpsSvgReel = lireTexte(CHEMIN_SVG_ECOLE)
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>[\s\S]*$/i, '');

  /** Props stables : leur identité ne doit PAS changer d'un rendu à l'autre. */
  const REMPLISSAGES_STABLES: Readonly<Record<string, never>> = {};
  const NE_RIEN_PEINDRE = (): void => undefined;

  function CadreStable(): React.ReactElement {
    const [tour, setTour] = useState(0);
    return (
      <>
        <button type="button" data-tour={tour} onClick={() => setTour((n) => n + 1)}>
          re-rendre
        </button>
        <SceneSvg
          habillage={habillage}
          remplissages={REMPLISSAGES_STABLES}
          regionEnDemonstration={null}
          regionEnRefus={null}
          marqueRefus={0}
          animationsDesactivees
          svgMarkup={corpsSvgReel}
          onPeindre={NE_RIEN_PEINDRE}
        />
      </>
    );
  }

  it('un re-rendu sans changement ne réinjecte pas le markup', () => {
    render(<CadreStable />);
    const avant = document.querySelectorAll('[data-region-svg][data-peinte="non"]').length;
    expect(avant).toBeGreaterThan(0);

    const bouton = screen.getByRole('button', { name: 're-rendre' });
    fireEvent.click(bouton);
    fireEvent.click(bouton);

    expect(document.querySelectorAll('[data-region-svg][data-peinte="non"]').length).toBe(avant);
  });

  it('un re-rendu ne retire ni le rôle, ni le libellé, ni le tabindex des régions', () => {
    render(<CadreStable />);
    const cible = region(premiereCible.region);
    expect(cible.getAttribute('role')).toBe('button');
    const libelle = cible.getAttribute('aria-label');
    expect(typeof libelle === 'string' && libelle.length > 0).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 're-rendre' }));

    const apres = region(premiereCible.region);
    expect(apres.getAttribute('role')).toBe('button');
    expect(apres.getAttribute('tabindex')).toBe('0');
    expect(apres.getAttribute('aria-label')).toBe(libelle);
  });

  it('réactive le calque coloriable masqué par le raster et matérialise la prise courante', () => {
    render(<CadreStable />);
    const calque = document.querySelector('#calque-zones');
    expect(calque?.getAttribute('opacity')).toBe('1');

    const prise = document.querySelector('[data-calque="prises"] [data-region-svg]');
    expect(prise?.getAttribute('data-active')).toBe('oui');
    expect(prise?.classList.contains('pierre-prise-colorie')).toBe(true);
  });
});

/**
 * ════════════════════════════════════════════════════════════════════════════════════════
 * UNE SEULE GÉOMÉTRIE FAIT AUTORITÉ — l'habillage.
 *
 * Le repli (asset absent, premier rendu) portait sa PROPRE géométrie, codée en dur dans le
 * moteur : mêmes 30 `id`, aucune coordonnée commune avec l'habillage. `regionSousLeDoigt`
 * lisant toujours les centroïdes de l'habillage, un doigt posé sur le trait peignait une
 * région située ailleurs dans l'image, silencieusement, et le comptait comme une erreur.
 *
 * L'invariant gardé ici est le seul qui referme la faille : CE QUI EST DESSINÉ SOUS UN
 * POINT EST CE QUE `regionSousLeDoigt` NOMME EN CE POINT.
 * ════════════════════════════════════════════════════════════════════════════════════════
 */
const habillageEssai: Habillage = {
  ...habillage,
  id: 'clairiere.essai',
  libelle: 'Un décor d’essai',
  scene: {
    ...habillage.scene,
    viewBox: '0 0 200 200',
    calques: [
      { id: 'calque-fond', role: 'fond', regions: [] },
      {
        id: 'calque-zones',
        role: 'coloriable',
        regions: [
          { id: 'zone-nord', libelle: 'la zone du nord', centroide: [50, 40], surface: 1256.6 },
          { id: 'zone-sud', libelle: 'la zone du sud', centroide: [150, 160], surface: 1256.6 }
        ]
      },
      { id: 'calque-trait', role: 'trait', regions: [] }
    ]
  }
};

function rendreRepli(): void {
  render(
    <SceneSvg
      habillage={habillageEssai}
      remplissages={{}}
      regionEnDemonstration={null}
      regionEnRefus={null}
      marqueRefus={0}
      animationsDesactivees
      svgMarkup={null}
      onPeindre={() => undefined}
    />
  );
}

describe('SceneSvg — le décor de repli est DÉRIVÉ de l’habillage', () => {
  it('ne dessine que les régions déclarées par l’habillage, ni une de plus', () => {
    rendreRepli();
    const rendues = [...document.querySelectorAll('[data-region-svg]')].map((e) =>
      e.getAttribute('data-region-svg')
    );
    expect(rendues.sort()).toEqual(['zone-nord', 'zone-sud']);
  });

  it('prend ses libellés de l’habillage, jamais d’une table interne au moteur', () => {
    rendreRepli();
    expect(region('zone-nord').getAttribute('aria-label')).toBe('la zone du nord');
    expect(region('zone-sud').getAttribute('aria-label')).toBe('la zone du sud');
  });

  it('dessine chaque région là où `regionSousLeDoigt` la nomme — une seule géométrie', () => {
    rendreRepli();
    for (const element of document.querySelectorAll('[data-region-svg]')) {
      const id = element.getAttribute('data-region-svg')!;
      const point: readonly [number, number] = [
        Number(element.getAttribute('cx')),
        Number(element.getAttribute('cy'))
      ];
      expect(Number.isFinite(point[0]) && Number.isFinite(point[1])).toBe(true);
      expect(regionSousLeDoigt(habillageEssai, point)).toBe(id);
    }
  });

  it('reprend le `viewBox` de l’habillage, pas celui d’une scène codée en dur', () => {
    rendreRepli();
    expect(document.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 200 200');
  });

  it('reste tapable au clavier, comme le décor réel', () => {
    let peinte: string | null = null;
    render(
      <SceneSvg
        habillage={habillageEssai}
        remplissages={{}}
        regionEnDemonstration={null}
        regionEnRefus={null}
        marqueRefus={0}
        animationsDesactivees
        svgMarkup={null}
        onPeindre={(id) => (peinte = id)}
      />
    );
    fireEvent.keyDown(region('zone-sud'), { key: 'Enter' });
    expect(peinte).toBe('zone-sud');
  });
});

describe('« zéro ligne de code par habillage » — v2 § 7', () => {
  it('le moteur ne code en dur aucune cour d’école', () => {
    const source = lireTexte('client/src/moteurs/colorie/SceneSvg.tsx').toLowerCase();
    // Un moteur qui nomme le mobilier d'un décor ne pourra pas en accueillir un second sans
    // qu'on y retouche : la promesse de variété (R12, R13) tombe avec lui.
    for (const mot of ['école', 'ecole', 'maîtresse', 'garçon', 'ballon', 'tee-shirt', 'jupe']) {
      expect(source).not.toContain(mot);
    }
  });
});
