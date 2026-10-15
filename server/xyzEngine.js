// Google XYZ Resume Scoring and Analysis Engine
// Formula: Accomplished [X] as measured by [Y], by doing [Z]

const STRONG_ACTION_VERBS = new Set([
  'spearheaded', 'engineered', 'architected', 'accelerated', 'optimized',
  'overhauled', 'streamlined', 'pioneered', 'championed', 'deployed',
  'automated', 'delivered', 'orchestrated', 'transformed', 'negotiated',
  'scaled', 'executed', 'formulated', 'devised', 'established',
  'generated', 'increased', 'reduced', 'maximized', 'minimized',
  'built', 'designed', 'launched', 'mentored', 'modernized',
  'revamped', 'instituted', 'directed', 'expanded', 'boosted'
]);

const WEAK_VERBS = new Set([
  'worked', 'helped', 'assisted', 'handled', 'responsible',
  'participated', 'involved', 'supported', 'did', 'tried',
  'attempted', 'served', 'was tasked', 'contributed to', 'dealt with'
]);

const METHOD_CONNECTORS = [
  /\bby\s+(?:implementing|designing|building|developing|creating|leveraging|utilizing|migrating|automating|refactoring|leading|executing|introducing|adopting|crafting|integrating)\b/i,
  /\b(?:utilizing|leveraging|through|via|employing|using)\b/i,
  /\bwith\s+the\s+(?:use|aid|help|implementation)\s+of\b/i,
  /\bby\s+[a-z]+ing\b/i
];

const METRIC_PATTERNS = [
  /\b\d+(?:\.\d+)?%\b/,                          // e.g. 25%, 3.5%
  /\$(?:(?:\d{1,3}(?:,\d{3})+)|(?:\d+))(?:\.\d+)?(?:\s*(?:k|m|b|million|billion|thousand))?\b/i, // $500k, $1.2M, $50,000
  /\b\d+(?:\.\d+)?\s*(?:x|fold)\b/i,             // 3x, 10-fold
  /\b(?:reduced|increased|improved|saved|boosted|cut|slashed|grew)\s+(?:by\s+)?\d+/i,
  /\b(?:from|to)\s+\d+(?:%|[a-z]+)?\s+(?:to|from)\s+\d+/i, // from 50 to 10
  /\b\d+\+?\s*(?:users|clients|customers|subscribers|transactions|downloads|views|visitors|leads|tickets|endpoints|nodes|servers)\b/i,
  /\b\d+\+?\s*(?:hours|days|weeks|months|minutes|seconds|ms)\b/i,
  /\b\d+\+?\s*(?:team members|engineers|developers|direct reports|stakeholders)\b/i
];

const COMMON_TECH_KEYWORDS = [
  'python', 'javascript', 'typescript', 'react', 'next.js', 'node.js', 'vue',
  'angular', 'java', 'c++', 'c#', '.net', 'golang', 'rust', 'ruby', 'rails',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'elasticsearch',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'github actions',
  'kafka', 'graphql', 'rest api', 'microservices', 'git', 'linux', 'agile', 'scrum',
  'machine learning', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy',
  'llm', 'generative ai', 'prompt engineering', 'openai', 'gemini', 'rag',
  'figma', 'ui/ux', 'seo', 'sem', 'google analytics', 'crm', 'salesforce',
  'project management', 'jira', 'confluence', 'tableau', 'power bi'
];

/**
 * Extracts bullet points and text blocks from resume content
 */
export function extractBulletPoints(text) {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = [];

  for (const line of lines) {
    // Check if line starts with a bullet marker or dash or number
    const bulletMatch = line.match(/^[-*•▪–—]\s*(.*)$/) || line.match(/^\d+[.)]\s*(.*)$/);
    if (bulletMatch) {
      const clean = bulletMatch[1].trim();
      if (clean.length > 15) bullets.push(clean);
    } else if (line.length > 25 && line.length < 300) {
      // Could be a standalone achievement sentence
      const firstWord = line.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      if (STRONG_ACTION_VERBS.has(firstWord) || WEAK_VERBS.has(firstWord) || /^[A-Z][a-z]+ed\b/.test(line)) {
        bullets.push(line);
      }
    }
  }

  // Fallback: If no bullets were cleanly captured, split by sentences
  if (bullets.length < 3) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (trimmed.length > 25 && trimmed.length < 250) {
        bullets.push(trimmed);
      }
    }
  }

  return bullets.slice(0, 30); // reasonable cap for deep analysis
}

