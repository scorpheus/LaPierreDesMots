/**
 * LA PORTE DE LA ZONE PARENT, MONTÉE — `data-ecran="code-parent"`. Lot QA-2.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PLAN DEMANDE : « une sortie existe, pavé à cibles ≥ 64 px ».
 *
 * Et un cas que la formulation ne couvre pas, alors qu'il est le seul vraiment dangereux ici :
 * **l'écran VERROUILLÉ.** Après cinq échecs, les dix touches, « Effacer » et « Entrer » sont
 * tous `disabled`. Il ne reste qu'un contrôle vivant dans tout l'écran, et si celui-là
 * disparaissait, un parent — ou pire, un enfant tombé là par hasard — serait enfermé devant un
 * pavé mort pendant la durée du verrou. C'est le pire bug possible sur cette application, et
 * aucun test ne l'aurait vu : `parcours-parent.spec.ts` n'échoue jamais cinq fois d'affilée.
 *
 * Le cas décisif de ce fichier monte donc l'écran EN VERROU et exige qu'il reste une issue.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Le second risque est le ton : « aucun reproche, jamais », « aucune couleur d'alarme ». Un
 * code faux dit « ce n'est pas ça ». On le mesure avec le juge du dépôt (`enonceUnePerte`),
 * pas avec une liste de mots réécrite ici.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enonceUnePerte } from '@partage/ton/index.js';

const { ErreurReseau } = await import('@client/api/client');

const ouvertures: string[] = [];
/** Ce que `ouvrirZoneParent` doit faire : réussir, ou lever un statut donné. */
let reponseOuverture: 'ok' | 404 | 423 | 401 = 'ok';
let codeDefini = true;

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  // La signature RÉELLE — `(statut, cheminAppele, message, corps)`. Mesurée, pas supposée :
  // `client/src/api/client.ts:66`. Avec trois arguments, le corps du 423 partait dans
  // `message` et l'écran affichait « il rouvre vers un moment » au lieu de l'heure. Un
  // bouchon dont la signature dérive teste un écran qui n'existe pas.
  const Erreur = original['ErreurReseau'] as new (
    statut: number,
    cheminAppele: string,
    message: string,
    corps?: unknown
  ) => Error;
  return {
    ...original,
    lireEtatPorteParent: () => Promise.resolve({ codeDefini }),
    ouvrirZoneParent: (code: string) => {
      ouvertures.push(code);
      if (reponseOuverture === 'ok') {
        return Promise.resolve({ jeton: 'jeton-de-test' });
      }
      // La forme du corps est celle du serveur : `details.verrouilleJusqua` pour le 423.
      return Promise.reject(
        new Erreur(reponseOuverture, '/api/parent/ouvrir', 'refus', {
          details: { verrouilleJusqua: '2026-09-01T10:15:00.000Z' }
        })
      );
    }
  };
});

const { EcranCodeParent } = await import('@client/ecrans/EcranCodeParent');
const { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
  './exigences-ecrans.js'
);

const ouvre: number[] = [];
const abandons: number[] = [];

function monter(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EcranCodeParent
        surOuverture={() => ouvre.push(1)}
        surAbandon={() => abandons.push(1)}
      />
    </QueryClientProvider>
  );
}

/** Tape un code, chiffre par chiffre, comme un doigt le ferait. */
function taper(code: string): void {
  for (const chiffre of code) {
    fireEvent.click(document.querySelector(`[data-touche="${chiffre}"]`)!);
  }
}

function valider(): void {
  fireEvent.click(document.querySelector('[data-valider="code-parent"]')!);
}

