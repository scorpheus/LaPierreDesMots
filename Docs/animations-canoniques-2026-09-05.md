# Animations canoniques proposées pour les quatre compagnons

Date : 5 septembre 2026.

## Statut

Les quatre atlas décrits ici sont des **brouillons à faire valider par le parent**. Ils ne sont ni
publiés dans `contenu/assets/compagnons/animations/`, ni raccordés au composant, ni inscrits dans
`production/assets.lock.json`. Aucun portrait validé, fichier applicatif, verrou de production ou
référence visuelle n'a été modifié.

## Références figées

La génération est repartie séparément de chaque portrait publié, avec la planche validée comme
seconde référence d'identité. Les empreintes ci-dessous portent sur les pixels RGBA décodés, pas
sur les conteneurs PNG :

| Référence | SHA-256 des pixels |
|---|---|
| `contenu/assets/compagnons/filou.png` | `CD87961EDB6C37C479CB5EA91C8BA2D4FAAFE3BE9969F528A735D2AC18B18961` |
| `contenu/assets/compagnons/bulle.png` | `A19CD952912D833BB1AE3EC33E8643077C0C7DB92B6DE4C61248E79941C698F3` |
| `contenu/assets/compagnons/roc.png` | `7BCF9A9659D44E6838792DE6781F8185F5EFB8252649A071AEE09B9767FD5108` |
| `contenu/assets/compagnons/plume.png` | `B40E79DD6425D319650EB3C55194A97C25796B51AF4089BE0906D0135018F90B` |
| `production/personnages/reference-compagnons-validee-2026-09-04.png` | `8618B80014B463B0CA63654B0853C91EAA6CB33C5AB6B83B276C8A171980C9E3` |

L'empreinte de fichier de la planche de référence reste celle déjà consignée :
`F34CD33DB577EBC084D7DA612C65800A853F7926B17AA9930E6B66136C9F7AC8`.

## Méthode

- Outil : générateur d'images intégré de Codex, mode d'édition avec préservation d'identité ;
  aucune API CLI et aucun workflow ComfyUI.
- Une génération initiale indépendante par compagnon, toujours depuis le portrait canonique et la
  planche validée ; aucune sortie retenue ne descend d'une autre sortie générée.
- Cycle demandé : huit étapes calmes en grille `4 × 2`, respiration discrète, fermeture puis
  réouverture des yeux, proportions et ancre constantes.
- Normalisation : `scripts/sprites/normaliser-planche.mjs`, cellules `256 × 256`, marge de 12 px,
  ancre `bas-centre`.
- Les sorties initiales de Filou, Roc et Plume avaient déjà un vrai canal alpha. Pour les préserver,
  le normaliseur a été appelé avec `--fond #000000 --seuil-fond 0 --plume 1` : le noir n'est pas
  retiré comme fond, il fournit seulement au normaliseur la couleur de décontamination exigée quand
  les quatre coins sont entièrement transparents.
- La sortie initiale de Bulle contenait un damier clair réellement rasterisé. Le réglage par défaut
  du normaliseur (`fond #fbfbfb`, seuil 32, plume 32) l'a retiré proprement.

Des passes correctives uniques ont été essayées pour remplacer les fonds affichés par une vraie
transparence. Elles ont rasterisé un damier RGB au lieu de produire un alpha réel ; la correction
de Plume n'a pas retiré le contour de cils ajouté. Ces quatre résultats ont donc été **écartés**.
Ce constat est conservé pour ne pas répéter cette passe improductive. Les atlas retenus proviennent
exclusivement des quatre générations initiales.

## Livrables