/**
 * Evaluates a single bullet point against the Google XYZ formula
 */
export function analyzeBulletPoint(bulletText) {
  const words = bulletText.split(/\s+/);
  const firstWord = words[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
  const firstTwoWords = words.slice(0, 2).join(' ').toLowerCase();

  // 1. Evaluate X (Accomplished [X])
  let hasX = false;
  let verbStrength = 'neutral';
  let detectedVerb = firstWord;

  if (STRONG_ACTION_VERBS.has(firstWord) || /^[a-z]+ed$/.test(firstWord)) {
    hasX = true;
    verbStrength = STRONG_ACTION_VERBS.has(firstWord) ? 'strong' : 'moderate';
  } else if (WEAK_VERBS.has(firstWord) || WEAK_VERBS.has(firstTwoWords)) {
    hasX = true;
    verbStrength = 'weak';
    detectedVerb = WEAK_VERBS.has(firstTwoWords) ? firstTwoWords : firstWord;
  } else if (/^[A-Z][a-z]+ed\b/.test(bulletText)) {
    hasX = true;
    verbStrength = 'moderate';
  }

  // 2. Evaluate Y (Measured by [Y])
  let hasY = false;
  let matchedMetrics = [];

  for (const pattern of METRIC_PATTERNS) {
    const match = bulletText.match(pattern);
    if (match) {
      hasY = true;
      matchedMetrics.push(match[0]);
    }
  }

  // 3. Evaluate Z (By doing [Z])
  let hasZ = false;
  let matchedMethod = null;

  for (const connector of METHOD_CONNECTORS) {
    const match = bulletText.match(connector);
    if (match) {
      hasZ = true;
      matchedMethod = match[0];
      break;
    }
  }

  // Also check for technical tool mentions as evidence of Z
  const lowerText = bulletText.toLowerCase();
  const foundTools = COMMON_TECH_KEYWORDS.filter(tool => lowerText.includes(tool));
  if (foundTools.length > 0 && !hasZ) {
    hasZ = true;
    matchedMethod = `using ${foundTools.slice(0, 2).join(', ')}`;
  }

  // Bullet Scoring (0 - 100)
  let score = 20;
  if (hasX) score += verbStrength === 'strong' ? 30 : (verbStrength === 'moderate' ? 20 : 10);
  if (hasY) score += 35;
  if (hasZ) score += 20;
  score = Math.min(100, score);

  // Recommendations and XYZ Breakdown
  const missing = [];
  if (!hasX || verbStrength === 'weak') {
    missing.push('Replace weak/passive starter with an authoritative action verb (e.g., "Architected", "Engineered", "Optimized")');
  }
  if (!hasY) {
    missing.push('Add quantifiable metrics [Y] (e.g., % improvement, $ saved, latency reduction, user count, team size)');
  }
  if (!hasZ) {
    missing.push('Specify the exact methodology/tool [Z] used (e.g., "by deploying Docker containers", "by refactoring legacy SQL queries")');
  }

  // Generate an automated XYZ rewritten suggestion
  const rewritten = generateXYZRewrite(bulletText, { hasX, hasY, hasZ, verbStrength, detectedVerb, matchedMetrics, foundTools });

  return {
    original: bulletText,
    score,
    grade: score >= 85 ? 'High Impact' : (score >= 60 ? 'Moderate' : 'Needs Rewrite'),
    components: {
      x: { present: hasX, strength: verbStrength, verb: detectedVerb },
      y: { present: hasY, metrics: matchedMetrics },
      z: { present: hasZ, method: matchedMethod, tools: foundTools }
    },
    missing,
    rewrite: rewritten
  };
}

/**
 * Generates an automated Google XYZ rewrite for a bullet point
 */
function generateXYZRewrite(original, meta) {
  let clean = original.replace(/^[-*•▪–—]\s*/, '').trim();

  // If already strong, return refined version
  if (meta.score >= 85) {
    return clean;
  }

  let verb = 'Engineered';
  if (meta.verbStrength === 'weak' || !meta.hasX) {
    const lower = clean.toLowerCase();
    if (lower.includes('code') || lower.includes('software') || lower.includes('app') || lower.includes('system')) {
      verb = 'Architected';
    } else if (lower.includes('lead') || lower.includes('team') || lower.includes('project') || lower.includes('manage')) {
      verb = 'Spearheaded';
    } else if (lower.includes('test') || lower.includes('speed') || lower.includes('perform') || lower.includes('fast')) {
      verb = 'Optimized';
    } else if (lower.includes('sale') || lower.includes('revenue') || lower.includes('growth') || lower.includes('market')) {
      verb = 'Accelerated';
    } else {
      verb = 'Delivered';
    }
  } else {
    // Capitalize existing verb or upgrade
    verb = meta.detectedVerb.charAt(0).toUpperCase() + meta.detectedVerb.slice(1);
    if (verb.toLowerCase() === 'worked' || verb.toLowerCase() === 'helped') verb = 'Spearheaded';
  }

  // Strip weak starters
  clean = clean.replace(/^(?:Responsible for|Tasked with|Worked on|Assisted in|Helped with|Involved in)\s+/i, '');
  if (clean.toLowerCase().startsWith(meta.detectedVerb)) {
    clean = clean.slice(meta.detectedVerb.length).trim();
  }

  // If no metric, insert realistic placeholder or metric bridge
  let metricPart = meta.hasY ? '' : 'as measured by a 35% boost in operational efficiency';
  let methodPart = meta.hasZ ? '' : (meta.foundTools.length ? `by leveraging ${meta.foundTools.join(' and ')}` : 'by executing automated end-to-end workflows');

  let result = `${verb} ${clean}`;
  if (!meta.hasY && !result.includes('35%') && !result.includes('measured')) {
    result += `, resulting in a 25% to 40% efficiency improvement`;
  }
  if (!meta.hasZ && !result.toLowerCase().includes('by ') && !result.toLowerCase().includes('utilizing')) {
    result += `, achieved by designing scalable modular solutions`;
  }

  return result.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',');
}

