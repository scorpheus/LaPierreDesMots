/**
 * Contrôle déterministe de cohérence interne des exercices publiés.
 *
 * Il complète le schéma : un identifiant présent mais mal relié à la consigne est un
 * exercice jouable qui peut néanmoins enseigner autre chose que ce qui est demandé.
 * Il ne prétend pas juger seul la valeur littéraire d'un récit ni l'image finale.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ecrireEtape } from '../rapport.mjs';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const MOTS_OUTILS = new Set([
  'a', 'au', 'aux', 'ce', 'ces', 'cet', 'cette', 'dans', 'de', 'des', 'du', 'en', 'et', 'est',
  'la', 'le', 'les', 'l', 'un', 'une', 'sur', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton',
  'ta', 'tes', 'avec', 'pour', 'par', 'que', 'qui', 'où', 'ou', 'pas', 'plus', 'tres', 'grand',
  'grande', 'petit', 'petite', 'haut', 'bas', 'gauche', 'droite', 'milieu', 'premier', 'deuxieme',
  'troisieme', 'dernier', 'derniere', 'autre', 'autres', 'couleur', 'colorie', 'dessine',
]);
const ETRES_DES_RECITS = new Set([
  'abeille', 'chat', 'chien', 'cochon', 'dame', 'fille', 'filou', 'gobi', 'hibou', 'lapin',
  'mouche', 'ours', 'papa', 'plume', 'renard', 'souris',
]);

function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function motsSignificatifs(texte) {
  return normaliser(texte).split(' ').filter((mot) => mot.length > 2 && !MOTS_OUTILS.has(mot));
}

function probleme(problemes, chemin, regle, message) {
  problemes.push({ chemin, regle, message });
}

function indexer(elements, chemin, problemeLocal) {
  const index = new Map();
  for (const element of elements ?? []) {
    const id = element?.id;
    if (typeof id !== 'string') continue;
    if (index.has(id)) problemeLocal(`${chemin}/${id}`, 'identifiant-duplique', `« ${id} » est déclaré deux fois.`);
    index.set(id, element);
  }
  return index;
}

function verifierReferences(consignes, champ, index, chemin, problemeLocal) {
  for (const consigne of consignes ?? []) {
    for (const id of consigne?.[champ] ?? []) {
      if (!index.has(id)) {
        problemeLocal(`${chemin}/consignes/${consigne.id}/${champ}`, 'reference-inconnue',
          `« ${id} » n'existe pas dans le catalogue associé.`);
      }
    }
  }
}

function verifierTexteCibleColorie(contenu, regions, chemin, problemeLocal) {
  for (const consigne of contenu.consignes ?? []) {
    const texte = normaliser(consigne.texte);
    for (const cible of consigne.cibles ?? []) {
      if (!contenu.nuancierAutorise?.includes(cible.couleur)) {
        problemeLocal(`${chemin}/consignes/${consigne.id}/cibles`, 'couleur-non-proposee',
          `La couleur « ${cible.couleur} » n'est pas dans le nuancier de l'exercice.`);
      }
      const region = regions.get(cible.region);
      if (region === undefined) continue;
      const mots = motsSignificatifs(region.libelle);
      const estNomme = mots.some((mot) => {
        const variantes = mot.endsWith('s') ? [mot, mot.slice(0, -1)] : [mot, `${mot}s`];
        return variantes.some((variante) => new RegExp(`(?:^| )${variante}(?: |$)`, 'u').test(texte));
      });
      if (mots.length > 0 && !estNomme) {
        problemeLocal(`${chemin}/consignes/${consigne.id}/cibles`, 'cible-non-nommee',
          `La cible « ${region.libelle} » n'est pas nommée dans « ${consigne.texte} ».`);
      }
    }
  }
}

function etresNommees(texte) {
  return new Set(motsSignificatifs(texte).filter((mot) => ETRES_DES_RECITS.has(mot)));
}

/** Audite un exercice déjà lu. `regions` associe les id SVG à leurs libellés humains. */
export function auditerExercice(exercice, chemin = 'exercice.json', regions = new Map()) {
  const problemes = [];
  const dire = (suffixe, regle, message) => probleme(problemes, `${chemin}${suffixe}`, regle, message);
  const contenu = exercice?.jeu?.contenu;
  if (typeof contenu !== 'object' || contenu === null) {
    dire('/jeu/contenu', 'contenu-illisible', 'Le bloc de contenu est absent ou illisible.');
    return problemes;
  }
  const moteur = exercice?.jeu?.moteur;
  const consignes = contenu.consignes ?? [];

  // Formulation écartée par le lot CE1 : « le son de gant » désigne une abstraction ;
  // « le même son que dans « gant » » donne au contraire un mot-repère à comparer.
  for (const consigne of consignes) {
    if (/\bson de\b/iu.test(consigne.texte ?? '')) {
      dire(`/consignes/${consigne.id}/texte`, 'formulation-son-abstraite',
        'Employer « le même son que dans « … » » : « son de … » ne donne pas le repère à comparer.');
    }
  }

  if (moteur === 'attrape') {
    const cibles = indexer(contenu.cibles, '/cibles', (p, r, m) => dire(p, r, m));
    verifierReferences(consignes, 'aAttraper', cibles, '', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) for (const id of consigne.aAttraper ?? []) {
      if (cibles.get(id)?.bonne !== true) dire(`/consignes/${consigne.id}/aAttraper`, 'cible-non-bonne', `« ${id} » est demandée mais n'est pas une bonne cible.`);
    }
  }

  if (moteur === 'tri') {
    for (const receptacle of contenu.receptacles ?? []) {
      if (/\bson de\b/iu.test(receptacle.critere ?? '')) {
        dire(`/receptacles/${receptacle.id}/critere`, 'formulation-son-abstraite',
          'Le critère du panier est lui aussi affiché : nommer le même son que dans le mot-repère.');
      }
    }
    const elements = indexer(contenu.elements, '/elements', (p, r, m) => dire(p, r, m));
    const receptacles = indexer(contenu.receptacles, '/receptacles', (p, r, m) => dire(p, r, m));
    verifierReferences(consignes, 'aRanger', elements, '', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) for (const id of consigne.aRanger ?? []) {
      const element = elements.get(id);
      if (element && !receptacles.has(element.receptacleAttendu)) dire(`/elements/${id}`, 'receptacle-inconnu', `« ${element.receptacleAttendu} » n'est pas un réceptacle déclaré.`);
    }
  }

  if (moteur === 'paires') {
    const cartes = contenu.cartes ?? [];
    const paires = new Map();
    for (const carte of cartes) paires.set(carte.paire, [...(paires.get(carte.paire) ?? []), carte]);
    verifierReferences(consignes, 'aApparier', paires, '', (p, r, m) => dire(p, r, m));
    for (const [id, cartesDeLaPaire] of paires) {
      if (cartesDeLaPaire.length !== 2) dire(`/cartes`, 'paire-incomplete', `La paire « ${id} » possède ${cartesDeLaPaire.length} carte(s), deux sont nécessaires.`);
    }
  }

  if (moteur === 'assemble') {
    const blocs = indexer(contenu.blocs, '/blocs', (p, r, m) => dire(p, r, m));
    verifierReferences(consignes, 'solution', blocs, '', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) {
      const recompose = (consigne.solution ?? []).map((id) => blocs.get(id)?.libelle ?? '').join('');
      if (recompose && normaliser(recompose) !== normaliser(consigne.mot)) {
        dire(`/consignes/${consigne.id}/solution`, 'mot-mal-recompose', `« ${recompose} » ne recompose pas « ${consigne.mot} ».`);
      }
    }
  }

  if (moteur === 'grave') {
    for (const consigne of consignes) for (const trou of consigne.trous ?? []) {
      if (consigne.mot?.slice(trou.position, trou.position + trou.attendu.length) !== trou.attendu) {
        dire(`/consignes/${consigne.id}/trous/${trou.id}`, 'trou-mal-positionne', `« ${trou.attendu} » n'est pas à la position ${trou.position} de « ${consigne.mot} ».`);
      }
      if (!contenu.clavier?.includes(trou.attendu)) dire(`/consignes/${consigne.id}/trous/${trou.id}`, 'touche-absente', `« ${trou.attendu} » n'est pas disponible au clavier.`);
    }
  }

  if (moteur === 'phrase') {
    const etiquettes = indexer(contenu.etiquettes, '/etiquettes', (p, r, m) => dire(p, r, m));
    verifierReferences(consignes, 'ordre', etiquettes, '', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) {
      const phrase = (consigne.ordre ?? []).map((id) => etiquettes.get(id)?.mot ?? '').join(' ');
      if (phrase && normaliser(phrase) !== normaliser(consigne.phrase)) {
        dire(`/consignes/${consigne.id}/ordre`, 'phrase-mal-composee', `Les étiquettes écrivent « ${phrase} », pas « ${consigne.phrase} ».`);
      }
    }
  }

  if (moteur === 'chemin') {
    const cases = indexer(contenu.cases, '/cases', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) {
      // Le contrat CaseChemin ne possède pas d'image ; un décor derrière les mots
      // ne transforme pas douze phrases en cartes illustrées.
      if (/\bimages?\b/iu.test(consigne.texte ?? '')) {
        dire(`/consignes/${consigne.id}/texte`, 'chemin-images-absentes',
          'La consigne demande des images, mais les cases Chemin ne rendent que des libellés.');
      }
      if (!cases.has(consigne.depart)) dire(`/consignes/${consigne.id}/depart`, 'depart-inconnu', `« ${consigne.depart} » n'est pas une case.`);
      const suite = [consigne.depart, ...(consigne.parcours ?? [])];
      for (let i = 1; i < suite.length; i += 1) {
        const precedent = cases.get(suite[i - 1]);
        const courant = cases.get(suite[i]);
        if (!courant) dire(`/consignes/${consigne.id}/parcours`, 'case-inconnue', `« ${suite[i]} » n'est pas une case.`);
        else if (precedent && !precedent.voisines?.includes(suite[i])) dire(`/consignes/${consigne.id}/parcours`, 'parcours-non-continu', `« ${suite[i - 1]} » et « ${suite[i]} » ne sont pas voisines.`);
      }
    }
  }

  if (moteur === 'eclair') {
    const options = indexer(contenu.options, '/options', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) {
      verifierReferences([consigne], 'options', options, '', (p, r, m) => dire(p, r, m));
      if (!options.has(consigne.reponse)) dire(`/consignes/${consigne.id}/reponse`, 'reponse-inconnue', `« ${consigne.reponse} » n'est pas une option.`);
      const mot = normaliser(consigne.mot);
      if (mot.length > 0 && new RegExp(`(?:^| )${mot}(?: |$)`, 'u').test(normaliser(consigne.texte))) {
        dire(`/consignes/${consigne.id}/texte`, 'cible-eclair-revelee', `La consigne révèle « ${consigne.mot} » alors que le mot doit disparaître avant le choix.`);
      }
    }
  }

  if (moteur === 'chrono') {
    const vignettes = indexer(contenu.vignettes, '/vignettes', (p, r, m) => dire(p, r, m));
    verifierReferences(consignes, 'ordre', vignettes, '', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) {
      const phrases = String(consigne.recit ?? '').match(/[^.!?]+[.!?]?/gu) ?? [];
      for (const [index, id] of (consigne.ordre ?? []).entries()) {
        const phrase = phrases[index];
        const vignette = vignettes.get(id);
        if (!phrase || !vignette) continue;
        const dansRecit = etresNommees(phrase);
        const dansVignette = etresNommees(vignette.libelle);
        if (dansRecit.size > 0 && dansVignette.size > 0 && ![...dansRecit].some((etre) => dansVignette.has(etre))) {
          dire(`/consignes/${consigne.id}/ordre/${index}`, 'chronologie-sujet-incoherent',
            `Le récit nomme « ${[...dansRecit].join(', ')} », la vignette « ${vignette.libelle} » nomme « ${[...dansVignette].join(', ')} »`);
        }
      }
    }
  }

  if (moteur === 'colorie') verifierTexteCibleColorie(contenu, regions, '', (p, r, m) => dire(p, r, m));

  if (moteur === 'place') {
    const zones = indexer(contenu.zones, '/zones', (p, r, m) => dire(p, r, m));
    const reserve = indexer(contenu.reserve, '/reserve', (p, r, m) => dire(p, r, m));
    for (const consigne of consignes) for (const depot of consigne.depots ?? []) {
      if (!reserve.has(depot.element)) dire(`/consignes/${consigne.id}/depots`, 'element-inconnu', `« ${depot.element} » est absent de la réserve.`);
      if (!zones.has(depot.zone)) dire(`/consignes/${consigne.id}/depots`, 'zone-inconnue', `« ${depot.zone} » est absente des zones de dépôt.`);
    }
  }

  if (moteur === 'histoire') {
    const options = indexer(contenu.options, '/options', (p, r, m) => dire(p, r, m));
    for (const question of contenu.questions ?? []) {
      verifierReferences([question], 'options', options, '', (p, r, m) => dire(p, r, m));
      if (!options.has(question.reponse)) dire(`/questions/${question.id}/reponse`, 'reponse-inconnue', `« ${question.reponse} » n'est pas une option.`);
    }
  }
  return problemes;
}

