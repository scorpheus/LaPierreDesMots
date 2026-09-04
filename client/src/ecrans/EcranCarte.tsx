// La carte du monde — l'élément signature de la v2 § 9.4. Lot L2-F, repris par M7.
//
// « Dessinée comme une carte au trésor sur parchemin, avec les régions conquises en couleur, les
// régions grises encore voilées d'un brouillard mouvant, et le chemin qui se dessine à l'encre au
// fur et à mesure. C'est l'écran qu'on ouvre en premier, celui qu'on montre à ses parents. »
//
// Quatre règles, et aucune n'est cosmétique :
//
//   1. **Une région voilée reste TAPABLE.** Le voile n'est pas un verrou : on peut toujours aller
//      voir. Ce qui n'est pas encore ouvert ne se joue pas, mais il se regarde, et l'écran le dit
//      avec une phrase — jamais avec un cadenas, jamais avec du rouge (R14).
//   2. **Le vide restant se montre.** La part non recoloriée de chaque région est ce que la carte
//      donne à voir (D25, point 3) : c'est le moteur de retour du jeu.
//   3. **Le décor s'agite, le texte jamais.** Le brouillard bouge ; les noms de région sont posés
//      sur parchemin, dans leur cartouche, et ne bougent pas (v2 § 9.3).
//   4. **Aucune géométrie n'est écrite deux fois.** Le dessin vient de
//      `contenu/habillages/carte/carte-monde-v3.svg` ; cet écran n'y ajoute que les prises
//      tactiles et les trois rendus d'état. Tant que l'asset n'est pas là, la carte annonce
//      qu'elle se déplie — jamais un écran d'erreur.
//
// ── CE QUE M7 A CHANGÉ, ET POURQUOI ─────────────────────────────────────────────────────────
// L'écran servait `carte-monde-v2.svg` — six aplats — et il n'exploitait presque rien de
// `EtatAfficheRegion` : les trois états ne se distinguaient que par une épaisseur de trait, 6
// contre 3. Trois choses ont donc bougé ici, et rien d'autre :
//   • le décor servi passe à la v3 (voir `SVG_CARTE`) ;
//   • les trois états reçoivent trois RENDUS déclarés en table (voir `RENDUS`) ;
//   • le chemin d'encre avance segment par segment au lieu d'une moyenne uniforme.
// Le contrat DOM ne bouge pas : `data-ecran`, `data-region`, `data-region-etat`, `data-depart`,
// `data-vers`, les libellés accessibles et la garde « une prise n'existe que si elle répond »
// sont repris à l'identique — ce sont les prises de six suites de tests.
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  CodeCompagnon,
  CodeRegion,
  Compagnon,
  EtatMonde,
  EtatRegion,
  IdNoeud
} from '@pierre/partage';
import {
  conclusionCentraleAccessible,
  etatAfficheRegion,
  regionsOuvertes
} from '@pierre/partage/monde';
import {
  composerSortie,
  lireMonde,
  lireProgression,
  lirePaquetNoeud,
  urlAsset
} from '../api/client.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { CheminEncre } from '../monde/CheminEncre.js';
import { CarteRasterProgression } from '../monde/CarteRasterProgression.js';
import { Parchemin } from '../monde/Parchemin.js';
import { repriseDeRegion } from '../monde/reprise.js';
import { SpriteCompagnon } from '../composants/SpriteCompagnon.js';

/**
 * Le chemin du décor de la carte, relatif à `contenu/`.
 *
 * ── PASSAGE À LA v3 — lot M7, contrat du monde v4 § 2 ───────────────────────────────────────
 * La v2 avait gagné le bon combat : six silhouettes distinctes là où la v1 en dessinait six
 * identiques. Elle restait pourtant **six aplats** — ni relief, ni arbre, ni grotte, ni eau.
 * La v3 dessine les six territoires, avec les signes d'ambiance de la v2 § 3.3, sur un
 * parchemin qui a enfin l'air d'un parchemin (grain, pliures, brûlures d'angle, rose des vents).
 *
 * Le passage est sûr, et c'est MESURÉ, pas supposé — `node scripts/verifier-carte-monde.mjs` :
 *   • même `viewBox` `0 0 1200 800`, donc la table `ANCRES` ci-dessous reste juste au pixel ;
 *   • mêmes six identifiants de région, dans le même ordre ;
 *   • mêmes six centres de marqueur, écart mesuré **0 unité** ;
 *   • mêmes cinq segments de chemin, `id` et `d` repris octet pour octet.
 *
 * Les v1 et v2 restent sur le disque : rien n'est supprimé, et
 * `tests/unitaires/ids-regions-stables.test.ts` continue de les comparer l'une à l'autre.
 *
 * DETTE ASSUMÉE, consignée dans `Docs/questions-en-attente.md` : ce chemin est ici ET dans
 * `contenu/monde/regions.json` (`scene.fichier`). Le lire depuis le monde supprimerait la
 * duplication (convention C5), mais `scene` n'est exposée ni par `partage/src/monde/types.ts`
 * ni par le dépôt serveur — mesuré : `grep -n "scene" partage/src/monde/types.ts
 * serveur/src/depots/monde.ts` ne rend aucune ligne. Et surtout **`regions.json` appartient à
 * M2**, pas à M7 (contrat du monde v4 § 2, tableau des livrables de M7) : M7 n'y écrit pas.
 * Tant que M2 n'a pas repointé `scene.fichier`, `npm run test:contenu` verra la v3 comme un
 * SVG que personne ne déclare — **et c'est le bon comportement** : la chaîne dit la vérité
 * plutôt que d'être verte à bon compte (D39). L'enfant, lui, voit bien la v3 : c'est cette
 * ligne-ci qui décide de ce qui est servi.
 */
const SVG_CARTE = 'habillages/carte/carte-monde-v3.svg';

