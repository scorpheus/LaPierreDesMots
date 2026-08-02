// L'état réel d'un profil — lot H2, point 3.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// CE QUE CET ÉCRAN AURAIT ÉVITÉ
//
// Le 2026-08-02, deux régions se croyaient terminées à 100 % avec 3 nœuds joués sur 18, et
// l'enfant s'est retrouvé devant une carte où plus aucun monde n'était cliquable. Le diagnostic
// a demandé une requête SQL écrite à la main. Cet écran affiche exactement la même chose, en une
// ligne par région, derrière le code parent.
//
// D'où sa règle de forme, qui commande toute la mise en page :
//
//   **aucun pourcentage sans son recalcul, aucun recalcul sans son écart.**
//
// Une seule des deux valeurs ne dit rien. Les deux côte à côte disent tout, immédiatement.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// Deux règles du projet s'appliquent ici alors qu'on pourrait croire l'écran hors de leur
// portée, et elles s'appliquent quand même :
//
// • **Aucune couleur d'échec, pas même sur un écran que l'enfant ne voit pas** — « parce qu'un
//   jour il le verra par-dessus l'épaule » (`CarteCouverture.tsx`). Un écart se signale par une
//   phrase et un contraste de bordure, jamais par du rouge.
// • **Le décor s'agite, le texte jamais.** Aucune animation ici.
import type { ReactElement } from 'react';
import type { EtatProfil as DonneesEtatProfil, EtatRegionProfil } from '@pierre/partage/parent';

export interface ProprietesEtatProfil {
  readonly etat: DonneesEtatProfil;
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

function Chiffre({
  libelle,
  valeur,
  sur
}: {
  readonly libelle: string;
  readonly valeur: number;
  readonly sur?: number;
}): ReactElement {
  return (
    <div
      data-chiffre={libelle}
      style={{
        display: 'grid',
        gap: '0.125rem',
        padding: '0.75rem 1rem',
        background: 'var(--parchemin)',
        border: '2px solid var(--grisaille)',
        borderRadius: '0.75rem',
        minInlineSize: '9rem'
      }}
    >
      <span style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>
        {String(valeur)}
        {sur === undefined ? null : (
          <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--texte-secondaire)' }}>
            {' '}
            / {String(sur)}
          </span>
        )}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--texte-secondaire)' }}>{libelle}</span>
    </div>
  );
}

/**
 * Une ligne de région. `data-region-ecart` porte l'écart pour la QA : c'est la seule prise
 * mécanique sur ce que l'œil voit, et sans elle un test ne pourrait vérifier que le drapeau se
 * lève au bon moment.
 */
function LigneRegion({ region }: { readonly region: EtatRegionProfil }): ReactElement {
  const ment = region.ecart !== 0;
  return (
    <tr
      data-region={region.region}
      data-region-ecart={String(region.ecart)}
      data-region-incoherente={ment ? 'oui' : 'non'}
      style={ment ? { outline: '3px solid var(--accent)', outlineOffset: '-3px' } : undefined}
    >
      <th scope="row" style={{ textAlign: 'start', padding: '0.5rem 0.75rem', fontWeight: 600 }}>
        {NOM_REGION[region.region] ?? region.region}
      </th>
      <td style={{ padding: '0.5rem 0.75rem' }}>
        {String(region.noeudsTermines)} / {String(region.noeudsLivres)}
      </td>
      <td style={{ padding: '0.5rem 0.75rem' }}>{pourcent(region.pourcentageStocke)}</td>
      <td style={{ padding: '0.5rem 0.75rem' }}>{pourcent(region.pourcentageRecalcule)}</td>
      <td style={{ padding: '0.5rem 0.75rem' }}>
        {ment ? (
          <span data-alerte="region-incoherente">
            écart de {pourcent(Math.abs(region.ecart))} — la carte affiche plus que ce qui a été
            joué
          </span>
        ) : (
          <span style={{ color: 'var(--texte-secondaire)' }}>d’accord</span>
        )}
      </td>
    </tr>
  );
}

