// Les familles de lecture réellement disponibles hors ligne — lot L2-B, v2 § 9.3 et D19.
//
// « Aucun appel à Google Fonts : tout est servi en WOFF2 depuis le PC. » C'est le seul fichier
// du client qui connaisse les noms de familles CSS et les fichiers embarqués ; `polices.css`
// déclare les `@font-face` correspondants et `scripts/telecharger-polices.mjs` télécharge les
// binaires à l'installation. Les trois listes doivent rester alignées, et
// `tests/visuel/polices.spec.ts` le mesure en comptant les requêtes sortantes : zéro.
//
// PLACEHOLDER assumé : **Verdana n'est pas embarquée** (écart n° 5 du contrat des features).
// C'est une police système propriétaire, non redistribuable. Elle reste proposée — la
// préférence subjective de l'enfant compte pour son adhésion (D19) — et retombe sur Andika
// quand la pile système ne l'a pas.
import type { CodePolice } from "@pierre/partage/lecture";

/**
 * Repli commun à toutes les piles.
 *
 * Andika ferme chaque pile sauf la sienne : c'est la police par défaut de toute zone de lecture
 * (v2 § 9.3), donc le meilleur repli possible quand un fichier manque. `system-ui` ferme la
 * dernière porte — une zone de lecture sans aucune police chargée reste lisible.
 */
export const REPLI_SYSTEME = "system-ui, sans-serif";

/**
 * La pile CSS de chaque code de police. `familleDe` est le seul lecteur de cette table ; les
 * composants ne la manipulent jamais directement.
 */
const PILES: Readonly<Record<CodePolice, string>> = {
  andika: `"Andika", "Atkinson Hyperlegible", Verdana, ${REPLI_SYSTEME}`,
  opendyslexic: `"OpenDyslexic", "Andika", ${REPLI_SYSTEME}`,
  // Verdana d'abord, Andika ensuite : c'est le repli annoncé au contrat, écart n° 5.
  verdana: `Verdana, "Andika", ${REPLI_SYSTEME}`,
};

/** La pile CSS complète d'un code de police. Ne lève jamais : un code inconnu rend Andika. */
export function familleDe(police: CodePolice): string {
  return PILES[police] ?? PILES.andika;
}

/**
 * Les fichiers WOFF2 embarqués, par code de police, avec leur graisse.
 *
 * Servis depuis `client/public/polices/`, sous la base publique du build. Cette table alimente le
 * chargement à la première `ZoneDeLecture` et reste alignée avec les déclarations de `polices.css`.
 * `verdana` n'y figure pas, et c'est le fait mesurable de l'écart n° 5.
 */
export const FICHIERS_EMBARQUES: readonly {
  readonly police: CodePolice;
  readonly famille: string;
  readonly fichier: string;
  readonly graisse: number;
}[] = [
  { police: "andika", famille: "Andika", fichier: "andika-regular.woff2", graisse: 400 },
  { police: "andika", famille: "Andika", fichier: "andika-bold.woff2", graisse: 700 },
  {
    police: "opendyslexic",
    famille: "OpenDyslexic",
    fichier: "opendyslexic-regular.woff2",
    graisse: 400,
  },
];

/** URL d'un fichier de police, servi par le dossier public du client. Jamais un domaine tiers. */
export function urlDePolice(fichier: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}polices/${fichier}`;
}

/**
 * Vrai si la police est réellement disponible dans le document.
 *
 * Sert à l'écran de réglages : proposer Verdana sur une tablette Android qui ne l'a pas serait
 * proposer un choix sans effet. `document.fonts` manque dans certains environnements de test :
 * on répond alors `true` plutôt que `false`, pour ne jamais masquer un choix à cause de
 * l'outillage.
 */
export function policeDisponible(police: CodePolice, document_: Document): boolean {
  // Une police embarquée ne dépend pas de l'inventaire système. `FontFaceSet.check()` peut
  // répondre faux avant son premier chargement effectif, ce qui ajoutait un point « absente »
  // à OpenDyslexic alors que son WOFF2 est servi par l'application.
  if (FICHIERS_EMBARQUES.some((fichier) => fichier.police === police)) {
    return true;
  }
  const jeu: FontFaceSet | undefined = document_.fonts;
  if (jeu === undefined || typeof jeu.check !== "function") {
    return true;
  }
  const premiere = familleDe(police).split(",")[0]?.trim() ?? "";
  try {
    return jeu.check(`16px ${premiere}`);
  } catch {
    return true;
  }
}

/**
 * Précharge les fichiers d'une police, et RÉSOUT MÊME EN CAS D'ÉCHEC.
 *
 * Deux raisons de ne jamais rejeter : `[data-test-pret="oui"]` (contrat v1 § 10) attend
 * `document.fonts.ready`, et un fichier absent ne doit pas laisser la tablette sur un écran
 * vide. `font-display: block` de `polices.css` fait le reste — un court blanc, puis le texte,
 * jamais un remplacement visible en cours de lecture.
 */
export async function prechargerPolice(police: CodePolice, document_: Document): Promise<void> {
  const jeu: FontFaceSet | undefined = document_.fonts;
  if (jeu === undefined || typeof jeu.load !== "function") {
    return;
  }
  const famille = familleDe(police).split(",")[0]?.trim() ?? "";
  if (famille === "") {
    return;
  }
  await Promise.allSettled([jeu.load(`400 16px ${famille}`), jeu.load(`700 16px ${famille}`)]);
}
