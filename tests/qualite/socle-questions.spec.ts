/**
 * Garde du socle — ce qu'on DEMANDE, ce qu'on RÉPOND, et la lecture colorée.
 * Retours du parent T19, E08, E09 (Docs/tableau-retours.md), 9 octobre 2026.
 * Détail : Docs/socle-questions-et-lecture-2026-10-09.md.
 *
 * Trois règles, relevées nœud par nœud sur les 14 moteurs :
 *
 *   Q1  chaque élément « question » (consigne de la barre, repère d'étape, question d'histoire,
 *       notice du chemin, cible du coloriage…) porte le thème question : `data-theme-role`,
 *       fond `--question-fond`, et UNE seule taille de police dans tout l'élément (E08) ;
 *   Q2  aucun élément « réponse » (option, case, carte, étiquette…) ne porte le thème question :
 *       il porte le thème réponse, et son fond n'est jamais celui des questions ;
 *   L1  réglage « coloration syllabique » ALLUMÉ (le défaut de `partage/src/lecture/defauts.ts`) :
 *       tout texte rendu dans la police de lecture est rendu en syllabes colorées.
 *
 * Les éléments sont ÉNUMÉRÉS ici, par moteur, indépendamment du CSS qui les habille : la garde
 * compte les objets qui DEVRAIENT porter la propriété, pas les attributs déjà posés. Un sélecteur
 * qui ne trouve rien sur aucun nœud du moteur fait échouer le cas (une énumération morte ne
 * protège rien).
 */
import { test, expect } from '../harnais-serveur.js';
import { appliquerReglagesLectureReels, choisirLeProfil, deuxImages, noeudsLivres } from '../e2e/qa-outils.js';

const FORMATS = [
  { nom: 'tablette-paysage', largeur: 1280, hauteur: 720 },
  { nom: 'tablette-portrait', largeur: 800, hauteur: 1100 },
] as const;

/** Ce qu'on DEMANDE. Communs : la consigne de la barre et le repère d'étape. */
const QUESTIONS_COMMUNES = ['.barre-consigne [data-consigne]:not([hidden])', '[data-repere-etape]'];

/**
 * ÉCART NOMMÉ, en attente de l'arbitrage du parent : le repère d'étape garde la police
 * d'interface de T10 (« Étape 1 sur 4 », exigée par `RepereEtape.test.tsx`) ; quand sa cible est
 * un mot à déchiffrer (`attrape` : « À attraper : bleu »), ce mot garde le corps de lecture du
 * profil, qui n'est jamais réduit. Deux tailles, donc, dans ce seul cas. Il est COMPTÉ à part.
 */
const EXEMPTION_REPERE_A_LIRE = '[data-repere-etape]:has(.repere-etape__detail--lecture)';
const QUESTIONS: Readonly<Record<string, readonly string[]>> = {
  chemin: ['[data-message-chemin]'],
  colorie: ['[data-cible-colorie]'],
  eclair: ['[data-plateau="eclair"][data-visible="oui"]'],
  grave: ['[data-plateau="etape-grave"]'],
  histoire: ['[data-plateau="etape-histoire"]'],
  phrase: ['[data-plateau="modele"] [data-lecture]'],
  place: ['[data-place-compteur]'],
  trace: ['[data-cible-lettre]', '[data-trait-libelle]'],
  tri: ['.tri-panneau [data-lecture]', '[data-consigne-geste]'],
};

/**
 * Ce qu'on peut RÉPONDRE ou toucher pour répondre. Exemptés nommément : les godets de couleur de
 * `colorie` et `libre` (leur fond EST leur contenu : la couleur choisie) ; `trace` (on trace,
 * aucune réponse posée).
 */
const REPONSES: Readonly<Record<string, readonly string[]>> = {
  assemble: ['button[data-bloc]'],
  attrape: ['button[data-attrapee]'],
  chemin: ['button[data-case]'],
  chrono: ['button[data-vignette]'],
  eclair: ['button[data-option]'],
  grave: ['button[data-lettre]'],
  histoire: ['button[data-option]'],
  paires: ['button[data-carte]'],
  phrase: ['button[data-etiquette]'],
  place: ['button[data-element]'],
  tri: ['button[data-element]'],
};

