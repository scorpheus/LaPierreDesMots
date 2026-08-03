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
 *   node scripts/decliner-gobi.mjs --formes        rend les 25 cristaux de graphème (lot M5)
 *
 * ── CE QUE LE LOT M5 AJOUTE, ET LA MESURE QUI L'A DÉCIDÉ ────────────────────────────────────
 *
 * Les 25 formes passent par `personnage-cristal.api.json` — inpainting régional Flux Fill sous
 * le masque `production/personnages/gobi/masque-crete.png` —, comme le contrat du monde v4 § M5
 * le prescrit. **Ce workflow porte une clause de style figée « black and white line art, no
 * colour », et la canonique de Gobi est EN COULEUR (D29, D36).** Le risque de décoloration était
 * réel au point de justifier, pour la déclinaison pleine image, un second workflow
 * (`gobi-declinaison.api.json`, voir son `_commentaire`). MESURÉ avant d'écrire quoi que ce soit,
 * un essai unique, graine 4201, `production/personnages/gobi/essais/essai-cristal-bw.png`,
 * 21 s : **le corps, les couleurs et le cœur de Pierre sont intacts, et le cristal demandé
 * apparaît.** L'inpainting reconstruit depuis le contexte de l'image, pas depuis la seule clause
 * de texte. Le contrat est donc appliqué tel qu'il est écrit, et l'écart pressenti n'existe pas.
 *
 * ── LA RECOMPOSITION, ET POURQUOI ELLE N'EST PAS COSMÉTIQUE ─────────────────────────────────
 *
 * Le guide § 6.3 corrige l'état de l'art : hors du masque, la différence n'est PAS nulle, parce
 * que le VAE ré-encode l'image entière — 0,31 % de pixels bougent. La voie qu'il recommande est
 * de **recomposer** le résultat avec la canonique en se servant du masque : l'écart hors masque
 * devient nul **par construction**, et non « sous un seuil ».
 *
 * S'y ajoute une seconde restauration, et elle a été rendue nécessaire par ce qu'on VOIT sur
 * l'essai : dans le masque, le fond crème plat ressort avec un halo elliptique — la trace du
 * masque lui-même. Un pixel du masque n'est donc conservé que s'il porte de l'encre **dans le
 * résultat ou dans la canonique**. Un pixel qui était fond plat et le reste est restauré. Le
 * cristal neuf, lui, est de l'encre : il passe. C'est la règle « on n'écrit que ce qu'on a
 * mesuré » appliquée aux pixels.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

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

/**
 * Les 25 cristaux de graphème — lot M5, contrat du monde v4 § M5.
 *
 * **L'ORDRE ET LES GRAPHÈMES VIENNENT DE `contenu/monde/gobi-stades.json`**, qui fait foi et
 * qu'aucun lot de ce plan ne réécrit. Ils ne sont pas recopiés de mémoire : `--formes` relit ce
 * fichier et refuse de tourner si un graphème de la table ci-dessous n'y est pas déclaré, ou
 * l'inverse. Une table de production qui diverge de la table de contenu produirait 25 images
 * pour des formes que le jeu ne connaît pas, et personne ne le verrait avant l'écran.
 *
 * **25 SILHOUETTES, PAS 25 TEINTES** (D44 : « deux formes identiques ne se collectionneraient
 * pas »). Chaque description nomme donc une GÉOMÉTRIE — un anneau, une croix, un zigzag, trois
 * aiguilles parallèles —, jamais une couleur ni une humeur. C'est aussi ce qui rend le contrat
 * de sortie « recouvrement deux à deux ≤ 0,90 » atteignable : deux teintes d'un même pentagone
 * se recouvrent à 1,00 quoi qu'on en dise.
 */
