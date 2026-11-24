#!/usr/bin/env node
/* Motion Prompt skill CLI · MIT License (c) 2026 Shohei Ohtaki · https://github.com/showheyohtaki/motion-prompt */
// Node 18+, no dependencies. Reads the static Motion Prompt API (api/v1) and prints what an agent needs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mpPrompt } from './prompt.js';

const VERSION = '0.1.0';
const SITE = 'https://showheyohtaki.github.io/motion-prompt/';
const GALLERY = 'https://jackengineer.github.io/motion-prompt/';
const MAX_GET = 8;
const EXIT = { OK: 0, NOT_FOUND: 1, USAGE: 2, NETWORK: 3 };
const SELF = fileURLToPath(import.meta.url);
const ENV = process.env;

class CliError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// ---------- arguments ----------

const VALUE_FLAGS = new Set(['lang', 'pack', 'limit', 'out']);
const BOOL_FLAGS = new Set(['refresh', 'help', 'version']);

function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h') { flags.help = true; continue; }
    if (!a.startsWith('--')) { rest.push(a); continue; }
    const eq = a.indexOf('=');
    const name = eq === -1 ? a.slice(2) : a.slice(2, eq);
    if (BOOL_FLAGS.has(name)) { flags[name] = true; continue; }
    if (!VALUE_FLAGS.has(name)) throw new CliError(EXIT.USAGE, `未知选项 --${name}。请用 --help 查看帮助。`);
    const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
    if (value === undefined || value === '') throw new CliError(EXIT.USAGE, `选项 --${name} 需要一个值。`);
    flags[name] = value;
  }
  return { flags, command: rest[0], args: rest.slice(1) };
}

const HELP = `motion-prompt ${VERSION} · 面向编程 AI 的 Motion Prompt 目录
${SITE}

用法：node motion-prompt.js <命令> [选项]

  pick                 输出在线示例库链接，可指定素材包和语言
  search <关键词...>   搜索名称、标签和描述，可用中文、日文或英文 [--pack <pack>] [--limit N]
  list                 列出素材包、分类与数量
  list --pack <pack>   列出素材包中的全部条目，可用逗号指定多个包
  get <id> [<id>...]   获取代码和规格，每次最多 ${MAX_GET} 条；支持 12、012、#012 或示例 URL
  prompt <id> [...]    获取可直接复制的提示词
  kit <pack>           获取素材包共用的常量与辅助函数
  info                 查看数据来源、数量、版本与缓存目录

选项：
  --lang zh-Hans|ja|en  文案语言，默认 zh-Hans（简体中文）
  --pack <pack[,pack]>  为 pick、search、list 指定一个或多个素材包
  --out <dir>          将 get、prompt、kit 结果写入目录，而非输出到终端
  --refresh            忽略磁盘缓存
环境变量：
  MOTION_PROMPT_BASE    显式覆盖 API 目录或 URL；多个候选用逗号分隔，选定后固定来源
  MOTION_PROMPT_CACHE   缓存目录，默认 ~/.cache/motion-prompt，失败时使用临时目录
  MOTION_PROMPT_TTL     目录缓存有效秒数，默认 21600
退出码：0 成功 · 1 未找到 · 2 用法错误 · 3 数据源不可用`;

// ---------- data sources ----------

const isUrl = (s) => /^https?:\/\//i.test(s);

