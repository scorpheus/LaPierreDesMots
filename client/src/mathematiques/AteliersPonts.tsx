import { useEffect, useState, type ReactElement } from 'react';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import type { InstancePont01, InstancePont02, InstancePont03 } from '@pierre/partage/mathematiques';
import './ateliers-ponts.css';

interface Proprietes<I> {
  readonly instance: I;
  readonly etat: EtatManipulationMaths;
  readonly attente: boolean;
  readonly surGeste: (geste: GesteMaths) => void;
}

const nombre = (valeur: number | string | boolean | null | undefined): number | null =>
  typeof valeur === 'number' && Number.isSafeInteger(valeur) ? valeur : null;

function graduation(maximum: number): readonly number[] {
  return Array.from({ length: maximum + 1 }, (_, valeur) => valeur);
}

function MesureTrajet({ instance, etat, attente, surGeste }: Proprietes<InstancePont01>): ReactElement {
  const morceaux = instance.parametres.segmentsTrajet!;
  const selection = morceaux.find((morceau) => morceau.id === etat.selection) ?? null;
  const zero = selection ? nombre(etat.placements[`regle:${selection.id}`]) : null;
  const lecture = selection ? nombre(etat.objets[`longueurLue:${selection.id}`]) ?? 0 : 0;
  const maximum = Math.max(...morceaux.map((morceau) => morceau.longueur)) + 5;
  const choixZero = graduation(Math.max(...morceaux.map((morceau) => morceau.origine)) + 2);
  return <section className="ponts-atelier" aria-label="Deux morceaux du chemin" data-atelier="regle">
    <h2>Mesurer les deux morceaux</h2>
    <p>Vers la borne {instance.parametres.repereDestination}, le chemin a deux morceaux.
      Choisis chaque morceau, pose le zéro de la règle à son départ et lis sa longueur.</p>
    <div className="ponts-choix ponts-stock">
      {morceaux.map((morceau, rang) => <button type="button" key={morceau.id} disabled={attente}
        aria-pressed={etat.selection === morceau.id} onClick={() => surGeste({ type: 'choisir', objetId: morceau.id })}>
        Morceau {rang === 0 ? 'A' : 'B'}
        <span className="ponts-piece" style={{ width: `${Math.max(24, morceau.longueur * 5)}px` }} />
        <small>Longueur lue : {String(etat.objets[`longueurLue:${morceau.id}`] ?? '—')} cm</small>
      </button>)}
    </div>
    {selection && <>
      <fieldset className="ponts-groupe"><legend>Place le zéro pour {selection.id === 'segment-a' ? 'A' : 'B'}</legend>
        <div className="ponts-mesure-scroll" role="region" aria-label="Morceau et règle sur le même axe" tabIndex={0}>
          <div className="ponts-mesure-canevas" style={{ width: `${(selection.origine + maximum + 3) * 32}px` }}>
            <span className="ponts-mesure-depart" style={{ left: `${selection.origine * 32}px` }}>Départ</span>
            <span className="ponts-mesure-planche" style={{ left: `${selection.origine * 32}px`,
              width: `${selection.longueur * 32}px` }} />
            <div className="ponts-mesure-regle" data-zero-pose={zero === null ? 'aucun' : String(zero)}
              style={{ left: `${(zero ?? 0) * 32}px`, width: `${(maximum + 1) * 32}px` }}>
              {graduation(maximum).map((valeur) => <span key={valeur} className="ponts-mesure-graduation"
                style={{ width: '32px' }}>{valeur % 2 === 0 ? valeur : ''}</span>)}
            </div>
          </div>
        </div>
        <div className="ponts-choix ponts-choix-scroll">{choixZero.map((origine) =>
          <button type="button" key={origine} disabled={attente} aria-pressed={zero === origine}
            onClick={() => surGeste({ type: 'aligner-regle', origine })}>{origine}</button>)}</div>
      </fieldset>
      <fieldset className="ponts-groupe"><legend>Quelle longueur lis-tu ?</legend>
        <div className="ponts-compteur" aria-live="polite">
          <button type="button" disabled={attente || lecture <= 0}
            onClick={() => surGeste({ type: 'lire-longueur', valeur: Math.max(0, lecture - 1) })}>−1</button>
          <output>{lecture} cm</output>
          <button type="button" disabled={attente || lecture >= maximum}
            onClick={() => surGeste({ type: 'lire-longueur', valeur: lecture + 1 })}>+1</button>
        </div>
      </fieldset>
    </>}
    <p>Une fois les deux morceaux mesurés, ajoute leurs longueurs pour construire le tablier.</p>
  </section>;
}

