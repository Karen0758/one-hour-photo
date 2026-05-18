const crypto = require('crypto');

const SLOT_ALIASES = {
  a: 'tl',
  '1': 'tl',
  tl: 'tl',
  lefttop: 'tl',
  '左上': 'tl',
  b: 'tr',
  '2': 'tr',
  tr: 'tr',
  righttop: 'tr',
  '右上': 'tr',
  c: 'bl',
  '3': 'bl',
  bl: 'bl',
  leftbottom: 'bl',
  '左下': 'bl',
  d: 'br',
  '4': 'br',
  br: 'br',
  rightbottom: 'br',
  '右下': 'br'
};

const SLOT_TO_INDEX = { tl: 0, tr: 1, bl: 2, br: 3 };

function env(name, required = true) {
  const value = process.env[name];
  if (required && !value) throw new Error(`Missing env ${name}`);
  return value;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function text(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    },
    body
  };
}

function verifyWechatSignature(query, token) {
  const { signature, timestamp, nonce } = query || {};
  if (!signature || !timestamp || !nonce) return false;
  const raw = [token, timestamp, nonce].sort().join('');
  const digest = crypto.createHash('sha1').update(raw).digest('hex');
  return digest === signature;
}

function parseXml(xml) {
  const out = {};
  const re = /<((?!xml\b)[A-Za-z0-9_]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/\1>/g;
  let match;
  while ((match = re.exec(xml || ''))) {
    out[match[1]] = match[2] != null ? match[2] : match[3];
  }
  return out;
}

function xmlReply(toUser, fromUser, content) {
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

function parseBindSlot(content) {
  const normalized = String(content || '')
    .replace(/\s+/g, '')
    .replace(/^绑定/i, '')
    .toLowerCase();
  return SLOT_ALIASES[normalized] || null;
}

function datePartsFromWechatTime(createTime) {
  const date = new Date(Number(createTime) * 1000);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hourKey: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:00`,
    timeLabel: `${parts.hour}:00`,
    sentAt: date.toISOString()
  };
}

async function supabaseFetch(path, options = {}) {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const key = options.serviceRole === false
    ? env('SUPABASE_PUBLISHABLE_KEY')
    : env('SUPABASE_SERVICE_ROLE_KEY');
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    ...options.headers
  };
  delete options.serviceRole;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
}

module.exports = {
  SLOT_TO_INDEX,
  json,
  text,
  env,
  verifyWechatSignature,
  parseXml,
  xmlReply,
  parseBindSlot,
  datePartsFromWechatTime,
  supabaseFetch
};
