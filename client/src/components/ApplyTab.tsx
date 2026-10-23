import { useEffect, useState } from 'react';
import { Loader2, Paperclip, Send, CheckCircle2 } from 'lucide-react';
import {
  GOOGLE_CLIENT_ID,
  buildMimeMessage,
  connectGmail,
  disconnectGmail,
  parseRecipients,
  sendGmail,
  type Attachment,
  type GoogleSession
} from '../lib/gmail';
import type { ActiveTab } from './Sidebar';
import type { AuthUser } from './LoginPage';

interface ApplyTabProps {
  resumeText: string;
  jobDescriptionText: string;
  rewriteData: any | null;
  lettersData: any | null;
  currentUser: AuthUser | null;
  onGoTo: (tab: ActiveTab) => void;
}

type AttachmentId = 'tailored' | 'original' | 'cover' | 'application';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const firstEmail = (text: string) =>
  text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';

// Generated letters sometimes carry template placeholders such as "[Target Role]"
const PLACEHOLDER_RE = /\[(?:[A-Z][\w .&/-]{2,40})\]/;
const real = (value?: string) => (value && !/^\s*\[.*\]\s*$/.test(value) ? value.trim() : '');

async function toDocx(title: string, content: string): Promise<Blob> {
  const response = await fetch('/api/export-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, filename: 'document.docx' })
  });
  if (!response.ok) throw new Error(`Couldn’t prepare “${title}”. Try again.`);
  return response.blob();
}

