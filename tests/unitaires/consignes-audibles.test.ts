/**
 * R15 — « aucune consigne n'existe uniquement à l'écrit ». Défaut n° 3 du père, à sa racine :
 * « pour l'instant j'ai cliqué et je n'ai rien eu ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * L'ORACLE A CHANGÉ AVEC LE LOT N2. L'ASSERTION, NON.
 *
 * Ce fichier est l'un des huit tests de constat du contrat de finition v3 § 1.1 : « ils
 * MESURENT les défauts que les lots N1 à N8 doivent solder. Aucun lot ne les supprime ; ils
 * deviennent les tests de non-régression du travail. » C'est ce qu'il devient ici.
 *
 * Sa version d'origine lisait le champ `audio` de chaque consigne dans les fichiers
 * d'exercice, et exigeait qu'il ne soit pas `null`. Ce champ ne sera JAMAIS renseigné, et
 * c'est une décision, pas un oubli — contrat v3 § 4.2 :
 *
 *   « N2 ne modifie AUCUN fichier d'exercice. La résolution passe par la clé du manifeste,
 *     jamais par le champ `audio` du JSON — c'est ce qui évite deux écrivains sur les mêmes
 *     exercices. »
 *
 * Le champ `audio` des exercices est donc devenu une donnée MORTE : N1 possède
 * `miroir-bd-01`, N8 possède les autres, et le manifeste (`contenu/audio/manifeste.json`)
 * est « la SEULE source de vérité sur l'existence d'un clip » (§ 5.4). Continuer à
 * l'interroger, ce serait mesurer un champ que plus personne ne remplit et appeler ça une
 * dette.
 *
 * Ce fichier pose donc EXACTEMENT la même question — « cette consigne livrée est-elle
 * audible en un tap ? » — au bon endroit. Aucune assertion n'a été assouplie : le cas de
 * contrôle de la mesure est conservé, un second l'a rejoint, et le seuil reste 100 %.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { aUnAudio, lireManifeste } from '@pierre/partage/voix';
import type { ManifesteVoix } from '@pierre/partage/voix';

import { inviteLibre, recenser } from '../../scripts/recenser-textes.mjs';
import { RACINE_DEPOT, lireTexte } from '../configuration/preparation.js';

/** Une consigne livrée : d'où elle vient, ce qu'elle dit, et sous quelle clé elle s'entend. */
interface ConsigneLivree {
  readonly exercice: string;
  readonly id: string;
  readonly texte: string;
  /**
   * La clé du manifeste. Construite ici selon la convention de
   * `scripts/recenser-textes.mjs` — `<idExercice>/<idConsigne>` — et selon celle que
   * `EcranNoeud.tsx` passe au bouton. Les trois doivent coïncider : si elles divergeaient,
   * le bouton serait masqué sur une consigne qui a pourtant son clip.
   */
  readonly cle: string;
}

