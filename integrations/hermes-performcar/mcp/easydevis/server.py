"""Serveur MCP « easydevis » : expose l'API PerformCar EasyDevis à Hermes.

Il se connecte avec un compte EasyDevis dédié (rôle dealer, rattaché à une
concession) : l'API applique donc ses propres permissions et le périmètre de
la concession. Aucune suppression n'est exposée.

Variables d'environnement : EASYDEVIS_API_URL, EASYDEVIS_EMAIL, EASYDEVIS_PASSWORD.
"""

from __future__ import annotations

import os
from typing import Any, Literal

from mcp.server.mcpserver import MCPServer

from easydevis_client import EasyDevisClient, EasyDevisError, monthly_payment

mcp = MCPServer("easydevis")

_client: EasyDevisClient | None = None


def client() -> EasyDevisClient:
    """Return the shared API client, built from the environment on first use."""
    global _client
    if _client is None:
        _client = EasyDevisClient(
            base_url=os.environ.get("EASYDEVIS_API_URL", "http://127.0.0.1:8000/api/v1"),
            email=os.environ["EASYDEVIS_EMAIL"],
            password=os.environ["EASYDEVIS_PASSWORD"],
        )
    return _client


async def _call(method: str, path: str, **kwargs: Any) -> Any:
    """Call the API and turn API errors into a readable result for the model."""
    try:
        return await client().request(method, path, **kwargs)
    except EasyDevisError as error:
        return {"erreur": error.code, "statut_http": error.status, "details": error.details}


@mcp.tool()
async def ma_concession() -> Any:
    """Concession du compte de l'assistant (nom, adresse, téléphone, e-mail)."""
    return await _call("GET", "/dealership")


@mcp.tool()
async def catalogue_vehicules() -> Any:
    """Catalogue véhicules : marques, modèles, versions et couleurs proposés."""
    return await _call("GET", "/catalog/vehicles")


@mcp.tool()
async def lister_prestations() -> Any:
    """Prestations actives avec leur prix TTC, catégorie et identifiant (service_id).

    Ce sont les seuls prix valables pour un devis.
    """
    return await _call("GET", "/catalog/services")


@mcp.tool()
async def rechercher_clients(recherche: str = "", limite: int = 10) -> Any:
    """Cherche un client existant de la concession (nom, téléphone ou e-mail)."""
    params = {"limit": max(1, min(limite, 50))}
    if recherche:
        params["search"] = recherche
    return await _call("GET", "/customers", params=params)


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
    return await _call("POST", "/quotes", json=payload)


@mcp.tool()
async def lister_devis(
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
    return await _call("GET", "/quotes", params=params)


@mcp.tool()
async def consulter_devis(devis_id: str) -> Any:
    """Détail complet d'un devis : véhicule, prestations, financement, client, total."""
    return await _call("GET", f"/quotes/{devis_id}")


@mcp.tool()
async def changer_statut_devis(
    devis_id: str, statut: Literal["pending", "confirmed", "completed"]
) -> Any:
    """Change le statut d'un devis. N'appeler qu'APRÈS confirmation explicite de l'utilisateur."""
    return await _call("PATCH", f"/quotes/{devis_id}", json={"status": statut})


@mcp.tool()
async def statistiques_devis() -> Any:
    """Indicateurs de la concession : volumes par statut, chiffre d'affaires, panier moyen,
    taux de conversion, évolution sur 6 mois et derniers devis."""
    return await _call("GET", "/quotes/stats")


if __name__ == "__main__":
    mcp.run()
