// Point d'entrée du client — contrat technique v1 § 1.4 et § 7.2.
//
// LE POINT LE PLUS SENSIBLE DU LOT tient en six lignes, plus bas : la garde
// `import.meta.env.MODE === 'test'`. Trois propriétés se combinent (§ 7.2) — Vite remplace
// `import.meta.env.MODE` par un LITTÉRAL au build, la condition devient statiquement fausse en
// production, et Rollup élimine à la fois la branche ET le chunk dynamique qui n'est plus
// référencé. `src/testabilite/crochets.ts` n'est donc jamais émis dans `client/dist/`, ce que
// `scripts/verifier-bundle.mjs` (L-G) vérifie en cherchant les six chaînes interdites.
//
// Corollaire opposable : le montage doit rester un `await import()` DANS la garde. Un import
// statique en tête de fichier, même inutilisé, ferait entrer les crochets dans le bundle de
// production et ferait échouer `test:qualite`.
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { initialiserRegistreMoteurs } from '@pierre/partage';
import { Application } from './Application.js';
import { creerMagasin } from './etat/magasin.js';
import { creerServicesParDefaut, resoudreGraineParDefaut } from './etat/services.js';
import { appliquerVariablesPalette } from './habillages/chargeur.js';
import './styles/global.css';

// Idempotent, et appelé par CHAQUE racine de composition (§ 4.3) : client, serveur, tests.
initialiserRegistreMoteurs();

// La couleur vient du code, pas du CSS : `PALETTE` et `NUANCIER` (L-B) écrasent les littéraux
// de `global.css`, qui n'existent que pour que Tailwind engendre ses utilitaires au build.
const variablesEcrites = appliquerVariablesPalette(document.documentElement);
if (variablesEcrites === 0) {
  console.warn('[palette] aucune variable dérivée de PALETTE — le CSS fait foi par défaut.');
}

const graine = resoudreGraineParDefaut();
const services = creerServicesParDefaut(graine);
const magasin = creerMagasin(services, graine);

if (import.meta.env.MODE === 'test') {
  const { monterCrochetsDeTest } = await import('./testabilite/crochets.js');
  monterCrochetsDeTest({ magasin, services });
}

const racine = document.getElementById('racine');
if (racine === null) {
  throw new Error('Élément #racine introuvable : `index.html` a-t-il été modifié ?');
}

// `StrictMode` uniquement en développement : son double montage ferait partir deux fois les
// effets pilotés par `window.__test` pendant les parcours Playwright.
const arbre: ReactNode = <Application magasin={magasin} services={services} />;

createRoot(racine).render(
  import.meta.env.MODE === 'development' ? <StrictMode>{arbre}</StrictMode> : arbre
);
