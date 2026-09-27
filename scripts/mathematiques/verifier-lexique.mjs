/** Contrôle lexical déclaratif des maths : rapport brouillon, aucune écriture produit. */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { estAuLexique, normaliser } from '../generer-phonologie.mjs';
import { CATALOGUE_MATHS, creerInstanceMaths } from '../../partage/src/mathematiques/index.ts';

const RACINE = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DOSSIER_SORTIE = join(RACINE, 'contenu/brouillons/mathematiques');
const SORTIE_JSON = join(DOSSIER_SORTIE, 'rapport-lexique.json');
const SORTIE_MD = join(DOSSIER_SORTIE, 'rapport-lexique.md');
const NIVEAUX = ['decouverte', 'exploration', 'defi'];
const TERMES_INDISPENSABLES = new Set([
  'additionne', 'angle', 'balance', 'centimetre', 'cote', 'cube', 'dizaine', 'encadrement', 'fraction',
  'graduation', 'heure', 'longueur', 'masse', 'metre', 'minute', 'monnaie', 'patron', 'perimetre',
  'quadrillage', 'regle', 'repere', 'secteur', 'soustraction', 'tableau', 'unite', 'valeur',
]);
const FORMULATIONS_A_REVOIR = [
  ['genere:MAT-HOR-03:defi:consigne',
    'Place chaque trajet dans le tableau destination et moment de la journée. Pour arriver au plus tard à 17 h 00, choisis un départ compatible.',
    'Place chaque trajet dans le tableau. Pour arriver au plus tard à 17 h, choisis le départ qui permet d’arriver à l’heure.',
    '« compatible » est abstrait et le groupe « tableau destination et moment » manque de lien grammatical.'],
  ['genere:MAT-MOU-03:defi:indice',
    'Les secteurs doivent être égaux. Ajoute ou retire un secteur pour changer le débit.',
    'Les parts doivent être de même taille. Ajoute ou retire une part pour laisser passer plus ou moins d’eau.',
    '« secteur » et « débit » sont techniques alors que le geste porte sur des parts visibles et l’eau du moulin.'],
  ['genere:MAT-MAR-03:defi:demonstration',
    'Gobi montre un regroupement. Essaie toi-même.',
    'Gobi montre une façon d’additionner. Essaie toi-même.',
    '« regroupement » ne décrit pas clairement le geste montré.'],
  ['genere:MAT-PON-01:defi:demonstration',
    'La portée mesure 13 centimètres. Cherche des planches raccordées.',
    'La traversée mesure 13 centimètres. Cherche des planches qui se touchent.',
    '« portée » et « raccordées » sont du vocabulaire de construction peu transparent pour la scène.'],
  ['ui:client/src/mathematiques/lieux/AteliersChantier.tsx',
    'Équilibre les matériaux',
    'Mets le même poids des deux côtés',
    'Le verbe seul ne dit pas ce que l’enfant doit observer sur la balance.'],
];

