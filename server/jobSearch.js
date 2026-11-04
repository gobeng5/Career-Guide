import { callDeepSeek } from './deepseekService.js';
import { extractKeywords } from './xyzEngine.js';
import { htmlToText } from './jobUrlImporter.js';

// Finds openings that suit a resume across free job APIs, then ranks them.
//
// Each source's terms require crediting it and linking to the original posting,
// so every job carries `source` and `url`. Responses are cached because the
// sources ask for infrequent polling (Remotive: at most a few times a day).

const FETCH_TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = 'CareerGuide/1.0 (job search for applicants)';

export const COUNTRIES = {
  GH: { name: 'Ghana', regions: ['africa', 'west africa', 'emea'], careerjet: 'en_GH' },
  NG: { name: 'Nigeria', regions: ['africa', 'west africa', 'emea'], careerjet: 'en_NG' },
  KE: { name: 'Kenya', regions: ['africa', 'east africa', 'emea'], careerjet: 'en_KE' },
  ZA: { name: 'South Africa', regions: ['africa', 'emea'], careerjet: 'en_ZA' },
  GB: { name: 'United Kingdom', aliases: ['uk', 'england'], regions: ['europe', 'emea'], careerjet: 'en_GB' },
  IE: { name: 'Ireland', regions: ['europe', 'emea'], careerjet: 'en_IE' },
  DE: { name: 'Germany', regions: ['europe', 'emea'], careerjet: 'de_DE' },
  NL: { name: 'Netherlands', regions: ['europe', 'emea'], careerjet: 'nl_NL' },
  AE: { name: 'United Arab Emirates', aliases: ['uae', 'dubai'], regions: ['middle east', 'emea'], careerjet: 'en_AE' },
  US: { name: 'United States', aliases: ['usa', 'us'], regions: ['north america', 'americas'], careerjet: 'en_US' },
  CA: { name: 'Canada', regions: ['north america', 'americas'], careerjet: 'en_CA' },
  AU: { name: 'Australia', regions: ['apac', 'asia pacific'], careerjet: 'en_AU' },
  IN: { name: 'India', regions: ['apac', 'asia', 'asia pacific'], careerjet: 'en_IN' }
};

const ANYWHERE = ['worldwide', 'anywhere', 'global', 'all countries'];

const cache = new Map();

async function getJson(url, init = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const response = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  cache.set(url, { at: Date.now(), data });
  return data;
}

// --- Search profile from the resume ---

const GENERIC = new Set([
  'experience', 'team', 'work', 'skills', 'management', 'professional', 'summary', 'education', 'years',
  'responsible', 'development', 'company', 'present', 'university', 'bachelor', 'degree', 'data'
]);

function offlineProfile(resumeText) {
  const lines = resumeText.split('\n').map((l) => l.trim()).filter(Boolean);
  // The line under the name is usually the headline: "Senior Software Engineer | email | phone"
  const headline = (lines[1] || '').split('|')[0].trim();
  const titles = headline && headline.split(/\s+/).length <= 6 && !/[@\d]/.test(headline) ? [headline] : [];

  const skillsLine = resumeText.match(/^\s*(?:technical\s+)?skills\s*:?\s*\n?(.+)$/im)?.[1] || '';
  const listed = skillsLine.split(/[,;|•]/).map((s) => s.trim()).filter((s) => s && s.length < 30);
  // The resume's own skills list is far more reliable than keyword extraction; only fall back when it's missing
  const extracted =
    listed.length >= 3
      ? []
      : extractKeywords(resumeText)
          .map((k) => k.keyword)
          .filter((k) => !GENERIC.has(k.toLowerCase()) && !/[@.]/.test(k));

  // Case-insensitive de-duplication, keeping the resume's own spelling; drop words from the name line
  const nameWords = new Set((lines[0] || '').toLowerCase().split(/\s+/));
  const skills = [];
  for (const skill of [...listed, ...extracted]) {
    const key = skill.toLowerCase();
    if (!nameWords.has(key) && !skills.some((s) => s.toLowerCase() === key)) skills.push(skill);
  }
  skills.splice(12);
  return { titles, skills, seniority: /\b(senior|lead|principal|head)\b/i.test(headline) ? 'senior' : '' };
}

