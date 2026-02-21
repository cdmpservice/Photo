// Опрос статуса prediction в Replicate (для обхода лимита 10s Vercel).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'Need query id (prediction_id)' });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set' });
  }

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText || response.statusText });
    }
    const prediction = await response.json();
    const status = prediction.status;
    const output = prediction.output;

    if (status === 'succeeded' && output) {
      const image_url = Array.isArray(output) ? output[0] : output;
      return res.status(200).json({ status: 'succeeded', image_url });
    }
    if (status === 'failed' || status === 'canceled') {
      return res.status(200).json({
        status,
        error: prediction.error || prediction.logs?.join('\n') || 'Generation failed',
      });
    }
    return res.status(200).json({ status: status || 'starting' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
