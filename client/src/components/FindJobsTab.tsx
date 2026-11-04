import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { EmptyState, LoadingState } from './States';

export interface FoundJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  sourceUrl?: string;
  source: string;
  postedAt: string | null;
  excerpt: string;
  description: string;
  match: number;
  matchedSkills: string[];
}

export interface JobSearchResult {
  profile: { titles: string[]; skills: string[]; seniority: string };
  country: string;
  onSiteSearch: boolean;
  sources: { name: string; count: number; error?: string }[];
  jobs: FoundJob[];
}

interface FindJobsTabProps {
  resumeText: string;
  result: JobSearchResult | null;
  onResult: (result: JobSearchResult) => void;
  onUseJob: (job: FoundJob) => void;
}

const SOURCE_SITES: Record<string, string> = {
  Himalayas: 'https://himalayas.app',
  Remotive: 'https://remotive.com',
  Jobicy: 'https://jobicy.com',
  'Remote OK': 'https://remoteok.com',
  Arbeitnow: 'https://www.arbeitnow.com',
  Careerjet: 'https://www.careerjet.com'
};

function postedLabel(iso: string | null) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days)) return '';
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

const matchTone = (match: number) => (match >= 75 ? 'good' : match >= 50 ? 'warn' : 'neutral');

export const FindJobsTab = ({ resumeText, result, onResult, onUseJob }: FindJobsTabProps) => {
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [countryCode, setCountryCode] = useState('GH');
  const [includeRemote, setIncludeRemote] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    fetch('/api/job-countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch(() => setCountries([{ code: 'GH', name: 'Ghana' }]));
  }, []);

  const hasResume = !!resumeText.trim();

  const handleSearch = async () => {
    if (!hasResume) return;
    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch('/api/find-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, countryCode, includeRemote })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The job search didn’t finish. Try again in a moment.');
      onResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const jobs = (result?.jobs || []).filter((j) => !remoteOnly || j.remote);
  const failed = result?.sources.filter((s) => s.error).map((s) => s.name) || [];

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-country" className="label">
                Where do you want to work?
              </label>
              <select
                id="job-country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="field"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
                <option value="">Anywhere (remote only)</option>
              </select>
            </div>
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink sm:pb-2.5">
              <input
                type="checkbox"
                checked={includeRemote || !countryCode}
                disabled={!countryCode}
                onChange={(e) => setIncludeRemote(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              Include remote jobs open to this country
            </label>
          </div>
          <button onClick={handleSearch} disabled={!hasResume || isSearching} className="btn btn-primary">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isSearching ? 'Searching' : result ? 'Search again' : 'Find matching jobs'}
          </button>
        </div>
        <div className="px-6 py-3.5 border-t border-line bg-sunken rounded-b-lg text-[13px] text-muted">
          {!hasResume
            ? 'Add your resume above first. The search uses it to pick job titles and skills.'
            : 'Searches free job boards and ranks each opening by how well it fits your resume.'}
        </div>
      </section>

      {error && (
        <p role="alert" className="text-[13.5px] text-bad">
          {error}
        </p>
      )}

      {isSearching ? (
        <LoadingState title="Searching job boards" detail="Reading your resume, then checking each board for matching openings." />
      ) : !result ? (
        <EmptyState title="No search yet">
          Choose where you want to work and select Find matching jobs. You can then tailor your resume and letters to
          any opening, and send the application.
        </EmptyState>
      ) : (
        <>
          <section className="panel p-6 space-y-3">
            <p className="text-[13.5px] text-ink">
              Searched for <b className="font-semibold">{result.profile.titles.join(', ') || 'roles matching your resume'}</b>
              {result.profile.skills.length > 0 && <> using {result.profile.skills.slice(0, 6).join(', ')}</>}.
            </p>
            {countryCode && !result.onSiteSearch && (
              <p className="text-[13px] text-muted">
                These are remote jobs open to applicants in {result.country}. Jobs based in {result.country} need a
                Careerjet connection, which isn’t set up on this site yet.
              </p>
            )}
            {failed.length > 0 && (
              <p className="text-[13px] text-warn">{failed.join(' and ')} didn’t respond, so results from them are missing.</p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-muted">
              {jobs.length} {jobs.length === 1 ? 'opening' : 'openings'}, best match first
            </p>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              Remote only
            </label>
          </div>

          {jobs.length === 0 ? (
            <EmptyState title="No matching openings found">
              Try another country, include remote jobs, or check that your resume lists your job title and skills.
            </EmptyState>
          ) : (
            <ol className="panel divide-y divide-line">
              {jobs.map((job) => (
                <li key={job.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-ink leading-snug">{job.title}</h3>
                      <p className="text-[13.5px] text-muted mt-0.5">
                        {[job.company, job.location].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <span className={`chip chip-${matchTone(job.match)} tabular-nums shrink-0`}>{job.match}% match</span>
                  </div>

                  {job.excerpt && <p className="text-[13.5px] text-muted mt-2.5 leading-relaxed">{job.excerpt}</p>}

                  {job.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.matchedSkills.map((s) => (
                        <span key={s} className="chip chip-neutral">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <p className="text-xs text-subtle">
                      {postedLabel(job.postedAt) && `${postedLabel(job.postedAt)}, `}via{' '}
                      <a
                        href={job.sourceUrl || SOURCE_SITES[job.source] || job.url}
                        target="_blank"
                        rel="noopener"
                        className="underline hover:text-ink"
                      >
                        {job.source}
                      </a>
                    </p>
                    <div className="flex items-center gap-2">
                      <a href={job.url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
                        <ExternalLink className="w-3.5 h-3.5" /> View posting
                      </a>
                      <button onClick={() => onUseJob(job)} className="btn btn-primary btn-sm">
                        Apply with my resume
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
};