export async function buildSearchProfile(resumeText, apiKey, model) {
  const fallback = offlineProfile(resumeText);
  if (!apiKey) return fallback;

  try {
    const response = await callDeepSeek({
      apiKey,
      model,
      temperature: 0.2,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content: `You turn a resume into a job search profile. Output strictly valid JSON:
{"titles": [string], "skills": [string], "seniority": "entry" | "mid" | "senior" | ""}
- titles: 2-3 short, common job titles this person should search for (e.g. "Data Analyst"), most suitable first. Use standard titles job boards use, 1-4 words each.
- skills: up to 12 concrete skills, tools or qualifications actually present in the resume, as written there.
- Use only what the resume supports.`
        },
        { role: 'user', content: resumeText.slice(0, 12000) }
      ]
    });
    const profile = JSON.parse(response.content);
    const titles = (profile.titles || []).filter((t) => typeof t === 'string' && t.trim()).slice(0, 3);
    const skills = (profile.skills || []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 12);
    return titles.length ? { titles, skills: skills.length ? skills : fallback.skills, seniority: profile.seniority || '' } : fallback;
  } catch (err) {
    console.warn('[Jobs] Profile fallback:', err.message);
    return fallback;
  }
}

// --- Location eligibility for remote boards ---

function locationAllows(location, country, includeRemote) {
  const text = String(location || '').toLowerCase().trim();
  if (!text) return includeRemote; // no restriction listed
  if (includeRemote && ANYWHERE.some((w) => text.includes(w))) return true;
  if (!country) return includeRemote;
  const names = [country.name, ...(country.aliases || [])].map((n) => n.toLowerCase());
  if (names.some((n) => new RegExp(`\\b${n}\\b`).test(text))) return true;
  return includeRemote && country.regions.some((r) => text.includes(r));
}

const clip = (text, n) => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);
const toText = (html) => htmlToText(String(html || ''));

// --- Sources ---
// Each returns normalised jobs:
// { id, title, company, location, remote, url, source, postedAt, description }

async function fromHimalayas(titles, countryCode, includeRemote) {
  if (!includeRemote) return [];
  const countryName = COUNTRIES[countryCode]?.name;
  // Generous limits (60/min), so search the top two titles
  const pages = await Promise.all(
    titles.slice(0, 2).map((q) => {
      const params = new URLSearchParams({ q });
      if (countryCode) params.set('country', countryCode);
      else params.set('worldwide', 'true');
      return getJson(`https://himalayas.app/jobs/api/search?${params}`);
    })
  );
  return pages.flatMap((data) => data.jobs || []).map((j) => ({
    id: `himalayas:${j.guid}`,
    title: j.title,
    company: j.companyName,
    location: !j.locationRestrictions?.length
      ? 'Remote, worldwide'
      : countryName && j.locationRestrictions.length > 3
      ? `Remote, open to applicants in ${countryName}`
      : `Remote: ${j.locationRestrictions.join(', ')}`,
    remote: true,
    url: j.applicationLink || j.guid,
    sourceUrl: j.guid,
    source: 'Himalayas',
    postedAt: j.pubDate ? new Date(Number(j.pubDate) * (String(j.pubDate).length <= 10 ? 1000 : 1)).toISOString() : null,
    description: toText(j.description || j.excerpt)
  }));
}

async function fromRemotive(query, country, includeRemote) {
  if (!includeRemote) return [];
  const data = await getJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`);
  return (data.jobs || [])
    .filter((j) => locationAllows(j.candidate_required_location, country, true))
    .map((j) => ({
      id: `remotive:${j.id}`,
      title: j.title,
      company: j.company_name,
      location: `Remote: ${j.candidate_required_location || 'worldwide'}`,
      remote: true,
      url: j.url,
      source: 'Remotive',
      postedAt: j.publication_date || null,
      description: toText(j.description)
    }));
}

async function fromJobicy(query, country, includeRemote) {
  if (!includeRemote) return [];
  // Jobicy's tag matches job titles, so search with the title's last word too (e.g. "analyst")
  const data = await getJson(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(query)}`);
  return (data.jobs || [])
    .filter((j) => locationAllows(j.jobGeo, country, true))
    .map((j) => ({
      id: `jobicy:${j.id}`,
      title: toText(j.jobTitle),
      company: j.companyName,
      location: `Remote: ${j.jobGeo || 'worldwide'}`,
      remote: true,
      url: j.url,
      source: 'Jobicy',
      postedAt: j.pubDate || null,
      description: toText(j.jobDescription || j.jobExcerpt)
    }));
}

async function fromRemoteOK(country, includeRemote) {
  if (!includeRemote) return [];
  const data = await getJson('https://remoteok.com/api');
  return (Array.isArray(data) ? data.slice(1) : [])
    .filter((j) => j.position && locationAllows(j.location, country, true))
    .map((j) => ({
      id: `remoteok:${j.id}`,
      title: j.position,
      company: j.company,
      location: `Remote: ${j.location || 'worldwide'}`,
      remote: true,
      url: j.url,
      source: 'Remote OK',
      postedAt: j.date || null,
      description: toText(j.description)
    }));
}

