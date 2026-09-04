/** Frontière de sauvegarde manuelle : aucun octet ne quitte le navigateur sans geste du parent. */

export const TAILLE_MAX_SAUVEGARDE_PWA = 64 * 1024 * 1024;

async function ouvrirBasePwa() {
  if (import.meta.env.MODE !== 'pwa') {
    throw new Error("La sauvegarde SQLite n'est disponible que dans la PWA.");
  }
  const { ouvrirBaseNavigateur } = await import('../base/adaptateur-sqlite-wasm.js');
  return ouvrirBaseNavigateur();
}

export async function telechargerSauvegardePwa(): Promise<{ readonly octets: number }> {
  const base = await ouvrirBasePwa();
  const donnees = await base.exporter();
  const copie = new ArrayBuffer(donnees.byteLength);
  new Uint8Array(copie).set(donnees);
  const url = URL.createObjectURL(
    new Blob([copie], { type: 'application/vnd.sqlite3' })
  );
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = 'la-pierre-des-mots.sqlite3';
  lien.hidden = true;
  document.body.append(lien);
  try {
    lien.click();
  } finally {
    lien.remove();
    URL.revokeObjectURL(url);
  }
  return { octets: donnees.byteLength };
}

export async function importerSauvegardePwa(
  fichier: File
): Promise<{ readonly octets: number }> {
  if (fichier.size < 1) throw new Error('Le fichier choisi est vide.');
  if (fichier.size > TAILLE_MAX_SAUVEGARDE_PWA) {
    throw new Error('Le fichier dépasse la taille maximale de 64 Mio.');
  }
  const donnees = new Uint8Array(await fichier.arrayBuffer());
  const base = await ouvrirBasePwa();
  const resultat = await base.importer(donnees);
  // Libérer explicitement le Web Lock avant le rechargement évite que la nouvelle page ne
  // prenne l'ancienne connexion, encore en cours de destruction, pour un second onglet.
  await base.fermer();
  return resultat;
}