export const ApplyTab = ({
  resumeText,
  jobDescriptionText,
  rewriteData,
  lettersData,
  currentUser,
  onGoTo
}: ApplyTabProps) => {
  const jobLines = jobDescriptionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const role: string =
    real(rewriteData?.targetRole) ||
    real(lettersData?.meta?.jobTitle) ||
    (jobLines[0] && jobLines[0].length < 80 ? jobLines[0] : '');
  const company: string =
    real(lettersData?.meta?.companyName) || jobDescriptionText.match(/^\s*Company:\s*(.+)$/im)?.[1]?.trim() || '';
  const name: string =
    real(lettersData?.meta?.applicantName) || currentUser?.name || resumeText.split('\n')[0]?.trim() || '';
  const fileBase = (name || 'Application').replace(/\s+/g, '_');

  const [session, setSession] = useState<GoogleSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [to, setTo] = useState(() => firstEmail(jobDescriptionText));
  const [subject, setSubject] = useState(() =>
    [role ? `Application for ${role}` : 'Job application', name].filter(Boolean).join(' – ')
  );
  const [body, setBody] = useState(
    () =>
      `Dear Hiring Manager,\n\nPlease find attached my resume${lettersData ? ' and cover letter' : ''} for the ${
        role || 'advertised'
      } position${company ? ` at ${company}` : ''}.\n\nI would welcome the chance to discuss how I can contribute to your team. Thank you for your time and consideration.\n\nKind regards,\n${name}`
  );
  const [selected, setSelected] = useState<Record<AttachmentId, boolean>>({
    tailored: !!rewriteData,
    original: !rewriteData && !!resumeText.trim(),
    cover: !!lettersData,
    application: false
  });
  // Documents can finish generating while this page is open; attach them when they arrive
  useEffect(() => {
    if (rewriteData) setSelected((s) => ({ ...s, tailored: true, original: false }));
  }, [rewriteData]);
  useEffect(() => {
    if (lettersData) setSelected((s) => ({ ...s, cover: true }));
  }, [lettersData]);

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const available: { id: AttachmentId; label: string; ready: boolean; missing?: { text: string; tab: ActiveTab } }[] = [
    {
      id: 'tailored',
      label: 'Tailored resume',
      ready: !!rewriteData,
      missing: { text: 'Tailor your resume first', tab: 'rewriter' }
    },
    { id: 'original', label: 'Original resume', ready: !!resumeText.trim(), missing: { text: 'Add your resume first', tab: 'scorer' } },
    { id: 'cover', label: 'Cover letter', ready: !!lettersData, missing: { text: 'Write your letters first', tab: 'letters' } },
    { id: 'application', label: 'Application letter', ready: !!lettersData }
  ];

  const chosen = available.filter((a) => a.ready && selected[a.id]);

  const textOf: Record<AttachmentId, () => string> = {
    tailored: () => rewriteData?.rewrittenMarkdown || '',
    original: () => resumeText,
    cover: () => lettersData?.coverLetter || '',
    application: () => lettersData?.applicationLetter || ''
  };
  const withPlaceholders = [
    ...(PLACEHOLDER_RE.test(subject) || PLACEHOLDER_RE.test(body) ? ['the email'] : []),
    ...chosen.filter((a) => PLACEHOLDER_RE.test(textOf[a.id]())).map((a) => `the ${a.label.toLowerCase()}`)
  ];
  const recipients = parseRecipients(to);
  const canSend =
    !!session && recipients.valid.length > 0 && recipients.invalid.length === 0 && !!subject.trim() && !!body.trim();

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      setSession(await connectGmail());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGmail(session);
    setSession(null);
  };

  const handleSend = async () => {
    if (!session || !canSend) return;
    setIsSending(true);
    setError(null);

    try {
      const sources: Record<AttachmentId, () => Promise<Attachment>> = {
        tailored: async () => ({
          filename: `${fileBase}_Resume.docx`,
          mimeType: DOCX,
          data: await toDocx(`${name || 'Resume'}`, rewriteData.rewrittenMarkdown)
        }),
        original: async () => ({
          filename: chosen.some((c) => c.id === 'tailored') ? `${fileBase}_Resume_Original.docx` : `${fileBase}_Resume.docx`,
          mimeType: DOCX,
          data: await toDocx(`${name || 'Resume'}`, resumeText)
        }),
        cover: async () => ({
          filename: `${fileBase}_Cover_Letter.docx`,
          mimeType: DOCX,
          data: await toDocx('Cover Letter', lettersData.coverLetter)
        }),
        application: async () => ({
          filename: `${fileBase}_Application_Letter.docx`,
          mimeType: DOCX,
          data: await toDocx('Application Letter', lettersData.applicationLetter)
        })
      };

      const attachments = await Promise.all(chosen.map((a) => sources[a.id]()));
      const mime = await buildMimeMessage({ to: recipients.valid, subject, body, attachments });
      await sendGmail(session, mime);
      setSentTo(recipients.valid.join(', '));
    } catch (err: any) {
      setError(err.message || 'The email wasn’t sent. Try again.');
      if (/expired/i.test(err.message)) setSession(null);
    } finally {
      setIsSending(false);
    }
  };

  if (sentTo) {
    return (
      <section className="panel px-6 py-12 text-center">
        <CheckCircle2 className="w-8 h-8 text-good mx-auto" />
        <p className="text-[15px] font-medium text-ink mt-3">Application sent to {sentTo}</p>
        <p className="text-[13.5px] text-muted mt-1">
          A copy is in the Sent folder of {session?.email || 'your Gmail account'}.
        </p>
        <div className="flex justify-center gap-2 mt-6">
          <a
            href="https://mail.google.com/mail/u/0/#sent"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            Open Gmail
          </a>
          <button onClick={() => setSentTo(null)} className="btn btn-primary">
            Send another
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!GOOGLE_CLIENT_ID ? (
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Gmail isn’t connected to this site yet</h2>
            <p className="text-[13.5px] text-muted mt-0.5">
              The site owner needs to set up Google sign-in before applications can be sent from here.
            </p>
          </div>
        ) : session ? (
          <>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Gmail connected</h2>
              <p className="text-[13.5px] text-muted mt-0.5">Sending as {session.email || 'your Google account'}.</p>
            </div>
            <button onClick={handleDisconnect} className="btn btn-ghost btn-sm self-start sm:self-auto">
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Connect Gmail</h2>
              <p className="text-[13.5px] text-muted mt-0.5">
                Career Guide only asks for permission to send email. It can’t read your inbox.
              </p>
            </div>
            <button onClick={handleConnect} disabled={isConnecting} className="btn btn-primary self-start sm:self-auto">
              {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isConnecting ? 'Connecting' : 'Connect Gmail'}
            </button>
          </>
        )}
      </section>

      <section className="panel">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-[15px] font-semibold text-ink">Email</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="apply-to" className="label">
              To
            </label>
            <input
              id="apply-to"
              type="text"
              inputMode="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="hiring@company.com"
              className="field"
              aria-describedby="apply-to-help"
            />
            <p id="apply-to-help" className={`text-xs mt-1.5 ${recipients.invalid.length ? 'text-bad' : 'text-subtle'}`}>
              {recipients.invalid.length
                ? `Check this address: ${recipients.invalid.join(', ')}`
                : to
                ? 'Separate more than one address with commas.'
                : 'No email address was found in the job posting. Enter the one it asks you to apply to.'}
            </p>
          </div>

          <div>
            <label htmlFor="apply-subject" className="label">
              Subject
            </label>
            <input
              id="apply-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="apply-body" className="label">
              Message
            </label>
            <textarea
              id="apply-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="field min-h-[220px] resize-y leading-relaxed"
            />
            {lettersData && (
              <button
                type="button"
                onClick={() => setBody(lettersData.coverLetter)}
                className="text-[13px] text-accent font-medium hover:underline mt-1.5"
              >
                Use the cover letter as the message
              </button>
            )}
          </div>

          <fieldset>
            <legend className="label">Attachments</legend>
            <ul className="rounded-md border border-line divide-y divide-line">
              {available.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3.5 h-11">
                  <label
                    className={`flex items-center gap-2.5 text-[13.5px] ${a.ready ? 'text-ink' : 'text-subtle'}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!a.ready}
                      checked={a.ready && selected[a.id]}
                      onChange={(e) => setSelected({ ...selected, [a.id]: e.target.checked })}
                      className="w-4 h-4 accent-[var(--color-accent)]"
                    />
                    <Paperclip className="w-3.5 h-3.5" />
                    {a.label}
                    {a.ready && <span className="text-xs text-subtle">Word document</span>}
                  </label>
                  {!a.ready && a.missing && (
                    <button
                      type="button"
                      onClick={() => onGoTo(a.missing!.tab)}
                      className="text-[13px] text-accent font-medium hover:underline"
                    >
                      {a.missing.text}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-3.5 border-t border-line bg-sunken rounded-b-lg">
          {error ? (
            <p role="alert" className="text-[13px] text-bad mr-auto">
              {error}
            </p>
          ) : withPlaceholders.length > 0 ? (
            <p className="text-[13px] text-warn mr-auto max-w-[60ch]">
              {withPlaceholders.join(' and ').replace(/^t/, 'T')} still {withPlaceholders.length > 1 ? 'contain' : 'contains'} placeholders
              like [Target Role]. Fill them in, or rewrite the letters with the job title and company set.
            </p>
          ) : (
            <p className="text-[13px] text-muted mr-auto">
              {chosen.length === 0
                ? 'No attachments selected.'
                : `${chosen.length} attachment${chosen.length > 1 ? 's' : ''}: ${chosen.map((c) => c.label.toLowerCase()).join(', ')}`}
            </p>
          )}
          <button onClick={handleSend} disabled={!canSend || isSending} className="btn btn-primary">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSending ? 'Sending' : 'Send application'}
          </button>
        </div>
      </section>
    </div>
  );
};
