import { useState, type ReactElement } from 'react';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import type {
  InstanceChantier, InstanceChantier01, InstanceChantier02, InstanceChantier03,
} from '@pierre/partage/mathematiques';
import { validerChantier } from '@pierre/partage/mathematiques';
import './ateliers-chantier.css';

export interface ProprietesAteliersChantier {
  readonly instance: InstanceChantier;
  readonly etat: EtatManipulationMaths;
  readonly attente: boolean;
  readonly surGeste: (geste: GesteMaths) => void;
}
type Proprietes<I extends InstanceChantier> = Omit<ProprietesAteliersChantier, 'instance'> & { readonly instance: I };
const nombre = (v: number | string | undefined): number | null => typeof v === 'number' && Number.isSafeInteger(v) ? v : null;
const sommet = (i: number): string => 'ABCD'[i]!;

function Plan({ instance, etat, attente, surGeste }: Proprietes<InstanceChantier01>): ReactElement {
  const [selection, choisir] = useState(0);
  const { grille, largeur, hauteur, planInitial } = instance.parametres;
  const points = Array.from({ length: 4 }, (_, i) => nombre(etat.placements[`sommet-${i}`]));
  const polygone = points.every((p) => p !== null)
    ? points.map((p) => `${((p as number) % grille) * 64 + 32},${Math.floor((p as number) / grille) * 64 + 32}`).join(' ') : null;
  const modele = planInitial ?? (instance.niveau === 'decouverte'
    ? [[1, 1], [1 + largeur, 1], [1 + largeur, 1 + hauteur], [1, 1 + hauteur]] as const : null);
  const origine = modele?.map(([x, y]) => `${x * 64 + 32},${y * 64 + 32}`).join(' ');
  return <section className="chantier-atelier" aria-label="Plan sur quadrillage">
    <h2>Trace le plan</h2>
    <p>Dimensions : {largeur} sur {hauteur} carreaux. Choisis un sommet, puis touche sa place sur le quadrillage.</p>
    <div className="chantier-actions" role="group" aria-label="Sommets du plan">
      {points.map((position, i) => <button type="button" key={i} disabled={attente}
        aria-pressed={selection === i} onClick={() => choisir(i)}>
        Sommet {sommet(i)}{position === null ? '' : ` : ${position % grille}, ${Math.floor(position / grille)}`}
      </button>)}
    </div>
    <p className="chantier-defiler">Fais défiler le quadrillage dans son cadre pour atteindre tous les carreaux.</p>
    <div className="chantier-grille-scroll" role="region" aria-label="Quadrillage à tracer" tabIndex={0}>
      <div className="chantier-grille" style={{ width: grille * 64, height: grille * 64, gridTemplateColumns: `repeat(${grille}, 64px)` }}>
        {Array.from({ length: grille * grille }, (_, position) => {
          const x = position % grille;
          const y = Math.floor(position / grille);
          const marque = points.findIndex((p) => p === position);
          return <button type="button" key={position} disabled={attente}
            aria-label={`Point ${x}, ${y}${marque >= 0 ? `, sommet ${sommet(marque)}` : ''}`}
            className="chantier-cellule" onClick={() => surGeste({ type: 'placer', objetId: `sommet-${selection}`, position })}>
            {marque >= 0 ? sommet(marque) : '·'}
          </button>;
        })}
        <svg className="chantier-trace" width={grille * 64} height={grille * 64} aria-hidden="true">
          {origine && <polygon points={origine} fill="none" stroke="#8d6b59" strokeWidth="5" strokeDasharray="12 8" />}
          {polygone && <polygon points={polygone} fill="#e1a95766" stroke="#174f6a" strokeWidth="5" />}
          {points.map((position, i) => position === null ? null : <circle key={i}
            cx={(position % grille) * 64 + 32} cy={Math.floor(position / grille) * 64 + 32}
            r="9" fill="#174f6a" />)}
        </svg>
      </div>
    </div>
    <p className="chantier-outil">Règle : compte les carreaux entre deux sommets. Équerre : vérifie que les côtés voisins font un angle droit.</p>
    <button type="button" disabled={attente || points[selection] === null}
      onClick={() => surGeste({ type: 'retirer', objetId: `sommet-${selection}` })}>Retirer le sommet {sommet(selection)}</button>
  </section>;
}

function VignettePatron({ points, titre }: { readonly points: readonly (readonly [number, number])[]; readonly titre: string }): ReactElement {
  return <div className="chantier-vignette">
    <span>{titre}</span>
    <svg viewBox="-4 -4 128 128" role="img" aria-label={`${titre}, six carrés à examiner`}>
      {points.map(([x, y], i) => <rect key={i} x={x * 20} y={y * 20} width="20" height="20"
        fill={i % 2 ? '#f6ce85' : '#d6ebeb'} stroke="#445a60" strokeWidth="2" />)}
    </svg>
  </div>;
}

