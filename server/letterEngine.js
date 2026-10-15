import { extractKeywords, extractBulletPoints, analyzeBulletPoint } from './xyzEngine.js';

/**
 * Generates tailored Cover Letter and Application Letter
 */
export function generateApplicationDocuments(resumeText, jobDescriptionText, options = {}) {
  const tone = options.tone || 'confident'; // 'confident' | 'formal' | 'tech' | 'executive'
  const applicantName = options.applicantName || extractApplicantName(resumeText) || '[Your Name]';
  const companyName = options.companyName || extractCompanyName(jobDescriptionText) || '[Hiring Organization]';
  const jobTitle = options.jobTitle || extractJobTitle(jobDescriptionText) || '[Target Role]';

  const bullets = extractBulletPoints(resumeText);
  const jdKeywords = extractKeywords(jobDescriptionText).slice(0, 15);
  const keySkills = jdKeywords.map(k => k.keyword).slice(0, 5).join(', ');

  // Select 2 top XYZ achievements from resume to feature in the letters
  const analyzedBullets = bullets.map(analyzeBulletPoint);
  const bestBullets = analyzedBullets
    .filter(b => b.components.y.present || b.score >= 60)
    .slice(0, 2)
    .map(b => b.rewrite || b.original);

  const achievement1 = bestBullets[0] || 'Accelerated key product initiatives by 35% through robust technical execution and cross-team alignment';
  const achievement2 = bestBullets[1] || 'Streamlined system operations, cutting delivery cycle latency by 40% while upholding rigorous quality standards';

  // 1. Generate Cover Letter
  const coverLetter = buildCoverLetter({
    applicantName,
    companyName,
    jobTitle,
    keySkills,
    achievement1,
    achievement2,
    tone
  });

  // 2. Generate Formal Job Application Letter (Letter of Intent)
  const applicationLetter = buildApplicationLetter({
    applicantName,
    companyName,
    jobTitle,
    keySkills,
    achievement1,
    achievement2,
    tone
  });

  return {
    meta: {
      applicantName,
      companyName,
      jobTitle,
      tone,
      extractedSkills: jdKeywords.map(k => k.keyword).slice(0, 8)
    },
    coverLetter,
    applicationLetter
  };
}

function extractApplicantName(resumeText) {
  if (!resumeText) return '';
  const firstLine = resumeText.trim().split('\n')[0].trim();
  if (firstLine.length < 40 && !firstLine.includes(':') && !firstLine.includes('@')) {
    return firstLine.replace(/^[#*\s]+/, '');
  }
  return '';
}

function extractCompanyName(jdText) {
  if (!jdText) return '';
  const match = jdText.match(/(?:at|company:|about)\s+([A-Z][A-Za-z0-9&.\s]{2,25}(?:Inc|LLC|Corp|Technologies|Solutions|Labs|Group)?)/);
  if (match) return match[1].trim();
  return '';
}

function extractJobTitle(jdText) {
  if (!jdText) return '';
  const match = jdText.match(/(?:role|position|title|seeking an?|hiring an?)\s*:?\s*([A-Za-z0-9\s-]{4,35}(?:engineer|developer|manager|lead|architect|analyst|specialist|designer))/i);
  if (match) return match[1].trim();
  return '';
}

function buildCoverLetter({ applicantName, companyName, jobTitle, keySkills, achievement1, achievement2, tone }) {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let introHook = '';
  if (tone === 'tech') {
    introHook = `I am writing to express my strong enthusiasm for the ${jobTitle} position at ${companyName}. Having followed your recent technical advancements, I am excited by the opportunity to contribute my background in ${keySkills || 'engineering and modern architectures'} to your engineering team.`;
  } else if (tone === 'executive') {
    introHook = `With a consistent track record of aligning strategic vision with high-impact operational execution, I am writing to submit my candidacy for the ${jobTitle} position at ${companyName}.`;
  } else {
    // Confident & Results-Driven
    introHook = `I am excited to apply for the ${jobTitle} opening at ${companyName}. With deep hands-on expertise in ${keySkills || 'scalable solutions and innovative execution'}, I have consistently delivered measurable business outcomes by applying structured Google XYZ performance principles.`;
  }

  return `${applicantName}
${currentDate}

Hiring Team / Search Committee
${companyName}

Subject: Application for ${jobTitle} - ${applicantName}

Dear Hiring Manager,

${introHook}

Throughout my career, I have focused on solving high-stakes challenges by combining technical precision with quantifiable business value. In reviewing your job requirements, I recognized an immediate alignment with my core strengths and achievements:

• Key Accomplishment: ${achievement1}
• High-Impact Execution: ${achievement2}

What particularly draws me to ${companyName} is your dedication to excellence and forward-thinking problem solving. I thrive in collaborative environments where high ownership, rapid iteration, and measurable outcomes are rewarded. My experience in ${keySkills || 'driving scalable solutions'} equips me to hit the ground running and make immediate contributions to your strategic roadmap.

I would welcome the opportunity to discuss how my technical qualifications and data-driven approach will support ${companyName}'s growth goals. Thank you for your time and consideration.

Warm regards,

${applicantName}
`;
}

function buildApplicationLetter({ applicantName, companyName, jobTitle, keySkills, achievement1, achievement2, tone }) {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `${applicantName}
Contact Details: [Phone Number] | [Email Address] | [Location]
${currentDate}

To:
The Human Resources Department / Hiring Official
${companyName}

RE: FORMAL APPLICATION FOR THE POSITION OF ${jobTitle.toUpperCase()}

Dear Sir / Madam,

Please accept this letter and the attached resume as my formal application for the advertised position of ${jobTitle} with ${companyName}.

I bring a rigorous professional background characterized by proven performance, systematic problem solving, and adherence to industry best practices. My qualifications match the requirements outlined in your job specification, particularly regarding proficiency in ${keySkills || 'core technical proficiencies, project execution, and cross-functional leadership'}.

To substantiate my candidacy, please consider the following validated outcomes from my recent professional tenure:
1. Measurable Impact: ${achievement1}.
2. Technical Delivery: ${achievement2}.

I am confident that my work ethic, analytical capability, and dedication to institutional goals will make me a productive asset to ${companyName}. I welcome the opportunity to attend a formal interview to discuss my suitability in greater detail.

Thank you for your consideration.

Yours faithfully,

${applicantName}
`;
}

