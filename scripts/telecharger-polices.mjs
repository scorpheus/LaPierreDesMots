#!/usr/bin/env node
// Téléchargement des cinq polices de lecture — lot L2-B, v2 § 9.3, D9, D19.
//
// À LANCER À L'INSTALLATION, JAMAIS À L'EXÉCUTION. Le jeu se joue hors ligne : une police
// téléchargée pendant qu'un enfant lit serait une police qui manque quand le réseau manque.
//
// Trois règles, et elles sont la raison d'être de ce fichier :
//
//  1. **Rien ne s'installe hors du dossier du projet** (D9). Les WOFF2 atterrissent dans
//     `client/public/polices/`, jamais dans un cache système, jamais dans `node_modules`.
//  2. **Empreintes ÉPINGLÉES.** Un fichier dont le SHA-256 ne correspond pas n'est PAS écrit.
//     Une police est du code exécuté par le moteur de rendu : on ne pose pas sur la tablette
//     d'un enfant un binaire qu'on n'a pas identifié.
//  3. **Refuser plutôt qu'émettre du faux.** Une source non encore établie n'est pas devinée :
//     elle est déclarée manquante, nommément, et le script sort en échec en le disant. Une
//     police absente est un défaut d'ENVIRONNEMENT, pas un défaut de code — et c'est au
//     rapport de le nommer comme tel (contrat des features v2 § 11).
//
// Usage :
//   node scripts/telecharger-polices.mjs            télécharge et vérifie
//   node scripts/telecharger-polices.mjs --verifier  ne télécharge rien, contrôle l'existant
//   node scripts/telecharger-polices.mjs --figer     écrit dans LICENCES.md les empreintes
//                                                    MESURÉES des fichiers déjà présents
//
// `--figer` est la seule porte par laquelle une empreinte entre dans le dépôt, et elle est
// manuelle DÉLIBÉRÉMENT : épingler automatiquement l'empreinte de ce qu'on vient de télécharger
// reviendrait à épingler n'importe quoi. C'est un geste humain, fait une fois, après avoir
// vérifié la provenance.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const DOSSIER = path.join(RACINE, 'client', 'public', 'polices');
const LICENCES = path.join(DOSSIER, 'LICENCES.md');

/**
 * La table épinglée.
 *
 * `url` à `null` : la source n'est PAS établie. Le script ne la devine pas.
 * `sha256` à `null` : l'empreinte n'est pas encore épinglée ; le fichier sera téléchargé et
 * son empreinte affichée, mais il ne sera écrit qu'après un `--figer` explicite.
 *
 * Les URL retenues visent des archives npm servies par jsDelivr, et non l'API Google Fonts :
 * `fonts.gstatic.com` sert des chemins horodatés qui changent sans préavis, ce qui rend toute
 * empreinte épinglée fausse au bout de quelques mois. Une version npm figée, elle, est
 * immuable par construction.
 */
