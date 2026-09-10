import type { Page } from '@playwright/test';

interface FenetreRecompenseAttendue {
  readonly titre: string;
  readonly contenu: 'etoile' | 'carte-monde';
}

/**
 * Deux gains de l'écran de récompense disparaissent après sa première restauration : la tentative
 * a alors déjà été journalisée. Leur identité initiale suffit à les reconnaître sans ajouter de
 * crochet de test au client.
 */
function fenetreRecompenseAttendue(cible: string): FenetreRecompenseAttendue | null {
  let identite: [string, [string, string][], string, string | null];
  try {
    identite = JSON.parse(cible) as [string, [string, string][], string, string | null];
  } catch {
    return null;
  }
  const [balise, reperes, texteBrut] = identite;
  if (balise !== 'BUTTON') return null;
  const texte = texteBrut.replace(/\s+/gu, ' ').trim();
  if (texte === '★Une étoile de plus !' || texte === '★ Une étoile de plus !') {
    return { titre: 'Une étoile de plus !', contenu: 'etoile' };
  }
  const annonce = reperes.find(([nom]) => nom === 'aria-label')?.[1] ?? texte;
  const region = /^Une nouvelle région s’ouvre : (.+) !$/.exec(annonce)?.[1];
  return region === undefined ? null : { titre: region, contenu: 'carte-monde' };
}

/**
 * Le changement de DOM ne suffit pas : le dialogue doit nommer et illustrer le gain tapé.
 * On le referme ensuite par sa vraie commande afin que l'audit suivant ne tape jamais derrière
 * une modale. La marque finale conserve uniquement la preuve déjà établie pour l'observateur DOM.
 */
async function verifierFenetreRecompense(
  page: Page,
  cible: string,
): Promise<void> {
  const attendue = fenetreRecompenseAttendue(cible);
  if (attendue === null) return;
  try {
    await page.waitForFunction(({ titre, contenu }) => {
      const dialogues = [...document.querySelectorAll<HTMLDialogElement>('dialog.fenetre-recompense[open]')];
      return dialogues.some((dialogue) => {
        const bonTitre = dialogue.querySelector('h2')?.textContent?.replace(/\s+/gu, ' ').trim() === titre;
        if (!bonTitre) return false;
        const bonContenu = contenu === 'etoile'
          ? dialogue.querySelector('[data-pictogramme-palier="etoile"]')?.textContent?.trim() === '★'
          : dialogue.querySelector('img[alt="La carte du monde"]') !== null;
        if (bonContenu) dialogue.setAttribute('data-audit-fenetre-recompense', 'exacte');
        return bonContenu;
      });
    }, attendue);
  } catch {
    throw new Error(
      `La commande de récompense « ${attendue.titre} » n'a pas ouvert son dialogue avec le bon contenu.`,
    );
  }
  const dialogue = page.locator('dialog[data-audit-fenetre-recompense="exacte"]');
  await dialogue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await dialogue.waitFor({ state: 'detached' });
  await page.evaluate((identite) => {
    const declencheur = [...document.querySelectorAll('[data-audit-identite]')]
      .find((element) => element.getAttribute('data-audit-identite') === identite);
    declencheur?.setAttribute('data-audit-effet-verifie', 'fenetre-recompense');
  }, cible);
}

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
  const observation = await page.evaluate((identite) => {
    const correspondances = [...document.querySelectorAll('[data-audit-identite]')]
      .filter((element) => element.getAttribute('data-audit-identite') === identite);
    if (correspondances.length !== 1) return null;
    const element = correspondances[0]!;
    const avantDom = document.body.innerHTML;
    if (
      element instanceof HTMLInputElement &&
      (element.type === 'text' || element.type === 'search' || element.type === 'range')
    ) {
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
  if (observation !== null) await verifierFenetreRecompense(page, cible);
  return observation;
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
  // Les gains doivent être testés avant toute navigation : restaurer la récompense après son
  // enregistrement la remonte légitimement sans ces cadeaux et rendrait leurs prises introuvables.
  const prioritaires = initiales.filter((cible) => fenetreRecompenseAttendue(cible) !== null);
  const ordre = [...prioritaires, ...initiales.filter((cible) => !prioritaires.includes(cible))];
  const verdicts: VerdictInteraction[] = [];
  for (const cible of ordre) {
    verdicts.push(await observer(cible));
    if (await adaptateur.ecran() !== depart) await adaptateur.restaurer();
  }
  for (let rang = 0; rang < verdicts.length; rang += 1) {
    if (verdicts[rang]!.statut === 'observe') continue;
    await adaptateur.restaurer();
    // La cible a pu disparaître parce qu'une autre commande a changé la question.
    // La tester d'abord seule évite de reproduire cette disparition avant chaque essai.
    verdicts[rang] = await observer(ordre[rang]!);
    if (verdicts[rang]!.statut !== 'muet') continue;
    for (const autre of ordre) {
      if (autre === ordre[rang]) continue;
      await adaptateur.taper(autre);
      if (await adaptateur.ecran() !== depart) await adaptateur.restaurer();
      const apresAmorcage = await observer(ordre[rang]!);
      if (apresAmorcage.statut === 'observe') {
        verdicts[rang] = apresAmorcage;
        break;
      }
      // Une disparition ultérieure n'efface pas le tap à froid effectivement observé.
    }
  }
  return verdicts;
}
