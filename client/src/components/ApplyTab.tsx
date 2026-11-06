import { useEffect, useState } from 'react';
import { Loader2, Paperclip, Send, CheckCircle2, Download, ExternalLink } from 'lucide-react';
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
import type { FoundJob } from './FindJobsTab';
import { LoadingState } from './States';

interface ApplyTabProps {
  resumeText: string;
  jobDescriptionText: string;
  rewriteData: any | null;
  lettersData: any | null;
  currentUser: AuthUser | null;
  onGoTo: (tab: ActiveTab) => void;
  /** Job chosen on Find jobs, if any: gives the employer's apply page */
  targetJob?: FoundJob | null;
  /** Set while "Prepare application" is tailoring the CV and writing the letters */
  preparing?: { jobTitle: string; error: string | null } | null;
  onRetryPrepare?: () => void;
}

type AttachmentId = 'tailored' | 'original' | 'cover' | 'application';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const firstEmail = (text: string) =>
  text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';

// Generated letters sometimes carry template placeholders such as "[Target Role]"
const PLACEHOLDER_RE = /\[(?:[A-Z][\w .&/-]{2,40})\]/;
const real = (value?: string) => (value && !/^\s*\[.*\]\s*$/.test(value) ? value.trim() : '');

const looksLikeName = (line: string) =>
  /^[\p{L}][\p{L} .'-]{1,60}$/u.test(line) && line.split(/\s+/).length <= 5;

// Contact details normally sit in the resume header, so only its top is searched
function contactDetails(resume: string) {
  const header = resume.slice(0, 800);
  return {
    phone: header.match(/\+?\(?\d[\d\s().-]{7,}\d/)?.[0]?.trim() || '',
    email: firstEmail(header),
    linkedin: header.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+\/?/i)?.[0] || ''
  };
}

const DOCUMENT_NAMES: Record<AttachmentId, string> = {
  tailored: 'curriculum vitae',
  original: 'curriculum vitae',
  cover: 'cover letter',
  application: 'letter of application'
};

const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const formalSubject = (role: string, name: string) =>
  [role ? `Application for the Position of ${role}` : 'Job Application', name].filter(Boolean).join(' – ');

function formalBody(opts: {
  role: string;
  company: string;
  name: string;
  contact: { phone: string; email: string; linkedin: string };
  documents: AttachmentId[];
}) {
  const { role, company, name, contact } = opts;
  const documents = [...new Set(opts.documents.map((d) => DOCUMENT_NAMES[d]))];
  const position = role ? `the position of ${role}` : 'the advertised position';
  const employer = company || 'your organisation';

  const paragraphs = [
    'Dear Hiring Manager,',
    `I am writing to formally apply for ${position}${company ? ` at ${company}` : ''}.`,
    documents.length
      ? `Please find attached my ${listJoin(documents)} for your consideration. ${
          documents.length > 1 ? 'They set' : 'It sets'
        } out my qualifications, experience and the results I have achieved in previous roles.`
      : '',
    `I am confident that my skills and experience align closely with the requirements of this role, and I would welcome the opportunity to contribute to ${employer}. I am available for an interview at your convenience.`,
    'Thank you for your time and consideration. I look forward to hearing from you.',
    ['Yours faithfully,', '', name, contact.phone, contact.email, contact.linkedin].filter((l, i) => i < 2 || l).join('\n')
  ];

  return paragraphs.filter(Boolean).join('\n\n');
}

// Resumes and letters carry their own heading, so the document gets no extra title
async function toDocx(label: string, content: string): Promise<Blob> {
  const response = await fetch('/api/export-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', content, filename: 'document.docx' })
  });
  if (!response.ok) throw new Error(`Couldn’t prepare the ${label}. Try again.`);
  return response.blob();
}

