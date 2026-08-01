// Le coffre aux collections — v2 § 3.4 et § 6.1, lot L2-F.
//
// Trois collections, et une seule règle les gouverne toutes : **rien n'en sort jamais.**
// « Un acquis n'est jamais repris » (v2 § 5.4, R14). Le coffre n'a donc aucun chemin de retrait,
// aucun tri qui masque, aucun filtre par défaut : ce qui est entré reste visible.
//
//   1. **Les formes de Gobi** — le palier intermédiaire de D25. Le CRISTAL, jamais le corps
//      (D20) : c'est ce qui rend la collection lisible d'un coup d'œil.
//   2. **Les Éclats de Pierre** — le palier rare de D25, un par région terminée.
//   3. **Les objets du campement** — ce que chaque retour a rapporté.
//
// Ce qui n'est pas encore obtenu est affiché **en creux**, jamais caché : c'est la même règle
// que les étoiles en creux (v2 § 6.2) et que le voile de Grisaille. Montrer le vide restant est
// le moteur de retour du jeu ; le cacher le supprimerait.
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EtatMonde } from '@pierre/partage';
import { lireMonde, urlAsset } from '../api/client.js';
import { useEtatJeu } from '../etat/services.js';

export interface ProprietesEcranCoffre {
  /** Le monde du profil. Injecté par les tests et par un hôte qui l'a déjà ; chargé sinon. */
  readonly monde?: EtatMonde | null;
  readonly surRetour?: () => void;
}

/** Une case de collection : pleine ou en creux, jamais absente. */
function Case({
  cle,
  libelle,
  asset,
  obtenu,
  categorie
}: {
  readonly cle: string;
  readonly libelle: string;
  readonly asset: string | null;
  readonly obtenu: boolean;
  readonly categorie: string;
}): ReactElement {
  return (
    <li
      data-collection={categorie}
      data-piece={cle}
      data-obtenue={obtenu ? 'oui' : 'non'}
      className="cible"
      style={{
        flexDirection: 'column',
        gap: '0.35rem',
        inlineSize: '9rem',
        cursor: 'default',
        // En creux : la même case, en Grisaille. Jamais une case vide, jamais un cadenas.
        opacity: obtenu ? 1 : 0.55,
        filter: obtenu ? 'none' : 'saturate(0)'
      }}
    >
      {asset === null ? (
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <path
            d="M24,4 L44,24 L24,44 L4,24 Z"
            fill="var(--grisaille)"
            stroke="var(--trait)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <img src={urlAsset(asset)} alt="" width={48} height={48} aria-hidden="true" />
      )}
      <span style={{ fontSize: '0.95rem', textAlign: 'center' }}>{libelle}</span>
    </li>
  );
}

const STYLE_LISTE = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem'
};

export function EcranCoffre({
  monde: mondeInjecte = null,
  surRetour
}: ProprietesEcranCoffre = {}): ReactElement {
  const profil = useEtatJeu((etat) => etat.profil);

  const requete = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Coffre demandé sans profil choisi.');
      }
      return lireMonde(profil.id);
    },
    enabled: mondeInjecte === null && profil !== null
  });

  const monde: EtatMonde | null = mondeInjecte ?? requete.data ?? null;
  const formes = monde?.gobi.formes ?? [];
  const regions = monde?.carte.regions ?? [];
  const objets = monde?.campement ?? [];

  const nbEclats = regions.filter((region) => region.eclatObtenuLe !== null).length;

  return (
    <main
      data-ecran="coffre"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          Le coffre
        </h1>
        <button
          type="button"
          className="cible"
          data-vers="campement"
          aria-label="Revenir au campement"
          onClick={surRetour}
        >
          Retour au campement
        </button>
      </header>

      <section aria-label="Les formes de Gobi" data-collection-titre="formes">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Les formes de Gobi — {formes.length}
        </h2>
        {formes.length === 0 ? (
          <p className="zone-lecture" style={{ padding: '0.5rem 0.75rem' }}>
            Chaque son que tu apprends donnera un cristal à Gobi.
          </p>
        ) : (
          <ul style={STYLE_LISTE}>
            {formes.map((forme) => (
              <Case
                key={String(forme.grapheme)}
                cle={String(forme.grapheme)}
                libelle={forme.libelle}
                asset={String(forme.cristal)}
                obtenu
                categorie="forme"
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Les Éclats de Pierre" data-collection-titre="eclats">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Les Éclats de Pierre — {nbEclats} sur {regions.length}
        </h2>
        <ul style={STYLE_LISTE}>
          {regions.map((region) => (
            <Case
              key={String(region.region)}
              cle={String(region.region)}
              libelle={String(region.region)}
              asset={null}
              obtenu={region.eclatObtenuLe !== null}
              categorie="eclat"
            />
          ))}
        </ul>
      </section>

      <section aria-label="Les objets du campement" data-collection-titre="objets">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Ce que tu as rapporté —{' '}
          {objets.filter((objet) => objet.placeLe !== null).length} sur {objets.length}
        </h2>
        <ul style={STYLE_LISTE}>
          {objets.map((objet) => (
            <Case
              key={String(objet.code)}
              cle={String(objet.code)}
              libelle={objet.libelle}
              asset={null}
              obtenu={objet.placeLe !== null}
              categorie="objet"
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
