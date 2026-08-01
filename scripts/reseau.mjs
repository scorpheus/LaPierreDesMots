// Détection de l'adresse LAN, contrôle de la règle de pare-feu, QR de console.
// Contrat technique v1 § 1.1 · lot L-A.
//
// Ce module ne fait AUCUN effet de bord au chargement : `scripts/demarrer.mjs` l'importe et
// choisit ce qu'il en fait. Il est volontairement dépourvu de dépendance obligatoire.

import { networkInterfaces } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executer = promisify(execFile);

/** Port par défaut du serveur — contrat § 0, « Ports ». */
export const PORT_PAR_DEFAUT = 8080;

/** Nom de la règle de pare-feu que le dépôt pose (ou demande de poser). */
export const NOM_REGLE_PAREFEU = 'La Pierre des Mots (HTTP)';

// ---------------------------------------------------------------- adresses

/**
 * Rang de préférence d'une IPv4 privée. Plus petit = meilleur.
 * Une box domestique distribue du 192.168.x.x ; le 172.17+ est presque toujours un pont
 * Docker, et la tablette ne le joindra jamais — d'où son rang volontairement mauvais.
 * @param {string} adresse
 * @returns {number}
 */
function rangDePreference(adresse) {
  if (adresse.startsWith('192.168.')) return 0;
  if (adresse.startsWith('10.')) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(adresse)) {
    // 172.17.0.0/16 et 172.18+ sont les réseaux par défaut de Docker sur cette machine.
    return adresse.startsWith('172.16.') ? 2 : 8;
  }
  if (adresse.startsWith('169.254.')) return 9; // auto-configuration : pas de réseau, en fait
  return 5;
}

/**
 * Toutes les adresses IPv4 non internes de la machine, triées de la plus utile à la moins utile.
 * @returns {{ adresse: string, interface: string, rang: number }[]}
 */
export function adressesLan() {
  const interfaces = networkInterfaces();
  /** @type {{ adresse: string, interface: string, rang: number }[]} */
  const trouvees = [];

  for (const [nom, entrees] of Object.entries(interfaces)) {
    for (const entree of entrees ?? []) {
      if (entree.family !== 'IPv4' || entree.internal) continue;
      trouvees.push({ adresse: entree.address, interface: nom, rang: rangDePreference(entree.address) });
    }
  }

  return trouvees.sort((a, b) => a.rang - b.rang || a.adresse.localeCompare(b.adresse));
}

/**
 * L'adresse que la tablette doit viser, ou `null` si la machine n'est sur aucun réseau.
 * @returns {string | null}
 */
export function adresseLanPreferee() {
  const [meilleure] = adressesLan();
  return meilleure ? meilleure.adresse : null;
}

/**
 * @param {number} port
 * @returns {{ locale: string, lan: string | null }}
 */
export function urlsDeService(port) {
  const lan = adresseLanPreferee();
  return {
    locale: `http://localhost:${port}`,
    lan: lan ? `http://${lan}:${port}` : null
  };
}

// ---------------------------------------------------------------- pare-feu

/**
 * Vérifie — SANS RIEN MODIFIER — que le pare-feu Windows laisse passer le port sur le profil
 * privé, et rend la commande exacte à exécuter si ce n'est pas le cas.
 *
 * Pourquoi ne rien modifier : ajouter une règle de pare-feu demande des droits
 * d'administrateur. Le faire d'autorité échouerait silencieusement dans une console
 * ordinaire, et le symptôme — « la tablette ne voit rien » — n'aurait plus aucun rapport
 * visible avec la cause. On préfère afficher la ligne à copier.
 *
 * @param {number} port
 * @returns {Promise<{ presente: boolean, applicable: boolean, commande: string, detail: string }>}
 */
export async function verifierRegleParefeu(port) {
  const commande =
    `netsh advfirewall firewall add rule name="${NOM_REGLE_PAREFEU}" ` +
    `dir=in action=allow protocol=TCP localport=${port} profile=private`;

  if (process.platform !== 'win32') {
    return { presente: true, applicable: false, commande, detail: 'Hors Windows : rien à vérifier.' };
  }

  try {
    const { stdout } = await executer(
      'netsh',
      ['advfirewall', 'firewall', 'show', 'rule', `name=${NOM_REGLE_PAREFEU}`],
      { windowsHide: true, timeout: 10_000 }
    );
    const presente = /localport|Port local/i.test(stdout);
    return {
      presente,
      applicable: true,
      commande,
      detail: presente ? 'Règle présente.' : 'Règle absente.'
    };
  } catch {
    // `netsh` sort en code 1 quand la règle n'existe pas — ce n'est pas une panne.
    return { presente: false, applicable: true, commande, detail: 'Règle absente.' };
  }
}

// ---------------------------------------------------------------- QR de console

/**
 * Affiche un QR de l'URL dans la console, pour que la tablette n'ait rien à taper.
 *
 * Le module `qrcode-terminal` est chargé DYNAMIQUEMENT et son absence n'est pas une erreur :
 * l'URL reste affichée en clair et le lancement continue. C'est un confort, jamais un
 * prérequis pour que l'enfant puisse jouer.
 *
 * @param {string} url
 * @returns {Promise<boolean>} vrai si le QR a pu être dessiné
 */
export async function afficherQr(url) {
  try {
    const module = await import('qrcode-terminal');
    const qr = module.default ?? module;
    await new Promise((resoudre) => {
      qr.generate(url, { small: true }, (rendu) => {
        process.stdout.write(`\n${rendu}\n`);
        resoudre(undefined);
      });
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Le bloc d'information affiché au démarrage : URL locale, URL LAN, QR, état du pare-feu.
 * @param {number} port
 * @returns {Promise<void>}
 */
export async function annoncerService(port) {
  const { locale, lan } = urlsDeService(port);

  console.log('');
  console.log('  ┌────────────────────────────────────────────────────────┐');
  console.log('  │  La Pierre des Mots est en ligne                       │');
  console.log('  └────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`    Sur ce PC        ${locale}`);

  if (lan) {
    console.log(`    Sur la tablette  ${lan}`);
    const dessine = await afficherQr(lan);
    if (!dessine) {
      console.log('');
      console.log("    (QR non affiché : le paquet `qrcode-terminal` n'est pas installé.");
      console.log("     Sans conséquence — l'adresse ci-dessus suffit.)");
    }
  } else {
    console.log('');
    console.log("    Aucune adresse LAN détectée : ce PC n'est sur aucun réseau local.");
    console.log('    La tablette ne pourra pas se connecter tant que ce sera le cas.');
  }

  const parefeu = await verifierRegleParefeu(port);
  if (parefeu.applicable && !parefeu.presente) {
    console.log('');
    console.log('    Le pare-feu Windows n’a pas de règle pour ce port.');
    console.log('    Si la tablette n’arrive pas à se connecter, ouvrir une console');
    console.log('    ADMINISTRATEUR et coller cette ligne, une fois pour toutes :');
    console.log('');
    console.log(`      ${parefeu.commande}`);
  }

  console.log('');
  console.log('    Pour arrêter : arreter.bat, ou Ctrl+C dans cette fenêtre.');
  console.log('');
}
