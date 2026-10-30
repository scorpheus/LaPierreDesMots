/**
 * LE CALCUL — premier jet (Docs/maths-calcul-premier-jet-2026-10-09.md).
 *
 * Le gué des calculs (égalités à trou) et la pierre à calcul (addition posée), montés sur le
 * socle d'activité : `ecran-activite` (en-tête, scène, guide) et `DispositionMoteur` (scène =
 * l'opération, réserve = le pavé ou les réponses à choisir, pied = ce que dit Gobi).
 *
 * Toute la règle vit dans `partage/src/mathematiques/jeux/calcul/` : ce composant traduit un
 * toucher ou une touche du clavier en geste, et donne à voir l'état.
 *
 * Invariants opposables :
 *   - **une seule interaction principale** : toucher un chiffre (ou une réponse) ; aucun bouton
 *     « Vérifier », aucun « Effacer », aucune suite de boutons ;
 *   - **aucun rouge, aucun écran d'échec** : un chiffre refusé n'est pas posé, la touche oscille ;
 *   - **le texte ne bouge jamais** : l'opération est sur parchemin, immobile ; seule la case à
 *     remplir porte un cadre fixe ;
 *   - **le clavier physique est toujours écouté** : chiffres de la rangée (par `code`, donc aussi
 *     sur un clavier AZERTY sans Maj) et du pavé numérique.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { AideProposee, CodeStadeGobi } from '@pierre/partage';
import {
  PHRASES_CALCUL,
  aideCalcul,
  caseCourante,
  creerPartieCalcul,
  etoilesCalcul,
  jouerCalcul,
  phraseDuRetour,
  type ActionCalcul,
  type ActiviteCalcul,
  type EtapeColonnes,
  type EtapeLigne,
  type EtatCalcul,
} from '@pierre/partage/mathematiques';
import { creerAlea } from '@pierre/partage';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
import { BoutonEcouter } from '../../composants/BoutonEcouter.js';
import { Gobi } from '../../composants/Gobi.js';
import { CadreSceneActivite } from '../../composants/activite/CadreSceneActivite.js';
import { useEtatJeu, useServices } from '../../etat/services.js';
import '../../styles/activites.css';
import './calcul.css';

export interface ProprietesEcranCalcul {
  readonly activite: ActiviteCalcul;
  /** Graine de la partie, tirée par l'appelant dans `services.alea` (journalisable). */
  readonly graine: number;
  readonly stade: CodeStadeGobi;
  /** Retour à l'accueil des maths. */
  readonly surQuitter: () => void;
}

const PAVE: readonly number[] = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0];

/** Un chiffre du clavier physique : rangée du haut (par `code`, AZERTY compris) ou pavé. */
export function chiffreDuClavier(evenement: Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'altKey' | 'metaKey'>): number | null {
  if (evenement.ctrlKey || evenement.altKey || evenement.metaKey) return null;
  const parCode = /^(?:Digit|Numpad)(\d)$/u.exec(evenement.code);
  if (parCode !== null) return Number(parCode[1]);
  return /^\d$/u.test(evenement.key) ? Number(evenement.key) : null;
}