/** La règle montre son zéro et ses graduations ; la longueur lue reste un choix de l'enfant. */
export function Regle({ instance, etat, attente, surGeste }: Proprietes<InstancePont01>): ReactElement {
  if (instance.parametres.segmentsTrajet) return <MesureTrajet instance={instance} etat={etat} attente={attente} surGeste={surGeste} />;
  const p = instance.parametres;
  const unitePx = 32;
  const longueurLue = nombre(etat.objets.longueurLue) ?? 0;
  const zeroPose = nombre(etat.placements.regle);
  const choixZero = graduation(Math.max(5, p.origineCible + 1));
  const maximumLecture = Math.max(30, p.longueurCible + 5);
  const largeurMesure = (Math.max(p.origineCible + p.longueurCible + 2,
    choixZero.length - 1 + maximumLecture) + 1) * unitePx;
  const planchesPosees = Object.keys(etat.placements).filter((id) => id !== 'regle');
  const modifierLecture = (variation: number): void => {
    const suivante = Math.max(0, Math.min(maximumLecture, longueurLue + variation));
    if (suivante !== longueurLue) surGeste({ type: 'lire-longueur', valeur: suivante });
  };
  return <section className="ponts-atelier" aria-label="Règle et planches" data-atelier="regle">
    <h2>{p.reparation ? 'Mesurer le module abîmé' : 'Mesurer les planches'}</h2>
    <p>{p.reparation
      ? 'Aligne le zéro au début du module abîmé. Lis sa longueur, puis choisis les planches pour le remplacer.'
      : 'Aligne le zéro sur le départ de la planche. Compte les graduations, puis choisis les planches.'}</p>
    <fieldset className="ponts-groupe">
      <legend>Place le zéro de la règle</legend>
      <p className="ponts-mesure-legende">Le trait rouge marque le départ.
        Place le zéro sous ce trait.</p>
      <div className="ponts-mesure-scroll" role="region" aria-label="Planche et règle sur le même axe" tabIndex={0}>
        <div className="ponts-mesure-canevas" style={{ width: `${largeurMesure}px` }}>
          {p.reparation && <span className="ponts-mesure-restant" aria-label="Module resté en place"
            style={{ left: 0, width: `${p.reparation.moduleRestantCm * unitePx}px` }} />}
          <span className="ponts-mesure-depart" style={{ left: `${p.origineCible * unitePx}px` }}>
            {p.reparation ? 'Début du module abîmé' : 'Départ de la planche'}
          </span>
          <span className="ponts-mesure-planche" data-planche-a-mesurer="true"
            data-endommage={p.reparation ? 'true' : undefined}
            style={{ left: `${p.origineCible * unitePx}px`, width: `${p.longueurCible * unitePx}px` }} />
          <div className="ponts-mesure-regle" data-zero-pose={zeroPose === null ? 'aucun' : String(zeroPose)}
            style={{ left: `${(zeroPose ?? 0) * unitePx}px`, width: `${(maximumLecture + 1) * unitePx}px` }}
            aria-label={zeroPose === null ? 'Règle à poser' : `Règle, zéro placé au repère ${zeroPose}`}>
            {graduation(maximumLecture).map((valeur) =>
              <span key={valeur} className="ponts-mesure-graduation" style={{ width: `${unitePx}px` }}
                aria-label={`${valeur} centimètres`}>
                {valeur % 2 === 0 ? valeur : ''}
              </span>)}
          </div>
        </div>
      </div>
      <p className="ponts-defiler">Fais glisser le dessin ou les choix vers la gauche pour voir la suite →</p>
      <div className="ponts-choix ponts-choix-scroll">
        {choixZero.map((origine) => <button type="button" key={origine} disabled={attente}
          aria-pressed={zeroPose === origine} onClick={() => surGeste({ type: 'aligner-regle', origine })}>
          {origine}
        </button>)}
      </div>
    </fieldset>
    <fieldset className="ponts-groupe">
      <legend>Quelle longueur lis-tu ?</legend>
      <div className="ponts-compteur" aria-live="polite">
        <button type="button" disabled={attente || longueurLue <= 0} onClick={() => modifierLecture(-10)} aria-label="Enlever dix centimètres">−10</button>
        <button type="button" disabled={attente || longueurLue <= 0} onClick={() => modifierLecture(-1)} aria-label="Enlever un centimètre">−1</button>
        <output>{longueurLue} cm</output>
        <button type="button" disabled={attente || longueurLue >= maximumLecture} onClick={() => modifierLecture(1)} aria-label="Ajouter un centimètre">+1</button>
        <button type="button" disabled={attente || longueurLue >= maximumLecture} onClick={() => modifierLecture(10)} aria-label="Ajouter dix centimètres">+10</button>
      </div>
    </fieldset>
    <fieldset className="ponts-groupe">
      <legend>Choisis {p.nombrePlanches === 1 ? 'une planche' : `${p.nombrePlanches} planches`}</legend>
      <div className="ponts-choix ponts-stock">
        {p.choix.map((planche) => {
          const posee = planche.id in etat.placements;
          return <button type="button" key={planche.id} disabled={attente}
            aria-pressed={posee} aria-label={`${planche.id}, ${planche.longueur} centimètres, ${posee ? 'retirer' : 'choisir'}`}
            onClick={() => surGeste(posee ? { type: 'retirer', objetId: planche.id } : { type: 'choisir', objetId: planche.id })}>
            <span className="ponts-piece" style={{ width: `${Math.max(24, (planche.longueur / Math.max(...p.choix.map((choix) => choix.longueur))) * 100)}%` }} />
            <span>{planche.id.replace('planche-', 'Planche ').toUpperCase()} · {planche.longueur} cm</span>
            <small>{posee ? 'Retirer' : 'Choisir'}</small>
          </button>;
        })}
      </div>
      <p className="ponts-etat">Sur le pont : {planchesPosees.length} {planchesPosees.length > 1 ? 'planches' : 'planche'}.</p>
    </fieldset>
  </section>;
}

