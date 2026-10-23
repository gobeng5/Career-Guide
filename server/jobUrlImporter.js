import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import net from 'net';
import { pipeline, Writable } from 'stream';
import zlib from 'zlib';

// Imports a job description from a public job posting URL.
// Most job boards (LinkedIn, Indeed, Greenhouse, Lever, Workday...) embed a
// schema.org JobPosting in JSON-LD; we prefer that and fall back to page text.

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 4;

export class ImportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// --- SSRF protection: only public internet addresses may be fetched ---

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

// Expands any IPv6 text form (including a trailing dotted quad) to 8 numeric groups
function ipv6Groups(ip) {
  let text = ip.toLowerCase().split('%')[0];
  const quad = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (quad) {
    const [a, b, c, d] = quad[1].split('.').map(Number);
    text = text.slice(0, -quad[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = tail !== undefined && tail ? tail.split(':') : [];
  const fill = tail !== undefined ? 8 - left.length - right.length : 0;
  return [...left, ...Array(fill).fill('0'), ...right].map((g) => parseInt(g, 16) || 0);
}

const groupsToIPv4 = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (!net.isIPv6(ip)) return true;

  const g = ipv6Groups(ip);
  const firstSixZero = g.slice(0, 6).every((x) => x === 0);

  // Forms that embed an IPv4 address: judge them by that address
  if (firstSixZero) return true; // ::, ::1 and deprecated IPv4-compatible ::a.b.c.d
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPrivateIPv4(groupsToIPv4(g[6], g[7])); // ::ffff:a.b.c.d
  if (g[0] === 0x64 && g[1] === 0xff9b) return isPrivateIPv4(groupsToIPv4(g[6], g[7])); // NAT64 64:ff9b::/96 and /48
  if (g[0] === 0x2002) return isPrivateIPv4(groupsToIPv4(g[1], g[2])); // 6to4 2002::/16

  return (
    (g[0] & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (g[0] & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (g[0] & 0xff00) === 0xff00 || // multicast ff00::/8
    g[0] === 0x2001 && g[1] === 0x0db8 // documentation
  );
}

const PRIVATE_ADDRESS = 'That link points to a private address and can’t be imported.';

// DNS lookup used for the actual connection. Checking here, rather than before
// the request, means the address we validate is the address we connect to,
// so a hostname can't pass the check and then re-resolve to a private IP.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true, verbatim: true }).then(
    (addresses) => {
      if (addresses.length === 0 || addresses.some((a) => isPrivateIP(a.address))) {
        return callback(new ImportError(PRIVATE_ADDRESS));
      }
      if (options?.all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    },
    () => callback(new ImportError('That website couldn’t be found. Check the link and try again.'))
  );
}

function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImportError('That doesn’t look like a web address. Paste the full link, starting with https://');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ImportError('Only http and https links can be imported.');
  }
  if (url.username || url.password) {
    throw new ImportError('Links with a username or password can’t be imported.');
  }

  // IP literals never go through DNS lookup, so check them directly
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isPrivateIP(host)) {
    throw new ImportError(PRIVATE_ADDRESS);
  }
  return url;
}

const TIMED_OUT = 'The website took too long to respond. Try again, or paste the text instead.';
const TOO_LARGE = 'That page is too large to import.';
const UNREACHABLE = 'Couldn’t reach that website. Check the link, or paste the text instead.';

// One GET request, connecting only through safeLookup. Resolves with status,
// headers and the (decompressed, size-capped) body.
function getOnce(url, deadline) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(
      url,
      {
        lookup: safeLookup,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      },
      (res) => {
        const status = res.statusCode || 0;
        const isRedirect = status >= 300 && status < 400;
        const type = res.headers['content-type'] || '';

        // Only read bodies we will actually use
        if (isRedirect || status >= 400 || (type && !/html|xml|text\/plain/i.test(type))) {
          res.resume();
          return finish(resolve, { status, headers: res.headers, body: null });
        }
        if (Number(res.headers['content-length'] || 0) > MAX_BYTES) {
          return fail(new ImportError(TOO_LARGE, 422));
        }

        const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
        const decoder =
          encoding === 'gzip' ? zlib.createGunzip()
          : encoding === 'deflate' ? zlib.createInflate()
          : encoding === 'br' ? zlib.createBrotliDecompress()
          : null;

        // The cap applies after decompression, so a small compressed bomb can't blow up memory
        const chunks = [];
        let total = 0;
        const sink = new Writable({
          write(chunk, _encoding, done) {
            total += chunk.length;
            if (total > MAX_BYTES) return done(new ImportError(TOO_LARGE, 422));
            chunks.push(chunk);
            done();
          }
        });

        // pipeline tears down every stage on error, abort or premature close
        pipeline(...(decoder ? [res, decoder, sink] : [res, sink]), (err) => {
          if (err) return fail(err instanceof ImportError ? err : new ImportError(UNREACHABLE, 502));
          finish(resolve, { status, headers: res.headers, body: Buffer.concat(chunks).toString('utf-8') });
        });
      }
    );

    let settled = false;
    function finish(settle, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settle(value);
    }
    function fail(err) {
      req.destroy();
      finish(reject, err);
    }

    // One deadline for the whole exchange: it rejects directly, whatever stage is stalled
    const timer = setTimeout(() => fail(new ImportError(TIMED_OUT, 504)), Math.max(0, deadline - Date.now()));
    req.on('error', (err) => fail(err instanceof ImportError ? err : new ImportError(UNREACHABLE, 502)));
  });
}