/**
 * Extracts keywords from Job Description and Resume for ATS Matching
 */
export function extractKeywords(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const words = lower.match(/\b[a-z0-9_.-]{3,}\b/g) || [];

  const stopWords = new Set([
    'and', 'the', 'for', 'with', 'that', 'this', 'from', 'have', 'were', 'been',
    'will', 'would', 'could', 'should', 'about', 'their', 'there', 'they', 'what',
    'which', 'when', 'where', 'also', 'more', 'into', 'some', 'other', 'them',
    'each', 'such', 'many', 'must', 'able', 'well', 'both', 'good', 'work', 'working'
  ]);

  const freq = {};
  for (const w of words) {
    if (!stopWords.has(w) && isNaN(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  // Include known tech keywords found
  for (const tech of COMMON_TECH_KEYWORDS) {
    if (lower.includes(tech)) {
      freq[tech] = (freq[tech] || 0) + 4;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({ keyword, count }));
}

/**
 * Performs complete Google XYZ analysis & ATS scoring on a resume and job description
 */
export function scoreResume(resumeText, jobDescriptionText = '') {
  const bullets = extractBulletPoints(resumeText);
  const bulletAnalyses = bullets.map(analyzeBulletPoint);

  // Overall metrics calculation
  const totalBullets = bulletAnalyses.length;
  let compliantCount = 0;
  let strongVerbsCount = 0;
  let metricsCount = 0;
  let methodsCount = 0;
  let totalScoreSum = 0;

  for (const b of bulletAnalyses) {
    totalScoreSum += b.score;
    if (b.components.x.present && b.components.y.present && b.components.z.present) {
      compliantCount++;
    }
    if (b.components.x.strength === 'strong') strongVerbsCount++;
    if (b.components.y.present) metricsCount++;
    if (b.components.z.present) methodsCount++;
  }

  const avgBulletScore = totalBullets > 0 ? Math.round(totalScoreSum / totalBullets) : 40;
  const xyzComplianceRate = totalBullets > 0 ? Math.round((compliantCount / totalBullets) * 100) : 0;
  const verbStrengthScore = totalBullets > 0 ? Math.round((strongVerbsCount / totalBullets) * 100) : 0;
  const quantifiableImpactScore = totalBullets > 0 ? Math.round((metricsCount / totalBullets) * 100) : 0;
  const methodSpecificityScore = totalBullets > 0 ? Math.round((methodsCount / totalBullets) * 100) : 0;

  // ATS Matching if JD is provided
  let matchScore = 0;
  let matchedKeywords = [];
  let missingKeywords = [];

  if (jobDescriptionText && jobDescriptionText.trim().length > 20) {
    const jdKeywords = extractKeywords(jobDescriptionText).slice(0, 35);
    const resumeLower = resumeText.toLowerCase();

    for (const item of jdKeywords) {
      if (resumeLower.includes(item.keyword)) {
        matchedKeywords.push(item.keyword);
      } else {
        missingKeywords.push(item.keyword);
      }
    }

    matchScore = jdKeywords.length > 0
      ? Math.round((matchedKeywords.length / jdKeywords.length) * 100)
      : 50;
  } else {
    // Default baseline if no JD supplied
    matchScore = Math.min(85, Math.round((quantifiableImpactScore + avgBulletScore) / 2));
  }

  // Composite Google XYZ Score
  const overallScore = Math.round(
    (avgBulletScore * 0.4) +
    (quantifiableImpactScore * 0.3) +
    (verbStrengthScore * 0.15) +
    (methodSpecificityScore * 0.15)
  );

  let letterGrade = 'C';
  if (overallScore >= 90) letterGrade = 'A+';
  else if (overallScore >= 80) letterGrade = 'A';
  else if (overallScore >= 70) letterGrade = 'B';
  else if (overallScore >= 60) letterGrade = 'C';
  else letterGrade = 'D';

  // Strengths & Weaknesses
  const strengths = [];
  const weaknesses = [];

  if (quantifiableImpactScore >= 60) {
    strengths.push(`Strong data orientation: ${metricsCount} bullet points feature measurable metrics (Y).`);
  } else {
    weaknesses.push(`Low metric density: Only ${metricsCount} of ${totalBullets} bullets contain quantifiable results. Add percentages, dollar figures, or time savings.`);
  }

  if (verbStrengthScore >= 60) {
    strengths.push(`High leadership presence: Frequently uses authoritative action verbs (X).`);
  } else {
    weaknesses.push(`Passive voice detected: Replace generic verbs like "worked on" or "assisted" with impactful verbs like "Engineered", "Pioneered", or "Spearheaded".`);
  }

  if (methodSpecificityScore >= 60) {
    strengths.push(`Clear execution context: Consistently clarifies specific methodologies and tools (Z).`);
  } else {
    weaknesses.push(`Vague execution details: Clearly state what frameworks, architectures, or tools you leveraged to accomplish outcomes.`);
  }

  if (missingKeywords.length > 0) {
    weaknesses.push(`ATS Keyword Gaps: Target job description mentions important skills missing from your resume (${missingKeywords.slice(0, 5).join(', ')}).`);
  }

  return {
    overallScore,
    letterGrade,
    matchScore,
    breakdown: {
      avgBulletScore,
      xyzComplianceRate,
      quantifiableImpactScore,
      verbStrengthScore,
      methodSpecificityScore
    },
    totalBullets,
    compliantBullets: compliantCount,
    bullets: bulletAnalyses,
    keywords: {
      matched: matchedKeywords,
      missing: missingKeywords.slice(0, 15)
    },
    strengths,
    weaknesses
  };
}