function resolveSources() {
  const explicit = (ENV.MOTION_PROMPT_BASE || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (explicit.length) return { origin: 'MOTION_PROMPT_BASE', bases: explicit.map((s) => isUrl(s) ? s.replace(/\/+$/, '') : path.resolve(s.startsWith('file:') ? fileURLToPath(s) : s)) };
  const runtime = path.resolve(path.dirname(SELF), '../runtime');
  return { origin: '随包目录', bases: [path.join(runtime, 'api/v1')] };
}

function cacheRoots() {
  const roots = [];
  if (ENV.MOTION_PROMPT_CACHE) roots.push(path.resolve(ENV.MOTION_PROMPT_CACHE));
  else {
    try { roots.push(path.join(os.homedir(), '.cache', 'motion-prompt')); } catch { /* no home folder */ }
    roots.push(path.join(os.tmpdir(), 'motion-prompt-cache'));
  }
  return roots;
}

class Store {
  constructor({ refresh }) {
    try { this.source = resolveSources(); } catch (err) { throw new CliError(EXIT.NETWORK, err.message); }
    const { origin, bases } = this.source;
    this.origin = origin;
    this.bases = bases;
    this.refresh = !!refresh;
    this.remote = bases.some(isUrl);
    this.key = crypto.createHash('sha1').update(bases.join('|')).digest('hex').slice(0, 10);
    this.ttl = Math.max(0, Number(ENV.MOTION_PROMPT_TTL ?? 21600)) * 1000;
    this.cacheRoot = null;
    this.usedBase = null;
    this.fromCache = false;
    this.failures = [];
    this.catalog = null;
  }

  cacheDir() { return this.cacheRoot || path.join(cacheRoots()[0], this.key); }

  cacheRead(rel) {
    if (!this.remote || this.bases.length !== 1) return null;
    for (const root of cacheRoots()) {
      const file = path.join(root, this.key, rel);
      try {
        const stat = fs.statSync(file);
        this.cacheRoot = path.join(root, this.key);
        return { text: fs.readFileSync(file, 'utf8'), age: Date.now() - stat.mtimeMs };
      } catch { /* try the next cache folder */ }
    }
    return null;
  }

  cacheWrite(rel, text) {
    if (!this.remote || this.bases.length !== 1) return;
    for (const root of cacheRoots()) {
      const file = path.join(root, this.key, rel);
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
        this.cacheRoot = path.join(root, this.key);
        return;
      } catch { /* read-only place: try the next one, or run without a cache */ }
    }
  }

  // Returns { text } on success, { missing: true } when every source answered "no such file",
  // or { down: true } when no source could be reached at all.
  async readSources(rel, validate = (text) => text) {
    let missing = 0;
    for (const base of this.usedBase ? [this.usedBase] : this.bases) {
      try {
        if (isUrl(base)) {
          const res = await fetch(`${base}/${rel}`, {
            headers: { 'User-Agent': `motion-prompt-skill/${VERSION}` },
            signal: AbortSignal.timeout(12000),
          });
          if (res.status === 404) { missing++; this.failures.push(`${base}/${rel} → HTTP 404`); continue; }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (rel !== 'catalog.json') this.usedBase = this.usedBase || base;
          return { text, base, data: validate(text, base) };
        }
        const file = path.join(base, rel);
        if (!fs.existsSync(file)) { missing++; continue; }
        const text = fs.readFileSync(file, 'utf8');
        if (rel !== 'catalog.json') this.usedBase = this.usedBase || base;
        return { text, base, data: validate(text, base) };
      } catch (err) {
        const cause = err && err.cause && (err.cause.code || err.cause.message);
        this.failures.push(`${base}/${rel} → ${cause || err.name || 'error'}${err.message ? ` (${err.message})` : ''}`);
      }
    }
    return missing === (this.usedBase ? 1 : this.bases.length) ? { missing: true } : { down: true };
  }

  async loadCatalog() {
    if (this.catalog) return this.catalog;
    const cached = this.refresh || this.bases.length !== 1 ? null : this.cacheRead('catalog.json');
    const parseCatalog = (text, source) => {
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`来自 ${source} 的 catalog.json 不是有效的 JSON。`); }
      if (!data || !Array.isArray(data.elements)) throw new Error(`来自 ${source} 的 catalog.json 缺少 "elements" 列表。`);
      const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
      const textValue = (value) => typeof value === 'string' && !!value.trim();
      const texts = (value) => record(value) && Object.keys(value).length > 0 && Object.values(value).every(textValue);
      const textList = (value) => Array.isArray(value) && value.every(textValue);
      const key = (value) => typeof value === 'string' && /^[\w-]+$/.test(value);
      const invalid = (field) => { throw new Error(`来自 ${source} 的 catalog.json 结构无效：${field}。`); };
      if (!record(data) || !data.elements.length) invalid('elements 必须是非空条目列表');
      const ids = new Set();
      for (const [index, element] of data.elements.entries()) {
        if (!record(element) || typeof element.id !== 'string' || !/^\d{3}$/.test(element.id) || ids.has(element.id) || !key(element.pack)) invalid(`elements[${index}] 必须包含唯一三位编号和合法素材包标识`);
        ids.add(element.id);
        for (const field of ['name', 'summary', 'use']) if (!texts(element[field])) invalid(`#${element.id}.${field} 必须是语言文本映射`);
        for (const field of ['meaning', 'ask']) if (element[field] !== undefined && !texts(element[field])) invalid(`#${element.id}.${field} 必须是语言文本映射`);
        if (!record(element.spec) || !Object.keys(element.spec).length || !Object.values(element.spec).every((value) => textList(value) && value.length > 0)) invalid(`#${element.id}.spec 必须是语言规格列表映射`);
        if (element.tags !== undefined && !textList(element.tags)) invalid(`#${element.id}.tags 必须是文本列表`);
        if (element.tagLabels !== undefined && (!record(element.tagLabels) || !Object.values(element.tagLabels).every(textList))) invalid(`#${element.id}.tagLabels 必须是语言标签列表映射`);
        for (const field of ['slug', 'category']) if (element[field] !== undefined && !key(element[field])) invalid(`#${element.id}.${field} 必须是合法标识`);
      }
      if (data.packs !== undefined) {
        if (!Array.isArray(data.packs)) invalid('packs 必须是素材包列表');
        const packs = new Set();
        for (const pack of data.packs) {
          const name = typeof pack === 'string' ? pack : record(pack) ? packKey(pack) : '';
          if (!key(name) || packs.has(name)) invalid('packs 必须包含合法且唯一的素材包标识');
          packs.add(name);
          if (typeof pack === 'string') continue;
          if (pack.title !== undefined && !texts(pack.title)) invalid(`packs.${name}.title 必须是语言文本映射`);
          if (pack.categories !== undefined && (!Array.isArray(pack.categories) || !pack.categories.every((category) => record(category) && key(category.slug)))) invalid(`packs.${name}.categories 必须是类别对象列表`);
        }
      }
      return data;
    };
    let data;
    if (cached && cached.age < this.ttl) {
      try { data = parseCatalog(cached.text, this.bases[0]); this.fromCache = true; this.usedBase = this.bases[0]; }
      catch (err) { this.failures.push(err.message); }
    }
    if (!data) {
      const got = await this.readSources('catalog.json', parseCatalog);
      if (got.text !== undefined) { data = got.data; this.usedBase = got.base; this.cacheWrite('catalog.json', got.text); }
      else {
        const stale = cached || (this.bases.length === 1 ? this.cacheRead('catalog.json') : null);
        if (stale) {
          try { data = parseCatalog(stale.text, this.bases[0]); this.fromCache = true; this.usedBase = this.bases[0]; }
          catch (err) { this.failures.push(err.message); }
          if (data) process.stderr.write('motion-prompt：数据源不可用，正在使用目录缓存。\n');
        }
        if (!data) throw this.unreachable('catalog.json', false);
      }
    }
    this.catalog = data;
    return data;
  }

  async file(rel) {
    const cat = await this.loadCatalog();
    const versioned = path.join('v', String(cat.version ?? '0').replace(/[^\w.-]/g, '_'), rel);
    if (!this.refresh) {
      const hit = this.cacheRead(versioned);
      if (hit) return hit.text;
    }
    const got = await this.readSources(rel);
    if (got.text !== undefined) { this.cacheWrite(versioned, got.text); return got.text; }
    const stale = this.cacheRead(versioned);
    if (stale) return stale.text;
    throw this.unreachable(rel, got.missing);
  }

  unreachable(rel, missing) {
    if (missing) return new CliError(EXIT.NOT_FOUND, `Motion Prompt 数据中未找到：${rel}\n已检查来源：\n${this.bases.map((b) => `  ${b}`).join('\n')}`);
    const lines = [
      `motion-prompt：无法读取 Motion Prompt 数据（${rel}），也没有可用缓存。`,
      '已尝试：',
      ...this.failures.map((f) => `  ${f}`),
      this.failures.length && this.failures.every((f) => f.endsWith('HTTP 404'))
        ? '数据源已响应，但都没有这个文件。这些地址可能尚未发布该数据。\n如有 api/v1 本地副本，请将 MOTION_PROMPT_BASE 指向该目录。'
        : this.remote
        ? '请检查显式配置的 MOTION_PROMPT_BASE 地址，或改用完整的本地 api/v1 副本。'
        : '请检查 MOTION_PROMPT_BASE 是否指向含有 catalog.json 的目录。',
    ];
    return new CliError(EXIT.NETWORK, lines.join('\n'));
  }
}

