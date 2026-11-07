# Graphify dans ce workspace

Configuration vérifiée le 6 novembre 2026, version `0.9.103`.

## Installation

L'installation complète utilisée par les graphes est isolée avec UV :

```powershell
uv tool install --force --python 3.12 "graphifyy[sql,postgres,watch,mcp,pdf,office,svg]==0.9.103"
```

Elle inclut les analyseurs Python, JavaScript et TypeScript, ainsi que SQL,
le connecteur PostgreSQL, la surveillance de fichiers, MCP, PDF, documents
Office et exports SVG. Les fonctions vidéo, les connecteurs Neo4j/FalkorDB
et les fournisseurs LLM supplémentaires ne sont pas nécessaires pour analyser
le code de ce projet et n'ont pas été ajoutés.

La commande globale Python est également alignée sur `0.9.103`. MCP doit être
utilisé depuis UV, pour isoler ses dépendances de celles de FastAPI global.
Le chemin de l'exécutable UV est ici :

```text
C:/Users/admin/.local/bin/graphify.exe
C:/Users/admin/.local/bin/graphify-mcp.exe
```

Les compétences sont installées dans `~/.agents/skills/graphify` et
`~/.codex/skills/graphify`. `AGENTS.md` contient les instructions persistantes
pour consulter les graphes au cours des prochaines sessions.

## Consulter les graphes

Depuis `C:/Projects/template/apps` :

```powershell
graphify query "UserSession" --graph backend/graphify-out/graph.json
graphify query "useAuthStore" --graph frontend/graphify-out/graph.json
```

Les chemins sources des résultats sont relatifs à `backend` ou `frontend`.
Il n'existe pas encore de graphe fusionné à la racine du workspace.

Pour mettre à jour un graphe après des modifications de code, se placer
dans l'application concernée puis lancer `graphify update .`. Cette opération
utilise l'analyse syntaxique, sans clé API. La commande `/graphify` dans
l'assistant utilise la compétence installée pour le workflow complet.

L'analyse sémantique autonome de documents par un LLM nécessite en complément
un fournisseur et ses identifiants ; aucune clé n'a été ajoutée à cette installation.
Le paquet MCP est prêt dans UV, mais aucun serveur MCP n'a été enregistré dans
la configuration de l'assistant. L'intégration active repose sur la compétence,
`AGENTS.md` et la ligne de commande.
