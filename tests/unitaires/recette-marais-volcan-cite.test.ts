import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Json = Record<string, any>;
const RACINE = process.cwd();
const REGIONS = ['marais-jumeau', 'volcan', 'cite-des-histoires'] as const;
const NOMBRE_ATTENDU = { 'marais-jumeau': 12, volcan: 12, 'cite-des-histoires': 14 } as const;

function lire(chemin: string): Json {
  return JSON.parse(readFileSync(join(RACINE, chemin), 'utf8')) as Json;
}

function contenuDe(region: string): Array<{ chemin: string; exercice: Json }> {
  return readdirSync(join(RACINE, 'contenu/exercices', region))
    .filter((nom) => nom.endsWith('.json'))
    .sort()
    .map((nom) => ({ chemin: `contenu/exercices/${region}/${nom}`, exercice: lire(`contenu/exercices/${region}/${nom}`) }));
}

describe('recette ciblée Marais / Volcan / Cité', () => {
  it('sert exactement les 38 exercices des trois régions', () => {
    const exercices = REGIONS.flatMap((region) => contenuDe(region));
    expect(exercices).toHaveLength(38);
    for (const region of REGIONS) expect(contenuDe(region)).toHaveLength(NOMBRE_ATTENDU[region]);
  });

  it('garde chaque étape atteignable et chaque référence interne résolue', () => {
    for (const region of REGIONS) {
      for (const { chemin, exercice } of contenuDe(region)) {
        const contenu = exercice.jeu.contenu as Json;
        const elements = [
          ...(contenu.cartes ?? []), ...(contenu.options ?? []), ...(contenu.elements ?? []),
          ...(contenu.cibles ?? []), ...(contenu.blocs ?? []), ...(contenu.etiquettes ?? []),
          ...(contenu.vignettes ?? []), ...(contenu.cases ?? []),
        ] as Json[];
        const ids = new Set(elements.map((element) => element.id));
        for (const consigne of contenu.consignes ?? contenu.questions ?? []) {
          for (const id of [...(consigne.options ?? []), ...(consigne.ordre ?? []), ...(consigne.parcours ?? [])]) {
            expect(ids.has(id), `${chemin}:${consigne.id} référence ${id}`).toBe(true);
          }
          for (const paire of consigne.aApparier ?? []) {
            expect(elements.filter((element) => element.paire === paire), `${chemin}:${consigne.id} paire ${paire}`).toHaveLength(2);
          }
          for (const cible of consigne.aAttraper ?? []) expect(ids.has(cible), `${chemin}:${consigne.id} cible ${cible}`).toBe(true);
          if (consigne.reponse !== undefined) expect(consigne.options).toContain(consigne.reponse);
        }
        for (const element of elements) {
          for (const voisine of element.voisines ?? []) expect(ids.has(voisine), `${chemin}:${element.id} voisine ${voisine}`).toBe(true);
        }
      }
    }
  });

  it('associe chaque habillage livré à ses trois calques et garde les voix synchronisées', () => {
    const manifeste = lire('production/voix.lock.json');
    const empreintes = new Map((manifeste.clips as Json[]).map((clip) => [clip.cle, clip.empreinteTexte.slice(0, 8)]));
    for (const region of REGIONS) {
      for (const { chemin, exercice } of contenuDe(region)) {
        const nomHabillage = exercice.jeu.habillage.split('.')[1];
        const fichierHabillage = `contenu/habillages/${region}/${nomHabillage}.habillage.json`;
        const habillage = lire(fichierHabillage);
        const nomsCalques = new Set((habillage.scene.calques as Json[]).map((calque) => calque.role));
        expect(nomsCalques, fichierHabillage).toEqual(new Set(['fond', 'coloriable', 'trait']));
        const zones = new Set(
          (habillage.scene.calques as Json[]).flatMap((calque) => (calque.regions ?? []).map((zone: Json) => zone.id)),
        );
        for (const consigne of exercice.jeu.contenu.consignes ?? []) {
          for (const cible of consigne.cibles ?? []) expect(zones.has(cible.region), `${chemin}:${cible.region}`).toBe(true);
        }
        const fichierSvg = join(RACINE, 'contenu', habillage.scene.fichier);
        expect(statSync(fichierSvg).size, fichierSvg).toBeGreaterThan(1000);
        const textes = exercice.jeu.contenu.consignes ?? exercice.jeu.contenu.questions ?? [];
        for (const consigne of textes) {
          const empreinte = createHash('sha256').update(consigne.texte).digest('hex').slice(0, 8);
          expect(empreintes.get(`${exercice.id}/${consigne.id}`), `${chemin}:${consigne.id}`).toBe(empreinte);
        }
      }
    }
  });
});
