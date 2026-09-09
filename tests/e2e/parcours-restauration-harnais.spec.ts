import { test, expect } from './invariants.js';
import { fixtureProfil } from './qa-outils.js';

test('une restauration remet réellement la base de recette à neuf sur la même adresse', async ({ request, serveurIsole }) => {
  const adresse = serveurIsole.url;
  for (let passage = 0; passage < 2; passage += 1) {
    expect(await (await request.get('/api/profils')).json()).toEqual([]);
    const creation = await request.post('/api/profils', { data: {
      prenom: fixtureProfil['prenom'], avatar: fixtureProfil['avatar'],
      paletteVariante: fixtureProfil['paletteVariante'],
    } });
    expect(creation.status()).toBe(201);
    expect(await (await request.get('/api/profils')).json()).toHaveLength(1);
    await serveurIsole.reinitialiser();
    expect(serveurIsole.url).toBe(adresse);
    expect(await (await request.get('/api/profils')).json()).toEqual([]);
  }
});
