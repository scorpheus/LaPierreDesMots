/** Parcours grand écran des dix-huit projets et de la fête, gestes uniquement dans l'interface. */
import { expect, test } from './invariants.js';
import type { Locator, Page } from '@playwright/test';
import { FETE_MATHS, PROJETS_MATHS, estInstanceMaths, proposerAideMaths, validerMaths } from '@pierre/partage/mathematiques';
import type { EtatMaths, GesteMaths, RepriseMaths, ResultatApiMaths } from '@pierre/partage/mathematiques';

const MAX_GESTES_PAR_ETAPE = 128;
const NOMS_NIVEAUX = { decouverte: 'Découvrir', exploration: 'Explorer', defi: 'Défi' } as const;
const LIEUX = { JAR: 'jardin', PON: 'ponts', MOU: 'moulin', MAR: 'marche',
  CHA: 'chantier', HOR: 'horloge' } as const;

async function lireCarnet(page: Page, profilId: string): Promise<EtatMaths> {
  const reponse = await page.request.get(`/api/mathematiques/etat?profilId=${encodeURIComponent(profilId)}`);
  expect(reponse.ok(), 'le carnet maths reste lisible').toBe(true);
  const resultat = await reponse.json() as ResultatApiMaths<EtatMaths>;
  expect(resultat.ok).toBe(true);
  if (!resultat.ok) throw new Error(`Carnet indisponible : ${resultat.erreur.code}`);
  return resultat.valeur;
}

async function repriseCourante(page: Page, profilId: string): Promise<RepriseMaths> {
  const reprise = (await lireCarnet(page, profilId)).reprise;
  expect(reprise, 'l’étape jouée possède un état durable').not.toBeNull();
  return reprise!;
}

async function toucher(page: Page, profilId: string, action: () => Promise<void>): Promise<RepriseMaths> {
  const avant = await repriseCourante(page, profilId);
  await action();
  await expect.poll(async () => (await repriseCourante(page, profilId)).revision,
    { message: 'le contrôle visible reçoit un accusé durable' }).toBe(avant.revision + 1);
  return repriseCourante(page, profilId);
}

function groupe(page: Page, nom: string): Locator {
  return page.getByRole('group', { name: nom, exact: true });
}

function nombre(etat: RepriseMaths['etat'], cle: string): number {
  const valeur = etat.objets[cle];
  return typeof valeur === 'number' ? valeur : 0;
}

