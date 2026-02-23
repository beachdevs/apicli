import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseToml } from '@iarna/toml';

const ALIASES = {
  API_KEY: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY'],
  OPENAI_API_KEY: ['API_KEY'],
  OPENROUTER_API_KEY: ['API_KEY'],
  CEREBRAS_API_KEY: ['API_KEY']
};

const runJq = (q, input) => {
  const r = spawnSync('jq', ['-r', q.startsWith('.') ? q : `.${q}`], { input, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (r.error || r.status) throw new Error(r.stderr || r.error || `jq exited ${r.status}`);
  return r.stdout;
};

const parseTxt = (c) => {
  const lines = c.trim().split('\n');
  const keys = lines.shift().trim().split(/\s+/);
  return { apis: lines.map(l => {
    const v = []; let cur = '', q = 0;
    for (let i = 0; i < l.length; i++) {
      if (l[i] === '"' && l[i+1] === '"') { cur += '"'; i++; }
      else if (l[i] === '"') q = !q;
      else if (l[i] === ' ' && !q) { v.push(cur); cur = ''; }
      else cur += l[i];
    }
    const row = [...v, cur];
    return Object.fromEntries(keys.map((k, i) => {
      let val = row[i] === 'null' ? null : row[i];
      if (k !== 'body' && val?.startsWith?.('{')) try { val = JSON.parse(val); } catch(e){}
      return [k, val];
    }));
  }) };
};

const sub = (s, v = {}) => s?.replace?.(/(\$\$)|(\$!?)([A-Za-z_]\w*)/g, (_, esc, p, k) => {
  if (esc) return '$';
  let val = v[k] ?? process.env[k];
  if (val == null && ALIASES[k]) val = ALIASES[k].map(a => v[a] ?? process.env[a]).find(x => x != null);
  if (p.includes('!') && val == null) throw new Error(`Variable ${k} is required`);
  return val ?? '';
}) ?? s;

const walk = (obj, v) => {
  if (typeof obj === 'string') return sub(obj, v);
  if (Array.isArray(obj)) return obj.map(x => walk(x, v));
  if (obj && typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, x]) => [k, walk(x, v)]));
  return obj;
};

export function getApis(configPath) {
  const base = join(homedir(), '.apicli');
  const path = configPath ?? [join(base, 'apicli.toml'), join(base, 'apis.txt')].find(fs.existsSync);
  if (!path) return [];
  const content = fs.readFileSync(path, 'utf8'), isToml = path.endsWith('.toml');
  if (isToml) {
    const data = parseToml(content);
    return Object.entries(data.apis || {}).map(([id, api]) => ({ service: id.split('.')[0], name: id.split('.')[1], ...api }));
  }
  return parseTxt(content).apis;
}

export const getApi = (s, n, p) => getApis(p).find(a => a.service === s && a.name === n);

export function getRequest(s, n, vars = {}, p) {
  const api = getApi(s, n, p);
  if (!api) throw new Error(`Unknown API: ${s}.${n}`);
  const v = { ...vars }, provider = v.PROVIDER ?? process.env.PROVIDER;
  let { url, method, headers, body } = api;
  url = sub(url, v);
  if (typeof headers === 'string' && headers.startsWith('BEARER ')) {
    headers = { Authorization: `Bearer ${sub(headers.slice(7).trim(), v)}`, 'Content-Type': 'application/json' };
  }
  headers = walk(headers, v);
  if (body != null) {
    body = String(body).trim();
    const pb = ', "provider": {"order": ["$PROVIDER"]}';
    body = provider ? body.replace(pb, pb.replace('$PROVIDER', provider)) : body.replace(pb, '');
    body = sub(body, v);
  }
  return { url, method, headers, body };
}

export async function fetchApi(s, n, opts = {}) {
  const { vars = {}, configPath, debug, ...rest } = opts;
  const req = getRequest(s, n, { ...vars, ...rest }, configPath);
  if (debug) {
    console.error('\x1b[90m> %s %s\x1b[0m\n\x1b[90m> headers:\n%s\x1b[0m', req.method, req.url, 
      Object.entries(req.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n'));
    if (req.body) console.error('\x1b[90m> body: %s\x1b[0m', req.body.slice(0, 200) + (req.body.length > 200 ? '...' : ''));
  }
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body || undefined });
  if (debug) {
    console.error('\n\x1b[90m< %s %s\x1b[0m', res.status, res.statusText);
    for (const [k, v] of res.headers.entries()) console.error('\x1b[90m< %s: %s\x1b[0m', k, v);
  }
  return res;
}

export async function get(id, opts = {}) {
  const [s, n] = id.split('.'), res = await fetchApi(s, n, opts);
  const text = await res.text();
  return {
    json: (q) => q ? runJq(q, text) : JSON.parse(text),
    text: () => text
  };
}
