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
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CodeRegion, EtatMonde, EtatRegion, IdNoeud } from '@pierre/partage';
import { etatAfficheRegion, regionsOuvertes } from '@pierre/partage/monde';
import { lireMonde, lireProgression, lirePaquetNoeud, urlAsset } from '../api/client.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { CheminEncre } from '../monde/CheminEncre.js';
import { Parchemin } from '../monde/Parchemin.js';
import { VoileGrisaille } from '../monde/VoileGrisaille.js';

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
 * Les ancres de chaque région, en unités `viewBox`, **dans l'ordre de la progression**.
 *
 * Ce sont les MÊMES centres que ceux des six formes de `carte-monde.svg` : le décor porte les
 * formes, cette table porte les prises. Les faire diverger décalerait le tap du dessin, ce qui
 * ne se verrait qu'à l'usage — d'où `tests/visuel/carte.spec.ts`, qui les photographie ensemble.
 */
const ANCRES: readonly (readonly [CodeRegion, number, number, string])[] = [
  ['clairiere', 190, 640, 'La Clairière'],
  ['galeries', 450, 460, 'Les Galeries'],
  ['marais-jumeau', 240, 240, 'Le Marais Jumeau'],
  ['foret-muette', 620, 150, 'La Forêt Muette'],
  ['volcan', 900, 340, 'Le Volcan'],
  ['cite-des-histoires', 1020, 630, 'La Cité des Histoires']
];

/** Rayon de la prise tactile, en unités `viewBox`. 64 unités ≈ 64 px CSS à l'échelle de rendu. */
const RAYON_PRISE = 46;

/** Rayon du sceau visible. Plus petit que la prise : le territoire se voit à travers. */
const RAYON_SCEAU = 34;

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
const CORPS_NOM = 22;

/** Chasse moyenne mesurée du corps ci-dessus : ≈ 0,52 em pour Andika et Atkinson. */
const CHASSE_NOM = 12.5;