export function EcranCalcul({ activite, graine, stade, surQuitter }: ProprietesEcranCalcul): ReactElement {
  const services = useServices();
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  const [etat, fixerEtat] = useState<EtatCalcul>(() => creerPartieCalcul(activite, creerAlea(graine)));
  const etatRef = useRef(etat);
  etatRef.current = etat;
  const serie = useRef(0);
  /** La touche refusée et le geste qui l'a refusée : elle seule oscille, et à chaque refus. */
  const [refus, fixerRefus] = useState<{ readonly chiffre: number; readonly marque: number } | null>(null);

  const recommencer = useCallback(() => {
    fixerEtat(creerPartieCalcul(activite, creerAlea(services.alea.entier(0, 0x1_0000_0000))));
  }, [activite, services.alea]);

  const jouer = useCallback((action: ActionCalcul) => {
    const avant = etatRef.current;
    const apres = jouerCalcul(avant, action);
    if (apres === avant) return;
    etatRef.current = apres;
    fixerEtat(apres);
    const retour = apres.retour?.type;
    if (retour === 'pas-encore') {
      if (action.type === 'chiffre') fixerRefus({ chiffre: action.chiffre, marque: apres.marque });
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    } else if (retour !== 'aide' && retour !== undefined) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: [0, 0], serie: serie.current });
    }
  }, [services.retour]);

  // Le clavier physique : toujours écouté, sur toute la page.
  useEffect(() => {
    const ecouter = (evenement: KeyboardEvent): void => {
      const chiffre = chiffreDuClavier(evenement);
      if (chiffre === null) return;
      evenement.preventDefault();
      jouer({ type: 'chiffre', chiffre });
    };
    window.addEventListener('keydown', ecouter);
    return () => { window.removeEventListener('keydown', ecouter); };
  }, [jouer]);

  useEffect(() => () => { services.voix.taire(); }, [services.voix]);

  const etape = etat.terminee ? null : etat.etapes[etat.index] ?? null;
  const cible = caseCourante(etat);
  const aide = aideCalcul(etat);
  const phraseRetour = phraseDuRetour(etat);
  const consigne = activite === 'gue' ? PHRASES_CALCUL.consigneGue : PHRASES_CALCUL.consignePose;
  const aChoisir = etape !== null && etape.forme === 'ligne' && etape.choix !== null;

  const aideProposee: AideProposee | null = useMemo(() => aide === null ? null : {
    niveau: aide.niveau, code: aide.niveau === 'indice' ? 'relire-consigne' : 'montre-cible', cible: null, texte: aide.texte,
  }, [aide]);

  const scene = etat.terminee ? (
    <Reussite etat={etat} surEncore={recommencer} surQuitter={surQuitter} />
  ) : (
    <div className="calcul-scene" data-calcul-forme={etape?.forme ?? ''}>
      <RepereEtape moteur="calcul" rang={etat.index + 1} total={etat.etapes.length}
        animationsDesactivees={animationsDesactivees} />
      {activite === 'gue' ? <Gue etat={etat} /> : null}
      {etape?.forme === 'ligne' ? <Egalite etape={etape} etat={etat} caseMarquee={cible?.id ?? null} /> : null}
      {etape?.forme === 'colonnes' ? <Colonnes etape={etape} etat={etat} caseMarquee={cible?.id ?? null} /> : null}
    </div>
  );

  const reserve = etat.terminee ? undefined : aChoisir && etape.forme === 'ligne' ? (
    <div className="calcul-choix" data-plateau="choix-calcul">
      {etape.choix!.map((valeur) => (
        <button key={valeur} type="button" className="cible calcul-choix__carte"
          data-choix={String(valeur)}
          data-essaye={etat.choixEssayes.includes(valeur) ? 'oui' : 'non'}
          data-montre={aide?.choixMontre === valeur ? 'oui' : 'non'}
          onClick={() => { jouer({ type: 'choix', valeur }); }}>
          {valeur}
        </button>
      ))}
    </div>
  ) : (
    <div className="calcul-pave" data-plateau="pave-calcul" role="group" aria-label="Les chiffres">
      {PAVE.map((chiffre) => (
        <Touche key={refus?.chiffre === chiffre ? `${String(chiffre)}-${String(refus.marque)}` : String(chiffre)}
          chiffre={chiffre} montree={aide?.toucheMontree === chiffre}
          refusee={refus?.chiffre === chiffre && etat.retour?.type === 'pas-encore'}
          animationsDesactivees={animationsDesactivees}
          surTouche={() => { jouer({ type: 'chiffre', chiffre }); }} />
      ))}
    </div>
  );

  const pied = (
    <p className="calcul-pied" role="status" aria-live="polite" data-retour-calcul={etat.retour?.type ?? ''}>
      {phraseRetour?.texte ?? ''}
      {phraseRetour === null ? null : <BoutonEcouter texte={phraseRetour.texte} cle={phraseRetour.cle} locuteur="gobi"
        libelle="Réécouter Gobi" />}
    </p>
  );

  return (
    <main className="ecran-activite ecran-calcul" data-ecran="mathematiques" data-calcul={activite}
      data-calcul-etape={etape?.id ?? ''} data-calcul-termine={etat.terminee ? 'oui' : 'non'}
      data-graine={String(etat.graine)}>
      <header className="zone-lecture entete-activite barre-consigne">
        <button type="button" className="cible activite-retour" data-vers="vallee"
          aria-label="Revenir aux jeux des nombres" onClick={surQuitter}>
          <span aria-hidden="true">←</span><span>Les nombres</span>
        </button>
        <div className="activite-consigne">
          <p className="activite-consigne-texte" data-consigne-calcul={consigne.cle}>{consigne.texte}</p>
        </div>
        <BoutonEcouter texte={consigne.texte} cle={consigne.cle} />
      </header>
      <CadreSceneActivite>
        <DispositionMoteur moteur="calcul" data-calcul-saisie={aChoisir ? 'choix' : 'pave'}
          data-aide={etat.aideEtape} scene={scene} {...(reserve === undefined ? {} : { reserve })} pied={pied} />
      </CadreSceneActivite>
      <Gobi aide={aideProposee} niveau={etat.aideEtape}
        surDemande={etat.terminee ? null : () => { jouer({ type: 'aide' }); }}
        aideResolue={aide === null ? null : { texte: aide.texte, cle: aide.cle, source: 'strategie' }}
        stade={stade} />
    </main>
  );
}

