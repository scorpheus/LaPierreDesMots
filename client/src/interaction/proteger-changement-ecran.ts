/** Un appui commencé dans un exercice ne doit jamais activer le bouton de l'écran suivant. */
export function protegerChangementEcran(documentCible: Document): () => void {
  let origine: string | null = null;
  const ecranDe = (cible: EventTarget | null): string | null => {
    const ecran = cible instanceof Element ? cible.closest('[data-ecran]') : null;
    return ecran === null ? null : `${ecran.getAttribute('data-ecran')}:${ecran.getAttribute('data-noeud') ?? ''}`;
  };
  const commencer = (evenement: PointerEvent): void => { origine = ecranDe(evenement.target); };
  const annuler = (): void => { origine = null; };
  const terminer = (evenement: MouseEvent): void => {
    const depart = origine;
    origine = null;
    // detail=0 désigne notamment le clavier et les technologies d'assistance.
    // Aucun délai anti-double-clic : le prochain geste indépendant est immédiatement libre.
    if (evenement.detail === 0 || depart === null || depart === ecranDe(evenement.target)) return;
    evenement.preventDefault();
    evenement.stopImmediatePropagation();
  };
  documentCible.addEventListener('pointerdown', commencer, true);
  documentCible.addEventListener('pointercancel', annuler, true);
  documentCible.addEventListener('click', terminer, true);
  return () => {
    documentCible.removeEventListener('pointerdown', commencer, true);
    documentCible.removeEventListener('pointercancel', annuler, true);
    documentCible.removeEventListener('click', terminer, true);
  };
}
