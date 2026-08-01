# Fiche de personnage — Gobi

**Statut** proposition, soumise à validation (décision D7 : aucun design de personnage n'est figé
sans accord explicite)
**Amende** la v2 § 4.2, dont le design « boule ronde à deux yeux, pas de bras » est abandonné (D20)

---

## 1. Les principes, pas les modèles

L'utilisateur a donné trois références : **Baymax**, **le Boursouf de Hogwarts Legacy**, et **les
cristaux**, que l'enfant adore. Conformément à l'annexe P § 3.3, elles ne sont **jamais nommées dans
un prompt** ni visées comme cible visuelle. Voici ce qu'on en extrait, et qui seul fait foi :

| Principe extrait | Ce qu'il impose au dessin |
|---|---|
| **Silhouette d'un seul tenant** | Reconnaissable en ombre chinoise pleine. Test de rejet : si la silhouette noire ne se distingue pas d'une autre créature, le design est raté |
| **Aucun angle agressif sur le corps** | Le corps est fait d'arcs. Toute pointe appartient au cristal, jamais à la chair |
| **La matière se devine à l'œil** | On doit avoir envie de le toucher. Le pelage se lit au contour, pas à la texture — contrainte du trait noir |
| **Contraste doux / dur** | C'est l'idée centrale : une boule tendre d'où sort une matière dure et facettée. C'est ce contraste qui le rend mémorable |
| **Héros, pas mascotte** | Les specs le disent : « à 7 ans, on veut être un héros, pas un élève mignon ». Il est attachant, il n'est pas bébé |

## 2. Le personnage

**Gobi** est une petite créature ronde, de la taille d'un ballon, couverte d'un pelage **très court
et dense** — un velours. De son dos et de sa tête émergent des **cristaux** qui poussent comme une
crête.

| Élément | Description | Rôle |
|---|---|---|
| **Corps** | Une sphère légèrement aplatie à la base, contour continu, sans cou | La silhouette |
| **Pattes** | Deux, petites, rondes, sans articulation visible. Il se déplace par bonds | Mobilité lisible |
| **Bras** | Aucun (conservé de la v2 § 4.2) | Simplifie l'animation et les 25 déclinaisons |
| **Yeux** | Deux, grands, ronds, très écartés. Une paupière lourde qui porte toute l'expression | Le registre émotionnel |
| **Bouche** | Large, discrète au repos, capable de s'ouvrir **plus grand que sa tête** | C'est son talent : il **gobe** les syllabes |
| **Crête de cristaux** | 3 à 7 cristaux sur le dos et le crâne, de tailles inégales | **Porte les 25 déclinaisons** |
| **Cœur de Pierre** | Un éclat visible en transparence au centre du corps, qui pulse lentement | Le lien narratif à la Pierre brisée |

## 3. Pourquoi le cristal porte les déclinaisons

Chaque graphème maîtrisé donne une **forme de Gobi** (v2 § 4.2). À 25 graphèmes, c'est 25 variantes
à produire de façon cohérente — et c'est là que la plupart des designs de mascotte s'effondrent.

**La règle qui rend la série possible : le corps ne change jamais, seul le cristal change.**

| Forme | Ce que devient le cristal |
|---|---|
| Gobi-**OU** | Cristaux arrondis, en grappe de bulles ; il souffle des bulles |
| Gobi-**CH** | Cristaux effilés couchés vers l'arrière, comme une crinière au vent |
| Gobi-**EAU** | Cristaux translucides et ondulants, comme figés en pleine coulée |
| Gobi-**AN** | Cristaux creux qui résonnent |
| Gobi-**ILL** | Cristaux fins et nombreux, en éventail |

Trois bénéfices : la production reste cohérente (un seul corps de référence), la collection est
**lisible d'un coup d'œil** dans le coffre, et l'enfant comprend sans explication que **ce qu'il
apprend transforme son compagnon**.

## 4. Expressions et états d'animation

Cinq états (addendum § A.2), tous portés par **les paupières, la bouche et l'inclinaison des
cristaux** — jamais par une déformation du corps, qui doit rester constant :

| État | Traits |
|---|---|
| **Repos** | Respiration lente, cristaux immobiles, cœur qui pulse |
| **Joie** | Yeux plissés en arcs, petit bond, cristaux qui s'écartent et scintillent |
| **Aide** | Se penche en avant, bouche entrouverte, un cristal s'illumine — celui du graphème concerné |
| **Hésitation** | Paupières hautes, cristaux qui se rabattent, léger recul |
| **Apparition** | Se matérialise depuis un éclat de lumière, cristaux d'abord, corps ensuite |

## 5. Contraintes de production

- **Trait noir sur blanc uniquement.** La couleur vient du code (annexe P § 2). Le pelage, le
  cristal et le cœur sont des **régions fermées distinctes**, coloriables séparément.
- **Lisible à 96 px de haut** : c'est sa taille la plus fréquente à l'écran, en accompagnement d'un
  mini-jeu.
- **Contour 3 à 5 px** à l'échelle de référence, jeton `--trait` (v2 § 9.2).
- **Le cœur de Pierre est le seul élément lumineux** : il ne doit jamais y avoir deux sources
  d'attention sur le personnage.
- Aucun texte, aucun symbole alphabétique **sur** le corps : Gobi n'est pas un support de lecture,
  il est le compagnon de lecture.

## 6. Ce qui reste à valider

1. **Le pelage** — velours court comme décrit, ou surface lisse et mate ? Le premier est plus
   chaleureux, le second plus facile à décliner proprement en trait.
2. **La densité de cristaux au départ** : Gobi commence-t-il nu — et gagne sa première crête au
   premier graphème, ce qui rend la progression très lisible — ou avec un cristal d'origine ?
3. **La proportion yeux / corps**, qui décide à elle seule du registre : plus les yeux sont grands,
   plus il glisse vers le mignon et s'éloigne du héros.