beforeEach(() => {
  ouvertures.length = 0;
  ouvre.length = 0;
  abandons.length = 0;
  reponseOuverture = 'ok';
  codeDefini = true;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('le pavé tape le code que le doigt a tapé', () => {
  it('rend les dix touches, et l’indicateur suit la saisie chiffre par chiffre', () => {
    monter();
    const touches = document.querySelectorAll('[data-touche]');
    console.log(`[QA-2 · code-parent] touches rendues : ${String(touches.length)}`);
    expect(touches.length, 'le pavé ne rend plus ses dix chiffres').toBe(10);

    const compteur = () =>
      document.querySelector('[data-code-longueur]')?.getAttribute('data-code-longueur');
    expect(compteur()).toBe('0');
    taper('19');
    expect(compteur()).toBe('2');
    taper('84');
    expect(compteur()).toBe('4');
    // Un cinquième chiffre ne s'ajoute pas : `slice(0, 4)`.
    taper('7');
    expect(compteur()).toBe('4');
  });

  it('envoie EXACTEMENT le code tapé — jamais une constante, jamais un préfixe', async () => {
    monter();
    taper('1984');
    valider();
    await waitFor(() => {
      expect(ouvertures).toEqual(['1984']);
    });
    expect(ouvre).toHaveLength(1);
  });

  it('n’envoie rien tant que les quatre chiffres n’y sont pas', () => {
    monter();
    taper('19');
    valider();
    expect(ouvertures).toEqual([]);
  });

  it('les chiffres sont MASQUÉS ici — c’est l’écran d’ouverture, pas celui du choix', () => {
    monter();
    taper('1984');
    // `data-code-en-clair` n'appartient qu'à `EcranDefinirCode`. Le confondre exposerait le
    // code du foyer au regard de l'enfant qui tient la tablette.
    expect(document.querySelector('[data-code-en-clair]')).toBeNull();
    expect(document.body.textContent).not.toContain('1984');
  });
});

describe('aucun reproche, aucune alarme, et jamais d’enfermement', () => {
  it('un code faux dit « ce n’est pas ça » — et n’énonce aucune perte', async () => {
    reponseOuverture = 401;
    monter();
    taper('0000');
    valider();
    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).not.toBeNull();
    });
    const message = document.querySelector('[role="status"]')!.textContent ?? '';
    console.log(`[QA-2 · code-parent] message de refus : « ${message} »`);
    expect(enonceUnePerte(message), 'le refus énonce une perte').toBeNull();
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    // La saisie repart de zéro : on recommence, on ne corrige pas un demi-code.
    expect(document.querySelector('[data-code-longueur]')?.getAttribute('data-code-longueur'))
      .toBe('0');
  });

  it('VERROUILLÉ, l’écran dit QUAND il rouvre — et garde une issue vivante', async () => {
    reponseOuverture = 423;
    monter();
    taper('0000');
    valider();
    await waitFor(() => {
      expect(document.querySelector('[data-verrou="actif"]')).not.toBeNull();
    });

    // Tout le pavé est mort : c'est voulu, et c'est exactement ce qui rend l'issue vitale.
    const morts = [...document.querySelectorAll('button')].filter((bouton) => bouton.disabled);
    const vivants = [...document.querySelectorAll('button')].filter((bouton) => !bouton.disabled);
    console.log(
      `[QA-2 · code-parent] verrou actif — boutons morts : ${String(morts.length)}, ` +
        `vivants : ${String(vivants.length)}`
    );
    expect(morts.length).toBeGreaterThanOrEqual(11);
    // EXACTEMENT un, et c'est ce que dit déjà le message de l'assertion suivante (« le SEUL
    // contrôle vivant »). Une borne `> 0` laisserait passer un second contrôle vivant sous
    // verrou — par exemple un « valider » resté actif, qui rendrait le verrou décoratif.
    expect(
      vivants.length,
      'sous verrou, la sortie doit être le seul contrôle vivant — ni zéro (impasse), ni deux'
    ).toBe(1);

    fireEvent.click(vivants[0]!);
    expect(abandons, 'le seul contrôle vivant ne mène nulle part').toHaveLength(1);

    // L'heure est dite, l'échec ne l'est pas.
    expect(document.body.textContent).toContain('10:15');
    expect(document.body.textContent).not.toMatch(/erreur|refus|interdit/iu);
  });

  it('sans code posé, la porte BASCULE vers la définition au lieu de reprocher', async () => {
    codeDefini = false;
    monter();
    await waitFor(() => {
      expect(
        document.querySelector('[data-parent-mode]')?.getAttribute('data-parent-mode')
      ).toBe('definition');
    });
    // Vu du dehors, c'est la même porte : les suites qui la traversent ne changent pas.
    expect(document.querySelector('[data-ecran="code-parent"]')).not.toBeNull();
    expect(document.querySelector('[data-parent="code"]')).not.toBeNull();
  });

  it('un 404 à la validation bascule aussi — la course entre la requête et le doigt', async () => {
    // Le parent tape avant que `GET /api/parent/etat` n'ait répondu. Sans cette seconde
    // source, l'écran dirait « ce n'est pas ce code » pour un code qui n'existe pas.
    reponseOuverture = 404;
    monter();
    taper('1234');
    valider();
    await waitFor(() => {
      expect(
        document.querySelector('[data-parent-mode]')?.getAttribute('data-parent-mode')
      ).toBe('definition');
    });
    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    const rapport = await exigerUneSortieQuiRepond(
      'code-parent',
      () => {
        monter();
        return { racine: document.body, aQuitte: () => abandons.length > 0 || ouvre.length > 0 };
      },
      () => {
        abandons.length = 0;
        ouvre.length = 0;
        cleanup();
      }
    );
    expect(rapport.repondent.length).toBeGreaterThanOrEqual(1);
  });

  it('les 12 cibles du pavé déclarent toutes leur taille (R16)', () => {
    monter();
    const rapport = exigerCibles64('code-parent', document.body, HORS_ECRAN);
    // 10 touches + Effacer + Entrer + Retour : le pavé se tape debout, d'une main.
    expect(rapport.population).toBeGreaterThanOrEqual(13);
  });
});

/** Épingle : `ErreurReseau` reste la VRAIE classe. Sans elle, les `instanceof` de l'écran mentent. */
describe('le bouchon ne remplace que ce qu’il observe', () => {
  it('`ErreurReseau` importée est bien une classe d’erreur', () => {
    expect(new ErreurReseau(404, '/api/parent/ouvrir', 'x') instanceof Error).toBe(true);
  });
});
