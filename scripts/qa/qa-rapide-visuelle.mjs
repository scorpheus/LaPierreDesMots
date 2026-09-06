/**
 * QA rapide des promesses visuelles qui peuvent casser sans faire rougir les moteurs.
 *
 * Usage :
 *   node scripts/qa/qa-rapide-visuelle.mjs
 *   node scripts/qa/qa-rapide-visuelle.mjs --sans-http
 *   node scripts/qa/qa-rapide-visuelle.mjs --avec-audio
 *   PIERRE_QA_URL=http://localhost:8080 node scripts/qa/qa-rapide-visuelle.mjs
 *
 * Ce n'est pas un remplacement de `npm run verifier` : c'est une boucle de moins de trente
 * secondes pour l'itération. Elle cible aussi le catalogue exhaustif (76 exercices) sans
 * prétendre juger l'esthétique :
 *   - une image déclarée qui répond en 404 (Gobi, compagnon, décor, objet) ;
 *   - un raster validé mais jamais rendu, parce que la branche SVG de repli gagne toujours ;
 *   - une cible de placement éloignée de l'objet auquel sa relation fait référence ;
 *   - l'aide de Gobi qui répète l'invitation au lieu de dire la consigne courante.
 *   - les 75 nœuds pédagogiques, l'activité libre, les références gameplay et les assets visuels.
 *
 * L'audio est volontairement hors de la boucle rapide. `--avec-audio` réactive son contrôle
 * ponctuel sans ralentir ni bloquer les itérations visuelles.
 *
 * Le contrôle négatif HTTP est volontaire : une route d'asset inconnue DOIT rester en 404.
 * Sans lui, un serveur qui renvoie index.html en 200 ferait passer les images cassées pour
 * chargées. Les chemins sont lus depuis les fichiers du dépôt, jamais inventés par le serveur.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const chemin = (relatif) => join(RACINE, relatif.replaceAll('/', '\\'));

const exercice = JSON.parse(readFileSync(chemin('contenu/exercices/clairiere/ecole-02-place.json'), 'utf8'));
const monde = JSON.parse(readFileSync(chemin('contenu/monde/compagnons.json'), 'utf8'));
const svgScene = readFileSync(chemin('contenu/habillages/clairiere/ecole-place.svg'), 'utf8');
const sourceCompagnon = readFileSync(chemin('client/src/composants/Compagnon.tsx'), 'utf8');
const sourceSpriteCompagnon = readFileSync(chemin('client/src/composants/SpriteCompagnon.tsx'), 'utf8');
const sourceGobi = readFileSync(chemin('client/src/composants/Gobi.tsx'), 'utf8');
const sourceReserve = readFileSync(chemin('client/src/moteurs/place/Reserve.tsx'), 'utf8');
const sourceAide = readFileSync(chemin('client/src/composants/aide-de-gobi.ts'), 'utf8');
const sourceNoeud = readFileSync(chemin('client/src/ecrans/EcranNoeud.tsx'), 'utf8');
const sourceRaster = readFileSync(chemin('client/src/moteurs/libre/SceneRasterIndexee.tsx'), 'utf8');
const sourceCarte = readFileSync(chemin('client/src/ecrans/EcranCarte.tsx'), 'utf8');
const sourcePlace = readFileSync(chemin('client/src/moteurs/place/MoteurPlace.tsx'), 'utf8');
const sourceTri = readFileSync(chemin('partage/src/moteurs/tri/moteur.ts'), 'utf8');
const sourceRetour = readFileSync(chemin('client/src/gamefeel/retour.ts'), 'utf8');
const sourceRouteur = readFileSync(chemin('client/src/routeur.tsx'), 'utf8');
const sourceChaudron = readFileSync(chemin('client/src/ecrans/EcranChaudron.tsx'), 'utf8');
const sourceRecompense = readFileSync(chemin('client/src/ecrans/EcranRecompense.tsx'), 'utf8');

function listerJson(dossier) {
  const dossierAbsolu = chemin(dossier);
  return readdirSync(dossierAbsolu, { withFileTypes: true }).flatMap((entree) => {
    const relatif = `${dossier}/${entree.name}`;
    return entree.isDirectory() ? listerJson(relatif) : entree.name.endsWith('.json') ? [relatif] : [];
  });
}

const exercices = listerJson('contenu/exercices').map((fichier) => JSON.parse(readFileSync(chemin(fichier), 'utf8')));
const noeuds = listerJson('contenu/noeuds').map((fichier) => JSON.parse(readFileSync(chemin(fichier), 'utf8')));
const avecAudio = process.argv.includes('--avec-audio');
const manifestAudio = avecAudio
  ? JSON.parse(readFileSync(chemin('contenu/audio/manifeste.json'), 'utf8'))
  : null;
const habillages = new Map(
  listerJson('contenu/habillages')
    .filter((fichier) => fichier.endsWith('.habillage.json'))
    .map((fichier) => {
      const contenu = JSON.parse(readFileSync(chemin(fichier), 'utf8'));
      return [contenu.id, contenu];
    }),
);
const codeRetour = sourceRetour
  .replace(/\/\*[\s\S]*?\*\//gu, ' ')
  .replace(/^\s*\/\/.*$/gmu, ' ');

// Les commentaires décrivent parfois précisément l'ancien défaut (c'est utile pour l'humain,
// mais pas une preuve). Les assertions sur le code exécutable retirent donc commentaires et
// chaînes de commentaire avant de chercher une ancienne branche.
const codeGobi = sourceGobi
  .replace(/\/\*[\s\S]*?\*\//gu, ' ')
  .replace(/^\s*\/\/.*$/gmu, ' ');

const checks = [];
const debut = performance.now();

function verifier(titre, assertion, detail) {
  try {
    if (!assertion()) throw new Error(detail);
    checks.push({ titre, ok: true });
  } catch (erreur) {
    checks.push({ titre, ok: false, detail: erreur instanceof Error ? erreur.message : String(erreur) });
  }
}

function exiger(condition, message) {
  if (!condition) throw new Error(message);
}

function idsUniques(valeurs, nom) {
  const ids = valeurs.map((valeur) => valeur?.id).filter((id) => typeof id === 'string');
  return {
    ids: new Set(ids),
    doublons: ids.filter((id, index) => ids.indexOf(id) !== index).map((id) => `${nom}:${id}`),
  };
}

function erreursCatalogue(noeudsAControler, exercicesAControler) {
  const erreurs = [];
  const noeudIds = idsUniques(noeudsAControler, 'nœud');
  const exerciceIds = idsUniques(exercicesAControler, 'exercice');
  if (noeudsAControler.length !== 76) erreurs.push(`fiches de nœud : ${noeudsAControler.length}/76`);
  if (exercicesAControler.length !== 76) erreurs.push(`fiches d'exercice : ${exercicesAControler.length}/76`);
  const pedagogiques = noeudsAControler.filter((noeud) => noeud.progression !== false);
  const activitesLibres = noeudsAControler.filter((noeud) => noeud.progression === false);
  if (pedagogiques.length !== 75) erreurs.push(`nœuds pédagogiques : ${pedagogiques.length}/75`);
  if (activitesLibres.length !== 1) erreurs.push(`activités libres : ${activitesLibres.length}/1`);
  erreurs.push(...noeudIds.doublons, ...exerciceIds.doublons);
  const exercicesParId = new Map(exercicesAControler.map((exerciceAControler) => [exerciceAControler.id, exerciceAControler]));
  const noeudsParExercice = new Map();
  for (const noeud of noeudsAControler) {
    const exerciceId = noeud.exercice;
    if (!exerciceIds.ids.has(exerciceId)) erreurs.push(`${noeud.id ?? 'nœud sans id'} pointe vers ${String(exerciceId)} absent`);
    if (noeudsParExercice.has(exerciceId)) erreurs.push(`exercice ${String(exerciceId)} a deux nœuds`);
    noeudsParExercice.set(exerciceId, noeud);
    const exerciceAControler = exercicesParId.get(exerciceId);
    if (exerciceAControler?.jeu?.noeud !== noeud.id) {
      erreurs.push(`${String(exerciceId)} : retour jeu.noeud incohérent (${String(exerciceAControler?.jeu?.noeud)})`);
    }
  }
  for (const exerciceAControler of exercicesAControler) {
    if (!noeudIds.ids.has(exerciceAControler.jeu?.noeud)) erreurs.push(`${exerciceAControler.id} sans nœud ${String(exerciceAControler.jeu?.noeud)}`);
  }
  return erreurs;
}

function idsDesEntrees(valeurs) {
  return new Set((Array.isArray(valeurs) ? valeurs : []).map((valeur) => (typeof valeur === 'string' ? valeur : valeur?.id)).filter(Boolean));
}

function erreursGameplay(exerciceAControler) {
  const moteur = exerciceAControler.jeu?.moteur;
  const contenu = exerciceAControler.jeu?.contenu ?? {};
  const erreurs = [];
  const consignes = Array.isArray(contenu.consignes) ? contenu.consignes : [];
  const habillage = habillages.get(exerciceAControler.jeu?.habillage);
  const regionsHabillage = new Set(
    (habillage?.scene?.calques ?? []).flatMap((calque) => (calque.regions ?? []).map((region) => region.id)),
  );
  const verifierRefs = (valeurs, ids, libelle) => {
    for (const valeur of valeurs) if (!ids.has(valeur)) erreurs.push(`${exerciceAControler.id}/${moteur}: ${libelle} ${String(valeur)} absent`);
  };
  if (!habillage) erreurs.push(`${exerciceAControler.id}: habillage ${String(exerciceAControler.jeu?.habillage)} absent`);
  verifierRefs(contenu.regions ?? [], regionsHabillage, 'région');
  for (const consigne of consignes) {
    if (moteur === 'colorie') verifierRefs((consigne.cibles ?? []).map((cible) => cible.region), regionsHabillage, 'région');
    if (moteur === 'place') {
      verifierRefs((consigne.depots ?? []).map((depot) => depot.element), idsDesEntrees(contenu.reserve), 'élément');
      verifierRefs((consigne.depots ?? []).map((depot) => depot.zone), idsDesEntrees(contenu.zones), 'zone');
    }
    if (moteur === 'eclair') {
      verifierRefs(consigne.options ?? [], idsDesEntrees(contenu.options), 'option');
      verifierRefs([consigne.reponse].filter(Boolean), idsDesEntrees(contenu.options), 'réponse');
    }
    if (moteur === 'attrape') verifierRefs(consigne.aAttraper ?? [], idsDesEntrees(contenu.cibles), 'cible');
    if (moteur === 'tri') {
      verifierRefs(consigne.aRanger ?? [], idsDesEntrees(contenu.elements), 'élément');
      verifierRefs((contenu.elements ?? []).map((element) => element.receptacleAttendu).filter(Boolean), idsDesEntrees(contenu.receptacles), 'réceptacle');
    }
    if (moteur === 'assemble') verifierRefs(consigne.solution ?? [], idsDesEntrees(contenu.blocs), 'bloc');
    if (moteur === 'phrase') verifierRefs(consigne.ordre ?? [], idsDesEntrees(contenu.etiquettes), 'étiquette');
    if (moteur === 'chrono') verifierRefs(consigne.ordre ?? [], idsDesEntrees(contenu.vignettes), 'vignette');
    if (moteur === 'chemin') {
      verifierRefs([consigne.depart, ...(consigne.parcours ?? [])].filter(Boolean), idsDesEntrees(contenu.cases), 'case');
      verifierRefs((contenu.cases ?? []).flatMap((caseJeu) => caseJeu.voisines ?? []), idsDesEntrees(contenu.cases), 'case voisine');
    }
    if (moteur === 'paires') {
      const paires = new Set((contenu.cartes ?? []).map((carte) => carte.paire).filter(Boolean));
      verifierRefs(consigne.aApparier ?? [], paires, 'paire');
    }
  }
  for (const question of contenu.questions ?? []) {
    verifierRefs(question.options ?? [], idsDesEntrees(contenu.options), 'option');
    verifierRefs([question.reponse].filter(Boolean), idsDesEntrees(contenu.options), 'réponse');
  }
  return erreurs;
}

function cheminAsset(relatif) {
  if (/^(?:https?:)?\/\//u.test(relatif)) return null;
  if (/^(?:assets|habillages|audio|monde|brouillons)\//u.test(relatif)) return chemin(`contenu/${relatif}`);
  return null;
}

function assetsDeclares(dossiers) {
  const references = [];
  const extensions = /\.(?:svg|png|webp|jpe?g|opus)$/iu;
  const parcourir = (valeur, provenance, cle = '') => {
    if (Array.isArray(valeur)) {
      valeur.forEach((element, index) => parcourir(element, `${provenance}[${String(index)}]`));
    } else if (valeur && typeof valeur === 'object') {
      Object.entries(valeur).forEach(([nom, element]) => parcourir(element, `${provenance}.${nom}`, nom));
    } else if (typeof valeur === 'string' && extensions.test(valeur) && cle !== 'empreinte') {
      const fichier = cheminAsset(valeur);
      if (fichier) references.push({ valeur, provenance, fichier });
    }
  };
  for (const dossier of dossiers) {
    for (const fichier of listerJson(dossier)) parcourir(JSON.parse(readFileSync(chemin(fichier), 'utf8')), fichier);
  }
  return references;
}

function jsonCheminAsset(relatif) {
  const fichier = chemin(`contenu/${relatif}`);
  exiger(existsSync(fichier), `asset absent du dépôt : contenu/${relatif}`);
  exiger(statSync(fichier).size > 0, `asset vide : contenu/${relatif}`);
}

function nombresDuChemin(d) {
  return [...String(d).matchAll(/-?\d+(?:\.\d+)?/gu)].map((m) => Number(m[0]));
}

function boiteDuChemin(id) {
  const trouve = new RegExp(`<path\\s+id="${id}"[^>]*\\sd="([^"]+)"`, 'u').exec(svgScene);
  exiger(trouve !== null, `la scène ne déclare pas le chemin visuel « ${id} »`);
  const nombres = nombresDuChemin(trouve[1]);
  exiger(nombres.length >= 4, `le chemin visuel « ${id} » n'a pas de géométrie`);
  const xs = nombres.filter((_, index) => index % 2 === 0);
  const ys = nombres.filter((_, index) => index % 2 === 1);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys),
    centreX: (Math.min(...xs) + Math.max(...xs)) / 2,
    centreY: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function boiteZone(zone) {
  const xs = zone.polygone.map(([x]) => x);
  const ys = zone.polygone.map(([, y]) => y);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys),
    centreX: zone.centroide[0], centreY: zone.centroide[1],
  };
}

function polygoneDuChemin(id) {
  const trouve = new RegExp(`<path\\s+id="${id}"[^>]*\\sd="([^"]+)"`, 'u').exec(svgScene);
  exiger(trouve !== null, `la scène ne déclare pas le chemin visuel « ${id} »`);
  const nombres = nombresDuChemin(trouve[1]);
  exiger(nombres.length >= 6, `le chemin visuel « ${id} » n'a pas assez de points`);
  return Array.from({ length: Math.floor(nombres.length / 2) }, (_, index) => [
    nombres[index * 2], nombres[index * 2 + 1],
  ]);
}

function distanceBoites(a, b) {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
  return Math.hypot(dx, dy);
}

// ── contrôles statiques : rapides et indépendants d'un navigateur ───────────
verifier(
  'catalogue : 75 exercices pédagogiques + 1 activité libre, sans doublon ni orphelin',
  () => {
    const erreurs = erreursCatalogue(noeuds, exercices);
    exiger(erreurs.length === 0, erreurs.slice(0, 8).join(' ; '));
    return true;
  },
  'le graphe de progression doit référencer chaque exercice une seule fois',
);

verifier(
  'contrôle négatif : un jeu factice invalide devient bien rouge',
  () => {
    const erreurs = erreursCatalogue([{ id: 'nœud-factice', exercice: 'exercice-introuvable' }], []);
    exiger(erreurs.length > 0, 'le validateur a accepté un nœud orphelin : contrôle négatif creux');
    return true;
  },
  'le contrôle négatif doit démontrer que l’audit détecte un orphelin',
);

if (avecAudio) verifier(
  'audio optionnel : chaque consigne visible possède le texte exact du manifeste',
  () => {
    const clips = new Map(manifestAudio.clips.map((clip) => [clip.cle, clip]));
    const erreurs = [];
    for (const exerciceAControler of exercices) {
      const contenu = exerciceAControler.jeu?.contenu ?? {};
      const visibles = [
        ...(contenu.consignes ?? []).map((consigne) => [consigne.id, consigne.texte]),
        ...(contenu.questions ?? []).map((question) => [question.id, question.texte]),
      ];
      if (contenu.consigneId && typeof contenu.consigne === 'string') visibles.push([contenu.consigneId, contenu.consigne]);
      for (const [id, texte] of visibles) {
        const cle = `${exerciceAControler.id}/${id}`;
        const clip = clips.get(cle);
        if (!clip) erreurs.push(`${cle}: clip absent`);
        else if (clip.texte !== texte) erreurs.push(`${cle}: texte visible différent du manifeste`);
      }
    }
    exiger(erreurs.length === 0, erreurs.slice(0, 8).join(' ; '));
    return true;
  },
  'une consigne audible et sa phrase visible doivent rester synchronisées',
);

verifier(
  'gameplay : éléments, zones, réponses et chemins ne sont pas orphelins',
  () => {
    const erreurs = exercices.flatMap((exerciceAControler) => erreursGameplay(exerciceAControler));
    exiger(erreurs.length === 0, erreurs.slice(0, 8).join(' ; '));
    return true;
  },
  'les références déclaratives doivent résoudre vers les collections du même exercice',
);

verifier(
  'assets : aucune image ou scène déclarée absente ou vide',
  () => {
    const dossiers = ['contenu/exercices', 'contenu/habillages', 'contenu/monde'];
    if (avecAudio) dossiers.push('contenu/audio');
    const references = assetsDeclares(dossiers);
    const erreurs = references.filter(({ fichier }) => !existsSync(fichier) || statSync(fichier).size === 0);
    exiger(erreurs.length === 0, erreurs.slice(0, 8).map(({ valeur, provenance }) => `${valeur} (${provenance})`).join(' ; '));
    exiger(references.length >= 100, `seulement ${references.length} assets déclarés contrôlés : audit creux`);
    return true;
  },
  'un chemin d’asset non résolu ne doit pas arriver jusqu’au navigateur',
);

verifier(
  'décisions transversales : mélange, particules, chaudron libre et récompense raster',
  () => {
    exiger(/services\.alea\.melanger\s*\(contenu\.reserve\)/u.test(sourcePlace), 'place ne mélange pas la réserve via l’Alea injecté');
    exiger(/alea\.melanger\s*\(/u.test(sourceTri), 'tri ne mélange pas les éléments via Alea');
    exiger(!codeRetour.includes('options.emettreParticules'), 'particules génériques encore émises sur une réussite');
    const chaudron = JSON.parse(readFileSync(chemin('contenu/habillages/campement/chaudron.habillage.json'), 'utf8'));
    exiger(chaudron.moteurs?.includes('libre'), 'habillage chaudron sans moteur libre');
    exiger(sourceRouteur.includes('EcranChaudron'), 'routeur sans écran chaudron');
    exiger(sourceChaudron.includes('data-activite="libre"'), 'écran chaudron sans activité libre');
    exiger(sourceRecompense.includes("assets/gobi/animation/joie.webp"), 'récompense Gobi sans asset WebP');
    jsonCheminAsset('assets/gobi/animation/joie.webp');
    jsonCheminAsset('assets/gobi/stades/stade-1.webp');
    return true;
  },
  'les décisions validées doivent rester visibles dans le code de production',
);

verifier(
  'placement : chaque consigne possède une cible déclarée dans le SVG',
  () => {
    const contenu = exercice.jeu.contenu;
    const depots = contenu.consignes.flatMap((consigne) => consigne.depots);
    exiger(depots.length === contenu.consignes.length, `${depots.length} dépôts pour ${contenu.consignes.length} consignes`);
    const idsSvg = new Set([...svgScene.matchAll(/<path\s+id="([^"]+)"/gu)].map((m) => m[1]));
    for (const zone of contenu.zones) exiger(idsSvg.has(zone.id), `zone ${zone.id} absente du décor réel`);
    for (const depot of depots) exiger(contenu.zones.some((zone) => zone.id === depot.zone), `cible ${depot.zone} introuvable`);
    return true;
  },
  'la scène et les données n’ont pas la même population de cibles',
);

verifier(
  'placement : les polygones testés sont ceux qui sont dessinés',
  () => {
    const zones = exercice.jeu.contenu.zones;
    exiger(zones.length > 0, 'aucune zone à comparer : contrôle creux');
    for (const zone of zones) {
      const declare = zone.polygone.map(([x, y]) => [Number(x), Number(y)]);
      const dessine = polygoneDuChemin(zone.id);
      exiger(
        JSON.stringify(declare) === JSON.stringify(dessine),
        `géométrie divergente pour ${zone.id} : données ${JSON.stringify(declare)} / SVG ${JSON.stringify(dessine)}`,
      );
    }
    return true;
  },
  'une cible visible et la géométrie utilisée par le moteur ne doivent jamais être deux formes différentes',
);

verifier(
  'placement : les intrus sont explicitement nommés',
  () => {
    const contenu = exercice.jeu.contenu;
    const utilises = new Set(contenu.consignes.flatMap((consigne) => consigne.depots.map((depot) => depot.element)));
    const extras = contenu.reserve.filter((element) => !utilises.has(element.id));
    exiger(extras.length > 0, 'le contrôle négatif est creux : aucune carte intruse à vérifier');
    exiger(exercice.titre.includes(String(utilises.size)), 'le titre n’annonce pas le nombre de dessins à placer');
    exiger(sourceReserve.includes('intrus à laisser'), 'la réserve ne nomme pas les cartes supplémentaires comme intrus à laisser');
    exiger(sourceReserve.includes("data-element-role={roleAttendu}"), 'le DOM ne distingue pas les dessins attendus des intrus');
    return true;
  },
  'une réserve plus longue que la liste des consignes doit expliquer chaque carte supplémentaire',
);

verifier(
  'placement : la cible « à côté du banc » reste près de son ancre visuelle',
  () => {
    const zone = exercice.jeu.contenu.zones.find((candidate) => candidate.id === 'a-cote-du-banc');
    exiger(zone !== undefined, 'zone a-cote-du-banc absente');
    const distance = distanceBoites(boiteZone(zone), boiteDuChemin('banc-assise'));
    // Une relation « à côté de » ne peut pas envoyer la cible dans une autre scène : la marge
    // admise est une prise tactile (80 unités), pas une distance arbitraire de plusieurs objets.
    exiger(distance <= 80, `distance cible/ancre = ${distance.toFixed(1)} unités (maximum 80)`);
    return true;
  },
  'la géométrie déclarée doit rester cohérente avec l’objet visible auquel elle se réfère',
);

verifier(
  'Gobi : l’aide dispose d’une stratégie distincte de l’invitation',
  () => {
    exiger(sourceAide.includes('STRATEGIE_PAR_CODE'), 'aucune stratégie de texte dans le résolveur');
    exiger(sourceAide.includes("source: 'strategie'"), 'la source stratégie n’est pas publiée');
    exiger(!sourceAide.includes('source: \'consigne\''), 'l’aide réutilise la consigne comme texte');
    exiger(sourceNoeud.includes('aideResolue={aideDeGobi}'), 'EcranNoeud ne transmet pas l’aide résolue à Gobi');
    exiger(sourceGobi.includes("data-gobi-dit={aide === null ? 'invite' : 'aide'}"), 'le DOM ne distingue pas invitation et aide');
    return true;
  },
  'un tap sur « aide-moi » ne doit pas reproduire le texte d’invitation',
);

verifier(
  'Gobi et compagnons : les composants branchent les rasters validés',
  () => {
    // Le portrait canonique est maintenant délégué à SpriteCompagnon : suivre les deux
    // maillons, sans exiger que l'URL soit construite dans l'ancien composant hôte.
    exiger(sourceCompagnon.includes('<SpriteCompagnon') && sourceCompagnon.includes('assetStatique={String(compagnon.asset)}'), 'portrait déclaré non transmis au composant de rendu');
    exiger(sourceSpriteCompagnon.includes('src={urlAsset(assetStatique)}'), 'portrait compagnon non résolu via urlAsset');
    exiger(sourceSpriteCompagnon.includes('data-portrait-compagnon'), 'portrait compagnon sans marqueur DOM');
    exiger(codeGobi.includes('data-dessin-gobi-raster'), 'Gobi ne monte pas le raster validé');
    exiger(codeGobi.includes('assets/gobi/animation/${animation}.webp'), 'les poses raster de Gobi ne sont pas reliées à son animation');
    exiger(!codeGobi.includes('fill="var(--framboise)"'), 'ancien Gobi circulaire encore présent');
    for (const compagnon of monde.compagnons) jsonCheminAsset(compagnon.asset);
    return true;
  },
  'un composant peut être vert tout en affichant une image cassée si son URL n’est jamais vérifiée',
);

verifier(
  'raster : une scène validée rend les trois couches avant le repli SVG',
  () => {
    exiger(sourceRaster.includes('data-raster-couche="fond"'), 'couche raster fond absente du DOM');
    exiger(sourceRaster.includes('data-raster-couche="trait"'), 'couche raster trait absente du DOM');
    exiger(sourceRaster.includes('data-raster-couche="couleurs"'), 'couche raster couleurs absente du DOM');
    exiger(sourceRaster.includes('if (rasterIndisponible) return repli;'), 'aucun repli explicite et conditionnel');
    const raster = JSON.parse(readFileSync(chemin('contenu/habillages/campement/chaudron.habillage.json'), 'utf8')).scene.rasterIndexe;
    exiger(raster !== undefined, 'le chaudron ne déclare plus rasterIndexe');
    for (const nom of ['fond', 'trait', 'masque']) jsonCheminAsset(raster[nom]);
    return true;
  },
  'un PNG validé doit être consommé par le chemin raster ; le SVG n’est qu’un repli',
);

verifier(
  'carte : l’asset de scène est réellement résolu',
  () => {
    exiger(sourceCarte.includes('urlAsset(SVG_CARTE)'), 'EcranCarte ne passe plus par urlAsset');
    exiger(existsSync(chemin('contenu/habillages/carte/carte-monde-v3.svg')), 'carte-monde-v3.svg absent du dépôt');
    return true;
  },
  'la carte ne doit pas afficher seulement son décor SVG de repli',
);

// ── contrôle HTTP : les chemins réellement demandés au navigateur ──────────
async function verifierHttp() {
  const base = (process.env['PIERRE_QA_URL'] ?? 'http://localhost:8080').replace(/\/$/u, '');
  const actifs = [
    ...monde.compagnons.map((compagnon) => [`${compagnon.asset}`, 'image/png']),
    ['assets/gobi/animation/aide.webp', 'image/webp'],
    ['assets/gobi/stades/stade-1.webp', 'image/webp'],
    ['assets/objets/oiseau.svg', 'image/svg+xml'],
    ['assets/decors/ecole.png', 'image/png'],
    ['habillages/carte/carte-monde-v3.svg', 'image/svg+xml'],
    ['habillages/campement/chaudron-fond.png', 'image/png'],
    ['habillages/campement/chaudron-trait.png', 'image/png'],
    ['habillages/campement/chaudron-masque.png', 'image/png'],
  ];
  for (const [actif, mime] of actifs) {
    const reponse = await fetch(`${base}/api/contenu/assets/${actif}`, { signal: AbortSignal.timeout(2500) });
    exiger(reponse.status === 200, `${actif} répond ${reponse.status}, attendu 200`);
    exiger((reponse.headers.get('content-type') ?? '').toLowerCase().startsWith(mime), `${actif} répond avec un MIME inattendu`);
    exiger((await reponse.arrayBuffer()).byteLength > 0, `${actif} répond sans octet`);
  }
  // Contrôle négatif : le serveur ne doit jamais transformer une image inconnue en index HTML.
  const absent = await fetch(`${base}/api/contenu/assets/assets/compagnons/introuvable-qa.png`, { signal: AbortSignal.timeout(2500) });
  exiger(absent.status === 404, `asset volontairement absent répond ${absent.status}, le contrôle négatif est rouge`);
}

if (!process.argv.includes('--sans-http')) {
  try {
    await verifierHttp();
    checks.push({ titre: 'HTTP : assets visuels + contrôle négatif 404', ok: true });
  } catch (erreur) {
    checks.push({ titre: 'HTTP : assets visuels + contrôle négatif 404', ok: false, detail: erreur instanceof Error ? erreur.message : String(erreur) });
  }
} else {
  checks.push({ titre: 'HTTP : assets visuels + contrôle négatif 404', ok: true, ignore: true });
}

const dureeMs = performance.now() - debut;
const echecs = checks.filter((check) => !check.ok);
const ignores = checks.filter((check) => check.ignore);
for (const check of checks) {
  const symbole = check.ignore ? '·' : check.ok ? '✓' : '✗';
  process.stdout.write(`${symbole} ${check.titre}${check.detail === undefined ? '' : ` — ${check.detail}`}\n`);
}
process.stdout.write(`QA rapide visuelle : ${String(checks.length - echecs.length - ignores.length)}/${String(checks.length - ignores.length)} contrôles verts · ${dureeMs.toFixed(0)} ms\n`);
if (ignores.length > 0) process.stdout.write('HTTP non exécuté (--sans-http) : la route réelle doit être vérifiée par une course avec serveur.\n');
if (echecs.length > 0) process.exitCode = 1;
