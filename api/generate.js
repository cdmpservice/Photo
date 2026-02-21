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

  const {
    prompt,
    image: imageDataUrl,
    model: modelKey,
    prompt_strength: uiPromptStrength,
    num_inference_steps: uiSteps,
    seed: uiSeed,
    negative_prompt: uiNegativePrompt,
    guidance_scale: uiGuidance,
    output_format: uiOutputFormat,
    output_quality: uiOutputQuality,
  } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !imageDataUrl || typeof imageDataUrl !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need prompt and image (data URL)' });
  }

  const promptStrength = typeof uiPromptStrength === 'number' ? uiPromptStrength : parseFloat(uiPromptStrength);
  const numInferenceSteps = typeof uiSteps === 'number' ? uiSteps : parseInt(uiSteps, 10);
  const seed = uiSeed !== undefined && uiSeed !== null && uiSeed !== '' ? parseInt(uiSeed, 10) : undefined;
  const negativePrompt = typeof uiNegativePrompt === 'string' ? uiNegativePrompt.trim() || undefined : undefined;
  const guidanceScale = typeof uiGuidance === 'number' ? uiGuidance : (uiGuidance != null && uiGuidance !== '' ? parseFloat(uiGuidance) : undefined);
  const outputFormat = typeof uiOutputFormat === 'string' ? uiOutputFormat.trim() || undefined : undefined;
  const outputQuality = uiOutputQuality !== undefined && uiOutputQuality !== null && uiOutputQuality !== '' ? parseInt(uiOutputQuality, 10) : undefined;

  const models = {
    flux_img2img: {
      version: '59d24cdf87eb2bf20757d7072c5718750d76ecdcc87851e0e2ca5bac92cef21d',
      defaultSteps: 28,
    },
    sdxl: {
      version: '392573f9ac8c7f6153001c5ef00fc9fd6611ad361e3ead07160116747895d7ad',
      defaultSteps: 25,
    },
    nano_banana: {
      version: '2784c5d54c07d79b0a2a5385477038719ad37cb0745e61bbddf2fc236d196a6b',
    },
    gpt_image_1_5: {
      version: '37290ca08cd60a404e2c1b8266d214e4769f756926c2e1179c7a3a0d12ae101b',
    },
  };
  const modelMeta = models[modelKey] || models.flux_img2img;

  let input;
  if (modelKey === 'nano_banana') {
    input = {
      prompt: prompt.trim(),
      image_input: [imageDataUrl],
      aspect_ratio: 'match_input_image',
      output_format: outputFormat || 'jpg',
    };
  } else if (modelKey === 'gpt_image_1_5') {
    input = {
      prompt: prompt.trim(),
      input_images: [imageDataUrl],
      output_format: outputFormat || 'webp',
      quality: 'high',
      input_fidelity: 'high',
    };
  } else {
    input = {
      prompt: prompt.trim(),
      image: imageDataUrl,
      prompt_strength: Number.isFinite(promptStrength) ? Math.max(0.1, Math.min(1, promptStrength)) : 0.8,
      num_inference_steps: Number.isFinite(numInferenceSteps) ? Math.max(10, Math.min(50, numInferenceSteps)) : modelMeta.defaultSteps,
    };
    if (Number.isFinite(seed) && seed >= 0) input.seed = seed;
    if (negativePrompt) input.negative_prompt = negativePrompt;
    if (Number.isFinite(guidanceScale) && guidanceScale >= 1) input.guidance_scale = Math.min(15, guidanceScale);
    if (outputFormat) input.output_format = outputFormat;
    if (Number.isFinite(outputQuality) && outputQuality >= 1) input.output_quality = Math.min(100, outputQuality);
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
