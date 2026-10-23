// Sends email through the user's own Gmail account.
// Google Identity Services issues a short-lived access token in the browser;
// the token is kept in memory only and never sent to our server.

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';
const SCOPES = `${GMAIL_SEND} openid email`;

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

export interface GoogleSession {
  accessToken: string;
  expiresAt: number;
  email: string | null;
}

export interface Attachment {
  filename: string;
  mimeType: string;
  data: Blob;
}

declare global {
  interface Window {
    google?: any;
  }
}

let gisLoader: Promise<void> | null = null;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisLoader) {
    gisLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisLoader = null;
        reject(new Error('Couldn’t load Google sign-in. Check your connection, or turn off blockers for this site.'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoader;
}

export async function connectGmail(): Promise<GoogleSession> {
  if (!GOOGLE_CLIENT_ID) throw new Error('Sending with Gmail isn’t set up on this site yet.');
  await loadGoogleIdentity();
  const oauth2 = window.google.accounts.oauth2;

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      prompt: '',
      callback: async (resp: any) => {
        if (resp.error) {
          return reject(new Error('Google didn’t grant access. Try connecting again.'));
        }
        if (!oauth2.hasGrantedAllScopes(resp, GMAIL_SEND)) {
          return reject(new Error('Permission to send email wasn’t given. Connect again and tick the Gmail box.'));
        }

        let email: string | null = null;
        try {
          const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` }
          });
          if (info.ok) email = (await info.json()).email ?? null;
        } catch {
          // The address is only shown for reassurance; sending works without it
        }

        resolve({
          accessToken: resp.access_token,
          expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000,
          email
        });
      },
      error_callback: (err: any) => {
        reject(
          new Error(
            err?.type === 'popup_closed'
              ? 'Google sign-in was closed before it finished.'
              : err?.type === 'popup_failed_to_open'
              ? 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.'
              : 'Google sign-in didn’t complete. Try again.'
          )
        );
      }
    });
    client.requestAccessToken();
  });
}

export function disconnectGmail(session: GoogleSession | null) {
  if (session && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(session.accessToken, () => {});
  }
}

// --- MIME message building ---

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const utf8Base64 = (text: string) => bytesToBase64(new TextEncoder().encode(text));
const wrap76 = (b64: string) => b64.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const noNewlines = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

// RFC 2047 encoded-word, so non-ASCII subjects survive
const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`;

const safeFilename = (name: string) => name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_');

const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export function parseRecipients(input: string): { valid: string[]; invalid: string[] } {
  const parts = input
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    valid: parts.filter((p) => EMAIL_RE.test(p)),
    invalid: parts.filter((p) => !EMAIL_RE.test(p))
  };
}

export async function buildMimeMessage(opts: {
  to: string[];
  subject: string;
  body: string;
  attachments: Attachment[];
}): Promise<string> {
  const boundary = `cg_${crypto.randomUUID().replace(/-/g, '')}`;
  const lines = [
    `To: ${opts.to.map(noNewlines).join(', ')}`,
    `Subject: ${encodeHeader(noNewlines(opts.subject))}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(utf8Base64(opts.body.replace(/\r?\n/g, '\r\n')))
  ];

  for (const file of opts.attachments) {
    const name = safeFilename(file.filename);
    const data = bytesToBase64(new Uint8Array(await file.data.arrayBuffer()));
    lines.push(
      `--${boundary}`,
      `Content-Type: ${file.mimeType}; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(data)
    );
  }

  lines.push(`--${boundary}--`, '');
  return lines.join('\r\n');
}

export async function sendGmail(session: GoogleSession, mime: string): Promise<{ id: string }> {
  if (Date.now() > session.expiresAt - 30_000) {
    throw new Error('Your Gmail connection expired. Connect again to send.');
  }

  const raw = utf8Base64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (response.status === 401) throw new Error('Your Gmail connection expired. Connect again to send.');
  if (response.status === 403) {
    throw new Error('Gmail refused to send. The account may not be allowed to use this app yet.');
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error?.message || `Gmail couldn’t send the email (error ${response.status}).`);
  }
  return response.json();
}
