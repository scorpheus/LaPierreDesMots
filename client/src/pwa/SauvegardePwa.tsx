import { useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import {
  importerSauvegardePwa,
  TAILLE_MAX_SAUVEGARDE_PWA,
  telechargerSauvegardePwa
} from './sauvegarde-locale.js';

type Operation = 'repos' | 'export' | 'import';

function messageDe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** Export/import visible uniquement dans la zone parent de la cible PWA. */
export function SauvegardePwa(): ReactElement | null {
  const entree = useRef<HTMLInputElement>(null);
  const [fichier, fixerFichier] = useState<File | null>(null);
  const [operation, fixerOperation] = useState<Operation>('repos');
  const [message, fixerMessage] = useState('');

  if (import.meta.env.MODE !== 'pwa') return null;

  const choisir = (evenement: ChangeEvent<HTMLInputElement>): void => {
    const choisi = evenement.target.files?.[0] ?? null;
    fixerFichier(choisi);
    fixerMessage(
      choisi !== null && choisi.size > TAILLE_MAX_SAUVEGARDE_PWA
        ? 'Ce fichier dépasse la taille maximale de 64 Mio.'
        : ''
    );
  };

  const exporter = async (): Promise<void> => {
    fixerOperation('export');
    fixerMessage('Préparation de la sauvegarde…');
    try {
      const resultat = await telechargerSauvegardePwa();
      fixerMessage(`Sauvegarde téléchargée (${String(resultat.octets)} octets).`);
    } catch (cause) {
      fixerMessage(`La sauvegarde n’a pas pu être créée : ${messageDe(cause)}`);
    } finally {
      fixerOperation('repos');
    }
  };

  const importer = async (): Promise<void> => {
    if (fichier === null || fichier.size > TAILLE_MAX_SAUVEGARDE_PWA) return;
    fixerOperation('import');
    fixerMessage('Vérification complète de la sauvegarde…');
    try {
      await importerSauvegardePwa(fichier);
      // La nouvelle base est déjà ouverte dans le Worker. Recharger reconstruit tous les
      // services et projections depuis elle, sans conserver un état React de l'ancienne base.
      window.location.reload();
    } catch (cause) {
      fixerMessage(`Import refusé, la progression actuelle est conservée : ${messageDe(cause)}`);
      fixerOperation('repos');
    }
  };

  const occupe = operation !== 'repos';
  return (
    <section
      className="zone-lecture"
      data-sauvegarde-pwa
      aria-labelledby="titre-sauvegarde-pwa"
      style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}
    >
      <h2 id="titre-sauvegarde-pwa" className="titre" style={{ margin: 0, fontSize: '1.25rem' }}>
        Sauvegarde de cette tablette
      </h2>
      <p style={{ margin: 0 }}>
        Télécharge une copie de toute la progression, ou restaure une copie enregistrée. Rien
        n’est envoyé sur Internet.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="cible cible-secondaire"
          disabled={occupe}
          onClick={() => void exporter()}
        >
          Télécharger la sauvegarde
        </button>
        <button
          type="button"
          className="cible cible-secondaire"
          disabled={occupe}
          onClick={() => entree.current?.click()}
        >
          Choisir une sauvegarde
        </button>
        <input
          ref={entree}
          type="file"
          accept=".sqlite,.sqlite3,.db,application/vnd.sqlite3,application/octet-stream"
          onChange={choisir}
          hidden
        />
      </div>
      {fichier === null ? null : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <p style={{ margin: 0 }}>Fichier choisi : {fichier.name}</p>
          <p style={{ margin: 0 }}>
            Restaurer remplace toute la progression présente sur cet appareil. Le fichier est
            vérifié avant le remplacement et l’ancienne base est remise en place en cas d’échec.
          </p>
          <button
            type="button"
            className="cible cible-appel"
            disabled={occupe || fichier.size > TAILLE_MAX_SAUVEGARDE_PWA}
            onClick={() => void importer()}
          >
            Restaurer cette sauvegarde
          </button>
        </div>
      )}
      {message === '' ? null : (
        <p role="status" aria-live="polite" style={{ margin: 0 }}>
          {message}
        </p>
      )}
    </section>
  );
}
