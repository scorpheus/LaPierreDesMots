/**
 * SHA-256 hexadécimal, portable serveur/navigateur.
 *
 * `node:crypto` n'existe pas dans une WebView Android. `globalThis.crypto.subtle` (Web Crypto),
 * lui, est disponible aussi bien en Node 24 qu'en navigateur — un seul hachage, deux runtimes.
 * Async par nature (SubtleCrypto ne rend que des promesses), ce qui n'est pas un coût
 * supplémentaire ici : tout appelant de `partage/src/base/depots/` est déjà async.
 */
export async function hacherSha256Hex(texte: string): Promise<string> {
  const octets = new TextEncoder().encode(texte);
  const empreinte = await globalThis.crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(empreinte)].map((octet) => octet.toString(16).padStart(2, '0')).join('');
}