async function gesteDansAtelier(page: Page, profilId: string, reprise: RepriseMaths,
  geste: GesteMaths): Promise<void> {
  const { instance, etat } = reprise;
  const famille = instance.famille;
  const p = instance.parametres as Record<string, unknown>;
  const executer = (action: () => Promise<void>) => toucher(page, profilId, action);

  if (famille === 'MAT-PON-01') {
    if (geste.type === 'choisir') {
      const id = geste.objetId;
      if (id.startsWith('segment-')) {
        await executer(() => page.getByRole('button', { name: new RegExp(`^Morceau ${id.endsWith('a') ? 'A' : 'B'}`, 'u') }).click());
      } else await executer(() => page.getByRole('button', { name: new RegExp(`^${id},`, 'u') }).click());
      return;
    }
    if (geste.type === 'aligner-regle') {
      const nom = p['segmentsTrajet'] ? `Place le zéro pour ${etat.selection === 'segment-a' ? 'A' : 'B'}` : 'Place le zéro de la règle';
      await executer(() => groupe(page, nom).getByRole('button', { name: String(geste.origine), exact: true }).click());
      return;
    }
    if (geste.type === 'lire-longueur') {
      const cle = p['segmentsTrajet'] ? `longueurLue:${etat.selection}` : 'longueurLue';
      let actuel = nombre(etat, cle);
      while (actuel !== geste.valeur) {
        const ecart = geste.valeur - actuel;
        const pas = !p['segmentsTrajet'] && Math.abs(ecart) >= 10 ? 10 : 1;
        const variation = Math.sign(ecart) * pas;
        const nom = p['segmentsTrajet'] ? (variation > 0 ? '+1' : '−1') :
          `${variation > 0 ? 'Ajouter' : 'Enlever'} ${pas === 10 ? 'dix' : 'un'} centimètre${pas === 10 ? 's' : ''}`;
        await executer(() => groupe(page, 'Quelle longueur lis-tu ?').getByRole('button', { name: nom, exact: true }).click());
        actuel = nombre((await repriseCourante(page, profilId)).etat, cle);
      }
      return;
    }
    if (geste.type === 'retirer') {
      await executer(() => page.getByRole('button', { name: new RegExp(`^${geste.objetId},`, 'u') }).click());
      return;
    }
  }

  if (famille === 'MAT-PON-02') {
    if (geste.type === 'placer-borne') {
      await groupe(page, 'Nombre à porter').getByRole('button', { name: String(geste.valeur), exact: true }).click();
      await executer(() => groupe(page, 'Place sur la rive').getByRole('button',
        { name: `Graduation ${geste.position}`, exact: true }).click());
      return;
    }
    if (geste.type === 'montrer-encadrement') {
      const encadrement = groupe(page, 'Quels nombres encadrent la borne ?');
      await encadrement.getByText('Avant', { exact: true }).locator('..')
        .getByRole('button', { name: String(geste.inferieure), exact: true }).click();
      await encadrement.getByText('Après', { exact: true }).locator('..')
        .getByRole('button', { name: String(geste.superieure), exact: true }).click();
      await executer(() => encadrement.getByRole('button', { name: 'Montrer mon encadrement' }).click());
      return;
    }
    if (geste.type === 'retirer') {
      await executer(() => page.getByRole('button', { name: `Retirer la borne ${geste.objetId.slice(6)}` }).click());
      return;
    }
  }

  if (famille === 'MAT-PON-03') {
    if (geste.type === 'placer-piece') {
      await page.getByTestId(`piece-${geste.objetId}`).click();
      await executer(() => page.getByTestId(`tablier-position-${geste.position}`).click());
      return;
    }
    if (geste.type === 'retirer') {
      await page.getByTestId(`piece-${geste.objetId}`).click();
      await executer(() => page.getByRole('button', { name: `Retirer ${geste.objetId.replace('module-', 'le module ')}` }).click());
      return;
    }
  }

  if (famille === 'MAT-JAR-01') {
    const fruit = p['uniteObjet'] === 'fruit';
    const noms = fruit ? { unite: 'fruit', dizaine: 'caisse de dix fruits', centaine: 'réserve de cent fruits' } :
      { unite: 'graine', dizaine: 'botte de dix', centaine: 'sac de cent' };
    if (geste.type === 'placer' || geste.type === 'retirer') {
      const nom = noms[geste.objetId as keyof typeof noms];
      if (nom) {
        await executer(() => page.getByRole('button', { name: `${geste.type === 'placer' ? 'Ajouter' : 'Retirer'} ${nom}` }).click());
        return;
      }
    }
    if (geste.type === 'choisir') {
      const nomsChoix = fruit ? {
        'echanger-unites': 'Échanger 10 fruits contre une caisse',
        'echanger-dizaines': 'Échanger 10 caisses contre une réserve',
        'defaire-dizaine': 'Défaire une caisse en 10 fruits',
        'defaire-centaine': 'Défaire une réserve en 10 caisses',
      } : {
        'echanger-unites': 'Échanger 10 graines contre une botte',
        'echanger-dizaines': 'Échanger 10 bottes contre un sac',
        'defaire-dizaine': 'Défaire une botte en 10 graines',
        'defaire-centaine': 'Défaire un sac en 10 bottes',
      };
      const nom = geste.objetId === 'garder-decomposition' ? 'Garder cette façon' :
        nomsChoix[geste.objetId as keyof typeof nomsChoix];
      if (nom) { await executer(() => page.getByRole('button', { name: nom }).click()); return; }
    }
  }

  if (famille === 'MAT-JAR-02' || famille === 'MAT-MOU-03') {
    const jardin = famille === 'MAT-JAR-02';
    const premier = jardin ? 'Première plate-bande' : 'Premier réglage';
    const second = jardin ? 'Même tout, autre découpage' : 'Même réservoir, autre découpage';
    const id = geste.type === 'placer' || geste.type === 'retirer' ? geste.objetId : '';
    const nom = id.endsWith('-a') ? premier : second;
    const bouton = jardin ? `${geste.type === 'placer' ? 'Couvrir' : 'Retirer'} une part de ${nom}` :
      `${geste.type === 'placer' ? 'Ouvrir' : 'Fermer'} une part, ${nom}`;
    if (id.startsWith(jardin ? 'part-' : 'secteur-')) {
      await executer(() => page.getByRole('button', { name: bouton }).click()); return;
    }
  }

  if (famille === 'MAT-JAR-03') {
    if (geste.type === 'placer' && geste.objetId.startsWith('fruit:')) {
      const source = geste.objetId.slice(6);
      await executer(() => groupe(page, source).getByRole('button', { name: `Vers ${geste.destination}` }).click());
      return;
    }
    if (geste.type === 'placer' && geste.destination === 'valeur') {
      const [colonne, categorie] = geste.objetId.split(':');
      if (colonne === 'table' && categorie) {
        await executer(() => page.getByRole('button', { name: `Case ${geste.position} du tableau ${categorie}` }).click());
        return;
      }
      if (colonne === 'barre' && categorie) {
        let actuel = nombre(etat, `barre:${categorie}`);
        while (actuel !== geste.position) {
          const nom = `${actuel < geste.position ? 'Ajouter' : 'Retirer'} une unité barre ${categorie}`;
          await executer(() => page.getByRole('button', { name: nom }).click());
          actuel = nombre((await repriseCourante(page, profilId)).etat, `barre:${categorie}`);
        }
        return;
      }
    }
    if (geste.type === 'choisir' && geste.objetId.startsWith('lecture:')) {
      await executer(() => page.getByRole('button',
        { name: `Choisir ${geste.objetId.slice(8)} comme panier le plus rempli` }).click());
      return;
    }
  }

  if (famille === 'MAT-MOU-01') {
    const id = geste.type === 'choisir' || geste.type === 'placer' || geste.type === 'retirer' ? geste.objetId : '';
    const morceaux = id.split(':');
    const nom = morceaux[1] === 'a' ? 'Premier montage' : 'Autre montage';
    if (geste.type === 'choisir' && morceaux[0] === 'roue') {
      await executer(() => page.getByRole('button', { name: `Ajouter une roue, ${nom}` }).click()); return;
    }
    if (geste.type === 'retirer' && morceaux[0] === 'roue') {
      await executer(() => page.getByRole('button', { name: `Retirer la dernière roue, ${nom}` }).click()); return;
    }
    if (morceaux[0] === 'pale' && (geste.type === 'placer' || geste.type === 'retirer')) {
      const action = geste.type === 'placer' ? 'Ajouter' : 'Retirer';
      await executer(() => page.getByRole('button',
        { name: `${action} une pale, ${nom}, roue ${Number(morceaux[2]) + 1}` }).click());
      return;
    }
  }

  if (famille === 'MAT-MOU-02') {
    if (geste.type === 'choisir' && geste.objetId === 'ajouter-sac') {
      await executer(() => page.getByRole('button', { name: 'Ajouter un sac' }).click()); return;
    }
    if (geste.type === 'retirer' && geste.objetId === 'dernier-sac') {
      await executer(() => page.getByRole('button', { name: 'Retirer le dernier sac vide' }).click()); return;
    }
    if ((geste.type === 'placer' || geste.type === 'retirer') && geste.objetId.startsWith('sac:')) {
      const [, cote, rang] = geste.objetId.split(':');
      const nom = cote === 'a' ? 'Première distribution' : 'Autre distribution du même stock';
      await executer(() => page.getByRole('button',
        { name: `${geste.type === 'placer' ? 'Verser' : 'Reprendre'} une mesure, ${nom}, sac ${Number(rang) + 1}` }).click());
      return;
    }
  }

  if (famille === 'MAT-MAR-01' || famille === 'MAT-MAR-02') {
    if (geste.type === 'placer') {
      const piece = (p['pieces'] as readonly { id: string; etiquette: string }[]).find((item) => item.id === geste.objetId);
      if (!piece) throw new Error(`Pièce absente du stock : ${geste.objetId}`);
      if (etat.placements[piece.id] !== undefined) {
        const ancienPlateau = etat.placements[piece.id] === 'caisse' ? 'Caisse' :
          etat.placements[piece.id] === 'donne' ? 'Donné' : 'Rendu';
        await executer(() => page.getByRole('button',
          { name: `Retirer ${piece.etiquette} du plateau ${ancienPlateau}` }).click());
      }
      await groupe(page, 'Choisis une pièce ou un billet').getByRole('button', { name: piece.etiquette }).click();
      const destination = geste.destination === 'caisse' ? 'Mettre dans la caisse' :
        geste.destination === 'donne' ? 'Ajouter au donné' : 'Ajouter au rendu';
      await executer(() => page.getByRole('button', { name: destination }).click());
      return;
    }
    if (geste.type === 'choisir') {
      const noms = { echanger: 'Échanger dix pièces de 1 € contre un billet de 10 €',
        'convertir-centimes': 'Échanger deux pièces de 50 c contre 1 €',
        memoriser: famille === 'MAT-MAR-01' ? 'Mémoriser ma première façon' :
          'Mémoriser ma première façon de payer et rendre' };
      const nom = noms[geste.objetId as keyof typeof noms];
      if (nom) { await executer(() => page.getByRole('button', { name: nom }).click()); return; }
    }
  }

  if (famille === 'MAT-MAR-03') {
    if (geste.type === 'placer') {
      const articles = p['articles'] as readonly { id: string }[];
      const rang = articles.findIndex((item) => item.id === geste.objetId);
      if (rang < 0) throw new Error(`Article inconnu : ${geste.objetId}`);
      if (etat.placements[geste.objetId] === 'panier') {
        await executer(() => page.locator('.marche-articles button').nth(rang).click());
      }
      await executer(() => page.locator('.marche-articles button').nth(rang).click());
      return;
    }
    if (geste.type === 'choisir') {
      const nom = geste.objetId === 'memoriser' ? 'Mémoriser ce panier et en essayer un autre' :
        { premier: 'Premier panier', second: 'Second panier', egal: 'Même reste' }[
          geste.objetId.slice('comparaison:'.length) as 'premier' | 'second' | 'egal'];
      if (nom) { await executer(() => page.getByRole('button', { name: nom }).click()); return; }
    }
  }

  if (famille === 'MAT-CHA-01' || famille === 'MAT-CHA-02') {
    if (geste.type === 'placer') {
      if (famille === 'MAT-CHA-01') {
        const rang = Number(geste.objetId.split('-')[1]);
        const grille = Number(p['grille']);
        await groupe(page, 'Sommets du plan').getByRole('button', { name: new RegExp(`^Sommet ${'ABCD'[rang]}`, 'u') }).click();
        await executer(() => page.getByRole('button',
          { name: `Point ${geste.position % grille}, ${Math.floor(geste.position / grille)}`, exact: true }).click());
        return;
      }
      const [, plateau, rangBrut] = geste.objetId.split(':');
      const rang = Number(rangBrut);
      if (plateau === 'b') await groupe(page, 'Choisir un patron').getByRole('button', { name: 'Patron B' }).click();
      await groupe(page, 'Choisir une face').getByRole('button', { name: new RegExp(`^Face ${rang + 1}`, 'u') }).click();
      await executer(() => page.getByRole('button',
        { name: new RegExp(`^Patron ${plateau!.toUpperCase()}, case ${geste.position % 6}, ${Math.floor(geste.position / 6)}`, 'u') }).click());
      return;
    }
    if (geste.type === 'retirer') {
      if (famille === 'MAT-CHA-01') {
        const rang = Number(geste.objetId.split('-')[1]);
        await groupe(page, 'Sommets du plan').getByRole('button', { name: new RegExp(`^Sommet ${'ABCD'[rang]}`, 'u') }).click();
        await executer(() => page.getByRole('button', { name: `Retirer le sommet ${'ABCD'[rang]}` }).click());
        return;
      }
      const [, plateau, rangBrut] = geste.objetId.split(':');
      await groupe(page, 'Choisir un patron').getByRole('button', { name: `Patron ${plateau!.toUpperCase()}` }).click();
      await groupe(page, 'Choisir une face').getByRole('button', { name: new RegExp(`^Face ${Number(rangBrut) + 1}`, 'u') }).click();
      await executer(() => page.getByRole('button',
        { name: `Retirer la face ${Number(rangBrut) + 1} du patron ${plateau!.toUpperCase()}` }).click());
      return;
    }
  }

  if (famille === 'MAT-CHA-03') {
    if (geste.type === 'choisir') {
      await executer(() => page.getByRole('button', { name: new RegExp(`^Plateau ${geste.objetId}`, 'u') }).click()); return;
    }
    if (geste.type === 'placer') {
      const poids = (p['poids'] as readonly { id: string; etiquette: string }[]).find((item) => item.id === geste.objetId);
      if (!poids) throw new Error(`Poids inconnu : ${geste.objetId}`);
      await executer(() => page.getByRole('button',
        { name: `Placer ${poids.etiquette} à ${geste.destination}` }).click()); return;
    }
  }

  if (famille === 'MAT-HOR-01') {
    if (geste.type === 'placer') {
      const heures = geste.objetId === 'aiguille-heures';
      const nom = heures ? 'Petite aiguille : heure' : 'Grande aiguille : minutes';
      const etiquette = heures ? String(geste.position || 12) : String(geste.position).padStart(2, '0');
      await executer(() => groupe(page, nom).getByRole('button', { name: etiquette, exact: true }).click()); return;
    }
    if (geste.type === 'choisir') {
      const nom = geste.objetId === 'apres-midi' ? 'après-midi' : geste.objetId;
      await executer(() => groupe(page, 'Moment de la journée').getByRole('button', { name: nom }).click()); return;
    }
  }

  if (famille === 'MAT-HOR-02') {
    const heure = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
    if (geste.type === 'placer') {
      const ruban = geste.objetId.endsWith('a') ? 'A' : 'B';
      await groupe(page, 'Rubans à poser').getByRole('button', { name: new RegExp(`^Ruban ${ruban}`, 'u') }).click();
      await executer(() => groupe(page, `Choisis le départ du ruban ${ruban}`)
        .getByRole('button', { name: heure(geste.position) }).click()); return;
    }
    if (geste.type === 'choisir') {
      if (geste.objetId.startsWith('arrivee:')) {
        await executer(() => groupe(page, 'À quelle heure arrives-tu ?')
          .getByRole('button', { name: heure(Number(geste.objetId.slice(8))) }).click()); return;
      }
      const nom = geste.objetId.endsWith('principal') ? /^Mes rubans/u : /^Autre trajet/u;
      await executer(() => groupe(page, 'Quel trajet arrive en premier ?').getByRole('button', { name: nom }).click()); return;
    }
  }

  if (famille === 'MAT-HOR-03') {
    const heure = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
    const trajets = p['trajets'] as readonly { id: string; destination: string;
      departMinutes: number; arriveeMinutes: number }[];
    const trajet = (geste.type === 'placer' || geste.type === 'choisir') ?
      trajets.find((item) => item.id === geste.objetId) : undefined;
    if (trajet && geste.type === 'placer') {
      await groupe(page, 'Trajets à classer').getByRole('button',
        { name: `${trajet.destination} · départ ${heure(trajet.departMinutes)} · arrivée ${heure(trajet.arriveeMinutes)}` }).click();
      const [destination, moment] = (geste.destination ?? '').split('|');
      const nomMoment = moment === 'apres-midi' ? 'après-midi' : moment;
      await executer(() => page.locator('.horloge-tableau').getByRole('button',
        { name: new RegExp(`^${destination}, ${nomMoment}`, 'u') }).click()); return;
    }
    if (trajet && geste.type === 'choisir') {
      await executer(() => page.getByRole('group', { name: /^Choisis un trajet qui arrive au plus tard/u })
        .getByRole('button', { name: `${trajet.destination} · ${heure(trajet.departMinutes)} → ${heure(trajet.arriveeMinutes)}` }).click()); return;
    }
  }

  throw new Error(`${famille} : aucun contrôle visible pour ${JSON.stringify(geste)}`);
}

