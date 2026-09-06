/**
 * Garde des micro-récits du moteur `chrono`.
 *
 * Un schéma peut valider trois id de vignettes distincts sans que les trois images racontent
 * l'histoire annoncée. Le référentiel ci-dessous est donc une relecture humaine compacte :
 * pour chaque étape, il conserve le sens attendu du récit et de la vignette. Les termes sont
 * volontairement simples et observables dans les deux textes ; le lien de cause à effet reste
 * décrit, triplet par triplet, dans Docs/audit-chronologies-pedagogique-2026-09-05.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface EtapeAttendue {
  readonly recit: readonly string[];
  readonly vignette: readonly string[];
}

interface TripletAttendu {
  readonly id: string;
  readonly ordre: readonly string[];
  readonly etapes: readonly EtapeAttendue[];
}

interface FicheAttendue {
  readonly fichier: string;
  readonly triplets: readonly TripletAttendu[];
}

interface Vignette {
  readonly id: string;
  readonly libelle: string;
}

interface ConsigneChrono {
  readonly id: string;
  readonly recit: string;
  readonly ordre: readonly string[];
}

interface ContenuChrono {
  readonly consignes: readonly ConsigneChrono[];
  readonly vignettes: readonly Vignette[];
}

const ATTENDUS: readonly FicheAttendue[] = [
  {
    fichier: 'cite-des-histoires/pellicule-chrono-01.json',
    triplets: [
      { id: 'c1', ordre: ['vignette-plage', 'vignette-seau', 'vignette-sable'], etapes: [
        { recit: ['gobi', 'plage'], vignette: ['gobi', 'plage'] },
        { recit: ['seau'], vignette: ['seau'] }, { recit: ['sable'], vignette: ['sable'] },
      ] },
      { id: 'c2', ordre: ['vignette-petit', 'vignette-grand', 'vignette-montre'], etapes: [
        { recit: ['château', 'petit'], vignette: ['château', 'petit'] },
        { recit: ['sable'], vignette: ['château', 'grand'] },
        { recit: ['château', 'grand'], vignette: ['gobi', 'château'] },
      ] },
      { id: 'c3', ordre: ['vignette-plume', 'vignette-caillou', 'vignette-danse'], etapes: [
        { recit: ['plume'], vignette: ['plume'] }, { recit: ['caillou'], vignette: ['caillou'] },
        { recit: ['danse'], vignette: ['plume', 'danse'] },
      ] },
    ],
  },
  {
    fichier: 'cite-des-histoires/pellicule-chrono-02.json',
    triplets: [
      { id: 'c1', ordre: ['vignette-sac-ferme', 'vignette-cahier-ouvert', 'vignette-papa-aide'], etapes: [
        { recit: ['gobi', 'sac'], vignette: ['gobi', 'sac'] },
        { recit: ['cahier', 'ouvre'], vignette: ['cahier', 'ouvre'] },
        { recit: ['papa', 'aider'], vignette: ['papa', 'aider'] },
      ] },
      { id: 'c2', ordre: ['vignette-deux-cubes', 'vignette-troisieme-cube', 'vignette-trois-cubes'], etapes: [
        { recit: ['deux', 'cubes'], vignette: ['deux', 'cubes'] },
        { recit: ['papa', 'cube'], vignette: ['papa', 'cube'] },
        { recit: ['trois', 'cubes'], vignette: ['gobi', 'trois', 'cubes'] },
      ] },
      { id: 'c3', ordre: ['vignette-cahier-termine', 'vignette-cahier-range', 'vignette-lit'], etapes: [
        { recit: ['cahier', 'ferme'], vignette: ['cahier', 'ferme'] },
        { recit: ['cahier', 'sac'], vignette: ['cahier', 'sac'] },
        { recit: ['gobi', 'lit'], vignette: ['gobi', 'lit'] },
      ] },
    ],
  },
  {
    fichier: 'cite-des-histoires/vitrail-chrono-01.json',
    triplets: [
      { id: 'c1', ordre: ['vignette-nuage-gris', 'vignette-pluie-forte', 'vignette-arc-en-ciel'], etapes: [
        { recit: ['nuage', 'gris'], vignette: ['nuage', 'gris'] },
        { recit: ['pluie'], vignette: ['pluie'] }, { recit: ['arc-en-ciel'], vignette: ['arc-en-ciel'] },
      ] },
      { id: 'c2', ordre: ['vignette-fleur-seche', 'vignette-fleur-arrosee', 'vignette-fleur-ouverte'], etapes: [
        { recit: ['fleur', 'sèche'], vignette: ['fleur', 'sèche'] },
        { recit: ['gobi', 'eau', 'fleur'], vignette: ['gobi', 'eau', 'fleur'] },
        { recit: ['fleur', 'ouvre'], vignette: ['fleur', 'ouvre'] },
      ] },
      { id: 'c3', ordre: ['vignette-tonneau-vide', 'vignette-tonneau-rempli', 'vignette-tonneau-plein'], etapes: [
        { recit: ['tonneau', 'gouttière'], vignette: ['tonneau', 'gouttière'] },
        { recit: ['pluie', 'tonneau'], vignette: ['pluie', 'tonneau'] },
        { recit: ['tonneau', 'plein'], vignette: ['tonneau', 'plein'] },
      ] },
    ],
  },
  {
    fichier: 'galeries/frise-chrono-01.json',
    triplets: [
      { id: 'c1', ordre: ['vignette-panier-vide', 'vignette-bol-range', 'vignette-panier-porte'], etapes: [
        { recit: ['panier', 'bol'], vignette: ['panier', 'bol'] }, { recit: ['bol', 'panier'], vignette: ['bol', 'panier'] },
        { recit: ['gobi', 'bol', 'panier'], vignette: ['gobi', 'bol', 'panier'] },
      ] },
      { id: 'c2', ordre: ['vignette-balle-tenue', 'vignette-balle-lancee', 'vignette-balle-rapportee'], etapes: [
        { recit: ['chien', 'balle', 'dame'], vignette: ['chien', 'balle', 'dame'] },
        { recit: ['dame', 'lance', 'balle'], vignette: ['dame', 'lance', 'balle'] },
        { recit: ['chien', 'rapporte', 'balle'], vignette: ['chien', 'rapporte', 'balle'] },
      ] },
      { id: 'c3', ordre: ['vignette-pot-rempli', 'vignette-pot-feu', 'vignette-pot-bout'], etapes: [
        { recit: ['gobi', 'pot', 'eau'], vignette: ['gobi', 'pot', 'eau'] },
        { recit: ['pot', 'feu'], vignette: ['pot', 'feu'] }, { recit: ['eau', 'bout', 'vapeur'], vignette: ['eau', 'bout', 'vapeur'] },
      ] },
    ],
  },
  {
    fichier: 'volcan/fresque-chrono-01.json',
    triplets: [
      { id: 'c1', ordre: ['vignette-cochon-ruche', 'vignette-abeille-nez', 'vignette-cochon-court'], etapes: [
        { recit: ['cochon', 'ruche'], vignette: ['cochon', 'ruche'] },
        { recit: ['abeille', 'nez'], vignette: ['abeille', 'nez'] }, { recit: ['cochon', 'ruche'], vignette: ['cochon', 'ruche'] },
      ] },
      { id: 'c2', ordre: ['vignette-quilles-placees', 'vignette-balle-lancee', 'vignette-quilles-tombees'], etapes: [
        { recit: ['fille', 'quilles'], vignette: ['fille', 'quilles'] }, { recit: ['balle', 'quilles'], vignette: ['balle', 'quilles'] },
        { recit: ['balle', 'quilles'], vignette: ['balle', 'quilles'] },
      ] },
      { id: 'c3', ordre: ['vignette-pierre', 'vignette-pierre-soulevee', 'vignette-champignon'], etapes: [
        { recit: ['gobi', 'pierre'], vignette: ['gobi', 'pierre'] }, { recit: ['pierre', 'mains'], vignette: ['pierre', 'mains'] },
        { recit: ['champignon', 'pierre'], vignette: ['champignon', 'pierre'] },
      ] },
    ],
  },
];

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase('fr-FR');
}

function contientTous(texte: string, mots: readonly string[]): boolean {
  const normalise = normaliser(texte);
  return mots.every((mot) => normalise.includes(normaliser(mot)));
}

function phrases(recit: string): readonly string[] {
  return recit.match(/[^.!?]+[.!?]?/gu)?.map((phrase) => phrase.trim()).filter(Boolean) ?? [];
}

function lire(fichier: string): ContenuChrono {
  const exercice = JSON.parse(readFileSync(join(process.cwd(), 'contenu', 'exercices', fichier), 'utf8')) as {
    readonly jeu: { readonly contenu: ContenuChrono };
  };
  return exercice.jeu.contenu;
}

describe('chronologies pédagogiques approuvées', () => {
  it('contrôle les 15 triplets cause → action → résultat avec leurs trois vignettes, pas seulement leurs id', () => {
    const anomalies: string[] = [];
    let nombreTriplets = 0;
    for (const attenduFiche of ATTENDUS) {
      const contenu = lire(attenduFiche.fichier);
      const vignettes = new Map(contenu.vignettes.map((vignette) => [vignette.id, vignette]));
      for (const attendu of attenduFiche.triplets) {
        nombreTriplets += 1;
        const consigne = contenu.consignes.find((candidate) => candidate.id === attendu.id);
        if (consigne === undefined) {
          anomalies.push(`${attenduFiche.fichier}#${attendu.id}: consigne absente`);
          continue;
        }
        if (JSON.stringify(consigne.ordre) !== JSON.stringify(attendu.ordre)) {
          anomalies.push(`${attenduFiche.fichier}#${attendu.id}: ordre non approuvé`);
        }
        const recit = phrases(consigne.recit);
        if (recit.length !== 3) {
          anomalies.push(`${attenduFiche.fichier}#${attendu.id}: le récit doit avoir trois temps`);
          continue;
        }
        attendu.etapes.forEach((etape, rang) => {
          if (!contientTous(recit[rang] ?? '', etape.recit)) {
            anomalies.push(`${attenduFiche.fichier}#${attendu.id}/${String(rang + 1)}: récit non approuvé`);
          }
          const vignette = vignettes.get(attendu.ordre[rang]);
          if (!contientTous(String(vignette?.libelle ?? ''), etape.vignette)) {
            anomalies.push(`${attenduFiche.fichier}#${attendu.id}/${String(rang + 1)}: vignette non approuvée`);
          }
        });
      }
    }
    expect(nombreTriplets).toBe(15);
    expect(anomalies).toEqual([]);
  });

  it('rend le garde rouge si une cause, une action ou un résultat est remplacé', () => {
    expect(contientTous('Le chien rapporte la balle.', ['chien', 'rapporte', 'balle'])).toBe(true);
    expect(contientTous('Le chien regarde la balle.', ['chien', 'rapporte', 'balle'])).toBe(false);
  });
});