export const ApplyTab = ({
  resumeText,
  jobDescriptionText,
  rewriteData,
  lettersData,
  currentUser,
  onGoTo,
  targetJob = null,
  preparing = null,
  onRetryPrepare
}: ApplyTabProps) => {
  // Without an email address in the posting, the employer takes applications on its own site
  const jobEmail = firstEmail(jobDescriptionText);
  const applyOnSite = !!targetJob && !jobEmail;
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [downloading, setDownloading] = useState<AttachmentId | null>(null);
  const jobLines = jobDescriptionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const role: string =
    real(rewriteData?.targetRole) ||
    real(lettersData?.meta?.jobTitle) ||
    (jobLines[0] && jobLines[0].length < 80 ? jobLines[0] : '');
  const company: string =
    real(lettersData?.meta?.companyName) || jobDescriptionText.match(/^\s*Company:\s*(.+)$/im)?.[1]?.trim() || '';
  const resumeFirstLine = resumeText.split('\n')[0]?.trim() || '';
  const name: string =
    real(lettersData?.meta?.applicantName) ||
    (looksLikeName(resumeFirstLine) ? resumeFirstLine : '') ||
    currentUser?.name ||
    '';
  const contact = contactDetails(resumeText);
  const fileBase = (name || 'Application').replace(/\s+/g, '_');

  const [session, setSession] = useState<GoogleSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [to, setTo] = useState(() => firstEmail(jobDescriptionText));
  // null = use the suggested text, which follows the attachments chosen below
  const [customSubject, setCustomSubject] = useState<string | null>(null);
  const [customBody, setCustomBody] = useState<string | null>(null);
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

  const subject = customSubject ?? formalSubject(role, name);
  const body =
    customBody ??
    formalBody({
      role,
      company,
      name,
      contact,
      documents: chosen.map((a) => a.id)
    });

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

  const attachmentSources: Record<AttachmentId, () => Promise<Attachment>> = {
        tailored: async () => ({
          filename: `${fileBase}_Resume.docx`,
          mimeType: DOCX,
          data: await toDocx('tailored resume', rewriteData.rewrittenMarkdown)
        }),
        original: async () => ({
          filename: chosen.some((c) => c.id === 'tailored') ? `${fileBase}_Resume_Original.docx` : `${fileBase}_Resume.docx`,
          mimeType: DOCX,
          data: await toDocx('resume', resumeText)
        }),
        cover: async () => ({
          filename: `${fileBase}_Cover_Letter.docx`,
          mimeType: DOCX,
          data: await toDocx('cover letter', lettersData.coverLetter)
        }),
        application: async () => ({
          filename: `${fileBase}_Application_Letter.docx`,
          mimeType: DOCX,
          data: await toDocx('application letter', lettersData.applicationLetter)
        })
      };

  const handleDownload = async (id: AttachmentId) => {
    setDownloading(id);
    setError(null);
    try {
      const file = await attachmentSources[id]();
      const url = URL.createObjectURL(file.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err.message || 'The download didn’t start. Try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleSend = async () => {
    if (!session || !canSend) return;
    setIsSending(true);
    setError(null);

    try {
      const attachments = await Promise.all(chosen.map((a) => attachmentSources[a.id]()));
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

  if (preparing && !preparing.error) {
    return (
      <LoadingState
        title={`Preparing your application for ${preparing.jobTitle}`}
        detail="Tailoring your CV and writing your cover letter. This takes about half a minute."
      />
    );
  }

  if (preparing?.error) {
    return (
      <section className="panel px-6 py-10 text-center">
        <p className="text-[15px] font-medium text-ink">Application not prepared</p>
        <p className="text-[13.5px] text-muted mt-1 max-w-md mx-auto">{preparing.error}</p>
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => onGoTo('rewriter')} className="btn btn-secondary">
            Tailor step by step
          </button>
          {onRetryPrepare && (
            <button onClick={onRetryPrepare} className="btn btn-primary">
              Try again
            </button>
          )}
        </div>
      </section>
    );
  }

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

  const packItems = available.filter((a) => a.ready && a.id !== 'original' && (a.id !== 'application' || selected.application));
  if (!rewriteData && resumeText.trim()) packItems.unshift(available.find((a) => a.id === 'original')!);

  const applicationPack = applyOnSite && targetJob && (
    <section className="panel">
      <div className="px-6 py-4 border-b border-line">
        <h2 className="text-[15px] font-semibold text-ink">
          Apply on{' '}
          {targetJob.company ? `${targetJob.company}${/s$/i.test(targetJob.company) ? '’' : '’s'}` : 'the employer’s'}{' '}
          website
        </h2>
        <p className="text-[13.5px] text-muted mt-0.5">
          This posting has no email address, so applications go through the employer’s own form. Your documents are
          ready to upload there.
        </p>
      </div>
      <ol className="p-6 space-y-5">
        <li>
          <p className="text-[13.5px] font-medium text-ink">1. Download your documents</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            {packItems.map((a) => (
              <button
                key={a.id}
                onClick={() => handleDownload(a.id)}
                disabled={downloading !== null}
                className="btn btn-secondary btn-sm"
              >
                {downloading === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {a.label} (.docx)
              </button>
            ))}
          </div>
        </li>
        <li>
          <p className="text-[13.5px] font-medium text-ink">2. Open the application page and upload them</p>
          <p className="text-[13px] text-muted mt-0.5">
            The cover letter text can also be pasted into a “cover letter” box if the form has one.
          </p>
          <a href={targetJob.url} target="_blank" rel="noopener" className="btn btn-primary btn-sm mt-2.5">
            <ExternalLink className="w-3.5 h-3.5" /> Open application page
          </a>
        </li>
      </ol>
      <div className="px-6 py-3.5 border-t border-line bg-sunken rounded-b-lg flex flex-wrap items-center justify-between gap-3">
        {error ? (
          <p role="alert" className="text-[13px] text-bad">
            {error}
          </p>
        ) : (
          <p className="text-[13px] text-muted">Know the hiring manager’s email address?</p>
        )}
        <button onClick={() => setShowEmailForm(!showEmailForm)} className="btn btn-ghost btn-sm">
          {showEmailForm ? 'Hide email' : 'Send by email instead'}
        </button>
      </div>
    </section>
  );

  if (applyOnSite && !showEmailForm) {
    return <div className="space-y-6">{applicationPack}</div>;
  }

  return (
    <div className="space-y-6">
      {applicationPack}
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
              onChange={(e) => setCustomSubject(e.target.value)}
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
              onChange={(e) => setCustomBody(e.target.value)}
              className="field min-h-[340px] resize-y leading-relaxed"
            />
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5">
              {(customBody !== null || customSubject !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBody(null);
                    setCustomSubject(null);
                  }}
                  className="text-[13px] text-accent font-medium hover:underline"
                >
                  Restore the formal wording
                </button>
              )}
              {lettersData && real(lettersData.coverLetter) && (
                <button
                  type="button"
                  onClick={() => setCustomBody(lettersData.coverLetter)}
                  className="text-[13px] text-accent font-medium hover:underline"
                >
                  Use the cover letter as the message
                </button>
              )}
            </div>
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
