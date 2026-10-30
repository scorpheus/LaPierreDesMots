/**
 * `MoteurGrave` — le composant hôte du moteur `grave`. Lot L2-E, mise en scène portée depuis
 * `phrase` (R51/R52) après la lecture du décor par le père.
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurGrave` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionGrave`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI A CHANGÉ, ET POURQUOI
 *
 * Avant ce lot, le clavier était une rangée de boutons en `flexWrap`, sur un fond vide : aucun
 * décor, aucune récompense visuelle à mesure que les trous se remplissent. `phrase` a établi la
 * règle (R52, v2 lignes 70 et 79) : le décor COUVRE la zone de jeu, il se RALLUME à mesure que
 * l'exercice avance, et ce qu'on touche est posé DESSUS, à des emplacements DÉRIVÉS.
 *
 * Reprise du 5 septembre : le clavier est une rangée centrée sous le mot, dans tous les
 * formats. Les lettres ne flottent plus à des hauteurs différentes. La cascade des trous
 * sert seulement à rallumer le décor ; elle ne décide pas de la position des touches.
 *
 * ── LA CASE À TROUS RESTE DANS LE CHAMP DE LECTURE ────────────────────────────────────────────
 * « Le décor s'agite, le texte jamais » (v2 § 9.3). Le mot à compléter est ce qu'il y a de plus
 * précisément à déchiffrer dans ce moteur ; il reste dans un grand cartouche statique au
 * centre, sur parchemin opaque. Le modèle se trouve au-dessus, hors de la zone des touches.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────────────────────────
 * R49 : `EcranNoeud` affiche déjà `consigne.texte` dans sa barre de consigne (il lit
 * `jeu.contenu.consignes[].texte`, générique à tous les moteurs). La répéter ici faisait lire
 * deux fois la même ligne à un enfant qui déchiffre — « il cherche la différence entre les
 * deux ». Le moteur porte le modèle et le mot incomplet, pas la règle générale du geste.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la touche oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import type { ActionGrave, ContenuGrave, EtatGrave } from '@pierre/partage';

import { SceneDecor } from '../../habillages/SceneDecor.js';
import { ZoneDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
import { CibleDeDepot, ZoneDeGlisser, useJetonGlissable } from '../commun/glisser.js';
import type { ProprietesMoteur } from '../types.js';
import {
  cadreJeuEtBornes,
  planifierCascade,
  regionsAllumeesDepuisAcquis,
  regionsColoriables,
  useDerniereAllumee,
  useMesureCadre,
} from '../commun/mise-en-scene.js';
import './grave.css';
import { ROLE_QUESTION, ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/** Côté court minimal du décor (px), comme `--socle-image-min`. */
const TAILLE_DECOR_MIN = 96;

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * CE QUE LE REFUS DIT — jamais le graphème attendu, sans quoi le refus deviendrait une aide
 * gratuite et il n'y aurait plus rien à déchiffrer. Même discipline que `MESSAGES_DE_REFUS` de
 * `phrase` : sans « tu », sans « non », sans « erreur ».
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'lettre-fausse': 'On cherche une autre lettre pour cette case-là.',
  'trous-remplis': 'Ce mot est déjà complet.',
  'lettre-hors-clavier': 'Cette lettre-là n’est pas sur le clavier.',
};

