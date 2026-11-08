"""Serveur MCP « easydevis » : expose l'API PerformCar EasyDevis à Hermes.

Chaque outil agit au nom de l'utilisateur connecté à EasyDevis grâce au
paramètre ``ticket`` (ticket de conversation transmis par EasyDevis dans les
instructions). L'API applique les permissions et la concession de cet
utilisateur. Aucune suppression n'est exposée.

Variables d'environnement : EASYDEVIS_API_URL, EASYDEVIS_SERVICE_KEY.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

from mcp.server.mcpserver import MCPServer

from easydevis_client import EasyDevisClient, EasyDevisError, monthly_payment

mcp = MCPServer("easydevis")

_client: EasyDevisClient | None = None


# Le serveur est installé dans <profil>/mcp/easydevis : le .env du profil est deux niveaux au-dessus.
PROFILE_ENV = Path(__file__).resolve().parents[2] / ".env"


def setting(name: str, default: str | None = None) -> str | None:
    """Read a variable from the environment, else from the profile's .env.

    The Hermes gateway does not always expand ``${VAR}`` for a routed profile, and
    filters the subprocess environment, so the profile .env is the fallback.
    """
    value = os.environ.get(name, "")
    if value and not value.startswith("${"):
        return value
    if PROFILE_ENV.is_file():
        for line in PROFILE_ENV.read_text(encoding="utf-8").splitlines():
            key, sep, raw = line.partition("=")
            if sep and key.strip() == name:
                return raw.strip().strip('"').strip("'")
    return default


def client() -> EasyDevisClient:
    """Return the shared API client, built from the environment on first use."""
    global _client
    if _client is None:
        service_key = setting("EASYDEVIS_SERVICE_KEY")
        if not service_key:
            raise RuntimeError("EASYDEVIS_SERVICE_KEY manquant (.env du profil)")
        _client = EasyDevisClient(
            base_url=setting("EASYDEVIS_API_URL", "http://127.0.0.1:8000/api/v1"),
            service_key=service_key,
        )
    return _client


TICKET_DOC = "ticket : le ticket de conversation donné dans les instructions."


async def _call(method: str, path: str, ticket: str, **kwargs: Any) -> Any:
    """Call the API and turn API errors into a readable result for the model."""
    try:
        return await client().request(method, path, ticket, **kwargs)
    except EasyDevisError as error:
        return {"erreur": error.code, "statut_http": error.status, "details": error.details}


@mcp.tool()
async def ma_concession(ticket: str) -> Any:
    """Concession de l'utilisateur connecté (nom, adresse, téléphone, e-mail)."""
    return await _call("GET", "/dealership", ticket)


@mcp.tool()
async def catalogue_vehicules(ticket: str) -> Any:
    """Catalogue véhicules : marques, modèles, versions et couleurs proposés."""
    return await _call("GET", "/catalog/vehicles", ticket)


@mcp.tool()
async def lister_prestations(ticket: str) -> Any:
    """Prestations actives avec leur prix TTC, catégorie et identifiant (service_id).

    Ce sont les seuls prix valables pour un devis.
    """
    return await _call("GET", "/catalog/services", ticket)


@mcp.tool()
async def rechercher_clients(ticket: str, recherche: str = "", limite: int = 10) -> Any:
    """Cherche un client existant de la concession (nom, téléphone ou e-mail)."""
    params = {"limit": max(1, min(limite, 50))}
    if recherche:
        params["search"] = recherche
    return await _call("GET", "/customers", ticket, params=params)