function Touche({ chiffre, montree, refusee, animationsDesactivees, surTouche }: {
  readonly chiffre: number; readonly montree: boolean; readonly refusee: boolean;
  readonly animationsDesactivees: boolean; readonly surTouche: () => void;
}): ReactElement {
  return (
    <button type="button" className={refusee && !animationsDesactivees ? 'cible calcul-touche oscillation' : 'cible calcul-touche'}
      data-chiffre={String(chiffre)} data-montree={montree ? 'oui' : 'non'} data-refusee={refusee ? 'oui' : 'non'}
      aria-label={`Chiffre ${String(chiffre)}`} onClick={surTouche}>
      {chiffre}
    </button>
  );
}

/** Le gué : 12 pierres, la barre de progression. Décor, rien à lire. */
function Gue({ etat }: { readonly etat: EtatCalcul }): ReactElement {
  return (
    <ol className="calcul-gue" aria-label={`Gobi a passé ${String(etat.index)} pierres sur ${String(etat.etapes.length)}`}
      data-pierres-sorties={String(etat.index)}>
      {etat.etapes.map((e, rang) => (
        <li key={e.id} className="calcul-gue__pierre"
          data-pierre={rang < etat.index ? 'sortie' : rang === etat.index ? 'devant' : 'eau'} />
      ))}
    </ol>
  );
}

function CaseSaisie({ id, valeur, marquee, retenue = false }: {
  readonly id: string; readonly valeur: number | undefined; readonly marquee: boolean; readonly retenue?: boolean;
}): ReactElement {
  return (
    <span className={retenue ? 'calcul-case calcul-case--retenue' : 'calcul-case'} data-case={id}
      data-marquee={marquee ? 'oui' : 'non'} data-remplie={valeur === undefined ? 'non' : 'oui'}>
      {valeur ?? ''}
    </span>
  );
}