/** Sélecteurs qui doivent trouver au moins un élément quelque part dans le moteur (pas sur chaque nœud). */
const ATTENDUS_PAR_MOTEUR = (moteur: string): readonly string[] => [
  ...QUESTIONS_COMMUNES.slice(0, 1),
  // eclair : le mot n'est montré qu'à la demande (« Montre-moi le mot »).
  ...(QUESTIONS[moteur] ?? []).filter((s) => !s.includes('data-visible')),
  ...(REPONSES[moteur] ?? []),
];

interface Bilan {
  readonly questions: number;
  readonly questionsAuTheme: number;
  readonly reponses: number;
  readonly reponsesAuThemeQuestion: number;
  readonly reponsesAuThemeReponse: number;
  readonly questionsExemptees: number;
  readonly textesLecture: number;
  readonly textesColores: number;
  readonly ecarts: readonly string[];
  readonly trouves: readonly string[];
}

function relever(arg: { questions: readonly string[]; reponses: readonly string[]; exemption: string }): Bilan {
  const racine = document.querySelector('[data-ecran="noeud"]')!;
  const visible = (e: Element): boolean => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
      && e.closest('[hidden], .sr-only, .lecture-accessible, [aria-hidden="true"][class*="mesure"]') === null;
  };
  const sonde = document.createElement('div');
  sonde.style.backgroundColor = 'var(--question-fond)';
  document.body.appendChild(sonde);
  const fondQuestion = getComputedStyle(sonde).backgroundColor;
  sonde.remove();
  const fondQuestionDefini = fondQuestion !== 'rgba(0, 0, 0, 0)' && fondQuestion !== '';
  const nom = (e: Element): string => `${e.tagName.toLowerCase()}${[...e.attributes].filter((a) => a.name.startsWith('data-')).slice(0, 1).map((a) => `[${a.name}]`).join('')} « ${(e.textContent ?? '').trim().slice(0, 30)} »`;
  const textuels = (e: Element): Element[] => [e, ...e.querySelectorAll('*')]
    .filter((x) => !(x instanceof SVGElement) && [...x.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /[\p{L}\p{N}]/u.test(n.textContent ?? '')))
    .filter(visible);

  const ecarts: string[] = [];
  const trouves = new Set<string>();
  let questions = 0; let questionsAuTheme = 0; let questionsExemptees = 0;
  for (const selecteur of arg.questions) {
    for (const q of racine.querySelectorAll(selecteur)) {
      if (!visible(q)) continue;
      trouves.add(selecteur);
      questions += 1;
      const s = getComputedStyle(q);
      const tailles = [...new Set(textuels(q).map((t) => getComputedStyle(t).fontSize))];
      const fautes: string[] = [];
      if (q.getAttribute('data-theme-role') !== 'question') fautes.push('sans data-theme-role="question"');
      if (!fondQuestionDefini || s.backgroundColor !== fondQuestion) fautes.push(`fond ${s.backgroundColor} ≠ question ${fondQuestion}`);
      const exemptee = tailles.length === 2 && q.matches(arg.exemption);
      if (exemptee) questionsExemptees += 1;
      else if (tailles.length > 1) fautes.push(`${String(tailles.length)} tailles de police (${tailles.join(', ')})`);
      if (fautes.length === 0) questionsAuTheme += 1;
      else ecarts.push(`Q1 ${nom(q)} : ${fautes.join(' ; ')}`);
    }
  }
  let reponses = 0; let reponsesAuThemeQuestion = 0; let reponsesAuThemeReponse = 0;
  for (const selecteur of arg.reponses) {
    for (const r of racine.querySelectorAll(selecteur)) {
      if (!visible(r)) continue;
      trouves.add(selecteur);
      reponses += 1;
      const s = getComputedStyle(r);
      const commeQuestion = r.getAttribute('data-theme-role') === 'question' || s.backgroundColor === fondQuestion
        || r.closest('[data-theme-role="question"]') !== null;
      if (commeQuestion) { reponsesAuThemeQuestion += 1; ecarts.push(`Q2 ${nom(r)} : porte le thème question`); }
      if (r.getAttribute('data-theme-role') === 'reponse') reponsesAuThemeReponse += 1;
      else ecarts.push(`Q2 ${nom(r)} : sans data-theme-role="reponse"`);
    }
  }
  // L1 : texte dans la police de lecture du profil (Andika, réglage réel) ⇒ syllabes colorées.
  const lecture = textuels(racine).filter((t) => /andika/iu.test(getComputedStyle(t).fontFamily.split(',')[0] ?? ''));
  const nonColores = lecture.filter((t) => t.closest('.mot-lecture') === null);
  for (const t of nonColores.slice(0, 6)) ecarts.push(`L1 ${nom(t)} : police de lecture sans coloration syllabique`);
  return {
    questions, questionsAuTheme, reponses, reponsesAuThemeQuestion, reponsesAuThemeReponse, questionsExemptees,
    textesLecture: lecture.length, textesColores: lecture.length - nonColores.length,
    ecarts, trouves: [...trouves],
  };
}