| Compagnon | Atlas brouillon | Contact à regarder | Rapport mécanique | Brut retenu |
|---|---|---|---|---|
| Filou | `contenu/brouillons/sprites-compagnons-2026-09-05/filou-8.png` | `bac-a-sable/sprites-compagnons-2026-09-05/filou-contact.png` | `bac-a-sable/sprites-compagnons-2026-09-05/filou-qa.json` | `bac-a-sable/sprites-compagnons-2026-09-05/filou-brut.png` |
| Bulle | `contenu/brouillons/sprites-compagnons-2026-09-05/bulle-8.png` | `bac-a-sable/sprites-compagnons-2026-09-05/bulle-contact.png` | `bac-a-sable/sprites-compagnons-2026-09-05/bulle-qa.json` | `bac-a-sable/sprites-compagnons-2026-09-05/bulle-brut.png` |
| Roc | `contenu/brouillons/sprites-compagnons-2026-09-05/roc-8.png` | `bac-a-sable/sprites-compagnons-2026-09-05/roc-contact.png` | `bac-a-sable/sprites-compagnons-2026-09-05/roc-qa.json` | `bac-a-sable/sprites-compagnons-2026-09-05/roc-brut.png` |
| Plume | `contenu/brouillons/sprites-compagnons-2026-09-05/plume-8.png` | `bac-a-sable/sprites-compagnons-2026-09-05/plume-contact.png` | `bac-a-sable/sprites-compagnons-2026-09-05/plume-qa.json` | `bac-a-sable/sprites-compagnons-2026-09-05/plume-brut.png` |

L'aperçu local `bac-a-sable/sprites-compagnons-2026-09-05/validation.html` compare chaque portrait
approuvé avec son atlas animé et offre une pause. Il lit directement les huit cellules sans
générer de nouveaux pixels, GIF ou WebP. Les contacts permettent d'inspecter les poses séparément.

Un enregistrement de cette page est également disponible pour la validation à distance :
`bac-a-sable/sprites-compagnons-2026-09-05/validation-animee.webm` et sa capture `validation.png`.
Le script `capturer-validation.mjs` attend le décodage des quatre portraits et des quatre atlas,
deux cycles complets puis vérifie la commande de pause. C'est une preuve de lecture de l'aperçu,
pas une approbation d'identité des nouvelles poses ni leur intégration au jeu.

## Mesures de normalisation

Les quatre rapports déclarent `ok: true`, huit cellules non vides, zéro avertissement et zéro
débordement. Chaque atlas mesure `1024 × 512` px.

| Compagnon | Échelle commune | Ratio largeur source | Ratio hauteur source | Écart-type ancre X | Écart-type ancre Y | Écart raster maximal |
|---|---:|---:|---:|---:|---:|---:|
| Filou | 0,493617 | 1,0294 | 1,0173 | 0,242061 px | 0 px | 0,5 px |
| Bulle | 0,565854 | 1,0441 | 1,0406 | 0,242061 px | 0 px | 0,5 px |
| Roc | 0,504348 | 1,0060 | 1,0155 | 0,165359 px | 0 px | 0,5 px |
| Plume | 0,482328 | 1,0472 | 1,0737 | 0,242061 px | 0 px | 0,5 px |

Empreintes des pixels des bruts retenus et des atlas normalisés :

| Compagnon | Brut retenu | Atlas normalisé |
|---|---|---|
| Filou | `07057352D2B46D1959FEB530AB1B621AECE46C790A82E3498536BC651340FEE1` | `813771CB0E2C319CB9C45F2375185585430E1FA4D7273D07E453AED2D38F08D5` |
| Bulle | `0C1B88F7A273FA27330ED8CF42905FD4328720AC80C8CA5875CE3FB656922FC3` | `F03AF220DB71B40B170167FF918BBC3B84AD3F1EAE0A09A95894020429412B1C` |
| Roc | `47A27831E9FBFDD4C1AEED13F17E73664A2043DA4745E094B98536CEE02B7A38` | `5C864C0CBB4561F838C9B905680AE6F8908F79B98F585CB57ED42EF42EB14D32` |
| Plume | `A6AB84EFEB444F80CC290F3394A0DEB3A8FE800A3ECFFED5CA4E8D70CB02FA3C` | `3A15D2ABD7735B7D8EAE1E670CD36FF12C032EAE9BD9FCE88C656A60AD624C9C` |

## Contrôle artistique et limite connue

- Filou garde le fennec doré, l'écharpe turquoise, la loupe et la sacoche ; le mouvement est surtout
  porté par les paupières, avec une variation très faible de la queue et du buste.
- Bulle reste nettement féminine, avec ses cheveux d'eau et son livre bleu ; aucune version masculine
  ou sans livre n'a été retenue.
- Roc conserve la stratification rocheuse, la mousse, les petites plantes et la sacoche ; le volume
  est stable.
- Plume garde le plumage bleu et crème, les serres attachées, l'aile levée et la sacoche. **Limite à
  soumettre explicitement au parent : le contour supérieur des yeux et les états mi-clos restent
  plus proches de cils/mascara que dans le portrait canonique.** La passe corrective n'a pas réduit
  cet écart. La planche est techniquement saine mais ne doit pas être publiée sans décision humaine.