export function MoteurGrave(
  proprietes: ProprietesMoteur<ContenuGrave, EtatGrave, ActionGrave>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionGrave);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- le retour sensoriel --------------------------------------------------
  const serie = useRef(0);
  const nbAcquis = Object.keys(etat.acquis).length;
  const precedents = useRef(nbAcquis);
  const marqueRefus = useRef(etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs);
  const origine = useRef<readonly [number, number]>([0, 0]);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });
    }
    precedents.current = nbAcquis;
  }, [nbAcquis, services]);

  useEffect(() => {
    const marque = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
    if (marque !== 0 && marque !== marqueRefus.current) {
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    }
    marqueRefus.current = marque;
  }, [etat.dernierRefus, services]);

  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionGrave, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const consigne = contenu.consignes[etat.indexEtape] ?? null;
  const trouCourant = consigne === null || etape === undefined
    ? null
    : consigne.trous.find((trou) => etape.restantes.includes(trou.id)) ?? null;

  // --- la typographie de lecture ---------------------------------------------
  const reglages = useReglagesLecture();
  const reglagesMot = useMemo(
    // Le mot reste nettement plus grand que les touches, tout en suivant réellement le
    // réglage de lecture du parent. Un plafond fixe à 48 px rendait le réglage inopérant.
    () => ({ ...reglages, corpsPx: Math.max(reglages.corpsPx + 32, 48) }),
    [reglages],
  );

  // --- la mesure du cadre ------------------------------------------------------
  const { racine, bande, cadre, hauteurBande } = useMesureCadre();
  const { cadreJeu, bornes } = useMemo(() => cadreJeuEtBornes(cadre, hauteurBande), [cadre, hauteurBande]);

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  // --- les trous : cascade par consigne, pour la seule RECOLORATION ------------
  const listesTrous = useMemo(
    () => contenu.consignes.map((c) => c.trous.map((t) => t.id)),
    [contenu.consignes],
  );
  const boiteTrou = useMemo(() => ({ largeur: 64, hauteur: 64 }), []);
  const plansTrous = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape: listesTrous,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer: () => boiteTrou,
      }),
    [habillage, listesTrous, regions, cadreJeu, bornes, boiteTrou],
  );

  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plansTrous, etat.acquis, centroideParRegion),
    [plansTrous, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const lettreRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.lettre;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  // Un trou peut porter tout un groupe (« eau », « ill »), pas seulement un caractère.
  // Sauter sa longueur évite « bat_au » avant réponse et « bateauau » après réponse.
  const motAffiche = useMemo(() => {
    if (consigne === null) return '';
    const caracteres = [...consigne.mot];
    const morceaux: string[] = [];
    let position = 0;
    for (const trou of [...consigne.trous].sort((a, b) => a.position - b.position)) {
      const longueur = [...trou.attendu].length;
      morceaux.push(caracteres.slice(position, trou.position).join(''));
      morceaux.push(etat.acquis[trou.id] ?? '_'.repeat(longueur));
      position = trou.position + longueur;
    }
    morceaux.push(caracteres.slice(position).join(''));
    return morceaux.join('');
  }, [consigne, etat.acquis]);

  const scene = (
    <div className="grave-scene">
      {/* T10 — le repère commun (le rang du mot), affiché sous la consigne de l'écran. */}
      <RepereEtape
        moteur="grave"
        rang={etat.indexEtape + 1}
        total={etat.etapes.length}
        animationsDesactivees={animationsDesactivees}
      />
      {/* Le modèle est explicite : on reconstitue son orthographe avec les touches.
          Ce n'est ni un exercice de tracé, ni une devinette sonore sans contexte. */}
      <div data-plateau="etape-grave" aria-live="polite" className="grave-cartouche" {...ROLE_QUESTION}>
        <span className="grave-cartouche__texte">
          <TexteColore texte={consigne === null
            ? 'Mot à compléter'
            : trouCourant === null
              ? `Le mot « ${consigne.mot} » est complet`
              : `Modèle : ${consigne.mot}`} />
        </span>
      </div>

      {/* Le cartouche est dans le flux, hors du cadre qui contient le décor et le mot. */}
      <div ref={racine} data-zone-jeu="grave" className="grave-zone">
        {/* ------------------------------------------------------------- le décor, en fond */}
        {/* Un décor écrasé n'a aucun sens : sous 96 px de côté court, on le masque. Il reste
            dans la page, car l'écran attend son SVG pour se déclarer prêt. */}
        <div
          className="grave-decor"
          hidden={Math.min(cadre.largeur, cadre.hauteur - hauteurBande) < TAILLE_DECOR_MIN}
          style={{ insetBlockEnd: `${String(hauteurBande)}px` }}
        >
          <SceneDecor
            habillage={habillage}
            allumees={allumees}
            derniere={derniere}
            animationsDesactivees={animationsDesactivees}
            ajustement="contenir"
          />
        </div>

        {/* Le mot est aussi la zone d'accueil du glisser (T11) : une lettre lâchée dessus va
            dans le trou courant, exactement comme une touche tapée. */}
        <CibleDeDepot id={ZONE_DU_MOT}>
          {(accueil) => (
            <div ref={accueil.brancher} data-mot-central="oui" data-corps-minimal="48"
              data-survolee={accueil.survolee ? 'oui' : 'non'} className="grave-mot-central">
              <ZoneDeLecture
                texte={motAffiche}
                motsCles={consigne === null ? [] : consigne.motsCles}
                reglages={reglagesMot}
                etiquette={consigne === null ? 'Le mot à compléter.' : `Le mot à compléter : ${consigne.mot}`}
              />
            </div>
          )}
        </CibleDeDepot>

        {/* ------------------------------------------------------------ la bande de lecture
            Le mot à trous : c'est ce qu'il y a de plus précis à déchiffrer, il reste donc
            immobile, sur fond parchemin, jamais sur le décor qui s'agite. */}
        <div ref={bande} data-plateau="mot" className="grave-bande">
          <p
            role="status"
            aria-live="polite"
            data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
            data-animations={animationsDesactivees ? 'calmes' : 'vives'}
            className="grave-refus"
          >
            <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}><TexteColore texte={messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus} /></MessageStable>
          </p>

          <p role="status" aria-live="polite" data-annonce="coloriage" className="grave-annonce">
            {derniere === null
              ? ''
              : `${regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id} reprend ses couleurs.`}
          </p>
        </div>
      </div>
    </div>
  );

  // Le clavier est ce qu'on prend : il va dans la réserve du socle, sous ou à côté du mot.
  const clavier = (
    <div data-plateau="clavier" className="grave-clavier">
      {contenu.clavier.map((cle) => {
        const refusee = lettreRefusee === cle;
        const classes = ['cible', 'grave-touche'];
        if (!animationsDesactivees && refusee) classes.push('oscillation');
        return (
          <ToucheSaisissable
            key={refusee ? `${cle}-${String(marqueRefusCourante)}` : cle}
            cle={cle}
            classes={classes}
            surTap={(evenement) => {
              jouer({ type: 'graver', lettre: cle }, evenement);
            }}
          />
        );
      })}
    </div>
  );

  return (
    <ZoneDeGlisser
      surDepot={(lettre) => {
        // Même action que le tap ; l'origine du retour est le mot, là où la lettre arrive.
        const boite = racine.current?.querySelector('[data-mot-central]')?.getBoundingClientRect();
        jouer({ type: 'graver', lettre }, {
          clientX: boite === undefined ? 0 : boite.left + boite.width / 2,
          clientY: boite === undefined ? 0 : boite.top + boite.height / 2,
        });
      }}
    >
    <DispositionMoteur
      moteur="grave"
      disposition="empilee"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-regions-allumees={String(allumees.length)}
      scene={scene}
      reserve={clavier}
    />
    </ZoneDeGlisser>
  );
}

/** La zone d'accueil unique : le mot. C'est le trou courant qui décide où va la lettre. */
const ZONE_DU_MOT = 'mot-a-completer';

/**
 * UNE TOUCHE DU CLAVIER, TAPABLE ET SAISISSABLE (T11) — les deux gestes, une seule action.
 * Sous 8 px de déplacement, le geste reste un tap (`SEUIL_DE_GLISSE_PX`).
 */
function ToucheSaisissable({
  cle,
  classes,
  surTap,
}: {
  readonly cle: string;
  readonly classes: readonly string[];
  readonly surTap: (evenement: { clientX: number; clientY: number }) => void;
}): ReactElement {
  const prise = useJetonGlissable(cle);
  return (
    <button
      {...prise.attributs}
      {...prise.ecouteurs}
      ref={prise.brancher}
      type="button"
      {...ROLE_REPONSE}
      className={classes.join(' ')}
      data-lettre={cle}
      data-glisse={prise.enVol ? 'oui' : 'non'}
      style={prise.style}
      onClick={surTap}
    >
      <TexteColore texte={cle} />
    </button>
  );
}
