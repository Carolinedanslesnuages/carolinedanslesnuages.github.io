# Accessibilité du site

Grille RGAA 4.1.2 du site, critère par critère. Les textes des critères ont été lus avec
[Marguerite](https://github.com/Carolinedanslesnuages/marguerite), depuis le référentiel officiel
de la DINUM.

**Ce que cette grille est, et ce qu'elle n'est pas.** C'est une auto-évaluation, appuyée sur des
vérifications automatiques dans un vrai navigateur (Chromium) et sur une relecture du code. Ce
n'est pas un audit réalisé par une personne avec des technologies d'assistance (NVDA, VoiceOver) :
ce test-là reste à faire.

Vérifications rejouées à chaque construction du site : `test/navigateur/rgaa.mjs` (critères
marqués 🤖) et `test/navigateur/parcours.mjs`. Si l'une échoue, le site n'est pas publié.

Légende : **C** conforme · **NA** non applicable · 🤖 vérifié automatiquement à chaque construction.

| Thème | Critère | Statut | Comment |
|---|---|---|---|
| 1. Images | 1.2 | C | Les autocollants (nuage, cœur) sont décoratifs : `aria-hidden="true"`. |
| 1. Images | 1.1, 1.3 à 1.9 | NA | Aucune image porteuse d'information. |
| 2. Cadres | tous | NA | Aucun cadre. |
| 3. Couleurs | 3.1 | C | L'état d'une cartouche (voyant de couleur) est aussi écrit : « v1.0.0 », « essai », « bientôt ». |
| 3. Couleurs | 3.2 | C 🤖 | axe-core (contrastes WCAG 2.1 AA), ordinateur et téléphone. |
| 3. Couleurs | 3.3 | C 🤖 | Bordure du champ de saisie à 7,5:1 sur le fond de l'écran (elle était à 1,9:1). |
| 4. Multimédia | tous | NA | Aucun média. |
| 5. Tableaux | tous | NA | Aucun tableau. |
| 6. Liens | 6.1, 6.2 | C | Intitulés explicites (« le dépôt Val sur GitHub », « ouvrir sur GitHub » à la suite du fichier affiché), « (nouvel onglet) » précisé. |
| 7. Scripts | 7.1 | C | Composants natifs (boutons, champ, liens) ; les résultats d'une commande sont annoncés. |
| 7. Scripts | 7.3 | C 🤖 | Tout se fait au clavier : commandes, complétion, entrées cliquables, cartouches, touches. |
| 7. Scripts | 7.4 | C | Aucun changement de contexte sans action ; les liens vers GitHub ouvrent un onglet annoncé. |
| 7. Scripts | 7.5 | C 🤖 | Une annonce courte par commande, dans un message de statut (`role="status"`). L'écran n'est pas lu en entier. |
| 7. Scripts | 7.2 | NA | |
| 8. Éléments obligatoires | 8.1 à 8.6 | C | Type de document, `lang="fr"`, titre « carolinedanslesnuages ». 8.2 : HTML servi valide ; le DOM généré n'a pas été passé au validateur. |
| 8. Éléments obligatoires | 8.7, 8.8 | C 🤖 | Les fichiers de licence, en anglais, s'affichent avec `lang="en"`. |
| 8. Éléments obligatoires | 8.9 | C | `<mark>` seulement pour les mots trouvés par une recherche. |
| 8. Éléments obligatoires | 8.10 | NA | |
| 9. Structuration | 9.1 | C | `h1` (le pseudo), `h2` « Terminal » (masqué visuellement) et « Cartouches ». |
| 9. Structuration | 9.2 | C | `header`, `main`, `nav` (commandes rapides), `aside` (cartouches), `footer`. |
| 9. Structuration | 9.3 | C 🤖 | Cartouches et listes de fichiers en `<ul>`/`<li>`. |
| 9. Structuration | 9.4 | NA | |
| 10. Présentation | 10.1 à 10.3, 10.5, 10.6 | C | Mise en forme en CSS ; contenu présent et compréhensible sans styles ; liens soulignés. |
| 10. Présentation | 10.4 | C 🤖 | Équivalent d'un zoom à 200 % (640 px) : rien ne déborde. |
| 10. Présentation | 10.7 | C 🤖 | Focus visible sur le champ, l'écran, les touches, les cartouches et les entrées de l'écran (contour ajouté). |
| 10. Présentation | 10.8 | C | Contenus masqués : textes destinés aux lecteurs d'écran, ou décorations masquées exprès. |
| 10. Présentation | 10.9, 10.10 | C | Aucune information donnée par la seule forme ou position. |
| 10. Présentation | 10.11 | C 🤖 | À 320 px : pas de défilement horizontal, et l'écran ne sort plus de son cadre. |
| 10. Présentation | 10.12 | C 🤖 | Espacement du texte redéfini (interligne 1,5, espacements des lettres et des mots) : rien de coupé. |
| 10. Présentation | 10.13, 10.14 | NA | Aucun contenu au survol. |
| 11. Formulaires | 11.1, 11.2 | C | Champ étiqueté « Commande, dossier ~/… », avec une aide décrite. |
| 11. Formulaires | 11.3 à 11.13 | NA | Un seul champ, sans donnée personnelle ni envoi. |
| 12. Navigation | 12.6 | C | Zones d'en-tête, principale, de navigation et de pied de page. |
| 12. Navigation | 12.7 | C 🤖 | Lien d'évitement « Aller au terminal », premier élément au clavier. |
| 12. Navigation | 12.8 | C 🤖 | Ordre : lien d'évitement, écran, champ, touches, cartouches. Les touches passent avant les cartouches, comme à l'écran sur téléphone. |
| 12. Navigation | 12.9 | C 🤖 | Pas de piège : Tab ne complète un nom que s'il y a quelque chose à compléter, sinon il passe à l'élément suivant. |
| 12. Navigation | 12.1 à 12.5, 12.10, 12.11 | NA | Une seule page, pas de raccourci à une touche. |
| 13. Consultation | 13.5, 13.6 | C 🤖 | Traits d'arborescence, puces, pointillés et dessins en caractères masqués aux lecteurs d'écran ; le dessin des nuages a une phrase d'alternative. |
| 13. Consultation | 13.2, 13.7, 13.9, 13.11 | C | Nouvel onglet seulement au clic ; ni flash ni clignotement ; toutes orientations ; activation au relâchement. |
| 13. Consultation | 13.8 | C | Le démarrage s'affiche en moins de 2 secondes puis s'arrête ; supprimé si le système demande moins d'animations. |
| 13. Consultation | 13.1, 13.3, 13.4, 13.10, 13.12 | NA | |

## Corrections apportées grâce à cette grille

Défauts trouvés en relisant les critères avec Marguerite, qu'axe-core ne détectait pas :
13.5 (contenu cryptique), 9.3 (listes), 12.8 (ordre de tabulation sur téléphone),
3.3 (contraste du champ), 12.7 (lien d'évitement), 10.7 (focus des entrées de l'écran),
10.11 (débordement à 320 px) et 8.7 (licence en anglais).
