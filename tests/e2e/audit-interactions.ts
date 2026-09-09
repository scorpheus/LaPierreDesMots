import type { Page } from '@playwright/test';

/** Le DOM sérialisé seul ne reflète pas les propriétés courantes des champs. */
export async function valeursFormulaires(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')]
    .map((champ) => JSON.stringify([
      champ.tagName, champ.type, champ.value,
      champ instanceof HTMLInputElement ? champ.checked : [...champ.selectedOptions].map((option) => option.value),
    ])));
}

/** Observer les couleurs réellement peintes, pas les particules ni la seule présence du Canvas. */
export async function empreintesCouleurs(page: Page): Promise<readonly string[]> {
  return page.evaluate(async () => {
    const empreintes: string[] = [];
    for (const toile of document.querySelectorAll<HTMLCanvasElement>('canvas[data-raster-couche="couleurs"]')) {
      const contexte = toile.getContext('2d');
      if (contexte === null) throw new Error('Canvas de couleurs illisible');
      const pixels = contexte.getImageData(0, 0, toile.width, toile.height).data;
      const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(pixels).buffer);
      const empreinte = [...new Uint8Array(digest)].map((octet) => octet.toString(16).padStart(2, '0')).join('');
      empreintes.push(`${toile.width}x${toile.height}:${empreinte}`);
    }
    return empreintes;
  });
}

/** Repères posés sur les objets DOM, jamais recalculés depuis leurs rangs après un tap. */
export async function repererCommandes(page: Page, selecteur: string): Promise<string[]> {
  return page.evaluate((population) => {
    const attributs = [
      'id', 'name', 'type', 'href', 'aria-label', 'data-action', 'data-vers', 'data-noeud',
      'data-region-svg', 'data-godet', 'data-clip', 'data-profil', 'data-forme', 'data-depart',
      'data-reponse', 'data-element', 'data-categorie', 'data-mot', 'data-lettre', 'data-cible',
      'data-galerie-lancer', 'data-onglet-parent', 'data-reglage', 'data-export',
    ];
    const identites: string[] = [];
    for (const element of document.querySelectorAll(population)) {
      const reperes = attributs.flatMap((nom) => {
        const valeur = element.getAttribute(nom);
        return valeur === null ? [] : [[nom, valeur]];
      });
      const identite = JSON.stringify([
        element.tagName, reperes,
        element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
        element.closest('[data-relecture]')?.getAttribute('data-relecture') ?? null,
      ]);
      element.setAttribute('data-audit-identite', identite);
      identites.push(identite);
    }
    return identites;
  }, selecteur);
}

/** Identification et dispatch sont atomiques ; une identité ambiguë ne reçoit aucun tap. */
export async function taperCommandeReperee(
  page: Page,
  cible: string,
): Promise<{ avantDom: string } | null> {
  return page.evaluate((identite) => {
    const correspondances = [...document.querySelectorAll('[data-audit-identite]')]
      .filter((element) => element.getAttribute('data-audit-identite') === identite);
    if (correspondances.length !== 1) return null;
    const element = correspondances[0]!;
    const avantDom = document.body.innerHTML;
    if (element instanceof HTMLInputElement && (element.type === 'text' || element.type === 'range')) {
      let valeur: string;
      if (element.type === 'range') {
        const minimum = element.min === '' ? 0 : Number(element.min);
        const maximum = element.max === '' ? 100 : Number(element.max);
        const pas = element.step === '' || element.step === 'any' ? 1 : Number(element.step);
        const actuelle = Number(element.value);
        valeur = String(actuelle + pas <= maximum ? actuelle + pas : minimum);
      } else {
        const essai = element.value.startsWith('Essai') ? 'Autre essai QA' : 'Essai QA';
        valeur = element.maxLength >= 0 ? essai.slice(0, element.maxLength) : essai;
      }
      // Le setter natif laisse React constater la nouvelle valeur lors de l'événement.
      const fixer = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (fixer === undefined) throw new Error('Setter natif de saisie introuvable');
      fixer.call(element, valeur);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return { avantDom };
    }
    if (element instanceof HTMLSelectElement) {
      const autre = [...element.options].find((option) => !option.disabled && option.value !== element.value);
      if (autre !== undefined) {
        const fixer = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (fixer === undefined) throw new Error('Setter natif de sélection introuvable');
        fixer.call(element, autre.value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { avantDom };
    }
    const boite = element.getBoundingClientRect();
    const commun = {
      bubbles: true, cancelable: true, composed: true,
      clientX: boite.left + boite.width / 2, clientY: boite.top + boite.height / 2,
    };
    element.dispatchEvent(new PointerEvent('pointerdown', { ...commun, pointerId: 1, pointerType: 'touch' }));
    element.dispatchEvent(new PointerEvent('pointerup', { ...commun, pointerId: 1, pointerType: 'touch' }));
    element.dispatchEvent(new MouseEvent('click', commun));
    return { avantDom };
  }, cible);
}

export interface ObservationInteraction {
  readonly effet: boolean;
  readonly cible: string;
}

export interface AdaptateurInteractions {
  restaurer(): Promise<void>;
  ecran(): Promise<string>;
  inventorier(): Promise<readonly string[]>;
  taper(cible: string): Promise<ObservationInteraction | null>;
}

export interface VerdictInteraction {
  readonly cible: string;
  readonly statut: 'observe' | 'muet' | 'non-verifie';
}

/** Un signal observable n'est pas une preuve de justesse métier. Une absence n'est pas un signal. */
export async function auditerInteractions(
  adaptateur: AdaptateurInteractions,
): Promise<readonly VerdictInteraction[]> {
  await adaptateur.restaurer();
  const depart = await adaptateur.ecran();
  const initiales = await adaptateur.inventorier();
  if (new Set(initiales).size !== initiales.length) {
    const doublons = initiales.filter((cible, rang) => initiales.indexOf(cible) !== rang);
    throw new Error(`Inventaire ambigu : ${[...new Set(doublons)].join(' ; ')}`);
  }
  const observer = async (cible: string): Promise<VerdictInteraction> => {
    const observation = await adaptateur.taper(cible);
    return {
      cible,
      statut: observation === null || observation.cible !== cible
        ? 'non-verifie' : observation.effet ? 'observe' : 'muet',
    };
  };
  const verdicts: VerdictInteraction[] = [];
  for (const cible of initiales) {
    verdicts.push(await observer(cible));
    if (await adaptateur.ecran() !== depart) await adaptateur.restaurer();
  }
  for (let rang = 0; rang < verdicts.length; rang += 1) {
    if (verdicts[rang]!.statut === 'observe') continue;
    await adaptateur.restaurer();
    // La cible a pu disparaître parce qu'une autre commande a changé la question.
    // La tester d'abord seule évite de reproduire cette disparition avant chaque essai.
    verdicts[rang] = await observer(initiales[rang]!);
    if (verdicts[rang]!.statut !== 'muet') continue;
    for (const autre of initiales) {
      if (autre === initiales[rang]) continue;
      await adaptateur.taper(autre);
      if (await adaptateur.ecran() !== depart) await adaptateur.restaurer();
      const apresAmorcage = await observer(initiales[rang]!);
      if (apresAmorcage.statut === 'observe') {
        verdicts[rang] = apresAmorcage;
        break;
      }
      // Une disparition ultérieure n'efface pas le tap à froid effectivement observé.
    }
  }
  return verdicts;
}
