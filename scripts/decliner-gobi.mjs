#!/usr/bin/env node
/**
 * Décliner Gobi — lot N3, contrat de finition v3 § 4.3.
 *
 * « **Repart de la canonique à CHAQUE déclinaison** (D32). »
 *
 * CE QUE CE SCRIPT GARANTIT, ET QU'AUCUNE BONNE VOLONTÉ NE GARANTIT :
 *
 *   La règle « profondeur de chaîne = 1 » est habituellement tenue par la discipline de
 *   l'appelant. Ici elle est MÉCANIQUE : avant chaque soumission, le script relit les pixels
 *   du fichier source, en recalcule l'empreinte, et la compare à celle que `gobi.lock.json`
 *   déclare pour la canonique. **Si elles diffèrent, il sort en code 1 sans rien écrire.**
 *   Une déclinaison enchaînée est donc impossible à produire, pas seulement interdite —
 *   c'est la convention C6 appliquée à l'image (« un générateur refuse d'écrire plutôt que
 *   d'émettre du faux, et il le prouve en remesurant sa propre sortie »).
 *
 *   Motif, mesuré ailleurs et repris ici (D32) : Black Forest Labs documente une dégradation
 *   visible après six éditions en cascade. Sur 25 déclinaisons de graphème et 5 états
 *   d'animation, une chaîne dérive silencieusement — personne ne voit le jour où ça a glissé.
 *
 * L'EMPREINTE EST CELLE DES PIXELS, JAMAIS CELLE DU FICHIER (skill `generer-asset`, piège 4) :
 * ComfyUI écrit le graphe dans un bloc de texte du PNG, donc trois images identiques au pixel
 * près ont trois `sha256` de fichier différents. Le décodeur PNG ci-dessous est écrit sur
 * `node:zlib` seul — aucune dépendance, D9 tenue — et rend exactement les octets RGB que
 * `PIL.Image.open(f).convert('RGB').tobytes()` rendrait, de sorte que les deux chaînes se
 * contrôlent l'une l'autre.
 *
 * Usage :
 *   node scripts/decliner-gobi.mjs --tout          rend les 15 déclinaisons de la table
 *   node scripts/decliner-gobi.mjs repos joie      rend les déclinaisons nommées
 *   node scripts/decliner-gobi.mjs --verifier      ne soumet rien : contrôle le verrou seul
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOTE = process.env['COMFYUI_HOTE'] ?? '127.0.0.1:8188';

const CHEMIN_CANONIQUE = 'production/personnages/gobi/canonique.png';
const CHEMIN_VERROU = 'production/personnages/gobi/gobi.lock.json';
const CHEMIN_WORKFLOW = 'production/workflows/gobi-declinaison.api.json';

// --------------------------------------------------------------------- empreinte des pixels

/**
 * Les octets RGB d'un PNG 8 bits non entrelacé, dé-filtrés.
 *
 * Écrit ici plutôt qu'importé : c'est la SEULE formule d'empreinte du lot, et le test
 * `gobi-assets.test.ts` importe celle-ci. Deux implantations de la même formule finiraient
 * par diverger sur un cas limite, et l'écart ne se verrait que le jour où il coûte cher.
 */