async function fetchPage(rawUrl) {
  const deadline = Date.now() + TIMEOUT_MS;
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = assertPublicUrl(current);
    const { status, headers, body } = await getOnce(url, deadline);

    if (status >= 300 && status < 400 && headers.location) {
      current = new URL(headers.location, url).toString();
      continue;
    }

    if (status === 401 || status === 403 || status === 429 || status === 999) {
      throw new ImportError('That website blocks automatic access. Open the posting, copy its text and paste it instead.', 422);
    }
    if (status === 404 || status === 410) {
      throw new ImportError('That posting wasn’t found. It may have closed or been removed.', 422);
    }
    if (status < 200 || status >= 300) {
      throw new ImportError(`The website returned an error (${status}). Try again, or paste the text instead.`, 502);
    }
    if (body === null) {
      throw new ImportError('That link isn’t a web page. For PDF or Word files, download them and use Upload file.', 422);
    }

    return { html: body, finalUrl: url.toString() };
  }

  throw new ImportError('That link redirects too many times.', 422);
}

// --- HTML to text ---

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™'
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

// --- Linear-time HTML scanning ---
// Page HTML comes from arbitrary websites, so it is never fed to backtracking
// regexes (malformed input like thousands of unclosed "<script" made those
// quadratic). This scanner only moves forward with indexOf.

const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'template', 'iframe', 'xmp']);

const isLetter = (code) => (code >= 65 && code <= 90) || (code >= 97 && code <= 122);

function* scanHtml(html) {
  const lower = html.toLowerCase();
  const n = html.length;
  let i = 0; // where unconsumed text starts
  let search = 0; // where to look for the next "<"
  let nextGt = -1;

  while (i < n) {
    const lt = html.indexOf('<', search);
    if (lt === -1) {
      yield { text: html.slice(i) };
      return;
    }

    const closing = html.charCodeAt(lt + 1) === 47; // '/'
    let p = closing ? lt + 2 : lt + 1;
    const isComment = html.startsWith('<!--', lt);
    const isDeclaration = !isComment && (html[lt + 1] === '!' || html[lt + 1] === '?');

    if (!isComment && !isDeclaration && !isLetter(html.charCodeAt(p))) {
      // A literal "<" in text: keep it as part of the text run
      search = lt + 1;
      continue;
    }

    if (lt > i) yield { text: html.slice(i, lt) };

    if (isComment || isDeclaration) {
      const end = isComment ? html.indexOf('-->', lt + 4) : html.indexOf('>', lt);
      if (end === -1) return;
      i = search = end + (isComment ? 3 : 1);
      continue;
    }

    if (nextGt <= lt) nextGt = html.indexOf('>', lt);
    if (nextGt === -1) return;
    const gt = nextGt;

    const nameStart = p;
    while (p < gt && (isLetter(html.charCodeAt(p)) || /[0-9-]/.test(html[p]))) p++;
    const name = lower.slice(nameStart, p);
    const attrs = html.slice(p, gt);

    if (!closing && RAW_TEXT_TAGS.has(name)) {
      // Content runs to the matching close tag (or the end of the page)
      const close = lower.indexOf(`</${name}`, gt + 1);
      const contentEnd = close === -1 ? n : close;
      yield { tag: name, attrs, closing: false, content: html.slice(gt + 1, contentEnd) };
      if (close === -1) return;
      const closeGt = html.indexOf('>', close);
      if (closeGt === -1) return;
      i = search = closeGt + 1;
      continue;
    }

    yield { tag: name, attrs, closing };
    i = search = gt + 1;
  }
}

const getAttr = (attrs, name) => {
  const lowerAttrs = attrs.toLowerCase();
  let from = 0;
  for (;;) {
    const at = lowerAttrs.indexOf(name, from);
    if (at === -1) return null;
    from = at + name.length;
    if (at > 0 && !/[\s"'/]/.test(attrs[at - 1])) continue;
    let p = from;
    while (/\s/.test(attrs[p] || '')) p++;
    if (attrs[p] !== '=') continue;
    p++;
    while (/\s/.test(attrs[p] || '')) p++;
    const quote = attrs[p];
    if (quote === '"' || quote === "'") {
      const end = attrs.indexOf(quote, p + 1);
      return end === -1 ? null : attrs.slice(p + 1, end);
    }
    const end = attrs.slice(p).search(/[\s>]/);
    return end === -1 ? attrs.slice(p) : attrs.slice(p, p + end);
  }
};

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'template', 'iframe', 'head', 'textarea', 'title']);
const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'tr', 'table', 'header', 'footer', 'blockquote', 'main', 'aside', 'nav', 'dl', 'dt', 'dd'
]);

