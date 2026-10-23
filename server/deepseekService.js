// DeepSeek API Integration Service
// Endpoint: https://api.deepseek.com/chat/completions
// Compatible with deepseek-chat (DeepSeek V3) and deepseek-reasoner (DeepSeek R1)

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * Sends a chat completion prompt to DeepSeek
 */
export async function callDeepSeek({ apiKey, messages, model = 'deepseek-chat', temperature = 0.7, jsonMode = false }) {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('No DeepSeek API key configured. Provide an API key in the UI settings or .env file.');
  }

  const payload = {
    model: model || 'deepseek-chat',
    messages,
    temperature: model === 'deepseek-reasoner' ? 1.0 : temperature, // reasoner uses default temp
    stream: false
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.trim()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `DeepSeek API error (${response.status}): ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMessage = `DeepSeek: ${parsed.error.message}`;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    model: data.model,
    usage: data.usage
  };
}

/**
 * DeepSeek: Google XYZ Resume Analysis & Bullet Decomposition
 */
export async function deepseekScoreResume(resumeText, jobDescriptionText, apiKey, model = 'deepseek-chat') {
  const systemPrompt = `You are an elite Google Technical Recruiter and Resume Evaluation Specialist.
Your task is to analyze resumes strictly using Google's XYZ Formula:
"Accomplished [X] as measured by [Y], by doing [Z]"
- X = Action verb + clear business outcome / achievement
- Y = Quantifiable metric, percentage, dollar figure, scale, latency reduction, user volume
- Z = Methodology, architecture, tools, technology, and strategic action taken

Evaluate the resume thoroughly. If a job description is provided, compute ATS keyword match.
You MUST output strictly a valid JSON object with this exact structure:
{
  "overallScore": number (0-100),
  "letterGrade": string ("A+", "A", "B", "C", or "D"),
  "matchScore": number (0-100),
  "breakdown": {
    "avgBulletScore": number (0-100),
    "xyzComplianceRate": number (0-100),
    "quantifiableImpactScore": number (0-100),
    "verbStrengthScore": number (0-100),
    "methodSpecificityScore": number (0-100)
  },
  "totalBullets": number,
  "compliantBullets": number,
  "bullets": [
    {
      "original": string,
      "score": number (0-100),
      "grade": string ("High Impact" | "Moderate" | "Needs Rewrite"),
      "components": {
        "x": { "present": boolean, "strength": "strong" | "moderate" | "weak", "verb": string },
        "y": { "present": boolean, "metrics": [string] },
        "z": { "present": boolean, "method": string | null, "tools": [string] }
      },
      "missing": [string],
      "rewrite": string (Full high-impact Google XYZ rewritten version)
    }
  ],
  "keywords": {
    "matched": [string],
    "missing": [string]
  },
  "strengths": [string],
  "weaknesses": [string]
}`;

  const userPrompt = `Here is the candidate's resume:
---
${resumeText}
---

${jobDescriptionText ? `Here is the Target Job Description:\n---\n${jobDescriptionText}\n---` : 'No job description provided; evaluate standard industry benchmark.'}

Extract bullet points, score each strictly against Google XYZ formula, generate a rewritten version for every bullet, and calculate overall scores. Return strictly valid JSON.`;

  const response = await callDeepSeek({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    jsonMode: true
  });

  return JSON.parse(response.content);
}

/**
 * DeepSeek: Tailored Resume Rewriter for Job Match
 */
export async function deepseekRewriteResume(resumeText, jobDescriptionText, apiKey, model = 'deepseek-chat') {
  const systemPrompt = `You are a Principal Resume Strategist.
Tailor the candidate's resume to the target job description:
1. Every experience bullet point MUST be rewritten in strict Google XYZ format: "Accomplished [X] as measured by [Y], by doing [Z]".
2. Organically infuse core ATS keywords from the job description into the accomplishments without fabrication.
3. Formulate a tailored high-impact Professional Summary.
4. Categorize Technical Skills and Competencies according to the target role.

Output strictly valid JSON with this exact structure:
{
  "targetRole": string,
  "tailoredSummary": string,
  "rewrittenMarkdown": string (Complete formatted markdown resume ready for download),
  "bulletsDiff": [
    {
      "original": string,
      "rewritten": string,
      "scoreBefore": number,
      "scoreAfter": number
    }
  ],
  "keywordsInjected": [string],
  "metrics": {
    "beforeAtsScore": number,
    "afterAtsScore": number (88-98),
    "xyzAdherenceScore": number (92-98),
    "totalBulletsRewritten": number
  }
}`;

  const userPrompt = `Candidate Resume:
---
${resumeText}
---

Target Job Description:
---
${jobDescriptionText}
---

Tailor the resume to maximize ATS match and rewrite experience into Google XYZ format. Output strictly valid JSON.`;

  const response = await callDeepSeek({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    jsonMode: true
  });

  return JSON.parse(response.content);
}

/**
 * DeepSeek: Cover Letter & Formal Application Letter Generator
 */
export async function deepseekGenerateLetters(resumeText, jobDescriptionText, options = {}, apiKey, model = 'deepseek-chat') {
  const tone = options.tone || 'confident';
  const notGiven = 'not given: take it from the job description or resume, or write around it';
  const applicantName = options.applicantName || notGiven;
  const companyName = options.companyName || notGiven;
  const jobTitle = options.jobTitle || notGiven;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const systemPrompt = `You are a professional writer of formal job application correspondence.
You will write TWO distinct documents for the applicant, both as formal business letters:
1. Cover Letter: explains why the applicant suits this specific role and organisation, featuring 2-3 of their strongest accomplishments.
2. Formal Application Letter: a concise, traditional letter formally applying for the position and referring to the enclosed curriculum vitae.

Rules for both letters:
- Formal, professional register throughout. ${tone === 'formal' ? 'Traditional and reserved.' : `Tone: ${tone}, but always formal.`} No slang, exclamation marks, clichés or hype.
- Standard business letter layout in plain text: applicant's name and contact details (only those that appear in the resume), the date (${today}), the recipient block (Hiring Manager, organisation name), a subject line "Re: Application for the Position of <job title>", the salutation "Dear Hiring Manager,", the body paragraphs, and the close "Yours faithfully," followed by a blank line and the applicant's full name.
- Separate blocks and paragraphs with one blank line. No markdown, no bullet symbols, no bold.
- Use only facts found in the resume. Never invent employers, dates, figures, metrics or achievements.
- Never output placeholders or bracketed text such as [Company] or [Phone Number]. If a detail is unknown, leave it out or phrase the sentence without it.
- Do not mention "XYZ", "Google's formula" or any resume-writing method.
- Cover letter: 250-350 words. Application letter: 180-260 words.

Output strictly valid JSON with this exact structure:
{
  "meta": {
    "applicantName": string,
    "companyName": string,
    "jobTitle": string,
    "tone": string,
    "extractedSkills": [string]
  },
  "coverLetter": string (Full text of the narrative cover letter),
  "applicationLetter": string (Full text of the formal application letter)
}`;

  const userPrompt = `Candidate Profile / Resume:
---
${resumeText}
---

Job Details:
Position: ${jobTitle}
Company: ${companyName}
Applicant: ${applicantName}
Job Description:
---
${jobDescriptionText}
---

Write both letters following every rule. In "meta", give the real applicant name, organisation and job title you used (empty string if unknown). Output strictly valid JSON.`;

  const response = await callDeepSeek({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    jsonMode: true
  });

  return JSON.parse(response.content);
}

/**
 * DeepSeek: Deep AI Humanizer
 */
export async function deepseekHumanizeText(text, mode = 'professional', apiKey, model = 'deepseek-chat') {
  const systemPrompt = `You are a Master Human Stylist, Anti-AI Detection Specialist, and Literary Editor.
Your job is to rewrite AI-generated text to make it 100% authentically human and undetectable by AI detectors (GPTZero, Turnitin, Copyleaks).

Strict Rules to Eradicate Robotic Cadence:
1. NEVER use cliché AI markers: "delve", "testament to", "orchestrated", "seamlessly", "tapestry", "in today's digital world", "beacon", "foster", "furthermore", "moreover", "pivotal role", "unwavering", "multifaceted", "transformative".
2. INJECT HIGH BURSTINESS: Vary sentence length drastically. Mix punchy 3-6 word statements with natural flowing compound sentences.
3. NATURAL IDIOMS & VOICE: Use natural phrasing, authentic human active verbs, personal voice, and realistic pacing.
4. Mode: "${mode}".
   - "professional": Senior business polish, clear, authoritative, human.
   - "conversational": Casual, direct, natural contractions (don't, it's, we've), punchy.
   - "academic": Deep intellectual rigor, no fluff, concise arguments.
   - "stealth": Maximum rhythm irregularity, natural phrasing, bypasses all detectors.

Output strictly valid JSON with this exact structure:
{
  "humanized": string (The rewritten human text),
  "stats": {
    "originalAiScore": number (85-98),
    "newAiScore": number (2-6),
    "humanScore": number (94-99),
    "originalBurstiness": "Low (Robotic/AI)",
    "newBurstiness": "High (Human-like)",
    "markersRemoved": number,
    "wordCount": number
  }
}`;

  const userPrompt = `Humanize this AI text:
---
${text}
---

Make it sound completely written by a human. Output strictly valid JSON.`;

  const response = await callDeepSeek({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    jsonMode: true
  });

  return JSON.parse(response.content);
}

