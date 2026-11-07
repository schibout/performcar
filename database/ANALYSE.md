# Analyse des besoins de stockage

## Sources et périmètre

Analyse des modèles `backend/app/models`, de la chaîne complète de 24 migrations
`backend/app/alembic/versions`, des dépôts et du bootstrap du backend, confrontée
aux fonctionnalités du frontend : profil, administration, support, notifications,
annonces, fichiers, sessions et paramètres système.
Le graphe existant `backend/graphify-out/graph.json` a servi à repérer les modèles,
notamment `SystemSetting` (`app/models/system_setting.py:L16`) et
`SupportTicket` (`app/models/support.py:L24`) ; les fichiers sources et migrations
ont ensuite été lus directement.

Le schéma livré représente l'état final des migrations, sans les colonnes et
tables supprimées par leur historique. Il respecte les noms déjà utilisés par
les requêtes du backend. PostgreSQL 17 est la version définie dans
`backend/docker-compose.yaml`.

## Tables nécessaires

Toutes les clés primaires métier sont des UUID. Les dates utilisent
`timestamp with time zone`. Les contenus structurés utilisent le type `json`
déjà prévu dans les modèles.

| Table | Besoin couvert et principales données | Relations |
| --- | --- | --- |
| `user` | Identité, email unique, mot de passe haché, rôle, vérification, superadministrateur racine, suspension et suppression planifiée | Avatar facultatif vers `file` |
| `admin_permission` | Permissions individuelles historiques des administrateurs, auteur et date du droit | Titulaire et auteur vers `user` ; unicité `(user_id, permission)` |
| `rbac_permission_set` | Jeu nommé de permissions : clé unique, nom, audience (`admin` ou `user`), indicateur système | Aucune |
| `rbac_permission_set_item` | Une clé de permission appartenant à un jeu | Jeu obligatoire (`CASCADE`) ; clé primaire `(set_id, permission)` |
| `rbac_role` | Rôle nommé : clé unique, nom, audience, indicateur système | Aucune |
| `rbac_role_permission_set` | Jeux inclus dans un rôle | Rôle (`CASCADE`) et jeu (`RESTRICT`) ; clé primaire `(role_id, set_id)` |
| `rbac_user_role` | Rôle attribué à un compte, attributeur, expiration facultative | Compte (`CASCADE`), rôle (`RESTRICT`), attributeur (`SET NULL`) ; unicité `(user_id, role_id)` |
| `rbac_user_permission_set` | Jeu attribué directement à un compte, attributeur, expiration facultative | Compte (`CASCADE`), jeu (`RESTRICT`), attributeur (`SET NULL`) ; unicité `(user_id, set_id)` |
| `user_session` | Session par appareil, dernier identifiant de jeton de renouvellement, agent utilisateur, IP, expiration et révocation | Utilisateur obligatoire |
| `user_activity` | Journal d'activité, ressource concernée, détails JSON, résultat, code HTTP, contexte client ; `actor_ref` (référence pseudonymisée de l'acteur) et `user_deleted_at` (date de suppression du compte) pour l'anonymisation | Utilisateur facultatif (`NULL` après suppression du compte ou pour une connexion à email inconnu) ; `resource_id` polymorphe sans clé étrangère |
| `file` | Métadonnées Cloudinary : URL, identifiant distant, nom, type MIME, taille et catégorie | Auteur facultatif vers `user` |
| `support_ticket` | Sujet, état, priorité, administrateur affecté et date du dernier message | Propriétaire obligatoire et administrateur facultatif vers `user` |
| `support_message` | Texte, rôle de l'auteur, lecture et date d'envoi | Ticket obligatoire ; auteur facultatif vers `user` |
| `support_message_attachment` | Association de plusieurs fichiers à un message | Vers `support_message` et `file` ; unicité `(message_id, file_id)` |
| `notification` | Boîte de réception, type de notification, données JSON et date de lecture | Destinataire obligatoire vers `user` |
| `announcement` | Historique des annonces, modèle ou traductions, variables, niveau, audience, bannière et demande d'email | Auteur facultatif vers `user` |
| `system_setting` | Surcharge d'un paramètre : clé unique, valeur sérialisée, dernier auteur et date | Auteur facultatif vers `user` |
| `user_mfa` | Inscription TOTP d'un administrateur : secret chiffré (Fernet), date d'activation, dernier pas de temps accepté | Clé primaire = `user_id` vers `user` |
| `user_mfa_recovery_code` | Codes de secours à usage unique, stockés hachés, avec date d'utilisation | Titulaire obligatoire vers `user` |

Une quatorzième table technique, `alembic_version`, mémorise la révision installée
pour que les migrations suivantes reprennent au bon endroit.

## Intégrité et cycle de vie

Le schéma comporte **26 clés étrangères**, **19 clés primaires métier**,
**7 contraintes d'unicité** supplémentaires et **28 index explicites**, dont
l'index unique d'email. Les index des clés primaires et contraintes d'unicité
sont créés automatiquement par PostgreSQL en complément.

- Supprimer un utilisateur supprime ses droits reçus, sessions, données MFA
  (inscription et codes de secours), notifications et tickets. Les messages et pièces jointes de ses tickets
  sont également supprimés en cascade.
