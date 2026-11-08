"""Client HTTP minimal de l'API PerformCar EasyDevis.

Chaque appel agit au nom de l'utilisateur connecté à EasyDevis : le ticket de
conversation (fourni au modèle par EasyDevis) et la clé de service de ce serveur
sont envoyés en en-têtes ``X-Assistant-Ticket`` et ``X-Assistant-Key``.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

import httpx


class EasyDevisError(Exception):
    """An API call failed; ``code`` is the API error key."""

    def __init__(self, status: int, code: str, details: Any = None) -> None:
        super().__init__(f"{status} {code}")
        self.status = status
        self.code = code
        self.details = details


def monthly_payment(total: float, down_payment: float, months: int) -> float:
    """Mirror of the EasyDevis rule: (total - down payment) / months, half-up to the cent."""
    amount = (Decimal(str(total)) - Decimal(str(down_payment))) / Decimal(months)
    return float(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


class EasyDevisClient:
    """Access to the EasyDevis API on behalf of the user of a conversation.

    Each call carries the conversation ticket (given to the model by EasyDevis
    for the current turn) and the service key that only this server holds. The
    API resolves them to the connected user, with that user's permissions and
    dealership.
    """

    def __init__(
        self,
        base_url: str,
        service_key: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._service_key = service_key
        self._http = httpx.AsyncClient(
            base_url=base_url.rstrip("/"), timeout=30.0, transport=transport
        )

    async def request(self, method: str, path: str, ticket: str, **kwargs: Any) -> Any:
        """Send one request as the user the ticket belongs to."""
        if not ticket:
            raise EasyDevisError(401, "error.assistant.ticket_missing")
        headers = {"X-Assistant-Ticket": ticket, "X-Assistant-Key": self._service_key}
        response = await self._http.request(method, path, headers=headers, **kwargs)
        if response.is_error:
            raise _error(response)
        return response.json()

    async def aclose(self) -> None:
        await self._http.aclose()


def _error(response: httpx.Response) -> EasyDevisError:
    try:
        body = response.json()
    except ValueError:
        body = {}
    code = body.get("error") or body.get("detail") or "error.http"
    return EasyDevisError(response.status_code, str(code), body.get("details"))
