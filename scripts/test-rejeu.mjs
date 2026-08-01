/**
 * `npm run test:rejeu` — T2, rejeu des journaux de référence. Lot L2-D.
 *
 * **Ce script était la seule coquille de la v1** (contrat v1 § 8.1, écart assumé n° 7) : il
 * existait, refusait d'annoncer un succès muet, et le disait. La décision D1 excluait BKT,
 * Leitner et sélecteur ; il n'y avait rien à rejouer. **L2-D les livre : il cesse d'être une
 * coquille.**
 *
 * Ce qu'il fait maintenant, exactement ce que l'annexe T § T2 demande : rejouer chaque journal
 * de `tests/fixtures/journaux/*.jsonl` dans le moteur pédagogique, comparer aux agrégats de
 * référence, et **s'arrêter sur toute divergence**.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * DEUX RÈGLES QUE CE SCRIPT NE VIOLE JAMAIS
 *
 * 1. **Il ne met JAMAIS une référence à jour de sa propre initiative** (CLAUDE.md, annexe T
 *    § 6). Il n'a aucun drapeau `--maj`, et c'est délibéré : le jour où le BKT change, l'écart
 *    doit être expliqué en clair et arbitré par un humain. Un `--maj` sous la main, on l'utilise.
 * 2. **Il refuse de sortir en vert quand il n'a rien vérifié.** Un journal sans référence est un
 *    échec, pas une absence : sinon il suffirait de supprimer un fichier `.attendu.json` pour
 *    faire taire une régression.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Le rapport porte l'**empreinte des paramètres** (`empreinteParametres`). D13 : « ces valeurs
 * seront recalibrées, et le test de rejeu doit rendre visible tout changement. » Une
 * recalibration change l'empreinte AVANT de changer les agrégats : le rapport dit alors
 * pourquoi les chiffres ont bougé, au lieu de laisser croire à une régression du code.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { RACINE, ecrireEtape, genererRapport } from './rapport.mjs';

const ETAPE = 'test:rejeu';
const debut = Date.now();

const DOSSIER_JOURNAUX = join(RACINE, 'tests', 'fixtures', 'journaux');
const CHEMIN_PARAMETRES = join(RACINE, 'contenu', 'referentiel', 'parametres-pedagogie.json');

/** Précision de comparaison des probabilités. Au-delà, on comparerait du bruit de virgule. */
const DECIMALES = 6;

function arrondir(valeur) {
  return Number(Number(valeur).toFixed(DECIMALES));
}

/**
 * Charge le moteur pédagogique **depuis la SOURCE**, jamais depuis `partage/dist/`.
 *
 * Ce choix est délibéré et il coûte une seconde de démarrage. `partage/dist/` n'est reconstruit
 * que par `tsc -b` ; un `dist` périmé ferait rejouer l'ANCIEN moteur contre les références et
 * sortirait en vert alors que la source vient de régresser. C'est précisément le mode de
 * défaillance que ce script existe pour attraper — le laisser entrer par la porte du chargement
 * serait absurde. La cohérence entre source et `dist` est verifiée ailleurs, par `tsc -b`.
 *
 * `tsx/esm/api` et non `node:module.register('tsx/esm')` : tsx refuse d'être chargé par
 * l'ancien mécanisme de `--loader`, déprécié depuis Node 20.6, et le dit explicitement. tsx est
 * une dépendance de développement du dépôt — rien ne s'installe hors du projet (D9).
 */
async function chargerPedagogie() {
  const { register } = await import('tsx/esm/api');
  register();
  const source = join(RACINE, 'partage', 'src', 'pedagogie', 'index.ts');
  return { module: await import(pathToFileURL(source).href), source: 'partage/src (tsx)' };
}

/** Une ligne `.jsonl` par événement. Les lignes vides et l'en-tête ne sont pas des étapes. */
function lireJournal(chemin) {
  const etapes = [];
  let entete = null;
  const lignes = readFileSync(chemin, 'utf8').split('\n');
  for (const [rang, brute] of lignes.entries()) {
    const ligne = brute.trim();
    if (ligne === '') continue;
    let objet;
    try {
      objet = JSON.parse(ligne);
    } catch (erreur) {
      throw new Error(`ligne ${rang + 1} illisible : ${erreur.message}`);
    }
    if (objet.type === 'entete') {
      entete = objet;
    } else if (objet.type === 'etape') {
      etapes.push(objet);
    } else {
      throw new Error(`ligne ${rang + 1} : type inconnu « ${String(objet.type)} »`);
    }
  }
  return { entete, etapes };
}

/**
 * Rejoue un journal et rend ses agrégats.
 *
 * L'ordre est celui du fichier, et il fait foi : le Leitner et le BKT sont tous deux sensibles à
 * l'ordre, et trier ici donnerait un résultat que le serveur ne produit jamais.
 */