Les quatre cycles sont modestes, proches d'une animation de clignement avec respiration suggérée ;
ils ne prouvent pas à eux seuls la fluidité en lecture temporelle. Le parent doit juger les contacts,
en particulier Plume, avant toute copie vers les assets publiés.

## Prompts retenus

### Filou

```text
Cas d’usage : identity-preserve.
Type d’asset : atlas de sprites 4 × 2 pour une animation calme de personnage de jeu enfant.
Images d’entrée : image 1 = cible canonique exacte de Filou ; image 2 = référence validée de l’ensemble, Filou est en haut à gauche.
Demande principale : produire exactement huit vues plein pied de CE MÊME Filou, arrangées en grille régulière de 4 colonnes × 2 lignes, ordre de lecture gauche à droite puis haut en bas. Les huit cellules forment les huit étapes d’une boucle très discrète : respiration douce et un clignement naturel qui se ferme puis se rouvre ; posture debout presque fixe, pieds au même niveau, même cadrage et même échelle. Très léger mouvement secondaire cohérent de la queue et de l’écharpe uniquement.
Sujet invariant : fennec doré enfantin, mêmes traits du visage, mêmes très grandes oreilles, même fourrure, même écharpe turquoise, même sacoche brune portée en bandoulière, même loupe tenue dans la même main. Conserver exactement sa silhouette, ses proportions, sa palette, son rendu illustré détaillé et chaleureux.
Composition : chaque vue isolée, entière, centrée dans sa cellule, sans chevauchement ; marges généreuses ; ancre bas-centre identique.
Fond : véritable transparence alpha uniforme autour de chaque vue.
Contraintes : ne changer que les micro-mouvements du cycle ; ne pas redessiner ni réinterpréter le personnage ; garder la loupe et la sacoche présentes et intactes dans les huit cellules ; exactement un Filou par cellule ; aucune ligne de grille, aucun texte, aucun numéro, aucun décor, aucune ombre portée, aucun objet ajouté, aucun membre supplémentaire, aucune coupe du corps, aucun filigrane.
```

Sortie intégrée retenue : `exec-680dfcd2-6002-45d7-a658-fca427b7317b.png`.

### Bulle

```text
Cas d’usage : identity-preserve.
Type d’asset : atlas de sprites 4 × 2 pour une animation calme de personnage de jeu enfant.
Images d’entrée : image 1 = cible canonique exacte de Bulle ; image 2 = référence validée de l’ensemble, Bulle est en haut à droite.
Demande principale : produire exactement huit vues plein pied de CETTE MÊME Bulle, arrangées en grille régulière de 4 colonnes × 2 lignes, ordre de lecture gauche à droite puis haut en bas. Les huit cellules forment les huit étapes d’une boucle très discrète : respiration douce et un clignement naturel qui se ferme puis se rouvre ; posture presque fixe, base au même niveau, même cadrage et même échelle. Très léger mouvement secondaire cohérent des pointes de ses cheveux d’eau uniquement.
Sujet invariant : jeune personnage d’eau clairement féminin, mêmes traits féminins, mêmes longs cheveux entièrement faits d’eau turquoise avec bulles et boucles liquides, même corps liquide, même grand livre bleu foncé ouvert aux ornements dorés tenu à deux mains. Conserver exactement son visage, sa silhouette, ses proportions, sa palette, son rendu illustré détaillé et chaleureux.
Composition : chaque vue isolée, entière, centrée dans sa cellule, sans chevauchement ; marges généreuses ; ancre bas-centre identique.
Fond : véritable transparence alpha uniforme autour de chaque vue.
Contraintes : ne changer que les micro-mouvements du cycle ; ne pas redessiner ni réinterpréter le personnage ; garder le livre ouvert, lisible comme objet et intact dans les huit cellules ; exactement une Bulle par cellule ; aucune ligne de grille, aucun texte, aucun numéro, aucun décor, aucune ombre portée, aucun objet ajouté, aucun membre supplémentaire, aucune coupe du corps, aucun filigrane.
```

Sortie intégrée retenue : `exec-08e77989-f5a3-4745-93dd-4853828b2d8c.png`.

### Roc

