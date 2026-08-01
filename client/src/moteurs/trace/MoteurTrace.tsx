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
 * AUCUNE COORDINATION FINE (R16). Le couloir de tolérance fait 24 px CSS de demi-largeur,
 * converti ici une seule fois en unités `viewBox` — la logique pure ne connaît que des
 * unités `viewBox`, jamais des pixels.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as PointerEventReact, ReactElement } from 'react';
import type {
  ActionTrace,
  ContenuTrace,
  EchantillonGeste,
  EtatTrace,
  ModeleLettre,
  Point,
} from '@pierre/partage';
import type { ProprietesMoteur } from '../types.js';
import { GuidageLettre } from './GuidageLettre.js';
import { PAS_ECHANTILLONNAGE, reechantillonner } from './echantillonnage.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** R15 : « au moins une fois par tranche de 20 s », comme `colorie` et `place`. */
const RELECTURE_MS = 20_000;

/** R16, en pixels CSS. Converti en unités `viewBox` par le facteur d'échelle du SVG. */
const TOLERANCE_CSS_PX = 24;

const TRAIT = 'var(--trait, #1B2440)';
const ENCRE = 'var(--encre, #2E5EAA)';

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

export function MoteurTrace(
  proprietes: ProprietesMoteur<ContenuTrace, EtatTrace, ActionTrace>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

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
    if (noeud === null || typeof noeud.getBoundingClientRect !== 'function') return;
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
      if (noeud === null || typeof noeud.getBoundingClientRect !== 'function') {
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

  return (
    <div
      data-moteur="trace"
      data-habillage={habillage.id}
      data-axe={axe}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-lettre={lettre?.lettre ?? ''}
      data-axe-confondu={etat.axeConfondu ?? undefined}
      style={{ display: 'grid', gap: '1rem', justifyItems: 'center' }}
    >
      <p data-consigne-texte="oui" role="status" aria-live="polite">
        {contenu.consigne}
      </p>

      <svg
        ref={refSvg}
        data-scene="trace"
        viewBox={viewBox}
        role="application"
        aria-label={`Trace la lettre ${lettre?.lettre ?? ''}`}
        style={{
          width: 'min(100%, 420px)',
          height: 'auto',
          background: 'var(--parchemin, #FBF6EA)',
          borderRadius: '1rem',
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

      <p role="status" aria-live="polite" data-refus={etat.dernierRefus?.motif ?? 'non'}>
        {etat.dernierRefus === null ? '' : 'On recommence ce trait, tranquillement.'}
      </p>

      <span data-trait-libelle="oui" style={{ color: TRAIT }}>
        {traitAttendu?.libelle ?? ''}
      </span>
    </div>
  );
}
