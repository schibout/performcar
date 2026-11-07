"""Quote generator: business rules, dealership perimeter and role-based access."""

from datetime import timedelta

from httpx import AsyncClient
from sqlalchemy import select

from app.core.messages.error_message import ErrorMessages
from app.models.quote import Quote, QuoteService
from app.tests.admin.conftest import get_user_id, login, register_and_verify
from app.tests.conftest import TestingSessionLocal
from app.tests.quotes.conftest import (
    Catalog,
    make_dealer,
    make_dealership,
    make_network_admin,
    quote_payload,
)
from app.tests.support.conftest import ClientFactory
from app.utils import utc_now


async def _create(client: AsyncClient, catalog: Catalog, **overrides) -> dict:
    """Create a quote and return it."""
    response = await client.post("/quotes", json=quote_payload(catalog, **overrides))
    assert response.status_code == 201, response.text
    return response.json()


# --- Access -------------------------------------------------------------------------


async def test_quotes_require_authentication(client: AsyncClient) -> None:
    """An anonymous caller is refused."""
    assert (await client.get("/quotes")).status_code == 401
    assert (await client.get("/catalog/services")).status_code == 401


async def test_regular_user_without_dealer_role_is_refused(
    client_factory: ClientFactory,
) -> None:
    """The default user role carries no quote permission."""
    client = await client_factory()
    await register_and_verify(client, "plain@test.com")
    await login(client, "plain@test.com")

    for method, path in [
        ("GET", "/quotes"),
        ("POST", "/quotes"),
        ("GET", "/customers"),
        ("GET", "/catalog/vehicles"),
        ("GET", "/dealership"),
    ]:
        response = await client.request(method, path, json={})
        assert response.status_code == 403, (method, path, response.text)


async def test_dealer_without_dealership_is_refused(
    client_factory: ClientFactory,
) -> None:
    """A dealer not attached to a dealership reaches nothing."""
    client = await make_dealer(client_factory, "orphan@test.com", None)
    response = await client.get("/quotes")
    assert response.status_code == 403
    assert response.json()["error"] == ErrorMessages.NO_DEALERSHIP