function fichiersExercices(): readonly string[] {
  const racine = join(RACINE_DEPOT, 'contenu', 'exercices');
  return readdirSync(racine, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((dossier) =>
      readdirSync(join(racine, dossier.name))
        .filter((f) => f.endsWith('.json'))
        .map((f) => `contenu/exercices/${dossier.name}/${f}`),
    );
}

/**
 * Les consignes livrées, EXTRAITES PAR LE RECENSEUR LUI-MÊME — corrigé au lot A4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE FICHIER PORTAIT UNE SECONDE IMPLANTATION DE `consignesDe`, ET ELLE A DÉRIVÉ.
 *
 * `scripts/recenser-textes.mjs` décide ce qui reçoit un clip ; ce test décidait, de son côté,
 * ce qui doit en avoir un. Deux extracteurs pour la même question, donc deux occasions de ne
 * pas voir le même objet — et c'est arrivé : ni l'un ni l'autre ne lisait les `questions` du
 * moteur `histoire` ni l'invitation du moteur `libre`, faute d'exercice à lire quand ils ont
 * été écrits (D48 : ce qu'aucun objet ne porte, aucun recensement ne cherche).
 *
 * Le pire cas n'est pourtant pas celui-là. Si SEUL le test avait été corrigé, il aurait exigé
 * des clips que le rendu n'aurait jamais produits ; si seul le recenseur l'avait été, des
 * clips auraient été rendus sans que rien ne vérifie qu'ils existent. La question ne se pose
 * plus : **l'oracle du test est la sortie du recenseur**. Aucune assertion n'est assouplie —
 * le dénominateur GROSSIT (16 exercices recensés hier, 18 aujourd'hui), et le seuil reste
 * 100 %.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
interface ObjetRecense {
  readonly cle: string;
  readonly texte: string;
  readonly rendu: string;
  readonly origine: string;
}

const toutes: readonly ConsigneLivree[] = (
  recenser() as { objets: readonly ObjetRecense[] }
).objets
  .filter(
    (objet) =>
      objet.rendu === 'normal' &&
      objet.origine.startsWith('contenu/exercices/') &&
      // Les mots cibles viennent des mêmes fichiers mais ne sont pas des consignes : le
      // § 5.4 les met hors du taux, et `couverture-audio.test.ts` les assert à part.
      !objet.cle.startsWith('mot/'),
  )
  .map((objet) => {
    const [exercice, id] = objet.cle.split('/');
    return { exercice: String(exercice), id: String(id), texte: objet.texte, cle: objet.cle };
  });

const CHEMIN_MANIFESTE = join(RACINE_DEPOT, 'contenu', 'audio', 'manifeste.json');
const manifeste: ManifesteVoix = existsSync(CHEMIN_MANIFESTE)
  ? lireManifeste(JSON.parse(readFileSync(CHEMIN_MANIFESTE, 'utf8')))
  : lireManifeste(null);

describe('R15 — toute consigne livrée est audible en un tap', () => {
  it('le recensement porte sur des OBJETS : au moins une consigne par exercice', () => {
    // Contrôle de la mesure. Sans lui, un extracteur cassé ferait « passer » les cas
    // suivants en ne trouvant rien à vérifier.
    const exercices = new Set(toutes.map((c) => c.exercice));
    expect(fichiersExercices().length).toBeGreaterThan(0);
    expect(exercices.size).toBe(fichiersExercices().length);
  });

  it('l’invitation du coloriage libre est UNE seule chaîne, lue là où elle s’affiche', () => {
    // Troisième contrôle de la mesure, lot A4. Le moteur `libre` n'a pas de consigne dans ses
    // données — c'est son contrat (§ 4.8) — mais l'écran AFFICHE une invitation, et R15 ne fait
    // pas d'exception. Le recenseur va chercher sa source dans `MoteurLibre.tsx`, tandis que
    // `EcranNoeud` l'injecte dans l'unique barre de lecture. Les deux liens sont gardés : le
    // texte reste une seule chaîne sans devoir être rendu deux fois.
    const source = lireTexte('client/src/moteurs/libre/MoteurLibre.tsx');
    const sourceEcran = lireTexte('client/src/ecrans/EcranNoeud.tsx');
    const texte = (inviteLibre as (racine?: string) => string)();
    expect(source).toContain(`export const INVITE_LIBRE = '${texte}'`);
    expect(sourceEcran).toContain('texte: INVITE_LIBRE');
    expect(toutes.some((consigne) => consigne.texte === texte)).toBe(true);
  });

  it('le manifeste n’est pas vide — sinon le cas suivant mesurerait un dépôt sans voix', () => {
    // Second contrôle de la mesure, ajouté par N2. Un manifeste vide est un manifeste
    // VALIDE (c'est l'état d'une installation neuve), et `aUnAudio` y rend `false` pour
    // tout. Sans ce cas, un `npm run voix` jamais lancé se lirait comme un contenu fautif,
    // et l'inverse serait tout aussi vrai un jour où l'extracteur casserait.
    expect(
      manifeste.clips.length,
      'aucun clip au manifeste : lancer `npm run voix:preparer` puis `npm run voix`',
    ).toBeGreaterThan(0);
  });

  it('aucune consigne n’existe uniquement à l’écrit', () => {
    const muettes = toutes.filter((c) => !aUnAudio(manifeste, c.cle));
    expect(
      muettes.map((c) => c.cle),
      `${String(toutes.length)} consignes livrées, ${String(
        toutes.length - muettes.length,
      )} audibles`,
    ).toEqual([]);
  });
});
