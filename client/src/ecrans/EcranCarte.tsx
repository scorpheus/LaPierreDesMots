// La carte du monde — l'élément signature de la v2 § 9.4. Lot L2-F.
//
// « Dessinée comme une carte au trésor sur parchemin, avec les régions conquises en couleur, les
// régions grises encore voilées d'un brouillard mouvant, et le chemin qui se dessine à l'encre au
// fur et à mesure. C'est l'écran qu'on ouvre en premier, celui qu'on montre à ses parents. »
//
// Quatre règles, et aucune n'est cosmétique :
//
//   1. **Une région voilée reste TAPABLE.** Le voile n'est pas un verrou : on peut toujours aller
//      voir. Ce qui n'est pas encore ouvert ne se joue pas, mais il se regarde, et l'écran le dit
//      avec une phrase — jamais avec un cadenas, jamais avec du rouge (R14).
//   2. **Le vide restant se montre.** La part non recoloriée de chaque région est ce que la carte
//      donne à voir (D25, point 3) : c'est le moteur de retour du jeu.
//   3. **Le décor s'agite, le texte jamais.** Le brouillard bouge ; les noms de région sont posés
//      sur parchemin et ne bougent pas (v2 § 9.3).
//   4. **Aucune géométrie n'est écrite deux fois.** Le dessin vient de
//      `contenu/habillages/carte/carte-monde.svg` (décor bouchon D2) ; cet écran n'y ajoute que
//      les prises tactiles et les états. Tant que l'asset n'est pas là, la carte annonce qu'elle
//      se déplie — jamais un écran d'erreur.
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CodeRegion, EtatMonde, EtatRegion, IdNoeud } from '@pierre/partage';
import { etatAfficheRegion, regionsOuvertes } from '@pierre/partage/monde';
import { lireMonde, lirePaquetNoeud, urlAsset } from '../api/client.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { CheminEncre } from '../monde/CheminEncre.js';
import { Parchemin } from '../monde/Parchemin.js';
import { VoileGrisaille } from '../monde/VoileGrisaille.js';

/** Le chemin du décor de la carte, relatif à `contenu/`. */
const SVG_CARTE = 'habillages/carte/carte-monde.svg';

/**
 * Les ancres de chaque région, en unités `viewBox`, **dans l'ordre de la progression**.
 *
 * Ce sont les MÊMES centres que ceux des six formes de `carte-monde.svg` : le décor porte les
 * formes, cette table porte les prises. Les faire diverger décalerait le tap du dessin, ce qui
 * ne se verrait qu'à l'usage — d'où `tests/visuel/carte.spec.ts`, qui les photographie ensemble.
 */
const ANCRES: readonly (readonly [CodeRegion, number, number, string])[] = [
  ['clairiere', 190, 640, 'La Clairière'],
  ['galeries', 450, 460, 'Les Galeries'],
  ['marais-jumeau', 240, 240, 'Le Marais Jumeau'],
  ['foret-muette', 620, 150, 'La Forêt Muette'],
  ['volcan', 900, 340, 'Le Volcan'],
  ['cite-des-histoires', 1020, 630, 'La Cité des Histoires']
];

/** Rayon de la prise tactile, en unités `viewBox`. 64 unités ≈ 64 px CSS à l'échelle de rendu. */
const RAYON_PRISE = 46;