const COULEURS_FACES: Readonly<Record<string, string>> = {
  '0,0,1': '#f6ce85', '0,0,-1': '#e6a36c', '1,0,0': '#b9dfe0',
  '-1,0,0': '#9ac6cb', '0,1,0': '#e5ceec', '0,-1,0': '#d3ade0',
};
function Pliage({ patron, points, faces }: { readonly patron: 'a' | 'b';
  readonly points: readonly (readonly [number, number])[]; readonly faces: readonly string[] }): ReactElement {
  return <div className="chantier-pliage" role="img" aria-label={`Pliage illustré du patron ${patron.toUpperCase()} : à plat, côtés relevés, cube fermé`}>
    <div><span>1. À plat</span><svg viewBox="-4 -4 128 128" aria-hidden="true">
      {points.map(([x, y], i) => <g key={i}>
        <rect x={x * 20} y={y * 20} width="20" height="20" fill={COULEURS_FACES[faces[i]!]}
          stroke="#445a60" strokeWidth="2" />
        <text x={x * 20 + 10} y={y * 20 + 14} textAnchor="middle" fontSize="12">{i + 1}</text>
      </g>)}
    </svg></div>
    <div><span>2. Faces relevées</span><svg viewBox="0 0 96 80" aria-hidden="true">
      <path d="M30 48h36V16H30z" fill={COULEURS_FACES['0,0,1']} stroke="#445a60" strokeWidth="2" />
      <path d="M30 48 14 30V8l16 8" fill={COULEURS_FACES['-1,0,0']} stroke="#445a60" strokeWidth="2" />
      <path d="M66 48l16-18V8L66 16" fill={COULEURS_FACES['1,0,0']} stroke="#445a60" strokeWidth="2" />
    </svg></div>
    <div><span>3. Cube fermé</span><svg viewBox="0 0 96 80" aria-hidden="true">
      <path d="M48 8 78 24 48 40 18 24z" fill={COULEURS_FACES['0,0,1']} stroke="#445a60" strokeWidth="2" />
      <path d="M18 24 48 40v30L18 54z" fill={COULEURS_FACES['-1,0,0']} stroke="#445a60" strokeWidth="2" />
      <path d="M78 24 48 40v30l30-16z" fill={COULEURS_FACES['0,1,0']} stroke="#445a60" strokeWidth="2" />
    </svg></div>
  </div>;
}

function Patron({ instance, etat, attente, surGeste }: Proprietes<InstanceChantier02>): ReactElement {
  const [face, choisirFace] = useState(0);
  const [plateau, choisirPlateau] = useState<'a' | 'b'>('a');
  const patrons: readonly ('a' | 'b')[] = instance.parametres.nombrePatrons === 2 ? ['a', 'b'] : ['a'];
  const validation = validerChantier(instance, etat);
  return <section className="chantier-atelier" aria-label="Patrons du cube">
    <h2>Les six faces du cube</h2>
    <p>Chaque carré est une face. Place six faces jointes par leurs côtés ; elles doivent se plier sans se couvrir.</p>
    {instance.parametres.nombreBlocs !== null && <p>Le plan demande {instance.parametres.nombreBlocs} blocs comme ce cube.</p>}
    {instance.niveau === 'decouverte' && <svg className="chantier-cube-modele" viewBox="0 0 96 80" role="img" aria-label="Cube à six faces, trois faces visibles et trois faces cachées">
      <path d="M48 8 78 24 48 40 18 24z" fill="#f6ce85" stroke="#445a60" strokeWidth="2" />
      <path d="M18 24 48 40v30L18 54z" fill="#d6ebeb" stroke="#445a60" strokeWidth="2" />
      <path d="M78 24 48 40v30l30-16z" fill="#e2b576" stroke="#445a60" strokeWidth="2" />
    </svg>}
    <div className="chantier-vignettes">
      <VignettePatron points={instance.parametres.modele} titre="Modèle à déplier" />
      {instance.niveau !== 'decouverte' && <VignettePatron points={instance.parametres.contreExemple} titre="Autre arrangement à comparer" />}
    </div>
    {instance.parametres.nombrePatrons === 2 && <div className="chantier-actions" role="group" aria-label="Choisir un patron">
      {patrons.map((id) => <button key={id} type="button" disabled={attente} aria-pressed={plateau === id}
        onClick={() => choisirPlateau(id)}>Patron {id.toUpperCase()}</button>)}
    </div>}
    <div className="chantier-actions" role="group" aria-label="Choisir une face">
      {Array.from({ length: 6 }, (_, i) => <button key={i} type="button" disabled={attente}
        aria-pressed={face === i} onClick={() => choisirFace(i)}>
        Face {i + 1}{etat.placements[`face:${plateau}:${i}`] === undefined ? '' : ' posée'}
      </button>)}
    </div>
    <p className="chantier-defiler">Choisis une face, puis touche une case. Tu peux déplacer ou retirer chaque face.</p>
    {patrons.map((id) => <div key={id} className="chantier-plateau">
      <h3>Patron {id.toUpperCase()}</h3>
      <div className="chantier-grille-scroll" role="region" aria-label={`Grille du patron ${id.toUpperCase()}`} tabIndex={0}>
        <div className="chantier-grille chantier-grille--patron">
          {Array.from({ length: 36 }, (_, position) => {
            const occupant = Array.from({ length: 6 }, (_, i) => i)
              .find((i) => etat.placements[`face:${id}:${i}`] === position);
            const guide = instance.niveau === 'decouverte' && instance.parametres.modele.some(([x, y]) => y * 6 + x === position);
            return <button key={position} type="button" disabled={attente}
              className={`chantier-cellule${guide ? ' chantier-cellule--guide' : ''}`}
              aria-label={`Patron ${id.toUpperCase()}, case ${position % 6}, ${Math.floor(position / 6)}${occupant === undefined ? '' : `, face ${occupant + 1}`}`}
              onClick={() => surGeste({ type: 'placer', objetId: `face:${id}:${face}`, position })}>
              {occupant === undefined ? (guide ? '□' : '·') : occupant + 1}
            </button>;
          })}
        </div>
      </div>
    </div>)}
    <button type="button" disabled={attente || etat.placements[`face:${plateau}:${face}`] === undefined}
      onClick={() => surGeste({ type: 'retirer', objetId: `face:${plateau}:${face}` })}>Retirer la face {face + 1} du patron {plateau.toUpperCase()}</button>
    {validation.statut === 'correcte' && patrons.map((id, rang) => {
      const points = Array.from({ length: 6 }, (_, i) => {
        const position = etat.placements[`face:${id}:${i}`] as number;
        return [position % 6, Math.floor(position / 6)] as const;
      });
      const pliages = validation.solution.pliage as readonly (readonly string[])[];
      return <Pliage key={id} patron={id} points={points} faces={pliages[rang]!} />;
    })}
  </section>;
}

