# SmartGraph — Direction Design

## Contexte produit

SmartGraph est un outil de modélisation économique par description naturelle. L'utilisateur décrit son activité en quelques phrases, l'IA génère un graphe de dépendances avec variables, formules et scénarios. Le résultat est un modèle financier interactif exportable en Excel.

L'outil s'adresse à des entrepreneurs, consultants, gérants de PME, freelances et investisseurs — des personnes qui maîtrisent leur métier mais qui n'ont pas envie de passer des heures sur des tableurs.

---

## Inspiration principale

### Gemini CLI / Claude Code — l'esthétique des outils sérieux

L'inspiration vient des interfaces CLI de nouvelle génération : Gemini CLI, Claude Code, Warp Terminal. Ces outils ont réhabilité le terminal non pas comme interface technique froide, mais comme surface de travail précise et élégante.

Ce qui nous intéresse dans cet univers :
- Le fond sombre quasi-noir, qui concentre l'attention sur le contenu
- L'usage de caractères mono pour tout ce qui est chiffre ou donnée
- Un seul geste chromatique fort — un gradient — appliqué avec parcimonie sur les éléments les plus importants
- Le reste est silence : pas de couleurs partout, pas de dégradés en arrière-plan, pas de blobs

Nous n'appliquons pas cet univers au pied de la lettre. SmartGraph n'est pas un terminal. Nous prenons la philosophie : **une extravagance, tout le reste épuré**.

### Linear / Vercel — la lisibilité d'un outil professionnel

Pour la structure et les composants : Linear et Vercel. Des cards propres avec des bordures fines à peine visibles, une hiérarchie typographique claire, des interactions légères qui donnent du feedback sans attirer l'attention.

---

## Palette

Fond de page : quasi-noir, légèrement teinté (pas le noir absolu, qui est agressif). Toutes les sections partagent ce fond ou une variation très proche — l'œil ne tressaille pas en scrollant.

Cards et panneaux : un gris très sombre, légèrement plus clair que le fond. La distinction fond/card se perçoit mais ne se crie pas.

Bordures : presque invisibles. Juste assez pour définir les espaces.

Texte : trois niveaux. Blanc cassé pour ce qui compte vraiment. Gris moyen pour le secondaire. Gris foncé pour le décoratif ou les labels.

**Gradient signature** : bleu → violet → rose. C'est l'unique accent chromatique de toute la page. Il apparaît sur le nom de la marque, les titres clés, un micro-élément décoratif dans le hero. Nulle part ailleurs. Ce gradient dit : précision, intelligence, fluidité.

---

## Typographie

Monospace pour tout ce qui est chiffre, valeur, donnée, nom de variable, label technique. C'est le signal fort qui dit "cet outil traite des données sérieusement".

Semi-serif ou sans-serif sobre pour les titres et le corps. Pas de police originale ou décorative — l'originalité vient du traitement, pas de la police.

La taille est généreuse sur les éléments importants, petite sur les éléments de structure. La hiérarchie est lisible au premier coup d'œil.

---

## Structure de la landing

### Section 1 — Hero

Deux colonnes. À gauche : la promesse en grand, le CTA. À droite : le produit réel, fonctionnel, interactif.

Le titre est court et direct. Il ne liste pas des fonctionnalités — il dit ce qu'on obtient. Le gradient n'est appliqué qu'à la partie la plus mémorable de la phrase.

Juste avant le titre, un micro-élément : quelques caractères block en gradient, comme une signature visuelle. Sobre. Pas de l'ASCII art — un accent.

Le mock produit à droite montre l'interface réelle : les trois colonnes (Paramètres, Calculs, Résultats), des données concrètes. Il est légèrement incliné en 3D, se redresse au hover. Les données changent quand on clique les pills de scénario — l'interactivité est découverte, pas expliquée.

### Section 2 — La preuve de la mécanique

Titre : "Modifiez un paramètre. Tout se recalcule." Un curseur. Trois cartes de résultats qui s'animent quand la valeur change. C'est tout.

Pas d'explication. L'utilisateur le comprend en deux secondes d'interaction.

### Section 3 — Pour qui ?

Six secteurs d'activité présentés comme des pills. On clique une pill, le mock produit en dessous se swap sur le modèle correspondant — Immobilier, Agence, SaaS, E-commerce, Freelance, PME. Transition fluide, rapide.

Cette section répond à l'objection silencieuse de tout visiteur : "est-ce que ça marche pour MON cas ?" La réponse est visuelle et immédiate.

### Section 4 — CTA final

Une phrase. Un bouton. Une ligne de réassurance. Rien d'autre.

---

## Principes d'interaction

**Hover léger** : les cards s'élèvent légèrement, les bordures s'éclaircissent à peine. On sent que l'interface est vivante sans que ça gesticule.

**Transitions courtes** : 150 à 300ms. Pas de slow-motion. L'outil est rapide, les animations le reflètent.

**Pas d'auto-animation non sollicitée** : rien ne défile, ne clignote, ne tourne sans que l'utilisateur l'ait déclenché. Les seules animations automatiques sont les compteurs qui s'animent à l'entrée dans la viewport — une seule fois.

**Les données sont vraies** : tous les chiffres dans les mocks sont cohérents, plausibles, spécifiques à leur secteur. On ne met pas "Lorem ipsum" dans un outil financier.

---

## Ce qu'on évite

- Les gradients en fond de page ou en blob décoratif
- Les animations d'entrée trop longues ou trop nombreuses
- Les sections "Nos fonctionnalités" avec des icônes en grille
- Les témoignages clients au format citation avec avatar
- Le fond blanc avec du violet partout — le cliché SaaS 2022
- Tout ce qui ressemble à un template Webflow ou Framer
- L'ASCII art en excès — juste un accent, pas un thème

---

## Cohérence avec l'application

La landing est la porte d'entrée de l'app. L'app est déjà sombre, sobre, avec la même palette zinc. La landing doit être reconnaissable comme faisant partie du même univers — pas une vitrine marketing déconnectée.

Quand un utilisateur clique "Commencer" et arrive dans le dashboard, il ne devrait pas avoir l'impression de changer de produit.

---

## Résumé en une phrase

Une landing sombre, précise, avec un seul geste de couleur fort — le gradient bleu-violet-rose — appliqué uniquement là où c'est le plus impactant, et un produit qui se montre lui-même plutôt que de se décrire.
