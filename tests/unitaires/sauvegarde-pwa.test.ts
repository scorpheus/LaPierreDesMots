import { describe, expect, it } from 'vitest';

import {
  creerBaseSqliteWasm,
  type BaseNavigateur
} from '@client/base/adaptateur-sqlite-wasm';
import type {
  CanalSqliteWasm,
  CorpsRequeteSqliteWasm
} from '@client/base/protocole-sqlite-wasm';

function canalFactice() {
  const requetes: CorpsRequeteSqliteWasm[] = [];
  const canal: CanalSqliteWasm = {
    envoyer(requete) {
      requetes.push(requete);
      if (requete.type === 'exporter-base') return Promise.resolve(new Uint8Array([1, 2, 3]));
      if (requete.type === 'importer-base') return Promise.resolve({ octets: requete.donnees.byteLength });
      return Promise.resolve(undefined);
    },
    arreter() {}
  };
  return { canal, requetes };
}

describe('sauvegarde locale de la PWA', () => {
  it('exporte les octets SQLite par le Worker propriétaire de la connexion', async () => {
    const factice = canalFactice();
    const base: BaseNavigateur = creerBaseSqliteWasm(factice.canal);

    await expect(base.exporter()).resolves.toEqual(new Uint8Array([1, 2, 3]));
    expect(factice.requetes.at(-1)).toEqual({ type: 'exporter-base' });
  });

  it('importe une sauvegarde par le Worker, sans exposer le VFS à la fenêtre', async () => {
    const factice = canalFactice();
    const base: BaseNavigateur = creerBaseSqliteWasm(factice.canal);
    const donnees = new Uint8Array([83, 81, 76, 105, 116, 101]);

    await expect(base.importer(donnees)).resolves.toEqual({ octets: donnees.byteLength });
    expect(factice.requetes.at(-1)).toEqual({ type: 'importer-base', donnees });
  });
});