export const FORMES = [
  { grapheme: 'a', graine: 4201,
    cristal: 'one wide low crystal shaped like a rounded teardrop, its tip curling forward' },
  { grapheme: 'e', graine: 4202,
    cristal: 'one single faceted crystal shard curving to the left like a smooth blade' },
  { grapheme: 'i', graine: 4203,
    cristal: 'one very thin tall crystal needle with a small separate round crystal floating just above its tip' },
  { grapheme: 'o', graine: 4204,
    cristal: 'one crystal bent into a closed round ring, hollow at its centre' },
  { grapheme: 'u', graine: 4205,
    cristal: 'one wide crystal with two prongs joined at the bottom, shaped like a cup' },
  { grapheme: 'b', graine: 4206,
    cristal: 'one single tall faceted crystal column standing straight, with one round crystal ball resting against its lower right side' },
  { grapheme: 'd', graine: 4207,
    cristal: 'one single tall faceted crystal column standing straight, with one round crystal ball resting against its lower left side' },
  { grapheme: 'p', graine: 4208,
    cristal: 'one crystal spire pointing downwards with a round crystal bulb attached at its top on the right' },
  { grapheme: 'q', graine: 4209,
    cristal: 'one crystal spire pointing downwards with a round crystal bulb attached at its top on the left' },
  { grapheme: 't', graine: 4210,
    cristal: 'one tall crystal shard crossed near its top by a short horizontal crystal shard' },
  { grapheme: 'on', graine: 4211,
    cristal: 'two crystals merged into one wide smooth arch, like a bridge' },
  { grapheme: 'an', graine: 4212,
    cristal: 'one broad triangular crystal with a deep notch cut into its left slope' },
  { grapheme: 'in', graine: 4213,
    cristal: 'one slim crystal leaning to the right with a very small crystal resting against its side' },
  { grapheme: 'ou', graine: 4214,
    cristal: 'two round crystal domes side by side, touching each other' },
  { grapheme: 'oi', graine: 4215,
    cristal: 'one round crystal dome with a long crystal needle crossing over it' },
  { grapheme: 's', graine: 4216,
    cristal: 'one single faceted crystal bent twice into a soft S, like a frozen wave' },
  { grapheme: 'x', graine: 4217,
    cristal: 'two long crystal shards crossing each other at their middle' },
  { grapheme: 'er', graine: 4218,
    cristal: 'one crystal coiled into a flat spiral' },
  { grapheme: 'ent', graine: 4219,
    cristal: 'three crystal shards fanned out from a single base' },
  { grapheme: 'ez', graine: 4220,
    cristal: 'one crystal folded into a sharp zigzag' },
  { grapheme: 'eau', graine: 4221,
    cristal: 'one wide crystal with three rounded crests in a row, like a wave' },
  { grapheme: 'ill', graine: 4222,
    cristal: 'three tall crystal needles of exactly the same height, parallel and close together' },
  { grapheme: 'gn', graine: 4223,
    cristal: 'two thick faceted crystal rings linked together like two links of a chain' },
  { grapheme: 'ph', graine: 4224,
    cristal: 'one wide flat faceted crystal shaped like an open folding fan, its narrow point at the bottom' },
  { grapheme: 'ch', graine: 4225,
    cristal: 'two crystal shards meeting at a sharp peak, forming a chevron' }
];

const CHEMIN_MASQUE = 'production/personnages/gobi/masque-crete.png';
const CHEMIN_WORKFLOW_CRISTAL = 'production/workflows/personnage-cristal.api.json';

// ------------------------------------------------------------------- écriture PNG et recomposition

/** Un PNG 8 bits RVB non entrelacé, filtre 0. Écrit sur `node:zlib` seul — D9 tenue. */
export function ecrirePngRvb(cheminAbsolu, largeur, hauteur, rvb) {
  const brut = Buffer.alloc(hauteur * (largeur * 3 + 1));
  for (let ligne = 0; ligne < hauteur; ligne += 1) {
    brut[ligne * (largeur * 3 + 1)] = 0;
    rvb.copy(brut, ligne * (largeur * 3 + 1) + 1, ligne * largeur * 3, (ligne + 1) * largeur * 3);
  }
  const morceau = (type, donnees) => {
    const nom = Buffer.from(type, 'ascii');
    const taille = Buffer.alloc(4);
    taille.writeUInt32BE(donnees.length);
    const controle = Buffer.alloc(4);
    controle.writeUInt32BE(crc32(Buffer.concat([nom, donnees])) >>> 0);
    return Buffer.concat([taille, nom, donnees, controle]);
  };
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(largeur, 0);
  entete.writeUInt32BE(hauteur, 4);
  entete[8] = 8;
  entete[9] = 2;
  writeFileSync(
    cheminAbsolu,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      morceau('IHDR', entete),
      morceau('IDAT', deflateSync(brut, { level: 9 })),
      morceau('IEND', Buffer.alloc(0))
    ])
  );
}

