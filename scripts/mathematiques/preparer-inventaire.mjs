/** Prépare un dossier éditorial déterministe dans les brouillons, sans publier de contenu. */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOGUE_MATHS } from '../../partage/src/mathematiques/catalogue.ts';
import { PROJETS_MATHS, FETE_MATHS } from '../../partage/src/mathematiques/projets.ts';
import { creerInstanceMaths, creerInstancesProjetMaths } from '../../partage/src/mathematiques/registre.ts';
import { graineSecoursMaths, VERSION_SECOURS_MATHS } from '../../partage/src/mathematiques/secours.ts';
import { COLLECTIBLES_MATHS } from '../../client/src/mathematiques/collection.ts';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SORTIE = join(RACINE, 'contenu', 'brouillons', 'mathematiques', 'inventaire-v1');
const NIVEAUX = ['decouverte', 'exploration', 'defi'];
const LIEUX = ['jardin', 'ponts', 'moulin', 'marche', 'chantier', 'horloge'];
const TRAMES = [...PROJETS_MATHS, FETE_MATHS];

function cheminDepot(chemin) {
  return relative(RACINE, chemin).replaceAll('\\', '/');
}
function ecrireJson(nom, valeur) {
  writeFileSync(join(SORTIE, nom), `${JSON.stringify(valeur, null, 2)}\n`, 'utf8');
}
function exempleProjet(trame, rang) {
  let dernierErreur = null;
  for (const premier of NIVEAUX) for (const deuxieme of NIVEAUX) for (const troisieme of NIVEAUX) {
    const niveaux = [premier, deuxieme, troisieme];
    try {
      return creerInstancesProjetMaths({
        profilId: 'inventaire-editorial', generationMaths: 0,
        cleGeste: `inventaire-${trame.id}`, projetId: trame.id, niveaux,
        graine: 9000 + rang, sessionId: `inventaire-${trame.id}`,
      });
    } catch (cause) { dernierErreur = cause; }
  }
  throw new Error(`Aucun exemple éditorial générable pour ${trame.id} : ${String(dernierErreur)}`);
}

if (CATALOGUE_MATHS.length !== 18 || PROJETS_MATHS.length !== 18 || COLLECTIBLES_MATHS.length !== 13) {
  throw new Error('Le nombre de familles, projets ou gains a changé : réviser le dossier avant génération.');
}

const secours = CATALOGUE_MATHS.flatMap((famille) => NIVEAUX.map((niveau) => {
  const graine = graineSecoursMaths(famille.id, niveau);
  const instance = creerInstanceMaths({
    profilId: 'inventaire-editorial', generationMaths: 0,
    cleGeste: `secours-${famille.id}-${niveau}`,
    famille: famille.id, niveau, graine,
  });
  if (instance.graine !== graine || instance.famille !== famille.id || instance.niveau !== niveau) {
    throw new Error(`Secours non conforme : ${famille.id} ${niveau}.`);
  }
  return { famille: famille.id, lieu: famille.lieu, niveau,
    graineSecours: graine, versionSecours: VERSION_SECOURS_MATHS,
    statutEditorial: 'à relire avant publication', instance };
}));
if (secours.length !== 54) throw new Error('Le dossier doit contenir 54 instances de secours.');

const projets = TRAMES.map((trame, rang) => {
  const exemple = exempleProjet(trame, rang);
  return {
    id: trame.id, titre: trame.titre, version: trame.version,
    familles: trame.etapes, variablesTransmises: trame.variablesTransmises,
    transformationDecrite: trame.transformation,
    exempleNiveaux: exemple.etapes.map((etape) => etape.niveau),
    transformationId: exemple.transformationId,
    cadeauId: exemple.cadeauId, cadeauType: exemple.cadeauType,
    textesEtapes: exemple.etapes.map((etape, rangEtape) => ({
      rang: rangEtape, famille: etape.famille, consigne: etape.consigne.texte,
      indice: etape.aide.indice.texte, demonstration: etape.aide.demonstration.texte,
    })),
  };
});

