# Clôture des retours enfants du 9 septembre

Les annonces de récompense et les cadeaux de région ouvrent une fenêtre consultable.
Le décor des syllabes reste stable après un refus et le fond opaque du tri des grenouilles
est masqué lorsque son illustration est chargée. Les compteurs et corrections antérieures
de progression et de tracé sont conservés.

Le centrage explicite des fenêtres et la composition compacte en faible hauteur sont
construits et servis localement sur le port 8080. Vérification Chromium : quatre fenêtres
sur six formats, de 360 × 640 à 1920 × 1080, incluant téléphone en paysage ; centrage,
dimensions contenues, absence de débordement horizontal et fermeture passent. Échap,
clic extérieur, retour du focus, image réellement décodée et absence d'écriture sont vérifiés.
Scripts sous `bac-a-sable/corrections-2026-09-09/verifier-fenetres*.mjs`.

Tests ciblés réussis : fenêtres de cadeaux et simulation, fond opaque et restauration,
deux parcours de syllabes stables, deux parcours tactiles complets du tri. Le contrôle
de navigation a détecté l'absence d'accès à la simulation depuis l'interface ; l'accès local
depuis le dashboard parent corrige le défaut et les 19 contrôles de navigation passent.

La campagne `npm run verifier` a été lancée puis interrompue à la demande de clôture
du parent pour limiter le temps et les tokens. Son résultat est incomplet : aucune
certification générale verte. Son passage unitaire avait détecté le défaut de navigation
ensuite corrigé et retesté. Les écarts visuels historiques ne sont pas réacceptés et aucune
référence n'est mise à jour. Le test navigateur dédié `parcours-tri-decor.spec.ts` reste
à confirmer dans une prochaine campagne ; les contrôles ciblés ci-dessus sont distincts.

Aucun commit ni publication distante. Serveur local conservé pour le test du parent.
