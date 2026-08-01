// La carte du monde annotée par la maîtrise RÉELLE — v2 § 14.
//
// « Pour repérer une région coloriée mais mal acquise. » C'est le seul indicateur du dashboard
// qui compare DEUX grandeurs, et c'est là tout son intérêt : le taux de recoloration est ce que
// l'enfant voit, la maîtrise est ce qu'il a réellement acquis. Quand le premier dépasse
// nettement le second, la région est jolie et fragile — et c'est précisément ce qu'aucune barre
// de progression ne dirait.
//
// Le drapeau n'est **jamais** une alerte rouge : c'est une phrase, dans la langue du parent.
// Aucune couleur d'échec n'existe dans ce projet, pas même sur un écran que l'enfant ne voit
// pas — parce qu'un jour il le verra par-dessus l'épaule.
import type { ReactElement } from 'react';
import type { CouvertureRegion } from '@pierre/partage/parent';

export interface ProprietesCarteCouverture {
  readonly couverture: readonly CouvertureRegion[];
}

const NOM_REGION: Readonly<Record<string, string>> = {
  clairiere: 'La Clairière',
  galeries: 'Les Galeries',
  'marais-jumeau': 'Le Marais Jumeau',
  'foret-muette': 'La Forêt Muette',
  volcan: 'Le Volcan',
  'cite-des-histoires': 'La Cité des Histoires'
};

function pourcent(fraction: number): string {
  return `${String(Math.round(fraction * 100))} %`;
}

function Barre({
  valeur,
  teinte,
  libelle
}: {
  readonly valeur: number;
  readonly teinte: string;
  readonly libelle: string;
}): ReactElement {
  return (
    <div style={{ display: 'grid', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--texte-secondaire)' }}>
        {libelle} — {pourcent(valeur)}
      </span>
      <div
        role="img"
        aria-label={`${libelle} : ${pourcent(valeur)}`}
        style={{
          blockSize: '0.75rem',
          background: 'var(--parchemin)',
          border: '2px solid var(--grisaille)',
          borderRadius: '999px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            blockSize: '100%',
            inlineSize: `${String(Math.round(Math.min(1, Math.max(0, valeur)) * 100))}%`,
            background: teinte
          }}
        />
      </div>
    </div>
  );
}

export function CarteCouverture({ couverture }: ProprietesCarteCouverture): ReactElement {
  return (
    <section data-indicateur="couverture" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Le monde, et ce qui est vraiment acquis
      </h2>
      {couverture.length === 0 ? (
        <p style={{ margin: 0 }}>Aucune région commencée pour l’instant.</p>
      ) : (
        <ul style={{ display: 'grid', gap: '1rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {couverture.map((region) => (
            <li
              key={region.region}
              data-couverture-region={region.region}
              data-couverture-fragile={region.colorieMaisFragile ? 'oui' : 'non'}
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '1rem',
                border: '2px solid var(--grisaille)',
                borderRadius: 'var(--rayon-carte)'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
                {NOM_REGION[region.region] ?? region.region}
              </h3>
              <Barre valeur={region.pourcentageColorie} teinte="var(--soleil)" libelle="Colorié" />
              <Barre valeur={region.maitriseMoyenne} teinte="var(--menthe)" libelle="Acquis" />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                {`${String(region.competencesAcquises)} compétence(s) acquise(s) sur ${String(region.competencesTotal)}`}
              </p>
              {region.colorieMaisFragile ? (
                <p style={{ margin: 0 }}>
                  Cette région est bien coloriée mais les compétences restent fragiles&nbsp;: elle
                  gagnerait à être rejouée.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
