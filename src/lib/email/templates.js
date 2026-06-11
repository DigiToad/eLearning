export const emailTemplates = {
    courseInterestAdmin: ({ userName, userEmail, institution, courseId, courseName, coursePrice, websiteName, appUrl }) => {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        return `
    <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; background: #f9f9fb; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #7c3aed; padding: 24px 32px;">
        <h2 style="color: white; margin: 0; font-size: 20px;"> New Course Interest</h2>
        <p style="color: #ddd6fe; margin: 6px 0 0; font-size: 13px;">
          A user has expressed interest via ${websiteName}
        </p>
      </div>
      <div style="padding: 28px 32px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; width: 130px;">Name</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600;">${userName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">Email</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">Institution</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600;">${institution}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">Course Name</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600;">${courseName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">Price</td>
            <td style="padding: 10px 0; color: #7c3aed; font-size: 16px; font-weight: 700;">₹${coursePrice}</td>
          </tr>
        </table>
      </div>
      <div style="padding: 0 32px 24px;">
        <a href="${appUrl}/admin/interested-users"
          style="display: inline-block; padding: 10px 22px; background: #7c3aed; color: white; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;">
          View in Admin Panel →
        </a>
      </div>
      <div style="background: #f3f4f6; padding: 14px 32px; text-align: center;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          ${websiteName} · Auto-notification · ${timestamp}
        </p>
      </div>
    </div>
  `;
    },
    courseAccessGranted: ({ userName, courseName, courseUrl, websiteName }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Course Access Granted</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
                Access Granted!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                Great news! You've been granted access to the course:
              </p>

              <!-- Course name highlight -->
              <div style="background:#f0f0ff;border-left:4px solid #4f46e5;
                          border-radius:4px;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:#4f46e5;">
                   ${courseName}
                </p>
              </div>

              <p style="margin:0 0 28px;font-size:16px;color:#374151;">
                You can start learning right away by clicking the button below.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:6px;">
                    <a href="${courseUrl}"
                       style="display:inline-block;padding:14px 32px;
                              color:#ffffff;font-size:16px;font-weight:600;
                              text-decoration:none;border-radius:6px;">
                      Start Learning →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#6b7280;">
                Or copy this link into your browser:<br/>
                <a href="${courseUrl}" style="color:#4f46e5;word-break:break-all;">
                  ${courseUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;
                       border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                You're receiving this because you expressed interest in this course on
                <strong>${websiteName}</strong>.<br/>
                Happy learning! 🚀
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
resetPasswordTemplate: (resetLink, webname) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#4F46E5; padding: 32px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">${webname}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 24px;">
              <h2 style="margin:0 0 16px; color:#1a1a2e; font-size:20px;">Reset Your Password</h2>
              <p style="margin:0 0 16px; color:#555555; font-size:15px; line-height:1.6;">
                We received a request to reset the password for your <strong>${webname}</strong> account.
                Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td style="background-color:#4F46E5; border-radius:6px;">
                    <a href="${resetLink}"
                       style="display:inline-block; padding:14px 32px; color:#ffffff; font-size:15px;
                              font-weight:600; text-decoration:none; border-radius:6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px; color:#555555; font-size:14px; line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px; word-break:break-all;">
                <a href="${resetLink}" style="color:#4F46E5; font-size:13px;">${resetLink}</a>
              </p>

              <p style="margin:0; color:#888888; font-size:13px; line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border:none; border-top:1px solid #eeeeee;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align:center;">
              <p style="margin:0; color:#aaaaaa; font-size:12px;">
                © ${new Date().getFullYear()} ${webname}. All rights reserved.
              </p>
              <p style="margin:8px 0 0; color:#aaaaaa; font-size:12px;">
                This is an automated email — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
}
export default emailTemplates;