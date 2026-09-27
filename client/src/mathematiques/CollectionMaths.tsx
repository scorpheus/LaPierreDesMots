import { useRef } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EtatMaths, PortApiMaths } from '@pierre/partage/mathematiques';
import { apiMathematiques } from '../api/client.js';
import './collection-maths.css';

import { COLLECTIBLES_MATHS, type CollectibleMaths } from './collection.js';
export { COLLECTIBLES_MATHS } from './collection.js';
type CategorieCollection = CollectibleMaths['categorie'];

export interface ProprietesCollectionMaths {
  readonly profilId: string | null;
  readonly emplacement: 'coffre' | 'campement';
  /** Injection étroite pour la recette : la collection ne crée aucun gain. */
  readonly api?: Pick<PortApiMaths, 'lireEtat'>;
}

function DessinCollectible({ forme }: { readonly forme: CollectibleMaths['forme'] }): ReactElement {
  const commun = { fill: 'currentColor', stroke: 'currentColor', strokeWidth: 2, strokeLinejoin: 'round' as const };
  const dessins: Readonly<Record<CollectibleMaths['forme'], ReactElement>> = {
    graine: <path {...commun} d="M24 5C10 15 10 34 24 43 38 34 38 15 24 5Z" />,
    galet: <path {...commun} d="M9 30c0-12 10-20 22-17 12 3 15 16 7 25-9 8-29 4-29-8Z" />,
    plume: <path {...commun} d="M37 7C21 8 12 20 12 37l25-30Zm-13 12 7 7M18 26l7 7" fill="none" strokeLinecap="round" />,
    ruban: <path {...commun} d="M9 12c11-8 19 8 30 0v24c-11 8-19-8-30 0V12Z" />,
    caillou: <path {...commun} d="m24 7 15 10-4 20H13L9 17 24 7Z" />,
    perle: <circle {...commun} cx="24" cy="24" r="14" />,
    arrosoir: <path {...commun} d="M13 20h20v16H13zM33 24h7l-3 7h-4M18 20c0-9 10-9 10 0M16 36l-3 6m15-6 3 6" />,
    planchette: <path {...commun} d="M8 16h32v16H8zM15 16v7m8-7v4m8-4v7" />,
    roue: <><circle {...commun} cx="24" cy="24" r="15" fill="none" /><circle {...commun} cx="24" cy="24" r="3" />
      <path {...commun} d="M24 9v12m0 6v12M9 24h12m6 0h12M13 13l8 8m6 6 8 8M35 13l-8 8m-6 6-8 8" fill="none" /></>,
    panier: <><path {...commun} d="M10 20h28l-3 20H13l-3-20Z" /><path {...commun} d="M17 20c0-12 14-12 14 0" fill="none" /></>,
    brique: <path {...commun} d="M7 15h34v20H7zM7 25h34M18 15v10m12 0v10" />,
    aiguille: <path {...commun} d="m24 6 5 29-5 7-5-7 5-29ZM15 42h18" />,
    lanterne: <><path {...commun} d="M15 14h18v23H15zM19 14c0-8 10-8 10 0" /><path d="M24 21v9" stroke="var(--soleil)" strokeWidth="5" strokeLinecap="round" /></>,
  };
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="collection-maths-dessin">{dessins[forme]}</svg>;
}

function recompenseParId(recompenses: EtatMaths['recompenses']): ReadonlyMap<string, CategorieCollection> {
  return new Map<string, CategorieCollection>(recompenses.map((recompense) => [recompense.cadeauId, recompense.categorie] as const));
}

export function CollectionMaths({ profilId, emplacement, api = apiMathematiques }: ProprietesCollectionMaths): ReactElement | null {
  const dernierEtat = useRef<{ profilId: string; etat: EtatMaths } | null>(null);
  const requete = useQuery({
    queryKey: ['mathematiques', profilId],
    queryFn: async () => {
      if (profilId === null) throw new Error('Collection maths demandée sans profil.');
      const resultat = await api.lireEtat(profilId);
      if (!resultat.ok) throw new Error('Les trouvailles maths ne peuvent pas être lues.');
      dernierEtat.current = { profilId, etat: resultat.valeur };
      return resultat.valeur;
    },
    enabled: profilId !== null,
    refetchOnMount: 'always',
  });
  const etat = requete.data ?? (dernierEtat.current?.profilId === profilId ? dernierEtat.current.etat : null);
  const cadeaux = recompenseParId(etat?.recompenses ?? []);
  const estObtenu = (piece: CollectibleMaths): boolean => cadeaux.get(piece.cadeauId) === piece.categorie;
  const pieces = emplacement === 'coffre'
    ? COLLECTIBLES_MATHS
    : COLLECTIBLES_MATHS.filter((piece) => piece.categorie === 'objet' && estObtenu(piece));
  const obtenus = pieces.filter(estObtenu).length;

  return <section className={`collection-maths collection-maths--${emplacement}`} data-testid={`collection-maths-${emplacement}`}
    data-chargement={requete.isPending && etat === null ? 'en-cours' : 'termine'} aria-label={emplacement === 'coffre' ? 'Les trouvailles de maths' : 'L’étagère de maths'}>
    <header className="collection-maths-entete">
      <div><p className="collection-maths-surtitre">La Vallée des Nombres</p>
        <h2>{emplacement === 'coffre' ? `Les trouvailles de maths — ${obtenus} sur ${pieces.length}` : 'L’étagère de maths'}</h2></div>
      {emplacement === 'campement' ? <span aria-hidden="true" className="collection-maths-mini-compteur">{obtenus}</span> : null}
    </header>
    {requete.isPending && etat === null ? <p role="status">Les trouvailles arrivent…</p> : null}
    {requete.isError ? <p role="status">{etat === null ? 'La collection attend. Réessaie un peu plus tard.' : 'La collection reste visible. Elle se mettra à jour plus tard.'}</p> : null}
    {emplacement === 'campement' && pieces.length === 0 && etat !== null ? <p className="collection-maths-vide">Tes objets de maths viendront ici après un troisième projet.</p> : null}
    {pieces.length > 0 ? <ul className="collection-maths-liste">
      {pieces.map((piece) => {
        const obtenu = estObtenu(piece);
        return <li key={piece.cadeauId} data-collection-maths-piece={piece.cadeauId} data-obtenu={obtenu ? 'oui' : 'non'}>
          <DessinCollectible forme={piece.forme} />
          <div><strong>{piece.nom}</strong><small>{obtenu ? piece.provenance : emplacement === 'coffre' ? piece.provenance : ''}</small></div>
        </li>;
      })}
    </ul> : null}
  </section>;
}
