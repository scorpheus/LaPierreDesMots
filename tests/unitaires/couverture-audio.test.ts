/**
 * LE CONTRAT DE SORTIE CHIFFRÉ DE N2 — contrat de finition v3 § 9.2 :
 *
 *   « N2 | `couvertureConsignes(...).taux` | échoue si **< 1,0**.
 *     Objectif : 100 % des consignes des exercices livrés ont un audio. »
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE FICHIER EST LE CHIFFRE QUI ÉCHOUE SI LE TRAVAIL EST CREUX.
 *
 * Il ne demande pas « le manifeste existe-t-il ». Un manifeste vide existe, et
 * `MANIFESTE_VIDE` est même un manifeste VALIDE. Il demande, dans cet ordre :
 *
 *   1. le recensement porte-t-il sur des OBJETS ? — sinon les quatre cas suivants mesurent
 *      le vide et passent tous. C'est le contrôle de la mesure, et il vient d'abord ;
 *   2. le compte par OBJET dépasse-t-il le compte par OCCURRENCE ? — la preuve qu'on n'a pas
 *      audité un `grep` ;
 *   3. chaque clé recensée a-t-elle un clip `normal` ? — le taux du contrat ;
 *   4. chaque clip du manifeste a-t-il son fichier SUR LE DISQUE, et le fichier pèse-t-il
 *      quelque chose ? — un manifeste qui promet 89 clips absents est pire que pas de
 *      manifeste : D42 rendrait 89 boutons qui ne répondent pas, exactement le défaut n° 3 ;
 *   5. l'empreinte du texte concorde-t-elle avec le texte de la source ? — sinon un clip
 *      périmé se ferait passer pour à jour ;
 *   6. les sept locuteurs de D41 ont-ils chacun au moins un clip ?
 *   7. chaque mot cible a-t-il sa variante syllabée (§ 5.4) ?
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier lit `scripts/recenser-textes.mjs` plutôt que de réénumérer les consignes :
 * deux énumérations divergeraient, et c'est la divergence qui ferait passer le test à tort.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { decouperSyllabes } from '@pierre/partage/lecture';
import { aUnAudio, clipDe, couvertureConsignes, lireManifeste } from '@pierre/partage/voix';
import type { ManifesteVoix } from '@pierre/partage/voix';

import { RACINE_DEPOT } from '../configuration/preparation.js';
// @ts-expect-error — module `.mjs` sans déclaration de types ; c'est la SOURCE UNIQUE du
// recensement et la dupliquer en TypeScript serait exactement la divergence qu'on refuse.
import { clesACouvrir, recenser } from '../../scripts/recenser-textes.mjs';

interface ObjetParlant {
  readonly cle: string;
  readonly texte: string;
  readonly locuteur: string;
  readonly rendu: 'normal' | 'syllabe' | 'lent';
  readonly origine: string;
  readonly dossier: string;
}

interface Recensement {
  readonly objets: readonly ObjetParlant[];
  readonly nbObjets: number;
  readonly nbOccurrences: number;
  readonly sources: readonly string[];
  readonly illisibles: readonly { readonly chemin: string; readonly motif: string }[];
}

const recensement = recenser(RACINE_DEPOT) as Recensement;
const cles = clesACouvrir(recensement) as readonly string[];

const CHEMIN_MANIFESTE = join(RACINE_DEPOT, 'contenu', 'audio', 'manifeste.json');
const manifeste: ManifesteVoix = existsSync(CHEMIN_MANIFESTE)
  ? lireManifeste(JSON.parse(readFileSync(CHEMIN_MANIFESTE, 'utf8')))
  : lireManifeste(null);

describe('N2 — contrôle de la MESURE, avant toute assertion de couverture', () => {
  it('le recensement porte sur des OBJETS, et il en trouve', () => {
    // Sans ce cas, un extracteur cassé rendrait 0 objet, `couvertureConsignes` rendrait
    // `taux: 1` par la règle du dénominateur nul, et le contrat de sortie serait « tenu »
    // sans qu'un seul clip existe.
    expect(recensement.nbObjets).toBeGreaterThan(0);
    expect(cles.length).toBeGreaterThan(0);
    expect(recensement.sources.length).toBeGreaterThan(0);
  });

  it('aucun fichier source n’était illisible au moment de la mesure', () => {
    // Un fichier qu'un autre lot écrivait au même instant disparaît du dénominateur au lieu
    // d'apparaître au numérateur : le taux monterait pour la mauvaise raison. On le NOMME.
    expect(
      recensement.illisibles.map((i) => `${i.chemin} — ${i.motif}`),
      'des fichiers de contenu étaient illisibles : relancer `npm run voix`',
    ).toEqual([]);
  });

  it('le compte par OBJET dépasse le compte par OCCURRENCE du mot « audio »', () => {
    // C'est la preuve chiffrée qu'on n'a pas audité un `grep`. Les deux consignes du moteur
    // `trace` sont au singulier et aucune recherche textuelle sur `"audio":` ne les compte.
    expect(recensement.nbObjets).toBeGreaterThan(recensement.nbOccurrences);
  });
});

describe('N2 — LE CHIFFRE : couvertureConsignes(...).taux === 1', () => {
  const couverture = couvertureConsignes(manifeste, cles);

  it('100 % des objets recensés ont un clip au manifeste', () => {
    expect(
      couverture.manquants,
      `couverture ${String(couverture.couverts)} / ${String(couverture.total)} = ` +
        `${(couverture.taux * 100).toFixed(1)} %`,
    ).toEqual([]);
    expect(couverture.taux).toBe(1);
  });
});

describe('N2 — un manifeste qui promet un clip le tient', () => {
  it('chaque clip déclaré existe sur le disque et pèse plus qu’un en-tête vide', () => {
    const absents: string[] = [];
    for (const clip of manifeste.clips) {
      const fichier = join(RACINE_DEPOT, 'contenu', clip.fichier);
      if (!existsSync(fichier)) {
        absents.push(`${clip.cle} [${clip.rendu}] → ${clip.fichier} ABSENT`);
        continue;
      }
      const octets = statSync(fichier).size;
      if (octets < 512) {
        absents.push(`${clip.cle} [${clip.rendu}] → ${String(octets)} octets`);
      }
    }
    expect(absents).toEqual([]);
  });

  it('chaque clip dure plus de 200 ms — un clip muet passe tous les tests d’existence', () => {
    const muets = manifeste.clips
      .filter((clip) => clip.dureeMs < 200)
      .map((clip) => `${clip.cle} [${clip.rendu}] ${String(clip.dureeMs)} ms`);
    expect(muets).toEqual([]);
  });

  it('l’empreinte du texte concorde — un clip périmé ne se fait pas passer pour à jour', () => {
    const derives: string[] = [];
    for (const clip of manifeste.clips) {
      const attendue = createHash('sha256').update(clip.texte, 'utf8').digest('hex');
      if (clip.empreinteTexte !== attendue) {
        derives.push(`${clip.cle} [${clip.rendu}]`);
      }
    }
    expect(derives).toEqual([]);
  });

  it('le texte du clip est bien celui de la SOURCE, pas une variante recopiée', () => {
    // Convention C5 : aucune donnée en deux exemplaires sans un test qui prouve leur égalité.
    // Le manifeste recopie le texte des exercices ; ce cas compare les deux, octet à octet.
    const attendus = new Map<string, string>();
    for (const objet of recensement.objets) {
      attendus.set(`${objet.cle}|${objet.rendu}`, objet.texte);
    }
    const divergents: string[] = [];
    for (const clip of manifeste.clips) {
      const attendu = attendus.get(`${clip.cle}|${clip.rendu}`);
      if (attendu !== undefined && attendu !== clip.texte) {
        divergents.push(`${clip.cle} [${clip.rendu}] : « ${clip.texte} » ≠ « ${attendu} »`);
      }
    }
    expect(divergents).toEqual([]);
  });
});

describe('le manifeste respecte SON PROPRE schéma', () => {
  it('`contenu/audio/manifeste.json` valide contre `manifeste-audio.schema.json`', async () => {
    // `scripts/test-contenu.mjs` ne valide QUE `contenu/exercices/` contre
    // `exercice.schema.json` : le schéma du manifeste n'y a aucun point d'entrée. Sans ce
    // cas, il serait un document décoratif — et c'est exactement lui qui a attrapé les noms
    // de fichiers accentués (`mot-maîtresse….opus`), refusés par son propre motif ASCII.
    const { default: Ajv } = await import('ajv/dist/2020.js');
    const { default: ajouterFormats } = await import('ajv-formats');

    const schema = JSON.parse(
      readFileSync(join(RACINE_DEPOT, 'contenu', 'schemas', 'manifeste-audio.schema.json'), 'utf8'),
    ) as object;
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajouterFormats(ajv);
    const valider = ajv.compile(schema);

    // On valide le fichier BRUT, pas le résultat de `lireManifeste` : cette dernière filtre,
    // et valider ce qu'on vient de filtrer ne prouverait que le filtre.
    const brut: unknown = existsSync(CHEMIN_MANIFESTE)
      ? JSON.parse(readFileSync(CHEMIN_MANIFESTE, 'utf8'))
      : null;
    expect(brut, 'aucun manifeste : lancer `npm run voix`').not.toBeNull();

    const valide = valider(brut);
    expect(
      (valider.errors ?? []).map((e) => `${e.instancePath} ${e.message ?? ''}`).slice(0, 10),
    ).toEqual([]);
    expect(valide).toBe(true);
  });
});

describe('D41 — les sept locuteurs existent en clips, pas seulement en type', () => {
  it('chacun des sept porte au moins un clip', () => {
    const attendus = ['narrateur', 'gobi', 'maitresse', 'filou', 'bulle', 'roc', 'plume'];
    const presents = new Set(manifeste.clips.map((clip) => clip.locuteur));
    expect(attendus.filter((locuteur) => !presents.has(locuteur))).toEqual([]);
  });
});

describe('§ 5.4 — la variante syllabée porte sur CHAQUE mot cible', () => {
  // ════════════════════════════════════════════════════════════════════════════════════════
  // POURQUOI LES MOTS SONT COMPTÉS À PART DU TAUX DU CONTRAT.
  //
  // Le § 5.4 définit `cles` mot pour mot : « depuis les exercices, le campement et
  // l'ouverture ». Les `mot/*` sont un livrable SUPPLÉMENTAIRE du même paragraphe, pas une
  // entrée du taux — et les mélanger cachait le chiffre du contrat derrière un artefact de
  // mesure. Voir le commentaire de `clesACouvrir` dans `scripts/recenser-textes.mjs`, qui
  // porte les sorties citées.
  //
  // Ce bloc-ci n'est PAS moins exigeant : il exige 100 % des mots cibles, dans les deux
  // rendus. Il l'exige simplement séparément, pour que l'échec dise lequel des deux
  // livrables manque.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const mots = recensement.objets.filter((objet) => objet.cle.startsWith('mot/'));

  it('le recensement trouve des mots cibles — sinon les deux cas suivants sont vides', () => {
    expect(mots.length, 'aucun mot cible recensé : l’extracteur de `motsCles` est cassé')
      .toBeGreaterThan(0);
  });

  it('tout mot cible a son clip `syllabe`', () => {
    const sansSyllabe = [
      ...new Set(
        mots
          .filter((objet) => objet.rendu === 'syllabe')
          .filter((objet) => clipDe(manifeste, objet.cle, 'syllabe') === null)
          .map((objet) => objet.cle),
      ),
    ];
    expect(sansSyllabe).toEqual([]);
  });

  it('et il a AUSSI son rendu normal, sinon `aUnAudio` le déclarerait muet', () => {
    const cles = [...new Set(mots.map((objet) => objet.cle))];
    expect(cles.filter((cle) => !aUnAudio(manifeste, cle))).toEqual([]);
  });

  it('le clip syllabé n’est JAMAIS une copie du normal', () => {
    // Exact, sans tolérance : deux rendus différents sont deux fichiers différents. Si l'un
    // recopiait l'autre, les deux cas précédents passeraient quand même — le fichier
    // existerait, la clé résoudrait — et l'enfant n'entendrait aucune coupe.
    const copies: string[] = [];
    for (const cle of new Set(mots.map((objet) => objet.cle))) {
      const normal = clipDe(manifeste, cle, 'normal');
      const syllabe = clipDe(manifeste, cle, 'syllabe');
      if (normal === null || syllabe === null) continue;
      if (normal.fichier === syllabe.fichier) copies.push(cle);
    }
    expect(copies).toEqual([]);
  });

  it('les silences de coupe sont RÉELLEMENT dans l’audio — mesure agrégée', () => {
    // ══════════════════════════════════════════════════════════════════════════════════════
    // POURQUOI UNE MESURE AGRÉGÉE ET NON UNE ASSERTION PAR MOT.
    //
    // **Piper n'est pas déterministe.** Son prédicteur de durée VITS est stochastique : deux
    // synthèses du même mot diffèrent. Mesuré sur `pull` — 613 ms d'un côté, 404 ms de
    // l'autre, soit 34 % d'écart sur le MÊME texte. Une assertion « le syllabé est plus long
    // que le normal », posée mot par mot, compare donc deux tirages et échoue sur les cas
    // courts, sans que rien ne soit cassé. Elle a effectivement échoué sur `arbres`
    // (1044 ms contre 1077 ms), et `arbres` est parfaitement découpé.
    //
    // Ce qui, lui, ne dépend d'aucun tirage : **on a inséré (n−1) × 220 ms de silence par
    // mot de n syllabes**. Sur l'ensemble des mots polysyllabiques, le total de ces silences
    // est une quantité connue exactement, et la gigue de Piper — de moyenne nulle — s'annule
    // sur deux douzaines de mots.
    //
    // Le plancher exigé est donc PHYSIQUE, pas ajusté pour passer : la somme des écarts doit
    // atteindre au moins la somme des silences insérés. Mesuré aujourd'hui : 19 641 ms
    // d'écart pour 6 160 ms de silence, soit **3,19 fois le plancher** — la marge vient de ce
    // que chaque syllabe rendue seule porte sa propre attaque et sa propre finale.
    // ══════════════════════════════════════════════════════════════════════════════════════
    const SILENCE_ENTRE_SYLLABES_MS = 220;
    let ecartTotal = 0;
    let silenceTotal = 0;
    let polysyllabiquesVus = 0;

    for (const cle of new Set(mots.map((objet) => objet.cle))) {
      const normal = clipDe(manifeste, cle, 'normal');
      const syllabe = clipDe(manifeste, cle, 'syllabe');
      if (normal === null || syllabe === null) continue;

      // `decouperSyllabes` est la fonction DU JEU, la même que `scripts/rendre-voix.mjs`
      // interroge par `tsx`. Contrôle C5 gratuit : si les deux divergeaient, ce compte
      // cesserait de correspondre aux silences réellement posés.
      const nbSyllabes = decouperSyllabes(normal.texte).length;
      if (nbSyllabes < 2) continue;

      polysyllabiquesVus += 1;
      ecartTotal += syllabe.dureeMs - normal.dureeMs;
      silenceTotal += (nbSyllabes - 1) * SILENCE_ENTRE_SYLLABES_MS;
    }

    expect(polysyllabiquesVus, 'aucun mot cible polysyllabique : la mesure est vide')
      .toBeGreaterThan(0);
    expect(
      ecartTotal,
      `${String(polysyllabiquesVus)} mots polysyllabiques · écart mesuré ${String(ecartTotal)} ms ` +
        `· silence inséré ${String(silenceTotal)} ms`,
    ).toBeGreaterThanOrEqual(silenceTotal);
  });
});
