from fastapi import APIRouter

from app.api.routes import (
    admin,
    announcements,
    auth,
    catalog,
    customers,
    dealership,
    files,
    health,
    notifications,
    quotes,
    support,
    system_settings,
    users,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(
    announcements.router, prefix="/announcements", tags=["announcements"]
)
api_router.include_router(support.router, prefix="/support", tags=["support"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(dealership.router, prefix="/dealership", tags=["dealership"])
api_router.include_router(system_settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(files.router, tags=["files"])
