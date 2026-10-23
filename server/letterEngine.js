import { extractKeywords, extractBulletPoints, analyzeBulletPoint } from './xyzEngine.js';

/**
 * Generates tailored Cover Letter and Application Letter (offline fallback).
 * Letters follow formal business-letter conventions, use only facts found in
 * the resume, and never contain placeholders: unknown details are left out.
 */
export function generateApplicationDocuments(resumeText, jobDescriptionText, options = {}) {
  const tone = options.tone || 'confident'; // 'confident' | 'formal' | 'tech' | 'executive'
  const applicantName = options.applicantName || extractApplicantName(resumeText);
  const companyName = options.companyName || extractCompanyName(jobDescriptionText);
  const jobTitle = options.jobTitle || extractJobTitle(jobDescriptionText);
  const contact = extractContactDetails(resumeText);

  const bullets = extractBulletPoints(resumeText);
  const jdKeywords = extractKeywords(jobDescriptionText).slice(0, 15);
  const keySkills = listJoin(sharedSkills(jdKeywords.map(k => k.keyword), resumeText).slice(0, 4));

  // Feature up to 2 of the applicant's own strongest bullets, as written in the resume.
  // Bullets with figures come first: they are the most convincing evidence.
  const achievements = bullets
    .map(analyzeBulletPoint)
    .map(b => ({ ...b, rank: b.score + (/\d/.test(b.original) ? 100 : 0) }))
    .filter(b => /\d/.test(b.original) || b.score >= 60)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 2)
    .map(b => sentence(b.original));

  const facts = { applicantName, companyName, jobTitle, contact, keySkills, achievements, tone };

  return {
    meta: {
      applicantName,
      companyName,
      jobTitle,
      tone,
      extractedSkills: jdKeywords.map(k => k.keyword).slice(0, 8)
    },
    coverLetter: buildCoverLetter(facts),
    applicationLetter: buildApplicationLetter(facts)
  };
}

