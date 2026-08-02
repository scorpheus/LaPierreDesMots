// Hôte du moteur — contrat technique v1 § 1.4, § 4.4, § 5.6 et § 10.
//
// Cet écran ne connaît AUCUN moteur en particulier. Il obtient un composant du registre par
// le code déclaré dans l'exercice et lui passe les six propriétés de `ProprietesMoteur`.
// C'est la condition de la promesse « ajouter un moteur ne touche pas la coquille » — et le
// critère de fin du lot L-D au contrat § 2 : « `EcranNoeud` monte un moteur INCONNU ».
//
// Il porte en propre sept choses, et rien d'autre :
//   1. la barre de consigne (`data-consigne`, `data-consigne-etat`) ;
//   2. Gobi et le bouton « écouter » (R15) ;
//   3. `data-test-pret`, qui remplace toute attente de durée dans les tests T4 (§ 10) ;
//   4. `data-serie`, la longueur de la série de bonnes réponses (contrat features v2 § 7) ;
//   5. `data-appui`, LA RÉPONSE VISIBLE SOUS 100 ms (v2 § 8) — voir plus bas ;
//   6. la jauge du palier intermédiaire, qui montre le vide restant (D25, point 3) ;
//   7. LA SORTIE — `data-vers="carte"`. Voir l'encadré ci-dessous : elle manquait.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { CheminAsset, JaugePalier as ModeleJauge, NiveauAide } from '@pierre/partage';
import { jaugesDe } from '@pierre/partage/recompenses';
import { Gobi } from '../composants/Gobi.js';
import { BoutonEcouter } from '../composants/BoutonEcouter.js';
import { JaugePalier } from '../composants/JaugePalier.js';
import { variablesHabillage } from '../habillages/chargeur.js';
import { useEtatJeu, useMagasin, useServices } from '../etat/services.js';
import { obtenirRendu } from '../moteurs/registre-rendu.js';
import type { ComposantMoteur } from '../moteurs/types.js';
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

/**
 * Durée d'affichage de l'état « appuyé », en millisecondes.
 *
 * Elle n'est PAS la latence de réponse — celle-ci est nulle, l'attribut bascule dans le
 * gestionnaire même. C'est la durée pendant laquelle la marque reste visible, alignée sur
 * l'anticipation de la v2 § 8 (`scale 0.94` en 60 ms) avec une marge de lecture.
 */
