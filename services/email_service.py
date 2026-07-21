import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_CONFIG = {
    "host": None,
    "port": 587,
    "username": None,
    "password": None,
    "from_addr": None,
    "use_tls": True,
}

RECIPIENTS = {
    "fraud_team": "fraud-team@healthcare-fraud-detection.local",
    "compliance": "compliance@healthcare-fraud-detection.local",
    "risk_manager": "risk-manager@healthcare-fraud-detection.local",
    "investigator": "investigator@healthcare-fraud-detection.local",
}

def configure_smtp(host=None, port=587, username=None, password=None, from_addr=None, use_tls=True):
    if host:
        SMTP_CONFIG["host"] = host
        SMTP_CONFIG["port"] = port
        SMTP_CONFIG["username"] = username
        SMTP_CONFIG["password"] = password
        SMTP_CONFIG["from_addr"] = from_addr or username
        SMTP_CONFIG["use_tls"] = use_tls

def is_smtp_configured():
    return SMTP_CONFIG["host"] is not None

def send_email_notification(title, description, severity, recipients_list=None, claim_info=None):
    if not is_smtp_configured():
        logger.info("SMTP not configured. Email notification queued (pending).")
        return "pending"
    try:
        if recipients_list is None:
            recipients_list = [RECIPIENTS["fraud_team"], RECIPIENTS["compliance"], RECIPIENTS["risk_manager"]]
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{severity.upper()}] Healthcare Fraud Alert: {title}"
        msg["From"] = SMTP_CONFIG["from_addr"]
        msg["To"] = ", ".join(recipients_list)

        body = f"""
        <html><body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">{'🚨' if severity == 'critical' else '⚠️'} {severity.upper()} Alert</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3>{title}</h3>
            <p>{description}</p>
        """
        if claim_info:
            body += f"""
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; background: #f9fafb; font-weight: bold;">Claim ID</td><td style="padding: 8px;">{claim_info.get('claim_id', 'N/A')}</td></tr>
                <tr><td style="padding: 8px; background: #f9fafb; font-weight: bold;">Fraud Score</td><td style="padding: 8px;">{claim_info.get('fraud_score', 'N/A')}</td></tr>
                <tr><td style="padding: 8px; background: #f9fafb; font-weight: bold;">Provider</td><td style="padding: 8px;">{claim_info.get('provider', 'N/A')}</td></tr>
                <tr><td style="padding: 8px; background: #f9fafb; font-weight: bold;">Patient</td><td style="padding: 8px;">{claim_info.get('patient', 'N/A')}</td></tr>
            </table>
            """
        body += f"""
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                This is an automated alert from the Healthcare Fraud Detection System.<br>
                <a href="https://healthcare-fraud-detection.netlify.app/notifications">View in Dashboard</a>
            </p>
        </div></body></html>
        """
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(SMTP_CONFIG["host"], SMTP_CONFIG["port"], timeout=15) as server:
            if SMTP_CONFIG["use_tls"]:
                server.starttls()
            if SMTP_CONFIG["username"]:
                server.login(SMTP_CONFIG["username"], SMTP_CONFIG["password"])
            server.sendmail(SMTP_CONFIG["from_addr"], recipients_list, msg.as_string())

        logger.info(f"Email sent for '{title}' to {recipients_list}")
        return "sent"
    except Exception as e:
        logger.warning(f"Email send failed for '{title}': {e}. Marked as pending.")
        return "pending"

def batch_send_pending(notifications):
    results = []
    for notif in notifications:
        status = send_email_notification(
            notif.get("title"),
            notif.get("description"),
            notif.get("severity", "info"),
            claim_info={
                "claim_id": notif.get("claim_id"),
                "fraud_score": notif.get("fraud_score"),
                "provider": notif.get("provider"),
                "patient": notif.get("patient"),
            }
        )
        results.append(status)
    return results