function fichiersJson(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    return entree.isDirectory() ? fichiersJson(chemin) : entree.name.endsWith('.json') ? [chemin] : [];
  });
}

function regionsDesHabillages(racine) {
  const resultat = new Map();
  for (const fichier of fichiersJson(join(racine, 'contenu', 'habillages'))) {
    const habillage = JSON.parse(readFileSync(fichier, 'utf8'));
    const regions = new Map();
    for (const calque of habillage.scene?.calques ?? []) for (const region of calque.regions ?? []) regions.set(region.id, region);
    resultat.set(habillage.id, regions);
  }
  return resultat;
}

/** Audite toutes les fiches publiées d'une racine de projet. */
export function auditerRepertoire(racine = RACINE) {
  const habillages = regionsDesHabillages(racine);
  const exercices = fichiersJson(join(racine, 'contenu', 'exercices'));
  const problemes = [];
  for (const fichier of exercices) {
    const exercice = JSON.parse(readFileSync(fichier, 'utf8'));
    const chemin = relative(racine, fichier).split(sep).join('/');
    problemes.push(...auditerExercice(exercice, chemin, habillages.get(exercice.jeu?.habillage) ?? new Map()));
  }
  return { exercices: exercices.length, problemes };
}

/** Donne au rapport global des incohérences nommées, pas un vague code de sortie non nul. */
export function resumerAudit(rapport) {
  return {
    etape: 'qa:coherence',
    statut: rapport.problemes.length === 0 ? 'reussite' : 'echec',
    total: rapport.exercices,
    echecs: rapport.problemes.length,
    cause: rapport.problemes.length === 0 ? null : `${rapport.problemes.length} incohérence(s) dans les ${rapport.exercices} exercices publiés.`,
    details: rapport.problemes.map((probleme) => ({
      ou: probleme.chemin, message: `[${probleme.regle}] ${probleme.message}`,
    })),
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const debut = performance.now();
  const rapport = auditerRepertoire(process.argv[2] ?? RACINE);
  ecrireEtape({ ...resumerAudit(rapport), dureeMs: performance.now() - debut });
  console.log(`audit-coherence-exercices — ${rapport.exercices} exercice(s), ${rapport.problemes.length} problème(s)`);
  for (const element of rapport.problemes) console.log(`✗ ${element.chemin} [${element.regle}] ${element.message}`);
  if (rapport.problemes.length > 0) process.exitCode = 1;
}
