// La courbe de latence de reconnaissance — **l'indicateur principal du dashboard** (D18).
//
// « La lenteur est une donnée à suivre, pas un défaut à corriger de front. » Trois partis pris
// découlent directement de cette phrase :
//
//   1. **Médiane et quartiles, jamais la moyenne.** La bande claire est l'intervalle
//      inter-quartile : c'est elle qui dit si l'enfant est régulier ou irrégulier, et cette
//      information-là ne tient dans aucune moyenne.
//   2. **Aucune couleur d'alarme, aucun seuil affiché.** Il n'existe pas de « bonne » latence
//      pour un enfant qui sort du CP ; ce qu'on regarde, c'est le sens de la pente.
//   3. **Une courbe par compétence**, jamais une courbe globale : la fluence sur `gph.b` et
//      sur `mot.outil.le` ne se mélangent pas.
import type { ReactElement } from 'react';
import type { PointLatence } from '@pierre/partage/parent';

export interface ProprietesCourbeLatence {
  readonly points: readonly PointLatence[];
}

/** Six teintes du nuancier, prises dans l'ordre. Aucune n'est un code d'alerte. */
const TEINTES = [
  'var(--lagon)',
  'var(--menthe)',
  'var(--framboise)',
  'var(--soleil)',
  'var(--nuancier-violet)',
  'var(--nuancier-brun)'
];

const LARGEUR = 720;
const HAUTEUR = 260;
const MARGE = { gauche: 56, droite: 16, haut: 16, bas: 36 };

interface Serie {
  readonly competence: string;
  readonly teinte: string;
  readonly points: readonly PointLatence[];
}

function grouperParCompetence(points: readonly PointLatence[]): readonly Serie[] {
  const parCompetence = new Map<string, PointLatence[]>();
  for (const point of points) {
    const existant = parCompetence.get(point.competence);
    if (existant === undefined) {
      parCompetence.set(point.competence, [point]);
    } else {
      existant.push(point);
    }
  }
  return [...parCompetence.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([competence, liste], rang) => ({
      competence,
      teinte: TEINTES[rang % TEINTES.length] ?? 'var(--trait)',
      points: [...liste].sort((a, b) => (a.jour < b.jour ? -1 : 1))
    }));
}

export function CourbeLatence({ points }: ProprietesCourbeLatence): ReactElement {
  if (points.length === 0) {
    return (
      <section data-indicateur="latence" style={{ display: 'grid', gap: '0.5rem' }}>
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
          Vitesse de reconnaissance
        </h2>
        <p style={{ margin: 0 }}>
          Aucune mesure pour l’instant. La courbe apparaîtra dès les premières parties.
        </p>
      </section>
    );
  }

  const series = grouperParCompetence(points);
  const jours = [...new Set(points.map((point) => point.jour))].sort();
  const maxMs = Math.max(...points.map((point) => point.q3Ms), 1);

  const x = (jour: string): number => {
    const rang = jours.indexOf(jour);
    const pas = jours.length <= 1 ? 0 : (LARGEUR - MARGE.gauche - MARGE.droite) / (jours.length - 1);
    return MARGE.gauche + rang * pas;
  };
  const y = (ms: number): number =>
    HAUTEUR - MARGE.bas - (ms / maxMs) * (HAUTEUR - MARGE.haut - MARGE.bas);

  return (
    <section data-indicateur="latence" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Vitesse de reconnaissance
      </h2>
      <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        Médiane et écart habituel, par jour. Ce qui compte est le sens de la pente, pas la valeur.
      </p>

      <svg
        viewBox={`0 0 ${String(LARGEUR)} ${String(HAUTEUR)}`}
        role="img"
        aria-label={`Vitesse de reconnaissance sur ${String(jours.length)} jour(s), ${String(series.length)} compétence(s)`}
        style={{ inlineSize: '100%', blockSize: 'auto', background: 'var(--parchemin)' }}
      >
        {/* Axe des temps, sans graduation d'alerte : aucune ligne rouge n'existe ici. */}
        <line
          x1={MARGE.gauche}
          y1={HAUTEUR - MARGE.bas}
          x2={LARGEUR - MARGE.droite}
          y2={HAUTEUR - MARGE.bas}
          stroke="var(--grisaille)"
          strokeWidth={2}
        />
        <text x={4} y={MARGE.haut + 10} fontSize={12} fill="var(--texte-secondaire)">
          {`${String(Math.round(maxMs))} ms`}
        </text>
        <text x={4} y={HAUTEUR - MARGE.bas} fontSize={12} fill="var(--texte-secondaire)">
          0 ms
        </text>

        {series.map((serie) => (
          <g key={serie.competence} data-serie-competence={serie.competence}>
            {/* Bande inter-quartile : la régularité, que la médiane seule cacherait. */}
            {serie.points.map((point) => (
              <line
                key={`${point.jour}-bande`}
                x1={x(point.jour)}
                y1={y(point.q1Ms)}
                x2={x(point.jour)}
                y2={y(point.q3Ms)}
                stroke={serie.teinte}
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.25}
              />
            ))}
            <polyline
              fill="none"
              stroke={serie.teinte}
              strokeWidth={3}
              strokeLinejoin="round"
              points={serie.points
                .map((point) => `${String(x(point.jour))},${String(y(point.medianeMs))}`)
                .join(' ')}
            />
            {serie.points.map((point) => (
              <circle
                key={`${point.jour}-point`}
                data-point-latence={point.jour}
                cx={x(point.jour)}
                cy={y(point.medianeMs)}
                r={5}
                fill={serie.teinte}
              >
                <title>
                  {`${point.competence} — ${point.jour} : ${String(point.medianeMs)} ms (${String(point.nbMesures)} mesure(s))`}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>

      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
        {series.map((serie) => (
          <li key={serie.competence} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              aria-hidden="true"
              style={{
                inlineSize: '1rem',
                blockSize: '1rem',
                borderRadius: '50%',
                background: serie.teinte,
                display: 'inline-block'
              }}
            />
            {serie.competence}
          </li>
        ))}
      </ul>
    </section>
  );
}
