/**
 * `MoteurTrace` — le composant hôte du moteur `trace`. Lot L2-C, clôt O11.
 *
 * Il ne décide de RIEN. Toute la règle vit dans `moteurTrace` (paquet `partage`) ; ce
 * composant traduit un `PointerEvent` en `ActionTrace`, fait battre l'horloge, et donne à
 * voir l'état qu'on lui rend.
 *
 * Aucun `data-etat="echec"` n'est émis ici, ni ailleurs (R14).
 *
 * `data-axe` PORTE UN SEUL AXE, JAMAIS DEUX. C'est la traduction mécanique de D23 : un
 * exercice travaille UNE paire, donc UN axe. L'attribut est absent quand l'exercice ne
 * travaille aucune paire — absent, et non `null` ni chaîne vide : un test qui lit deux
 * valeurs séparées par un espace doit échouer, pas passer.
 *
 * AUCUNE COORDINATION FINE (R16). Le couloir de tolérance fait 32 px CSS de demi-largeur,
 * converti ici une seule fois en unités `viewBox` — la logique pure ne connaît que des
 * unités `viewBox`, jamais des pixels.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as PointerEventReact, ReactElement } from 'react';
import type {
  ActionTrace,
  ContenuTrace,
  EchantillonGeste,
  EtatTrace,
  ModeleLettre,
  Point,
} from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { GuidageLettre } from './GuidageLettre.js';
import { PAS_ECHANTILLONNAGE, reechantillonner } from './echantillonnage.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** R15 : « au moins une fois par tranche de 20 s », comme `colorie` et `place`. */
const RELECTURE_MS = 20_000;

/**
 * R16, en pixels CSS. Converti en unités `viewBox` par le facteur d'échelle du SVG.
 *
 * Miroir exact de `TOLERANCE_TRACE_PX` (`partage/src/moteurs/trace/validation.ts`), qui
 * porte la raison du 32 : la zone où le doigt est accepté est un disque de ce RAYON, et
 * CLAUDE.md règle 5 exige 64 px pour toute cible. Les deux valeurs doivent rester égales —
 * un couloir dessiné plus étroit que celui qui est mesuré ferait mentir l'écran.
 */
const TOLERANCE_CSS_PX = 32;

const TRAIT = 'var(--trait, #1B2440)';
const ENCRE = 'var(--encre, #2E5EAA)';

interface MatriceEcranAffine {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

/**
 * Convertit un point client avec l'inverse de la matrice réellement utilisée par le SVG.
 * La boîte englobante inclut les marges de `preserveAspectRatio`; la matrice, elle, décrit
 * uniquement le dessin. C'est donc elle qui doit décider où le doigt a réellement touché.
 */
export function convertirPointClientParMatrice(
  clientX: number,
  clientY: number,
  matrice: MatriceEcranAffine,
): Point | null {
  const determinant = matrice.a * matrice.d - matrice.b * matrice.c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON) return null;
  const x = clientX - matrice.e;
  const y = clientY - matrice.f;
  return [
    (matrice.d * x - matrice.c * y) / determinant,
    (-matrice.b * x + matrice.a * y) / determinant,
  ];
}

/** Échelle CSS px / unité `viewBox`, rotation comprise. */
export function echelleDeMatriceEcran(matrice: MatriceEcranAffine): number {
  const axeX = Math.hypot(matrice.a, matrice.b);
  const axeY = Math.hypot(matrice.c, matrice.d);
  const echelle = Math.min(axeX, axeY);
  return Number.isFinite(echelle) && echelle > 0 ? echelle : 0;
}

/**
 * Bornes du `viewBox`, sans aucun transtypage défensif : on DÉSTRUCTURE et on vérifie, plutôt
 * que d'affirmer au compilateur qu'un `number[]` est un quadruplet. C'est le défaut 2 du
 * § 1.5 du contrat gelé — un double transtypage est un endroit où le compilateur ne protège
 * plus rien — et le contrat de sortie de la campagne en exige **zéro** dans `client/src`.
 * Le motif lui-même n'est pas écrit ici : le comptage se fait au `grep`, et un commentaire
 * qui le citerait serait compté comme une occurrence.
 */
function bornesViewBox(viewBox: string): readonly [number, number, number, number] {
  const [minX, minY, largeur, hauteur] = viewBox.trim().split(/\s+/).map(Number);
  if (
    minX === undefined || minY === undefined || largeur === undefined || hauteur === undefined ||
    !Number.isFinite(minX) || !Number.isFinite(minY) ||
    !Number.isFinite(largeur) || !Number.isFinite(hauteur) ||
    largeur <= 0 || hauteur <= 0
  ) {
    return [0, 0, 100, 160];
  }
  return [minX, minY, largeur, hauteur];
}

