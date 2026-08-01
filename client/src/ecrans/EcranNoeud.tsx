// Hôte du moteur — contrat technique v1 § 1.4, § 4.4, § 5.6 et § 10.
//
// Cet écran ne connaît AUCUN moteur en particulier. Il obtient un composant du registre par
// le code déclaré dans l'exercice et lui passe les six propriétés de `ProprietesMoteur`.
// C'est la condition de la promesse « ajouter un moteur ne touche pas la coquille » — et le
// critère de fin du lot L-D au contrat § 2 : « `EcranNoeud` monte un moteur INCONNU ».
//
// Il porte en propre trois choses, et rien d'autre :
//   1. la barre de consigne (`data-consigne`, `data-consigne-etat`) ;
//   2. Gobi et le bouton « écouter » (R15) ;
//   3. `data-test-pret`, qui remplace toute attente de durée dans les tests T4 (§ 10).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { CheminAsset, NiveauAide } from '@pierre/partage';
import { Gobi } from '../composants/Gobi.js';
import { BoutonEcouter } from '../composants/BoutonEcouter.js';
import { variablesHabillage } from '../habillages/chargeur.js';
import { useEtatJeu, useMagasin, useServices } from '../etat/services.js';
import { obtenirRendu } from '../moteurs/registre-rendu.js';
import type { ProprietesMoteur } from '../moteurs/types.js';
import { reveillerAudio } from '../services/audio-tone.js';

/**
 * Trois actions que TOUT moteur doit accepter pour que la coquille reste générique.
 *
 * NOTE DE CONTRAT : le contrat ne les déclare que sur `ActionColorie` (§ 5.8) ; il n'existe
 * aucun type d'action commun à tous les moteurs. La coquille les émet donc « en aveugle », ce
 * qui est sans danger — un moteur qui ne les connaît pas les ignore dans son `reduire`.
 * Signalé au rapport du lot L-D comme une incomplétude du contrat.
 */
const ACTION_BATTEMENT = { type: 'battementHorloge' } as const;
const ACTION_AIDE = { type: 'demanderAide' } as const;
const ACTION_ECOUTE = { type: 'ecouterConsigne' } as const;

/** Cadence du battement. Le temps entre dans le moteur par `Horloge`, jamais autrement (§ 5.8). */
const PERIODE_BATTEMENT_MS = 500;

/** Une étape affichable dans la barre de consigne. */
interface EtapeAffichable {
  readonly id: string;
  readonly texte: string;
  readonly audio: CheminAsset | null;
}

/** Rang des paliers d'aide. Sert à garantir la monotonie exigée au § 5.6. */
const RANG_AIDE: Readonly<Record<string, number>> = {
  aucune: 0,
  indice: 1,
  demonstration: 2
};

/**
 * Extrait les consignes du bloc `jeu.contenu`.
 *
 * NOTE DE CONTRAT : `Moteur` (§ 4.1) publie des COMPTES (`ProgressionMoteur.etapeCourante`,
 * `etapesTotal`) mais aucun accesseur au LIBELLÉ de l'étape courante. La coquille ne peut donc
 * pas afficher la consigne sans regarder le contenu. La lecture ci-dessous est défensive et
 * sans exception : un moteur dont le contenu ne porte pas de `consignes` rend simplement une
 * barre vide. Signalé au rapport du lot L-D.
 */
function extraireEtapes(contenu: unknown): readonly EtapeAffichable[] {
  if (typeof contenu !== 'object' || contenu === null) {
    return [];
  }
  const consignes = (contenu as Record<string, unknown>)['consignes'];
  if (!Array.isArray(consignes)) {
    return [];
  }

  const etapes: EtapeAffichable[] = [];
  for (const brut of consignes as readonly unknown[]) {
    if (typeof brut !== 'object' || brut === null) {
      continue;
    }
    const champs = brut as Record<string, unknown>;
    const texte = champs['texte'];
    if (typeof texte !== 'string') {
      continue;
    }
    const audio = champs['audio'];
    etapes.push({
      id: String(champs['id'] ?? `c${String(etapes.length + 1)}`),
      texte,
      audio: typeof audio === 'string' ? (audio as unknown as CheminAsset) : null
    });
  }
  return etapes;
}