// ---------- catalog helpers ----------

const HAS_JA = /[぀-ヿｦ-ﾟ]/;
const tx = (v, lang) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.join(' ') : String(v[lang] ?? v.en ?? v.ja ?? ''));
const both = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.join(' ') : Object.values(v).map((x) => both(x)).join(' '));
const packKey = (p) => String(p.pack ?? p.id ?? p.slug ?? p.name ?? '');
const pad = (n) => String(n).padStart(3, '0');
const apiBase = (store) => isUrl(store.usedBase || store.bases[0]) ? `${(store.usedBase || store.bases[0]).replace(/\/+$/, '')}/` : pathToFileURL(path.resolve(store.usedBase || store.bases[0]) + path.sep).href;
const elementRef = (store, id, lang) => `${apiBase(store)}${lang}/e/${id}.txt`;

function packsOf(cat) {
  const listed = Array.isArray(cat.packs) ? cat.packs.map((p) => (typeof p === 'string' ? { pack: p } : p)) : [];
  const seen = new Set(listed.map(packKey));
  for (const e of cat.elements) if (!seen.has(e.pack)) { seen.add(e.pack); listed.push({ pack: e.pack }); }
  return listed;
}

function categoryLabel(cat, e, lang) {
  const p = packsOf(cat).find((x) => packKey(x) === e.pack);
  const c = p && Array.isArray(p.categories) ? p.categories.find((x) => x.slug === e.category) : null;
  if (!c) return { label: e.category || '', haystack: e.category || '' };
  return { label: tx(c, lang) || c.slug, haystack: `${c.slug} ${both(c)}` };
}