export function htmlToText(html, extraSkip = []) {
  const skip = new Set([...SKIP_TAGS, ...extraSkip]);
  const out = [];
  let skipping = null; // name of the non-raw element being skipped (e.g. nav), with depth
  let depth = 0;

  for (const token of scanHtml(html)) {
    if (skipping) {
      if (token.tag === skipping) depth += token.closing ? -1 : 1;
      if (depth === 0) skipping = null;
      continue;
    }
    if (token.text !== undefined) {
      out.push(token.text);
      continue;
    }
    const { tag, closing } = token;
    if (skip.has(tag)) {
      if (!closing && token.content === undefined) {
        skipping = tag;
        depth = 1;
      }
      continue;
    }
    if (tag === 'li') out.push(closing ? '\n' : '\n- ');
    else if (tag === 'br') out.push('\n');
    else if (BLOCK_TAGS.has(tag)) out.push('\n');
    else out.push(' ');
  }

  return decodeEntities(out.join(''))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Structured data (schema.org JobPosting) ---

function findJobPosting(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  const type = node['@type'];
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return node;
  return findJobPosting(node['@graph']);
}

function extractJobPosting(html) {
  for (const token of scanHtml(html)) {
    if (token.tag !== 'script' || token.content === undefined) continue;
    if (!/^\s*application\/ld\+json\s*$/i.test(getAttr(token.attrs, 'type') || '')) continue;
    const json = token.content;
    try {
      const posting = findJobPosting(JSON.parse(json.trim()));
      if (posting?.description) return posting;
    } catch {
      // Malformed JSON-LD is common; try the next block
    }
  }
  return null;
}

function formatLocation(jobLocation) {
  const places = Array.isArray(jobLocation) ? jobLocation : jobLocation ? [jobLocation] : [];
  return places
    .map((p) => {
      const a = p?.address || {};
      return typeof a === 'string'
        ? a
        : [a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry].filter(Boolean).join(', ');
    })
    .filter(Boolean)
    .join('; ');
}

function postingToText(posting) {
  const title = posting.title ? decodeEntities(String(posting.title)) : '';
  const company =
    typeof posting.hiringOrganization === 'string'
      ? posting.hiringOrganization
      : posting.hiringOrganization?.name || '';
  const location = posting.jobLocationType === 'TELECOMMUTE' ? 'Remote' : formatLocation(posting.jobLocation);

  const header = [
    title,
    company && `Company: ${decodeEntities(company)}`,
    location && `Location: ${location}`,
    posting.employmentType &&
      `Employment type: ${[]
        .concat(posting.employmentType)
        .map((t) => String(t).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()))
        .join(', ')}`
  ].filter(Boolean);

  // Some sites double-encode the description HTML
  const description = htmlToText(decodeEntities(String(posting.description)));
  return { title, company: decodeEntities(company), text: `${header.join('\n')}\n\n${description}`.trim() };
}

function pageTitle(html) {
  let ogTitle = '';
  let title = '';
  for (const token of scanHtml(html)) {
    if (token.tag === 'meta' && !ogTitle && (getAttr(token.attrs, 'property') || '').toLowerCase() === 'og:title') {
      ogTitle = getAttr(token.attrs, 'content') || '';
    } else if (token.tag === 'title' && token.content !== undefined && !title) {
      title = token.content;
    } else if (token.tag === 'body') {
      break;
    }
  }
  return decodeEntities(ogTitle || title).replace(/\s+/g, ' ').trim();
}

// The first <main>, else <article>, else <body>: located with indexOf only
function mainRegion(html) {
  const lower = html.toLowerCase();
  for (const tag of ['main', 'article']) {
    const start = lower.indexOf(`<${tag}`);
    if (start === -1) continue;
    const end = lower.indexOf(`</${tag}`, start);
    if (end !== -1) return html.slice(start, end);
  }
  const body = lower.indexOf('<body');
  return body === -1 ? html : html.slice(body);
}

function mainContent(html) {
  return htmlToText(mainRegion(html), ['nav', 'header', 'footer', 'aside', 'form']);
}

export async function importJobFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new ImportError('Paste a link to a job posting.');
  }

  const { html, finalUrl } = await fetchPage(rawUrl.trim());
  const posting = extractJobPosting(html);

  if (posting) {
    const { title, company, text } = postingToText(posting);
    return { text, title, company, url: finalUrl, method: 'structured' };
  }

  const title = pageTitle(html);
  const body = mainContent(html);
  const text = [title, body].filter(Boolean).join('\n\n');

  if (body.split(/\s+/).length < 60) {
    throw new ImportError(
      'Couldn’t find a job description on that page. It may need you to sign in. Copy the text and paste it instead.',
      422
    );
  }
  return { text: text.slice(0, 20000), title, company: '', url: finalUrl, method: 'page-text' };
}
