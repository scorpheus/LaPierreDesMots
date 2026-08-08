/**
 * LA CONSIGNE N'EST DITE QU'UNE FOIS — R49, et la garantie inverse du déménagement.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * « la phrase est en haut et en bas, il y a doublon » (le père, 2026-08-07)
 *
 * Les moteurs ont donc cessé de redire la consigne : `EcranNoeud` la porte seul, parce qu'il
 * est le seul à avoir la clé du `BoutonEcouter`. Ce fichier garde le sens INVERSE — qu'aucun
 * moteur ne la reprenne. Sans lui, le doublon revient au premier moteur écrit demain, et c'est
 * le père qui le retrouvera avant nous.
 *
 * L'exigence POSITIVE — « la consigne est bien affichée » — n'a pas disparu avec le
 * déménagement : elle a suivi l'objet, et vit dans `tests/composants/EcranNoeud.test.tsx`.
 * Une exigence qui disparaîtrait avec un déménagement n'aurait jamais rien gardé.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CINQ RÈGLES ESSAYÉES AVANT LA BONNE, ET LES QUATRE PREMIÈRES ACCUSAIENT DES INNOCENTS ──
 *
 * Chercher la FORME du code ne marche pas, et c'est mesuré :
 *
 *   • « le moteur rend un `<ZoneDeLecture texte=…>` » → **6 accusés à tort**. `histoire` y rend
 *     son RÉCIT, `eclair` le MOT à retrouver, `grave` le mot en cours, `tri` le critère du
 *     réceptacle, `libre` son invite, `phrase` la phrase à construire. Tous légitimes.
 *   • « le moteur rend quelque chose qui finit par `.texte` » → **3 accusés**, dont `libre`
 *     (`etat.aide.texte`, c'est l'AIDE) et `phrase` (`vol.texte`, c'est un jeton qui s'envole).
 *
 * La règle juste ne décrit pas une forme : elle lit la MARQUE que les moteurs posent eux-mêmes
 * sur l'élément qui redit la consigne — `data-consigne-texte`. Elle n'existe nulle part
 * ailleurs dans le client (vérifié), donc elle ne désigne que ça.
 *
 * C'est la même leçon que Q4 : on s'ancre sur ce que le code PUBLIE, jamais sur la forme de
 * l'expression.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { lireTexte, RACINE_DEPOT } from '../configuration/preparation.js';

/** La marque que les moteurs posent sur l'élément qui redit la consigne. */
const MARQUE = 'data-consigne-texte';

/** Les 14 moteurs déclarés — population dérivée de l'union `CodeMoteur`. */
function moteursDeclares(): readonly string[] {
  const bloc = /export type CodeMoteur\s*=([\s\S]*?);/.exec(lireTexte('partage/src/identifiants.ts'));
  if (bloc === null) throw new Error('l’union `CodeMoteur` est introuvable.');
  const codes = [...bloc[1]!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!);
  if (codes.length === 0) throw new Error('`CodeMoteur` trouvée, aucun membre lu.');
  return codes;
}

/** Règle 10 : les commentaires citent souvent précisément ce qui est absent. */
const sansCommentaires = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/** Le source rendu d'un moteur, commentaires retirés. `null` si le dossier n'existe pas. */
function sourceDuMoteur(code: string, fabriquees: ReadonlyMap<string, string>): string | null {
  const fabrique = fabriquees.get(code);
  if (fabrique !== undefined) return sansCommentaires(fabrique);
  const dossier = join(RACINE_DEPOT, 'client', 'src', 'moteurs', code);
  let entier = '';
  try {
    for (const fichier of readdirSync(dossier)) {
      if (!fichier.endsWith('.tsx')) continue;
      entier += `\n${sansCommentaires(readFileSync(join(dossier, fichier), 'utf8'))}`;
    }
  } catch {
    return null;
  }
  return entier;
}

/** Les moteurs qui redisent la consigne. `fabriquees` sert au contrôle positif. */
function moteursQuiRedisent(
  fabriquees: ReadonlyMap<string, string> = new Map(),
): readonly string[] {
  const codes = [...new Set([...moteursDeclares(), ...fabriquees.keys()])];
  return codes.filter((code) => (sourceDuMoteur(code, fabriquees) ?? '').includes(MARQUE));
}

const REDISENT = moteursQuiRedisent();

describe('R49 — la consigne n’est dite qu’une fois', () => {
  test('la population est DÉRIVÉE de `CodeMoteur`, et la marque ne désigne que la consigne', () => {
    const codes = moteursDeclares();
    expect(codes.length, 'l’union `CodeMoteur` ne rend plus aucun membre').toBeGreaterThanOrEqual(14);
    for (const code of codes) {
      expect(
        sourceDuMoteur(code, new Map()),
        `aucun source lu pour « ${code} » : la règle serait vraie par vacuité sur lui`,
      ).not.toBeNull();
    }
    console.log(
      `[R49] population : ${String(codes.length)} moteurs · ` +
        `${String(REDISENT.length)} redisent encore la consigne` +
        (REDISENT.length === 0 ? '' : ` — ${REDISENT.join(', ')}`),
    );
  });

  test('CONTRÔLE POSITIF — un moteur FABRIQUÉ qui redit la consigne est trouvé, un autre non', () => {
    // Sans témoin fabriqué, ce garde deviendrait muet le jour où les deux derniers moteurs
    // seront portés — et il ne prouverait plus rien au moteur écrit le lendemain.
    const coupable = new Map([
      ['temoin-coupable', '<p data-consigne-texte="oui">{consigne?.texte ?? \'\'}</p>'],
    ]);
    const innocent = new Map([
      ['temoin-innocent', '<ZoneDeLecture texte={contenu.recit} motsCles={[]} />'],
    ]);
    const vus = moteursQuiRedisent(coupable);
    const rien = moteursQuiRedisent(innocent);
    console.log(
      `[R49] contrôle positif — témoin coupable : ${vus.includes('temoin-coupable') ? 'TROUVÉ ✔' : 'MANQUÉ'} · ` +
        `témoin innocent : ${rien.includes('temoin-innocent') ? 'ACCUSÉ À TORT' : 'épargné ✔'}`,
    );
    expect(
      vus,
      'le garde ne voit pas un moteur qui redit la consigne sous ses yeux : il est aveugle.',
    ).toContain('temoin-coupable');
    expect(
      rien,
      'le garde accuse un moteur qui rend un RÉCIT — c’est la faute des cinq règles essayées ' +
        'avant celle-ci, et un rapport de faux positifs ne se lit pas.',
    ).not.toContain('temoin-innocent');
    expect(
      REDISENT.includes('temoin-coupable'),
      'le témoin fabriqué a fui dans la mesure réelle : la mesure laisse sa propre trace.',
    ).toBe(false);
  });

  test('LE DÉFAUT — aucun moteur ne redit la consigne', () => {
    expect(
      REDISENT,
      'Ces moteurs portent encore `data-consigne-texte` : la consigne est dite deux fois, en ' +
        'haut par `EcranNoeud` et chez eux. C’est le doublon que le père a vu — « la phrase ' +
        'est en haut et en bas ». L’exigence d’AFFICHAGE, elle, est gardée chez `EcranNoeud` : ' +
        'la retirer d’ici ne perd rien.',
    ).toEqual([]);
  });
});
