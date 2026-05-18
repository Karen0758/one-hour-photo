const { json, env, supabaseFetch } = require('./_utils');

function validCode(code) {
  return /^\d{4}$/.test(String(code || ''));
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!match) return null;
  const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const extension = contentType.split('/')[1].replace('jpeg', 'jpg');
  return {
    contentType,
    extension,
    buffer: Buffer.from(match[2], 'base64')
  };
}

async function uploadImage(path, image) {
  const bucket = env('SUPABASE_BUCKET', false) || 'one-hour-photo';
  await supabaseFetch(`/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
    method: 'POST',
    headers: {
      'content-type': image.contentType,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-upsert': 'true'
    },
    body: image.buffer
  });
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });

    const body = JSON.parse(event.body || '{}');
    if (!validCode(body.code)) return json(400, { error: '请输入 4 位房间号' });

    const image = parseDataUrl(body.dataUrl);
    if (!image) return json(400, { error: '图片数据无效' });

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${image.extension}`;
    const path = `rooms/${body.code}/${name}`;
    const url = await uploadImage(path, image);

    return json(200, { url });
  } catch (error) {
    console.error(error);
    return json(500, { error: '图片上传失败' });
  }
};
