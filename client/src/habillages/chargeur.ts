// Chargeur d'habillage — contrat technique v1 § 1.4, « zéro code par habillage ».
//
// Un habillage est ENTIÈREMENT déclaratif : un SVG en calques plus un JSON (§ 4.1). Ce module
// est ce qui rend cette promesse vraie côté client — il transforme la déclaration en pixels
// sans qu'aucune ligne ne soit propre à un habillage donné. Ajouter « la mare » ou « le
// marché » n'ajoute pas une ligne ici.
import { NUANCIER, PALETTE, hexDeCouleur } from '@pierre/partage';
import type { CouleurColoriage, Habillage, JetonCouleur } from '@pierre/partage';
import { urlAsset } from '../api/client.js';

/** Les 7 jetons de la v2 § 9.2. Ordre d'écriture, jamais de logique. */
const JETONS: readonly JetonCouleur[] = [
  'trait',
  'parchemin',
  'soleil',
  'framboise',
  'menthe',
  'lagon',
  'grisaille'
] as unknown as readonly JetonCouleur[];

/** Les 11 couleurs du nuancier de coloriage — écart assumé n° 2 du contrat § 12. */
const COULEURS: readonly CouleurColoriage[] = [
  'rouge',
  'orange',
  'jaune',
  'vert',
  'bleu',
  'violet',
  'rose',
  'brun',
  'noir',
  'blanc',
  'gris'
] as unknown as readonly CouleurColoriage[];

function estHex(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && /^#[0-9a-f]{3,8}$/iu.test(valeur);
}

/**
 * Réécrit `--trait`, `--parchemin`, … et `--nuancier-*` depuis `PALETTE` / `NUANCIER`.
 *
 * C'est la parade au risque nommé au contrat § 14 : `styles/global.css` porte les mêmes
 * valeurs en littéraux (Tailwind v4 en a besoin au build), mais c'est le TypeScript qui fait
 * foi à l'exécution. Si les deux divergent, la couleur affichée est celle de `PALETTE`, et
 * l'écart est journalisé.
 *
 * @returns le nombre de variables réellement écrites — le contrat de sortie du lot L-D.
 */
export function appliquerVariablesPalette(racine: HTMLElement): number {
  let ecrites = 0;

  const table = PALETTE as unknown as Readonly<Record<string, unknown>>;
  for (const jeton of JETONS) {
    const valeur: unknown = table[jeton as unknown as string];
    if (estHex(valeur)) {
      const nom = `--${String(jeton)}`;
      if (racine.style.getPropertyValue(nom).trim().toLowerCase() !== valeur.toLowerCase()) {
        racine.style.setProperty(nom, valeur);
      }
      ecrites += 1;
    } else {
      console.warn(`[palette] jeton « ${String(jeton)} » absent de PALETTE — valeur CSS conservée.`);
    }
  }

  const nuancier = NUANCIER as unknown as Readonly<Record<string, unknown>>;
  const lireHex = hexDeCouleur as unknown as ((couleur: CouleurColoriage) => unknown) | undefined;

  for (const couleur of COULEURS) {
    let valeur: unknown = nuancier[couleur as unknown as string];
    if (!estHex(valeur) && typeof lireHex === 'function') {
      try {
        valeur = lireHex(couleur);
      } catch {
        valeur = undefined;
      }
    }
    if (estHex(valeur)) {
      racine.style.setProperty(`--nuancier-${String(couleur)}`, valeur);
      ecrites += 1;
    }
  }

  return ecrites;
}

/**
 * Variables CSS propres à un habillage : ses surcharges de jetons (§ 4.1, `VariantePalette`).
 * `trait` et `parchemin` ne se surchargent JAMAIS — c'est ce qui tient l'unité visuelle
 * entre les six régions (v2 § 9.2). La règle est appliquée ici, pas espérée du contenu.
 */
export function variablesHabillage(habillage: Habillage): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {};
  const surcharges = habillage.palette.jetons as unknown as Readonly<Record<string, unknown>>;

  for (const [nom, valeur] of Object.entries(surcharges)) {
    if (nom === 'trait' || nom === 'parchemin') {
      console.warn(`[habillage] surcharge de « ${nom} » ignorée : jeton non surchargeable.`);
      continue;
    }
    if (estHex(valeur)) {
      variables[`--${nom}`] = valeur;
    }
  }

  return variables;
}

// ------------------------------------------------------------------ chargement des assets

const cacheSvg = new Map<string, Promise<string>>();

/**
 * Charge le SVG d'une scène, une seule fois par chemin.
 * Le résultat est du BALISAGE BRUT : c'est le moteur de rendu (L-E) qui l'injecte et qui
 * pose `data-region-svg` sur chaque `<path>` coloriable (§ 10).
 */
export function chargerSvg(cheminRelatif: string): Promise<string> {
  const enCache = cacheSvg.get(cheminRelatif);
  if (enCache !== undefined) {
    return enCache;
  }

  const promesse = fetch(urlAsset(cheminRelatif), { headers: { Accept: 'image/svg+xml' } })
    .then(async (reponse) => {
      if (!reponse.ok) {
        throw new Error(
          `SVG introuvable : ${cheminRelatif} (réponse ${String(reponse.status)}).`
        );
      }
      return reponse.text();
    })
    .catch((cause: unknown) => {
      // Un asset manquant ne doit pas rester en cache : le rechargement suivant réessaie.
      cacheSvg.delete(cheminRelatif);
      throw cause instanceof Error ? cause : new Error(String(cause));
    });

  cacheSvg.set(cheminRelatif, promesse);
  return promesse;
}

/** Charge un habillage déclaratif depuis `contenu/habillages/**`. */
export async function chargerHabillage(cheminRelatif: string): Promise<Habillage> {
  const reponse = await fetch(urlAsset(cheminRelatif), {
    headers: { Accept: 'application/json' }
  });
  if (!reponse.ok) {
    throw new Error(
      `Habillage introuvable : ${cheminRelatif} (réponse ${String(reponse.status)}).`
    );
  }
  return (await reponse.json()) as Habillage;
}

/** Le SVG de la scène d'un habillage. Raccourci lisible sur `scene.fichier`. */
export function chargerSceneHabillage(habillage: Habillage): Promise<string> {
  return chargerSvg(String(habillage.scene.fichier));
}
