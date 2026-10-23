import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseDocument } from './documentParser.js';
import { scoreResume } from './xyzEngine.js';
import { rewriteResume } from './resumeRewriter.js';
import { generateApplicationDocuments } from './letterEngine.js';
import { humanizeText, detectAI } from './humanizerEngine.js';
import { createDocxBuffer } from './exportService.js';
import { importJobFromUrl } from './jobUrlImporter.js';
import {
  callDeepSeek,
  deepseekScoreResume,
  deepseekRewriteResume,
  deepseekGenerateLetters,
  deepseekHumanizeText
} from './deepseekService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Setup Multer for in-memory file parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB max
});

// Helper to retrieve API key & model from request or environment
function getDeepSeekConfig(req) {
  const apiKey = req.headers['x-deepseek-api-key'] || req.body?.apiKey || process.env.DEEPSEEK_API_KEY;
  const model = req.headers['x-deepseek-model'] || req.body?.model || 'deepseek-chat';
  return { apiKey: apiKey?.trim() || null, model };
}

// Authentication mock/in-memory store
const registeredUsers = [
  {
    id: 'usr_demo',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    password: 'password123',
    role: 'Pro Member',
    avatar: 'AR'
  }
];

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    // For convenience in testing, if not matched, create/allow or reject
    if (email.includes('@')) {
      // Auto-create on demand for seamless developer testing
      const newUser = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email,
        password,
        role: 'Pro Member',
        avatar: email.substring(0, 2).toUpperCase()
      };
      registeredUsers.push(newUser);
      return res.json({
        success: true,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, avatar: newUser.avatar },
        token: `token_${Date.now()}`
      });
    }
    return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
  }

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    token: `token_${Date.now()}`
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    password,
    role: 'Pro Member',
    avatar: initials
  };
  registeredUsers.push(newUser);

  res.json({
    success: true,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, avatar: newUser.avatar },
    token: `token_${Date.now()}`
  });
});


app.post('/api/verify-deepseek', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      return res.status(400).json({ error: 'API key is required.' });
    }

    const test = await callDeepSeek({
      apiKey: key,
      model: model || 'deepseek-chat',
      messages: [{ role: 'user', content: 'Reply with the word "pong"' }],
      temperature: 0.1
    });

    res.json({
      valid: true,
      message: 'DeepSeek API connection successful!',
      model: test.model
    });
  } catch (error) {
    res.status(400).json({ valid: false, error: error.message });
  }
});

// 1. File Upload & Text Extraction (Supports PDF, DOCX, TXT)
app.post('/api/parse-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const extractedText = await parseDocument(buffer, originalname, mimetype);

    const words = extractedText.split(/\s+/).filter(Boolean).length;
    res.json({
      text: extractedText,
      filename: originalname,
      mimetype,
      wordCount: words,
      charCount: extractedText.length
    });
  } catch (error) {
    console.error('File parsing error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse file.' });
  }
});

// 1b. Import a Job Description from a Posting URL
app.post('/api/import-job-url', async (req, res) => {
  try {
    const result = await importJobFromUrl(req.body?.url);
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Job URL import error:', error);
    res.status(500).json({ error: 'Couldn’t import that link. Copy the job description and paste it instead.' });
  }
});

// 2. Google XYZ Resume Scoring & Bullet Breakdown
app.post('/api/score-resume', async (req, res) => {
  try {
    const { resumeText, jobDescriptionText } = req.body;
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'Resume text is required.' });
    }

    const { apiKey, model } = getDeepSeekConfig(req);

    if (apiKey) {
      try {
        console.log(`[DeepSeek] Scoring resume with ${model}...`);
        const deepseekResult = await deepseekScoreResume(resumeText, jobDescriptionText || '', apiKey, model);
        return res.json({ ...deepseekResult, engine: `DeepSeek (${model})` });
      } catch (dsError) {
        console.warn('[DeepSeek] Fallback to offline engine due to:', dsError.message);
      }
    }

    // Offline rule engine fallback
    const result = scoreResume(resumeText, jobDescriptionText || '');
    res.json({ ...result, engine: 'Built-in XYZ Engine' });
  } catch (error) {
    console.error('Scoring error:', error);
    res.status(500).json({ error: error.message || 'Scoring calculation failed.' });
  }
});

// 3. Rewrite Resume Tailored for Job Match (Google XYZ Format)
app.post('/api/rewrite-resume', async (req, res) => {
  try {
    const { resumeText, jobDescriptionText, options } = req.body;
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'Resume text is required.' });
    }

    const { apiKey, model } = getDeepSeekConfig(req);

    if (apiKey) {
      try {
        console.log(`[DeepSeek] Rewriting resume with ${model}...`);
        const deepseekResult = await deepseekRewriteResume(resumeText, jobDescriptionText || '', apiKey, model);
        return res.json({ ...deepseekResult, engine: `DeepSeek (${model})` });
      } catch (dsError) {
        console.warn('[DeepSeek] Fallback to offline engine due to:', dsError.message);
      }
    }

    // Offline rule engine fallback
    const result = rewriteResume(resumeText, jobDescriptionText || '', options || {});
    res.json({ ...result, engine: 'Built-in Engine' });
  } catch (error) {
    console.error('Rewrite error:', error);
    res.status(500).json({ error: error.message || 'Resume rewriting failed.' });
  }
});

