// Прокси для загрузки изображений — обход CORS и ограничений corsproxy.io (413).
// Допустимые домены: selstorage.ru, localhost (для разработки).

const ALLOWED_HOSTS = ['selstorage.ru', 'cdn.selcloud.ru', 'localhost', '127.0.0.1'];

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need url' });
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch (_) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Invalid url' });
  }

  if (!ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(403).json({ error: 'Host not allowed' });
  }

  try {
    const resp = await fetch(url.trim(), { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Vision/1)' } });
    if (!resp.ok) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(resp.status).json({ error: 'Upstream: ' + resp.status });
    }
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = Buffer.from(bytes).toString('base64');
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${ct};base64,${base64}`;
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ dataUrl });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ error: err.message || 'Fetch failed' });
  }
}