function Balance({ instance, etat, attente, surGeste }: Proprietes<InstanceChantier03>): ReactElement {
  const p = instance.parametres;
  if (instance.niveau === 'decouverte') return <section className="chantier-atelier" aria-label="Comparer les masses">
    <h2>Quel plateau est le plus lourd ?</h2>
    <div className="chantier-balance">
      {(['gauche', 'droite'] as const).map((cote) => <button key={cote} type="button" disabled={attente}
        aria-pressed={etat.selection === cote} onClick={() => surGeste({ type: 'choisir', objetId: cote })}>
        Plateau {cote}<strong>{cote === 'gauche' ? p.masseGauche : p.masseDroite} g</strong>
      </button>)}
    </div>
  </section>;
  const total = (cote: 'gauche' | 'droite'): number => p.poids.reduce((n, poids) =>
    n + (etat.placements[poids.id] === cote ? poids.grammes : 0), 0) +
    (cote === 'gauche' ? p.masseGauche ?? 0 : 0);
  return <section className="chantier-atelier" aria-label="Équilibrer la balance">
    <h2>Mets le même poids des deux côtés</h2>
    <p>La masse cherchée est {p.masseCible} g. {instance.niveau === 'defi' ? 'Un kilogramme vaut 1 000 grammes.' : 'Pose les poids pour équilibrer.'}</p>
    <div className="chantier-balance" role="group" aria-label="Plateaux de la balance">
      {(['gauche', 'droite'] as const).map((cote) => <div key={cote} className="chantier-plateau-masse">
        <h3>Plateau {cote}</h3>
        {p.masseGauche !== null && cote === 'gauche' && <span>Charge : {p.masseGauche} g</span>}
        <strong>{total(cote)} g</strong>
        <div className="chantier-poids-poses">{p.poids.filter((poids) => etat.placements[poids.id] === cote)
          .map((poids) => <button type="button" key={poids.id} disabled={attente}
            aria-label={`Retirer ${poids.etiquette} du plateau ${cote}`}
            onClick={() => surGeste({ type: 'retirer', objetId: poids.id })}>{poids.etiquette} ×</button>)}</div>
      </div>)}
    </div>
    <fieldset className="chantier-stock">
      <legend>Poids disponibles</legend>
      {p.poids.map((poids) => <div key={poids.id} className="chantier-poids">
        <span>{poids.etiquette}</span>
        <button type="button" disabled={attente || instance.niveau === 'exploration'}
          onClick={() => surGeste({ type: 'placer', objetId: poids.id, position: 0, destination: 'gauche' })}
          aria-label={`Placer ${poids.etiquette} à gauche`}>À gauche</button>
        <button type="button" disabled={attente}
          onClick={() => surGeste({ type: 'placer', objetId: poids.id, position: 0, destination: 'droite' })}
          aria-label={`Placer ${poids.etiquette} à droite`}>À droite</button>
      </div>)}
    </fieldset>
  </section>;
}

export function AteliersChantier({ instance, etat, attente, surGeste }: ProprietesAteliersChantier): ReactElement {
  if (instance.famille === 'MAT-CHA-01') return <Plan instance={instance} etat={etat} attente={attente} surGeste={surGeste} />;
  if (instance.famille === 'MAT-CHA-02') return <Patron instance={instance} etat={etat} attente={attente} surGeste={surGeste} />;
  return <Balance instance={instance} etat={etat} attente={attente} surGeste={surGeste} />;
}
