import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import net from 'net';
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
          return resolve({ status, headers: res.headers, body: null });
        }
        if (Number(res.headers['content-length'] || 0) > MAX_BYTES) {
          res.destroy();
          return reject(new ImportError('That page is too large to import.', 422));
        }

        const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
        const stream =
          encoding === 'gzip' ? res.pipe(zlib.createGunzip())
          : encoding === 'deflate' ? res.pipe(zlib.createInflate())
          : encoding === 'br' ? res.pipe(zlib.createBrotliDecompress())
          : res;

        const chunks = [];
        let total = 0;
        stream.on('data', (chunk) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            res.destroy();
            stream.destroy();
            reject(new ImportError('That page is too large to import.', 422));
            return;
          }
          chunks.push(chunk);
        });
        stream.on('end', () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks).toString('utf-8') }));
        stream.on('error', () => reject(new ImportError(UNREACHABLE, 502)));
      }
    );

    const timer = setTimeout(() => req.destroy(new ImportError(TIMED_OUT, 504)), Math.max(0, deadline - Date.now()));
    req.on('close', () => clearTimeout(timer));
    req.on('error', (err) => reject(err instanceof ImportError ? err : new ImportError(UNREACHABLE, 502)));
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

export function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|iframe|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|tr|table|header|footer|blockquote)>/gi, '\n')
      .replace(/<(p|div|section|article|h[1-6]|tr|table|blockquote)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
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
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, json] of blocks) {
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
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const title = og?.[1] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  return decodeEntities(title).replace(/\s+/g, ' ').trim();
}

function mainContent(html) {
  const main =
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<body[\s\S]*<\/body>/i)?.[0] ||
    html;
  return htmlToText(main.replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, ' '));
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