const NOEUDS = noeudsLivres();
const MOTEURS = [...new Set(NOEUDS.map((n) => n.moteur))].sort();

for (const format of FORMATS) {
  for (const moteur of MOTEURS) {
    test(`questions — ${moteur} — ${format.nom}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: format.largeur, height: format.hauteur });
      await page.goto('/');
      // Réglages réels de la tablette, coloration syllabique au DÉFAUT du jeu (allumée).
      await appliquerReglagesLectureReels(page, 'Questions', { colorationSyllabique: true });
      await choisirLeProfil(page, 'Questions');

      const ecarts: string[] = [];
      const trouves = new Set<string>();
      const total = { questions: 0, questionsAuTheme: 0, questionsExemptees: 0, reponses: 0, reponsesAuThemeQuestion: 0, reponsesAuThemeReponse: 0, textesLecture: 0, textesColores: 0 };
      const questions = [...QUESTIONS_COMMUNES, ...(QUESTIONS[moteur] ?? [])];
      const reponses = REPONSES[moteur] ?? [];
      for (const noeud of NOEUDS.filter((n) => n.moteur === moteur)) {
        await page.evaluate(async (id) =>
          (window as unknown as { __test: { allerAuNoeud(i: string): Promise<void> } }).__test.allerAuNoeud(id), noeud.id);
        await expect(page.locator(`[data-ecran="noeud"][data-noeud="${noeud.id}"]`)).toHaveAttribute('data-test-pret', 'oui');
        await page.evaluate(async () => document.fonts.ready);
        await deuxImages(page);
        const b = await page.evaluate(relever, { questions, reponses, exemption: EXEMPTION_REPERE_A_LIRE });
        for (const cle of Object.keys(total) as (keyof typeof total)[]) total[cle] += b[cle];
        for (const t of b.trouves) trouves.add(t);
        for (const e of b.ecarts) ecarts.push(`${noeud.id} · ${e}`);
      }
      for (const attendu of ATTENDUS_PAR_MOTEUR(moteur)) {
        if (!trouves.has(attendu)) ecarts.push(`énumération morte : « ${attendu} » ne trouve rien sur ${moteur}`);
      }
      // Le bilan chiffré, lu par le rapport (contrat de sortie du lot). Il engage : un balayage
      // qui n'aurait relevé ni consigne ni texte à lire serait vert sans avoir rien mesuré.
      console.log(`BILAN ${moteur} ${format.nom} : ${String(total.questions)} consignes, ${String(total.textesColores)} textes colorés sur ${String(total.textesLecture)}`);
      expect(ecarts, `thème question / réponse et lecture colorée (${moteur}, ${format.nom})`).toEqual([]);
      expect(total.questions, `le balayage relève au moins une consigne (${moteur}, ${format.nom})`).toBeGreaterThan(0);
      expect(total.textesLecture, `le balayage relève au moins un texte de lecture (${moteur}, ${format.nom})`).toBeGreaterThan(0);
      // Coloration syllabique allumée dans ce cas : elle porte sur chaque texte de lecture relevé.
      expect(total.textesColores, `textes colorés parmi les textes de lecture (${moteur}, ${format.nom})`).toBe(total.textesLecture);
    });
  }
}
