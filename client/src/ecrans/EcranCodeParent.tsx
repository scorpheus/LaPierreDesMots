// La porte de la zone parent — v2 § 11, contrat des features v2 § 3.8.
//
// « Zone parent protégée par un code à 4 chiffres, `scrypt`, verrouillage temporaire après
// 5 échecs. »
//
// TROIS RÈGLES D'ÉCRAN, et elles tiennent toutes à ce qu'un enfant peut tomber là par hasard :
//
//   1. **Aucun reproche, jamais.** Un code faux dit « ce n'est pas ça », pas « erreur » ni
//      « accès refusé ». Le verrou dit *quand* on pourra réessayer, pas *que c'est faux*.
//      C'est la même règle que R14, appliquée à un écran qui n'est pourtant pas du jeu.
//   2. **Aucune couleur d'alarme.** Pas de rouge, pas de croix, pas de secousse.
//   3. **Un pavé à gros chiffres**, cibles ≥ 64 px (R16) : le parent le tape debout, d'une
//      main, avec la tablette dans l'autre.
//
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// CORRIGÉ N5 — le PLACEHOLDER qui occupait cette place est mort, et voici de quoi.
//
// Il disait : « la toute première ouverture POSE le code du foyer ». Le contrat de finition
// v3 § 1.8 a mesuré ce que cela produisait : « un enfant curieux qui tape 1234 devient
// propriétaire du code parent, sans qu'un écran l'ait jamais demandé ».
//
// Cet écran DEMANDE désormais l'état de la porte avant de rendre quoi que ce soit :
//   • aucun code posé   → il rend `EcranDefinirCode`, qui montre les chiffres en clair et dit
//                          ce qu'il fait ;
//   • un code posé      → il rend le pavé d'ouverture, inchangé.
//
// LE CHOIX QUI COMPTE, ET IL N'EST PAS ÉVIDENT : la bascule est LOCALE, pas une route. Le
// contrat § 6.2 donne `client/src/routeur.tsx` à N4, et une route `/parent/definir` aurait
// donc attendu un autre lot. Or une porte parent qui répond 404 sans écran derrière est un
// état sans issue, et c'est le pire bug possible ici. En composant les deux écrans dans le
// même hôte, la zone parent est réparée SANS dépendre d'aucun autre lot, et la route reste
// disponible plus tard sans rien changer à ce fichier.
//
// TANT QUE L'ÉTAT N'EST PAS CONNU, on rend le pavé d'ouverture plutôt qu'un écran d'attente :
// c'est le cas de loin le plus fréquent (le code est posé une fois dans la vie du foyer), et
// un scintillement « attente → pavé » à chaque visite coûterait plus qu'il ne rapporte. Si la
// réponse dit « aucun code », l'écran bascule ; et un `ouvrir` tenté entre-temps répond 404,
// que le pavé traduit lui aussi en bascule. Les deux chemins mènent au même endroit.
// ═══════════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErreurReseau, lireEtatPorteParent, ouvrirZoneParent } from '../api/client.js';
import { EcranDefinirCode } from './EcranDefinirCode.js';

export interface ProprietesEcranCodeParent {
  /** Appelé une fois le code accepté. */
  readonly surOuverture: () => void;
  /** Retour au monde de l'enfant. */
  readonly surAbandon?: () => void;
}

const LONGUEUR_CODE = 4;
const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

/** L'échéance du verrou, quand le serveur l'a jointe au 423. */
function echeanceDuVerrou(cause: unknown): string | null {
  if (!(cause instanceof ErreurReseau) || cause.statut !== 423) {
    return null;
  }
  const details = cause.corps?.['details'];
  if (typeof details !== 'object' || details === null) {
    return '';
  }
  const jusqua = (details as Record<string, unknown>)['verrouilleJusqua'];
  return typeof jusqua === 'string' ? jusqua : '';
}

/** `2026-09-01T08:15:00.000Z` → `10:15`. Sans `new Date` : on lit la chaîne. */
function heureLisible(horodatage: string): string {
  const heures = horodatage.slice(11, 16);
  return heures === '' ? 'un moment' : `${heures} (UTC)`;
}

