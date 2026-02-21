// Прокси для генерации изображений через Replicate (Flux img2img).
// Деплой на Vercel: в настройках проекта задайте REPLICATE_API_TOKEN.
// Локально: создайте .env с REPLICATE_API_TOKEN=r8_xxx и запустите vercel dev.

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

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

  const { prompt, image: imageDataUrl } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !imageDataUrl || typeof imageDataUrl !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need prompt and image (data URL)' });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set' });
  }

  try {
    // Replicate принимает data URI только для файлов < 1MB; большие изображения дают 422.
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        version: '59d24cdf87eb2bf20757d7072c5718750d76ecdcc87851e0e2ca5bac92cef21d',
        input: {
          prompt: prompt.trim(),
          image: imageDataUrl,
          prompt_strength: 0.8,
          num_inference_steps: 28,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(response.status).json({ error: errText || response.statusText });
    }

    const prediction = await response.json();
    const status = prediction.status;
    const output = prediction.output;

    if (status !== 'succeeded' || !output) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({
        error: 'Generation failed',
        status,
        logs: prediction.logs,
        detail: prediction.error || prediction.message,
      });
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ image_url: imageUrl });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