function Egalite({ etape, etat, caseMarquee }: {
  readonly etape: EtapeLigne; readonly etat: EtatCalcul; readonly caseMarquee: string | null;
}): ReactElement {
  const terme = (rang: 0 | 1 | 2): ReactElement => rang === etape.trou ? (
    <span className="calcul-trou" data-trou="oui">
      {etape.cases.map((c) => <CaseSaisie key={c.id} id={c.id} valeur={etat.saisies[c.id]} marquee={c.id === caseMarquee} />)}
    </span>
  ) : <span className="calcul-nombre">{etape.termes[rang]}</span>;
  return (
    <div className="calcul-operation calcul-egalite" data-egalite={etape.id}
      aria-label={`${etape.trou === 0 ? '?' : String(etape.termes[0])} ${etape.operateur === '+' ? 'plus' : 'moins'} ${etape.trou === 1 ? '?' : String(etape.termes[1])} égale ${etape.trou === 2 ? '?' : String(etape.termes[2])}`}>
      {terme(0)}
      <span className="calcul-signe">{etape.operateur === '+' ? '+' : '−'}</span>
      {terme(1)}
      <span className="calcul-signe">=</span>
      {terme(2)}
    </div>
  );
}

function Colonnes({ etape, etat, caseMarquee }: {
  readonly etape: EtapeColonnes; readonly etat: EtatCalcul; readonly caseMarquee: string | null;
}): ReactElement {
  const chiffre = (n: number, rang: 'd' | 'u'): number => (rang === 'd' ? Math.floor(n / 10) % 10 : n % 10);
  const retenue = etape.cases.find((c) => c.role === 'retenue');
  const montreeRetenue = retenue !== undefined && etat.saisies[retenue.id] !== undefined && etat.retour?.type === 'retenue-posee';
  return (
    <div className="calcul-operation calcul-colonnes" data-pose={etape.id}
      aria-label={`${String(etape.haut)} plus ${String(etape.bas)}`}>
      <span className="calcul-entete" data-zone="ed">d</span>
      <span className="calcul-entete" data-zone="eu">u</span>
      <span className="calcul-cellule-retenue" data-zone="rd" data-retenue-montree={montreeRetenue ? 'oui' : 'non'}>
        {retenue === undefined ? null : <CaseSaisie id={retenue.id} valeur={etat.saisies[retenue.id]} marquee={false} retenue />}
      </span>
      <span className="calcul-nombre" data-zone="hd">{chiffre(etape.haut, 'd')}</span>
      <span className="calcul-nombre" data-zone="hu">{chiffre(etape.haut, 'u')}</span>
      <span className="calcul-signe" data-zone="op">+</span>
      <span className="calcul-nombre" data-zone="bd">{chiffre(etape.bas, 'd')}</span>
      <span className="calcul-nombre" data-zone="bu">{chiffre(etape.bas, 'u')}</span>
      <span className="calcul-barre" data-zone="tr" aria-hidden="true" />
      {etape.cases.filter((c) => c.role === 'chiffre').map((c) => (
        <span key={c.id} data-zone={c.colonne === 'd' ? 'sd' : 'su'} className="calcul-cellule">
          <CaseSaisie id={c.id} valeur={etat.saisies[c.id]} marquee={c.id === caseMarquee} />
        </span>
      ))}
    </div>
  );
}

function Reussite({ etat, surEncore, surQuitter }: {
  readonly etat: EtatCalcul; readonly surEncore: () => void; readonly surQuitter: () => void;
}): ReactElement {
  const etoiles = etoilesCalcul(etat);
  const phrase = etat.activite === 'gue' ? PHRASES_CALCUL.finGue : PHRASES_CALCUL.finPose;
  return (
    <section className="calcul-reussite" data-calcul-reussite="oui" data-etoiles={String(etoiles)}>
      <p className="calcul-reussite__etoiles" aria-label={`${String(etoiles)} étoiles`}>
        {'★'.repeat(etoiles)}{'☆'.repeat(3 - etoiles)}
      </p>
      <p className="calcul-reussite__texte">{phrase.texte}</p>
      <div className="calcul-reussite__actions">
        <button type="button" className="cible cible-primaire" data-action="encore" onClick={surEncore}>
          {etat.activite === 'gue' ? 'Encore une rivière' : 'Encore une pierre'}
        </button>
        <button type="button" className="cible cible-secondaire" onClick={surQuitter}>Les nombres</button>
      </div>
    </section>
  );
}