/**
 * Le retour après un refus. Jamais un reproche, jamais du rouge (R14, D16) — mais il DIT
 * quoi refaire quand il le sait.
 *
 * `trait-hors-ordre` est le seul motif qui porte une information actionnable : l'enfant a
 * tracé un trait juste, au mauvais moment. Lui répondre « On recommence ce trait » ne lui
 * apprend rien — c'est précisément ce qui bloquait sur le `d`, dont l'ordre est l'inverse de
 * celui du `b` (D33). Le libellé du trait attendu vient de l'état, jamais d'une chaîne
 * recopiée ici.
 */
function messageDeRefus(etat: EtatTrace, libelleAttendu: string | null): string {
  if (etat.dernierRefus === null) return '';
  const libelle = etat.aide?.libelle ?? libelleAttendu;
  if (etat.dernierRefus.motif === 'trait-hors-ordre' && libelle !== null) {
    return `On commence par ${libelle}, tranquillement.`;
  }
  return 'On recommence ce trait, tranquillement.';
}

export function MoteurTrace(
  proprietes: ProprietesMoteur<ContenuTrace, EtatTrace, ActionTrace>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // R35 — mêmes réglages de lecture que `phrase` : la consigne et les deux textes de statut
  // héritent du profil (police, corps, interlettrage) au lieu des styles du navigateur par
  // défaut. `FournisseurReglagesLecture` n'étant monté nulle part (dette déjà signalée pour
  // `phrase`), le contexte rend `REGLAGES_PAR_DEFAUT` ici aussi ; ces textes suivront sans
  // qu'on y touche le jour où le fournisseur sera monté.
  const reglages = useReglagesLecture();

  const refSvg = useRef<SVGSVGElement | null>(null);
  const [echelle, setEchelle] = useState(1);

  const lettre: ModeleLettre | null = contenu.lettres[etat.indexLettre] ?? null;
  const viewBox = lettre?.viewBox ?? '0 0 100 160';
  const [minX, minY, largeur, hauteur] = bornesViewBox(viewBox);

  // --- le battement --------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' });
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- la relecture automatique, avec son quota (R15) ----------------------
  const refRelectures = useRef<{ trait: string; faites: number }>({ trait: '', faites: 0 });
  const traitAttendu = lettre?.traits[etat.indexTrait] ?? null;

  useEffect(() => {
    if (traitAttendu === null || etat.termineMs !== null) return;
    if (refRelectures.current.trait !== traitAttendu.id) {
      refRelectures.current = { trait: traitAttendu.id, faites: 0 };
    }
    const inactiviteMs = services.horloge.maintenantMs() - etat.derniereActionMs;
    const dues = Math.floor(inactiviteMs / RELECTURE_MS);
    if (dues > refRelectures.current.faites) {
      refRelectures.current = { trait: traitAttendu.id, faites: dues };
      emettre({ type: 'ecouterConsigne' });
    }
  }, [etat, traitAttendu, emettre, services]);

  // --- l'échelle de rendu, pour convertir la tolérance ----------------------
  useEffect(() => {
    const noeud = refSvg.current;
    if (noeud === null) return;
    const matrice = noeud.getScreenCTM?.();
    if (matrice !== null && matrice !== undefined) {
      const mesuree = echelleDeMatriceEcran(matrice);
      if (mesuree > 0) {
        setEchelle(mesuree);
        return;
      }
    }
    if (typeof noeud.getBoundingClientRect !== 'function') return;
    const boite = noeud.getBoundingClientRect();
    if (boite.width > 0 && largeur > 0) setEchelle(boite.width / largeur);
  }, [largeur, viewBox]);

  /** Demi-largeur du couloir, en unités `viewBox`. Une seule conversion, ici. */
  const toleranceViewBox = useMemo(
    () => (echelle > 0 ? TOLERANCE_CSS_PX / echelle : TOLERANCE_CSS_PX),
    [echelle],
  );

  // --- le geste ------------------------------------------------------------
  const enPoint = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): Point => {
      const noeud = refSvg.current;
      if (noeud === null) {
        return [evenement.clientX, evenement.clientY];
      }
      const matrice = noeud.getScreenCTM?.();
      if (matrice !== null && matrice !== undefined) {
        const converti = convertirPointClientParMatrice(
          evenement.clientX,
          evenement.clientY,
          matrice,
        );
        if (converti !== null) return converti;
      }
      if (typeof noeud.getBoundingClientRect !== 'function') {
        return [evenement.clientX, evenement.clientY];
      }
      const boite = noeud.getBoundingClientRect();
      if (boite.width === 0 || boite.height === 0) return [evenement.clientX, evenement.clientY];
      return [
        minX + ((evenement.clientX - boite.left) / boite.width) * largeur,
        minY + ((evenement.clientY - boite.top) / boite.height) * hauteur,
      ];
    },
    [minX, minY, largeur, hauteur],
  );

  const echantillonner = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): EchantillonGeste => ({
      point: enPoint(evenement),
      // L'instant vient de `Horloge`, jamais de `Date.now` ni de `evenement.timeStamp`.
      instantMs: services.horloge.maintenantMs(),
    }),
    [enPoint, services],
  );

  const auContact = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>) => {
      // ─────────────────────────────────────────────────────────────────────────────────
      // La capture de pointeur est un CONFORT — elle garde les `pointermove` sur le SVG même
      // si le doigt en sort. Elle n'est jamais une condition pour tracer.
      //
      // `setPointerCapture` LÈVE `NotFoundError` quand l'identifiant de pointeur n'est plus
      // actif : deux doigts posés puis relâchés dans le désordre, un `pointerdown` rejoué,
      // un évènement synthétique. Le `?.` ne protégeait que de l'absence de la méthode, pas
      // de son exception. Mesuré par `tests/e2e/singe.spec.ts` — sortie citée :
      //
      //   Error: aucune exception non capturée après 1200 taps (graine 20260801)
      //   + "NotFoundError: Failed to execute 'setPointerCapture' on 'Element': No active
      //      pointer with the given id is found."  (× 14)
      //
      // Une exception non capturée pendant un tracé, c'est l'écran blanc devant l'enfant :
      // le pire défaut possible sur cette application (annexe T § 5, suite « singe »). On
      // avale l'échec de capture et on trace quand même.
      // ─────────────────────────────────────────────────────────────────────────────────
      try {
        evenement.currentTarget.setPointerCapture?.(evenement.pointerId);
      } catch {
        // Sans capture, le geste reste jouable : c'est le seul comportement acceptable.
      }
      emettre({ type: 'commencerGeste', echantillon: echantillonner(evenement) });
    },
    [echantillonner, emettre],
  );

  const auDeplacement = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>) => {
      if (etat.gesteEnCours.length === 0) return;
      emettre({ type: 'prolongerGeste', echantillon: echantillonner(evenement) });
    },
    [etat.gesteEnCours.length, echantillonner, emettre],
  );

  const auRelachement = useCallback(() => {
    emettre({ type: 'terminerGeste' });
  }, [emettre]);

  // --- ce que l'on donne à voir --------------------------------------------
  const gesteLisse = useMemo(
    () => reechantillonner(etat.gesteEnCours, PAS_ECHANTILLONNAGE),
    [etat.gesteEnCours],
  );

  const rangDebutLettre = useMemo(() => {
    let rang = 0;
    for (let i = 0; i < etat.indexLettre; i += 1) rang += contenu.lettres[i]?.traits.length ?? 0;
    return rang;
  }, [contenu, etat.indexLettre]);

  const enDemonstration = etat.aide !== null && etat.aide.niveau === 'demonstration';

  /** UN axe, jamais deux (D23). Absent quand l'exercice ne travaille aucune paire. */
  const axe = contenu.paire?.axe;
  const styleLecture = styleDeLecture(reglages);

  return (
    <div
      data-moteur="trace"
      data-habillage={habillage.id}
      data-axe={axe}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-lettre={lettre?.lettre ?? ''}
      data-axe-confondu={etat.axeConfondu ?? undefined}
      style={{
        // DEUX LIGNES, LA PREMIÈRE PREND TOUT CE QUI RESTE — même principe que `MoteurPhrase` :
        // « une hauteur DÉFINIE, la scène s'adapte au reste ». Avant ce lot, ce `<div>` n'avait
        // pas de `blockSize` propre : sa hauteur était celle de son contenu (consigne + ardoise
        // plafonnée à 420 px + deux lignes de texte), pas celle du cadre que `EcranNoeud` lui
        // réserve (`blockSize: '100%'` sur son porteur direct). Sur une tablette en portrait,
        // l'écart entre les deux se voyait comme du vide sous l'ardoise — la même famille de
        // défaut que R51 sur `phrase` avant sa mise en scène.
        //
        // R49 (le père, 2026-08-07 : « la phrase est en haut et en bas, il y a doublon ») a
        // retiré la ligne de consigne qui occupait ici la première rangée `auto` : `EcranNoeud`
        // la porte seule désormais, avec son `BoutonEcouter`. L'ardoise en profite — elle
        // récupère la place, ce qui réduit encore le vide mesuré ci-dessus.
        display: 'grid',
        gridTemplateRows: '1fr auto',
        rowGap: '0.75rem',
        blockSize: '100%',
        minBlockSize: 0,
        justifyItems: 'center',
        paddingInline: '0.25rem',
      }}
    >
      {/* Cible courante : la consigne détaillée reste dans la barre de `EcranNoeud`, mais le
          graphème travaillé doit rester visible au voisinage immédiat de l'ardoise. Cette
          carte est en superposition : elle ne crée aucune rangée supplémentaire et ne
          rétrécit donc pas la surface de tracé. Elle dérive toujours de `indexLettre`, sans
          changement implicite de cible. */}
      <div
        data-plateau="cible-trace"
        data-cible-lettre={lettre?.lettre ?? ''}
        aria-label={lettre === null ? 'Aucune lettre' : `Lettre à tracer : ${lettre.lettre}`}
        style={{
          position: 'absolute',
          insetBlockStart: '0.5rem',
          insetInlineStart: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
          padding: '0.35rem 0.85rem',
          backgroundColor: 'var(--parchemin, #FBF6EA)',
          border: 'var(--epaisseur-trait, 2px) solid var(--trait, #1B2440)',
          borderRadius: 'var(--rayon-carte, 1rem)',
          boxShadow: '0 3px 12px rgba(27, 36, 64, 0.14)',
          pointerEvents: 'none',
          ...styleLecture,
          fontWeight: 700,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        } as CSSProperties}
      >
        {lettre === null ? 'Aucune lettre' : `Lettre : ${lettre.lettre}`}
      </div>

      {/* ── L'ARDOISE ───────────────────────────────────────────────────────────────────────
          Avant ce lot : `width: min(100%, 420px)`, un plafond fixe quel que soit l'écran. Sur
          la tablette du père, en portrait, ce plafond laissait le vrai geste — le tracé — dans
          une colonne étroite entourée de vide. Le plafond disparaît : l'ardoise remplit
          maintenant la ligne `1fr`, et c'est `preserveAspectRatio="xMidYMid meet"` (le défaut
          SVG, posé ici en toutes lettres) qui la contient sans jamais la déformer ni la
          rogner — aucun trait du modèle ne doit sortir du cadre visible, sans quoi un enfant
          pourrait viser un point que l'écran ne montre plus.
          `R16` grandit avec elle, jamais en dessous : `RAYON_DEPART` (`GuidageLettre.tsx`) est
          un rayon FIXE en unités `viewBox`, et l'échelle px/unité ne peut que MONTER quand
          l'ardoise s'agrandit — elle ne redescend jamais sous le `420 / 100` déjà mesuré
          64 px et plus. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: '100%',
          blockSize: '100%',
          minBlockSize: 0,
        }}
      >
        <svg
          ref={refSvg}
          data-scene="trace"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="application"
          aria-label={`Trace la lettre ${lettre?.lettre ?? ''}`}
          style={{
            inlineSize: '100%',
            blockSize: '100%',
            display: 'block',
            background: 'var(--parchemin, #FBF6EA)',
            borderRadius: 'var(--rayon-carte, 1rem)',
            boxShadow: '0 4px 18px rgba(27, 36, 64, 0.15)',
            touchAction: 'none',
          }}
          onPointerDown={auContact}
          onPointerMove={auDeplacement}
          onPointerUp={auRelachement}
          onPointerCancel={auRelachement}
          onPointerLeave={auRelachement}
        >
          {(lettre?.traits ?? []).map((trait, index) => {
            const etatTrait = etat.traits[rangDebutLettre + index];
            const etatVisuel =
              etatTrait?.termine === true
                ? 'trace'
                : index === etat.indexTrait
                  ? 'en-cours'
                  : 'a-tracer';
            return (
              <GuidageLettre
                key={trait.id}
                trait={trait}
                etat={etatVisuel}
                tolerance={toleranceViewBox}
                animationsDesactivees={animationsDesactivees}
                enDemonstration={enDemonstration && index === etat.indexTrait}
              />
            );
          })}

          {gesteLisse.length < 2 ? null : (
            <polyline
              data-geste="en-cours"
              points={gesteLisse.map((e) => `${e.point[0]},${e.point[1]}`).join(' ')}
              fill="none"
              stroke={ENCRE}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      <div style={{ display: 'grid', gap: '0.35rem', justifyItems: 'center' }}>
        <p
          role="status"
          aria-live="polite"
          data-refus={etat.dernierRefus?.motif ?? 'non'}
          style={{ ...styleLecture, margin: 0, textAlign: 'center' } as CSSProperties}
        >
          {messageDeRefus(etat, traitAttendu?.libelle ?? null)}
        </p>

        <span data-trait-libelle="oui" style={{ color: TRAIT, fontWeight: 700 }}>
          {traitAttendu?.libelle ?? ''}
        </span>
      </div>
    </div>
  );
}
