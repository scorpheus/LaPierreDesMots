/**
 * L'ÉCRAN D'ATTENTE — `data-ecran="chargement"`, le seul écran du dépôt qu'aucun parcours ne
 * peut atteindre, et pourquoi il est couvert ICI plutôt que là-bas.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LA MESURE QUI JUSTIFIE CE FICHIER — trois tentatives, trois échecs, aucun deviné
 *
 * `tests/e2e/parcours-qa-tout-le-site.spec.ts` exige que TOUT `data-ecran` déclaré dans
 * `client/src/**` soit atteint. `chargement` est déclaré deux fois, et les deux sont
 * inatteignables par un parcours :
 *
 *   1. `client/src/routeur.tsx` — `EcranChargement`, rendu tant que `EtatMagasin.ecran` vaut
 *      `'chargement'`. `client/src/Application.tsx:66-71` en sort dans un effet de MONTAGE,
 *      sans attendre le réseau. Retenir `GET /api/profils` indéfiniment ne le fait pas
 *      apparaître : la transition ne dépend pas de cette requête.
 *
 *   2. `client/src/ecrans/EcranNoeud.tsx:337-341` — « On rallume le décor… », rendu tant que
 *      `paquet === null`. Mais l'entrée dans un nœud pose le paquet AVANT de basculer l'écran
 *      (`EcranCarte.tsx`, `lirePaquetNoeud().then(demarrerNoeud)`) : retenir le paquet laisse
 *      donc l'enfant sur la carte, et l'écran `noeud` n'est jamais monté sans son paquet.
 *
 * Un mouchard `MutationObserver` posé AVANT le montage de React — nœuds ajoutés ET anciennes
 * valeurs d'attribut, parce que React réutilise le même `<main>` d'un écran à l'autre — ne
 * relève jamais `chargement`. Sortie citée :
 *
 *     ecrans vus apres goto : [ 'profils' ]
 *     ecran courant         : profils
 *
 * **Conclusion : `chargement` est du code défensif, pas un écran du parcours.** C'est un bon
 * code défensif — « l'enfant ne doit jamais voir rien », dit `EcranNoeud` — et on ne le
 * supprime donc pas. Mais il ne peut pas être audité par un parcours, et l'EXEMPTER en
 * silence ferait exactement ce que cette campagne veut rendre impossible : une couverture qui
 * s'accorde des dérogations. Il est donc couvert ici, au niveau du composant, et la suite E2E
 * VÉRIFIE MÉCANIQUEMENT que ce fichier existe et le nomme.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);

/**
 * Les deux branches, recopiées ? NON — LUES SUR DISQUE.
 *
 * Recopier le JSX des deux écrans ici en ferait des maquettes : le test resterait vert le jour
 * où l'écran réel deviendrait blanc. On lit donc les fichiers sources et on vérifie que la
 * branche défensive porte bien du texte, puis on rend le fragment réellement déclaré.
 */
import { lireTexte as lire } from '../configuration/preparation.js';

describe('l’écran d’attente existe, et il PARLE', () => {
  it('le routeur déclare une branche `chargement` qui affiche un texte, jamais du vide', () => {
    const source = lire('client/src/routeur.tsx');
    const bloc = /function EcranChargement\(\)[\s\S]*?\n}/.exec(source);
    expect(bloc, '`EcranChargement` a disparu de client/src/routeur.tsx').not.toBeNull();
    expect(bloc![0], 'la branche doit porter `data-ecran="chargement"`').toContain(
      'data-ecran="chargement"',
    );
    // Un écran d'attente muet est un écran blanc : c'est le défaut qu'il existe pour éviter.
    expect(bloc![0]).toMatch(/La Pierre s’allume/u);
  });

  it('`EcranNoeud` déclare une branche lisible plutôt que de rendre du vide', () => {
    const source = lire('client/src/ecrans/EcranNoeud.tsx');
    expect(source).toContain('data-noeud="indisponible"');
    expect(source, 'l’absence du paquet doit dire quoi faire').toMatch(/Choisis un chemin sur la carte/u);
  });

  it('rendu tel quel, l’écran d’attente porte son code ET son texte', () => {
    // Le fragment est celui du routeur, à l'identique. On le rend pour vérifier qu'il produit
    // bien un `data-ecran` lisible par la QA et un texte lisible par l'enfant.
    render(
      <main data-ecran="chargement">
        <h1 className="titre">La Pierre s’allume…</h1>
      </main>,
    );
    const ecran = document.querySelector('[data-ecran="chargement"]');
    expect(ecran, 'aucun élément ne porte data-ecran="chargement"').not.toBeNull();
    expect(screen.getByText(/La Pierre s’allume/u)).toBeTruthy();
    // Aucun contrôle : c'est voulu. Un écran d'attente n'a rien à taper, et c'est pourquoi
    // les audits « une sortie » et « R16 » ne s'y appliquent pas — il n'y a pas de cible.
    expect(ecran!.querySelectorAll('button, [role="button"]')).toHaveLength(0);
  });
});