export function pixelsRvbPng(octets) {
  if (octets.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Ce fichier ne commence pas par la signature PNG.');
  }

  let position = 8;
  let largeur = 0;
  let hauteur = 0;
  let profondeur = 0;
  let typeCouleur = 0;
  const morceaux = [];

  while (position < octets.length) {
    const taille = octets.readUInt32BE(position);
    const type = octets.toString('ascii', position + 4, position + 8);
    const donnees = octets.subarray(position + 8, position + 8 + taille);
    if (type === 'IHDR') {
      largeur = donnees.readUInt32BE(0);
      hauteur = donnees.readUInt32BE(4);
      profondeur = donnees.readUInt8(8);
      typeCouleur = donnees.readUInt8(9);
      if (donnees.readUInt8(12) !== 0) {
        throw new Error('PNG entrelacé : hors du périmètre de ce décodeur.');
      }
    } else if (type === 'IDAT') {
      morceaux.push(donnees);
    } else if (type === 'IEND') {
      break;
    }
    position += 12 + taille;
  }

  if (profondeur !== 8 || (typeCouleur !== 2 && typeCouleur !== 6)) {
    throw new Error(
      `PNG en profondeur ${String(profondeur)} / type ${String(typeCouleur)} : ` +
        'ce décodeur ne traite que le 8 bits RVB ou RVBA non entrelacé.'
    );
  }

  const parPixel = typeCouleur === 2 ? 3 : 4;
  const brut = inflateSync(Buffer.concat(morceaux));
  const parLigne = largeur * parPixel;
  const plat = Buffer.alloc(hauteur * parLigne);

  for (let ligne = 0; ligne < hauteur; ligne += 1) {
    const filtre = brut[ligne * (parLigne + 1)];
    const source = ligne * (parLigne + 1) + 1;
    const cible = ligne * parLigne;
    const precedente = cible - parLigne;

    for (let index = 0; index < parLigne; index += 1) {
      const x = brut[source + index];
      const a = index >= parPixel ? plat[cible + index - parPixel] : 0;
      const b = ligne > 0 ? plat[precedente + index] : 0;
      const c = ligne > 0 && index >= parPixel ? plat[precedente + index - parPixel] : 0;
      let valeur;
      switch (filtre) {
        case 0: valeur = x; break;
        case 1: valeur = x + a; break;
        case 2: valeur = x + b; break;
        case 3: valeur = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          valeur = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`Filtre PNG inconnu : ${String(filtre)}`);
      }
      plat[cible + index] = valeur & 0xff;
    }
  }

  if (parPixel === 3) {
    return { largeur, hauteur, rvb: plat };
  }
  // On laisse tomber l'alpha pour rendre EXACTEMENT ce que rendrait `.convert('RGB')`.
  const rvb = Buffer.alloc(largeur * hauteur * 3);
  for (let index = 0, sortie = 0; index < plat.length; index += 4, sortie += 3) {
    rvb[sortie] = plat[index];
    rvb[sortie + 1] = plat[index + 1];
    rvb[sortie + 2] = plat[index + 2];
  }
  return { largeur, hauteur, rvb };
}

/** `sha256:<hex>` des pixels RVB. C'est cette chaîne que `gobi.lock.json` porte. */
export function empreintePixels(cheminAbsolu) {
  const { largeur, hauteur, rvb } = pixelsRvbPng(readFileSync(cheminAbsolu));
  return {
    empreinte: `sha256:${createHash('sha256').update(rvb).digest('hex')}`,
    largeur,
    hauteur
  };
}

// ------------------------------------------------------------------------ la table des cibles

/**
 * Les déclinaisons produites depuis la canonique.
 *
 * INSTRUCTIONS FORMULÉES EN « CE QU'ON VEUT VOIR », jamais « ce qu'on veut être » — piège 6 du
 * skill `generer-asset` : le mot « determined » a suffi à produire un visage fâché, et D27
 * tranche que *caractère n'est pas dureté*. Aucune instruction ci-dessous ne nomme une
 * intention ; toutes décrivent un geste, une paupière, une bouche.
 */
export const DECLINAISONS = [
  // Les 5 états d'animation — addendum § A.2, fiche § 4.
  { code: 'repos', dossier: 'animation', graine: 4004,
    instruction: 'lower both arms softly against the sides of the body and close the mouth into a small calm smile' },
  { code: 'joie', dossier: 'animation', graine: 4005,
    instruction: 'raise both arms high above the head, open the mouth into a wide smile and lift both eyebrows' },
  { code: 'aide', dossier: 'animation', graine: 4006,
    instruction: 'extend the left arm forward with the paw open toward the viewer, keep the other arm against the body' },
  { code: 'hesitation', dossier: 'animation', graine: 4007,
    instruction: 'tilt the head slightly to one side, bring one paw up near the cheek and make the mouth a small round o' },
  { code: 'apparition', dossier: 'animation', graine: 4008,
    instruction: 'make the whole creature smaller and centred, surrounded by a ring of small pale sparkles' },

  // Les 10 stades — D43. Seule la CRÊTE change ; le corps est tenu par la clause figée.
  { code: 'stade-1', dossier: 'stades', graine: 4101,
    instruction: 'replace the crystal crown by a single small pale crystal bud on top of the head' },
  { code: 'stade-2', dossier: 'stades', graine: 4102,
    instruction: 'replace the crystal crown by one small pale crystal bud with a thin bright line of light along it' },
  { code: 'stade-3', dossier: 'stades', graine: 4103,
    instruction: 'replace the crystal crown by one single tall pale blue crystal on top of the head' },
  { code: 'stade-4', dossier: 'stades', graine: 4104,
    instruction: 'replace the crystal crown by two crystals on top of the head, one tall and one short' },
  { code: 'stade-5', dossier: 'stades', graine: 4105,
    instruction: 'replace the crystal crown by three crystals of uneven height on top of the head' },
  { code: 'stade-6', dossier: 'stades', graine: 4106,
    instruction: 'replace the crystal crown by five crystals of uneven height spread across the top of the head' },
  { code: 'stade-7', dossier: 'stades', graine: 4107,
    instruction: 'replace the crystal crown by six crystals spread across the head and add a small violet crystal at the centre' },
  { code: 'stade-8', dossier: 'stades', graine: 4108,
    instruction: 'replace the crystal crown by seven crystals spread across the head and add a small woven satchel over one shoulder' },
  { code: 'stade-9', dossier: 'stades', graine: 4109,
    instruction: 'replace the crystal crown by eight crystals spread across the head, the tallest one glowing pale gold' },
  { code: 'stade-10', dossier: 'stades', graine: 4110,
    instruction: 'replace the crystal crown by nine crystals forming a wide even crown across the whole head, all softly glowing' }
];