- Supprimer un utilisateur **conserve** son journal d'activité : `user_activity.user_id`
  passe à `NULL` (`ON DELETE SET NULL`, auparavant `CASCADE`) et la ligne reste
  rattachée à `actor_ref` / `user_deleted_at`. Ces lignes anonymisées sont purgées
  par une tâche nocturne après `ANONYMIZED_AUDIT_RETENTION_DAYS` jours (365 par défaut).
- Supprimer un administrateur conserve les annonces, paramètres et messages
  des tickets qui lui survivent, en mettant les références d'auteur ou
  d'affectation à `NULL`. Les droits qu'il a accordés survivent avec un auteur
  nul, tant que leur titulaire existe.
- Supprimer un fichier remet l'avatar concerné à `NULL` et supprime ses
  associations aux messages. Supprimer un message ou un ticket ne supprime
  pas les métadonnées des fichiers : leur cycle de vie relève du service de
  fichiers. La suppression du binaire distant relève également de ce service.
- Un rôle ou un jeu de permissions encore attribué ne peut pas être supprimé :
  les clés étrangères vers `rbac_role` et `rbac_permission_set` sont
  `RESTRICT` (sauf depuis `rbac_role_permission_set.role_id` et
  `rbac_permission_set_item.set_id`, en `CASCADE`). Supprimer un compte
  supprime ses attributions ; supprimer son attributeur met `assigned_by` à `NULL`.
- La dépendance circulaire `user.avatar_file_id` / `file.uploaded_by_id` est
  résolue par l'ajout des clés étrangères après la création des tables.

## Besoins de recherche

Les index composites couvrent les listes de notifications par utilisateur et
date, les messages par ticket et date, la file de support par statut et
dernière activité, les annonces avec bannière et les sessions par utilisateur
et dernière utilisation. L'expiration des sessions a son propre index.

L'index partiel `ix_user_deletion_due` cible les comptes désactivés dont une
suppression est planifiée. Les trois index GIN trigrammes sur email, prénom
et nom nécessitent `pg_trgm` et accélèrent la recherche administrative.

## Choix de compatibilité

Les rôles, permissions, types de notification, états et priorités restent des
chaînes validées par l'application, conformément au backend existant. Les
scripts n'ajoutent pas d'énumérations, de triggers ou de règles métier qui
modifieraient ce contrat. L'unicité d'email conserve la sémantique actuelle
de PostgreSQL, sensible à la casse ; la normalisation relève de l'application.
Le caractère unique du superadministrateur racine est géré par le backend,
sans index unique supplémentaire dans le schéma actuel.

Les seuls défauts SQL persistants issus des migrations sont `false` pour
`user.is_verified` et `user.is_root_superadmin`, et `'general'` pour
`file.category`. Les autres défauts et mises à jour automatiques des modèles
sont exécutés par SQLAlchemy, pas par PostgreSQL.

## Stockages hors PostgreSQL

La liste noire des jetons JWT a été déplacée vers Redis par la migration
`2fc986d6d710` ; il ne faut donc pas recréer `token_blacklist`.
Les tentatives de connexion et les codes temporaires de transfert racine
utilisent aussi Redis. Les fichiers binaires sont stockés dans Cloudinary.
Les traductions d'interface et le catalogue des clés de permission
(`Permission`) restent dans le code ; seules les attributions RBAC sont en base.
Le contenu des rôles et jeux système est défini dans `app/core/rbac_catalog.py`. Les définitions et valeurs par défaut des paramètres sont dans
`app/core/settings_registry.py` : aucune table de catalogue supplémentaire
n'est nécessaire pour les fonctionnalités existantes.

## Validation

`tools/generate.py` reconstruit la référence en rejouant les migrations dans
une base PostgreSQL 17 isolée, puis compare son export à une installation du
SQL consolidé. `verify.sql` contrôle les tables, la révision, l'extension,
l'unicité d'email, des pièces jointes et des attributions RBAC, les
principales cascades et remises à `NULL`, ainsi que les refus `RESTRICT` sur
les rôles et jeux de permissions encore utilisés. Toutes ses écritures sont annulées par `ROLLBACK`.

## Modèle RBAC et règle de couverture

Un compte reçoit ses permissions de deux sources cumulées : les rôles
(`rbac_user_role`, qui regroupent des jeux) et les jeux attribués directement
(`rbac_user_permission_set`). Rôles et jeux ont une audience (`admin` ou `user`)
qui limite les clés qu'ils peuvent contenir. Les superadministrateurs ne passent
pas par ces tables. Les clés `self.*` concernent les comptes ordinaires.

Le socle reste hors RBAC : `/auth/*`, `GET /users/me`, `/users/me/events`,
`/users/me/sessions*`, `DELETE /users/me`, `POST /users/me/reactivate`,
`/settings/public` et `/announcements/active`. La double authentification
administrateur est dormante (`ADMIN_MFA_REQUIRED=False`) et aucune élévation
d'authentification (step-up) n'existe.

Une permission naît avec sa route : `backend/app/tests/test_rbac_route_coverage.py`
échoue pour toute route ni protégée par une permission, ni listée dans le socle
ou dans les routes réservées au superadministrateur.
