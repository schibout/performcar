# Base de données PostgreSQL

Scripts de création pour le backend existant, analysé le 6 novembre 2026.
Cible : **PostgreSQL 17**, schéma `public`, révision Alembic **`c4e8a1f2b3d7`**.

## Contenu

| Fichier | Utilisation |
| --- | --- |
| `ANALYSE.md` | Besoins, tables, relations et choix de compatibilité |
| `00_create_database.psql` | Création de la base avec un propriétaire existant |
| `01_schema.sql` | Création des 19 tables métier, clés, index et extension |
| `02_alembic_version.sql` | Création et initialisation du suivi des migrations |
| `install.psql` | Exécution atomique de `01` et `02` sur une base vide |
| `verify.sql` | Contrôles du schéma et des relations, données de test annulées |
| `tools/generate.py` | Régénération et vérification dans un conteneur temporaire |

## Installation

Depuis `C:\Projects\template\apps`, avec `psql` disponible et PostgreSQL accessible.
Remplacer `app` et `app_user` par les valeurs `POSTGRES_DB` et `POSTGRES_USER`
utilisées dans la configuration du backend. Ajouter `-h` et `-p` si nécessaire.
Laisser le client demander le mot de passe ou utiliser un fichier `.pgpass`.

Si le rôle applicatif n'existe pas, le créer avec un compte administrateur :

```powershell
createuser -h localhost -U postgres --login --pwprompt app_user
```

Créer la base, puis installer le schéma avec son propriétaire :

```powershell
psql -X -h localhost -U postgres -d postgres -v db_name=app -v db_owner=app_user -f database/00_create_database.psql
psql -X -h localhost -U app_user -d app -f database/install.psql
psql -X -h localhost -U app_user -d app -v ON_ERROR_STOP=1 -f database/verify.sql
```

Si Docker Compose a déjà créé la base vide, commencer par `install.psql`.
Le propriétaire doit pouvoir installer `pg_trgm`, extension de confiance de
PostgreSQL 17 ; sur un service managé, la faire activer par l'administrateur
si les droits sont restreints.

`00_create_database.psql` s'exécute hors transaction. `install.psql` utilise
une transaction unique et s'arrête dès la première erreur. Ses chemins `\ir`
sont relatifs au script. Les fichiers `.psql` nécessitent le client `psql`.
Avec un autre client SQL, exécuter `01_schema.sql`, puis `02_alembic_version.sql`
dans une même transaction.

Ces scripts initialisent une **base vide**. Une seconde installation échoue
sans modifier les tables existantes. Pour une base déjà utilisée, conserver
les migrations du backend : `uv run alembic upgrade head`, depuis `backend`.
Ne pas appliquer manuellement `02_alembic_version.sql` à une base dont le
schéma n'a pas été installé par `01_schema.sql`.

## Données initiales et fonctionnement

Le premier superadministrateur est créé au démarrage du backend par
`app/core/bootstrap.py`, à partir de `FIRST_SUPERUSER` et
`FIRST_SUPERUSER_PASSWORD`. Aucun mot de passe ni compte prédéfini n'est
inséré par les scripts SQL.

`system_setting` reste initialement vide : les valeurs par défaut proviennent
du registre Python et de l'environnement. Les rôles et jeux de permissions système du RBAC sont semés au démarrage par
`app/core/bootstrap.py` à partir de `app/core/rbac_catalog.py` ; les scripts SQL
ne les insèrent pas. Les annonces et notifications sont ensuite créées par les
fonctionnalités de l'application.

Les UUID, horodatages et la plupart des valeurs par défaut sont fournis par
SQLAlchemy. Lors d'une insertion SQL directe, renseigner explicitement les
colonnes obligatoires sans `DEFAULT`. Il n'existe pas de déclencheur SQL pour
`updated_at` ou `last_message_at` : le backend gère ces mises à jour.

## Régénération et validation

Docker doit être démarré. Depuis `apps` :

```powershell
uv run --with alembic --with sqlalchemy database/tools/generate.py
```

L'outil rejoue toutes les migrations dans PostgreSQL 17, exporte le schéma
final, le réinstalle et compare les définitions complètes. Il teste aussi
les vrais points d'entrée `00_create_database.psql` et `install.psql`, le
refus d'une réinstallation, puis `verify.sql` (unicités et suppressions
`CASCADE`/`SET NULL`). Le conteneur temporaire ne publie aucun port et est
supprimé en fin d'exécution. Aucune base applicative n'est contactée.

Après l'ajout de migrations, régénérer les scripts et adapter la révision
attendue dans `verify.sql`, ainsi que la documentation si le modèle évolue.
