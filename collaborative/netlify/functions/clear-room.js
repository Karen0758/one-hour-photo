const { json, env, supabaseFetch } = require('./_utils');

function validCode(code) {
  return /^\d{4}$/.test(String(code || ''));
}

async function listRoomObjects(bucket, code) {
  const prefix = `rooms/${code}`;
  const rows = await supabaseFetch(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    })
  });

  return (rows || [])
    .filter(item => item && item.name)
    .map(item => `${prefix}/${item.name}`);
}

async function removeRoomObjects(bucket, paths) {
  if (!paths.length) return;
  await supabaseFetch(`/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prefixes: paths })
  });
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });

    const body = JSON.parse(event.body || '{}');
    if (!validCode(body.code)) return json(400, { error: '请输入 4 位房间号' });
    if (String(body.adminToken || '') !== env('ADMIN_TOKEN')) {
      return json(403, { error: '管理员密码不正确' });
    }

    const bucket = env('SUPABASE_BUCKET', false) || 'one-hour-photo';
    const paths = await listRoomObjects(bucket, body.code);
    await removeRoomObjects(bucket, paths);

    await supabaseFetch(`/rest/v1/room_states?code=eq.${encodeURIComponent(body.code)}`, {
      method: 'DELETE'
    });

    return json(200, { ok: true, deletedImages: paths.length });
  } catch (error) {
    console.error(error);
    return json(500, { error: '清空房间失败' });
  }
};