/**
 * La carte illustrée validée par le parent le 2 septembre 2026.
 *
 * Variante dédiée de l'image d'ouverture : les deux biomes surnuméraires du bord supérieur ont
 * été fondus dans un arrière-plan brumeux afin que seules les six régions jouables se lisent
 * comme des destinations. L'image d'ouverture originale reste intacte.
 */
const RASTER_CARTE = 'assets/decors/carte-six-regions.png';

/** Portrait courant de Gobi dans le choix de départ : son évolution doit rester visible ici. */
const ASSET_GOBI_PAR_STADE: Readonly<Record<string, string>> = {
  oeuf: 'assets/gobi/stades/stade-1.webp',
  fissure: 'assets/gobi/stades/stade-2.webp',
  boule: 'assets/gobi/stades/stade-3.webp',
  'premier-cristal': 'assets/gobi/stades/stade-4.webp',
  crete: 'assets/gobi/stades/stade-5.webp',
  couronne: 'assets/gobi/stades/stade-6.webp',
  equipe: 'assets/gobi/stades/stade-7.webp',
  besace: 'assets/gobi/stades/stade-8.webp',
  veilleur: 'assets/gobi/stades/stade-9.webp',
  gardien: 'assets/gobi/stades/stade-10.webp'
};

/**
 * Les ancres de chaque région, en unités `viewBox`, **dans l'ordre de la progression**.
 *
 * Elles sont mesurées sur `carte-six-regions.png` (1536 × 1024), transposées dans le `viewBox`
 * 1200 × 800.
 * Les précédentes coordonnées venaient de l'ancien SVG : les prises se posaient donc loin des
 * paysages raster. Cette table est maintenant la source commune des prises, du chemin et du
 * réveil coloré — une évolution de l'illustration ne peut plus déplacer l'un sans les autres.
 */
const ANCRES: readonly (readonly [CodeRegion, number, number, string])[] = [
  ['clairiere', 600, 690, 'La Clairière'],
  ['galeries', 990, 560, 'Les Galeries'],
  ['marais-jumeau', 1040, 370, 'Le Marais Jumeau'],
  ['foret-muette', 990, 150, 'La Forêt Muette'],
  ['volcan', 165, 590, 'Le Volcan'],
  ['cite-des-histoires', 160, 395, 'La Cité des Histoires']
];

/** Rayon de la prise tactile, en unités `viewBox`. 64 unités ≈ 64 px CSS à l'échelle de rendu. */
/* 50 unités restent 65 px CSS quand la carte tient dans les 800 px de la tablette. À 46, la
   même prise tombait à 60 px : visible et fonctionnelle, mais sous le minimum tactile R16. */
const RAYON_PRISE = 50;

/** Rayon du sceau visible. Plus petit que la prise : le territoire se voit à travers. */
const RAYON_SCEAU = 34;

/** La Pierre des Mots est la destination de conclusion, au centre de la carte. */
const ANCRE_CONCLUSION = [600, 470] as const;

/**
 * LES TROIS RENDUS D'UNE RÉGION — contrat du monde v4 § 2, point 3 de M7.
 *
 * « M7 lui donne trois RENDUS, pas trois teintes. » Le modèle porte l'état depuis longtemps
 * (`EtatAfficheRegion`, `partage/src/monde/carte.ts:344`) ; l'écran, lui, n'en faisait presque
 * rien — une épaisseur de trait à 6 au lieu de 3, et c'est tout. Un enfant de sept ans ne lit
 * pas trois pixels d'épaisseur.
 *
 * Chaque état se distingue donc par TROIS signaux simultanés, et aucun n'est une nuance de la
 * même chose :
 *
 *   voilee    sceau creux, cerclé de tirets, sans remplissage — « rien à toucher ici, encore ».
 *             Le brouillard de `VoileGrisaille` couvre la région entière : c'est LUI le signal
 *             principal, le sceau ne fait que ne pas mentir. Aucun cadenas, aucun rouge (R14).
 *   ouverte   sceau plein sur parchemin, anneau épais, et une JAUGE annulaire qui montre le
 *             VIDE restant plutôt que l'acquis (D25, point 3). C'est l'état qui appelle.
 *   terminee  double anneau et étoile-Éclat dorée. La couleur du territoire est entièrement
 *             revenue sous le sceau : « quand la couleur revient, elle doit CLAQUER ».
 *
 * Les trois sont déclarés en TABLE plutôt qu'en cascade de ternaires : un état ajouté au
 * modèle ferait alors une erreur de type ici, au lieu de retomber silencieusement sur le rendu
 * du dernier `else` — c'est-à-dire de dessiner « ouverte » pour un état qu'on n'a pas prévu.
 */
interface RenduRegion {
  /** Opacité du remplissage du sceau. Zéro = on voit le territoire à travers. */
  readonly fondSceau: number;
  /** Épaisseur de l'anneau, en unités `viewBox`. */
  readonly epaisseurAnneau: number;
  /** Tirets de l'anneau, ou `undefined` pour un trait plein. */
  readonly tiretsAnneau: string | undefined;
  /** Un second anneau, dehors : le signe que la région est close pour de bon. */
  readonly doubleAnneau: boolean;
  /** L'étoile-Éclat, dorée, au centre du sceau. */
  readonly etoile: boolean;
  /** La jauge annulaire du VIDE restant. Inutile sur une région voilée (rien n'est commencé). */
  readonly jauge: boolean;
}

const RENDUS: Readonly<Record<'voilee' | 'ouverte' | 'terminee', RenduRegion>> = {
  voilee: {
    fondSceau: 0,
    epaisseurAnneau: 4,
    tiretsAnneau: '10 9',
    doubleAnneau: false,
    etoile: false,
    jauge: false
  },
  ouverte: {
    fondSceau: 0.72,
    epaisseurAnneau: 8,
    tiretsAnneau: undefined,
    doubleAnneau: false,
    etoile: false,
    jauge: true
  },
  terminee: {
    fondSceau: 0.55,
    epaisseurAnneau: 8,
    tiretsAnneau: undefined,
    doubleAnneau: true,
    etoile: true,
    jauge: false
  }
};

