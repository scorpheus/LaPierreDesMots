import { afterEach, expect, it, vi } from 'vitest';
import { portHttp } from '@client/api/port-http';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('une requête suspendue expire et peut être réessayée', async () => {
  const controle = new AbortController();
  const expiration = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controle.signal);
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) =>
    new Promise<Response>((_resoudre, rejeter) => {
      options.signal?.addEventListener('abort', () => rejeter(options.signal?.reason));
    })));
  const lecture = portHttp.lireSante();
  expect(expiration).toHaveBeenCalledWith(15_000);
  const rejet = expect(lecture).rejects.toMatchObject({ name: 'TimeoutError' });
  controle.abort(new DOMException('Expiration de la requête', 'TimeoutError'));
  await rejet;
  expiration.mockReturnValue(new AbortController().signal);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ statut: 'ok' }))));
  expect(await portHttp.lireSante()).toEqual({ statut: 'ok' });
});
