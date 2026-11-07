"""Last-resort MFA reset for the root superadmin, run from a server shell.

Usage: ``python -m app.cli.reset_mfa <email>``. Every other account is reset
through the admin API, so this command refuses anything but the root superadmin.
"""

import argparse
import asyncio
import sys

from app import models  # noqa: F401 - registers every mapper for the queries below
from app.core.db import AsyncSessionLocal, engine
from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.core.redis import close_redis, init_redis
from app.repositories.user import get_user_by_email
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.log_activity import log_activity
from app.use_cases.mfa_reset import reset_user_mfa


async def run(email: str) -> int:
    """Reset the root superadmin's MFA and return the process exit code."""
    await init_redis()
    try:
        async with AsyncSessionLocal() as session:
            user = await get_user_by_email(session, email)
            if user is None:
                print(ErrorMessages.USER_NOT_FOUND, file=sys.stderr)
                return 1
            if not user.is_root_superadmin:
                print(ErrorMessages.MFA_RESET_ROOT_ONLY, file=sys.stderr)
                return 1

            revoked = await reset_user_mfa(session, user.id)
            await log_activity(
                session=session,
                user_id=user.id,
                activity_type=ActivityType.UPDATE,
                resource_type=ResourceType.USER,
                resource_id=user.id,
                details={"action": "cli_reset_mfa", "revoked_sessions": revoked},
            )
    finally:
        await close_redis()

    print(SuccessMessages.ADMIN_USER_MFA_RESET)
    return 0


async def _run_and_dispose(email: str) -> int:
    """Run the reset, then close the engine's connections inside the same loop."""
    try:
        return await run(email)
    finally:
        await engine.dispose()


def main() -> int:
    """Parse the command line and run the reset."""
    parser = argparse.ArgumentParser(
        description="Reset the MFA enrollment of the root superadmin."
    )
    parser.add_argument("email", help="Email of the root superadmin")
    args = parser.parse_args()
    return asyncio.run(_run_and_dispose(args.email))


if __name__ == "__main__":
    sys.exit(main())
