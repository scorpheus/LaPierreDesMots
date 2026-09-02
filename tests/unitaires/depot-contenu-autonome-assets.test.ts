/**
 * Contrat des assets embarqués dans l'APK.
 *
 * Le serveur LAN peut servir n'importe quel fichier de `contenu/`, mais l'application Android
 * ne voit que les extensions énumérées dans `import.meta.glob`. Une belle illustration PNG qui
 * fonctionne sur le PC et disparaît dans l'APK est donc une régression spécifique au portage.
 */
import { describe, expect, it } from 'vitest';

import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';

describe('assets raster du mode autonome', () => {
  it('embarque les PNG de production, comme ceux des tableaux d’ouverture', () => {
    // Asset réel et déjà validé : il prouve le glob PNG sans introduire de faux tableau
    // d'ouverture dans la production avant la validation parentale.
    expect(urlAssetAutonome('assets/campement/campement-v6.png')).not.toBeNull();
  });
});