const POLICES = [
  {
    fichier: 'andika-regular.woff2',
    famille: 'Andika',
    graisse: 400,
    licence: 'SIL Open Font License 1.1',
    auteur: 'SIL Global',
    page: 'https://software.sil.org/andika/',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/andika@5.2.5/files/andika-latin-400-normal.woff2',
    // Épinglée le 2026-08-03. Provenance : paquet npm `@fontsource/andika@5.2.5`, servi par
    // jsDelivr. Une version npm publiée est immuable — l'empreinte d'un fichier d'une version
    // donnée est donc stable, et c'est ce qui rend l'épinglage légitime plutôt que circulaire.
    sha256: '319cc7dee0e22c4cfb68864a254c1ceabfa2df25437aa9d8c3814bfc967fd379',
    note: 'Police par défaut de toute zone de lecture (v2 § 9.3). Conçue pour l’alphabétisation : « a » et « g » à une boucle, comme dans les manuels.'
  },
  {
    fichier: 'andika-bold.woff2',
    famille: 'Andika',
    graisse: 700,
    licence: 'SIL Open Font License 1.1',
    auteur: 'SIL Global',
    page: 'https://software.sil.org/andika/',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/andika@5.2.5/files/andika-latin-700-normal.woff2',
    sha256: '7741c884c7aaf187b9cfcdb07ae6cf20017aa050ba60423cee6b56813e8f90ac',
    note: 'Graisse des mots cibles d’une consigne. La graisse marque, elle n’insiste pas.'
  },
  {
    fichier: 'opendyslexic-regular.woff2',
    famille: 'OpenDyslexic',
    graisse: 400,
    licence: 'SIL Open Font License 1.1',
    auteur: 'Abbie Gonzalez',
    page: 'https://opendyslexic.org/',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5.2.5/files/opendyslexic-latin-400-normal.woff2',
    sha256: 'f007004af3cda5d8076e57c943f8cc8d00a0da25988b1ae1048683d60e7cac1a',
    note: 'Embarquée pour l’ADHÉSION, jamais présentée comme un remède (D19). Wery & Diliberto 2017 ne mesure aucune amélioration chez l’enfant.'
  },
  {
    fichier: 'luciole-regular.woff2',
    famille: 'Luciole',
    graisse: 400,
    licence: 'SIL Open Font License 1.1',
    auteur: 'Laurent Bourcellier et Jonathan Perez, pour le CTRDV',
    page: 'https://www.luciole-vision.com/',
    // SOURCE NON ÉTABLIE : le site officiel distribue une archive ZIP contenant des TTF, pas
    // un WOFF2 à URL stable. La conversion TTF -> WOFF2 est licite sous OFL mais suppose un
    // outil (`woff2_compress`) qui n'est pas dans `outils/bin/`. À trancher avec l'utilisateur.
    url: null,
    sha256: null,
    note: 'Formes très différenciées — candidate sérieuse pour un enfant qui confond des lettres miroir (D23).'
  },
  {
    fichier: 'belle-allure-gs.woff2',
    famille: 'Belle Allure GS',
    graisse: 400,
    licence: 'À VÉRIFIER — gratuite pour un usage personnel et éducatif, redistribution non acquise',
    auteur: 'Jean Boyault',
    page: 'https://www.jeanboyault.fr/',
    // SOURCE NON ÉTABLIE, ET LICENCE À VÉRIFIER. Belle Allure n'est pas sous OFL : sa
    // redistribution dans un dépôt n'est pas acquise. Le script ne la télécharge donc pas, et
    // ne PEUT pas la télécharger tant que la licence n'est pas lue par un humain.
    url: null,
    sha256: null,
    note: 'Cursive scolaire française. Sert à reconnaître ce qu’il voit sur son cahier.'
  }
];

const arguments_ = new Set(process.argv.slice(2));
const modeVerifier = arguments_.has('--verifier');
const modeFiger = arguments_.has('--figer');

function empreinte(octets) {
  return createHash('sha256').update(octets).digest('hex');
}

async function telecharger(url) {
  const reponse = await fetch(url, { redirect: 'follow' });
  if (!reponse.ok) {
    throw new Error(`réponse ${String(reponse.status)}`);
  }
  return new Uint8Array(await reponse.arrayBuffer());
}

/** Regénère `LICENCES.md`. Les empreintes viennent des fichiers RÉELLEMENT présents. */
function ecrireLicences(mesures) {
  const lignes = [
    '# Licences des polices de lecture',
    '',
    "**Écrit par `scripts/telecharger-polices.mjs`. Ne pas modifier à la main** : le script le",
    'régénère, et une empreinte écrite à la main est une empreinte que personne n’a mesurée.',
    '',
    'Les fichiers `.woff2` de ce dossier **ne sont pas versionnés**. Leurs licences le',
    'permettraient pour la plupart, mais un dépôt de code n’est pas un miroir de distribution :',
    'ils sont téléchargés à l’installation, et leur empreinte SHA-256 est épinglée ci-dessous.',
    'Un fichier dont l’empreinte diffère n’est **pas** écrit (D9).',
    '',
    '| Fichier | Famille | Graisse | Licence | Auteur | Source | SHA-256 | État |',
    '|---|---|---|---|---|---|---|---|'
  ];

  for (const police of POLICES) {
    const mesure = mesures.get(police.fichier);
    const empreinteAffichee = mesure?.sha256 ?? police.sha256 ?? '_non épinglée_';
    lignes.push(
      `| \`${police.fichier}\` | ${police.famille} | ${String(police.graisse)} | ${police.licence} |` +
        ` ${police.auteur} | ${police.url ?? '**source non établie**'} |` +
        ` \`${empreinteAffichee}\` | ${mesure === undefined ? 'ABSENT' : 'présent'} |`
    );
  }

  lignes.push('', '## Pourquoi chaque police est là', '');
  for (const police of POLICES) {
    lignes.push(`- **${police.famille}** (\`${police.fichier}\`) — ${police.note}`);
  }

  lignes.push(
    '',
    '## Verdana',
    '',
    'Verdana **n’est pas embarquée** et ne peut pas l’être : police système propriétaire, non',
    'redistribuable. Elle reste proposée dans les réglages et rendue par la pile système ;',
    'absente, `client/src/lecture/polices.ts` retombe sur Andika. C’est l’écart n° 5 du contrat',
    'des features v2 § 8, assumé et sans alternative légale.',
    ''
  );

  writeFileSync(LICENCES, lignes.join('\n'), 'utf8');
}

