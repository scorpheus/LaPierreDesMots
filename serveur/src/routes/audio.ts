/**
 * Routes audio — lot N2, contrat de finition v3 § 4.2 et § 8.
 *
 *   GET /api/audio/manifeste   -> ManifesteVoix
 *   GET /api/audio/*           -> les clips Opus de `contenu/audio/`, en statique
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * LE MANIFESTE EST SERVI, PAS DEVINÉ. Le serveur ne liste pas `contenu/audio/` pour dire ce
 * qui existe : il rend le fichier que `npm run voix` a écrit. La différence est celle de
 * D42 — un `.opus` présent sur le disque mais recalé par la transcription inverse ne DOIT PAS
 * faire apparaître un bouton, et seul le manifeste le sait.
 *
 * UN MANIFESTE ABSENT N'EST PAS UNE ERREUR. Sur une installation où le rendu des voix n'a pas
 * tourné, la route rend un manifeste VIDE avec un 200. Le client se comporte alors comme le
 * dépôt d'avant N2 : `aUnAudio` rend `false`, tous les boutons sont masqués, le jeu se joue.
 * Rendre 404 obligerait le client à traiter un cas d'erreur pour une situation NORMALE — et
 * « on clone, on lance, ça marche » (D9) ne survit pas à un écran d'erreur au premier
 * démarrage.
 *
 * L'OCTET PASSE PAR LE `DepotContenu` INJECTÉ, jamais par un chemin relu de l'environnement.
 * C'est la même frontière que `routes/contenu.ts`, et c'est ce qui permet à un test de servir
 * des clips depuis un dépôt en mémoire. La garde de traversée vit dans l'implantation disque.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */

import { Buffer } from 'node:buffer';

import type { FastifyInstance } from 'fastify';

import { MANIFESTE_VIDE, lireManifeste } from '@pierre/partage/voix';

import type { ContexteServeur } from '../configuration.js';
import { CODES_ERREUR, erreurApi } from '../configuration.js';
import { typeMime } from '../statique.js';

interface ParametresJoker {
  readonly '*': string;
}

/** Chemin du manifeste, relatif à la racine de `contenu/`. */
export const CHEMIN_MANIFESTE = 'audio/manifeste.json';

/**
 * Une année. Le nom de fichier d'un clip porte l'empreinte de son texte (§ 8) : un texte
 * corrigé produit un NOM différent, donc un clip ne change jamais sous le même nom, donc le
 * cache peut être `immutable` sans risque de servir une consigne périmée à l'enfant.
 */
const CACHE_CLIPS = 'public, max-age=31536000, immutable';

export function enregistrerRoutesAudio(app: FastifyInstance, contexte: ContexteServeur): void {
  app.get('/api/audio/manifeste', async (_requete, reponse) => {
    const octets = await contexte.contenu.lireAsset(CHEMIN_MANIFESTE);
    if (octets === null) {
      // Pas d'erreur : c'est l'état d'une installation neuve.
      return reponse.send(MANIFESTE_VIDE);
    }

    let brut: unknown;
    try {
      brut = JSON.parse(Buffer.from(octets).toString('utf8'));
    } catch {
      // Un manifeste illisible rend le jeu muet, jamais cassé. On le journalise pour le
      // parent — c'est le seul endroit qui puisse dire « le rendu des voix a mal fini ».
      process.stderr.write('[pierre] manifeste audio illisible — le jeu reste muet\n');
      return reponse.send(MANIFESTE_VIDE);
    }

    // `lireManifeste` refiltre : elle écarte les clips mal formés et ceux sous `SEUIL_QC`.
    // Répéter ici le filtre que le script applique déjà n'est pas un doublon inutile — le
    // script est un artefact de build qu'un jour quelqu'un relancera avec un seuil desserré,
    // et cette ligne-ci est celle qui protège l'oreille de l'enfant à l'exécution.
    // Le manifeste n'est PAS mis en cache : il change à chaque rendu de voix, et il est
    // minuscule devant les clips qu'il décrit.
    return reponse.header('Cache-Control', 'no-cache').send(lireManifeste(brut));
  });

  app.get<{ Params: ParametresJoker }>('/api/audio/*', async (requete, reponse) => {
    const relatif = requete.params['*'];
    let decode: string;
    try {
      decode = decodeURIComponent(relatif);
    } catch {
      return reponse.code(400).send(erreurApi(CODES_ERREUR.invalide, 'Chemin de clip illisible.'));
    }

    // Le manifeste a sa propre route, avec son propre filtrage. Le laisser passer ici
    // servirait le fichier BRUT — clips sous seuil compris — et court-circuiterait D42.
    if (decode === 'manifeste.json' || decode === '') {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, 'Le manifeste se lit sur /api/audio/manifeste.'));
    }

    const octets = await contexte.contenu.lireAsset(`audio/${decode}`);
    if (octets === null) {
      return reponse
        .code(404)
        .send(erreurApi(CODES_ERREUR.introuvable, `Clip introuvable : ${decode}`));
    }

    return reponse
      .type(typeMime(decode))
      .header('Cache-Control', CACHE_CLIPS)
      .send(Buffer.from(octets));
  });
}