async function acheverEtape(page: Page, profilId: string, projetId: string,
  instanceId: string, recharger: boolean): Promise<void> {
  let reprise = await repriseCourante(page, profilId);
  expect(reprise.instance.id).toBe(instanceId);
  if (reprise.aide !== 'demonstration') {
    if (reprise.aide === 'aucune') {
      reprise = await toucher(page, profilId,
        () => page.getByRole('button', { name: 'Demander une idée à Gobi' }).click());
    }
    reprise = await toucher(page, profilId,
      () => page.getByRole('button', { name: 'Demander une idée à Gobi' }).click());
  }
  expect(reprise.aide).toBe('demonstration');
  await expect(page.getByTestId('aide-maths')).toHaveAttribute('data-aide-proposee', 'demonstration');
  let rechargeFaite = false;
  for (let rang = 0; rang < MAX_GESTES_PAR_ETAPE; rang += 1) {
    reprise = await repriseCourante(page, profilId);
    if (!estInstanceMaths(reprise.instance)) throw new Error(`${projetId} : instance incompatible`);
    if (validerMaths(reprise.instance, reprise.etat).statut === 'correcte') break;
    const proposition = proposerAideMaths(reprise.instance, reprise.aide, reprise.etat).gestePropose;
    if (proposition === null) throw new Error(`${projetId} : Gobi ne propose plus de geste à ${reprise.instance.famille}`);
    await gesteDansAtelier(page, profilId, reprise, proposition);
    if (recharger && !rechargeFaite) {
      const avant = await repriseCourante(page, profilId);
      await page.reload();
      await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', avant.instance.famille);
      const apres = await repriseCourante(page, profilId);
      expect(apres.instance.id).toBe(avant.instance.id);
      expect(apres.revision).toBe(avant.revision);
      expect(apres.etat).toEqual(avant.etat);
      expect(apres.aide).toBe('demonstration');
      rechargeFaite = true;
    }
  }
  reprise = await repriseCourante(page, profilId);
  if (!estInstanceMaths(reprise.instance)) throw new Error(`${projetId} : instance incompatible à la fin`);
  expect(validerMaths(reprise.instance, reprise.etat).statut,
    `${projetId}/${reprise.instance.famille} : la validation suit les gestes visibles`).toBe('correcte');
  const avant = (await lireCarnet(page, profilId)).tentatives.length;
  await page.getByRole('button', { name: reprise.instance.famille.startsWith('MAT-PON') ? 'Vérifier mon pont' : 'Vérifier' }).click();
  await expect(page.getByTestId('reussite-maths')).toBeVisible();
  const carnet = await lireCarnet(page, profilId);
  expect(carnet.tentatives).toHaveLength(avant + 1);
  expect(carnet.tentatives.at(-1)).toMatchObject({ instanceId, projetId });
}

