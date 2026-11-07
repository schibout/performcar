"""Client HTTP minimal de l'API PerformCar EasyDevis.

L'API pose le jeton d'accès dans un cookie à la connexion et accepte aussi un
en-tête ``Authorization: Bearer``. Le client se connecte au premier appel,
réutilise le jeton, et se reconnecte une fois si l'API répond 401.
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
    """Authenticated access to the EasyDevis API with one service account."""

    def __init__(
        self,
        base_url: str,
        email: str,
        password: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._email = email
        self._password = password
        self._token: str | None = None
        self._http = httpx.AsyncClient(
            base_url=base_url.rstrip("/"), timeout=30.0, transport=transport
        )

    async def _login(self) -> None:
        response = await self._http.post(
            "/auth/login", data={"username": self._email, "password": self._password}
        )
        if response.status_code != 200:
            raise _error(response)
        token = response.cookies.get("access_token")
        if not token:
            # Compte avec double authentification : non pris en charge par l'assistant.
            raise EasyDevisError(response.status_code, "error.assistant.login_without_token")
        self._token = token

    async def request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Send one request, logging in first and retrying once on 401."""
        for attempt in range(2):
            if self._token is None:
                await self._login()
            response = await self._http.request(
                method, path, headers={"Authorization": f"Bearer {self._token}"}, **kwargs
            )
            if response.status_code == 401 and attempt == 0:
                self._token = None
                continue
            if response.is_error:
                raise _error(response)
            return response.json()
        raise EasyDevisError(401, "error.assistant.unauthorized")

    async def aclose(self) -> None:
        await self._http.aclose()


def _error(response: httpx.Response) -> EasyDevisError:
    try:
        body = response.json()
    except ValueError:
        body = {}
    code = body.get("error") or body.get("detail") or "error.http"
    return EasyDevisError(response.status_code, str(code), body.get("details"))