/** La valeur à poser et la graduation touchée sont deux décisions distinctes. */
export function Bornes({ instance, etat, attente, surGeste }: Proprietes<InstancePont02>): ReactElement {
  const p = instance.parametres;
  const [valeurChoisie, choisirValeur] = useState<number | null>(null);
  const [inferieure, choisirInferieure] = useState<number | null>(null);
  const [superieure, choisirSuperieure] = useState<number | null>(null);
  useEffect(() => {
    choisirValeur(null);
    choisirInferieure(null);
    choisirSuperieure(null);
  }, [instance.id]);
  return <section className="ponts-atelier" aria-label="Bornes de la rive" data-atelier="bornes">
    <h2>Poser les bornes</h2>
    <p>{p.porteeAVerifier === undefined
      ? 'Choisis un nombre, puis touche sa place sur la rive graduée.'
      : 'Le pont réparé part de zéro. Place sa borne sur la rive graduée pour vérifier qu’il atteint l’autre rive.'}</p>
    <fieldset className="ponts-groupe">
      <legend>Nombre à porter</legend>
      <div className="ponts-choix ponts-choix-scroll">
        {p.graduations.map((valeur) => <button type="button" key={valeur} disabled={attente}
          aria-pressed={valeurChoisie === valeur} onClick={() => choisirValeur(valeur)}>
          {valeur}
        </button>)}
      </div>
    </fieldset>
    <fieldset className="ponts-groupe">
      <legend>Place sur la rive</legend>
      <div className="ponts-choix ponts-choix-scroll ponts-rive">
        {p.graduations.map((position) => {
          const ici = Object.entries(etat.placements).filter(([, place]) => place === position)
            .map(([id]) => id.slice('borne:'.length));
          return <button type="button" key={position} disabled={attente || valeurChoisie === null}
            aria-label={`Graduation ${position}${ici.length ? `, borne ${ici.join(' et ')} posée` : ''}`}
            onClick={() => valeurChoisie !== null && surGeste({ type: 'placer-borne', valeur: valeurChoisie, position })}>
            <span>{position}</span><small>{ici.length ? `● ${ici.join(', ')}` : '○'}</small>
          </button>;
        })}
      </div>
      <div className="ponts-choix ponts-stock">
        {Object.keys(etat.placements).filter((id) => id.startsWith('borne:')).map((id) =>
          <button type="button" key={id} disabled={attente}
            onClick={() => surGeste({ type: 'retirer', objetId: id })}>
            Retirer la borne {id.slice('borne:'.length)}
          </button>)}
      </div>
    </fieldset>
    {instance.niveau === 'defi' && <fieldset className="ponts-groupe">
      <legend>Quels nombres encadrent la borne ?</legend>
      <p>Choisis un nombre avant et un nombre après, puis confirme ton choix.</p>
      <div className="ponts-encadrement">
        <div><span>Avant</span><div className="ponts-choix ponts-choix-scroll">{p.graduations.map((valeur) =>
          <button type="button" key={valeur} disabled={attente} aria-pressed={inferieure === valeur}
            onClick={() => choisirInferieure(valeur)}>{valeur}</button>)}</div></div>
        <div><span>Après</span><div className="ponts-choix ponts-choix-scroll">{p.graduations.map((valeur) =>
          <button type="button" key={valeur} disabled={attente} aria-pressed={superieure === valeur}
            onClick={() => choisirSuperieure(valeur)}>{valeur}</button>)}</div></div>
      </div>
      <button type="button" className="ponts-confirmer" disabled={attente || inferieure === null || superieure === null}
        onClick={() => inferieure !== null && superieure !== null &&
          surGeste({ type: 'montrer-encadrement', inferieure, superieure })}>
        Montrer mon encadrement
      </button>
      {etat.objets.borneInferieure !== undefined && <p className="ponts-etat">
        Montré : {String(etat.objets.borneInferieure)} et {String(etat.objets.borneSuperieure)}.
      </p>}
    </fieldset>}
  </section>;
}