/** L'étoile-Éclat du sceau d'une région terminée, en unités `viewBox`, centrée sur l'origine. */
const ETOILE_ECLAT =
  'M0,-22 L6.5,-7 L22,-6 L10,4 L14,20 L0,11 L-14,20 L-10,4 L-22,-6 L-6.5,-7 Z';

/** Corps du nom de région, en unités `viewBox`. */
/**
 * R23 — LE NOM DES TERRITOIRES, AGRANDI. Demandé le 2026-08-03 : « il faudrait que le nom des
 * monde soit un peu plus grand ».
 *
 * La carte est « l'écran qu'on ouvre en premier, celui qu'on montre à ses parents » (v2 § 9.4),
 * et son nom de territoire y était plus petit qu'un texte courant.
 *
 * **34 et non 40, et le choix est mesuré.** Les six cartouches ont été calculés pour chaque
 * corps de 22 à 36, et confrontés à deux choses : entre eux, et aux six PRISES tactiles de
 * rayon 46 :
 *
 *     corps  22 24 26 28 30 32 34 36  →  chevauchements entre cartouches : 0 partout
 *     corps  30 32 34 36              →  conflits avec les prises voisines : aucun
 *
 * Rien ne se chevauche même à 36 — les ancres sont largement séparées. On s'arrête donc à 34,
 * un cran sous la dernière valeur éprouvée : un nom plus long ajouté demain (une région
 * renommée) garde ainsi de la marge avant de toucher la prise du voisin, et une prise
 * recouverte serait un tap qui n'arrive pas.
 */
const CORPS_NOM = 34;

/** Chasse moyenne mesurée : ≈ 0,52 em pour Andika et Atkinson, donc proportionnelle au corps. */
const CHASSE_NOM = (12.5 * CORPS_NOM) / 22;

/** Marge intérieure du cartouche, de part et d'autre du nom. Proportionnelle, comme la chasse. */
const MARGE_NOM = (30 * CORPS_NOM) / 22;

/** Hauteur du cartouche. Elle suit le corps, sinon le nom déborderait de son propre cadre. */
const HAUTEUR_NOM = (32 * CORPS_NOM) / 22;

/**
 * Le cartouche du nom, borné au parchemin.
 *
 * « La Cité des Histoires » fait vingt et un signes : sans borne, son cartouche sortirait du
 * papier par la droite et le nom se lirait à moitié. On le recentre plutôt que de le tronquer
 * — un nom coupé est une consigne écrite qu'on ne peut pas lire, et l'enfant déchiffre encore.
 */
function cartouche(x: number, libelle: string): { readonly x: number; readonly largeur: number } {
  const largeur = libelle.length * CHASSE_NOM + MARGE_NOM;
  const gauche = Math.min(Math.max(x - largeur / 2, 26), 1174 - largeur);
  return { x: gauche, largeur };
}