function rejouer(pedagogie, parametres, etapes) {
  const maitrises = new Map();
  const items = new Map();

  for (const etape of etapes) {
    const observation = {
      competence: etape.competence,
      reussi: etape.reussi === true,
      modeReponse: etape.modeReponse,
      nbElements: etape.nbElements ?? null,
      avecAide: etape.avecAide === true,
      instant: etape.instant
    };

    const depart =
      maitrises.get(observation.competence) ??
      pedagogie.etatMaitriseInitial(observation.competence, parametres.bkt);
    const suivant = pedagogie.mettreAJourMaitrise(
      depart,
      observation,
      parametres.bkt,
      parametres.acquis
    );
    maitrises.set(observation.competence, {
      ...suivant,
      acquiseLe:
        suivant.acquiseLe ??
        (pedagogie.estAcquise(suivant, parametres.acquis) ? observation.instant : null)
    });

    // Même règle que `revueReussie` du dépôt serveur : réussi ET sans aide.
    const revueReussie = observation.reussi && !observation.avecAide;
    const courant =
      items.get(etape.item) ?? pedagogie.itemLeitnerInitial(etape.item, observation.instant);
    items.set(
      etape.item,
      revueReussie
        ? pedagogie.promouvoir(courant, parametres.leitner, observation.instant)
        : pedagogie.retrograder(courant, parametres.leitner, observation.instant)
    );
  }

  return {
    empreinteParametres: pedagogie.empreinteParametres(parametres),
    nbEtapes: etapes.length,
    maitrises: [...maitrises.values()]
      .map((etat) => ({
        competence: etat.competence,
        p: arrondir(etat.p),
        nbTentatives: etat.nbTentatives,
        joursDistincts: [...etat.joursDistincts],
        nbTentativesFaibleDevinette: etat.nbTentativesFaibleDevinette,
        acquise: etat.acquiseLe !== null
      }))
      .sort((a, b) => (a.competence < b.competence ? -1 : 1)),
    leitner: [...items.values()]
      .map((item) => ({
        item: item.item,
        boite: item.boite,
        echeanceLe: item.echeanceLe,
        nbRevues: item.nbRevues
      }))
      .sort((a, b) => (a.item < b.item ? -1 : 1))
  };
}

/** Diff structurel, chemin par chemin. On veut lire OÙ ça diverge, pas que ça diverge. */
function comparer(attendu, obtenu, chemin = '', ecarts = []) {
  if (Array.isArray(attendu) || Array.isArray(obtenu)) {
    if (!Array.isArray(attendu) || !Array.isArray(obtenu)) {
      ecarts.push({ ou: chemin, attendu, obtenu });
      return ecarts;
    }
    if (attendu.length !== obtenu.length) {
      ecarts.push({ ou: `${chemin}.length`, attendu: attendu.length, obtenu: obtenu.length });
      return ecarts;
    }
    attendu.forEach((element, i) => comparer(element, obtenu[i], `${chemin}[${i}]`, ecarts));
    return ecarts;
  }
  if (attendu !== null && typeof attendu === 'object') {
    if (obtenu === null || typeof obtenu !== 'object') {
      ecarts.push({ ou: chemin, attendu, obtenu });
      return ecarts;
    }
    for (const cle of new Set([...Object.keys(attendu), ...Object.keys(obtenu)])) {
      // Les clés préfixées `$` sont de la documentation dans le fichier de référence — le motif
      // de la fixture, la raison de ne pas la mettre à jour. Elles ne sont pas des agrégats et
      // n'ont rien à voir avec le rejeu.
      if (cle.startsWith('$')) continue;
      comparer(attendu[cle], obtenu[cle], chemin === '' ? cle : `${chemin}.${cle}`, ecarts);
    }
    return ecarts;
  }
  if (attendu !== obtenu) {
    ecarts.push({ ou: chemin, attendu, obtenu });
  }
  return ecarts;
}

/**
 * Les contrôles PÉDAGOGIQUES de la référence.
 *
 * Ils existent parce qu'un fichier d'agrégats engendré depuis l'implantation ne prouve, seul,
 * que sa propre stabilité. Ceux-ci disent en clair ce que le journal est censé démontrer — et
 * en particulier la clause de D13 : une compétence peut franchir le seuil de probabilité, le
 * nombre de tentatives et le nombre de jours, et ne PAS être acquise faute de deux tentatives à
 * faible devinette.
 */
function verifierControles(controles, agregats, parametres) {
  if (!controles) return [];
  const echecs = [];
  const parCode = new Map(agregats.maitrises.map((m) => [m.competence, m]));

  for (const code of controles.acquises ?? []) {
    const etat = parCode.get(code);
    if (!etat) {
      echecs.push({ ou: code, message: 'compétence absente du rejeu' });
    } else if (!etat.acquise) {
      echecs.push({ ou: code, message: 'devait être acquise, ne l’est pas' });
    }
  }

  for (const code of controles.nonAcquisesMalgreSeuil ?? []) {
    const etat = parCode.get(code);
    if (!etat) {
      echecs.push({ ou: code, message: 'compétence absente du rejeu' });
      continue;
    }
    if (etat.acquise) {
      echecs.push({
        ou: code,
        message:
          'LA CLAUSE DE D13 EST TOMBÉE : cette compétence est acquise alors qu’elle ne compte ' +
          'aucune tentative à faible devinette. Une série de vrai/faux chanceux suffit désormais.'
      });
    }
    if (etat.p < parametres.acquis.seuilP) {
      echecs.push({
        ou: code,
        message:
          `le contrôle ne prouve plus rien : p = ${String(etat.p)} est sous le seuil ` +
          `${String(parametres.acquis.seuilP)}, la non-acquisition s’explique sans la clause de D13`
      });
    }
    if (etat.nbTentativesFaibleDevinette >= parametres.acquis.tentativesFaibleDevinetteMin) {
      echecs.push({ ou: code, message: 'le journal ne porte plus le cas à forte devinette' });
    }
  }

  return echecs;
}