/** Marge intérieure du cartouche, de part et d'autre du nom. */
const MARGE_NOM = 30;

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
      const noeuds = region?.noeuds ?? [];
      if (noeuds.length === 0) {
        return { noeud: null, rang: 0 };
      }
      const index = noeuds.findIndex((noeud) => !noeudsFaits.has(String(noeud)));
      const choisi = index === -1 ? 0 : index;
      return { noeud: noeuds[choisi] ?? null, rang: choisi + 1 };
    },
    [noeudsFaits]
  );

  /**
   * Le chemin d'encre avance SEGMENT PAR SEGMENT — v2 § 9.4, contrat v4 § 2, point 4 de M7.
   *
   * « … et le chemin qui se dessine à l'encre au fur et à mesure. »
   *
   * L'ancienne formule prenait la moyenne des six recolorations. Elle avançait donc d'un
   * sixième de sixième à chaque nœud, uniformément, et ne montrait JAMAIS un segment se
   * fermer : l'enfant voyait un trait grandir sans jamais atteindre la région suivante.
   *
   * Le chemin relie six étapes par CINQ segments, et le segment `i` est la route que l'on
   * quitte : il s'encre à mesure que la région `i` se rallume, et il est complet quand elle
   * l'est. D'où la moyenne sur les CINQ PREMIÈRES régions — la sixième n'a pas de route qui
   * en parte. Terminer la Clairière remplit exactement le premier cinquième et pose l'encre
   * jusqu'aux Galeries : le geste de l'enfant et le dessin disent la même chose.
   *
   * C'est une DÉRIVÉE de la progression, jamais un état à part : rien à synchroniser, rien
   * qui puisse mentir, rien à remettre à zéro — le chemin ne se dépeint pas (R14).
   */
  const avancement = useMemo(() => {
    const depart = ANCRES.slice(0, -1)
      .map(([code]) => parCode.get(String(code)))
      .filter((region): region is EtatRegion => region !== undefined);
    if (depart.length === 0) {
      return 0;
    }
    return (
      depart.reduce((total, region) => total + region.pourcentageColorie, 0) / (ANCRES.length - 1)
    );
  }, [parCode]);

  const entrer = useCallback(
    (noeud: IdNoeud): void => {
      void lirePaquetNoeud(noeud).then((paquet) => {
        magasin.getState().demarrerNoeud(paquet);
      });
    },
    [magasin]
  );

  return (
    <main
      data-ecran="carte"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

      <Parchemin>
        {/* Le décor. Absent, la carte le dit calmement et reste utilisable — jamais d'erreur. */}
        {requeteDecor.data === undefined ? (
          <text x="600" y="400" textAnchor="middle" fontSize="36" fill="var(--trait)">
            On déplie la carte…
          </text>
        ) : (
          /* Le décor est un fichier de contenu DU DÉPÔT, servi par le serveur local : il n'y a
             ni tiers, ni saisie utilisateur dans ce balisage. */
          <g data-decor="carte" dangerouslySetInnerHTML={{ __html: requeteDecor.data }} />
        )}

        <CheminEncre
          etapes={ANCRES.map(([, x, y]) => [x, y] as const)}
          avancement={avancement}
          animationsDesactivees={animationsDesactivees}
        />

        {/*
          LE VOILE, RÉGION PAR RÉGION. Il n'intercepte jamais le tap.

          C'est ici que les trois rendus se jouent vraiment, et pas seulement sur le sceau :
            • `voilee`   — la région n'est pas commencée, le voile est plein, la brume bouge ;
            • `ouverte`  — le voile s'efface EXACTEMENT à la mesure de ce qui est rallumé, donc
                           ce qu'on voit est le VIDE restant (D25, point 3) ;
            • `terminee` — le voile tombe à zéro et la couleur du territoire claque, entière.
          Le voile épouse la silhouette par un `<use href="#<région>">` : les signes d'ambiance
          de la v3 sont détourés par cette même silhouette, donc le voile couvre exactement ce
          que le dessin remplit — aucun ornement ne dépasse du brouillard.
        */}
        {requeteDecor.data === undefined
          ? null
          : ANCRES.map(([code]) => {
              const region = parCode.get(String(code));
              const opacite = region === undefined ? 1 : 1 - region.pourcentageColorie;
              return (
                <VoileGrisaille
                  key={`voile-${String(code)}`}
                  forme={String(code)}
                  opacite={opacite}
                  animationsDesactivees={animationsDesactivees}
                />
              );
            })}

        {/* Les prises : une par région, toujours présentes, jamais désactivées. */}
        {ANCRES.map(([code, x, y, libelle]) => {
          const region = parCode.get(String(code));
          const etat = region === undefined ? 'voilee' : etatAfficheRegion(region);
          const ouverte = jouables.has(String(code));
          const premierNoeud = reprise(region).noeud;
          const rendu = RENDUS[etat];
          const colorie = region?.pourcentageColorie ?? 0;
          const nom = cartouche(x, libelle);

          return (
            <g key={String(code)} data-region={String(code)} data-region-etat={etat}>
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
                    entrer(premierNoeud);
                  }
                }}
                onKeyDown={(evenement) => {
                  if (
                    (evenement.key === 'Enter' || evenement.key === ' ') &&
                    ouverte &&
                    premierNoeud !== null
                  ) {
                    entrer(premierNoeud);
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
                  height={32}
                  rx={10}
                  fill="var(--parchemin)"
                  stroke="var(--trait)"
                  strokeWidth={4}
                />
              </g>
              <text
                x={nom.x + nom.largeur / 2}
                y={y + 75}
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
      </Parchemin>

      {/* Ce qu'on peut jouer maintenant. Deux régions en parallèle dès la troisième (v2 § 3.3). */}
      <section aria-label="Où aller">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Où veux-tu aller&nbsp;?
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
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
                    entrer(noeudDeReprise);
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
                {/* Dire COMBIEN il y en a, et où on en est. Le père a demandé « je n'ai eu
                    qu'un exercice, est-ce normal ? » : une région qui annonce son étape répond
                    à la question avant qu'elle ne se pose. Aucun chiffre n'est en dur — ils
                    viennent tous des nœuds déclarés par `contenu/monde/regions.json`. */}
                <span style={{ fontSize: '1rem' }}>
                  {noeudDeReprise === null
                    ? 'Le chemin se dessine encore…'
                    : `Étape ${String(rang)} sur ${String(total)} — tape pour entrer`}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