async function principal() {
  mkdirSync(DOSSIER, { recursive: true });

  const mesures = new Map();
  const manquantes = [];
  const divergentes = [];

  for (const police of POLICES) {
    const cible = path.join(DOSSIER, police.fichier);

    if (existsSync(cible)) {
      const mesure = empreinte(readFileSync(cible));
      if (police.sha256 !== null && mesure !== police.sha256) {
        divergentes.push(`${police.fichier} : attendu ${police.sha256}, mesuré ${mesure}`);
        continue;
      }
      mesures.set(police.fichier, { sha256: mesure });
      console.log(`[polices] ${police.fichier} — présent, sha256 ${mesure}`);
      continue;
    }

    if (modeVerifier || modeFiger) {
      manquantes.push(`${police.fichier} : absent du dossier`);
      continue;
    }

    if (police.url === null) {
      manquantes.push(
        `${police.fichier} : SOURCE NON ÉTABLIE. Le script refuse de deviner une URL — ` +
          `voir la note de la table dans ce fichier. Licence : ${police.licence}.`
      );
      continue;
    }

    try {
      const octets = await telecharger(police.url);
      const mesure = empreinte(octets);

      if (police.sha256 === null) {
        manquantes.push(
          `${police.fichier} : empreinte NON ÉPINGLÉE. Téléchargé depuis ${police.url}, ` +
            `sha256 mesuré ${mesure}. Vérifier la provenance, poser cette valeur dans ` +
            `POLICES.sha256, puis relancer. Rien n'a été écrit.`
        );
        continue;
      }
      if (mesure !== police.sha256) {
        divergentes.push(
          `${police.fichier} : attendu ${police.sha256}, téléchargé ${mesure}. Rien n'a été écrit.`
        );
        continue;
      }

      writeFileSync(cible, octets);
      mesures.set(police.fichier, { sha256: mesure });
      console.log(`[polices] ${police.fichier} — téléchargé et vérifié`);
    } catch (cause) {
      manquantes.push(`${police.fichier} : échec du téléchargement (${String(cause)})`);
    }
  }

  if (modeFiger) {
    ecrireLicences(mesures);
    console.log(`[polices] LICENCES.md régénéré depuis ${String(mesures.size)} fichier(s) mesuré(s).`);
  } else if (!existsSync(LICENCES)) {
    ecrireLicences(mesures);
  }

  if (divergentes.length > 0) {
    console.error('\n[polices] EMPREINTE DIVERGENTE — aucun de ces fichiers n’a été écrit :');
    for (const ligne of divergentes) {
      console.error(`  - ${ligne}`);
    }
  }
  if (manquantes.length > 0) {
    console.error('\n[polices] POLICES MANQUANTES — DÉFAUT D’ENVIRONNEMENT, pas de code :');
    for (const ligne of manquantes) {
      console.error(`  - ${ligne}`);
    }
    console.error(
      '\n  Conséquence : ces polices retombent sur la pile système. Le jeu reste jouable —' +
        '\n  `font-display: block` et `local()` dégradent sans casser — mais `tests/visuel/' +
        '\n  polices.spec.ts` ne peut pas capturer ce qu’il devrait capturer.'
    );
  }

  const total = POLICES.length;
  console.log(
    `\n[polices] ${String(mesures.size)} / ${String(total)} police(s) présente(s) et vérifiée(s).`
  );

  process.exitCode = divergentes.length > 0 || manquantes.length > 0 ? 1 : 0;
}

await principal();