export function EcranNoeud(): ReactElement {
  const magasin = useMagasin();
  const services = useServices();

  const paquet = useEtatJeu((etat) => etat.paquet);
  const codeMoteur = useEtatJeu((etat) => etat.codeMoteur);
  const etatMoteur = useEtatJeu((etat) => etat.etatMoteur);
  const progression = useEtatJeu((etat) => etat.progression);
  const aide = useEtatJeu((etat) => etat.aide);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);

  const racine = useRef<HTMLElement | null>(null);
  const [pret, fixerPret] = useState(false);
  // `niveauAide` est MONOTONE CROISSANT pour la tentative entière (§ 5.6) : une aide obtenue
  // n'est jamais retirée. `aide` peut redevenir `null` quand le moteur l'a consommée ; le
  // palier atteint, lui, ne redescend pas — c'est ce que `data-aide` doit refléter.
  const [niveauAide, fixerNiveauAide] = useState<NiveauAide>('aucune');

  const emettre = useCallback(
    (action: unknown): void => {
      magasin.getState().emettre(action);
    },
    [magasin]
  );

  // --------------------------------------------------------------- battement d'horloge
  // Aucun `setTimeout` ne vit dans la logique pure : c'est cette action régulière qui fait
  // mûrir les seuils d'inactivité de § 5.6. Elle s'arrête dès que la tentative est terminée.
  useEffect(() => {
    if (codeMoteur === null) {
      return undefined;
    }
    const minuterie = globalThis.setInterval(() => {
      emettre(ACTION_BATTEMENT);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      globalThis.clearInterval(minuterie);
    };
  }, [codeMoteur, emettre]);

  // --------------------------------------------------------------- data-test-pret
  // « `oui` quand le SVG est injecté et `document.fonts.ready` résolu » (§ 10). On ne guette
  // que le contrat `data-region-svg`, jamais une classe ni une durée : c'est ce qui rend les
  // captures T4 stables sans `waitForTimeout`.
  useEffect(() => {
    if (paquet === null) {
      fixerPret(false);
      return undefined;
    }

    let vivant = true;
    let observateur: MutationObserver | null = null;

    const svgPresent = (): boolean =>
      racine.current !== null && racine.current.querySelector('[data-region-svg]') !== null;

    const policesPretes: Promise<unknown> =
      typeof document !== 'undefined' && 'fonts' in document
        ? document.fonts.ready
        : Promise.resolve();

    void policesPretes.then(() => {
      if (!vivant) {
        return;
      }
      if (svgPresent()) {
        fixerPret(true);
        return;
      }
      if (typeof MutationObserver !== 'function' || racine.current === null) {
        return;
      }
      observateur = new MutationObserver(() => {
        if (vivant && svgPresent()) {
          fixerPret(true);
          observateur?.disconnect();
        }
      });
      observateur.observe(racine.current, { childList: true, subtree: true });
    });

    return () => {
      vivant = false;
      observateur?.disconnect();
    };
  }, [paquet]);

  useEffect(() => {
    fixerNiveauAide('aucune');
  }, [paquet]);

  useEffect(() => {
    if (aide === null) {
      return;
    }
    fixerNiveauAide((atteint) => {
      const rangAtteint = RANG_AIDE[atteint] ?? 0;
      const rangPropose = RANG_AIDE[aide.niveau] ?? 0;
      return rangPropose > rangAtteint ? aide.niveau : atteint;
    });
  }, [aide]);

  const styleHabillage = useMemo(
    () => (paquet === null ? {} : variablesHabillage(paquet.habillage)),
    [paquet]
  );

  const etapes = useMemo(
    () => (paquet === null ? [] : extraireEtapes(paquet.exercice.jeu.contenu)),
    [paquet]
  );

  if (paquet === null || codeMoteur === null) {
    // Écran de chargement plutôt qu'un écran vide : l'enfant ne doit jamais voir « rien ».
    return (
      <main data-ecran="chargement" style={{ padding: '2rem' }}>
        <p>On rallume le décor…</p>
      </main>
    );
  }

  const rendu = obtenirRendu(codeMoteur);
  const ComposantMoteurMonte = rendu.Composant as unknown as (
    proprietes: ProprietesMoteur<unknown, unknown, unknown>
  ) => ReactElement | null;

  const indexCourant = progression?.etapeCourante ?? 0;
  const etapeCourante = etapes[indexCourant] ?? null;

  return (
    <main
      ref={racine}
      data-ecran="noeud"
      data-test-pret={pret ? 'oui' : 'non'}
      data-aide={niveauAide}
      // Le premier geste de l'enfant débloque le contexte audio : sans lui, aucun son ne
      // sortira jamais (politique d'autoplay des navigateurs).
      onPointerDown={() => reveillerAudio(services.audio)}
      style={{
        ...styleHabillage,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        minBlockSize: '100vh'
      }}
    >
      {/* ---------------------------------------------------------- barre de consigne
          « Le décor s'agite, le texte jamais » : zone parchemin, police de lecture,
          aucune animation dans le champ de déchiffrage (v2 § 9.3). */}
      <header
        className="zone-lecture barre-consigne"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
          border: 'var(--epaisseur-trait) solid var(--trait)',
          borderRadius: 'var(--rayon-carte)'
        }}
      >
        <div style={{ flex: '1 1 auto' }}>
          {etapes.map((etape, index) => {
            const etat =
              index < indexCourant ? 'faite' : index === indexCourant ? 'courante' : 'a-venir';
            if (etat !== 'courante') {
              // Une seule consigne est active à la fois (§ 5.3). Les autres restent dans le
              // DOM, mais hors du champ de lecture.
              //
              // `data-consigne-etat` n'est PAS émis ici : `PaletteConsigne` (moteur) en est le
              // seul propriétaire. L'émettre des deux côtés faisait trouver 2 nœuds à
              // `tests/e2e/parcours-nominal.spec.ts:170`, qui en attend exactement 1 — et le
              // test composant, qui monte le moteur isolément, ne voit que la palette.
              return <span key={etape.id} data-consigne={etape.id} hidden />;
            }
            return (
              <p
                key={etape.id}
                data-consigne={etape.id}
                style={{ margin: 0, fontSize: '1.75rem' }}
              >
                {etape.texte}
              </p>
            );
          })}
          {etapeCourante === null ? <p style={{ margin: 0 }}>&nbsp;</p> : null}
        </div>

        {etapeCourante === null ? null : (
          <BoutonEcouter
            texte={etapeCourante.texte}
            clip={etapeCourante.audio}
            surEcoute={() => emettre(ACTION_ECOUTE)}
          />
        )}
      </header>

      {/* ---------------------------------------------------------- le moteur */}
      <div style={{ flex: '1 1 auto', minBlockSize: 0 }}>
        <ComposantMoteurMonte
          contenu={paquet.exercice.jeu.contenu}
          habillage={paquet.habillage}
          etat={etatMoteur}
          emettre={emettre}
          services={services}
          animationsDesactivees={animationsDesactivees}
        />
      </div>

      {/* ---------------------------------------------------------- Gobi */}
      <Gobi
        aide={aide}
        niveau={niveauAide}
        surDemande={() => emettre(ACTION_AIDE)}
      />
    </main>
  );
}
