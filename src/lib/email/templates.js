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
}
export default emailTemplates;