test('les dix-huit projets puis la fête se jouent par les ateliers visibles avec Gobi', async ({ page }) => {
  // 57 étapes et leurs ACK SQLite traversent le navigateur et le serveur ; aucun sommeil fixe.
  test.setTimeout(30 * 60_000);
  page.setDefaultTimeout(10_000);
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.goto('/');
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByRole('button', { name: 'Créer un nouveau joueur' }).click();
  await page.getByLabel('Ton prénom').fill('ProjetsVallee');
  await page.getByRole('button', { name: 'C’est parti' }).click();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  const profils = await (await page.request.get('/api/profils')).json() as readonly { id: string }[];
  expect(profils).toHaveLength(1);
  const profilId = profils[0]!.id;
  const definition = await page.request.post('/api/parent/definir', { data: { code: '4271' } });
  expect(definition.ok()).toBe(true);
  const jeton = (await definition.json() as { jeton: string }).jeton;
  const lecture = () => page.request.get(`/api/parent/${encodeURIComponent(profilId)}/export/tentatives`,
    { headers: { 'x-jeton-parent': jeton } });
  const lectureAvant = await (await lecture()).text();
  expect(lectureAvant.split('\r\n').filter(Boolean)).toHaveLength(1);
  await page.locator('[data-vers="mathematiques"]').click();
  await expect(page.getByTestId('lieux-maths')).toBeVisible();
  const choixCompagnon = page.getByRole('group', { name: 'Avec qui pars-tu ?' });
  if (await choixCompagnon.count()) {
    await choixCompagnon.getByRole('button', { name: 'Gobi' }).click();
    await expect(choixCompagnon.getByRole('button', { name: 'Gobi' })).toHaveAttribute('aria-pressed', 'true');
  }

  let lieuCourant: string | null = null;
  let cadeauxAttendus = 0;
  for (const projet of [...PROJETS_MATHS, FETE_MATHS]) {
    const fete = projet.id === FETE_MATHS.id;
    if (fete) {
      await page.getByRole('button', { name: 'Les six lieux' }).click();
      await expect(page.getByTestId('lieux-maths')).toBeVisible();
      await page.getByRole('button', { name: 'Préparer la fête' }).click();
    } else {
      const prefixe = projet.id.split('-')[1] as keyof typeof LIEUX;
      const lieu = LIEUX[prefixe];
      if (lieuCourant !== lieu) {
        if (lieuCourant !== null) await page.getByRole('button', { name: 'Les six lieux' }).click();
        await expect(page.getByTestId('lieux-maths')).toBeVisible();
        await page.getByTestId(`lieu-${lieu}`).click();
        lieuCourant = lieu;
      }
      await page.getByRole('navigation', { name: 'Les projets du lieu' })
        .getByRole('button', { name: projet.titre }).click();
    }
    const choix = page.locator('.maths-projet .maths-niveaux');
    await expect(choix).toHaveCount(3);
    // Les préférences restent visibles. En cas d'incompatibilité, lire la combinaison
    // proposée à l'enfant et la choisir par les trois groupes de boutons.
    const incompatibilite = page.locator('.maths-incompatibilite');
    const suggestion = await incompatibilite.count() ?
      (await incompatibilite.textContent())!.split('Par exemple : ')[1]!.replace(/\.$/u, '').split(', ') : null;
    for (let rang = 0; rang < 3; rang += 1) {
      const retenu = await choix.nth(rang).locator('button[aria-pressed="true"]').textContent();
      const nom = (suggestion?.[rang] ?? retenu?.trim()) as (typeof NOMS_NIVEAUX)[keyof typeof NOMS_NIVEAUX];
      expect(Object.values(NOMS_NIVEAUX)).toContain(nom);
      await choix.nth(rang).getByRole('button', { name: nom }).click();
    }
    await page.getByRole('button', { name: `Commencer ${projet.titre}` }).click();
    if (fete) await expect(page.locator('.maths-compagnon-scene')).toHaveCount(0);
    const premiere = await repriseCourante(page, profilId);
    expect(premiere.projet?.plan.map((etape) => etape.famille)).toEqual(projet.etapes);
    const plan = premiere.projet!.plan;
    for (let etape = 0; etape < 3; etape += 1) {
      await expect(page.getByTestId('scene-ponts')).toHaveAttribute('data-famille', plan[etape]!.famille);
      await acheverEtape(page, profilId, projet.id, plan[etape]!.instanceId,
        projet.id === PROJETS_MATHS[0]!.id && etape === 1);
      const carnet = await lireCarnet(page, profilId);
      expect(carnet.projets.find((item) => item.projetId === projet.id)?.etapesTerminees).toBe(etape + 1);
      if (etape < 2) await page.getByRole('button',
        { name: plan[etape]!.famille.startsWith('MAT-PON') ? 'Continuer la traversée' : 'Continuer le projet' }).click();
    }
    const apres = await lireCarnet(page, profilId);
    const progression = apres.projets.find((item) => item.projetId === projet.id);
    expect(progression?.termineLe).not.toBeNull();
    await expect(page.locator(`[data-transformation="${progression!.transformationId}"]`)).toBeVisible();
    if (fete || projet.id.endsWith('P01') || projet.id.endsWith('P03')) cadeauxAttendus += 1;
    expect(apres.recompenses.filter((cadeau) => cadeau.projetId === projet.id)).toHaveLength(
      fete || projet.id.endsWith('P01') || projet.id.endsWith('P03') ? 1 : 0);
    expect(apres.recompenses).toHaveLength(cadeauxAttendus);
    await page.getByRole('button', { name: projet.id.startsWith('MAT-PON') ? 'Retour aux Ponts' : 'Retour au lieu' }).click();
    await expect(page.locator(`[data-transformation="${progression!.transformationId}"]`)).toBeVisible();
  }
  const final = await lireCarnet(page, profilId);
  expect(final.projets.filter((projet) => projet.termineLe !== null)).toHaveLength(19);
  expect(final.tentatives).toHaveLength(57);
  expect(final.recompenses).toHaveLength(13);
  expect(await (await lecture()).text(), 'aucun succès maths ne crédite une tentative lecture').toBe(lectureAvant);
});
