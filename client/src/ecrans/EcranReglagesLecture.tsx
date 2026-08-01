// Réglages de lecture, PAR PROFIL — lot L2-B, v2 § 9.3, D18, D19.
//
// Trois principes de conception, chacun opposable :
//
//  1. **Aucun curseur à faire glisser.** R16 interdit toute coordination fine. Un
//     `<input type="range">` demande de viser une poignée de quelques pixels et de la tenir :
//     c'est précisément le geste que R16 écarte. Chaque réglage se règle donc par deux grandes
//     cibles « moins » / « plus », d'un pas déclaré dans `BORNES_REGLAGES`.
//  2. **Rien n'est écrit sans être audible** (R15). Chaque groupe de réglages porte un bouton
//     d'écoute qui dit son intitulé. Écouter ne coûte rien et ne compte nulle part.
//  3. **L'aperçu parle à la place des nombres.** Un enfant de 7 ans ne choisit pas
//     « 0,10 em » ; il dit « comme ça je vois mieux ». L'aperçu est une vraie `ZoneDeLecture`,
//     jamais une imitation.
//
// ⚠ ÉCART SIGNALÉ AU RAPPORT DE L2-B. Le contrat des features v2 § 5.1 pose qu'un seul fichier
// appelle le réseau côté client — `client/src/api/client.ts`, possédé par L2-H — mais son § 4
// ne nomme AUCUN symbole pour `GET`/`PUT /api/profils/:id/reglages`, alors que son § 5.3 rend
// ces deux chemins normatifs. Les deux appels ci-dessous les emploient tels quels et sont les
// SEULS de ce lot à toucher au réseau pour les réglages : le jour où L2-H publie un lecteur
// typé, c'est ce fichier et lui seul qui est repris.
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  BORNES_REGLAGES,
  POLICES,
  REGLAGES_PAR_DEFAUT,
  normaliserReglages,
} from '@pierre/partage/lecture';
import type { BorneReglage, CodePolice, ReglagesLecture } from '@pierre/partage/lecture';
import type { Profil } from '@pierre/partage';

import { ApercuReglages } from '../lecture/ApercuReglages.js';
import { policeDisponible } from '../lecture/polices.js';
import { useEtatJeu, useServices } from '../etat/services.js';

/** Libellé lisible et prononçable de chaque police. Jamais le code technique à l'écran. */
const NOM_DE_POLICE: Readonly<Record<CodePolice, string>> = {
  andika: 'Andika',
  opendyslexic: 'OpenDyslexic',
  luciole: 'Luciole',
  'belle-allure': 'Belle Allure',
  verdana: 'Verdana',
};

const CHAMPS_MESURES = [
  { cle: 'corpsPx', intitule: 'Taille des lettres' },
  { cle: 'interlettrageEm', intitule: 'Espace entre les lettres' },
  { cle: 'espacementMotsEm', intitule: 'Espace entre les mots' },
  { cle: 'interligne', intitule: 'Espace entre les lignes' },
] as const;

type ChampMesure = (typeof CHAMPS_MESURES)[number]['cle'];

const INTERRUPTEURS = [
  { cle: 'colorationSyllabique', intitule: 'Couleurs sur les syllabes' },
  { cle: 'surlignageLigneCourante', intitule: 'Surligner la ligne que je lis' },
  { cle: 'regleDeLecture', intitule: 'Montrer la règle de lecture' },
] as const;

type Interrupteur = (typeof INTERRUPTEURS)[number]['cle'];

/**
 * Arrondit au pas du réglage.
 *
 * Sans cet arrondi, additionner `0.02` cinq fois rend `0.09999999999999999` : le nombre
 * affiché à l'enfant, la variable CSS et la valeur enregistrée divergeraient tous les trois.
 */
function auPas(valeur: number, borne: BorneReglage): number {
  const crans = Math.round((valeur - borne.min) / borne.pas);
  return Math.round((borne.min + crans * borne.pas) * 1000) / 1000;
}

/** Ce que l'enfant lit à côté du réglage : des crans, jamais des `em`. */
function positionLisible(valeur: number, borne: BorneReglage): string {
  const crans = Math.round((valeur - borne.min) / borne.pas);
  const total = Math.round((borne.max - borne.min) / borne.pas);
  return `${String(crans + 1)} sur ${String(total + 1)}`;
}