export function EtatProfil({ etat }: ProprietesEtatProfil): ReactElement {
  return (
    <section data-parent="etat-profil" style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <h2 className="titre" style={{ margin: 0, fontSize: '1.5rem' }}>
          Ce que {etat.prenom} a fait
        </h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--texte-secondaire)', fontSize: '0.875rem' }}>
          Profil créé le {etat.creeLe.slice(0, 10)} · dernier passage le{' '}
          {etat.dernierAccesLe.slice(0, 10)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Chiffre libelle="nœuds terminés" valeur={etat.noeudsTermines} sur={etat.noeudsLivres} />
        <Chiffre libelle="étoiles" valeur={etat.etoilesObtenues} sur={etat.etoilesPossibles} />
        <Chiffre libelle="exercices joués" valeur={etat.nbTentatives} />
        <Chiffre libelle="formes de Gobi" valeur={etat.nbFormesGobi} />
        <Chiffre libelle="compagnons" valeur={etat.nbCompagnons} />
        <Chiffre libelle="mots à revoir" valeur={etat.nbItemsLeitner} />
      </div>

      {/* LE BLOC QUI COMPTE. Il est annoncé même quand tout va bien : un contrôle qui
          n'apparaît qu'en cas de problème est un contrôle dont personne n'apprend à se servir. */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Les régions — affiché contre réellement joué</h3>
        {etat.regionsIncoherentes > 0 ? (
          <p
            data-alerte="carte-ment"
            className="zone-lecture"
            style={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '0.75rem' }}
          >
            {etat.regionsIncoherentes === 1
              ? 'Une région affiche plus de couleur que ce que ton enfant a joué.'
              : `${String(etat.regionsIncoherentes)} régions affichent plus de couleur que ce que ton enfant a joué.`}{' '}
            Cela arrive quand des exercices ont été ajoutés après coup. La remise à zéro de la
            progression, plus bas, remet les deux colonnes d’accord.
          </p>
        ) : (
          <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
            Ce que la carte montre correspond à ce qui a été joué.
          </p>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', inlineSize: '100%' }}>
            <caption style={{ captionSide: 'bottom', textAlign: 'start', paddingBlockStart: '0.5rem', fontSize: '0.8125rem', color: 'var(--texte-secondaire)' }}>
              « affiché » est ce que la carte colorie ; « joué » est ce que le journal des
              tentatives redonne aujourd’hui. Les deux doivent coïncider.
            </caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'start', padding: '0.5rem 0.75rem' }}>Région</th>
                <th scope="col" style={{ textAlign: 'start', padding: '0.5rem 0.75rem' }}>Nœuds</th>
                <th scope="col" style={{ textAlign: 'start', padding: '0.5rem 0.75rem' }}>Affiché</th>
                <th scope="col" style={{ textAlign: 'start', padding: '0.5rem 0.75rem' }}>Joué</th>
                <th scope="col" style={{ textAlign: 'start', padding: '0.5rem 0.75rem' }}>Accord</th>
              </tr>
            </thead>
            <tbody>
              {etat.regions.map((region) => (
                <LigneRegion key={region.region} region={region} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Les dernières fois qu’il a joué</h3>
        {etat.dernieresTentatives.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
            Aucun exercice terminé pour l’instant.
          </p>
        ) : (
          <ul data-liste="dernieres-tentatives" style={{ margin: 0, paddingInlineStart: '1.25rem', display: 'grid', gap: '0.25rem' }}>
            {etat.dernieresTentatives.map((tentative) => (
              <li key={`${tentative.termineLe}-${tentative.noeud}`}>
                {tentative.termineLe.slice(0, 16).replace('T', ' à ')} — {tentative.noeud} (
                {tentative.moteur}) · {String(tentative.etoiles)} ★
                {tentative.nbErreurs > 0 ? ` · ${String(tentative.nbErreurs)} erreur(s)` : ''}
                {tentative.aideUtilisee === 'aucune' ? '' : ` · aide : ${tentative.aideUtilisee}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