const imagePonts = join(RACINE, 'contenu', 'assets', 'mathematiques', 'ponts-des-rives-v1.png');
if (!existsSync(imagePonts)) throw new Error('Le décor approuvé des Ponts est absent.');
const decors = LIEUX.map((lieu) => lieu === 'ponts'
  ? { lieu, support: 'image PNG', source: cheminDepot(imagePonts), octets: statSync(imagePonts).size,
    usage: 'décor des Ponts et états combinables', visaEsthetique: 'accord du parent pour ce décor' }
  : { lieu, support: 'SVG rendu par le code', source: 'client/src/mathematiques/DecorVallee.tsx',
    usage: 'décor et états selon les projets terminés', visaEsthetique: 'à obtenir' });
const transformations = projets.filter((projet) => projet.id !== 'MAT-FET-P01').map((projet) => ({
  projetId: projet.id, transformationId: projet.transformationId,
  descriptionCatalogue: projet.transformationDecrite,
  affichage: 'client/src/mathematiques/DecorVallee.tsx',
}));
const inventaireAudioPonts = join(RACINE, 'contenu', 'brouillons', 'mathematiques', 'inventaire-audio-ponts.json');

mkdirSync(SORTIE, { recursive: true });
ecrireJson('secours-54.json', {
  statut: 'brouillon éditorial — aucun visa nouveau', sourceGraines: 'partage/src/mathematiques/secours.ts',
  versionSecours: VERSION_SECOURS_MATHS, nombre: secours.length, secours,
});
ecrireJson('catalogue-et-textes.json', {
  statut: 'brouillon éditorial — textes à relire',
  familles: CATALOGUE_MATHS.map((famille) => ({
    id: famille.id, lieu: famille.lieu, titre: famille.titre, niveaux: famille.niveaux,
  })),
  projets: projets.filter((projet) => projet.id !== 'MAT-FET-P01'),
  fete: projets.find((projet) => projet.id === 'MAT-FET-P01'),
});
ecrireJson('medias-transformations-gains.json', {
  statut: 'inventaire technique — visas conservés',
  decors, transformations,
  fete: { source: 'partage/src/mathematiques/projets.ts',
    transformationId: projets.find((projet) => projet.id === 'MAT-FET-P01').transformationId,
    visaEsthetique: 'à obtenir' },
  gains: COLLECTIBLES_MATHS,
  audio: { statut: 'reporté explicitement par le parent',
    brouillonPonts: existsSync(inventaireAudioPonts) ? cheminDepot(inventaireAudioPonts) : null,
    publication: 'aucun nouveau clip, manifeste ou verrou écrit par ce script' },
});
writeFileSync(join(SORTIE, 'README.md'), `# Dossier éditorial de la Vallée des Nombres\n\n` +
  `Brouillons à emporter pour la revue : \`secours-54.json\` (54 instances complètes), ` +
  `\`catalogue-et-textes.json\` (18 familles, 18 projets et fête), ` +
  `\`medias-transformations-gains.json\` (décors, 18 transformations, 13 gains et audio reporté).\n\n` +
  `À rapprocher des brouillons voisins : \`../ponts-premiere-traversee.json\`, ` +
  `\`../competences-proposees.json\`, \`../rapport-lexique.md\` et \`../images/ponts-des-rives-v1.md\`. ` +
  `Les brouillons audio restent pour la reprise des voix et ne sont pas publiés.\n\n` +
  `Implémentation : \`partage/src/mathematiques/secours.ts\`, \`catalogue.ts\`, \`projets.ts\`, ` +
  `\`registre.ts\` et \`jeux/*\` ; décors dans \`client/src/mathematiques/DecorVallee.tsx\`, ` +
  `gains dans \`client/src/mathematiques/collection.ts\`. ` +
  `Ce dossier est ignoré par Git : le copier explicitement si la revue doit quitter ce poste.\n`, 'utf8');

process.stdout.write(`Inventaire préparé : ${cheminDepot(SORTIE)} ; ${secours.length} secours, ` +
  `${CATALOGUE_MATHS.length} familles, ${PROJETS_MATHS.length} projets + fête, ` +
  `${transformations.length} transformations, ${COLLECTIBLES_MATHS.length} gains.\n`);
