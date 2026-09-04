import { describe, expect, it } from 'vitest';

import {
  ErreurBaseNavigateur,
  creerBaseSqliteWasm
} from '@client/base/adaptateur-sqlite-wasm';
import type {
  CanalSqliteWasm,
  CorpsRequeteSqliteWasm
} from '@client/base/protocole-sqlite-wasm';

function creerCanalFactice(): {
  readonly canal: CanalSqliteWasm;
  readonly requetes: CorpsRequeteSqliteWasm[];
  arrete: boolean;
} {
  const requetes: CorpsRequeteSqliteWasm[] = [];
  let arrete = false;
  const canal = {
    envoyer(requete: CorpsRequeteSqliteWasm): Promise<unknown> {
      requetes.push(requete);
      if (requete.type === 'lancer') {
        return Promise.resolve({ changements: 1, dernierIdInsere: 9_007_199_254_740_993n });
      }
      if (requete.type === 'une-ligne') {
        return Promise.resolve({ id: 1, contenu: new Uint8Array([2, 3, 5]) });
      }
      if (requete.type === 'lignes') {
        return Promise.resolve([{ id: 1 }, { id: 2 }]);
      }
      return Promise.resolve(undefined);
    },
    arreter(): void {
      arrete = true;
    }
  } satisfies CanalSqliteWasm;
  return {
    canal,
    requetes,
    get arrete() {
      return arrete;
    }
  };
}

describe('adaptateur SQLite WASM — contrat Base et sérialisation', () => {
  it('transporte les BLOB, les lignes et le rowid bigint sans les dégrader', async () => {
    const { canal, requetes } = creerCanalFactice();
    const base = creerBaseSqliteWasm(canal);
    const blob = new Uint8Array([2, 3, 5]);

    await expect(base.lancer('INSERT INTO fichiers (contenu) VALUES (?)', [blob])).resolves.toEqual({
      changements: 1,
      dernierIdInsere: 9_007_199_254_740_993n
    });
    await expect(base.uneLigne('SELECT id, contenu FROM fichiers')).resolves.toEqual({
      id: 1,
      contenu: blob
    });
    await expect(base.lignes('SELECT id FROM fichiers ORDER BY id')).resolves.toEqual([
      { id: 1 },
      { id: 2 }
    ]);

    expect(requetes[0]).toMatchObject({ type: 'lancer', parametres: [blob], jeton: null });
  });

  it('garde le mutex pendant tout le callback et réserve un jeton à la Base transactionnelle', async () => {
    const { canal, requetes } = creerCanalFactice();
    const base = creerBaseSqliteWasm(canal);
    let signalerEntree!: () => void;
    const entree = new Promise<void>((resoudre) => {
      signalerEntree = resoudre;
    });
    let liberer!: () => void;
    const suspension = new Promise<void>((resoudre) => {
      liberer = resoudre;
    });

    const transaction = base.transaction(async (dansTransaction) => {
      await dansTransaction.lancer('ECRITURE INTERNE');
      signalerEntree();
      await suspension;
    });
    await entree;

    const appelConcurrent = base.lancer('ECRITURE EXTERNE');
    expect(requetes.map((requete) => requete.type)).toEqual([
      'debut-transaction',
      'lancer'
    ]);
    expect(requetes[1]).toMatchObject({ jeton: 'transaction-1' });

    liberer();
    await transaction;
    await appelConcurrent;
    expect(requetes.map((requete) => requete.type)).toEqual([
      'debut-transaction',
      'lancer',
      'valider-transaction',
      'lancer'
    ]);
    expect(requetes[3]).toMatchObject({ jeton: null });
  });

  it('annule sur exception, refuse une transaction imbriquée et ferme le canal une fois', async () => {
    const factice = creerCanalFactice();
    const base = creerBaseSqliteWasm(factice.canal);
    const erreurOriginale = new Error('échec délibéré');

    await expect(
      base.transaction(async (transaction) => {
        await transaction.executer('ECRITURE A ANNULER');
        await expect(transaction.transaction(async () => undefined)).rejects.toBeInstanceOf(
          ErreurBaseNavigateur
        );
        throw erreurOriginale;
      })
    ).rejects.toBe(erreurOriginale);
    expect(factice.requetes.map((requete) => requete.type)).toEqual([
      'debut-transaction',
      'executer',
      'annuler-transaction'
    ]);

    await base.fermer();
    await base.fermer();
    expect(factice.requetes.filter((requete) => requete.type === 'fermer')).toHaveLength(1);
    expect(factice.arrete).toBe(true);
  });
});