export function EcranCodeParent({
  surOuverture,
  surAbandon
}: ProprietesEcranCodeParent): ReactElement {
  const [saisie, fixerSaisie] = useState('');
  const [message, fixerMessage] = useState<string | null>(null);
  const [verrouilleJusqua, fixerVerrou] = useState<string | null>(null);
  const [enCours, fixerEnCours] = useState(false);
  /**
   * Bascule locale vers l'écran de définition.
   *
   * Deux sources l'allument, et il en faut deux : la réponse de `GET /api/parent/etat` quand
   * elle arrive, et le **404 de `ouvrir`** si le parent a été plus rapide qu'elle. Sans la
   * seconde, un tap sur « Entrer » avant la fin de la requête laisserait l'écran afficher
   * « ce n'est pas ce code » pour un code qui n'existe pas — le message le plus décourageant
   * qu'on puisse rendre à quelqu'un qui n'a rien fait de mal.
   */
  const [definitionForcee, fixerDefinitionForcee] = useState(false);

  const porte = useQuery({
    queryKey: ['parent', 'etat'],
    queryFn: lireEtatPorteParent,
    // La porte n'est pas une donnée de session : elle change une fois dans la vie du foyer.
    // On la relit à chaque montage de l'écran, et jamais entre deux.
    staleTime: 0,
    retry: false
  });

  const verrouille = verrouilleJusqua !== null;

  const taper = useCallback(
    (chiffre: string): void => {
      if (verrouille || enCours) {
        return;
      }
      fixerMessage(null);
      fixerSaisie((precedent) => (precedent + chiffre).slice(0, LONGUEUR_CODE));
    },
    [enCours, verrouille]
  );

  const valider = useCallback((): void => {
    if (saisie.length !== LONGUEUR_CODE || enCours || verrouille) {
      return;
    }
    fixerEnCours(true);
    ouvrirZoneParent(saisie)
      .then(() => {
        fixerEnCours(false);
        fixerSaisie('');
        surOuverture();
      })
      .catch((cause: unknown) => {
        fixerEnCours(false);
        fixerSaisie('');
        const echeance = echeanceDuVerrou(cause);
        if (echeance !== null) {
          fixerVerrou(echeance);
          fixerMessage(null);
          return;
        }
        // 404 : AUCUN code n'existe. Ce n'est pas un mauvais code, c'est une porte qui n'a
        // pas encore de serrure. On bascule vers la definition au lieu de reprocher quoi que
        // ce soit — et le serveur, lui, n'a rien pose (contrat de finition v3 § 8).
        if (cause instanceof ErreurReseau && cause.statut === 404) {
          fixerDefinitionForcee(true);
          fixerMessage(null);
          return;
        }
        fixerMessage('Ce n’est pas ce code. On réessaie ?');
      });
  }, [enCours, saisie, surOuverture, verrouille]);

  // ── la bascule vers la definition ───────────────────────────────────────────────────────
  //
  // `porte.data?.codeDefini === false` est ecrit ainsi, et non `!porte.data?.codeDefini` :
  // tant que la requete n'a pas repondu, `porte.data` vaut `undefined` et la negation
  // basculerait vers la definition a chaque montage, y compris sur un foyer qui a un code
  // depuis des mois.
  if (definitionForcee || porte.data?.codeDefini === false) {
    return (
      <EcranDefinirCode
        surDefinition={surOuverture}
        {...(surAbandon === undefined ? {} : { surAbandon })}
      />
    );
  }

  return (
    <main
      data-ecran="code-parent"
      data-parent="code"
      data-parent-mode="ouverture"
      data-verrou={verrouille ? 'actif' : 'inactif'}
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '1.5rem',
        justifyItems: 'center',
        maxInlineSize: '30rem',
        marginInline: 'auto'
      }}
    >
      <h1 className="titre" style={{ fontSize: '2rem', margin: 0 }}>
        Espace du parent
      </h1>

      {verrouille ? (
        <p style={{ margin: 0, textAlign: 'center', fontSize: '1.125rem' }}>
          L’espace est fermé un moment. Il rouvre vers{' '}
          {heureLisible(verrouilleJusqua)}.
        </p>
      ) : (
        <p style={{ margin: 0, textAlign: 'center' }}>
          {/* CORRIGÉ N5 — la phrase d'avant disait « au tout premier passage, le code que tu
              tapes devient celui du foyer ». Elle décrivait fidèlement le défaut du § 1.8.
              Le code se choisit désormais sur son propre écran, et celui-ci ne fait plus
              qu'ouvrir. */}
          Tape le code à quatre chiffres du foyer.
        </p>
      )}

      <output
        aria-label={`Code saisi : ${String(saisie.length)} chiffre(s) sur ${String(LONGUEUR_CODE)}`}
        data-code-longueur={String(saisie.length)}
        style={{ display: 'flex', gap: '1rem' }}
      >
        {Array.from({ length: LONGUEUR_CODE }, (_, rang) => (
          <span
            key={rang}
            aria-hidden="true"
            style={{
              inlineSize: '1.5rem',
              blockSize: '1.5rem',
              borderRadius: '50%',
              border: '3px solid var(--trait)',
              background: rang < saisie.length ? 'var(--trait)' : 'transparent'
            }}
          />
        ))}
      </output>

      <div
        role="group"
        aria-label="Pavé numérique"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(80px, 1fr))', gap: '1rem' }}
      >
        {TOUCHES.map((chiffre) => (
          <button
            key={chiffre}
            type="button"
            className="cible"
            data-touche={chiffre}
            disabled={verrouille || enCours}
            onClick={() => taper(chiffre)}
            style={{ fontSize: '1.75rem', minBlockSize: 'var(--cible-min)' }}
          >
            {chiffre}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className="cible cible-secondaire"
          onClick={() => fixerSaisie('')}
          disabled={saisie === '' || enCours}
        >
          Effacer
        </button>
        <button
          type="button"
          className="cible cible-appel"
          data-valider="code-parent"
          onClick={valider}
          disabled={saisie.length !== LONGUEUR_CODE || enCours || verrouille}
        >
          {enCours ? 'On vérifie…' : 'Entrer'}
        </button>
        {surAbandon === undefined ? null : (
          <button type="button" className="cible cible-secondaire" onClick={surAbandon}>
            Retour au jeu
          </button>
        )}
      </div>

      {/* Jamais de rouge, jamais de croix : une phrase, et on recommence. */}
      {message === null ? null : (
        <p role="status" style={{ margin: 0, fontSize: '1.125rem' }}>
          {message}
        </p>
      )}
    </main>
  );
}
