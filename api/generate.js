// Прокси для генерации изображений через Replicate (Nano Banana, GPT Image 1.5).
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

  const {
    prompt,
    image: imageDataUrl,
    model: modelKey,
    output_format: uiOutputFormat,
    output_quality: uiOutputQuality,
  } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !imageDataUrl || typeof imageDataUrl !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need prompt and image (data URL)' });
  }

  const outputFormat = typeof uiOutputFormat === 'string' ? uiOutputFormat.trim() || undefined : undefined;
  const outputQuality = uiOutputQuality !== undefined && uiOutputQuality !== null && uiOutputQuality !== '' ? parseInt(uiOutputQuality, 10) : undefined;
  const models = {
    nano_banana: {
      version: '2784c5d54c07d79b0a2a5385477038719ad37cb0745e61bbddf2fc236d196a6b',
    },
    gpt_image_1_5: {
      version: '37290ca08cd60a404e2c1b8266d214e4769f756926c2e1179c7a3a0d12ae101b',
    },
  };
  const effectiveModel = models[modelKey] ? modelKey : 'nano_banana';
  const modelMeta = models[effectiveModel];

  let input;
  if (effectiveModel === 'nano_banana') {
    input = {
      prompt: prompt.trim(),
      image_input: [imageDataUrl],
      aspect_ratio: 'match_input_image',
      output_format: outputFormat || 'jpg',
    };
  } else {
    input = {
      prompt: prompt.trim(),
      input_images: [imageDataUrl],
      output_format: outputFormat || 'webp',
      quality: 'high',
      input_fidelity: 'high',
    };
  }

  const chosen = { version: modelMeta.version, input };

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set' });
  }

  try {
    // Без Prefer: wait — возвращаем prediction_id сразу (Vercel free tier 10s, Replicate 30–60s).
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: chosen.version,
        input: chosen.input,
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

    if (status === 'succeeded' && output) {
      const imageUrl = Array.isArray(output) ? output[0] : output;
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ image_url: imageUrl });
    }
    if (!prediction.id) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({ error: 'No prediction id', status });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ prediction_id: prediction.id });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err.message || 'Proxy error' });
  }
}
