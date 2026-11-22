# carolinedanslesnuages.github.io

Mon site : un cyberdeck pastel dont l'écran est un bureau. Une icône par projet open source (une
bulle dit de quoi il s'agit), une barre latérale (terminal, explorateur, humeur, couleur) et un
widget du poids du site, mesuré par [Solange](https://github.com/Carolinedanslesnuages/solange) à
chaque publication. Vue 3 + Vite, publié sur GitHub Pages.

Les fichiers d'un projet ne se téléchargent qu'à son ouverture dans l'explorateur ; le terminal,
qui cherche dans tous les projets, les charge tous la première fois qu'on l'ouvre.

## Ajouter un projet

1. Le dépôt doit être **public**. La collecte refuse tout dépôt privé, absent ou renommé.
2. Ajoutez-le dans `projets` de [`site.config.json`](site.config.json), avec son nom exact
   (majuscules comprises) et une accroche courte.
3. Poussez sur `main` : le site se reconstruit. Il se reconstruit aussi chaque nuit, pour reprendre
   les versions et les fichiers à jour.

Les dossiers d'outillage cachés (`.claude`, `.agents`…), les dépendances et les fichiers générés
ne sont pas repris. Le texte des fichiers de plus de 40 Ko n'est pas affiché : un lien mène à
GitHub.

## Développer

```sh
npm ci
GITHUB_TOKEN=$(gh auth token) npm run collect     # récupère les projets
npm run dev                                        # http://localhost:5173
npm test                                           # moteur du terminal
```

## Accessibilité

Le bureau se parcourt au clavier (Tab, et les flèches entre les icônes) ; les fenêtres sont des
boîtes de dialogue natives qui se ferment avec Échap. Le terminal reste utilisable au clavier et au lecteur d'écran : l'écran se lit à son rythme, une
annonce courte résume chaque commande, la touche Tab ne piège jamais le focus, et tout ce qui
s'affiche est cliquable. La grille RGAA du site, critère par critère, est dans
[`ACCESSIBILITE.md`](ACCESSIBILITE.md) ; ses vérifications automatiques tournent à chaque
construction (`npm run test:browser`) et bloquent la publication si un critère casse.
