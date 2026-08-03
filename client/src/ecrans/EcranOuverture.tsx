// La séquence d'ouverture — D35, lot N4.
//
// « Sans le récit qui la précède, "le monde t'attend en gris" énonce une PERTE. Avec lui, elle
// énonce une MISSION. C'est exactement le même fait, retourné de l'absence vers le pouvoir
// d'agir. » Cet écran est ce récit.
//
// ══════════════════════════════════════════════════════════════════════════════════════════
// QUATRE RÈGLES, ET LA PREMIÈRE EST LA PLUS IMPORTANTE
//
//  1. **PASSABLE AU TAP DÈS LA PREMIÈRE SECONDE** (D35, point 3). La prise de sortie est dans
//     le DOM au PREMIER RENDU — `passableDesMs` vaut 0 et le mot « dès » est pris au pied de
//     la lettre. Pas de délai de grâce, pas de bouton qui apparaît au bout de trois secondes,
//     pas de première image non interruptible. `tests/composants/EcranOuverture.test.tsx`
//     l'assert à `t = 0` ms, horloge figée, avant tout `act` supplémentaire.
//
//  2. **AUCUN ÉTAT SANS ISSUE** (la règle dure du projet, le pire bug possible ici). La sortie
//     existe dans TOUTES les branches : séquence chargée, séquence en cours de chargement,
//     séquence introuvable, décor manquant. Le père a rencontré une impasse une fois ; aucun
//     écran neuf n'a le droit d'en réintroduire une.
//
//  3. **Le décor s'agite, le texte jamais** (v2 § 9.3). Porté par `TableauOuverture`.
//
//  4. **Rejouable, sans compteur ni condition.** L'écran ne connaît aucun « déjà vu » : il
//     joue, il rend la main. C'est l'appelant qui sait si c'est une première ou un rejeu, et
//     c'est la seule disposition qui rende la séquence rejouable depuis le campement (D35,
//     point 3) sans qu'elle ait à interroger quoi que ce soit.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { PASSABLE_DES_MS, sequenceDuDocument } from '@pierre/partage/ouverture';
import type { SequenceOuverture } from '@pierre/partage/ouverture';

import { urlAsset } from '../api/client.js';
import { useEtatJeu } from '../etat/services.js';
import { TableauOuverture } from '../monde/TableauOuverture.js';

/** Le document de contenu, relatif à `contenu/`. */
const CHEMIN_SEQUENCE = 'monde/ouverture.json';

export interface ProprietesEcranOuverture {
  /**
   * La séquence. Injectée par les tests ; chargée depuis `contenu/monde/ouverture.json` sinon.
   * `null` explicite = « pas encore là », et l'écran reste utilisable (règle 2).
   */
  readonly sequence?: SequenceOuverture | null;
  /**
   * Rend la main. `passee` vaut `true` quand l'enfant a sauté le récit — l'information sert au
   * PARENT (« a-t-il vu l'histoire ? »), jamais à l'enfant, et ne change rien pour lui.
   */
  readonly surFin?: (passee: boolean) => void;
}