/**
 * Recompose un inpainting avec la canonique. **Rend l'écart hors masque nul par construction**
 * (guide § 6.3), et retire le halo elliptique que le VAE laisse sur le fond plat.
 *
 * Rend les deux chiffres qui font le contrat, et il les CALCULE : la part de pixels hors masque
 * que le modèle avait bougés (ce que la recomposition annule), et la part de la surface du
 * masque que le cristal neuf occupe réellement. Un cristal à 0,0 % serait une image vide rendue
 * avec un verdict vert.
 */
export function recomposer(canonique, produite, masque, seuilEncre = 24) {
  const { largeur, hauteur, rvb: base } = canonique;
  const sortie = Buffer.from(produite.rvb);
  const fond = [base[0], base[1], base[2]];
  const encre = (tampon, index) =>
    Math.abs(tampon[index] - fond[0]) +
    Math.abs(tampon[index + 1] - fond[1]) +
    Math.abs(tampon[index + 2] - fond[2]) >
    seuilEncre;

  let horsMasque = 0;
  let horsMasqueBouges = 0;
  let dansMasque = 0;
  let encreNeuve = 0;

  for (let pixel = 0; pixel < largeur * hauteur; pixel += 1) {
    const index = pixel * 3;
    if (masque.rvb[index] < 128) {
      horsMasque += 1;
      if (
        Math.abs(sortie[index] - base[index]) > 8 ||
        Math.abs(sortie[index + 1] - base[index + 1]) > 8 ||
        Math.abs(sortie[index + 2] - base[index + 2]) > 8
      ) {
        horsMasqueBouges += 1;
      }
      sortie[index] = base[index];
      sortie[index + 1] = base[index + 1];
      sortie[index + 2] = base[index + 2];
      continue;
    }
    dansMasque += 1;
    // Dans le masque : on ne garde que ce qui porte de l'encre. Un fond plat qui reste plat est
    // restauré — c'est lui, et lui seul, qui portait le halo du masque.
    if (encre(sortie, index) || encre(base, index)) {
      encreNeuve += 1;
    } else {
      sortie[index] = base[index];
      sortie[index + 1] = base[index + 1];
      sortie[index + 2] = base[index + 2];
    }
  }

  return {
    rvb: sortie,
    largeur,
    hauteur,
    horsMasqueBouges,
    partHorsMasque: (100 * horsMasqueBouges) / horsMasque,
    partEncreDansMasque: (100 * encreNeuve) / dansMasque
  };
}

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
function chargerWorkflow(chemin = CHEMIN_WORKFLOW) {
  const brut = JSON.parse(readFileSync(join(RACINE, chemin), 'utf8'));
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

// ------------------------------------------------------------------------ les 25 cristaux

/**
 * Rend les 25 PNG de graphème par inpainting régional, puis les recompose avec la canonique.
 *
 * LA TABLE DE PRODUCTION EST CONFRONTÉE À LA TABLE DE CONTENU avant la première soumission —
 * `contenu/monde/gobi-stades.json` fait foi, ce script ne fait pas foi. Un écart arrête tout :
 * 25 images produites pour des graphèmes que le jeu ne déclare pas seraient 25 images
 * irrécupérables, et l'écart ne se verrait qu'à l'écran.
 */
async function rendreFormes(verrou, journal, voulues) {
  const document = JSON.parse(readFileSync(join(RACINE, 'contenu/monde/gobi-stades.json'), 'utf8'));
  const declares = document.formes.map((forme) => forme.grapheme);
  const produits = FORMES.map((forme) => forme.grapheme);
  const manquants = declares.filter((code) => !produits.includes(code));
  const surnumeraires = produits.filter((code) => !declares.includes(code));
  if (manquants.length > 0 || surnumeraires.length > 0) {
    throw new Error(
      'REFUS — la table de production diverge de contenu/monde/gobi-stades.json.\n' +
        `  déclarés sans production : ${manquants.join(', ') || '—'}\n` +
        `  produits sans déclaration : ${surnumeraires.join(', ') || '—'}`
    );
  }
  console.log(`table confrontée : ${String(declares.length)} graphèmes déclarés = produits, écart 0`);

  const nomCanonique = await televerser(join(RACINE, CHEMIN_CANONIQUE), 'gobi-canonique.png');
  const nomMasque = await televerser(join(RACINE, CHEMIN_MASQUE), 'gobi-masque-crete.png');
  const gabarit = chargerWorkflow(CHEMIN_WORKFLOW_CRISTAL);
  const canonique = pixelsRvbPng(readFileSync(join(RACINE, CHEMIN_CANONIQUE)));
  const masque = pixelsRvbPng(readFileSync(join(RACINE, CHEMIN_MASQUE)));

  // Une REPRISE ne rejoue pas les 25 : `--formes e b d s gn ph` ne refait que les six nommées.
  // Le budget de l'annexe P § 3.5 est de 5 tentatives par asset **avec un correctif à chaque
  // passe** ; rejouer les 25 pour en corriger 6 brûlerait du GPU sans rien apprendre, et
  // changerait les 19 autres qui étaient bonnes.
  const aRendre = voulues.length === 0 ? FORMES : FORMES.filter((forme) => voulues.includes(forme.grapheme));
  if (aRendre.length === 0) {
    throw new Error(`Aucun graphème connu parmi : ${voulues.join(', ')}.`);
  }
  console.log(`à rendre : ${String(aRendre.length)} / ${String(FORMES.length)}`);

  for (const forme of aRendre) {
    verifierSourceEstCanonique(verrou);

    const graphe = JSON.parse(JSON.stringify(gabarit));
    graphe['4'].inputs.image = nomCanonique;
    graphe['5'].inputs.image = nomMasque;
    graphe['6'].inputs.text = graphe['6'].inputs.text.replace('{CRISTAL}', forme.cristal);
    graphe['11'].inputs.seed = forme.graine;
    graphe['14'].inputs.filename_prefix = `gobi-forme-${forme.grapheme}`;
    if (graphe['6'].inputs.text.includes('{CRISTAL}')) {
      throw new Error('Le marqueur {CRISTAL} n’a pas été substitué : mauvais workflow.');
    }

    const relatif = `production/personnages/gobi/formes/${forme.grapheme}.png`;
    const cible = join(RACINE, relatif);
    process.stdout.write(`  ${forme.grapheme.padEnd(4)} … `);
    const debut = Date.now();
    await soumettre(graphe, cible);

    const recomposee = recomposer(canonique, pixelsRvbPng(readFileSync(cible)), masque);
    ecrirePngRvb(cible, recomposee.largeur, recomposee.hauteur, recomposee.rvb);
    const produite = empreintePixels(cible);
    console.log(
      `${String(Math.round((Date.now() - debut) / 1000)).padStart(3)} s  ` +
        `hors masque bougé avant recomposition ${recomposee.partHorsMasque.toFixed(2)} % → 0,00 % ; ` +
        `encre dans le masque ${recomposee.partEncreDansMasque.toFixed(1)} %`
    );

    const entree = {
      code: `forme-${forme.grapheme}`,
      cible: relatif,
      source: CHEMIN_CANONIQUE,
      sourceEmpreintePixels: verrou.canonique.empreintePixels,
      empreintePixels: produite.empreinte,
      instruction: forme.cristal,
      graine: forme.graine,
      workflow: CHEMIN_WORKFLOW_CRISTAL,
      masque: CHEMIN_MASQUE,
      recompose: true,
      partEncreDansMasque: Number(recomposee.partEncreDansMasque.toFixed(2))
    };
    const rang = journal.findIndex((connue) => connue.code === entree.code);
    if (rang === -1) {
      journal.push(entree);
    } else {
      journal[rang] = entree;
    }
  }
}

// ------------------------------------------------------------------------------ programme

async function principal(arguments_) {
  const verrou = lireVerrou();
  const mesure = verifierSourceEstCanonique(verrou);
  console.log(`canonique vérifiée : ${mesure.empreinte} (${mesure.largeur}×${mesure.hauteur})`);

  if (arguments_.includes('--formes')) {
    const journal = [...(verrou.declinaisons ?? [])];
    await rendreFormes(
      verrou,
      journal,
      arguments_.filter((argument) => !argument.startsWith('--'))
    );
    writeFileSync(
      join(RACINE, CHEMIN_VERROU),
      `${JSON.stringify({ ...verrou, declinaisons: journal }, null, 2)}\n`,
      'utf8'
    );
    console.log(`verrou mis à jour : ${String(journal.length)} déclinaisons, 0 enchaînée`);
    return;
  }

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
