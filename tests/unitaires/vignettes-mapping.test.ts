import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decoderPng } from '../../scripts/sprites/png.mjs';

const racine = resolve(import.meta.dirname, '../..');

const planches = {
  'galeries-frise': ['vignette-panier-vide', 'vignette-bol-range', 'vignette-panier-porte', 'vignette-balle-tenue', 'vignette-balle-lancee', 'vignette-balle-rapportee', 'vignette-pot-rempli', 'vignette-pot-feu', 'vignette-pot-bout'],
  'volcan-fresque': ['vignette-cochon-ruche', 'vignette-abeille-nez', 'vignette-cochon-court', 'vignette-quilles-placees', 'vignette-balle-lancee', 'vignette-quilles-tombees', 'vignette-pierre', 'vignette-pierre-soulevee', 'vignette-champignon'],
  'cite-pellicule-01': ['vignette-plage', 'vignette-seau', 'vignette-sable', 'vignette-petit', 'vignette-grand', 'vignette-montre', 'vignette-plume', 'vignette-caillou', 'vignette-danse'],
  'cite-pellicule-02': ['vignette-sac-ferme', 'vignette-cahier-ouvert', 'vignette-papa-aide', 'vignette-deux-cubes', 'vignette-troisieme-cube', 'vignette-trois-cubes', 'vignette-cahier-termine', 'vignette-cahier-range', 'vignette-lit'],
  'cite-vitrail': ['vignette-nuage-gris', 'vignette-pluie-forte', 'vignette-arc-en-ciel', 'vignette-fleur-seche', 'vignette-fleur-arrosee', 'vignette-fleur-ouverte', 'vignette-tonneau-vide', 'vignette-tonneau-rempli', 'vignette-tonneau-plein']
} as const;

const exercices: Record<string, string> = {
  'galeries-frise': 'contenu/exercices/galeries/frise-chrono-01.json',
  'volcan-fresque': 'contenu/exercices/volcan/fresque-chrono-01.json',
  'cite-pellicule-01': 'contenu/exercices/cite-des-histoires/pellicule-chrono-01.json',
  'cite-pellicule-02': 'contenu/exercices/cite-des-histoires/pellicule-chrono-02.json',
  'cite-vitrail': 'contenu/exercices/cite-des-histoires/vitrail-chrono-01.json'
};

const recitsValides: Record<string, string[]> = {
  'galeries-frise': [
    'Gobi trouve un panier et un bol posés à côté. Il pose le bol dans le panier. Gobi repart avec le bol rangé dans le panier.',
    'Le chien regarde la balle dans la main de la dame. La dame lance la balle au loin. Le chien rapporte la balle à la dame.',
    'Gobi remplit un pot avec de l’eau froide. Il pose le pot sur le feu. L’eau bout et de la vapeur monte du pot.'
  ],
  'volcan-fresque': [
    'Un cochon marche près d’une ruche. Une abeille se pose sur son nez. Le cochon court loin de la ruche.',
    'La fille place trois quilles debout. Elle fait rouler une balle vers les quilles. La balle renverse les trois quilles.',
    'Gobi découvre une grosse pierre. Il soulève la pierre avec ses deux mains. Un champignon apparaît sous la pierre.'
  ],
  'cite-pellicule-01': [
    'Gobi est sur la plage. Il prend un seau. Il remplit le seau de sable.',
    'Gobi construit un petit château. Il ajoute encore du sable. Le château devient grand.',
    'Plume arrive près du château. Elle pose un caillou tout en haut. Elle danse autour du château fini.'
  ],
  'cite-pellicule-02': [
    "Gobi rentre à la maison avec son sac fermé. Il sort son cahier et l'ouvre sur la table. Papa s'assoit près de Gobi pour l'aider.",
    'Gobi pose deux cubes sur la table. Papa ajoute un cube. Gobi aligne les trois cubes et sourit.',
    'Gobi ferme son cahier terminé. Il range le cahier dans son sac. Le soir, Gobi dort dans son lit.'
  ],
  'cite-vitrail': [
    'Un gros nuage gris arrive au-dessus de la forêt. La pluie tombe très fort. Une grande flaque apparaît et un arc-en-ciel se forme.',
    "Une fleur sèche penche la tête. Gobi verse de l'eau au pied de la fleur. La fleur se redresse et s'ouvre.",
    "Un tonneau est placé sous la gouttière. La pluie coule du toit dans le tonneau. Le tonneau est plein d'eau après la pluie."
  ]
};

