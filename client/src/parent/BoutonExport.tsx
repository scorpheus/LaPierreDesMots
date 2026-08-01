// Exports CSV — v2 § 14, « exports CSV, sauvegarde en un clic ».
//
// Le fichier arrive du serveur déjà formaté pour l'Excel français : séparateur `;`, BOM UTF-8,
// virgule décimale. Le client ne reformate RIEN — un export qui serait retouché ici cesserait
// d'être la copie du journal, et c'est sa seule raison d'être.
//
// Le téléchargement passe par un `Blob` et un lien éphémère plutôt que par un `<a href>` : la
// route exige le jeton parent dans un en-tête, et un lien classique ne sait pas en poser un.
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { IdProfil } from '@pierre/partage';
import type { CodeExport } from '@pierre/partage/parent';
import { CODES_EXPORT } from '@pierre/partage/parent';
import { lireExportCsv } from '../api/client.js';

export interface ProprietesBoutonExport {
  readonly profil: IdProfil;
}

const LIBELLE: Readonly<Record<CodeExport, string>> = {
  tentatives: 'Parties jouées',
  etapes: 'Détail des étapes',
  maitrise: 'Compétences',
  confusions: 'Lettres confondues',
  latences: 'Vitesse de reconnaissance'
};

/** Déclenche l'enregistrement d'un texte sous un nom donné, sans quitter la page. */
function telecharger(nom: string, contenu: string): void {
  const objet = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(objet);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

export function BoutonExport({ profil }: ProprietesBoutonExport): ReactElement {
  const [enCours, fixerEnCours] = useState<CodeExport | null>(null);
  const [erreur, fixerErreur] = useState<string | null>(null);

  const exporter = (code: CodeExport): void => {
    fixerEnCours(code);
    fixerErreur(null);
    lireExportCsv(profil, code)
      .then((csv) => {
        telecharger(`pierre-${code}.csv`, csv);
        fixerEnCours(null);
      })
      .catch((cause: unknown) => {
        fixerEnCours(null);
        fixerErreur(cause instanceof Error ? cause.message : String(cause));
      });
  };

  return (
    <section data-indicateur="exports" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: 0 }}>
        Exports
      </h2>
      <p style={{ margin: 0, color: 'var(--grisaille)' }}>
        Fichiers CSV, prêts pour un tableur. Ce sont les données brutes, sans arrondi.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {CODES_EXPORT.map((code) => (
          <button
            key={code}
            type="button"
            className="cible"
            data-export={code}
            disabled={enCours !== null}
            onClick={() => exporter(code)}
          >
            {enCours === code ? 'Préparation…' : LIBELLE[code]}
          </button>
        ))}
      </div>
      {erreur === null ? null : <p style={{ margin: 0 }}>{erreur}</p>}
    </section>
  );
}
