// Centralized email configuration for Aqademiq
// All email-related settings in one place for easy updates

export const EMAIL_CONFIG = {
  domain: 'aqademiq.app',
  
  // Sender addresses for different email types
  senders: {
    noreply: 'Aqademiq <noreply@aqademiq.app>',
    notifications: 'Aqademiq <notifications@aqademiq.app>',
    support: 'Aqademiq Support <support@aqademiq.app>',
  },
  
  // Branding settings for email templates
  branding: {
    appName: 'Aqademiq',
    appUrl: 'https://aqademiq.app',
    logoEmoji: '🎓',
    primaryColor: '#667eea',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2',
  },
  
  // Footer content
  footer: {
    companyName: 'Aqademiq',
    unsubscribeText: 'Manage your notification preferences in your account settings.',
    // Placeholder for future unsubscribe link implementation
    unsubscribeUrl: 'https://aqademiq.app/settings',
  }
} as const;

// Helper to generate consistent email footer
export function generateEmailFooter(recipientEmail?: string): string {
  return `
    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center; margin-top: 32px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
        ${EMAIL_CONFIG.branding.logoEmoji} ${EMAIL_CONFIG.branding.appName}
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        ${recipientEmail ? `This email was sent to ${recipientEmail}. ` : ''}
        <a href="${EMAIL_CONFIG.footer.unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">
          ${EMAIL_CONFIG.footer.unsubscribeText}
        </a>
      </p>
    </div>
  `;
}

// Helper to generate consistent email header
export function generateEmailHeader(): string {
  return `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #1a1a1a; font-size: 32px; font-weight: bold; margin: 0;">
        ${EMAIL_CONFIG.branding.logoEmoji} ${EMAIL_CONFIG.branding.appName}
      </h1>
    </div>
  `;
}