const CHEMIN_REGLAGES = (id: string): string => `/api/profils/${encodeURIComponent(id)}/reglages`;

export interface ProprietesEcranReglagesLecture {
  /** Profil visé. Par défaut, celui de la session. `null` : réglages non persistés. */
  readonly profil?: Profil | null;
  /** Retour au monde du jeu. Absent : l'écran ne propose pas de sortie. */
  readonly surFermeture?: () => void;
}

export function EcranReglagesLecture({
  profil: profilExplicite,
  surFermeture,
}: ProprietesEcranReglagesLecture = {}): ReactElement {
  const profilDeSession = useEtatJeu((etat) => etat.profil);
  const profil = profilExplicite === undefined ? profilDeSession : profilExplicite;
  const idProfil = profil === null ? null : String(profil.id);
  const services = useServices();

  const [reglages, fixerReglages] = useState<ReglagesLecture>(REGLAGES_PAR_DEFAUT);

  const enregistres = useQuery({
    queryKey: ['reglages-lecture', idProfil],
    enabled: idProfil !== null,
    staleTime: 0,
    queryFn: async (): Promise<ReglagesLecture> => {
      const reponse = await fetch(CHEMIN_REGLAGES(idProfil ?? ''), {
        headers: { Accept: 'application/json' },
      });
      if (!reponse.ok) {
        // Aucun écran d'erreur : le profil neuf n'a pas encore de ligne, et c'est normal.
        return REGLAGES_PAR_DEFAUT;
      }
      return normaliserReglages((await reponse.json()) as Partial<ReglagesLecture>);
    },
  });

  useEffect(() => {
    if (enregistres.data !== undefined) {
      fixerReglages(enregistres.data);
    }
  }, [enregistres.data]);

  const enregistrement = useMutation({
    mutationFn: async (voulus: ReglagesLecture): Promise<ReglagesLecture> => {
      if (idProfil === null) {
        return voulus;
      }
      const reponse = await fetch(CHEMIN_REGLAGES(idProfil), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(voulus),
      });
      if (!reponse.ok) {
        return voulus;
      }
      return normaliserReglages((await reponse.json()) as Partial<ReglagesLecture>);
    },
  });

  /**
   * Applique un changement : l'aperçu bouge TOUT DE SUITE, l'enregistrement suit.
   * L'inverse — attendre le serveur pour bouger l'aperçu — rendrait le réglage inutilisable
   * sur une tablette au bout du LAN, et c'est exactement là qu'il sera utilisé.
   */
  const appliquer = useCallback(
    (voulus: Partial<ReglagesLecture>): void => {
      const complets = normaliserReglages({ ...reglages, ...voulus });
      fixerReglages(complets);
      enregistrement.mutate(complets);
    },
    [enregistrement, reglages],
  );

  const dire = useCallback(
    (texte: string): void => {
      void services.voix.dire({ texte, locuteur: 'narrateur' });
    },
    [services],
  );

  const deplacer = useCallback(
    (champ: ChampMesure, sens: 1 | -1): void => {
      const borne = BORNES_REGLAGES[champ];
      const brut = reglages[champ] + sens * borne.pas;
      appliquer({ [champ]: auPas(brut, borne) } as Partial<ReglagesLecture>);
    },
    [appliquer, reglages],
  );

  return (
    <main
      data-ecran="reglages-lecture"
      className="ecran-reglages-lecture"
      style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.5rem', margin: 0 }}>
          Comment tu lis le mieux&nbsp;?
        </h1>
        <button
          type="button"
          className="cible"
          data-ecouter="titre"
          onClick={() => {
            dire('Comment tu lis le mieux ? Essaie, et regarde en dessous.');
          }}
          aria-label="Écouter la question"
        >
          <span aria-hidden="true">🔊</span>
        </button>
        {surFermeture === undefined ? null : (
          <button type="button" className="cible" onClick={surFermeture}>
            Retour
          </button>
        )}
      </header>

      <ApercuReglages reglages={reglages} />

      {/* ------------------------------------------------------------------ la police */}
      <section aria-labelledby="titre-police" data-groupe-reglage="police">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 id="titre-police" className="titre" style={{ fontSize: '1.5rem' }}>
            La forme des lettres
          </h2>
          <button
            type="button"
            className="cible"
            data-ecouter="police"
            onClick={() => {
              dire('La forme des lettres. Choisis celle que tu préfères.');
            }}
            aria-label="Écouter : la forme des lettres"
          >
            <span aria-hidden="true">🔊</span>
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {POLICES.map((police) => {
            const disponible =
              typeof document === 'undefined' ? true : policeDisponible(police, document);
            return (
              <button
                key={police}
                type="button"
                className={reglages.police === police ? 'cible cible-appel' : 'cible'}
                data-choix-police={police}
                data-choisi={reglages.police === police ? 'oui' : 'non'}
                aria-pressed={reglages.police === police}
                onClick={() => {
                  appliquer({ police });
                }}
              >
                {NOM_DE_POLICE[police]}
                {/* Verdana n'est pas embarquée (écart n° 5) : on le DIT, au lieu de laisser
                    l'enfant choisir un réglage qui ne change rien sur sa tablette. */}
                {disponible ? null : <span aria-hidden="true"> ·</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ les mesures */}
      {CHAMPS_MESURES.map(({ cle, intitule }) => {
        const borne = BORNES_REGLAGES[cle];
        const valeur = reglages[cle];
        return (
          <section key={cle} data-groupe-reglage={cle} aria-labelledby={`titre-${cle}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 id={`titre-${cle}`} className="titre" style={{ fontSize: '1.5rem' }}>
                {intitule}
              </h2>
              <button
                type="button"
                className="cible"
                data-ecouter={cle}
                onClick={() => {
                  dire(intitule);
                }}
                aria-label={`Écouter : ${intitule}`}
              >
                <span aria-hidden="true">🔊</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                className="cible"
                data-reglage={cle}
                data-sens="moins"
                disabled={valeur <= borne.min}
                onClick={() => {
                  deplacer(cle, -1);
                }}
                aria-label={`Diminuer : ${intitule}`}
              >
                <span aria-hidden="true">−</span>
              </button>
              <p
                data-valeur={cle}
                data-valeur-brute={String(valeur)}
                aria-live="polite"
                style={{ minInlineSize: '8rem', margin: 0, textAlign: 'center' }}
              >
                {positionLisible(valeur, borne)}
              </p>
              <button
                type="button"
                className="cible"
                data-reglage={cle}
                data-sens="plus"
                disabled={valeur >= borne.max}
                onClick={() => {
                  deplacer(cle, 1);
                }}
                aria-label={`Augmenter : ${intitule}`}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </section>
        );
      })}

      {/* ------------------------------------------------------------------ les bascules */}
      <section data-groupe-reglage="options" aria-label="Aides à la lecture">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {INTERRUPTEURS.map(({ cle, intitule }) => (
            <button
              key={cle}
              type="button"
              className={reglages[cle] ? 'cible cible-appel' : 'cible'}
              data-bascule={cle}
              data-actif={reglages[cle] ? 'oui' : 'non'}
              aria-pressed={reglages[cle]}
              onClick={() => {
                appliquer({ [cle]: !reglages[cle] } as Partial<ReglagesLecture>);
              }}
            >
              {intitule}
            </button>
          ))}
          <button
            type="button"
            className={reglages.fond === 'sombre' ? 'cible cible-appel' : 'cible'}
            data-bascule="fond"
            data-actif={reglages.fond === 'sombre' ? 'oui' : 'non'}
            aria-pressed={reglages.fond === 'sombre'}
            onClick={() => {
              appliquer({ fond: reglages.fond === 'sombre' ? 'parchemin' : 'sombre' });
            }}
          >
            Fond sombre
          </button>
        </div>
      </section>

      {/* Aucun bouton « valider » : chaque geste est déjà enregistré. Aucun message d'erreur
          non plus — un enregistrement qui échoue laisse le réglage appliqué à l'écran, et il
          repartira au prochain geste. Rien de ce qui se passe ici ne peut être raté (R14). */}
      <p
        data-etat-enregistrement={
          idProfil === null ? 'local' : enregistrement.isPending ? 'en-cours' : 'enregistre'
        }
        className="lecture-accessible"
      >
        {idProfil === null
          ? 'Ces réglages ne sont pas encore rattachés à un joueur.'
          : 'Tes réglages sont gardés.'}
      </p>
    </main>
  );
}

/** Exporté pour les interrupteurs : évite qu'un test recopie la liste et la laisse dériver. */
export const INTERRUPTEURS_DE_LECTURE: readonly Interrupteur[] = INTERRUPTEURS.map(
  (entree) => entree.cle,
);
