// Анализ изображения через GPT Vision — генерирует промпт для img2img.
// Vercel: задайте OPENAI_API_KEY в Environment Variables.

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const SYSTEM_PROMPT = `You are an expert at describing photos for image-to-image AI prompts. Analyze the image and write a detailed English prompt suitable for img2img generation. MUST include:

1. CAMERA ANGLE / SHOOTING PERSPECTIVE — from which angle the shot is taken (eye level, low angle, high angle, dutch angle, frontal, 3/4 view, etc.)
2. SHOT SCALE / FRAMING — крупность плана: extreme close-up, close-up, medium close-up, medium shot, medium full shot, full shot, long shot, etc.
3. MODEL TYPE — тип модели: age range, build, skin tone, hair (color, length, style), facial features, gender if visible
4. POSE AND BODY POSITION — detailed description of pose, body orientation, hand/arm placement, posture
5. INTERIOR / ENVIRONMENT — максимально детально: walls, furniture, décor, materials, colors, textures, objects in frame, spatial layout, style (minimalist, modern, vintage, etc.), atmosphere
6. LIGHTING — direction, quality (soft/hard), source (natural/window/artificial), time of day feel, shadows, highlights
7. STYLE AND MOOD — overall aesthetic, mood

Output ONLY the prompt text in English, no explanations. Be very detailed, especially for interior and model description. Use 2-5 descriptive sentences.`;

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

  const { image: imageDataUrl, system_prompt: customSystemPrompt } = req.body || {};
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need image (data URL)' });
  }
  const systemPrompt = (typeof customSystemPrompt === 'string' && customSystemPrompt.trim())
    ? customSystemPrompt.trim()
    : SYSTEM_PROMPT;

  const token = process.env.OPENAI_API_KEY;
  if (!token) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data.error?.message || data.error?.code || response.statusText;
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(response.status).json({ error: msg || 'OpenAI API error' });
    }

    const prompt = data.choices?.[0]?.message?.content?.trim();
    if (!prompt) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({ error: 'No prompt in response' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ prompt });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err.message || 'Analyze error' });
  }
}
