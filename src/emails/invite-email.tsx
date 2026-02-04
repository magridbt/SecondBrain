interface InviteEmailProps {
  inviteUrl: string
  invitedByName?: string
  expiresIn?: string
}

export function getInviteEmailHtml({ inviteUrl, invitedByName, expiresIn = '7 days' }: InviteEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation - Sri AB Teachings</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Sri AB Teachings
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Spiritual Teachings Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">

              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                You've been invited! ✨
              </h2>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${invitedByName ? `<strong>${invitedByName}</strong> has invited you to` : 'You have been invited to'}
                join the <strong>Sri AB Teachings</strong> platform, where you will have access to the
                teachings of Sri Amma Bhagavan with the help of artificial intelligence.
              </p>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Click the button below to accept the invitation and create your account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%);
                              color: #ffffff; text-decoration: none; padding: 16px 40px; font-size: 16px;
                              font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0 0; word-break: break-all;">
                <a href="${inviteUrl}" style="color: #d4af37; font-size: 14px;">${inviteUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                ⏰ This invitation expires in <strong>${expiresIn}</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you did not request this invitation, you can ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function getInviteEmailText({ inviteUrl, invitedByName, expiresIn = '7 days' }: InviteEmailProps): string {
  return `
You've been invited to Sri AB Teachings!

${invitedByName ? `${invitedByName} has invited you to` : 'You have been invited to'} join the Sri AB Teachings platform.

Click the link below to accept the invitation and create your account:

${inviteUrl}

This invitation expires in ${expiresIn}.

If you did not request this invitation, you can ignore this email.
  `.trim()
}