function dimensionsPng(chemin: string): [number, number] {
  const octets = readFileSync(chemin);
  expect(octets.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return [octets.readUInt32BE(16), octets.readUInt32BE(20)];
}

describe('mapping des vignettes storyboard', () => {
  for (const [planche, ids] of Object.entries(planches)) {
    it(`${planche} conserve l’ordre JSON et des cellules 4:3`, () => {
      const contenu = JSON.parse(readFileSync(resolve(racine, exercices[planche]), 'utf8')) as { jeu: { contenu: { vignettes: { id: string; asset: string }[] } } };
      expect(contenu.jeu.contenu.vignettes.map((vignette) => vignette.id)).toEqual(ids);
      for (const vignette of contenu.jeu.contenu.vignettes) {
        expect(vignette.asset).toBe(`assets/vignettes/${planche}/${vignette.id}.png`);
        const [largeur, hauteur] = dimensionsPng(resolve(racine, 'contenu', vignette.asset));
        expect(largeur / hauteur).toBeCloseTo(4 / 3, 5);
      }
    });
  }

  it('toutes les chronologies racontent trois moments avec trois cartes distinctes', () => {
    for (const [planche, chemin] of Object.entries(exercices)) {
      const contenu = JSON.parse(readFileSync(resolve(racine, chemin), 'utf8')) as {
        jeu: { contenu: { consignes: { ordre: string[]; recit: string }[]; vignettes: { id: string }[] } };
      };
      expect(contenu.jeu.contenu.consignes).toHaveLength(3);
      expect(contenu.jeu.contenu.consignes.every((consigne) => consigne.ordre.length === 3)).toBe(true);
      expect(contenu.jeu.contenu.consignes.map((consigne) => consigne.recit)).toEqual(recitsValides[planche]);
      const attendues = contenu.jeu.contenu.consignes.flatMap((consigne) => consigne.ordre);
      expect(new Set(attendues).size).toBe(9);
      expect(attendues).toEqual(contenu.jeu.contenu.vignettes.map((vignette) => vignette.id));
    }
  });

  it('verrouille les pixels des 45 cartes validées', () => {
    const verrou = JSON.parse(readFileSync(resolve(racine, 'production/assets.lock.json'), 'utf8')) as {
      assets: Array<{
        id: string;
        fichier: string;
        empreinte: string;
        derivees?: Record<string, { fichier: string; empreinte: string }>;
      }>;
    };

    for (const [planche, ids] of Object.entries(planches)) {
      const entree = verrou.assets.find((asset) => asset.id === `chronologie.${planche}.v1`);
      expect(entree, planche).toBeDefined();
      const fichiers = [
        { fichier: entree!.fichier, empreinte: entree!.empreinte },
        ...Object.values(entree!.derivees ?? {})
      ];
      expect(fichiers, planche).toHaveLength(9);
      expect(fichiers.map(({ fichier }) => fichier)).toEqual(
        ids.map((id) => `contenu/assets/vignettes/${planche}/${id}.png`)
      );
      for (const item of fichiers) {
        const image = decoderPng(readFileSync(resolve(racine, item.fichier)));
        expect([image.largeur, image.hauteur], item.fichier).toEqual([512, 384]);
        expect(item.empreinte).toBe(
          `sha256:${createHash('sha256').update(image.pixels).digest('hex').toUpperCase()}`
        );
      }
    }
  });
});