```text
Cas d’usage : identity-preserve.
Type d’asset : atlas de sprites 4 × 2 pour une animation calme de personnage de jeu enfant.
Images d’entrée : image 1 = cible canonique exacte de Roc ; image 2 = référence validée de l’ensemble, Roc est en bas à gauche.
Demande principale : produire exactement huit vues plein pied de CE MÊME Roc, arrangées en grille régulière de 4 colonnes × 2 lignes, ordre de lecture gauche à droite puis haut en bas. Les huit cellules forment les huit étapes d’une boucle très discrète : respiration douce et un clignement naturel qui se ferme puis se rouvre ; posture debout presque fixe, pieds au même niveau, même cadrage et même échelle. Très léger mouvement secondaire cohérent des petites feuilles et de la mousse uniquement.
Sujet invariant : gardien de pierre gris chaleureux, mêmes traits doux, même spirale gravée sur le front, mêmes blocs rocheux et stratification, même mousse verte et mêmes petites plantes clairement visibles sur la tête et les épaules, mêmes bretelles de cuir, même ceinture de corde et même sacoche verte portée à la hanche. Conserver exactement son visage, sa silhouette trapue, ses proportions, sa palette, son rendu illustré détaillé et chaleureux.
Composition : chaque vue isolée, entière, centrée dans sa cellule, sans chevauchement ; marges généreuses ; ancre bas-centre identique.
Fond : véritable transparence alpha uniforme autour de chaque vue.
Contraintes : ne changer que les micro-mouvements du cycle ; ne pas redessiner ni réinterpréter le personnage ; conserver mousse, plantes, stratification rocheuse et sacoche dans les huit cellules ; exactement un Roc par cellule ; aucune ligne de grille, aucun texte, aucun numéro, aucun décor, aucune ombre portée, aucun objet ajouté, aucun membre supplémentaire, aucune coupe du corps, aucun filigrane.
```

Sortie intégrée retenue : `exec-d84512e5-21f2-4cec-9357-5c17ae0939b0.png`.

### Plume

```text
Cas d’usage : identity-preserve.
Type d’asset : atlas de sprites 4 × 2 pour une animation calme de personnage de jeu enfant.
Images d’entrée : image 1 = cible canonique exacte de Plume ; image 2 = référence validée de l’ensemble, Plume est en bas à droite.
Demande principale : produire exactement huit vues plein pied de CE MÊME Plume, arrangées en grille régulière de 4 colonnes × 2 lignes, ordre de lecture gauche à droite puis haut en bas. Les huit cellules forment les huit étapes d’une boucle très discrète : respiration douce et un clignement naturel qui se ferme puis se rouvre ; posture debout presque fixe, serres au même niveau, même cadrage et même échelle. Très léger mouvement secondaire cohérent des plumes de huppe, de la queue et de l’aile levée uniquement.
Sujet invariant : jeune oiseau messager bleu et crème, mêmes traits doux, même bec doré, même ventre crème, même plumage bleu, même huppe, une aile droite levée dans le même geste amical, même sacoche brune en bandoulière. Conserver exactement son visage, sa silhouette, ses proportions, sa palette, son rendu illustré détaillé et chaleureux.
Composition : chaque vue isolée, entière jusqu’au bout de toutes les serres, centrée dans sa cellule, sans chevauchement ; marges généreuses ; ancre bas-centre identique.
Fond : véritable transparence alpha uniforme autour de chaque vue.
Contraintes : ne changer que les micro-mouvements du cycle ; ne pas redessiner ni réinterpréter le personnage ; garder anatomie, serres attachées, aile levée et sacoche intactes dans les huit cellules ; exactement une Plume par cellule ; aucune ligne de grille, aucun texte, aucun numéro, aucun décor, aucune ombre portée, aucun objet ajouté, aucun membre supplémentaire, aucune patte ni serre détachée, aucune coupe du corps, aucun filigrane.
```

Sortie intégrée retenue : `exec-bc8ff3fb-ef5b-4a3f-a052-b8c2c8e4b9b5.png`.

## Décision parent restante

Le parent doit approuver ou refuser séparément Filou, Bulle, Roc et Plume. En cas d'approbation,
le lot d'intégration ultérieur pourra copier uniquement les atlas acceptés vers le dossier publié,
ajouter leur provenance au verrou de production et les vérifier en situation. La présente campagne
ne préjuge pas de cette décision.