// ─────────────────────────────────────────────────────────────────────── exécution

const journaux = existsSync(DOSSIER_JOURNAUX)
  ? readdirSync(DOSSIER_JOURNAUX, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.jsonl'))
      .map((e) => e.name)
      .sort()
  : [];

let statut = 'reussite';
let note = '';
const details = [];
let empreinte = '(non calculée)';

if (journaux.length === 0) {
  statut = 'vide';
  note =
    '0 journal de référence dans `tests/fixtures/journaux/` : **aucun test à ce stade**. ' +
    'Ce n’est pas une réussite, c’est une absence — le filet contre les régressions ' +
    'pédagogiques silencieuses ne couvre rien.';
} else {
  const { module: pedagogie, source } = await chargerPedagogie();
  const parametres = pedagogie.lireParametresPedagogie(
    JSON.parse(readFileSync(CHEMIN_PARAMETRES, 'utf8'))
  );
  empreinte = pedagogie.empreinteParametres(parametres);

  for (const nom of journaux) {
    const cheminJournal = join(DOSSIER_JOURNAUX, nom);
    const cheminAttendu = join(DOSSIER_JOURNAUX, `${nom.replace(/^journal-/, '').replace(/\.jsonl$/, '')}.attendu.json`);

    if (!existsSync(cheminAttendu)) {
      statut = 'echec';
      details.push({
        ou: `tests/fixtures/journaux/${nom}`,
        message:
          'aucun fichier de référence `*.attendu.json` en face. Un journal sans référence n’est ' +
          'jamais rejoué : sortir en vert reviendrait à déclarer vérifié ce qui ne l’est pas.'
      });
      continue;
    }

    let agregats;
    try {
      const { etapes } = lireJournal(cheminJournal);
      agregats = rejouer(pedagogie, parametres, etapes);
    } catch (erreur) {
      statut = 'echec';
      details.push({ ou: `tests/fixtures/journaux/${nom}`, message: erreur.message });
      continue;
    }

    const attendu = JSON.parse(readFileSync(cheminAttendu, 'utf8'));
    const controles = attendu.controles;
    const attenduSansControles = { ...attendu };
    delete attenduSansControles.controles;

    const ecarts = comparer(attenduSansControles, agregats);
    for (const ecart of ecarts) {
      statut = 'echec';
      details.push({
        ou: `${nom} → ${ecart.ou}`,
        message: `attendu ${JSON.stringify(ecart.attendu)}, obtenu ${JSON.stringify(ecart.obtenu)}`
      });
    }

    for (const echec of verifierControles(controles, agregats, parametres)) {
      statut = 'echec';
      details.push({ ou: `${nom} → contrôle ${echec.ou}`, message: echec.message });
    }
  }

  const empreinteAttendue = journaux
    .map((nom) => join(DOSSIER_JOURNAUX, `${nom.replace(/^journal-/, '').replace(/\.jsonl$/, '')}.attendu.json`))
    .filter((chemin) => existsSync(chemin))
    .map((chemin) => JSON.parse(readFileSync(chemin, 'utf8')).empreinteParametres)
    .find((valeur) => typeof valeur === 'string');

  const changementParametres =
    empreinteAttendue !== undefined && empreinteAttendue !== empreinte
      ? ' **Les paramètres pédagogiques ont changé depuis la référence** ' +
        `(empreinte ${empreinteAttendue} → ${empreinte}) : l’écart est probablement une ` +
        'recalibration voulue, et il doit être expliqué en clair puis arbitré. Ce script ne met ' +
        'jamais une référence à jour de lui-même.'
      : '';

  note =
    statut === 'echec'
      ? `${String(details.length)} divergence(s) entre le rejeu et les références. ` +
        'Ne PAS mettre les références à jour : expliquer l’écart pédagogique en clair et ' +
        `attendre l’arbitrage (annexe T § 6).${changementParametres}`
      : `${String(journaux.length)} journal(aux) rejoué(s) sans divergence. ` +
        `Moteur lu depuis ${source}, empreinte des paramètres ${empreinte}.${changementParametres}`;
}

ecrireEtape({
  etape: ETAPE,
  statut,
  dureeMs: Date.now() - debut,
  total: journaux.length,
  echecs: details.length,
  details,
  note
});
genererRapport({ commande: 'npm run test:rejeu' });

console.log(`test:rejeu — ${String(journaux.length)} journal(aux). ${note}`);
process.exit(statut === 'echec' ? 1 : 0);
