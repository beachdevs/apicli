const yaml = globalThis.Bun?.YAML;

export const parseYaml = (input) => {
  if (!yaml?.parse) throw new Error('YAML parsing requires Bun runtime');
  return yaml.parse(input);
};

const isPlainKey = (v) => /^[A-Za-z0-9_.-]+$/.test(v);
const needsQuotedString = (v) => {
  if (v === '') return true;
  if (/^\s|\s$/.test(v)) return true;
  if (/^(true|false|null|~)$/i.test(v)) return true;
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return true;
  if (/^[\[\]{}]|^[-?:,]|#/.test(v)) return true;
  if (v.includes(': ')) return true;
  return false;
};

const quote = (v) => `"${v.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const asKey = (k) => (isPlainKey(k) ? k : quote(k));
const indent = (n) => '  '.repeat(n);

const formatScalar = (v) => {
  if (typeof v === 'string') return needsQuotedString(v) ? quote(v) : v;
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v == null) return 'null';
  return quote(String(v));
};

const emit = (value, level) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const child = emit(item, level + 1);
        const childLines = child.split('\n');
        return `${indent(level)}-\n${childLines.map((l) => `${indent(level + 1)}${l}`).join('\n')}`;
      }
      return `${indent(level)}- ${formatScalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const key = asKey(k);
      if (typeof v === 'string' && v.includes('\n')) {
        const body = v.replace(/\n$/, '').split('\n').map((l) => `${indent(level + 1)}${l}`).join('\n');
        return `${indent(level)}${key}: |\n${body}`;
      }
      if (Array.isArray(v)) {
        if (v.length === 0) return `${indent(level)}${key}: []`;
        const list = emit(v, level + 1);
        return `${indent(level)}${key}:\n${list}`;
      }
      if (v && typeof v === 'object') {
        const obj = emit(v, level + 1);
        if (obj === '{}') return `${indent(level)}${key}: {}`;
        return `${indent(level)}${key}:\n${obj}`;
      }
      return `${indent(level)}${key}: ${formatScalar(v)}`;
    }).join('\n');
  }
  return formatScalar(value);
};

export const stringifyYaml = (input) => {
  return `${emit(input, 0)}\n`;
};
