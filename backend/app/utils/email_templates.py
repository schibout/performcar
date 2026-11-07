from app.schemas.user import Language


def generate_password_reset_email(
    reset_link: str, project_name: str, lang: str = Language.EN
) -> dict[str, str]:
    """
    Generate subject, HTML, and plain text for password reset email.
    """
    if lang == Language.FR:
        subject = "Demande de réinitialisation du mot de passe"
        greeting = "Bonjour,"
        message = "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau en toute sécurité."
        btn_text = "Réinitialiser le mot de passe"
        link_issue_text = "Le bouton ne fonctionne pas ? Copiez et collez le lien ci-dessous dans votre navigateur :"
        disclaimer = "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Pour votre sécurité, ce lien expirera dans 24 heures."
        footer_text = f"&copy; {project_name}. Tous droits réservés."
        plain_text = f"Veuillez réinitialiser votre mot de passe en cliquant sur le lien suivant : {reset_link}"
    else:
        subject = "Password Reset Request"
        greeting = "Hi there,"
        message = "We received a request to reset your password. Click the button below to choose a new one safely."
        btn_text = "Reset Password"
        link_issue_text = "Having trouble with the button? Copy and paste the link below into your browser:"
        disclaimer = "If you didn't request a password reset, you can safely ignore this email. For your security, this link will expire in 24 hours."
        footer_text = f"&copy; {project_name}. All rights reserved."
        plain_text = f"Please reset your password by clicking on the link: {reset_link}"

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ padding: 20px !important; }}
            .container {{ width: 100% !important; border-radius: 12px !important; overflow: hidden; }}
            .content {{ padding: 32px 24px !important; }}
            .header {{ padding: 32px 24px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;">
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:48px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color:#ffffff;padding:40px 48px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <div style="display:inline-block;padding:12px;background-color:#eff6ff;border-radius:12px;margin-bottom:16px;">
                                <span style="font-size:32px;">🔐</span>
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">{project_name}</h1>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td class="content" style="padding:40px 48px;">
                            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">{greeting}</p>
                            <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#475569;">{message}</p>

                            <!-- Button CTA -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{reset_link}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 6px -1px rgba(37,99,235,0.2);">
                                            {btn_text}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin:40px 0;border-top:1px solid #f1f5f9;"></div>

                            <!-- Text Link Issue -->
                            <p style="margin:0 0 12px;font-size:14px;color:#64748b;">{link_issue_text}</p>
                            <p style="margin:0 0 32px;font-size:13px;word-break:break-all;line-height:1.5;">
                                <a href="{reset_link}" style="color:#2563eb;text-decoration:underline;">{reset_link}</a>
                            </p>

                            <div style="padding:20px;background-color:#f8fafc;border-radius:12px;border-left:4px solid #e2e8f0;">
                                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;font-style:italic;">{disclaimer}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 48px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{project_name}</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">{footer_text}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return {"subject": subject, "html": html, "plain_text": plain_text}


def generate_password_reset_notification_email(
    project_name: str, lang: str = Language.EN
) -> dict[str, str]:
    """
    Generate subject, HTML, and plain text for a password-reset notification.

    Sent when the user's password was rotated server-side (e.g. by an admin
    forced reset). Deliberately link-free: the user must recover access via
    the standard 'Forgot Password' flow on the login page so the recovery
    path stays auditable and tied to a user-initiated request.
    """
    if lang == Language.FR:
        subject = "Votre mot de passe a été réinitialisé"
        greeting = "Bonjour,"
        message = "Le mot de passe de votre compte a été réinitialisé. Pour retrouver l'accès à votre compte, veuillez utiliser le lien « Mot de passe oublié » de la page de connexion afin de définir un nouveau mot de passe."
        disclaimer = "Si vous n'attendiez pas cette opération, veuillez contacter le support immédiatement."
        footer_text = f"&copy; {project_name}. Tous droits réservés."
        plain_text = (
            "Le mot de passe de votre compte a été réinitialisé. Pour retrouver "
            "l'accès, veuillez utiliser le lien « Mot de passe oublié » de la page "
            "de connexion. Si vous n'attendiez pas cette opération, veuillez "
            "contacter le support immédiatement."
        )
    else:
        subject = "Your password has been reset"
        greeting = "Hi there,"
        message = "Your account password has been reset. To regain access, please use the 'Forgot Password' link on the login page to set a new password."
        disclaimer = "If you didn't expect this, please contact support immediately."
        footer_text = f"&copy; {project_name}. All rights reserved."
        plain_text = (
            "Your account password has been reset. To regain access, please "
            "use the 'Forgot Password' link on the login page. "
            "If you didn't expect this, please contact support immediately."
        )

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ padding: 20px !important; }}
            .container {{ width: 100% !important; border-radius: 12px !important; overflow: hidden; }}
            .content {{ padding: 32px 24px !important; }}
            .header {{ padding: 32px 24px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;">
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:48px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color:#ffffff;padding:40px 48px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <div style="display:inline-block;padding:12px;background-color:#eff6ff;border-radius:12px;margin-bottom:16px;">
                                <span style="font-size:32px;">🔐</span>
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">{project_name}</h1>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td class="content" style="padding:40px 48px;">
                            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">{greeting}</p>
                            <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#475569;">{message}</p>

                            <div style="padding:20px;background-color:#f8fafc;border-radius:12px;border-left:4px solid #e2e8f0;">
                                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;font-style:italic;">{disclaimer}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 48px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{project_name}</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">{footer_text}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return {"subject": subject, "html": html, "plain_text": plain_text}


def generate_account_deactivation_email(
    reactivate_link: str,
    grace_days: int,
    project_name: str,
    lang: str = Language.EN,
) -> dict[str, str]:
    """Generate subject, HTML, and plain text for account deactivation notice."""
    if lang == Language.FR:
        subject = "Votre compte a été désactivé"
        greeting = "Bonjour,"
        message = (
            f"Nous avons bien reçu votre demande de suppression de compte. Votre "
            f"compte est désormais désactivé et sera définitivement supprimé dans "
            f"{grace_days} jours."
        )
        cancel_text = (
            "Vous avez changé d'avis ? Vous pouvez annuler la suppression à tout "
            "moment pendant ce délai en vous reconnectant."
        )
        btn_text = "Annuler la suppression"
        link_issue_text = "Le bouton ne fonctionne pas ? Copiez et collez ce lien dans votre navigateur :"
        disclaimer = (
            "Si vous n'êtes pas à l'origine de cette demande, veuillez vous "
            "connecter immédiatement, modifier votre mot de passe et annuler la "
            "suppression."
        )
        footer_text = f"&copy; {project_name}. Tous droits réservés."
        plain_text = (
            f"Votre compte a été désactivé et sera supprimé dans {grace_days} "
            f"jours. Pour annuler : {reactivate_link}"
        )
    else:
        subject = "Your Account Has Been Deactivated"
        greeting = "Hi there,"
        message = (
            f"We've received your account deletion request. Your account is now "
            f"deactivated and will be permanently deleted in {grace_days} days."
        )
        cancel_text = (
            "Changed your mind? You can cancel the deletion anytime within this "
            "window by logging back in."
        )
        btn_text = "Cancel Deletion"
        link_issue_text = (
            "Button not working? Copy and paste this link into your browser:"
        )
        disclaimer = (
            "If you didn't request this, please log in immediately, change your "
            "password, and cancel the deletion."
        )
        footer_text = f"&copy; {project_name}. All rights reserved."
        plain_text = (
            f"Your account has been deactivated and will be deleted in "
            f"{grace_days} days. To cancel: {reactivate_link}"
        )

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ padding: 20px !important; }}
            .container {{ width: 100% !important; border-radius: 12px !important; overflow: hidden; }}
            .content {{ padding: 32px 24px !important; }}
            .header {{ padding: 32px 24px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;">
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:48px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color:#ffffff;padding:40px 48px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <div style="display:inline-block;padding:12px;background-color:#fef2f2;border-radius:12px;margin-bottom:16px;">
                                <span style="font-size:32px;">⚠️</span>
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">{project_name}</h1>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td class="content" style="padding:40px 48px;">
                            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">{greeting}</p>
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">{message}</p>
                            <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#475569;">{cancel_text}</p>

                            <!-- Button CTA -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{reactivate_link}" style="display:inline-block;background-color:#ef4444;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 6px -1px rgba(239,68,68,0.2);">
                                            {btn_text}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin:40px 0;border-top:1px solid #f1f5f9;"></div>

                            <!-- Text Link Issue -->
                            <p style="margin:0 0 12px;font-size:14px;color:#64748b;">{link_issue_text}</p>
                            <p style="margin:0 0 32px;font-size:13px;word-break:break-all;line-height:1.5;">
                                <a href="{reactivate_link}" style="color:#ef4444;text-decoration:underline;">{reactivate_link}</a>
                            </p>

                            <div style="padding:20px;background-color:#fef2f2;border-radius:12px;border-left:4px solid #fca5a5;">
                                <p style="margin:0;font-size:13px;line-height:1.6;color:#991b1b;font-style:italic;">{disclaimer}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 48px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{project_name}</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">{footer_text}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return {"subject": subject, "html": html, "plain_text": plain_text}


def generate_email_verification_email(
    verify_link: str, project_name: str, lang: str = Language.EN
) -> dict[str, str]:
    """
    Generate subject, HTML, and plain text for email verification.
    """
    if lang == Language.FR:
        subject = "Vérifiez votre adresse e-mail"
        greeting = "Bienvenue !"
        message = "Nous sommes ravis de vous compter parmi nous. Veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous pour commencer."
        btn_text = "Vérifier mon e-mail"
        link_issue_text = "Le bouton ne fonctionne pas ? Copiez et collez ce lien dans votre navigateur :"
        disclaimer = "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail en toute sécurité. Aucune autre action n'est requise."
        footer_text = f"&copy; {project_name}. Tous droits réservés."
        plain_text = f"Veuillez vérifier votre adresse e-mail en cliquant sur le lien suivant : {verify_link}"
    else:
        subject = "Verify Your Email"
        greeting = "Welcome aboard!"
        message = "We're excited to have you join us. Please verify your email address by clicking the button below to get started."
        btn_text = "Verify Email"
        link_issue_text = (
            "Button not working? Copy and paste this link into your browser:"
        )
        disclaimer = "If you didn't create an account, you can safely ignore this email. No further action is required."
        footer_text = f"&copy; {project_name}. All rights reserved."
        plain_text = f"Please verify your email by clicking on the link: {verify_link}"

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ padding: 20px !important; }}
            .container {{ width: 100% !important; border-radius: 12px !important; overflow: hidden; }}
            .content {{ padding: 32px 24px !important; }}
            .header {{ padding: 32px 24px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;">
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:48px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color:#ffffff;padding:40px 48px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <div style="display:inline-block;padding:12px;background-color:#ecfdf5;border-radius:12px;margin-bottom:16px;">
                                <span style="font-size:32px;">👋</span>
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">{project_name}</h1>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td class="content" style="padding:40px 48px;">
                            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">{greeting}</p>
                            <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#475569;">{message}</p>

                            <!-- Button CTA -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{verify_link}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 6px -1px rgba(16,185,129,0.2);">
                                            {btn_text}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin:40px 0;border-top:1px solid #f1f5f9;"></div>

                            <!-- Text Link Issue -->
                            <p style="margin:0 0 12px;font-size:14px;color:#64748b;">{link_issue_text}</p>
                            <p style="margin:0 0 32px;font-size:13px;word-break:break-all;line-height:1.5;">
                                <a href="{verify_link}" style="color:#10b981;text-decoration:underline;">{verify_link}</a>
                            </p>

                            <div style="padding:20px;background-color:#f8fafc;border-radius:12px;border-left:4px solid #e2e8f0;">
                                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;font-style:italic;">{disclaimer}</p>
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 48px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{project_name}</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">{footer_text}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return {"subject": subject, "html": html, "plain_text": plain_text}


def generate_root_transfer_otp_email(
    code: str,
    target_email: str,
    project_name: str,
    ttl_minutes: int,
    lang: str = Language.EN,
) -> dict[str, str]:
    """Generate the OTP email confirming a root-superadmin transfer.

    Sent to the *current* root superadmin's own address. The code authorizes
    handing root status to ``target_email``.
    """
    if lang == Language.FR:
        subject = (
            "Code de vérification pour le transfert du super-administrateur principal"
        )
        greeting = "Bonjour,"
        message = (
            "Une demande de transfert de votre statut de super-administrateur "
            f"principal vers <strong>{target_email}</strong> a été initiée. "
            "Saisissez le code de vérification ci-dessous pour finaliser le "
            "transfert."
        )
        code_label = "Votre code de vérification"
        disclaimer = (
            f"Ce code expire dans {ttl_minutes} minutes. Si vous n'êtes pas à "
            "l'origine de cette demande, ignorez cet e-mail et modifiez votre mot "
            "de passe — votre statut ne sera pas transféré."
        )
        footer_text = f"&copy; {project_name}. Tous droits réservés."
        plain_text = (
            "Votre code de vérification pour transférer le statut de "
            f"super-administrateur principal à {target_email} : {code} "
            f"(valable {ttl_minutes} minutes)"
        )
    else:
        subject = "Root Superadmin Transfer Verification Code"
        greeting = "Hi there,"
        message = (
            "A request was started to transfer your root superadmin status to "
            f"<strong>{target_email}</strong>. Enter the verification code below "
            "to complete the transfer."
        )
        code_label = "Your verification code"
        disclaimer = (
            f"This code expires in {ttl_minutes} minutes. If you didn't request "
            "this, ignore this email and change your password — your status will "
            "not be transferred."
        )
        footer_text = f"&copy; {project_name}. All rights reserved."
        plain_text = (
            "Your verification code to transfer root superadmin to "
            f"{target_email}: {code} (valid for {ttl_minutes} minutes)"
        )

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ padding: 20px !important; }}
            .container {{ width: 100% !important; border-radius: 12px !important; overflow: hidden; }}
            .content {{ padding: 32px 24px !important; }}
            .header {{ padding: 32px 24px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;">
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:48px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <tr>
                        <td class="header" style="background-color:#ffffff;padding:40px 48px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <div style="display:inline-block;padding:12px;background-color:#eff6ff;border-radius:12px;margin-bottom:16px;">
                                <span style="font-size:32px;">🛡️</span>
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">{project_name}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding:40px 48px;">
                            <p style="margin:0 0 16px;font-size:16px;color:#334155;">{greeting}</p>
                            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">{message}</p>
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;text-align:center;">{code_label}</p>
                            <div style="margin:0 auto 28px;max-width:320px;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;">
                                <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#1e293b;">{code}</span>
                            </div>
                            <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">{disclaimer}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 48px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{project_name}</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">{footer_text}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return {"subject": subject, "html": html, "plain_text": plain_text}


def generate_account_locked_email(
    project_name: str, lock_minutes: int, lang: str = Language.EN
) -> dict[str, str]:
    """Generate subject, HTML, and plain text for an account-lockout alert.

    Sent when an account is temporarily locked after too many failed logins.
    Deliberately link-free: it only informs the user the lock is automatic and
    time-limited, and prompts a password reset if the attempts were not theirs.
    """
    if lang == Language.FR:
        subject = "Votre compte a été temporairement verrouillé"
        greeting = "Bonjour,"
        message = (
            "Pour votre sécurité, votre compte a été temporairement verrouillé "
            f"pendant {lock_minutes} minutes à la suite de trop nombreuses "
            "tentatives de connexion infructueuses. Vous pourrez vous reconnecter "
            "automatiquement à l'issue de ce délai."
        )
        disclaimer = (
            "Si vous n'êtes pas à l'origine de ces tentatives, nous vous "
            "recommandons de réinitialiser votre mot de passe à l'aide du lien "
            "« Mot de passe oublié » de la page de connexion."
        )
        footer_text = f"&copy; {project_name}. Tous droits réservés."
        plain_text = (
            "Pour votre sécurité, votre compte a été temporairement verrouillé "
            f"pendant {lock_minutes} minutes à la suite de trop nombreuses "
            "tentatives de connexion infructueuses. Si vous n'êtes pas à l'origine "
            "de ces tentatives, réinitialisez votre mot de passe à l'aide du lien "
            "« Mot de passe oublié » de la page de connexion."
        )
    else:
        subject = "Your account has been temporarily locked"
        greeting = "Hi there,"
        message = (
            "For your security, your account has been temporarily locked for "
            f"{lock_minutes} minutes after too many failed login attempts. You "
            "will be able to sign in again automatically once this period ends."
        )
        disclaimer = (
            "If these attempts weren't you, we recommend resetting your password "
            "using the 'Forgot Password' link on the login page."
        )
        footer_text = f"&copy; {project_name}. All rights reserved."
        plain_text = (
            "For your security, your account has been temporarily locked for "
            f"{lock_minutes} minutes after too many failed login attempts. If these "
            "attempts weren't you, reset your password using the 'Forgot Password' "
            "link on the login page."
        )

    html = f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
        @media only screen and (max-width: 620px) {{
            .wrapper {{ padding: 20px !important; }}
            .container {{ width: 100% !important; border-radius: 12px !important; overflow: hidden; }}
            .content {{ padding: 32px 24px !important; }}
            .header {{ padding: 32px 24px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;">
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:48px 0;">
        <tr>
            <td align="center">
                <table class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                    <tr>
                        <td class="header" style="background-color:#ffffff;padding:40px 48px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <div style="display:inline-block;padding:12px;background-color:#fef2f2;border-radius:12px;margin-bottom:16px;">
                                <span style="font-size:32px;">🔒</span>
                            </div>
                            <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;letter-spacing:-0.5px;">{project_name}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="padding:40px 48px;">
                            <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">{greeting}</p>
                            <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#475569;">{message}</p>
                            <div style="padding:20px;background-color:#fef2f2;border-radius:12px;border-left:4px solid #ef4444;">
                                <p style="margin:0;font-size:13px;line-height:1.6;color:#b91c1c;font-style:italic;">{disclaimer}</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 48px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{project_name}</p>
                            <p style="margin:0;font-size:12px;color:#94a3b8;">{footer_text}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    return {"subject": subject, "html": html, "plain_text": plain_text}