async def test_dealer_cannot_use_admin_routes(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Dealer keys never open the admin panel."""
    dealership = await make_dealership("Paris")
    client = await make_dealer(client_factory, "dealer@test.com", dealership)
    assert (await client.get("/admin/quotes")).status_code == 403
    response = await client.post(
        "/admin/catalog/services",
        json={"name": "Hack", "price": 1, "category_id": str(catalog.category_id)},
    )
    assert response.status_code == 403
    assert (await client.get("/admin/dealerships")).status_code == 403


# --- Creation rules -----------------------------------------------------------------


async def test_create_quote_computes_totals_server_side(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Prices come from the catalog and the monthly payment is computed."""
    dealership = await make_dealership("Paris")
    client = await make_dealer(client_factory, "dealer@test.com", dealership)

    quote = await _create(client, catalog)

    assert quote["status"] == "pending"
    assert quote["reference_number"].startswith(f"QUO-{utc_now():%Y%m%d}-")
    assert quote["total_price"] == 1450.0
    assert quote["financing"] == {
        "type": "credit",
        "down_payment": 250.0,
        "duration_months": 12,
        "monthly_payment": 100.0,
    }
    assert {line["price"] for line in quote["services"]} == {1200.0, 250.0}
    assert quote["dealership"]["id"] == str(dealership)
    assert quote["customer"]["dealership_id"] == str(dealership)
    assert quote["customer"]["phone"] == "0612345678"
    assert quote["created_by"]["email"] == "dealer@test.com"

    second = await _create(client, catalog)
    assert second["reference_number"] != quote["reference_number"]


async def test_cash_quote_has_no_terms(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """A cash quote stores no down payment, duration or monthly payment."""
    dealership = await make_dealership("Paris")
    client = await make_dealer(client_factory, "dealer@test.com", dealership)
    quote = await _create(client, catalog, financing={"type": "cash"})
    assert quote["financing"]["monthly_payment"] is None
    assert quote["financing"]["down_payment"] is None


async def test_create_quote_validation(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Invalid payloads are refused with 422."""
    dealership = await make_dealership("Paris")
    client = await make_dealer(client_factory, "dealer@test.com", dealership)
    base = quote_payload(catalog)
    yesterday = (utc_now() - timedelta(days=1)).date().isoformat()
    cases = [
        {"vehicle": {**base["vehicle"], "year": 1990}},
        {"vehicle": {**base["vehicle"], "condition": "broken"}},
        {"customer": {**base["customer"], "phone": "12345"}},
        {"customer": {**base["customer"], "first_name": "J3an"}},
        {"customer": {**base["customer"], "email": "not-an-email"}},
        {"requested_date": yesterday},
        {"financing": {"type": "credit", "down_payment": 5000, "duration_months": 12}},
        {"financing": {"type": "credit", "down_payment": 0}},
        {"financing": {"type": "credit", "duration_months": 200}},
        {"service_ids": [str(catalog.inactive_id)]},
    ]
    for override in cases:
        response = await client.post("/quotes", json=quote_payload(catalog, **override))
        assert response.status_code == 422, (override, response.text)


# --- Dealership perimeter -------------------------------------------------------------


async def test_dealers_only_see_their_dealership(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Another dealership's quotes and customers answer 404 to every verb."""
    paris = await make_dealership("Paris")
    lyon = await make_dealership("Lyon")
    dealer_a = await make_dealer(client_factory, "a@test.com", paris)
    dealer_b = await make_dealer(client_factory, "b@test.com", lyon)
    quote = await _create(dealer_a, catalog)
    quote_id = quote["id"]
    customer_id = quote["customer"]["id"]

    assert (await dealer_b.get("/quotes")).json()["total"] == 0
    assert (await dealer_b.get(f"/quotes/{quote_id}")).status_code == 404
    patched = await dealer_b.patch(f"/quotes/{quote_id}", json={"status": "completed"})
    assert patched.status_code == 404
    assert (await dealer_b.delete(f"/quotes/{quote_id}")).status_code == 404
    assert (await dealer_b.get("/customers")).json()["total"] == 0
    assert (await dealer_b.get(f"/customers/{customer_id}")).status_code == 404
    assert (await dealer_b.delete(f"/customers/{customer_id}")).status_code == 404

    stolen = quote_payload(catalog)
    stolen["customer"] = {**stolen["customer"], "id": customer_id}
    assert (await dealer_b.post("/quotes", json=stolen)).status_code == 404

    assert (await dealer_a.get(f"/quotes/{quote_id}")).status_code == 200
    assert (await dealer_a.get("/quotes")).json()["total"] == 1


async def test_dealer_cannot_change_its_dealership_or_access(
    client_factory: ClientFactory,
) -> None:
    """The dealer surface exposes no way to move or upgrade an account."""
    paris = await make_dealership("Paris")
    client = await make_dealer(client_factory, "dealer@test.com", paris)
    me = (await client.get("/users/me")).json()
    assert me["dealership_id"] == str(paris)
    lyon = await make_dealership("Lyon")
    user_id = await get_user_id("dealer@test.com")
    response = await client.patch(
        f"/admin/users/{user_id}", json={"dealership_id": str(lyon)}
    )
    assert response.status_code == 403


# --- Updates ---------------------------------------------------------------------------


async def test_update_recomputes_and_keeps_frozen_prices(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """A kept service keeps its price; totals and monthly payment follow."""
    paris = await make_dealership("Paris")
    dealer = await make_dealer(client_factory, "dealer@test.com", paris)
    admin = await make_network_admin(client_factory, "admin@test.com")
    quote = await _create(dealer, catalog)

    raised = await admin.patch(
        f"/admin/catalog/services/{catalog.warranty_id}", json={"price": 1500}
    )
    assert raised.status_code == 200, raised.text

    response = await dealer.patch(
        f"/quotes/{quote['id']}",
        json={"service_ids": [str(catalog.warranty_id)], "status": "confirmed"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total_price"] == 1200.0
    assert body["status"] == "confirmed"
    assert body["financing"]["monthly_payment"] == round((1200 - 250) / 12, 2)

    too_high = await dealer.patch(
        f"/quotes/{quote['id']}",
        json={
            "financing": {"type": "credit", "down_payment": 2000, "duration_months": 12}
        },
    )
    assert too_high.status_code == 422
    assert too_high.json()["error"] == ErrorMessages.QUOTE_DOWN_PAYMENT_TOO_HIGH


async def test_delete_quote_and_customer_rules(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """A customer with quotes cannot be deleted; deleting a quote drops its lines."""
    paris = await make_dealership("Paris")
    dealer = await make_dealer(client_factory, "dealer@test.com", paris)
    quote = await _create(dealer, catalog)
    customer_id = quote["customer"]["id"]

    blocked = await dealer.delete(f"/customers/{customer_id}")
    assert blocked.status_code == 409
    assert blocked.json()["error"] == ErrorMessages.CUSTOMER_HAS_QUOTES

    assert (await dealer.delete(f"/quotes/{quote['id']}")).status_code == 200
    async with TestingSessionLocal() as session:
        assert (await session.execute(select(Quote))).first() is None
        assert (await session.execute(select(QuoteService))).first() is None
    assert (await dealer.delete(f"/customers/{customer_id}")).status_code == 200


async def test_customer_crud(client_factory: ClientFactory) -> None:
    """A dealer creates, searches and edits its customers."""
    paris = await make_dealership("Paris")
    dealer = await make_dealer(client_factory, "dealer@test.com", paris)
    created = await dealer.post(
        "/customers",
        json={"first_name": "Marie", "last_name": "Martin", "phone": "+33623456789"},
    )
    assert created.status_code == 201, created.text
    customer = created.json()
    assert customer["dealership_id"] == str(paris)

    found = (await dealer.get("/customers", params={"search": "mart"})).json()
    assert found["total"] == 1
    assert found["items"][0]["quote_count"] == 0

    edited = await dealer.patch(
        f"/customers/{customer['id']}", json={"email": "marie@test.com"}
    )
    assert edited.status_code == 200
    assert edited.json()["email"] == "marie@test.com"
    invalid = await dealer.patch(f"/customers/{customer['id']}", json={"phone": "abc"})
    assert invalid.status_code == 422


async def test_history_filters_sort_and_stats(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Search, status filter, sort and dashboard figures."""
    paris = await make_dealership("Paris")
    dealer = await make_dealer(client_factory, "dealer@test.com", paris)
    first = await _create(dealer, catalog, service_ids=[str(catalog.delivery_id)])
    second = await _create(
        dealer,
        catalog,
        customer={"first_name": "Zoé", "last_name": "Zola"},
        financing=None,
    )
    await dealer.patch(f"/quotes/{second['id']}", json={"status": "completed"})

    by_name = (await dealer.get("/quotes", params={"search": "zola"})).json()
    assert [item["id"] for item in by_name["items"]] == [second["id"]]
    completed = (await dealer.get("/quotes", params={"status": "completed"})).json()
    assert completed["total"] == 1
    by_price = (
        await dealer.get("/quotes", params={"sort": "price", "order": "asc"})
    ).json()
    assert [item["id"] for item in by_price["items"]] == [first["id"], second["id"]]

    stats = (await dealer.get("/quotes/stats")).json()
    assert stats["total"] == 2
    assert stats["pending"] == 1
    assert stats["completed"] == 1
    assert stats["revenue"] == 1450.0
    assert stats["conversion_rate"] == 50.0
    assert stats["current_month"] == 2
    assert len(stats["monthly"]) == 6
    assert len(stats["recent"]) == 2


# --- Catalog and dealership of the dealer ---------------------------------------------


async def test_dealer_reads_catalog_and_edits_its_dealership(
    client_factory: ClientFactory,
    catalog: Catalog,  # noqa: ARG001
) -> None:
    """Only active services are offered; the dealership details are editable."""
    paris = await make_dealership("Paris")
    dealer = await make_dealer(client_factory, "dealer@test.com", paris)

    services = (await dealer.get("/catalog/services")).json()
    assert {item["name"] for item in services["items"]} == {
        "Garantie étendue 3 ans",
        "Livraison à domicile",
    }
    vehicles = (await dealer.get("/catalog/vehicles")).json()
    assert vehicles["brands"][0]["models"][0]["versions"][0]["name"] == (
        "Sportback 1.5 TFSI"
    )
    assert vehicles["colors"][0]["name"] == "Blanc"

    response = await dealer.patch("/dealership", json={"address": "1 rue de Paris"})
    assert response.status_code == 200
    assert response.json()["address"] == "1 rue de Paris"


# --- Admin panel ----------------------------------------------------------------------


async def test_network_admin_sees_every_dealership(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """The admin list spans dealerships and can be narrowed to one."""
    paris = await make_dealership("Paris")
    lyon = await make_dealership("Lyon")
    dealer_a = await make_dealer(client_factory, "a@test.com", paris)
    dealer_b = await make_dealer(client_factory, "b@test.com", lyon)
    await _create(dealer_a, catalog)
    quote_b = await _create(dealer_b, catalog)
    admin = await make_network_admin(client_factory, "admin@test.com")

    assert (await admin.get("/admin/quotes")).json()["total"] == 2
    only_lyon = (
        await admin.get("/admin/quotes", params={"dealership_id": str(lyon)})
    ).json()
    assert [item["id"] for item in only_lyon["items"]] == [quote_b["id"]]
    assert (await admin.get("/admin/quotes/stats")).json()["total"] == 2
    patched = await admin.patch(
        f"/admin/quotes/{quote_b['id']}", json={"status": "confirmed"}
    )
    assert patched.json()["status"] == "confirmed"
    assert (await admin.get("/admin/customers")).json()["total"] == 2
    assert (await admin.delete(f"/admin/quotes/{quote_b['id']}")).status_code == 200


async def test_admin_without_quote_permission_is_refused(
    client_factory: ClientFactory,
) -> None:
    """An admin with another role cannot reach the quote panel."""
    from app.tests.admin.conftest import promote_to_admin
    from app.tests.quotes.conftest import assign_role

    client = await client_factory()
    await register_and_verify(client, "support@test.com")
    await promote_to_admin("support@test.com")
    await assign_role("support@test.com", "support_agent")
    await login(client, "support@test.com")
    assert (await client.get("/admin/quotes")).status_code == 403
    assert (await client.get("/admin/dealerships")).status_code == 403
    assert (await client.get("/admin/catalog/services")).status_code == 403


async def test_admin_service_catalog(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Services are created, edited, and deleted only when unused."""
    paris = await make_dealership("Paris")
    dealer = await make_dealer(client_factory, "dealer@test.com", paris)
    await _create(dealer, catalog)
    admin = await make_network_admin(client_factory, "admin@test.com")

    listing = (await admin.get("/admin/catalog/services")).json()
    assert len(listing["items"]) == 3
    created = await admin.post(
        "/admin/catalog/services",
        json={
            "name": "Vitres teintées",
            "price": 380,
            "category_id": str(catalog.category_id),
        },
    )
    assert created.status_code == 201, created.text
    service_id = created.json()["id"]
    unknown = await admin.post(
        "/admin/catalog/services",
        json={"name": "X service", "price": 1, "category_id": service_id},
    )
    assert unknown.status_code == 404

    used = await admin.delete(f"/admin/catalog/services/{catalog.warranty_id}")
    assert used.status_code == 409
    assert used.json()["error"] == ErrorMessages.SERVICE_IN_USE
    assert (
        await admin.delete(f"/admin/catalog/services/{service_id}")
    ).status_code == 200


async def test_admin_dealerships_and_user_attachment(
    client_factory: ClientFactory, catalog: Catalog
) -> None:
    """Dealerships are managed and users attached to them."""
    admin = await make_network_admin(client_factory, "admin@test.com")
    created = await admin.post(
        "/admin/dealerships",
        json={"name": "PerformCar Lyon", "phone": "04 78 90 12 34"},
    )
    assert created.status_code == 201, created.text
    dealership_id = created.json()["id"]
    assert created.json()["phone"] == "0478901234"

    dealer = await make_dealer(client_factory, "dealer@test.com", None)
    user_id = await get_user_id("dealer@test.com")
    attached = await admin.patch(
        f"/admin/users/{user_id}", json={"dealership_id": dealership_id}
    )
    assert attached.status_code == 200, attached.text
    assert attached.json()["user"]["dealership_id"] == dealership_id
    missing = await admin.patch(
        f"/admin/users/{user_id}", json={"dealership_id": user_id}
    )
    assert missing.status_code == 404

    await _create(dealer, catalog)
    listing = (await admin.get("/admin/dealerships")).json()
    assert listing["items"][0]["user_count"] == 1
    assert listing["items"][0]["quote_count"] == 1
    blocked = await admin.delete(f"/admin/dealerships/{dealership_id}")
    assert blocked.status_code == 409

    empty = await admin.post("/admin/dealerships", json={"name": "Vide"})
    assert (
        await admin.delete(f"/admin/dealerships/{empty.json()['id']}")
    ).status_code == 200