/** Chaque module part d'une position entière choisie sur la bande ; le stock reste réversible. */
export function Tablier({ instance, etat, attente, surGeste }: Proprietes<InstancePont03>): ReactElement {
  const [pieceChoisie, choisirPiece] = useState<string | null>(null);
  useEffect(() => { choisirPiece(null); }, [instance.id]);
  const p = instance.parametres;
  const placements = Object.entries(etat.placements).filter(([id]) =>
    p.pieces.some((piece) => piece.id === id));
  const extremite = Math.max(p.portee, ...placements.map(([id, debut]) =>
    Number(debut) + (p.pieces.find((piece) => piece.id === id)?.longueur ?? 0)));
  return <section className="ponts-atelier" aria-label="Tablier modulable" data-atelier="tablier">
    <h2>Assembler le tablier</h2>
    <p>{p.reparation
      ? p.reparation.moduleEndommageId in etat.placements
        ? 'Le module abîmé est encore sur le pont. Retire-le, puis garde le module stable en place.'
        : 'Le module abîmé a été retiré. Comble le trou avec deux modules.'
      : p.trajet
        ? `Vers la borne ${p.trajet.repereDestination}, les morceaux mesurés font ${p.trajet.longueurA} cm et ${p.trajet.longueurB} cm. Assemble le tablier jusqu’à l’autre rive.`
        : 'Choisis un module, puis touche son point de départ sur la bande. Un module posé peut être retiré.'}</p>
    <div className="ponts-bande" role="img" aria-label={p.trajet ? 'Pont à assembler selon les deux morceaux mesurés' : `Pont de ${p.portee} centimètres`}>
      <div className="ponts-bande-mesure" style={{ width: `${(p.portee / Math.max(1, extremite)) * 100}%` }} />
      {p.reparation && !(p.reparation.moduleEndommageId in etat.placements) &&
        <span className="ponts-module-manquant" aria-label="Trou laissé par le module abîmé"
        style={{ left: `${((p.portee - p.reparation.manqueCm) / Math.max(1, extremite)) * 100}%`,
          width: `${(p.reparation.manqueCm / Math.max(1, extremite)) * 100}%` }}>Module retiré</span>}
      <span className="ponts-bande-fin" style={{ left: `${(p.portee / Math.max(1, extremite)) * 100}%` }}>
        <span className="ponts-bande-fin__etiquette">{p.trajet ? 'Autre rive' : `Rive : ${p.portee} cm`}</span>
      </span>
      {placements.map(([id, debut]) => {
        const piece = p.pieces.find((candidate) => candidate.id === id)!;
        return <span key={id} className={id === p.reparation?.moduleEndommageId
          ? 'ponts-module-pose ponts-module-pose--abime' : 'ponts-module-pose'}
          style={{ left: `${(Number(debut) / Math.max(1, extremite)) * 100}%`,
            width: `${(piece.longueur / Math.max(1, extremite)) * 100}%` }}>
          {id === p.reparation?.moduleEndommageId ? 'ABÎMÉ' : id.replace('module-', '').toUpperCase()}
        </span>;
      })}
    </div>
    <fieldset className="ponts-groupe">
      <legend>Modules disponibles</legend>
      <div className="ponts-choix ponts-stock">
        {p.pieces.map((piece) => {
          const posee = piece.id in etat.placements;
          const fixe = p.reparation?.moduleRestantId === piece.id;
          const abime = p.reparation?.moduleEndommageId === piece.id;
          return <button type="button" key={piece.id} data-testid={`piece-${piece.id}`}
            disabled={attente || fixe || (abime && !posee)}
            aria-pressed={pieceChoisie === piece.id}
            aria-label={`${piece.id}, ${piece.longueur} centimètres${posee ? ', déjà posé' : ''}`}
            onClick={() => choisirPiece(piece.id)}>
            <span className="ponts-piece" style={{ width: `${Math.max(24, (piece.longueur / p.portee) * 100)}%` }} />
            <span>{abime ? 'Module abîmé' : piece.id.replace('module-', 'Module ').toUpperCase()} · {piece.longueur} cm
              {fixe ? ' · reste en place' : abime ? ' · à retirer' : ''}</span>
          </button>;
        })}
      </div>
      {pieceChoisie !== null && pieceChoisie in etat.placements && pieceChoisie !== p.reparation?.moduleRestantId &&
        <button type="button" className="ponts-confirmer" disabled={attente}
          onClick={() => surGeste({ type: 'retirer', objetId: pieceChoisie })}>
          Retirer {pieceChoisie.replace('module-', 'le module ')}
        </button>}
    </fieldset>
    <fieldset className="ponts-groupe">
      <legend>Choisis le début du module sur la bande</legend>
      <div className="ponts-choix-scroll ponts-positions">
        {graduation(p.portee).map((position) => <button type="button" key={position}
          data-testid={`tablier-position-${position}`}
          disabled={attente || pieceChoisie === null || pieceChoisie === p.reparation?.moduleEndommageId}
          aria-label={`Départ à ${position} centimètres`}
          onClick={() => pieceChoisie !== null && surGeste({ type: 'placer-piece', objetId: pieceChoisie, position })}>
          {position}
        </button>)}
      </div>
      <p className="ponts-defiler">Fais glisser les départs vers la gauche pour voir les autres positions →</p>
    </fieldset>
  </section>;
}
