# Profil Hermes « performcar »

Assistant IA commercial de PERFORM'CAR pour [Hermes Agent](https://hermes-agent.nousresearch.com/docs/).
Il conseille sur les protections XPEL et les offres PERFORM'CAR, et **crée et suit des devis dans
PerformCar EasyDevis** par la conversation, depuis l'assistant intégré à EasyDevis (bulle et menu
« Intelligence artificielle »), **au nom de l'utilisateur connecté**.

### Identité : ticket de conversation
À chaque message, le backend EasyDevis crée un ticket opaque lié à l'utilisateur et à sa session
(Redis, quelques heures, révoqué à la fin du tour) et le place dans les instructions système. Les outils
le renvoient avec la clé de service `EASYDEVIS_SERVICE_KEY` (= `ASSISTANT_SERVICE_KEY` du backend).
L'API agit alors avec les droits et la concession de cet utilisateur ; les routes `/admin` refusent
ces appels. Un ticket seul n'ouvre rien.

## Contenu

| Élément | Rôle |
|---|---|
| `distribution.yaml` | Manifeste de distribution Hermes (installation par `hermes profile install`) |
| `SOUL.md` | Identité, ton de marque et règles impératives (prix catalogue, confirmation avant écriture, pas de FAP/EGR/AdBlue) |
| `config.yaml` | Modèle, approbations manuelles, mémoire, serveur MCP `easydevis` (10 outils autorisés) |
| `.env.EXAMPLE` | Variables à renseigner (clé du modèle, compte EasyDevis, chemin du serveur MCP, messagerie) |
| `memories/MEMORY.md` | Mémoire de départ (règles clés) |
| `skills/performcar/` | 5 compétences : `creer-devis-easydevis`, `suivi-devis-easydevis`, `conseil-protection-xpel`, `offres-performcar`, `entreprise-performcar` |
| `mcp/easydevis/` | Serveur MCP Python (stdio) qui appelle l'API EasyDevis |

### Outils MCP `easydevis`
`ma_concession`, `catalogue_vehicules`, `lister_prestations`, `rechercher_clients`, `simuler_financement`,
`creer_devis`, `lister_devis`, `consulter_devis`, `changer_statut_devis`, `statistiques_devis`.
Aucune suppression n'est exposée. L'API applique les permissions du compte et le périmètre de sa concession.

## Prérequis

1. Hermes Agent installé (`hermes --version`) et [uv](https://docs.astral.sh/uv/) dans le PATH.
2. Dans `backend/.env` d'EasyDevis : `HERMES_API_KEY` (= `API_SERVER_KEY` du profil) et
   `ASSISTANT_SERVICE_KEY` (= `EASYDEVIS_SERVICE_KEY` du profil). Plus de compte assistant dédié.
3. Remplir le **catalogue des prestations** EasyDevis avec les prestations réellement vendues :
   l'assistant ne chiffre qu'avec ce catalogue.

## Installation

```powershell
# 1. Installer le profil depuis ce dossier
hermes profile install C:\Projects\template\apps\integrations\hermes-performcar --name performcar

# 2. Renseigner les secrets du profil
#    (dossier du profil : %LOCALAPPDATA%\hermes\profiles\performcar sous Windows,
#     ~/.hermes/profiles/performcar sous macOS/Linux)
Copy-Item "$env:LOCALAPPDATA\hermes\profiles\performcar\.env.EXAMPLE" "$env:LOCALAPPDATA\hermes\profiles\performcar\.env"
notepad "$env:LOCALAPPDATA\hermes\profiles\performcar\.env"
#    (le chemin du serveur MCP est fixé dans config.yaml : /opt/data/profiles/performcar/mcp/easydevis)

# 3. Vérifier
hermes -p performcar mcp            # le serveur easydevis doit apparaître avec ses 10 outils
hermes -p performcar chat
```

Alternative : `hermes profile import performcar-hermes-profile.tar.gz --name performcar`
(archive produite par `build_archive.py`, mêmes fichiers).

> Selon la documentation Hermes, les serveurs MCP se déclarent sous `mcp_servers` dans `config.yaml`
> (c'est ce que fait ce profil). La page « distributions » mentionne aussi un `mcp.json` : si votre version
> ne charge pas `easydevis`, copiez le bloc `mcp_servers.easydevis` dans un `mcp.json`.

## Messagerie (facultatif)

- **Telegram** : `TELEGRAM_BOT_TOKEN` (BotFather) et `TELEGRAM_ALLOWED_USERS` dans `.env`,
  puis `hermes -p performcar gateway setup` et `hermes -p performcar gateway start`.
- **WhatsApp** : `WHATSAPP_ENABLED=true`, `WHATSAPP_MODE=bot`, `WHATSAPP_ALLOWED_USERS=33...`,
  puis `hermes -p performcar whatsapp` (QR code) et `gateway start`.
- Limitez toujours l'accès aux numéros/identifiants des commerciaux (listes d'autorisation).

## Exemple

> **Commercial** : Devis pour une Porsche 911 Carrera S 2025 blanche neuve, pack complet, client Jean Dupont 06 12 34 56 78.
> **Assistant** : vérifie le véhicule dans le catalogue, propose les prestations du catalogue avec leurs prix,
> demande le financement, cherche le client, présente le récapitulatif, puis crée le devis après votre « oui »
> et donne la référence QUO-…

## Tests du serveur MCP

```powershell
cd mcp\easydevis
uv run --group dev pytest -q
```

## Sécurité et données

- Les identifiants restent dans `.env` (exclu des exports Hermes) ; jamais dans `config.yaml`.
- Approvals Hermes en mode `manual` ; les outils terminal et navigateur sont désactivés.
- Les échanges (dont les coordonnées clients) passent par le fournisseur du modèle configuré :
  vérifiez la conformité RGPD (contrat de sous-traitance) avant la mise en production.
- Sources des fiches produits : performcar.fr et xpel.fr, lues le 07/11/2026 — à revalider régulièrement.