export function EcranOuverture({
  sequence: sequenceInjectee = null,
  surFin
}: ProprietesEcranOuverture = {}): ReactElement {
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);

  const [sequence, fixerSequence] = useState<SequenceOuverture | null>(sequenceInjectee);
  const [indice, fixerIndice] = useState(0);
  /** Passé à `true` au premier geste : l'enfant a pris la main, l'automate se tait pour de bon. */
  const [pilotageEnfant, fixerPilotageEnfant] = useState(false);
  /** Garde-fou : `surFin` n'est appelé qu'une fois, même si deux gestes se croisent. */
  const termine = useRef(false);

  useEffect(() => {
    if (sequenceInjectee !== null) {
      fixerSequence(sequenceInjectee);
      return;
    }
    let vivant = true;
    void fetch(urlAsset(CHEMIN_SEQUENCE), { headers: { Accept: 'application/json' } })
      .then(async (reponse) => (reponse.ok ? sequenceDuDocument(await reponse.json()) : null))
      // Une séquence illisible ne bloque rien : l'écran garde sa sortie et rend la main d'un
      // tap. Un récit manquant est une déception ; un écran figé est une impasse.
      .catch(() => null)
      .then((lue) => {
        if (vivant) {
          fixerSequence(lue);
        }
      });
    return () => {
      vivant = false;
    };
  }, [sequenceInjectee]);

  const tableaux = sequence?.tableaux ?? [];
  const dernier = tableaux.length === 0 || indice >= tableaux.length - 1;
  const tableau = tableaux[indice] ?? null;

  const finir = useCallback(
    (passee: boolean): void => {
      if (termine.current) {
        return;
      }
      termine.current = true;
      surFin?.(passee);
    },
    [surFin]
  );

  const avancer = useCallback((): void => {
    fixerPilotageEnfant(true);
    if (dernier) {
      finir(false);
      return;
    }
    fixerIndice((precedent) => precedent + 1);
  }, [dernier, finir]);

  /**
   * ══════════════════════════════════════════════════════════════════════════════════════════
   * R19 — L'ENCHAÎNEMENT AUTOMATIQUE EST RETIRÉ. On avance au tap, jamais au chronomètre.
   *
   * Le père, en jouant : « dans l'histoire de la pierre, il faut enlever le chronomètre parce
   * qu'on n'a pas le temps de lire, ça passe directement. On peut changer de panneau que si on
   * a cliqué. »
   *
   * Mesuré sur `contenu/monde/ouverture.json`, durées déclarées :
   *
   *     6000 · 6000 · 6000 · 6000 · 5000 ms
   *
   * **Six secondes par panneau pour un enfant qui déchiffre** (D14). Le minuteur portait
   * pourtant trois garde-fous justes — il n'enchaînait pas le dernier tableau, il s'arrêtait au
   * premier geste, et « animations calmes » le coupait. Ils ne suffisaient pas : l'enfant qui
   * lit ne fait AUCUN geste, donc aucun garde-fou ne se déclenche, et c'est très exactement lui
   * qu'on voulait protéger.
   *
   * C'est le même raisonnement que R11 sur l'éclair, au même endroit : **une durée n'a de sens
   * que si l'on a fini de lire**, et seul le lecteur sait quand. `dureeMs` reste dans les
   * données — elle décrit le rythme voulu du récit, et servira à une lecture à voix haute — mais
   * elle ne pousse plus personne.
   * ══════════════════════════════════════════════════════════════════════════════════════════
   */

  return (
    <main
      data-ecran="ouverture"
      data-passable-des-ms={String(PASSABLE_DES_MS)}
      data-tableau-courant={tableau === null ? 'aucun' : tableau.code}
      style={{
        minBlockSize: '100dvb',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.75rem'
      }}
    >
      <style>{
        '@keyframes apparition-tableau { from { opacity: 0 } to { opacity: 1 } }'
      }</style>

      <h1 className="titre" style={{ fontSize: '2rem', margin: 0, textAlign: 'center' }}>
        La Pierre des Mots
      </h1>

      {tableau === null ? (
        // Ni écran vide, ni écran d'erreur : on dit ce qui se passe et la porte reste ouverte.
        <p style={{ margin: 0, fontSize: '1.375rem', textAlign: 'center' }}>
          L’histoire arrive. Tu peux déjà partir jouer.
        </p>
      ) : (
        <TableauOuverture
          tableau={tableau}
          rang={indice + 1}
          total={tableaux.length}
          animationsDesactivees={animationsDesactivees}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {/*
          LA PRISE PRINCIPALE. Présente au premier rendu, quelle que soit la branche — y
          compris quand la séquence n'est pas encore là. C'est elle qui fait de `t = 0` une
          propriété vérifiable et non une intention.
        */}
        <button
          type="button"
          className="cible cible-appel"
          data-suite="ouverture"
          aria-label={dernier ? 'Partir jouer' : 'Voir la suite de l’histoire'}
          onClick={avancer}
          style={{ fontSize: '1.375rem', paddingInline: '2rem' }}
        >
          {dernier ? 'On y va !' : 'Et après ?'}
        </button>

        {/*
          R19 — LE RETOUR EN ARRIÈRE, « un tout petit bouton pour revenir en arrière au cas où ».

          Discret et SECONDAIRE : il ne concurrence pas la prise principale. Absent sur le
          premier tableau, parce qu'un bouton qui ne mène nulle part est un bouton qui ment —
          et parce qu'un enfant qui le trouve inerte cesse d'essayer les autres.

          Il marque aussi le pilotage par l'enfant : à partir du moment où il revient en
          arrière, c'est lui qui mène le récit.
        */}
        {indice === 0 ? null : (
          <button
            type="button"
            className="cible cible-secondaire"
            data-retour="ouverture"
            aria-label="Revoir le tableau précédent"
            onClick={() => {
              fixerPilotageEnfant(true);
              fixerIndice((precedent) => Math.max(0, precedent - 1));
            }}
          >
            ← Revoir
          </button>
        )}

        {/*
          LA SORTIE IMMÉDIATE. Elle saute tout le récit, sans condition, sans confirmation,
          sans « es-tu sûr ? ». D46 : aucun écran intermédiaire obligatoire, nulle part.
          Elle disparaît sur le dernier tableau — là, la prise principale fait déjà sortir, et
          deux boutons qui font la même chose ne feraient qu'un choix de plus à trancher.
        */}
        {dernier ? null : (
          <button
            type="button"
            className="cible cible-secondaire"
            data-passer="ouverture"
            aria-label="Passer l’histoire et partir jouer"
            onClick={() => {
              fixerPilotageEnfant(true);
              finir(true);
            }}
          >
            Passer l’histoire
          </button>
        )}
      </div>

      {/*
        Le repère de progression. Des points, jamais un pourcentage ni « 2/5 » : ce n'est pas
        un exercice, rien n'y est évalué, et un compteur inviterait à « finir » un récit.
      */}
      {tableaux.length === 0 ? null : (
        <div
          data-progression-ouverture={String(indice + 1)}
          aria-hidden="true"
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          {tableaux.map((entree, rang) => (
            <span
              key={entree.code}
              style={{
                inlineSize: '0.75rem',
                blockSize: '0.75rem',
                borderRadius: '50%',
                background: rang <= indice ? 'var(--trait)' : 'transparent',
                border: '2px solid var(--trait)'
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
