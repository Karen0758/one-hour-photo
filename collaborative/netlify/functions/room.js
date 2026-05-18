const { json, supabaseFetch } = require('./_utils');

function validCode(code) {
  return /^\d{4}$/.test(String(code || ''));
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const code = event.queryStringParameters && event.queryStringParameters.code;
      if (!validCode(code)) return json(400, { error: '请输入 4 位房间号' });

      const rows = await supabaseFetch(`/rest/v1/room_states?code=eq.${encodeURIComponent(code)}&select=code,state,updated_at`);
      if (rows && rows[0]) return json(200, rows[0]);
      return json(200, { code, state: null, updated_at: null });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!validCode(body.code)) return json(400, { error: '请输入 4 位房间号' });
      if (!body.state || !Array.isArray(body.state.cards)) return json(400, { error: '卡片数据无效' });

      const rows = await supabaseFetch('/rest/v1/room_states?on_conflict=code', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([{
          code: body.code,
          state: body.state,
          updated_at: new Date().toISOString()
        }])
      });
      return json(200, rows && rows[0] ? rows[0] : { code: body.code });
    }

    return json(405, { error: 'method not allowed' });
  } catch (error) {
    console.error(error);
    return json(500, { error: '房间同步失败' });
  }
};
