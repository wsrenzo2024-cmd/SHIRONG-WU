import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SceneData, GenerationSettings, PromptSet } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

const promptSetSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    t2iEn: { type: Type.STRING, description: "Detailed Text-to-Image prompt in English." },
    t2iZh: { type: Type.STRING, description: "Detailed Text-to-Image prompt in Chinese." },
    i2vEn: { type: Type.STRING, description: "Motion-focused Image-to-Video prompt in English." },
    i2vZh: { type: Type.STRING, description: "Motion-focused Image-to-Video prompt in Chinese." }
  },
  required: ["t2iEn", "t2iZh", "i2vEn", "i2vZh"]
};

const sceneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalScript: { type: Type.STRING, description: "The segment of the original script." },
          suggestedImageCount: { type: Type.INTEGER, description: "Recommended number of images (1-4)." },
          reasoningEn: { type: Type.STRING, description: "Explanation of visual choices in English." },
          reasoningZh: { type: Type.STRING, description: "Explanation of visual choices in Chinese." },
          prompts: {
            type: Type.ARRAY,
            items: promptSetSchema,
            description: "A list of prompt sets. The number of items must match 'suggestedImageCount'. If count is > 1, provide distinct variations (e.g. Wide, Medium, Close-up)."
          }
        },
        required: ["originalScript", "suggestedImageCount", "reasoningEn", "reasoningZh", "prompts"]
      }
    }
  }
};

const singleSceneSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestedImageCount: { type: Type.INTEGER },
    reasoningEn: { type: Type.STRING },
    reasoningZh: { type: Type.STRING },
    prompts: {
      type: Type.ARRAY,
      items: promptSetSchema
    }
  },
  required: ["reasoningEn", "reasoningZh", "prompts"]
};

export const generateFullScriptAnalysis = async (
  scriptText: string,
  settings: GenerationSettings
): Promise<SceneData[]> => {
  const prompt = `
    You are an expert Cinematographer and AI Prompt Engineer.
    Analyze the script. Break it down into scenes.
    
    Settings:
    - Art Style: ${settings.artStyle}
    - Aspect Ratio: ${settings.aspectRatio}
    
    For each scene:
    1. Determine 'suggestedImageCount' (1-4).
    2. Provide 'reasoningEn' & 'reasoningZh': Explain visual direction/mood in both languages.
    3. Generate 'prompts': An array of prompt sets. The length MUST equal 'suggestedImageCount'.
       - t2iEn/Zh: Text-to-Image prompts (Subject, Environment, Lighting, Camera).
       - i2vEn/Zh: Image-to-Video prompts (Motion descriptions).
    
    Input Script:
    """
    ${scriptText}
    """
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: sceneSchema,
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  
  if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error("Invalid response structure from AI");
  }

  return parsed.scenes.map((scene: any, index: number) => {
    // Determine final image count based on settings
    const finalCount = settings.defaultImageCount === 0 
      ? (scene.suggestedImageCount || 1) 
      : settings.defaultImageCount;

    // Ensure we have enough prompts if the settings forced a higher number than AI generated
    let prompts: PromptSet[] = scene.prompts || [];
    
    // Fallback: fill array if AI returned fewer prompts than needed (though Schema helps)
    // or if we forced a specific count that is higher than what AI thought naturally.
    if (prompts.length === 0) {
        // Should not happen if AI follows instructions, but safe fallback
        prompts = [{ t2iEn: "Error generating prompt", t2iZh: "生成提示词错误", i2vEn: "Error", i2vZh: "错误" }];
    }
    
    return {
      id: `scene-${Date.now()}-${index}`,
      imageCount: finalCount,
      aiSuggestedCount: scene.suggestedImageCount,
      ...scene,
      prompts: prompts // Pass the raw array, logic for display handled in component
    };
  });
};

export const regenerateScene = async (
  originalScript: string,
  settings: GenerationSettings,
  targetImageCount: number
): Promise<Partial<SceneData>> => {
  const prompt = `
    Regenerate visual prompts.
    
    Settings:
    - Art Style: ${settings.artStyle}
    - Aspect Ratio: ${settings.aspectRatio}
    - Target Image Count: ${targetImageCount}
    
    Script Segment: "${originalScript}"
    
    Provide:
    1. Bilingual Reasoning (reasoningEn, reasoningZh).
    2. 'prompts': An array of EXACTLY ${targetImageCount} distinct prompt sets. 
       If count > 1, create a sequence or variations (e.g. Action A -> Action B, or different angles).
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: singleSceneSchema,
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  return parsed;
};