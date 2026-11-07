import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.api.decorators import audit_unexpected_failure
from app.api.deps import SessionDep, require_any_permission, require_permission
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.rbac import (
    AssignmentsUpdate,
    PermissionSetCreate,
    PermissionSetListResponse,
    PermissionSetResponse,
    PermissionSetUpdate,
    RbacPermissionCatalog,
    RoleCreate,
    RoleListResponse,
    RoleResponse,
    RoleUpdate,
    UserAccessResponse,
)
from app.schemas.user_activity import ActivityType, ResourceType
from app.services.admin.rbac_service import (
    create_permission_set_service,
    create_role_service,
    delete_permission_set_service,
    delete_role_service,
    get_permission_set_service,
    get_rbac_permission_catalog_service,
    get_role_service,
    get_user_access_service,
    list_permission_sets_service,
    list_roles_service,
    set_user_permission_sets_service,
    set_user_roles_service,
    update_permission_set_service,
    update_role_service,
)

router = APIRouter()

RolesRead = Annotated[User, Depends(require_permission(Permission.ROLES_READ))]
RolesWrite = Annotated[User, Depends(require_permission(Permission.ROLES_WRITE))]
SetsRead = Annotated[User, Depends(require_permission(Permission.PERMISSION_SETS_READ))]
SetsWrite = Annotated[
    User, Depends(require_permission(Permission.PERMISSION_SETS_WRITE))
]
# The key catalog feeds the permission-set grid as much as the role pages.
CatalogRead = Annotated[
    User,
    Depends(
        require_any_permission(Permission.ROLES_READ, Permission.PERMISSION_SETS_READ)
    ),
]
UsersRead = Annotated[User, Depends(require_permission(Permission.USERS_READ))]
UsersWrite = Annotated[User, Depends(require_permission(Permission.USERS_WRITE))]


@router.get("/rbac/permissions", response_model=RbacPermissionCatalog)
async def list_rbac_permissions(_admin: CatalogRead) -> RbacPermissionCatalog:
    """Return every permission key with its resource, action and audience."""
    return get_rbac_permission_catalog_service()


@router.get("/rbac/permission-sets", response_model=PermissionSetListResponse)
async def list_permission_sets_endpoint(
    _admin: SetsRead, session: SessionDep
) -> PermissionSetListResponse:
    """List every permission set."""
    return await list_permission_sets_service(session)


@router.post(
    "/rbac/permission-sets",
    response_model=PermissionSetResponse,
    status_code=status.HTTP_201_CREATED,
)
@audit_unexpected_failure(
    activity_type=ActivityType.CREATE,
    resource_type=ResourceType.PERMISSION_SET,
    endpoint="/admin/rbac/permission-sets",
)
async def create_permission_set_endpoint(
    request: Request,
    current_user: SetsWrite,
    session: SessionDep,
    payload: PermissionSetCreate,
) -> PermissionSetResponse:
    """Create a custom permission set."""
    return await create_permission_set_service(request, session, current_user, payload)


@router.get("/rbac/permission-sets/{set_id}", response_model=PermissionSetResponse)
async def get_permission_set_endpoint(
    set_id: uuid.UUID, _admin: SetsRead, session: SessionDep
) -> PermissionSetResponse:
    """Return one permission set."""
    return await get_permission_set_service(session, set_id)


@router.patch("/rbac/permission-sets/{set_id}", response_model=PermissionSetResponse)
@audit_unexpected_failure(
    activity_type=ActivityType.UPDATE,
    resource_type=ResourceType.PERMISSION_SET,
    endpoint="/admin/rbac/permission-sets/{set_id}",
)
async def update_permission_set_endpoint(
    request: Request,
    set_id: uuid.UUID,
    current_user: SetsWrite,
    session: SessionDep,
    payload: PermissionSetUpdate,
) -> PermissionSetResponse:
    """Edit a custom permission set."""
    return await update_permission_set_service(
        request, session, current_user, set_id, payload
    )