/** Retire l'enveloppe `<svg>` d'un fichier pour pouvoir l'insérer dans un autre. */
export function interieurDuSvg(texte: string): string {
  return texte.replace(/^[\s\S]*?<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
}

export interface ProprietesEcranCarte {
  /**
   * Ouvre le campement. Fournie par `routeur.tsx`, qui est le SEUL endroit du client à connaître
   * les chemins — `EtatMagasin.ecran` ne porte que les cinq codes du contrat v1 § 7.1, et le
   * campement comme le coffre n'en font pas partie (défaut du contrat gelé, signalé au rapport).
   */
  readonly surAllerCampement?: () => void;
}

export function EcranCarte({ surAllerCampement }: ProprietesEcranCarte = {}): ReactElement {
  const magasin = useMagasin();
  const profil = useEtatJeu((etat) => etat.profil);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);

  const requeteMonde = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Monde demandé sans profil choisi.');
      }
      return lireMonde(profil.id);
    },
    enabled: profil !== null
  });

  const requeteDecor = useQuery({
    queryKey: ['carte', 'decor'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset(SVG_CARTE), { headers: { Accept: 'image/svg+xml' } });
      if (!reponse.ok) {
        throw new Error(`Décor de carte introuvable (réponse ${String(reponse.status)}).`);
      }
      return interieurDuSvg(await reponse.text());
    }
  });

  const monde: EtatMonde | null = requeteMonde.data ?? null;
  const regions: readonly EtatRegion[] = monde?.carte.regions ?? [];
  const jouables = useMemo(
    () => new Set(monde === null ? [] : regionsOuvertes(monde.carte).map((code) => String(code))),
    [monde]
  );

  const parCode = useMemo(
    () => new Map(regions.map((region) => [String(region.region), region])),
    [regions]
  );

  /** Le chemin d'encre avance comme la recoloration moyenne : une dérivée, jamais un état. */
  const avancement =
    regions.length === 0
      ? 0
      : regions.reduce((total, region) => total + region.pourcentageColorie, 0) / regions.length;

  const entrer = useCallback(
    (noeud: IdNoeud): void => {
      void lirePaquetNoeud(noeud).then((paquet) => {
        magasin.getState().demarrerNoeud(paquet);
      });
    },
    [magasin]
  );

  return (
    <main
      data-ecran="carte"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          La carte du monde
        </h1>
        <button
          type="button"
          className="cible"
          data-vers="campement"
          aria-label="Revenir au campement"
          onClick={surAllerCampement}
        >
          Le campement
        </button>
        <button
          type="button"
          className="cible"
          onClick={() => {
            magasin.getState().quitterProfil();
          }}
          aria-label="Changer de joueur"
        >
          Changer de joueur
        </button>
      </header>

      {profil === null ? null : (
        <p style={{ margin: 0, fontSize: '1.125rem' }}>
          Bonjour {String(profil.prenom)}&nbsp;! Le monde t’attend en gris.
        </p>
      )}

      <Parchemin>
        {/* Le décor bouchon. Absent, la carte le dit calmement et reste utilisable. */}
        {requeteDecor.data === undefined ? (
          <text x="600" y="400" textAnchor="middle" fontSize="36" fill="var(--trait)">
            On déplie la carte…
          </text>
        ) : (
          /* Le décor est un fichier de contenu DU DÉPÔT, servi par le serveur local : il n'y a
             ni tiers, ni saisie utilisateur dans ce balisage. */
          <g data-decor="carte" dangerouslySetInnerHTML={{ __html: requeteDecor.data }} />
        )}

        <CheminEncre
          etapes={ANCRES.map(([, x, y]) => [x, y] as const)}
          avancement={avancement}
          animationsDesactivees={animationsDesactivees}
        />

        {/* Le voile, région par région. Il n'intercepte jamais le tap. */}
        {requeteDecor.data === undefined
          ? null
          : ANCRES.map(([code]) => {
              const region = parCode.get(String(code));
              const opacite = region === undefined ? 1 : 1 - region.pourcentageColorie;
              return (
                <VoileGrisaille
                  key={`voile-${String(code)}`}
                  forme={String(code)}
                  opacite={opacite}
                  animationsDesactivees={animationsDesactivees}
                />
              );
            })}

        {/* Les prises : une par région, toujours présentes, jamais désactivées. */}
        {ANCRES.map(([code, x, y, libelle]) => {
          const region = parCode.get(String(code));
          const etat = region === undefined ? 'voilee' : etatAfficheRegion(region);
          const ouverte = jouables.has(String(code));
          const premierNoeud = region?.noeuds[0] ?? null;

          return (
            <g key={String(code)} data-region={String(code)} data-region-etat={etat}>
              <circle
                cx={x}
                cy={y}
                r={RAYON_PRISE}
                fill="var(--parchemin)"
                fillOpacity={0.85}
                stroke="var(--trait)"
                strokeWidth={ouverte ? 6 : 3}
                role="button"
                tabIndex={0}
                aria-label={`${libelle} — ${etat}`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (ouverte && premierNoeud !== null) {
                    entrer(premierNoeud);
                  }
                }}
                onKeyDown={(evenement) => {
                  if (
                    (evenement.key === 'Enter' || evenement.key === ' ') &&
                    ouverte &&
                    premierNoeud !== null
                  ) {
                    entrer(premierNoeud);
                  }
                }}
              />
              <text
                x={x}
                y={y + 76}
                textAnchor="middle"
                fontSize="26"
                fill="var(--trait)"
                style={{ pointerEvents: 'none' }}
              >
                {libelle}
              </text>
            </g>
          );
        })}
      </Parchemin>

      {/* Ce qu'on peut jouer maintenant. Deux régions en parallèle dès la troisième (v2 § 3.3). */}
      <section aria-label="Où aller">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
          Où veux-tu aller&nbsp;?
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {ANCRES.filter(([code]) => jouables.has(String(code))).map(([code, , , libelle]) => {
            const region = parCode.get(String(code));
            const premierNoeud = region?.noeuds[0] ?? null;
            return (
              <button
                key={`depart-${String(code)}`}
                type="button"
                className="cible cible-appel"
                data-depart={String(code)}
                aria-label={`Partir vers ${libelle}`}
                onClick={() => {
                  if (premierNoeud !== null) {
                    entrer(premierNoeud);
                  }
                }}
                style={{ flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}
              >
                <span className="titre" style={{ fontSize: '1.375rem' }}>
                  {libelle}
                </span>
                {/* La jauge montre le VIDE restant, jamais seulement l'acquis (D25, point 3). */}
                <span
                  data-restant={String(
                    Math.round((1 - (region?.pourcentageColorie ?? 0)) * 100)
                  )}
                  style={{ fontSize: '1rem' }}
                >
                  Il reste {Math.round((1 - (region?.pourcentageColorie ?? 0)) * 100)} % à
                  rallumer
                </span>
                <span style={{ fontSize: '1rem' }}>
                  {premierNoeud === null
                    ? 'Le chemin se dessine encore…'
                    : 'Tape pour entrer'}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