function mots(texte) {
  return texte.match(/[\p{L}]+(?:[’'-][\p{L}]+)*/gu) ?? [];
}
function ranger(mot) {
  const cle = normaliser(mot);
  if (estAuLexique(mot)) return null;
  if (TERMES_INDISPENSABLES.has(cle)) return { type: 'terme-maths-indispensable', remplacement: null };
  return { type: 'hors-lexique-a-relire', remplacement: null };
}
function fichiersRecursifs(dossier) {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) =>
    entree.isDirectory() ? fichiersRecursifs(join(dossier, entree.name)) : [join(dossier, entree.name)]);
}
function texteExpressionAst(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isTemplateExpression(expression)) return [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)].join('…');
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const gauche = texteExpressionAst(expression.left), droite = texteExpressionAst(expression.right);
    return gauche === null || droite === null ? null : `${gauche}…${droite}`;
  }
  return null;
}
function texteUiAstValide(texte) {
  return /^[\p{L}✦]/u.test(texte) && !/[={};|]/u.test(texte) && !texte.includes("[") && !texte.includes("]") &&
    !/\b(?:const|return|null|instance|proprietes|map|filter|has)\b/iu.test(texte);
}
function textesUiAst() {
  const dossier = join(RACINE, 'client/src/mathematiques');
  return fichiersRecursifs(dossier).filter((fichier) => /\.tsx?$/u.test(fichier)).flatMap((fichier) => {
    const source = ts.createSourceFile(fichier, readFileSync(fichier, 'utf8'), ts.ScriptTarget.Latest, true, fichier.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const trouves = [];
    const ajouter = (texte) => {
      const normalise = texte.replace(/\s+/gu, ' ').trim();
      if (texteUiAstValide(normalise)) trouves.push(normalise);
    };
    const visiter = (noeud) => {
      if (ts.isStringLiteral(noeud) || ts.isNoSubstitutionTemplateLiteral(noeud) || ts.isTemplateExpression(noeud)) {
        const texte=texteExpressionAst(noeud);
        if (texte!==null && /\s/u.test(texte)) ajouter(texte);
      }
      if (ts.isJsxText(noeud)) ajouter(noeud.getText(source));
      if (ts.isJsxAttribute(noeud) && ['aria-label', 'title', 'placeholder', 'alt'].includes(noeud.name.text) && noeud.initializer !== undefined) {
        if (ts.isStringLiteral(noeud.initializer)) ajouter(noeud.initializer.text);
        if (ts.isJsxExpression(noeud.initializer) && noeud.initializer.expression !== undefined) {
          const texte = texteExpressionAst(noeud.initializer.expression); if (texte !== null) ajouter(texte);
        }
      }
      if (ts.isJsxExpression(noeud) && noeud.expression !== undefined) {
        const texte = texteExpressionAst(noeud.expression); if (texte !== null) ajouter(texte);
      }
      if (ts.isCallExpression(noeud) && ts.isIdentifier(noeud.expression) && /^(texte|consigne|message|libelle)$/u.test(noeud.expression.text)) {
        for (const argument of noeud.arguments) { const texte = texteExpressionAst(argument); if (texte !== null) ajouter(texte); }
      }
      ts.forEachChild(noeud, visiter);
    };
    visiter(source);
    return [...new Set(trouves)].map((texte) => ({ origine: `ui:${relative(RACINE, fichier).replaceAll('\\', '/')}`, texte }));
  });
}
function textesGeneres() {
  const resultat = [];
  let graine = 1001;
  for (const famille of CATALOGUE_MATHS) for (const niveau of NIVEAUX) {
    const instance = creerInstanceMaths({ profilId: 'lexique', famille: famille.id, niveau, graine: graine++, cleGeste: `lexique:${famille.id}:${niveau}` });
    resultat.push({ origine: `genere:${famille.id}:${niveau}:consigne`, texte: instance.consigne.texte });
    resultat.push({ origine: `genere:${famille.id}:${niveau}:indice`, texte: instance.aide.indice.texte });
    resultat.push({ origine: `genere:${famille.id}:${niveau}:demonstration`, texte: instance.aide.demonstration.texte });
  }
  return resultat;
}

const textes = [...textesGeneres(), ...textesUiAst()];
const ecarts = [];
for (const entree of textes) for (const mot of mots(entree.texte)) {
  const classement = ranger(mot);
  if (classement !== null) ecarts.push({ mot, normalise: normaliser(mot), origine: entree.origine, texte: entree.texte, ...classement });
}
const uniques = [...new Map(ecarts.map((ecart) => [`${ecart.type}:${ecart.normalise}`, ecart])).values()]
  .sort((a, b) => a.type.localeCompare(b.type) || a.normalise.localeCompare(b.normalise));
const formulationsHistorique = FORMULATIONS_A_REVOIR.map(([origine, texte, proposition, raison]) => {
  const textesOrigine = textes.filter((entree) => entree.origine === origine).map((entree) => entree.texte);
  const etat = textesOrigine.includes(texte) ? 'a-corriger' : textesOrigine.length > 0 ? 'corrigee' : 'absente';
  return { origine, texte, proposition, raison, etat };
});
const formulationsARevoir = formulationsHistorique.filter((formulation) => formulation.etat === 'a-corriger');
const rapport = {
  version: 1,
  portee: '54 couples famille-niveau : consigne, indice et démonstration ; textes UI maths extraits par AST TypeScript',
  sources: { generates: 54 * 3, ui: textes.length - 54 * 3, totalTextes: textes.length },
  regle: 'Appartenance au LEXIQUE_CE1 existant. Aucun seuil n’est appliqué et le lexique n’est pas modifié.',
  termesMathsIndispensables: uniques.filter((ecart) => ecart.type === 'terme-maths-indispensable'),
  formulationsARevoir,
  formulationsHistorique,
  horsLexiqueASurveiller: uniques.filter((ecart) => ecart.type === 'hors-lexique-a-relire'),
  occurrences: ecarts,
  limite: 'Le LEXIQUE_CE1 sert au déchiffrage phonologique et ne couvre pas tout le vocabulaire courant de l’interface : une absence du lexique est un signal de relecture, pas un verdict. L’AST relève les chaînes JSX, attributs et expressions statiques ; les textes produits uniquement par des données restent à relire dans leur écran.',
};
const lignesTermes = rapport.termesMathsIndispensables.map((ecart) => `- ${ecart.mot}`).join('\n');
const lignesFormulations = rapport.formulationsARevoir.map((ecart) =>
  `### ${ecart.origine}\n\nTexte actuel : « ${ecart.texte} »\n\nProposition : « ${ecart.proposition} »\n\nMotif : ${ecart.raison}`).join('\n\n');
const lignesHistorique = rapport.formulationsHistorique.filter((ecart) => ecart.etat !== 'a-corriger').map((ecart) =>
  `- ${ecart.origine} : ${ecart.etat === 'corrigee' ? 'corrigée' : 'absente'} — proposition conservée : « ${ecart.proposition} »`).join('\n');
const rapportMarkdown = `# Contrôle lexical maths\n\n` +
  `Portée : ${rapport.sources.generates} textes générés (54 couples famille-niveau, consigne, indice et démonstration) et ${rapport.sources.ui} textes UI statiques.\n\n` +
  `Le contrôle consulte le \`LEXIQUE_CE1\` existant sans le modifier et sans appliquer de seuil.\n\n` +
  `## Formulations à viser\n\n${lignesFormulations || 'Aucune des formulations repérées n’est encore présente.'}\n\n` +
  `## Propositions déjà traitées ou absentes\n\n${lignesHistorique || 'Aucune.'}\n\n` +
  `## Termes maths indispensables\n\n${lignesTermes}\n\n` +
  `## Signaux du lexique\n\n${rapport.horsLexiqueASurveiller.length} mots uniques sont absents du lexique. Le lexique sert au déchiffrage phonologique et ne couvre pas tout le vocabulaire courant : cette liste est un repère de relecture, pas un verdict automatique. Les textes produits uniquement par des données restent à relire dans leur écran.\n`;
mkdirSync(DOSSIER_SORTIE, { recursive: true });
writeFileSync(SORTIE_JSON, `${JSON.stringify(rapport, null, 2)}\n`, 'utf8');
writeFileSync(SORTIE_MD, rapportMarkdown, 'utf8');
console.log(`Lexique maths : ${textes.length} textes, ${rapport.termesMathsIndispensables.length} termes indispensables, ${rapport.formulationsARevoir.length} formulations proposées, ${rapport.horsLexiqueASurveiller.length} mots hors lexique à relire.`);
console.log(relative(RACINE, SORTIE_MD).replaceAll('\\', '/'));