// 4. Generate Cover Letter & Formal Application Letter
app.post('/api/generate-letters', async (req, res) => {
  try {
    const { resumeText, jobDescriptionText, options } = req.body;
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'Resume text is required.' });
    }

    const { apiKey, model } = getDeepSeekConfig(req);

    if (apiKey) {
      try {
        console.log(`[DeepSeek] Generating letters with ${model}...`);
        const deepseekResult = await deepseekGenerateLetters(resumeText, jobDescriptionText || '', options || {}, apiKey, model);
        return res.json({ ...deepseekResult, engine: `DeepSeek (${model})` });
      } catch (dsError) {
        console.warn('[DeepSeek] Fallback to offline engine due to:', dsError.message);
      }
    }

    // Offline rule engine fallback
    const result = generateApplicationDocuments(resumeText, jobDescriptionText || '', options || {});
    res.json({ ...result, engine: 'Built-in Engine' });
  } catch (error) {
    console.error('Letter generation error:', error);
    res.status(500).json({ error: error.message || 'Document generation failed.' });
  }
});

// 5. Humanize AI Text / Documents
app.post('/api/humanize', async (req, res) => {
  try {
    const { text, mode } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required for humanization.' });
    }

    const { apiKey, model } = getDeepSeekConfig(req);

    if (apiKey) {
      try {
        console.log(`[DeepSeek] Humanizing text with ${model}...`);
        const deepseekResult = await deepseekHumanizeText(text, mode || 'professional', apiKey, model);
        return res.json({ ...deepseekResult, engine: `DeepSeek (${model})` });
      } catch (dsError) {
        console.warn('[DeepSeek] Fallback to offline humanizer due to:', dsError.message);
      }
    }

    // Offline rule engine fallback
    const result = humanizeText(text, mode || 'professional');
    res.json({ ...result, engine: 'Built-in Humanizer' });
  } catch (error) {
    console.error('Humanize error:', error);
    res.status(500).json({ error: error.message || 'Humanization failed.' });
  }
});

// 6. Detect AI Characteristics
app.post('/api/detect-ai', (req, res) => {
  try {
    const { text } = req.body;
    const result = detectAI(text || '');
    res.json(result);
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: error.message || 'Detection failed.' });
  }
});

// 7. DOCX File Export
app.post('/api/export-docx', async (req, res) => {
  try {
    const { title, content, filename } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Document content is required.' });
    }

    const docxBuffer = await createDocxBuffer(title || 'Document', content);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'document.docx'}"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error('DOCX export error:', error);
    res.status(500).json({ error: error.message || 'Export failed.' });
  }
});

// 8. Sample Data Endpoint for Instant 1-Click Testing
app.get('/api/sample-data', (req, res) => {
  res.json({
    sampleResume: `Alex Rivera
Senior Software Engineer | alex.rivera@example.com | (555) 345-6789 | San Francisco, CA | github.com/arivera

PROFESSIONAL SUMMARY
Experienced Software Engineer with 5+ years of building web applications and backend systems. Proficient in JavaScript, React, Node.js, and cloud services. Passionate about clean code and collaborating with product teams.

WORK EXPERIENCE
Senior Full Stack Engineer | TechCorp Inc. (2021 – Present)
- Worked on migrating the company website to React and Node.js.
- Responsible for database optimizations and improving response times.
- Helped mentor junior developers and participated in code reviews.
- Handled deployment of containerized services to Amazon Web Services.
- Spearheaded the redesign of user checkout flow, resulting in an 18% increase in conversion rate.

Software Developer | CloudWave Solutions (2018 – 2021)
- Built internal dashboard tools using TypeScript and PostgreSQL.
- Assisted in bug fixing and testing for customer-facing APIs.
- Tasked with writing documentation and managing Jira backlog items.
- Involved in Agile sprint meetings and feature planning.

EDUCATION
B.S. in Computer Science | University of California, Berkeley (2018)

SKILLS
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Docker, AWS, Git, REST APIs`,

    sampleJobDescription: `Senior Full-Stack Engineer
Company: NovaPay Financial Technologies
Location: Remote / San Francisco, CA

About Us:
NovaPay is a high-growth fintech building modern global payment infrastructure. We are scaling our transaction engine and looking for an exceptional Senior Full-Stack Engineer to architect resilient microservices and responsive financial interfaces.

Key Responsibilities:
• Architect, deploy, and maintain high-throughput microservices using Node.js, TypeScript, and Go.
• Build intuitive, responsive customer-facing financial dashboards with React and Tailwind CSS.
• Optimize distributed SQL (PostgreSQL) and caching systems (Redis) for sub-50ms latency.
• Champion CI/CD automation and containerized deployments using Docker and Kubernetes on AWS.
• Lead cross-functional sprint teams, establish engineering best practices, and drive measurable system reliability.

Requirements:
• 4+ years of professional software engineering experience.
• Strong mastery of TypeScript, React, Node.js, and modern REST/GraphQL APIs.
• Proven track record with distributed cloud infrastructure on AWS, Docker, and Kubernetes.
• Familiarity with financial transactions, data security, and high-availability architecture.
• Strong analytical mindset with a focus on quantifiable business impact.`,

    sampleAiText: `In today's fast-paced digital world, it is crucial to recognize that artificial intelligence serves as a beacon of transformative innovation. Furthermore, by delving into the multifaceted realm of technological advancement, modern enterprises can seamlessly foster unprecedented growth. It stands as a testament to human ingenuity that machine learning algorithms can meticulously orchestrate complex operational workflows, thereby unlocking synergistic value across organizations. Moreover, navigating this dynamic landscape requires an unwavering commitment to excellence, which is a pivotal game-changer for forward-thinking leadership.`
  });
});

// 9. Serve static client assets in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// On Vercel the app is invoked as a serverless function (see api/index.js), so skip listen()
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Career Guide Server running on http://localhost:${PORT}`);
  });
}

export default app;
