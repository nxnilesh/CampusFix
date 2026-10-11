import { Sendpository, SendpositoryError } from 'sendpository';

type AuthEmailPurpose = 'verification' | 'password-reset';
type EmailPurpose = AuthEmailPurpose | 'resolver-approval';
type EmailContent = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export const EMAIL_DELIVERY_ERROR =
  'Unable to send verification email. Please try again.';

type EmailDeliveryFailure =
  | 'missing_credentials'
  | 'provider_rejected'
  | 'network_error';

export class EmailDeliveryError extends Error {
  constructor(
    readonly failure: EmailDeliveryFailure,
    readonly providerStatus?: number,
    readonly diagnostic?: string
  ) {
    super(EMAIL_DELIVERY_ERROR);
    this.name = 'EmailDeliveryError';
  }
}

export function isEmailDeliveryError(error: unknown): error is EmailDeliveryError {
  return error instanceof EmailDeliveryError;
}

export async function sendAuthOTPEmail(
  email: string,
  otp: string,
  purpose: AuthEmailPurpose
): Promise<void> {
  const isVerification = purpose === 'verification';
  const subject = isVerification ? 'Verify your CampusFix email' : 'Reset your CampusFix password';
  const textContent = `Your CampusFix ${isVerification ? 'verification' : 'password reset'} code is ${otp}. It expires in 10 minutes. Maximum 5 verification attempts. If you did not request this, you can safely ignore this email.`;
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 10px; background: #ff3b00; color: #ffffff; font-weight: 700; font-size: 11px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">CampusFix Security</span>
      </div>
      <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 800;">${isVerification ? 'Verify Your Registration' : 'Reset Your Password'}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Use the 6-digit verification code below to complete your ${isVerification ? 'CampusFix account registration' : 'password reset'}. This code expires in <strong>10 minutes</strong> and allows up to <strong>5 verification attempts</strong>.</p>
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">${otp}</span>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 0;">If you did not request this email, no action is required. Never share this code with anyone.</p>
    </div>
  `;

  await deliverEmail({ to: email, subject, text: textContent, html: htmlContent }, purpose);
}

export async function sendEmail(email: EmailContent): Promise<void> {
  await deliverEmail(email, 'resolver-approval');
}

async function deliverEmail(
  email: EmailContent,
  purpose: EmailPurpose
): Promise<void> {
  const apiKey = process.env.SENDPOSITORY_API_KEY?.trim();
  const from = process.env.SENDPOSITORY_FROM_EMAIL?.trim();
  console.info('[CampusFix] Starting Sendpository email delivery.', {
    purpose,
    recipientDomain: email.to.trim().split('@')[1]?.toLowerCase() ?? 'unknown',
    credentialsConfigured: Boolean(apiKey && from),
  });

  if (!apiKey || !from) {
    throw reportEmailFailure(
      new EmailDeliveryError(
        'missing_credentials',
        undefined,
        'SENDPOSITORY_API_KEY and SENDPOSITORY_FROM_EMAIL must be configured.'
      ),
      purpose
    );
  }

  try {
    const sendpository = new Sendpository(apiKey, { timeout: 10_000 });
    await sendpository.emails.send({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    console.info('[CampusFix] Sendpository email accepted.', { purpose });
  } catch (error) {
    const providerError = error instanceof SendpositoryError ? error : undefined;
    const failure: EmailDeliveryFailure = providerError?.type === 'connection_error'
      ? 'network_error'
      : 'provider_rejected';
    throw reportEmailFailure(
      new EmailDeliveryError(
        failure,
        providerError?.status || undefined,
        providerError?.type ?? 'unexpected_error'
      ),
      purpose
    );
  }
}

function reportEmailFailure(error: EmailDeliveryError, purpose: EmailPurpose): EmailDeliveryError {
  console.error('[CampusFix] Sendpository email delivery failed.', {
    purpose,
    failure: error.failure,
    ...(error.providerStatus ? { providerStatus: error.providerStatus } : {}),
    ...(error.diagnostic ? { providerErrorType: error.diagnostic } : {}),
  });
  return error;
}