const DUREE_APPUI_MS = 120;

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
  const racine = contenu as Record<string, unknown>;

  // ───────────────────────────────────────────────────────────────────────────────────────
  // LA CONSIGNE UNIQUE — le moteur `trace` (L2-C) et lui seul.
  //
  // Son `jeu.contenu` porte `consigne: string` au singulier, pas `consignes: […]` : une lettre
  // se trace sous UNE consigne. Cette fonction ne connaissait que la forme au pluriel, si bien
  // que `etapes` restait vide, que `etapeCourante` valait `null`, et que **le bouton
  // « Écouter » n'était pas rendu du tout** sur les nœuds `trace`.
  //
  // C'est une violation directe d'une règle non négociable — « aucune consigne n'existe
  // uniquement à l'écrit, tout est audible en un tap » (R15, v2 § 5.4) — sur le moteur qui
  // répond justement au besoin nommé de l'enfant (D23). Mesuré par `parcours-variete`, sortie
  // citée :
  //
  //   expect(locator('[data-action="ecouter"]')).toHaveCount(1) failed
  //     Expected: 1     Received: 0
  //
  // On lit donc les deux formes. Aucune n'est devinée : `consigne` et `consigneId` sont les
  // noms du schéma de contenu de `trace` (contrat des features v2 § 4.3.3).
  // ───────────────────────────────────────────────────────────────────────────────────────
  const consigneUnique = racine['consigne'];
  if (typeof consigneUnique === 'string' && consigneUnique.length > 0) {
    const audioUnique = racine['audio'];
    const idUnique = racine['consigneId'];
    return [
      {
        id: typeof idUnique === 'string' ? idUnique : 'c1',
        texte: consigneUnique,
        audio: typeof audioUnique === 'string' ? audioUnique : null
      }
    ];
  }

  const consignes = racine['consignes'];
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
      // `CheminAsset` est un alias de `string` (écart v1 n° 6 : pas de marquage nominal) : la
      // garde `typeof` suffit, le transtypage défensif de la v1 ne protégeait rien.
      audio: typeof audio === 'string' ? audio : null
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
  const serie = useEtatJeu((etat) => etat.serie);
  const cascade = useEtatJeu((etat) => etat.cascade);
  const seuils = useEtatJeu((etat) => etat.seuils);

  const racine = useRef<HTMLElement | null>(null);
  const [pret, fixerPret] = useState(false);
  const [appuye, fixerAppuye] = useState(false);
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

  /**
   * ════════════════════════════════════════════════════════════════════════════════════════
   * LA SORTIE DU NŒUD — règle 3 : **AUCUN ÉTAT SANS ISSUE.**
   *
   * Cet écran n'en avait aucune. Le père s'y est trouvé bloqué dans les Galeries — « il n'y a
   * pas de bouton retour » —, et le pire est qu'il n'y avait rien d'autre à faire que réussir
   * la lettre `d`, dont le ductus est faux (D33). Un enfant, lui, n'aurait pas su le dire : il
   * aurait simplement arrêté de jouer.
   *
   * Pourquoi `test:e2e:singe` ne l'a pas vu : il mesure « au moins un élément interactif est
   * présent », et il y en avait deux. **Compter les éléments interactifs n'est pas compter les
   * sorties** — audit des occurrences au lieu des objets.
   * `tests/e2e/parcours-issues-de-secours.spec.ts` audite les objets : il ESSAIE chaque
   * élément et regarde si l'écran change.
   *
   * Trois choix, tous contraints :
   *
   *   1. **Un seul tap, aucune confirmation.** Une boîte « es-tu sûr ? » serait un état de
   *      plus à savoir quitter, à 7 ans, au moment précis où l'enfant veut partir. Le coût
   *      d'un départ accidentel est nul — la carte est à un tap, et l'acquis n'est jamais
   *      repris (R14).
   *   2. **On passe par `naviguer('carte')`**, exactement comme `EcranRecompense`, et non par
   *      le routeur : `EtatMagasin.ecran` reste l'UNIQUE écrivain de l'écran courant, donc
   *      `window.__test.etat().ecran` continue de dire la vérité (§ 7.1).
   *   3. **La tentative interrompue n'est pas journalisée.** PLACEHOLDER, question Q-R3 de
   *      `Docs/questions-en-attente.md`. Seul `EcranRecompense` écrit dans `tentatives`
   *      (§ 6.3), et il n'est atteint qu'à la clôture du nœud : partir en cours de route
   *      n'écrit rien. C'est délibéré — `ResumeTentative.reussi` est « toujours `true` à la
   *      fin » (`partage/src/moteurs/types.ts:87`), une tentative abandonnée n'a donc pas de
   *      résumé honnête à publier, et la journaliser ferait passer pour un échec ce qui n'est
   *      qu'un « je vais jouer à autre chose ». C'est la même posture que D34 pour le mode
   *      parent testeur : ce qui n'est pas une vraie tentative de l'enfant ne nourrit pas le
   *      BKT ni le Leitner. À arbitrer par le père.
   * ════════════════════════════════════════════════════════════════════════════════════════
   */
  const retourCarte = useCallback((): void => {
    magasin.getState().naviguer('carte');
  }, [magasin]);

  /**
   * ════════════════════════════════════════════════════════════════════════════════════════
   * LA RÈGLE DES 100 ms — v2 § 8 : « une réponse visible en moins de 100 ms sur tout appui,
   * MÊME SI LE TRAITEMENT PREND PLUS LONGTEMPS ».
   *
   * C'est ce gestionnaire qui la tient, et c'est la raison pour laquelle il ne fait presque
   * rien : il bascule un attribut, note le point du doigt, réveille le contexte audio, et
   * rend la main. Aucune réduction de moteur, aucun rendu de scène, aucun réseau n'est sur ce
   * chemin. La mutation du DOM part donc dans la même tâche que l'événement.
   *
   * `tests/qualite/gamefeel-latence.spec.ts` MESURE ce délai — appui → première mutation du
   * DOM — sur une vingtaine d'appuis, et échoue au-dessus de 100 ms. C'est le chiffre du
   * contrat de sortie de L2-A : sans lui, « la réponse est immédiate » resterait une opinion.
   * ════════════════════════════════════════════════════════════════════════════════════════
   */
  const surAppui = useCallback(
    (evenement: React.PointerEvent<HTMLElement>): void => {
      fixerAppuye(true);
      magasin.getState().marquerAppui(evenement.clientX, evenement.clientY);
      // Le premier geste de l'enfant débloque le contexte audio : sans lui, aucun son ne
      // sortira jamais (politique d'autoplay des navigateurs).
      reveillerAudio(services.audio);
    },
    [magasin, services]
  );

  // Retombée de l'état « appuyé ». Une minuterie, pas une animation : l'attribut doit
  // redescendre même si l'enfant garde le doigt posé et sort de l'écran.
  useEffect(() => {
    if (!appuye) {
      return undefined;
    }
    const minuterie = globalThis.setTimeout(() => {
      fixerAppuye(false);
    }, DUREE_APPUI_MS);
    return () => {
      globalThis.clearTimeout(minuterie);
    };
  }, [appuye]);

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
  // Un SEUL `as`, et non le transtypage aveugle en deux temps de la v1 (défaut 2 du § 1.5).
  // Il est licite parce que `ComposantMoteur<unknown, unknown, unknown>` EST assignable à
  // `ComposantMoteur<never, never, never>` — les paramètres sont contravariants, et
  // `ProprietesMoteur<never,…>` est assignable à `ProprietesMoteur<unknown,…>`. Le
  // compilateur vérifie donc que les deux types sont COMPARABLES, ce que le détour par
  // `unknown` l'empêchait précisément de faire.
  const ComposantMoteurMonte = rendu.Composant as ComposantMoteur<unknown, unknown, unknown>;

  const indexCourant = progression?.etapeCourante ?? 0;
  const etapeCourante = etapes[indexCourant] ?? null;

  // La jauge du palier intermédiaire — « trois étoiles sur cinq » (D25, point 3). C'est celle
  // qui a du sens PENDANT une partie : elle dit ce que ce nœud-ci rapproche.
  const jaugeIntermediaire: ModeleJauge | null =
    seuils === null
      ? null
      : (jaugesDe(cascade, seuils).find((jauge) => jauge.palier === 'intermediaire') ?? null);

  return (
    <main
      ref={racine}
      data-ecran="noeud"
      data-test-pret={pret ? 'oui' : 'non'}
      data-aide={niveauAide}
      // Longueur de la série de bonnes réponses en cours — contrat des features v2 § 7.
      data-serie={String(serie)}
      // ⚠ `data-appui` — ADDITION au § 7, signalée au rapport de L2-A. Ce n'est pas qu'un
      // crochet de test : c'est l'IMPLANTATION de la règle des 100 ms de la v2 § 8. La marque
      // est posée dans le gestionnaire lui-même, donc avant tout traitement.
      data-appui={appuye ? 'oui' : 'non'}
      onPointerDown={surAppui}
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
        {/* LA SORTIE, en tête de la barre et non reléguée en pied : c'est le premier élément
            que l'œil rencontre quand on cherche à partir. Voir l'encadré plus haut. */}
        <button
          type="button"
          className="cible"
          data-vers="carte"
          aria-label="Revenir à la carte"
          onClick={retourCarte}
          style={{ flex: '0 0 auto', fontSize: '1.125rem', gap: '0.5rem' }}
        >
          <span aria-hidden="true">←</span>
          <span>La carte</span>
        </button>

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
            /* AJOUT N2 (contrat de finition v3 § 6.1, « six appelants adaptent leur mise en
               page »). La propriété `clip` du bouton — un chemin de fichier — devient `cle`,
               une clé de manifeste. On la CONSTRUIT ici plutôt que de la lire dans
               l'exercice : c'est exactement la convention de `scripts/recenser-textes.mjs`,
               `<idExercice>/<idConsigne>`, et la construire au même endroit que l'écran qui
               l'affiche évite d'ajouter un champ aux fichiers d'exercice — dont N1 et N8 sont
               propriétaires, pas N2. Le champ `audio` de l'exercice n'est plus lu du tout ;
               il vaut `null` partout et le manifeste l'a remplacé. */
            cle={`${paquet.exercice.id}/${etapeCourante.id}`}
            surEcoute={() => emettre(ACTION_ECOUTE)}
          />
        )}

        {/* La jauge du prochain cadeau. Elle est DANS la barre de consigne et non sur un côté :
            « la progression doit être visible avant d'être atteinte » (D25, point 3), donc
            sous les yeux pendant qu'on joue, pas rangée dans un menu. */}
        {jaugeIntermediaire === null ? null : (
          <JaugePalier jauge={jaugeIntermediaire} taille={16} avecLibelle={false} />
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
