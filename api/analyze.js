// Анализ изображения через GPT Vision — генерирует промпт для img2img.
// Vercel: задайте OPENAI_API_KEY в Environment Variables.

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

const DEFAULT_STRUCTURED_PROMPT = `You are an advanced visual analysis engine specialized in commercial photography, composition reconstruction, and image-to-image generation optimization.

Analyze the provided image and extract a complete structured representation. Output will be used to reconstruct the scene with AI image generation. Return ONLY valid JSON. No markdown. No extra text. Use null when a value cannot be determined.

CRITICAL RULES:
- framing_and_layout.shot_scale: use "full_shot" or "medium_full_shot" when full body + environment visible (NOT "medium" = bust only). Use "medium_shot" only for waist-up, "close_up" for face/chest.
- framing_and_layout.primary_subject_position_percent: height_ratio 65-70 (subject height as % of frame), width_ratio 45-55. Do NOT use 80+ for full-body shots.
- framing_and_layout.negative_space_ratio: number between 0 and 1 (e.g. 0.20 for 20% negative space), NOT a percentage like 20.
- global_geometry.aspect_ratio: "portrait_4_5", "portrait_3_4", "square_1_1", "landscape_4_3", etc. Never leave empty.
- framing_and_layout.subject_anchor_points: array of strings, e.g. ["center", "lower_center"]. Must match rule_of_thirds_usage.
- camera_setup.focal_length_mm (50, 70, or 85), estimated_lens ("standard" or "telephoto_short"). global_geometry.camera_height_cm (e.g. 110-130), camera_to_subject_pitch_deg (0 to -5), camera_distance_m (e.g. 2.5-3.5).
- lighting_design: for studio use key_light.type "studio_softbox", hardness "soft", direction "front_left" or "front_right", fill_light.presence "soft", ambient_light.level "medium". Use "hard" only when shadows are clearly hard-edged.
- human_subjects.body_pose: use pose_microtags array with concrete details: e.g. "seated on edge of sofa", "legs apart feet planted", "hands resting on knees", "torso upright", "head facing camera".
- generation_blueprint.camera_instruction: explicit string, e.g. "full shot, camera distance ~3m, 50-85mm focal length, camera height ~120cm, no wide angle, no crop changes, match perspective to reference".

Schema (strict structure, follow exactly):
{
  "global_geometry": { "image_width_px": null, "image_height_px": null, "aspect_ratio": "", "aspect_ratio_numeric": null, "horizon_line_position_ratio": null, "vertical_centerline_alignment": "", "camera_height_relative_to_subject": "", "camera_height_relative_to_body_part": "", "camera_height_cm": null, "camera_distance_m": null, "camera_to_subject_distance_m": null, "camera_to_floor_pitch_deg": null, "camera_to_subject_pitch_deg": null, "perspective_strength": "", "field_of_view_deg": null, "vertical_convergence": { "presence": "", "direction": "", "strength": "" }, "keystone_distortion": { "presence": "", "strength": "" }, "vanishing_points": { "count": null, "type": "", "points_norm_xy": [] } },
  "camera_setup": { "angle": "", "view_type": "", "camera_position_relative": { "azimuth_deg": null, "elevation_deg": null, "radius_m": null, "lateral_offset": "", "lateral_offset_ratio": null }, "camera_orientation": { "yaw_deg": null, "pitch_deg": null, "roll_deg": null }, "estimated_lens": "", "focal_length_mm": null, "focal_length_35mm_equiv_mm": null, "aperture_equivalent": "", "focus_distance_m": null, "depth_of_field_level": "", "bokeh_character": "", "sensor_look": "", "exposure_character": { "iso_hint": null, "shutter_hint_s": null, "wb_kelvin_hint": null } },
  "framing_and_layout": { "shot_scale": "", "camera_to_subject_framing_axis": "", "vertical_subject_bias": "", "subject_scale_lock": false, "crop_margins_ratio": { "top": null, "bottom": null, "left": null, "right": null }, "headroom_ratio": null, "footroom_ratio": null, "rule_of_thirds_usage": "", "golden_ratio_usage": "", "leading_lines_usage": "", "subject_anchor_points": [], "primary_subject_bbox_percent": { "x_min": null, "y_min": null, "x_max": null, "y_max": null }, "primary_subject_position_percent": { "x_center": null, "y_center": null, "width_ratio": null, "height_ratio": null }, "secondary_subject_positions": [], "negative_space_ratio": null, "visual_weight_distribution": "", "background_visibility_ratio": null, "floor_visibility_ratio": null, "wall_visibility_ratio": null },
  "attention_hierarchy": { "primary_focus_element": "", "secondary_focus_elements": [], "tertiary_elements": [], "eye_flow_path": "", "focus_falloff_direction": "", "sharpness_priority_map": [] },
  "subject_analysis": { "main_subject": { "type": "", "category": "", "relative_size_ratio": null, "dominance_level": "" }, "human_subjects": [{ "gender": "", "age_range": "", "body_type": "", "skin_tone": "", "hair": { "color": "", "length": "", "style": "" }, "face_visibility": "", "expression": "", "gaze_direction": "", "body_pose": { "pose": "", "pose_microtags": [], "posture": "", "weight_distribution": "", "body_yaw_deg": null, "shoulder_yaw_deg": null, "hip_yaw_deg": null, "torso_pitch_deg": null, "head_turn_deg": null, "arm_positions": "", "hand_positions": "", "leg_positions": "" }, "clothing_and_accessories": { "clothing_summary": "", "materials": [], "accessories": [], "footwear": "" } }], "product_objects": [{ "category": "", "subcategory": "", "identity_hint": "", "location_percent": { "x_center": null, "y_center": null }, "bbox_percent": { "x_min": null, "y_min": null, "x_max": null, "y_max": null }, "mask_area_ratio": null, "size_ratio": null, "orientation": "", "pose_relation_to_human": "", "visibility_level": "", "occlusion": { "is_occluded": null, "occlusion_sources": [], "occlusion_ratio": null } }] },
  "spatial_depth_model": { "foreground_elements": [], "midground_elements": [], "background_elements": [], "subject_to_background_distance_m": null, "camera_to_subject_distance_m": null, "camera_height_to_floor_cm": null, "floor_plane": { "visible": null, "tilt_deg": null, "material_hint": "" }, "wall_planes": [{ "type": "", "orientation_hint": "", "tilt_deg": null, "distance_hint_m": null }], "layer_separation_strength": "", "depth_cues": [], "depth_compression_level": "", "relative_scale_cues": { "presence": "", "notes": "" } },
  "lighting_design": { "key_light": { "type": "", "source": "", "direction": "", "height": "", "azimuth_deg": null, "elevation_deg": null, "hardness": "", "distance_hint_m": null, "size_hint": "", "wrap_level": "" }, "fill_light": { "presence": "", "source": "", "intensity_ratio": null, "direction": "" }, "rim_light": { "presence": "", "source": "", "direction": "", "intensity_hint": "" }, "bounce_light": { "presence": "", "bounce_surface_hint": "", "direction": "" }, "ambient_light": { "level": "", "color_temperature": "", "environment_hint": "" }, "shadow_structure": "", "shadow_direction": "", "shadow_length_ratio": null, "shadow_edge_softness": "", "highlight_pattern": "", "specular_behavior": "" },
  "color_and_tone": { "dominant_palette": [], "accent_palette": [], "background_palette": [], "saturation_level": "", "contrast_level": "", "color_temperature": "", "white_balance_bias": "", "tone_curve_hint": "", "color_harmony_model": "", "skin_tone_rendering": "", "black_levels": "" },
  "texture_and_materials": { "main_surface_textures": [], "fabric_types": [], "reflectivity_levels": "", "roughness_distribution": "", "material_notes": { "leather_specularity": "", "knit_detail_level": "", "sofa_fabric_detail_level": "" } },
  "environment_model": { "location_type": "", "style_category": "", "architectural_elements": [], "furniture_objects": [{ "category": "", "material": "", "color": "", "position_relative_to_subject": "", "orientation_hint": "" }], "decorative_elements": [], "subject_position_relative_to_furniture": "", "scene_density": "", "cleanliness_level": "", "background_geometry_constraints": { "paneling_molding_style": "", "wall_pattern_scale": "", "visible_edges_alignment": "" } },
  "branding_and_marketing_structure": { "commercial_intent_level": "", "product_visibility_priority": "", "trust_elements": [], "emotional_triggers": [], "call_to_action_visuals": [], "retouching_level": "", "catalog_style_conformance": "" },
  "generation_blueprint": { "camera_instruction": "", "camera_pose_constraints": { "keep_eye_level": null, "match_pitch_deg": null, "match_focal_length_mm": null, "avoid_wide_angle_distortion": null, "match_camera_height_relative_to_body_part": "", "match_lateral_offset": "" }, "composition_instruction": "", "composition_constraints": { "lock_subject_bbox_percent": { "x_min": null, "y_min": null, "x_max": null, "y_max": null }, "lock_headroom_ratio": null, "lock_floor_visibility_ratio": null, "lock_vertical_subject_bias": "" }, "lighting_instruction": "", "lighting_constraints": { "match_key_light_direction": "", "match_shadow_direction": "", "match_shadow_softness": "", "match_specular_behavior": "" }, "subject_instruction": "", "environment_instruction": "", "style_instruction": "", "camera_lock_instruction": "", "do_not_change": [] }
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

  const { image: imageDataUrl, system_prompt: customSystemPrompt, provider: providerParam } = req.body || {};
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ error: 'Need image (data URL)' });
  }
  const systemPrompt = (typeof customSystemPrompt === 'string' && customSystemPrompt.trim())
    ? customSystemPrompt.trim()
    : DEFAULT_STRUCTURED_PROMPT;
  const provider = providerParam === 'gemini' ? 'gemini' : 'openai';

  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  };

  const parseAndReturnJson = (raw) => {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = m ? m[0] : cleaned;
    try {
      const parsed = JSON.parse(jsonStr);
      setCors();
      return res.status(200).json({ structured: parsed });
    } catch (e) {
      const debug = {
        raw_preview: raw.slice(0, 800),
        raw_length: raw.length,
        cleaned_preview: jsonStr.slice(0, 800),
        parse_error: e.message,
        parse_position: e.message?.match(/position\s+(\d+)/)?.[1],
      };
      console.error('[analyze] JSON parse failed:', e.message, '| raw_len:', raw.length);
      setCors();
      return res.status(502).json({ error: 'Invalid JSON in structured response', debug });
    }
  };

  try {
    if (provider === 'gemini') {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        setCors();
        return res.status(500).json({ error: 'GEMINI_API_KEY not set' });
      }
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const base64Data = match ? match[2] : imageDataUrl.replace(/^data:[^;]+;base64,/, '');
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: systemPrompt + '\n\nReturn ONLY valid JSON. No markdown. No extra text.' },
              ],
            }],
            generationConfig: {
              response_mime_type: 'application/json',
              max_output_tokens: 8192,
            },
          }),
        }
      );
      const geminiData = await geminiRes.json().catch(() => ({}));
      if (!geminiRes.ok) {
        const msg = geminiData.error?.message || geminiData.error?.code || geminiRes.statusText;
        setCors();
        return res.status(geminiRes.status).json({ error: msg || 'Gemini API error' });
      }
      const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) {
        setCors();
        return res.status(502).json({ error: 'No response content', debug: {} });
      }
      return parseAndReturnJson(raw);
    }

    const token = process.env.OPENAI_API_KEY;
    if (!token) {
      setCors();
      return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        response_format: { type: 'json_object' },
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
      setCors();
      return res.status(response.status).json({ error: msg || 'OpenAI API error' });
    }

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      setCors();
      return res.status(502).json({ error: 'No response content', debug: {} });
    }
    return parseAndReturnJson(raw);
  } catch (err) {
    setCors();
    return res.status(500).json({ error: err.message || 'Analyze error' });
  }
}
