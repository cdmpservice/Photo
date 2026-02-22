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

const SYSTEM_PROMPT_STRUCTURED = `You are an advanced visual analysis engine specialized in commercial photography, composition reconstruction, and image-to-image generation optimization.

Analyze the provided image and extract a complete structured representation of its visual composition, spatial geometry, lighting setup, and subject hierarchy.

Your output will be used to reconstruct the scene using AI image generation tools.

Return ONLY valid JSON. No explanations. No markdown. No extra text.

If any value cannot be reliably determined, set it to null.

Schema:
{
  "global_geometry": { "image_width_px": null, "image_height_px": null, "aspect_ratio": "", "horizon_line_position": "", "camera_height_relative_to_subject": "", "perspective_strength": "", "vanishing_points": "" },
  "camera_setup": { "angle": "", "tilt": "", "roll": "", "view_type": "", "estimated_lens": "", "estimated_focal_length_mm": "", "depth_of_field_level": "" },
  "framing_and_layout": { "shot_scale": "", "rule_of_thirds_usage": "", "golden_ratio_usage": "", "subject_anchor_points": [], "primary_subject_position_percent": { "x_center": null, "y_center": null, "width_ratio": null, "height_ratio": null }, "secondary_subject_positions": [], "negative_space_ratio": null, "visual_weight_distribution": "" },
  "attention_hierarchy": { "primary_focus_element": "", "secondary_focus_elements": [], "tertiary_elements": [], "eye_flow_path": "" },
  "subject_analysis": { "main_subject": { "type": "", "category": "", "relative_size_ratio": null, "dominance_level": "" }, "human_subjects": [{ "gender": "", "age_range": "", "body_type": "", "pose": "", "orientation": "", "expression": "", "clothing_summary": "" }], "product_objects": [{ "category": "", "location_percent": { "x_center": null, "y_center": null }, "size_ratio": null, "orientation": "", "visibility_level": "" }] },
  "spatial_depth_model": { "foreground_elements": [], "midground_elements": [], "background_elements": [], "layer_separation_strength": "", "depth_cues": [] },
  "lighting_design": { "key_light": { "type": "", "direction": "", "height": "", "hardness": "" }, "fill_light": { "presence": "", "intensity_ratio": null }, "rim_light": { "presence": "", "direction": "" }, "ambient_light": { "level": "", "color_temperature": "" }, "shadow_structure": "", "highlight_pattern": "" },
  "color_and_tone": { "dominant_palette": [], "accent_palette": [], "background_palette": [], "saturation_level": "", "contrast_level": "", "color_temperature": "", "color_harmony_model": "" },
  "texture_and_materials": { "main_surface_textures": [], "fabric_types": [], "reflectivity_levels": "", "roughness_distribution": "" },
  "environment_model": { "location_type": "", "style_category": "", "architectural_elements": [], "furniture_objects": [], "decorative_elements": [], "scene_density": "", "cleanliness_level": "" },
  "branding_and_marketing_structure": { "commercial_intent_level": "", "product_visibility_priority": "", "trust_elements": [], "emotional_triggers": [], "call_to_action_visuals": [] },
  "generation_blueprint": { "camera_instruction": "", "composition_instruction": "", "lighting_instruction": "", "subject_instruction": "", "environment_instruction": "", "style_instruction": "" }
}`;

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

  const { image: imageDataUrl, system_prompt: customSystemPrompt, structured: useStructured } = req.body || {};
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need image (data URL)' });
  }
  const isStructured = useStructured === true || useStructured === 'true' || useStructured === '1';
  const systemPrompt = isStructured
    ? SYSTEM_PROMPT_STRUCTURED
    : ((typeof customSystemPrompt === 'string' && customSystemPrompt.trim()) ? customSystemPrompt.trim() : SYSTEM_PROMPT);

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
        max_tokens: isStructured ? 2500 : 500,
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

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(502).json({ error: 'No response content' });
    }

    if (isStructured) {
      let parsed;
      try {
        const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(502).json({ error: 'Invalid JSON in structured response' });
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ structured: parsed });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ prompt: raw });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err.message || 'Analyze error' });
  }
}