async function fromArbeitnow(country, includeRemote) {
  // Arbeitnow lists European (mostly German) jobs; its "remote" usually means remote within that country
  const inEurope = !country || country.regions.includes('europe');
  if (!inEurope) return [];
  const data = await getJson('https://www.arbeitnow.com/api/job-board-api');
  return (data.data || [])
    .filter((j) => (j.remote && includeRemote) || locationAllows(j.location, country, false))
    .map((j) => ({
      id: `arbeitnow:${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: j.remote ? `Remote (${j.location})` : j.location,
      remote: !!j.remote,
      url: j.url,
      source: 'Arbeitnow',
      postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
      description: toText(j.description)
    }));
}

// On-site jobs in a country. Needs a free Careerjet publisher key, and Careerjet
// requires the searching user's IP address and browser user agent.
async function fromCareerjet(query, countryCode, user) {
  const key = process.env.CAREERJET_API_KEY;
  const locale = COUNTRIES[countryCode]?.careerjet;
  if (!key || !locale) return [];

  const params = new URLSearchParams({
    locale_code: locale,
    keywords: query,
    page_size: '50',
    sort: 'relevance',
    user_ip: user.ip || '0.0.0.0',
    user_agent: user.agent || USER_AGENT
  });
  const data = await getJson(`https://search.api.careerjet.net/v4/query?${params}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` }
  });
  return (data.jobs || []).map((j) => ({
    id: `careerjet:${j.url}`,
    title: j.title,
    company: j.company || '',
    location: j.locations || COUNTRIES[countryCode].name,
    remote: false,
    url: j.url,
    source: 'Careerjet',
    postedAt: j.date ? new Date(j.date).toISOString() : null,
    description: toText(j.description)
  }));
}

// --- Ranking ---

const words = (text) => new Set(String(text).toLowerCase().match(/[a-z0-9+#.]+/g) || []);

function scoreJob(job, profile) {
  const haystack = `${job.title}\n${job.description}`.toLowerCase();
  const matchedSkills = profile.skills.filter((skill) => {
    const s = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${s}(?![a-z0-9])`).test(haystack);
  });

  const jobTitleWords = words(job.title);
  const titleScore = Math.max(
    0,
    ...profile.titles.map((t) => {
      const tw = [...words(t)];
      return tw.length ? tw.filter((w) => jobTitleWords.has(w)).length / tw.length : 0;
    })
  );
  const skillScore = profile.skills.length ? Math.min(1, matchedSkills.length / Math.min(6, profile.skills.length)) : 0;
  const ageDays = job.postedAt ? (Date.now() - new Date(job.postedAt).getTime()) / 86400000 : 60;
  const freshness = Math.max(0, 1 - ageDays / 60);

  const match = Math.round(100 * (0.5 * titleScore + 0.4 * skillScore + 0.1 * freshness));
  return { match, matchedSkills };
}

// --- Entry point ---

export async function findJobs({ resumeText, countryCode, includeRemote = true, apiKey, model, user = {} }) {
  const code = countryCode && COUNTRIES[countryCode] ? countryCode : '';
  const country = code ? COUNTRIES[code] : null;
  const profile = await buildSearchProfile(resumeText, apiKey, model);
  const query = profile.titles[0] || profile.skills.slice(0, 2).join(' ') || 'analyst';
  const titleTail = query.split(/\s+/).pop();

  const sources = [
    ['Careerjet', () => fromCareerjet(query, code, user)],
    ['Himalayas', () => fromHimalayas(profile.titles.length ? profile.titles : [query], code, includeRemote)],
    ['Remotive', () => fromRemotive(query, country, includeRemote)],
    ['Jobicy', () => fromJobicy(titleTail, country, includeRemote)],
    ['Remote OK', () => fromRemoteOK(country, includeRemote)],
    ['Arbeitnow', () => fromArbeitnow(country, includeRemote)]
  ];

  const settled = await Promise.allSettled(sources.map(([, run]) => run()));
  const status = settled.map((r, i) => ({
    name: sources[i][0],
    count: r.status === 'fulfilled' ? r.value.length : 0,
    ...(r.status === 'rejected' ? { error: 'unavailable' } : {})
  }));
  settled.forEach((r, i) => r.status === 'rejected' && console.warn(`[Jobs] ${sources[i][0]} failed:`, r.reason?.message));

  const seen = new Set();
  const jobs = settled
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((job) => job.title && job.url)
    .filter((job) => {
      const key = `${job.title}|${job.company}`.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((job) => ({ ...job, ...scoreJob(job, profile) }))
    .filter((job) => job.match >= 40)
    .sort((a, b) => b.match - a.match)
    .slice(0, 40)
    .map((job) => ({ ...job, excerpt: clip(job.description.replace(/\s+/g, ' '), 220), description: clip(job.description, 15000) }));

  return {
    profile,
    country: country?.name || 'Anywhere',
    onSiteSearch: !!process.env.CAREERJET_API_KEY && !!country?.careerjet,
    sources: status,
    jobs
  };
}