@mcp.tool()
async def simuler_financement(
    total: float,
    type_financement: Literal["cash", "credit", "leasing_loa", "leasing_lld"],
    apport: float = 0,
    duree_mois: int | None = None,
) -> dict[str, Any]:
    """Calcule la mensualité comme EasyDevis : (total - apport) / durée, arrondi au centime.

    Comptant (cash) : pas de mensualité. Durées usuelles : 12, 24, 36, 48 ou 60 mois.
    """
    if type_financement == "cash":
        return {"type": "cash", "total": round(total, 2), "mensualite": None}
    if not duree_mois or duree_mois < 1 or duree_mois > 120:
        return {"erreur": "La durée doit être comprise entre 1 et 120 mois."}
    if apport < 0 or apport > total:
        return {"erreur": "L'apport doit être compris entre 0 et le total du devis."}
    return {
        "type": type_financement,
        "total": round(total, 2),
        "apport": round(apport, 2),
        "duree_mois": duree_mois,
        "mensualite": monthly_payment(total, apport, duree_mois),
    }


@mcp.tool()
async def creer_devis(
    ticket: str,
    marque: str,
    modele: str,
    annee: int,
    couleur: str,
    etat: Literal["new", "used"],
    prestations: list[str],
    client_prenom: str,
    client_nom: str,
    type_financement: Literal["cash", "credit", "leasing_loa", "leasing_lld"] = "cash",
    version: str | None = None,
    client_id: str | None = None,
    client_telephone: str | None = None,
    client_email: str | None = None,
    apport: float | None = None,
    duree_mois: int | None = None,
    date_souhaitee: str | None = None,
) -> Any:
    """Crée un devis dans EasyDevis. N'appeler qu'APRÈS confirmation explicite de l'utilisateur.

    prestations : liste des service_id issus de lister_prestations.
    client_id : identifiant d'un client existant (rechercher_clients), sinon un client est créé.
    date_souhaitee : AAAA-MM-JJ, aujourd'hui ou plus tard.
    Les prix et la mensualité sont calculés par EasyDevis.
    """
    financing: dict[str, Any] = {"type": type_financement}
    if type_financement != "cash":
        financing["down_payment"] = apport or 0
        financing["duration_months"] = duree_mois
    customer: dict[str, Any] = {
        "first_name": client_prenom,
        "last_name": client_nom,
        "phone": client_telephone,
        "email": client_email,
    }
    if client_id:
        customer["id"] = client_id
    payload = {
        "vehicle": {
            "brand": marque,
            "model": modele,
            "version": version,
            "year": annee,
            "color": couleur,
            "condition": etat,
        },
        "customer": customer,
        "service_ids": prestations,
        "financing": financing,
        "requested_date": date_souhaitee,
    }
    return await _call("POST", "/quotes", ticket, json=payload)


@mcp.tool()
async def lister_devis(
    ticket: str,
    recherche: str = "",
    statut: Literal["pending", "confirmed", "completed"] | None = None,
    periode: Literal["all", "today", "week", "month"] = "all",
    limite: int = 10,
) -> Any:
    """Liste les devis de la concession, du plus récent au plus ancien."""
    params: dict[str, Any] = {"period": periode, "limit": max(1, min(limite, 50))}
    if recherche:
        params["search"] = recherche
    if statut:
        params["status"] = statut
    return await _call("GET", "/quotes", ticket, params=params)


@mcp.tool()
async def consulter_devis(ticket: str, devis_id: str) -> Any:
    """Détail complet d'un devis : véhicule, prestations, financement, client, total."""
    return await _call("GET", f"/quotes/{devis_id}", ticket)


@mcp.tool()
async def changer_statut_devis(
    ticket: str,
    devis_id: str, statut: Literal["pending", "confirmed", "completed"]
) -> Any:
    """Change le statut d'un devis. N'appeler qu'APRÈS confirmation explicite de l'utilisateur."""
    return await _call("PATCH", f"/quotes/{devis_id}", ticket, json={"status": statut})


@mcp.tool()
async def statistiques_devis(ticket: str) -> Any:
    """Indicateurs de la concession : volumes par statut, chiffre d'affaires, panier moyen,
    taux de conversion, évolution sur 6 mois et derniers devis."""
    return await _call("GET", "/quotes/stats", ticket)


if __name__ == "__main__":
    mcp.run()
