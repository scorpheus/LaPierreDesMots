// Configuration Capacitor — Lot 5 du portage Android (Docs/addendum-portage-android.md § 6).
//
// `webDir: 'dist-autonome'` pointe sur la sortie de `vite build --mode autonome` (jamais
// `dist/`, qui est le bundle LAN et ne contient ni le contenu embarqué ni `port-local.js`).
//
// `appId` : provisoire. « La Pierre des Mots » est un titre de travail (CLAUDE.md, « Ce qui
// reste à trancher », point 1 — il devrait venir de l'enfant) ; l'identifiant de paquet Android
// suit le même statut et se renommera avec le titre final. Le renommer après publication sur un
// store casserait la continuité des mises à jour — mais ce dépôt ne publie pas sur un store
// (installation manuelle de l'APK, D9 : le dépôt est auto-contenu), donc rien n'est figé par ce
// choix.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lapierredesmots.app',
  appName: 'La Pierre des Mots',
  webDir: 'dist-autonome',
  android: {
    // Pas de mise à niveau HTTPS forcée : l'app est locale, aucune requête réseau ne part
    // jamais en mode autonome (contrat § 1, § 5).
    allowMixedContent: false
  }
};

export default config;
