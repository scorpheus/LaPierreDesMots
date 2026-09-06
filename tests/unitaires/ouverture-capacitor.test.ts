import { beforeEach, expect, it, vi } from 'vitest';
import type * as ModuleSqlite from '@capacitor-community/sqlite';

const natif = vi.hoisted(() => {
  const etat = { connexion: false };
  const plugin = {
    checkConnectionsConsistency: vi.fn(async ({ dbNames }: { dbNames: string[] }) => {
      const coherent = etat.connexion === dbNames.includes('pierre');
      if (!coherent) etat.connexion = false; // Ferme une connexion orpheline, pas la base.
      return { result: coherent };
    }),
    createConnection: vi.fn(async () => {
      if (etat.connexion) throw new Error('Connection pierre already exists');
      etat.connexion = true;
    }),
    open: vi.fn(async () => undefined),
    execute: vi.fn(async () => ({ changes: { changes: 0 } })),
    deleteDatabase: vi.fn(async () => { throw new Error('La base ne doit jamais être supprimée.'); }),
  };
  return { etat, plugin };
});
vi.mock('@capacitor-community/sqlite', async (original) => ({
  ...(await original<typeof ModuleSqlite>()),
  CapacitorSQLite: natif.plugin,
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  natif.etat.connexion = false;
});

it('retrouve la même connexion lors de deux ouvertures dans la même page', async () => {
  const { ouvrirBaseCapacitor } = await import('@client/base/adaptateur-capacitor-sqlite');
  const premiere = await ouvrirBaseCapacitor();
  expect(await ouvrirBaseCapacitor()).toBe(premiere);
  expect(natif.plugin.createConnection).toHaveBeenCalledOnce();
  expect(natif.plugin.deleteDatabase).not.toHaveBeenCalled();
});

it('réconcilie le registre JavaScript après rechargement sans demander la suppression de la base', async () => {
  natif.etat.connexion = true; // La WebView a rechargé son JS, le plugin natif a survécu.
  const { ouvrirBaseCapacitor } = await import('@client/base/adaptateur-capacitor-sqlite');
  await expect(ouvrirBaseCapacitor()).resolves.toBeDefined();
  expect(natif.plugin.checkConnectionsConsistency).toHaveBeenCalledWith({ dbNames: [], openModes: [] });
  expect(natif.plugin.createConnection).toHaveBeenCalledOnce();
  expect(natif.plugin.deleteDatabase).not.toHaveBeenCalled();
});