function extractApplicantName(resumeText) {
  if (!resumeText) return '';
  const firstLine = resumeText.trim().split('\n')[0].trim().replace(/^[#*\s]+/, '');
  if (firstLine.length < 40 && !firstLine.includes(':') && !firstLine.includes('@') && !/\d/.test(firstLine)) {
    return firstLine;
  }
  return '';
}

function extractCompanyName(jdText) {
  if (!jdText) return '';
  const labelled = jdText.match(/^\s*Company:\s*(.{2,60})$/im);
  if (labelled) return labelled[1].trim();
  const match = jdText.match(/(?:at|about)\s+([A-Z][A-Za-z0-9&.\s]{2,25}(?:Inc|LLC|Corp|Technologies|Solutions|Labs|Group)?)/);
  return match ? match[1].trim() : '';
}

function extractJobTitle(jdText) {
  if (!jdText) return '';
  // Imported postings and most pasted ones start with the job title
  const firstLine = jdText.trim().split('\n')[0].trim();
  if (firstLine.length > 2 && firstLine.split(/\s+/).length <= 8 && !/[.:@!?]/.test(firstLine)) {
    return firstLine;
  }
  const match = jdText.match(/(?:role|position|title|seeking an?|hiring an?)\s*:\s*([A-Za-z0-9\s-]{4,35}(?:engineer|developer|manager|lead|architect|analyst|specialist|designer|officer|accountant|consultant|coordinator|assistant|administrator))/i);
  return match ? match[1].trim() : '';
}

// Words too general to present as skills in a letter
const GENERIC_WORDS = new Set([
  'data', 'business', 'performance', 'experience', 'team', 'teams', 'work', 'skills', 'management', 'support',
  'ability', 'strong', 'role', 'years', 'knowledge', 'requirements', 'responsibilities', 'analyst', 'engineer',
  'development', 'company', 'solutions', 'services', 'customer', 'customers', 'growth', 'power', 'senior', 'junior'
]);

// Job-posting keywords the resume also mentions, written as the resume writes them
function sharedSkills(keywords, resumeText) {
  const found = [];
  for (const keyword of keywords) {
    if (GENERIC_WORDS.has(keyword.toLowerCase())) continue;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = resumeText.match(new RegExp(`(?<![\\w.])${escaped}(?![\\w])`, 'i'));
    if (match && !found.some(f => f.toLowerCase() === match[0].toLowerCase())) found.push(match[0]);
  }
  return found;
}

function extractContactDetails(resumeText) {
  const header = (resumeText || '').slice(0, 800);
  return [
    header.match(/\+?\(?\d[\d\s().-]{7,}\d/)?.[0]?.trim(),
    header.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  ].filter(Boolean);
}

const listJoin = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const IRREGULAR_PAST = new Set([
  'built', 'led', 'ran', 'grew', 'cut', 'won', 'made', 'drove', 'wrote', 'taught', 'set', 'sold', 'brought', 'began',
  'took', 'gave', 'kept', 'held', 'met', 'oversaw', 'rebuilt', 'spent', 'saw', 'found', 'chose', 'shipped'
]);

// A resume bullet as a first-person sentence: "Built X" becomes "I built X."
function sentence(text) {
  let clean = text.replace(/^[-*•\d.)\s]+/, '').trim();
  const firstWord = clean.split(/\s+/)[0].toLowerCase();
  if (/^[a-z]+ed$/.test(firstWord) || IRREGULAR_PAST.has(firstWord)) {
    clean = `I ${clean[0].toLowerCase()}${clean.slice(1)}`;
  }
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function letterHeader({ applicantName, companyName, jobTitle, contact }) {
  return [
    [applicantName, ...contact].filter(Boolean).join('\n'),
    today(),
    ['The Hiring Manager', companyName].filter(Boolean).join('\n'),
    jobTitle ? `Re: Application for the Position of ${jobTitle}` : 'Re: Application for the Advertised Vacancy',
    'Dear Hiring Manager,'
  ];
}

const signOff = (applicantName) => ['Yours faithfully,', applicantName].filter(Boolean).join('\n\n');

function buildCoverLetter(facts) {
  const { companyName, jobTitle, keySkills, achievements, tone } = facts;
  const position = jobTitle ? `the position of ${jobTitle}` : 'the advertised position';
  const at = companyName ? ` at ${companyName}` : '';
  const employer = companyName || 'your organisation';

  const opening = {
    tech: `I am writing to apply for ${position}${at}. The technical scope of the role${keySkills ? `, particularly its emphasis on ${keySkills},` : ''} closely matches the work I have been doing, and I would value the opportunity to contribute to your team.`,
    executive: `I am writing to submit my application for ${position}${at}. Throughout my career I have focused on aligning strategy with disciplined execution, and I believe this experience would be of value to ${employer}.`,
    formal: `I wish to apply for ${position}${at}, and I enclose my curriculum vitae for your consideration.`,
    confident: `I am writing to apply for ${position}${at}. My experience${keySkills ? ` in ${keySkills}` : ''} has prepared me well for the responsibilities of this role.`
  }[tone] || '';

  const evidence = achievements.length
    ? `In my recent work, I have delivered results that are directly relevant to this position. ${achievements.join(' ')}`
    : `My experience has given me a sound grounding in the responsibilities this role involves, and I take a careful, results-focused approach to my work.`;

  const fit = `I am drawn to ${employer} because the role offers the opportunity to apply my skills where they can make a measurable difference. I work well both independently and as part of a team, and I hold myself to high professional standards.`;

  const close = `I would welcome the opportunity to discuss my application with you at an interview. Thank you for your time and consideration.`;

  return [...letterHeader(facts), opening, evidence, fit, close, signOff(facts.applicantName)].join('\n\n') + '\n';
}

function buildApplicationLetter(facts) {
  const { companyName, jobTitle, keySkills, achievements } = facts;
  const position = jobTitle ? `the position of ${jobTitle}` : 'the advertised position';
  const at = companyName ? ` with ${companyName}` : '';

  const body = [
    `Please accept this letter and the enclosed curriculum vitae as my formal application for ${position}${at}.`,
    `I believe that my qualifications and experience meet the requirements set out in the job description${keySkills ? `, particularly with regard to ${keySkills}` : ''}.${achievements[0] ? ` For example, ${achievements[0][0].toLowerCase() === 'i' && achievements[0][1] === ' ' ? achievements[0] : achievements[0][0].toLowerCase() + achievements[0].slice(1)}` : ''}`,
    `I am confident that I would make a positive contribution to ${companyName || 'your organisation'}, and I would welcome the opportunity to attend an interview to discuss my suitability in greater detail.`,
    'Thank you for considering my application.'
  ];

  return [...letterHeader(facts), ...body, signOff(facts.applicantName)].join('\n\n') + '\n';
}