/** Retire l'enveloppe `<svg>` d'un fichier pour pouvoir l'insérer dans un autre. */
export function interieurDuSvg(texte: string): string {
  return texte.replace(/^[\s\S]*?<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
}

export interface ProprietesEcranCarte {
  /**
   * Ouvre le campement. Fournie par `routeur.tsx`, qui est le SEUL endroit du client à connaître
   * les chemins — `EtatMagasin.ecran` ne porte que les cinq codes du contrat v1 § 7.1, et le
   * campement comme le coffre n'en font pas partie (défaut du contrat gelé, signalé au rapport).
   */
  readonly surAllerCampement?: () => void;
  /**
   * AJOUT N4 — ouvre la séquence d'ouverture (D35). Même disposition que ci-dessus : l'écran ne
   * connaît aucun chemin, il reçoit un rappel.
   */
  readonly surVoirOuverture?: () => void;
}

export function EcranCarte({
  surAllerCampement,
  surVoirOuverture
}: ProprietesEcranCarte = {}): ReactElement {
  const magasin = useMagasin();
  const profil = useEtatJeu((etat) => etat.profil);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  const [rasterIndisponible, fixerRasterIndisponible] = useState(false);
  const [destinationDemandee, fixerDestinationDemandee] = useState<{
    readonly region: CodeRegion;
    readonly noeudDeRepli: IdNoeud;
    readonly libelle: string;
  } | null>(null);
  const [compagnonChoisi, fixerCompagnonChoisi] = useState<CodeCompagnon | null>(null);
  const [conclusionOuverte, fixerConclusionOuverte] = useState(false);

  const requeteMonde = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Monde demandé sans profil choisi.');
      }
      return lireMonde(profil.id);
    },
    enabled: profil !== null
  });

  /**
   * Ce qui est déjà terminé, nœud par nœud.
   *
   * ── POURQUOI CETTE REQUÊTE EXISTE (lot C4) ────────────────────────────────────────────────
   * Cet écran entrait sur `region.noeuds[0]`, en dur, aux deux endroits qui font entrer dans
   * une région. Tant que la Clairière n'avait qu'un nœud, c'était juste par accident. La v2
   * § 5.2 en demande « 4 à 6 enchaînés » et ils sont désormais livrés : sans cette lecture,
   * l'enfant rejouerait indéfiniment le premier et les quatre autres seraient du contenu écrit,
   * validé, et invisible — exactement le défaut que le père a signalé, en plus grand.
   *
   * La clé `['progression', profil]` est celle qu'`EcranRecompense` invalide déjà après chaque
   * tentative enregistrée : la carte se remet donc à jour toute seule au retour du nœud, sans
   * qu'aucun autre écran n'ait à changer.
   * ─────────────────────────────────────────────────────────────────────────────────────────
   */
  const requeteProgression = useQuery({
    queryKey: ['progression', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Progression demandée sans profil choisi.');
      }
      return lireProgression(profil.id);
    },
    enabled: profil !== null
  });

  const requeteDecor = useQuery({
    queryKey: ['carte', 'decor'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset(SVG_CARTE), { headers: { Accept: 'image/svg+xml' } });
      if (!reponse.ok) {
        throw new Error(`Décor de carte introuvable (réponse ${String(reponse.status)}).`);
      }
      return interieurDuSvg(await reponse.text());
    }
  });

  const monde: EtatMonde | null = requeteMonde.data ?? null;
  const regions: readonly EtatRegion[] = monde?.carte.regions ?? [];
  const conclusionAccessible = monde !== null && conclusionCentraleAccessible(monde.carte);
  const jouables = useMemo(
    () => new Set(monde === null ? [] : regionsOuvertes(monde.carte).map((code) => String(code))),
    [monde]
  );

  const parCode = useMemo(
    () => new Map(regions.map((region) => [String(region.region), region])),
    [regions]
  );

  const noeudsFaits = useMemo(
    () => new Set((requeteProgression.data ?? []).map((ligne) => String(ligne.noeud))),
    [requeteProgression.data]
  );
  const compagnonsRallies: readonly Compagnon[] = useMemo(
    () => (monde?.compagnons ?? []).filter((compagnon) => compagnon.rallieLe !== null),
    [monde]
  );

  /**
   * Où reprendre dans une région : le premier nœud non terminé.
   *
   * **Il n'y a jamais de `null` quand la région porte des nœuds.** Une région entièrement
   * terminée renvoie sur son premier nœud plutôt que sur rien : un acquis n'est jamais repris
   * (R14), rejouer est gratuit, et une prise qui cesserait de répondre serait un état sans
   * issue — le pire défaut possible ici.
   */
  const reprise = useCallback(
    (region: EtatRegion | undefined): { readonly noeud: IdNoeud | null; readonly rang: number } => {
      // La règle vit dans `monde/reprise.ts`, partagée avec l'écran de récompense. Elle était
      // ici seule ; l'y laisser aurait obligé le bouton « exercice suivant » à la recopier, et
      // deux règles pour un même choix finissent toujours par proposer deux nœuds différents.
      return repriseDeRegion(region?.noeuds ?? [], noeudsFaits);
    },
    [noeudsFaits]
  );

  /**
   * Le chemin d'encre avance ROUTE PAR ROUTE — v2 § 9.4, contrat v4 § 2, point 4 de M7,
   * corrigé par S4.
   *
   * « … et le chemin qui se dessine à l'encre au fur et à mesure. »
   *
   * Le chemin relie six étapes par CINQ routes, et la route `i` est celle que l'on quitte :
   * elle s'encre à mesure que la région `i` se rallume, et elle est complète quand la région
   * l'est. La sixième région n'a pas de route qui en parte — d'où les cinq premières seulement.
   *
   * ── POURQUOI CINQ VALEURS ET NON PLUS UNE MOYENNE ─────────────────────────────────────────
   * M7 passait déjà la moyenne des cinq régions, et cet écran affirmait ici que « terminer la
   * Clairière remplit exactement le premier cinquième ». C'était faux : `CheminEncre` posait
   * cette fraction sur un tracé unique en `pathLength=1`, donc sur la LONGUEUR TOTALE, ce qui
   * suppose cinq routes de même longueur. Mesuré — `node bac-a-sable/s4-carte/mesurer-geometrie.mjs` :
   *
   *   longueurs d arc des 5 segments  321,4 · 308,0 · 396,3 · 343,3 · 315,1  (± 17,7 %)
   *   écart max entre l encre posée et le marqueur visé : 0,026 de la longueur totale, ≈ 44 u
   *
   * Quarante-quatre unités, c'est deux fois le rayon d'un marqueur : l'encre d'une région finie
   * dépassait sur la route suivante, celle d'une autre s'arrêtait avant d'arriver. Chaque route
   * porte donc maintenant SA part, et l'hypothèse d'égalité disparaît au lieu d'être corrigée.
   *
   * C'est une DÉRIVÉE de la progression, jamais un état à part : rien à synchroniser, rien
   * qui puisse mentir, rien à remettre à zéro — le chemin ne se dépeint pas (R14).
   */
  const partsDuChemin = useMemo(
    () =>
      ANCRES.slice(0, -1).map(([code]) => {
        const region: EtatRegion | undefined = parCode.get(String(code));
        return region?.pourcentageColorie ?? 0;
      }),
    [parCode]
  );

  const [regionEnChargement, fixerRegionEnChargement] = useState<CodeRegion | null>(null);
  const entrer = useCallback(
    (
      codeRegion: CodeRegion,
      noeudDeRepli: IdNoeud,
      compagnon: CodeCompagnon | null
    ): void => {
      if (profil === null || regionEnChargement !== null) return;
      fixerRegionEnChargement(codeRegion);
      void composerSortie(profil.id, { region: String(codeRegion), compagnon })
        .then(async (plan) => {
          const premiere = plan.etapes[0];
          if (premiere === undefined) {
            throw new Error('La sortie composée ne porte aucune étape.');
          }
          const paquet = await lirePaquetNoeud(premiere.noeud);
          magasin.getState().demarrerSortie(plan);
          magasin.getState().demarrerNoeud(paquet);
        })
        .catch(() => {
          // Repli R14 : si le composeur est momentanément indisponible, la prise continue de
          // mener au nœud que la carte annonçait. Le trajet pédagogique reste le chemin nominal.
          magasin.getState().cloreSortie();
          return lirePaquetNoeud(noeudDeRepli).then((paquet) => {
            magasin.getState().demarrerNoeud(paquet);
          });
        })
        .finally(() => {
          fixerRegionEnChargement(null);
        });
    },
    [magasin, profil, regionEnChargement]
  );

  const proposerDepart = useCallback(
    (region: CodeRegion, noeudDeRepli: IdNoeud, libelle: string): void => {
      if (regionEnChargement !== null) return;
      fixerDestinationDemandee({ region, noeudDeRepli, libelle });
      fixerCompagnonChoisi(compagnonsRallies[0]?.code ?? null);
    },
    [compagnonsRallies, regionEnChargement]
  );

  const prochainDeblocage = useMemo(() => {
    const verrouillee = [...regions]
      .sort((gauche, droite) => gauche.ordre - droite.ordre)
      .find((une) => !une.ouverte && une.noeuds.length > 0);
    if (verrouillee === undefined) return null;
    const precedente = [...regions]
      .sort((gauche, droite) => gauche.ordre - droite.ordre)
      .find((une) => une.ordre === verrouillee.ordre - 1);
    return {
      region: verrouillee.region,
      precedente: precedente?.region ?? null,
      restant: precedente === undefined ? null : Math.max(0, precedente.noeuds.length - precedente.noeuds.filter((noeud) => noeudsFaits.has(String(noeud))).length),
    };
  }, [regions, noeudsFaits]);

  return (
    <main
      data-ecran="carte"
      className="ecran-carte"
      // R20 — l'écran prend la hauteur du cadre, et c'est le parchemin qui s'adapte au reste.
      // Mesuré avant : 1276 px pour un cadre de 1200, parce que le parchemin se dimensionne par
      // sa largeur et laisse sa hauteur suivre le rapport d'aspect.
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        blockSize: '100dvh'
      }}
    >
      <header className="entete-carte" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          La carte du monde
        </h1>
        <button
          type="button"
          className="cible"
          data-vers="campement"
          aria-label="Revenir au campement"
          onClick={surAllerCampement}
        >
          Le campement
        </button>
        <button
          type="button"
          className="cible"
          onClick={() => {
            magasin.getState().quitterProfil();
          }}
          aria-label="Changer de joueur"
        >
          Changer de joueur
        </button>
      </header>

      {/*
        ══════════════════════════════════════════════════════════════════════════════════════
        LA PHRASE QUE LE PÈRE N'A PAS COMPRISE — D35, corrigée par N4.

        Mesurée au contrat de finition v3 § 4.4 comme le SEUL texte enfant fautif du client :

          $ grep -rniE "en gris|perdu|il manque" client/src --include=*.tsx
          client/src/ecrans/EcranCarte.tsx:153: Bonjour {profil.prenom} ! Le monde t’attend en gris.

        Retour de l'essai, mot pour mot : « je n'ai pas compris la phrase "le monde t'attend en
        gris", c'est pas joyeux pour l'instant ». Sans le récit qui la précède, elle énonce une
        PERTE et ne donne rien à faire.

        La correction est celle que D35 écrit lui-même — « c'est exactement le même fait,
        retourné de l'absence vers le pouvoir d'agir » : le constat reste (il est vrai, et le
        gris EST le mécanisme du jeu), mais la phrase se referme sur le geste de l'enfant.
        `enonceUnePerte` accepte désormais ce texte pour cette raison précise, et pour aucune
        autre : `tests/unitaires/ton-sans-perte.test.ts` refuserait la première moitié seule.
        ══════════════════════════════════════════════════════════════════════════════════════
      */}
      <div className="introduction-carte">
      {profil === null ? null : (
        <p style={{ margin: 0, fontSize: '1.125rem' }}>
          Bonjour {String(profil.prenom)}&nbsp;! Le monde t’attend en gris&nbsp;: tu peux lui
          rendre ses couleurs.
        </p>
      )}

      {/*
        L'ENTRÉE DU RÉCIT — D35, point 3 : « rejouable ; un enfant qui n'a pas suivi la
        première fois doit pouvoir y revenir SEUL ».

        Elle est ici, juste sous la phrase qu'elle explique, et non rangée dans un menu. C'est
        la contrepartie assumée de l'arbitrage de N4 (voir `routeur.tsx`) : la séquence n'est
        JAMAIS imposée — D46 point 3 l'interdit — donc son entrée doit être immédiatement
        trouvable, sans quoi elle n'existerait que sur le papier. Le libellé nomme l'histoire,
        pas un réglage : un enfant de sept ans tape ce qu'il comprend.
      */}
      {surVoirOuverture === undefined ? null : (
        <button
          type="button"
          className="cible cible-secondaire"
          data-vers="ouverture"
          aria-label="Écouter l’histoire de la Pierre"
          onClick={surVoirOuverture}
          style={{ alignSelf: 'start' }}
        >
          L’histoire de la Pierre
        </button>
      )}
      {prochainDeblocage === null ? null : (
        <p
          data-prochain-deblocage="oui"
          className="zone-lecture"
          style={{ margin: '0.65rem 0 0', fontSize: '1.05rem' }}
        >
          La prochaine région s’ouvrira quand la région actuelle sera entièrement coloriée.
          {prochainDeblocage.restant === null ? null : ` Il reste ${String(prochainDeblocage.restant)} exercice${prochainDeblocage.restant > 1 ? 's' : ''} à découvrir.`}
        </p>
      )}
      </div>

      <div className="corps-carte">
      {/* R20 — la scène prend ce qui reste, et jamais plus. `data-scene-adaptative` porte la
          règle partagée de `global.css` : `flex: 1`, `min-block-size: 0`, et un SVG borné en
          hauteur ET en largeur. Sans `min-block-size: 0`, un enfant flex refuse de descendre
          sous sa taille de contenu et toute la règle serait inerte. */}
      <div data-scene-adaptative="carte">
      <Parchemin>
        {/* Le PNG validé est le décor principal. Le SVG historique reste dans `<defs>` : ses
            six silhouettes servent encore de repli si l'image ne se charge pas, mais il ne peut
            plus recouvrir le paysage raster que le parent a validé. */}
        {rasterIndisponible ? (
          requeteDecor.data === undefined ? (
            <text x="600" y="400" textAnchor="middle" fontSize="36" fill="var(--trait)">
              On déplie la carte…
            </text>
          ) : (
            <g
              data-decor="carte"
              data-format-decor="svg-repli"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: requeteDecor.data }}
            />
          )
        ) : (
          <CarteRasterProgression
            source={urlAsset(RASTER_CARTE)}
            avancements={ANCRES.map(([region, x, y]) => ({
              region,
              ancre: [x, y] as const,
              pourcentageColorie: parCode.get(String(region))?.pourcentageColorie ?? 0
            }))}
            conclusionActive={conclusionAccessible}
            surErreur={() => {
              fixerRasterIndisponible(true);
            }}
          />
        )}
        {requeteDecor.data === undefined ? null : (
          <defs
            data-definitions-decor="carte"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: requeteDecor.data }}
          />
        )}

        <CheminEncre
          etapes={ANCRES.map(([, x, y]) => [x, y] as const)}
          parts={partsDuChemin}
          animationsDesactivees={animationsDesactivees}
        />

        {/* Les prises : une par région, toujours présentes, jamais désactivées. */}
        {ANCRES.map(([code, x, y, libelle]) => {
          const region = parCode.get(String(code));
          const etat = region === undefined ? 'voilee' : etatAfficheRegion(region);
          const ouverte = jouables.has(String(code));
          const premierNoeud = reprise(region).noeud;
          const rendu = RENDUS[etat];
          const colorie = region?.pourcentageColorie ?? 0;
          // R18 — les mêmes deux nombres que le voile : une seule source, sinon la carte et le
          // halo se contrediraient sous les yeux de l'enfant.
          const paliers = region?.noeuds.length ?? 0;
          const franchis = Math.round(colorie * paliers);
          const nom = cartouche(x, libelle);

          return (
            <g
              key={String(code)}
              data-region={String(code)}
              data-region-etat={etat}
              data-ancre-raster={`${String(x)},${String(y)}`}
            >
              {/*
                ── LE SCEAU, EN TROIS RENDUS ────────────────────────────────────────────────
                Tout ce bloc est DÉCORATIF et ne reçoit jamais le doigt : `aria-hidden` et
                `pointerEvents: none`. La prise tactile est le cercle qui suit, inchangé dans
                son rôle comme dans sa taille (R16). Séparer les deux est ce qui permet de
                rendre le sceau plus petit que la cible : le dessin du territoire reste
                visible sous le marqueur, au lieu d'être masqué par un disque opaque.
              */}
              <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                {rendu.doubleAnneau ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={RAYON_SCEAU + 9}
                    fill="none"
                    stroke="var(--soleil)"
                    strokeWidth={5}
                  />
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={RAYON_SCEAU}
                  fill="var(--parchemin)"
                  fillOpacity={rendu.fondSceau}
                  stroke="var(--trait)"
                  strokeWidth={rendu.epaisseurAnneau}
                  strokeDasharray={rendu.tiretsAnneau}
                />
                {/*
                  LA JAUGE MONTRE LE VIDE — D25, point 3 : « le VIDE restant est ce que la
                  carte donne à voir ». L'arc plein compte donc ce qui RESTE à rallumer, et
                  il disparaît quand la région est finie. `pathLength={1}` rend la fraction
                  lisible telle quelle, sans jamais appeler `getTotalLength()` — qui n'existe
                  pas sous happy-dom et ferait dépendre le dessin de la taille de rendu.
                */}
                {rendu.jauge ? (
                  <circle
                    data-jauge-restant={(1 - colorie).toFixed(2)}
                    cx={x}
                    cy={y}
                    r={RAYON_SCEAU + 6}
                    pathLength={1}
                    fill="none"
                    stroke="var(--grisaille)"
                    strokeWidth={7}
                    strokeLinecap="round"
                    strokeDasharray={`${String(Math.min(1, Math.max(0, 1 - colorie)))} 1`}
                    transform={`rotate(-90 ${String(x)} ${String(y)})`}
                  />
                ) : null}
                {rendu.etoile ? (
                  <path
                    d={ETOILE_ECLAT}
                    transform={`translate(${String(x)} ${String(y)})`}
                    fill="var(--soleil)"
                    stroke="var(--trait)"
                    strokeWidth={4}
                    strokeLinejoin="round"
                  />
                ) : null}
              </g>
              {/*
                ══════════════════════════════════════════════════════════════════════════════
                R18 — L'AVANCEMENT ET L'OUVERTURE SE LISENT SUR LA CARTE, PAS DANS UN PANNEAU.

                Le père : « je ne vois pas vraiment l'évolution de la révélation de la couleur…
                et il faut bien montrer le lien entre les deux, vu que les deux sont bien
                ouverts, on sait pas trop qu'on les a bien ouverts. »

                Le panneau du bas disait déjà « Il reste X % » et « Étape N sur M ». Mais il est
                EN BAS : sur la carte — l'écran qu'on regarde — rien ne distinguait une région
                ouverte d'une autre, et le halo de D51 à 1/12 est petit par construction (une
                douzième part de territoire, c'est le prix des douze paliers qu'il a choisis).

                Deux signaux, et aucun n'est une nuance de l'autre :
                  • un CHIFFRE sous le sceau — « 2/12 » — lisible sans compter les zones ;
                  • un anneau d'ouverture commun aux régions ouvertes, qui les relie à l'œil.

                Le chiffre vient des nœuds réellement livrés (`region.noeuds.length`) et de
                `pourcentageColorie`, jamais d'un compteur tenu à part.
                ══════════════════════════════════════════════════════════════════════════════
              */}
              {!ouverte || paliers === 0 ? null : (
                <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={RAYON_SCEAU + 16}
                    fill="none"
                    stroke="var(--soleil)"
                    strokeWidth={3}
                    strokeOpacity={0.75}
                    strokeDasharray="10 7"
                  />
                  <rect
                    x={x - 34}
                    y={y - RAYON_SCEAU - 42}
                    width={68}
                    height={30}
                    rx={9}
                    fill="var(--parchemin)"
                    stroke="var(--trait)"
                    strokeWidth={3}
                  />
                  <text
                    x={x}
                    y={y - RAYON_SCEAU - 21}
                    textAnchor="middle"
                    fontSize={20}
                    fill="var(--trait)"
                    data-avancement-region={`${String(franchis)}/${String(paliers)}`}
                  >
                    {franchis}/{paliers}
                  </text>
                </g>
              )}
              <circle
                cx={x}
                cy={y}
                r={RAYON_PRISE}
                // Une prise INVISIBLE et pourtant tapable : le sceau ci-dessus porte tout le
                // dessin, celui-ci porte toute la surface. `pointerEvents: all` rend le tap
                // indépendant du remplissage — sans quoi une opacité nulle coûterait la
                // cible, et R16 avec elle.
                fill="var(--parchemin)"
                fillOpacity={0}
                // ── UNE PRISE N'EXISTE QUE SI ELLE RÉPOND ────────────────────────────────
                // Corrigé à l'intégration de la campagne N. Ces pastilles portaient
                // `role="button"` et `tabIndex={0}` sur les SIX régions, alors que le
                // gestionnaire commence par `if (ouverte && premierNoeud !== null)` : les
                // quatre régions voilées étaient donc annoncées « bouton » au lecteur
                // d'écran, atteignables à la tabulation, et strictement inertes au doigt.
                //
                // Mesuré par `parcours-qa-tout-le-site.spec.ts` — quatre contrôles morts :
                //   circle « Le Marais Jumeau — voilee », « La Forêt Muette — voilee »,
                //   « Le Volcan — voilee », « La Cité des Histoires — voilee »
                //
                // Une région voilée est un DÉCOR, pas une commande. On lui retire donc le
                // rôle et le focus plutôt que de lui inventer une réponse : la seule autre
                // issue aurait été un message, et un message dirait à l'enfant ce qui lui
                // manque — exactement ce que la convention C7 et D35 interdisent.
                {...(ouverte && premierNoeud !== null
                  ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      style: { cursor: 'pointer', pointerEvents: 'all' as const }
                    }
                  : { 'aria-hidden': true as const, style: { pointerEvents: 'none' as const } })}
                aria-label={`${libelle} — ${etat}`}
                onClick={() => {
                  if (ouverte && premierNoeud !== null) {
                    proposerDepart(code, premierNoeud, libelle);
                  }
                }}
                onKeyDown={(evenement) => {
                  if (
                    (evenement.key === 'Enter' || evenement.key === ' ') &&
                    ouverte &&
                    premierNoeud !== null
                  ) {
                    proposerDepart(code, premierNoeud, libelle);
                  }
                }}
              />
              {/*
                LE NOM SUR SON CARTOUCHE — « le décor s'agite, le texte JAMAIS » (v2 § 9.3).
                Le décor de la v3 est chargé : un mot posé nu sur des feuillages ou sur une
                coulée de lave se déchiffre mal, et cet enfant déchiffre encore. Le cartouche
                est donc de l'accessibilité, pas de l'ornement — fond parchemin plein, cerné du
                trait, et strictement immobile pendant que la brume bouge autour.
                Sa largeur suit le libellé : rien n'est en dur, rien ne déborde.
              */}
              <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                <rect
                  x={nom.x}
                  y={y + 52}
                  width={nom.largeur}
                  height={HAUTEUR_NOM}
                  rx={10}
                  fill="var(--parchemin)"
                  stroke="var(--trait)"
                  strokeWidth={4}
                />
              </g>
              <text
                x={nom.x + nom.largeur / 2}
                y={y + 52 + HAUTEUR_NOM * 0.72}
                textAnchor="middle"
                fontSize={CORPS_NOM}
                fill="var(--trait)"
                style={{ pointerEvents: 'none' }}
              >
                {libelle}
              </text>
            </g>
          );
        })}
        {conclusionAccessible ? (
          <g data-conclusion-centrale-groupe="pierre">
            <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
              <circle
                cx={ANCRE_CONCLUSION[0]}
                cy={ANCRE_CONCLUSION[1]}
                r={RAYON_SCEAU + 11}
                fill="var(--parchemin)"
                fillOpacity={0.58}
                stroke="var(--soleil)"
                strokeWidth={7}
              />
              <path
                d={ETOILE_ECLAT}
                transform={`translate(${String(ANCRE_CONCLUSION[0])} ${String(ANCRE_CONCLUSION[1])})`}
                fill="var(--soleil)"
                stroke="var(--trait)"
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </g>
            <circle
              data-conclusion-centrale="pierre"
              data-ancre-raster={`${String(ANCRE_CONCLUSION[0])},${String(ANCRE_CONCLUSION[1])}`}
              cx={ANCRE_CONCLUSION[0]}
              cy={ANCRE_CONCLUSION[1]}
              r={RAYON_PRISE}
              fill="var(--parchemin)"
              fillOpacity={0}
              role="button"
              tabIndex={0}
              aria-label="La Pierre des Mots est entière"
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onClick={() => fixerConclusionOuverte(true)}
              onKeyDown={(evenement) => {
                if (evenement.key === 'Enter' || evenement.key === ' ') {
                  fixerConclusionOuverte(true);
                }
              }}
            />
          </g>
        ) : null}
      </Parchemin>
      </div>

      {/* Ce qu'on peut jouer maintenant. Deux régions en parallèle dès la troisième (v2 § 3.3). */}
      <section className="destinations-carte" aria-label="Où aller">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Où veux-tu aller&nbsp;?
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {conclusionAccessible ? (
            <button
              type="button"
              className="cible cible-appel"
              data-depart-conclusion="pierre"
              aria-label="Aller au centre pour réunir la Pierre des Mots"
              onClick={() => fixerConclusionOuverte(true)}
              style={{ flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}
            >
              <span className="titre" style={{ fontSize: '1.375rem' }}>
                La Pierre t’attend !
              </span>
              <span style={{ fontSize: '1rem' }}>
                Tes six Éclats sont réunis. Va au centre.
              </span>
            </button>
          ) : null}
          {/*
            UN DÉPART N'EXISTE QUE S'IL MÈNE QUELQUE PART — D48, et c'est la même règle que
            les pastilles de la carte ci-dessus appliquent déjà.

            Le filtre ne portait que sur `jouables`. Or une région ouverte dont AUCUN nœud
            n'est livré passe ce filtre : elle produisait un bouton « Partir vers Le Marais
            Jumeau » dont l'`onClick` est gardé par `noeudDeReprise !== null` et ne fait donc
            rien. C'est exactement l'indice corrélé que D48 dénonce — « compter les éléments
            interactifs n'est pas compter les sorties ».

            La condition est la MÊME que celle du gestionnaire : ce qui décide de l'affichage
            décide du clic, sinon les deux divergent et le bouton ment à nouveau.
          */}
          {ANCRES.filter(
            ([code]) =>
              jouables.has(String(code)) && reprise(parCode.get(String(code))).noeud !== null
          ).map(([code, , , libelle]) => {
            const region = parCode.get(String(code));
            const { noeud: noeudDeReprise, rang } = reprise(region);
            const total = region?.noeuds.length ?? 0;
            return (
              <button
                key={`depart-${String(code)}`}
                type="button"
                className="cible cible-appel"
                data-depart={String(code)}
                data-etape={rang === 0 ? '' : `${String(rang)}/${String(total)}`}
                aria-label={`Partir vers ${libelle}`}
                onClick={() => {
                  if (noeudDeReprise !== null) {
                    proposerDepart(code, noeudDeReprise, libelle);
                  }
                }}
                style={{ flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}
              >
                <span className="titre" style={{ fontSize: '1.375rem' }}>
                  {libelle}
                </span>
                {/* La jauge montre le VIDE restant, jamais seulement l'acquis (D25, point 3). */}
                <span
                  data-restant={String(
                    Math.round((1 - (region?.pourcentageColorie ?? 0)) * 100)
                  )}
                  style={{ fontSize: '1rem' }}
                >
                  Il reste {Math.round((1 - (region?.pourcentageColorie ?? 0)) * 100)} % à
                  rallumer
                </span>
                {/* Une sortie est composée par le sélecteur pédagogique : son premier nœud
                    n'est donc pas nécessairement le premier nœud inachevé de la région. On ne
                    présente plus `rang/total` comme la longueur de la sortie — ce serait vrai
                    techniquement et faux pour l'enfant. Le compte précis apparaît dans le
                    nœud dès que le plan réel est connu. */}
                <span style={{ fontSize: '1rem' }}>
                  {noeudDeReprise === null
                    ? 'Le chemin se dessine encore…'
                    : 'Plusieurs exercices t’attendent — tape pour partir'}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      </div>

      {conclusionAccessible && conclusionOuverte ? (
        <section
          className="choix-compagnon"
          data-conclusion-pierre="oui"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-conclusion-pierre"
        >
          <div className="choix-compagnon__carte">
            <h2 id="titre-conclusion-pierre" className="titre">
              La Pierre des Mots est entière !
            </h2>
            <p>Tu as rassemblé les six Éclats. Le monde a retrouvé ses couleurs.</p>
            <button
              type="button"
              className="cible cible-appel"
              onClick={() => fixerConclusionOuverte(false)}
            >
              Revoir la carte
            </button>
          </div>
        </section>
      ) : null}

      {destinationDemandee === null ? null : (
        <section
          className="choix-compagnon"
          data-choix-compagnon={String(destinationDemandee.region)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-choix-compagnon"
        >
          <div className="choix-compagnon__carte">
            <button
              type="button"
              className="cible choix-compagnon__fermer"
              aria-label="Fermer le choix d’accompagnant"
              onClick={() => fixerDestinationDemandee(null)}
            >
              Retour
            </button>
            <div className="choix-compagnon__entete">
              <p className="choix-compagnon__destination">
                Départ pour {destinationDemandee.libelle}
              </p>
              <h2 id="titre-choix-compagnon" className="titre">
                Avec qui pars-tu&nbsp;?
              </h2>
              <p>Choisis ton compagnon. Il donnera sa couleur à cette sortie.</p>
            </div>
            <div className="choix-compagnon__liste">
              <button
                type="button"
                className="cible choix-compagnon__tuile"
                data-choisir-compagnon="gobi"
                data-selectionne={compagnonChoisi === null ? 'oui' : 'non'}
                aria-pressed={compagnonChoisi === null}
                onClick={() => fixerCompagnonChoisi(null)}
              >
                <span className="choix-compagnon__portrait" aria-hidden="true">
                  <img
                    src={urlAsset(
                      ASSET_GOBI_PAR_STADE[String(monde?.gobi.stade ?? '')] ??
                        'assets/gobi/stades/stade-1.webp'
                    )}
                    alt=""
                    draggable={false}
                  />
                </span>
                <strong>Gobi</strong>
                <span>Ton guide fidèle</span>
              </button>
              {compagnonsRallies.map((compagnon) => (
                <button
                  key={String(compagnon.code)}
                  type="button"
                  className="cible choix-compagnon__tuile"
                  data-choisir-compagnon={String(compagnon.code)}
                  data-selectionne={compagnonChoisi === compagnon.code ? 'oui' : 'non'}
                  data-animation-compagnon={
                    animationsDesactivees ? 'calme' : String(compagnon.code)
                  }
                  aria-pressed={compagnonChoisi === compagnon.code}
                  onClick={() => fixerCompagnonChoisi(compagnon.code)}
                >
                  <span className="choix-compagnon__portrait" aria-hidden="true">
                    <SpriteCompagnon
                      code={compagnon.code}
                      assetStatique={String(compagnon.asset)}
                    />
                  </span>
                  <strong>{compagnon.libelle}</strong>
                  <span>{compagnon.valeur}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cible cible-appel choix-compagnon__partir"
              data-confirmer-depart
              disabled={regionEnChargement !== null}
              onClick={() => {
                const destination = destinationDemandee;
                fixerDestinationDemandee(null);
                entrer(destination.region, destination.noeudDeRepli, compagnonChoisi);
              }}
            >
              {regionEnChargement === null ? 'Partir à l’aventure' : 'On prépare les sacs…'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
