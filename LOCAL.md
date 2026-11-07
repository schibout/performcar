# Application locale

Installation Windows effectuée avec Python 3.12, UV, Node.js, pnpm via Corepack
et Docker Desktop. Les dépendances ont été installées depuis les fichiers de
verrouillage existants.

## Accès

- Interface : <http://localhost:3000/en>
- Documentation API : <http://localhost:8000/docs>
- Disponibilité API et base : <http://localhost:8000/api/v1/health/ready>
- Identifiants administrateur générés : `.local/credentials.txt` (fichier local ignoré).

Le mot de passe administrateur vient de `FIRST_SUPERUSER_PASSWORD` dans
`backend/.env`. Le compte a été créé automatiquement au premier démarrage.

## Démarrer et arrêter

Depuis `C:\Projects\template\apps`, avec Docker Desktop démarré :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-Local.ps1
```

Le script lance PostgreSQL 17 et Redis 7 sous le projet Docker `template-local`,
applique les migrations, puis lance en arrière-plan l'API FastAPI, le worker
ARQ et le frontend Next.js en mode développement. Il vérifie ensuite que l'API
et le proxy frontend répondent. Un second lancement conserve les processus
déjà démarrés. Les services ne démarrent pas automatiquement avec Windows.

Pour arrêter l'application et ses services Docker :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Stop-Local.ps1
```

Les volumes PostgreSQL et Redis sont conservés. Le script ne touche pas aux
autres projets Docker. Les ports utilisés sont `3000`, `8000`, `5432` et `6379`,
liés à l'interface locale uniquement.

Les journaux sont dans `.local/*.out.log` et `.local/*.err.log`.
`Run-LocalWorker.py` permet au worker existant de tourner sous Windows sans
gestionnaires de signaux Unix.

## Configuration

- Backend : `backend/.env` avec secrets locaux générés.
- Frontend : `frontend/.env.local` avec API sur `localhost:8000`.
- CORS : `http://localhost:3000` et `http://127.0.0.1:3000`.
- Redis : `redis://127.0.0.1:6379/0`, pour éviter le problème de résolution
  de `localhost` constaté sur cette machine.

Les emails SMTP et les uploads Cloudinary nécessitent de vrais identifiants
dans `backend/.env`. Ces services externes ne sont pas configurés.

La base est initialisée par les migrations Alembic, à la révision
`e7a3c15b9f20`. Les scripts consolidés du dossier `database` constituent une
autre méthode d'installation sur base vide : ne pas les rejouer sur cette base.

## Vérifications effectuées

PostgreSQL et Redis sont sains dans Docker. Les routes de santé API, Swagger,
la page frontend et le proxy vers les paramètres publics répondent en HTTP 200.
La connexion du superadministrateur et la lecture de son profil ont réussi.