@router.delete("/rbac/permission-sets/{set_id}", response_model=Message)
@audit_unexpected_failure(
    activity_type=ActivityType.DELETE,
    resource_type=ResourceType.PERMISSION_SET,
    endpoint="/admin/rbac/permission-sets/{set_id}",
)
async def delete_permission_set_endpoint(
    request: Request,
    set_id: uuid.UUID,
    current_user: SetsWrite,
    session: SessionDep,
) -> Message:
    """Delete a custom permission set nothing uses."""
    return await delete_permission_set_service(request, session, current_user, set_id)


@router.get("/rbac/roles", response_model=RoleListResponse)
async def list_roles_endpoint(
    _admin: RolesRead, session: SessionDep
) -> RoleListResponse:
    """List every role."""
    return await list_roles_service(session)


@router.post(
    "/rbac/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
)
@audit_unexpected_failure(
    activity_type=ActivityType.CREATE,
    resource_type=ResourceType.ROLE,
    endpoint="/admin/rbac/roles",
)
async def create_role_endpoint(
    request: Request,
    current_user: RolesWrite,
    session: SessionDep,
    payload: RoleCreate,
) -> RoleResponse:
    """Create a custom role."""
    return await create_role_service(request, session, current_user, payload)


@router.get("/rbac/roles/{role_id}", response_model=RoleResponse)
async def get_role_endpoint(
    role_id: uuid.UUID, _admin: RolesRead, session: SessionDep
) -> RoleResponse:
    """Return one role."""
    return await get_role_service(session, role_id)


@router.patch("/rbac/roles/{role_id}", response_model=RoleResponse)
@audit_unexpected_failure(
    activity_type=ActivityType.UPDATE,
    resource_type=ResourceType.ROLE,
    endpoint="/admin/rbac/roles/{role_id}",
)
async def update_role_endpoint(
    request: Request,
    role_id: uuid.UUID,
    current_user: RolesWrite,
    session: SessionDep,
    payload: RoleUpdate,
) -> RoleResponse:
    """Edit a custom role."""
    return await update_role_service(request, session, current_user, role_id, payload)


@router.delete("/rbac/roles/{role_id}", response_model=Message)
@audit_unexpected_failure(
    activity_type=ActivityType.DELETE,
    resource_type=ResourceType.ROLE,
    endpoint="/admin/rbac/roles/{role_id}",
)
async def delete_role_endpoint(
    request: Request,
    role_id: uuid.UUID,
    current_user: RolesWrite,
    session: SessionDep,
) -> Message:
    """Delete a custom role no account holds."""
    return await delete_role_service(request, session, current_user, role_id)


@router.get("/users/{user_id}/access", response_model=UserAccessResponse)
async def get_user_access_endpoint(
    user_id: uuid.UUID, current_user: UsersRead, session: SessionDep
) -> UserAccessResponse:
    """Return an account's assignments, direct grants and effective keys."""
    return await get_user_access_service(session, current_user, user_id)


@router.put("/users/{user_id}/roles", response_model=UserAccessResponse)
@audit_unexpected_failure(
    activity_type=ActivityType.UPDATE,
    resource_type=ResourceType.USER,
    endpoint="/admin/users/{user_id}/roles",
)
async def set_user_roles_endpoint(
    request: Request,
    user_id: uuid.UUID,
    current_user: UsersWrite,
    session: SessionDep,
    payload: AssignmentsUpdate,
) -> UserAccessResponse:
    """Replace an account's roles."""
    return await set_user_roles_service(
        request, session, current_user, user_id, payload
    )


@router.put("/users/{user_id}/permission-sets", response_model=UserAccessResponse)
@audit_unexpected_failure(
    activity_type=ActivityType.UPDATE,
    resource_type=ResourceType.USER,
    endpoint="/admin/users/{user_id}/permission-sets",
)
async def set_user_permission_sets_endpoint(
    request: Request,
    user_id: uuid.UUID,
    current_user: UsersWrite,
    session: SessionDep,
    payload: AssignmentsUpdate,
) -> UserAccessResponse:
    """Replace the sets assigned directly to an account."""
    return await set_user_permission_sets_service(
        request, session, current_user, user_id, payload
    )