function requirePack(cat, name) {
  const wanted = String(name).toLowerCase();
  const found = packsOf(cat).find((p) => packKey(p).toLowerCase() === wanted);
  if (!found) throw new CliError(EXIT.NOT_FOUND, `没有名为“${name}”的素材包。可用素材包： ${packsOf(cat).map(packKey).join(', ')}`);
  return packKey(found);
}
// "camera" or "camera,camera2": one pack or several, in the order given, each checked, duplicates dropped.
function requirePacks(cat, names) {
  const keys = [];
  for (const n of String(names).split(',').map((s) => s.trim()).filter(Boolean)) { const k = requirePack(cat, n); if (!keys.includes(k)) keys.push(k); }
  if (!keys.length) throw new CliError(EXIT.USAGE, '--pack 需要素材包名称，例如 --pack camera 或 --pack camera,camera2。');
  return keys;
}

function parseId(token) {
  const m = /(?:^|#|\/)(\d{1,4})\/?$/.exec(String(token).trim());
  return m ? pad(Number(m[1])) : null;
}

function resolveIds(cat, tokens, max) {
  if (!tokens.length) throw new CliError(EXIT.USAGE, '请提供至少一个条目编号，例如 12、#045 或示例 URL。');
  const ids = [];
  const bad = [];
  for (const t of tokens) {
    const id = parseId(t);
    if (!id || !cat.elements.some((e) => e.id === id)) bad.push(t);
    else if (!ids.includes(id)) ids.push(id);
  }
  if (bad.length) {
    const all = cat.elements.map((e) => e.id);
    throw new CliError(EXIT.NOT_FOUND, `没有这些条目：${bad.join(', ')}。目录有 ${all.length} 条（#${all[0]}–#${all[all.length - 1]}）。请用 search 或 list 查找编号，不要猜测。`);
  }
  if (ids.length > max) throw new CliError(EXIT.USAGE, `编号过多（${ids.length} 个）。每次最多获取 ${max} 条，只获取实际需要的条目。`);
  return ids;
}

function line(cat, e, lang) {
  return `#${e.id}  ${tx(e.name, lang)}  [${e.pack} / ${categoryLabel(cat, e, lang).label}]  ${tx(e.summary, lang)}`;
}

// ---------- search ----------

function score(cat, e, tokens) {
  const name = both(e.name).toLowerCase();
  const names = Object.values(e.name || {}).map((s) => String(s).toLowerCase());
  const tags = [...(e.tags || []), ...(e.tagLabels?.['zh-Hans'] || [])].map((t) => String(t).toLowerCase());
  const slug = String(e.slug || '').toLowerCase();
  const catHay = `${categoryLabel(cat, e, 'en').haystack} ${e.pack} ${both((packsOf(cat).find((p) => packKey(p) === e.pack) || {}).title)}`.toLowerCase();
  const summary = both(e.summary).toLowerCase();
  const deep = `${both(e.use)} ${both(e.spec)}`.toLowerCase();
  let total = 0;
  let matched = 0;
  for (const raw of tokens) {
    const forms = [raw];
    if (/^[a-z]{4,}s$/.test(raw)) forms.push(raw.slice(0, -1));
    let best = 0;
    for (const t of forms) {
      let s = 0;
      if (parseId(t) === e.id && /^#?\d+$/.test(t)) s += 20;
      if (names.includes(t)) s += 12; else if (name.includes(t)) s += 8;
      if (slug === t || slug.split('-').includes(t)) s += 6; else if (slug.includes(t)) s += 3;
      if (tags.includes(t)) s += 6; else if (tags.some((g) => g.includes(t))) s += 3;
      if (catHay.includes(t)) s += 3;
      if (summary.includes(t)) s += 2;
      if (deep.includes(t)) s += 1;
      best = Math.max(best, s);
    }
    if (best > 0) matched++;
    total += best;
  }
  return { matched, total };
}

// ---------- output ----------

function emit(files, outDir) {
  if (!outDir) { process.stdout.write(files.map((f) => f.text.replace(/\s*$/, '\n')).join('\n')); return; }
  const dir = path.resolve(outDir);
  try {
    fs.mkdirSync(dir, { recursive: true });
    for (const f of files) fs.writeFileSync(path.join(dir, f.name), f.text);
  } catch (err) { throw new CliError(EXIT.USAGE, `无法写入 ${dir}：${err.message}`); }
  for (const f of files) console.log(path.join(dir, f.name));
}

// ---------- commands ----------

async function cmdSearch(store, args, flags, lang) {
  if (!args.length) throw new CliError(EXIT.USAGE, 'search 至少需要一个关键词，例如“search 打字机”或“search 文字 入场”。');
  const cat = await store.loadCatalog();
  const packs = flags.pack ? requirePacks(cat, flags.pack) : null;
  const limit = Math.max(1, Math.min(50, Number(flags.limit) || 8));
  const tokens = args.join(' ').toLowerCase().split(/[\s,、　]+/).filter(Boolean);
  const hits = cat.elements
    .filter((e) => !packs || packs.includes(e.pack))
    .map((e) => ({ e, ...score(cat, e, tokens) }))
    .filter((h) => h.matched > 0)
    .sort((a, b) => b.matched - a.matched || b.total - a.total || a.e.id.localeCompare(b.e.id));
  if (!hits.length) {
    console.log(`未找到“${args.join(' ')}”${packs ? `（素材包 ${packs.join(', ')}）` : ''}。请尝试其他关键词，或用 list --pack <pack> 浏览。`);
    return;
  }
  for (const h of hits.slice(0, limit)) console.log(line(cat, h.e, lang));
  if (hits.length > limit) console.log(`… 另有 ${hits.length - limit} 条。可用 --pack 缩小范围，或增大 --limit。`);
  console.log('\n下一步：用 get <id> 获取代码和规格，或用 pick 打开本地示例库。');
}

async function cmdList(store, flags, lang) {
  const cat = await store.loadCatalog();
  if (flags.pack) {
    const packs = requirePacks(cat, flags.pack);
    const items = cat.elements.filter((e) => packs.includes(e.pack));
    let current = null;
    for (const e of items) {
      // with several packs, each heading names its pack too (part 1 and part 2 share category names)
      const p = packsOf(cat).find((x) => packKey(x) === e.pack);
      const label = (packs.length > 1 ? `${tx(p && p.title, lang) || e.pack} · ` : '') + categoryLabel(cat, e, lang).label;
      if (label !== current) { console.log(`${current === null ? '' : '\n'}## ${label}`); current = label; }
      console.log(`#${e.id}  ${tx(e.name, lang)}  ${tx(e.summary, lang)}`);
    }
    return;
  }
  for (const p of packsOf(cat)) {
    const key = packKey(p);
    const items = cat.elements.filter((e) => e.pack === key);
    if (!items.length) continue;
    console.log(`${key}  (${items.length})  #${items[0].id}–#${items[items.length - 1].id}  ${tx(p.title, lang)}`);
    const counts = new Map();
    for (const e of items) {
      const label = categoryLabel(cat, e, lang).label;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    for (const [label, n] of counts) console.log(`  - ${label} (${n})`);
  }
  console.log(`\n共 ${cat.elements.length} 条。用 list --pack <pack> 查看素材包。`);
}

function sourceReferences(text, store, lang = 'zh-Hans') {
  const newline = text.indexOf('\n');
  const attribution = text.slice(0, newline + 1);
  const base = apiBase(store);
  const codeStart = text.search(/^\/\/ @(?:kit|element)\b/m);
  if (codeStart < 0) return text;
  const demo = (id, language) => GALLERY + '?lang=' + language + '#' + id;
  const body = text.slice(newline + 1, codeStart)
    .replaceAll(SITE + 'api/v1/', base)
    .replace(/https:\/\/showheyohtaki\.github\.io\/motion-prompt\/#(\d{3})/g, (_, id) => demo(id, lang))
    .replace(/(https:\/\/showheyohtaki\.github\.io\/motion-prompt\/|(?:\.\.\/){3,4})(?=packs\/)/g, GALLERY)
    .replace(/\.\.\/\.\.\/kit\/([\w-]+)\.js/g, (_, pack) => base + 'kit/' + pack + '.js')
    .replace(/(?:\.\.\/){4}index\.html\?lang=([\w-]+)#(\d{3})/g, (_, language, id) => demo(id, language))
    .replace(/\.\.\/(zh-Hans|en|ja)\/e\/<id>\.txt/g, (_, language) => base + language + '/e/<id>.txt')
    .replace('以上资源路径相对于本规格文件。', '辅助代码取自目录，素材和预览链接指向在线示例库。')
    .replaceAll('相对于本辅助代码文件', '引用指向当前数据源');
  return attribution + body + text.slice(codeStart);
}

async function cmdGet(store, args, flags, lang) {
  const cat = await store.loadCatalog();
  const ids = resolveIds(cat, args, MAX_GET);
  const files = [];
  for (const id of ids) {
    const e = cat.elements.find((x) => x.id === id);
    const text = sourceReferences(await store.file(`${lang}/e/${id}.txt`), store, lang);
    files.push({ name: `${id}-${e.slug || 'element'}.txt`, text: `${text.trimEnd()}\n\n// 原始规格文件：${elementRef(store, id, lang)}\n` });
  }
  emit(files, flags.out);
  const kits = [...new Set(ids.map((id) => cat.elements.find((x) => x.id === id).pack))];
  const note = `需要辅助代码：${kits.join(', ')}。使用此代码前，请为每个素材包运行一次 kit <pack>。`;
  if (flags.out) console.log(note); else process.stdout.write(`\n// ${note}\n`);
}

async function cmdPrompt(store, args, flags, lang) {
  const cat = await store.loadCatalog();
  const ids = resolveIds(cat, args, MAX_GET);
  const files = [];
  for (const id of ids) {
    const e = cat.elements.find((item) => item.id === id);
    const p = packsOf(cat).find((item) => packKey(item) === e.pack);
    if (![e.name?.[lang], e.summary?.[lang], e.use?.[lang], p?.title?.[lang]].every((value) => typeof value === 'string' && value.trim()) || !Array.isArray(e.spec?.[lang]) || !e.spec[lang].length || !e.spec[lang].every((value) => typeof value === 'string' && value.trim())) {
      throw new CliError(EXIT.NOT_FOUND, `条目 #${id} 缺少 ${lang} 提示词数据。请使用完整的对应语言运行时，或通过 --lang 显式选择已有语言。`);
    }
    files.push({ name: `${id}-prompt.txt`, text: mpPrompt(e, p.title[lang], lang, apiBase(store)) });
  }
  emit(files, flags.out);
}

async function cmdKit(store, args, flags) {
  if (args.length !== 1) throw new CliError(EXIT.USAGE, 'kit 需要一个素材包名称，例如 kit motion。');
  const cat = await store.loadCatalog();
  const pack = requirePack(cat, args[0]);
  let text = sourceReferences(await store.file(`kit/${pack}.js`), store);
  const metadata = packsOf(cat).find((item) => packKey(item) === pack);
  if (metadata?.images?.length || metadata?.fonts?.length) text += '\n// 本文件仅包含辅助代码，未复制图片或字体。独立运行时需一并提供素材并设置正确资源基址。\n';
  text += `\n// 原始辅助代码：${apiBase(store)}kit/${pack}.js\n`;
  emit([{ name: `kit-${pack}.js`, text }], flags.out);
}

async function cmdInfo(store) {
  console.log(`motion-prompt 技能 ${VERSION}`);
  console.log(`数据源（${store.origin}）：`);
  for (const b of store.bases) console.log(`  ${b}`);
  let cat = null;
  let error = null;
  try { cat = await store.loadCatalog(); } catch (err) { error = err; }
  console.log(`示例库：        ${GALLERY}`);
  console.log(`缓存目录：      ${store.remote ? store.cacheDir() : '（本地文件不使用缓存）'}`);
  if (!cat) { console.log('目录：          不可用'); throw error; }
  console.log(`正在使用：      ${store.fromCache ? `磁盘缓存${store.usedBase ? '' : ' （未发起请求）'}` : store.usedBase}`);
  console.log(`目录：          版本 ${cat.version ?? '?'} · ${cat.elements.length} 条`);
  for (const p of packsOf(cat)) {
    const n = cat.elements.filter((e) => e.pack === packKey(p)).length;
    if (n) console.log(`  ${packKey(p)}: ${n}`);
  }
  console.log(`Node:           ${process.version}`);
}

async function cmdPick(store, args, flags, lang) {
  if (args.length) throw new CliError(EXIT.USAGE, 'pick 可使用 --pack 或 --lang。');
  const gallery = new URL(GALLERY);
  gallery.searchParams.set('lang', lang);
  if (flags.pack) {
    const catalog = await store.loadCatalog();
    gallery.searchParams.set('pack', requirePacks(catalog, flags.pack).join(','));
  }
  console.log('在线示例库：' + gallery.href);
  console.log('选好后，将示例编号或页面里的“复制所选示例”内容发回当前对话。');
}

// ---------- main ----------

async function main() {
  const { flags, command, args } = parseArgs(process.argv.slice(2));
  if (flags.version) { console.log(VERSION); return; }
  if (flags.help || !command || command === 'help') { console.log(HELP); return; }
  if (flags.lang && !['zh-Hans', 'ja', 'en'].includes(flags.lang)) throw new CliError(EXIT.USAGE, '--lang 必须为 zh-Hans、ja 或 en。');
  const lang = flags.lang || (command === 'search' && HAS_JA.test(args.join(' ')) ? 'ja' : 'zh-Hans');
  const store = new Store({ refresh: flags.refresh });
  switch (command) {
    case 'search': return cmdSearch(store, args, flags, lang);
    case 'list': return cmdList(store, flags, lang);
    case 'get': return cmdGet(store, args, flags, lang);
    case 'prompt': return cmdPrompt(store, args, flags, lang);
    case 'kit': return cmdKit(store, args, flags);
    case 'info': return cmdInfo(store);
    case 'pick': return cmdPick(store, args, flags, lang);
    default: throw new CliError(EXIT.USAGE, `未知命令“${command}”。请用 --help 查看帮助。`);
  }
}

main().catch((err) => {
  if (err instanceof CliError) { process.stderr.write(`${err.message}\n`); process.exitCode = err.code; return; }
  process.stderr.write(`motion-prompt：意外错误： ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 1;
});