// -------------------------------------------------------------------------- pilotage ComfyUI

async function poster(chemin, charge) {
  const reponse = await fetch(`http://${HOTE}${chemin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(charge)
  });
  if (!reponse.ok) {
    throw new Error(`ComfyUI ${chemin} → ${String(reponse.status)} ${await reponse.text()}`);
  }
  return reponse.json();
}

async function televerser(cheminAbsolu, nomDistant) {
  const formulaire = new FormData();
  formulaire.append('image', new Blob([readFileSync(cheminAbsolu)], { type: 'image/png' }), nomDistant);
  formulaire.append('overwrite', 'true');
  const reponse = await fetch(`http://${HOTE}/upload/image`, { method: 'POST', body: formulaire });
  if (!reponse.ok) {
    throw new Error(`Téléversement refusé : ${String(reponse.status)} ${await reponse.text()}`);
  }
  return (await reponse.json()).name;
}

/** Retire les clés de commentaire, exactement comme `charger.py` (piège 3 du skill). */
function chargerWorkflow() {
  const brut = JSON.parse(readFileSync(join(RACINE, CHEMIN_WORKFLOW), 'utf8'));
  return Object.fromEntries(Object.entries(brut).filter(([cle]) => !cle.startsWith('_')));
}

async function soumettre(graphe, cibleAbsolue, delaiMs = 900_000) {
  const { prompt_id: identifiant } = await poster('/prompt', {
    prompt: graphe,
    client_id: 'decliner-gobi'
  });
  const debut = Date.now();
  for (;;) {
    if (Date.now() - debut > delaiMs) {
      throw new Error(`Délai dépassé pour ${identifiant}.`);
    }
    const historique = await (await fetch(`http://${HOTE}/history/${identifiant}`)).json();
    const entree = historique[identifiant];
    if (entree !== undefined) {
      const images = Object.values(entree.outputs ?? {}).flatMap((sortie) => sortie.images ?? []);
      if (images.length === 0) {
        throw new Error(`Aucune image pour ${identifiant} : ${JSON.stringify(entree.status)}`);
      }
      const parametres = new URLSearchParams({
        filename: images[0].filename,
        subfolder: images[0].subfolder ?? '',
        type: images[0].type ?? 'output'
      });
      const donnees = Buffer.from(
        await (await fetch(`http://${HOTE}/view?${parametres.toString()}`)).arrayBuffer()
      );
      mkdirSync(dirname(cibleAbsolue), { recursive: true });
      writeFileSync(cibleAbsolue, donnees);
      return cibleAbsolue;
    }
    await new Promise((suite) => setTimeout(suite, 1500));
  }
}

// ------------------------------------------------------------------------------ le verrou

function lireVerrou() {
  return JSON.parse(readFileSync(join(RACINE, CHEMIN_VERROU), 'utf8'));
}

/**
 * **LA PORTE.** Elle refuse plutôt que d'émettre du faux.
 *
 * Elle est franchie AVANT chaque soumission, jamais une fois pour toutes : c'est la seule
 * façon d'attraper le cas où quelqu'un aurait pointé la source sur une déclinaison précédente
 * entre deux passes.
 */
export function verifierSourceEstCanonique(verrou) {
  const chemin = join(RACINE, CHEMIN_CANONIQUE);
  if (!existsSync(chemin)) {
    throw new Error(
      `${CHEMIN_CANONIQUE} est absent. Aucune déclinaison n'est possible : on est à l'étape (A), ` +
        'et choisir un design est une validation humaine (D7, D31).'
    );
  }
  const mesure = empreintePixels(chemin);
  const declare = verrou.canonique.empreintePixels;
  if (mesure.empreinte !== declare) {
    throw new Error(
      'REFUS — la canonique sur disque ne correspond pas à celle que le verrou déclare.\n' +
        `  déclarée : ${declare}\n  mesurée  : ${mesure.empreinte}\n` +
        'Soit la canonique a été remplacée sans mise à jour du verrou, soit on est en train ' +
        "de décliner une déclinaison. Dans les deux cas on n'écrit rien (D32, convention C6)."
    );
  }
  return mesure;
}

// ------------------------------------------------------------------------------ programme

async function principal(arguments_) {
  const verrou = lireVerrou();
  const mesure = verifierSourceEstCanonique(verrou);
  console.log(`canonique vérifiée : ${mesure.empreinte} (${mesure.largeur}×${mesure.hauteur})`);

  if (arguments_.includes('--verifier')) {
    const enchainees = (verrou.declinaisons ?? []).filter(
      (entree) => entree.sourceEmpreintePixels !== verrou.canonique.empreintePixels
    );
    console.log(
      `déclinaisons=${String((verrou.declinaisons ?? []).length)} ` +
        `enchainees=${String(enchainees.length)}`
    );
    process.exitCode = enchainees.length === 0 ? 0 : 1;
    return;
  }

  const voulues = arguments_.includes('--tout')
    ? DECLINAISONS
    : DECLINAISONS.filter((entree) => arguments_.includes(entree.code));
  if (voulues.length === 0) {
    console.error('Rien à faire. Passer --tout, --verifier, ou des codes de la table.');
    process.exitCode = 1;
    return;
  }

  const nomDistant = await televerser(join(RACINE, CHEMIN_CANONIQUE), 'gobi-canonique.png');
  const gabarit = chargerWorkflow();
  const journal = [...(verrou.declinaisons ?? [])];

  for (const cible of voulues) {
    // ON REVÉRIFIE À CHAQUE TOUR. La profondeur de chaîne vaut 1 par contrôle, pas par usage.
    verifierSourceEstCanonique(verrou);

    const graphe = JSON.parse(JSON.stringify(gabarit));
    graphe['4'].inputs.image = nomDistant;
    graphe['6'].inputs.prompt = graphe['6'].inputs.prompt.replace('{INSTRUCTION}', cible.instruction);
    graphe['12'].inputs.seed = cible.graine;
    graphe['14'].inputs.filename_prefix = `gobi-${cible.code}`;
    if (graphe['6'].inputs.prompt.includes('{INSTRUCTION}')) {
      throw new Error('Le marqueur {INSTRUCTION} n’a pas été substitué : mauvais workflow.');
    }

    const relatif = `production/personnages/gobi/${cible.dossier}/${cible.code}.png`;
    process.stdout.write(`  ${cible.code} … `);
    const debut = Date.now();
    await soumettre(graphe, join(RACINE, relatif));
    const produite = empreintePixels(join(RACINE, relatif));
    console.log(`${String(Math.round((Date.now() - debut) / 1000))} s  ${produite.empreinte.slice(0, 23)}…`);

    const entree = {
      code: cible.code,
      cible: relatif,
      // Les deux champs qui prouvent la profondeur de chaîne = 1.
      source: CHEMIN_CANONIQUE,
      sourceEmpreintePixels: verrou.canonique.empreintePixels,
      empreintePixels: produite.empreinte,
      instruction: cible.instruction,
      graine: cible.graine,
      workflow: CHEMIN_WORKFLOW
    };
    const rang = journal.findIndex((connue) => connue.code === cible.code);
    if (rang === -1) {
      journal.push(entree);
    } else {
      journal[rang] = entree;
    }
  }

  writeFileSync(
    join(RACINE, CHEMIN_VERROU),
    `${JSON.stringify({ ...verrou, declinaisons: journal }, null, 2)}\n`,
    'utf8'
  );
  console.log(`verrou mis à jour : ${String(journal.length)} déclinaisons, 0 enchaînée`);
}

// `pathToFileURL` et non une concaténation : sous Windows un chemin absolu donne `file:///C:/…`
// (trois barres) et `file://C:/…` (deux) ne lui est pas égal. Le programme se croyait alors
// importé et ne faisait rien, en sortant tranquillement en code 0.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2)).catch((erreur) => {
    console.error(String(erreur.message ?? erreur));
    process.exitCode = 1;
  });
}
