import { AspectRatio } from "./constants";

export const enhancePrompt = async (
  prompt: string,
  styleSuffix: string,
  mood: string,
  lighting: string,
  colorTone: string,
  aspectRatio: string
): Promise<string> => {
  if (!prompt.trim()) return prompt;
  
  try {
    const contextParts = [
      styleSuffix ? `Style preference: ${styleSuffix}` : '',
      mood && mood !== 'Default' ? `Mood: ${mood}` : '',
      lighting && lighting !== 'Default' ? `Lighting: ${lighting}` : '',
      colorTone && colorTone !== 'Default' ? `Color Tone: ${colorTone}` : '',
      aspectRatio ? `Aspect Ratio: ${aspectRatio}` : ''
    ].filter(Boolean).join('. ');

    const systemPrompt = `You are an expert image generation prompt engineer. The user has provided a base prompt and selected some specific styles and settings. 
Your task is to powerfully enhance the base prompt to be highly descriptive, artistic, and effective for a text-to-image diffusion model. Ensure high creativity, variety, and uniqueness in your responses. Do NOT return the exact same prompt for the same keyword.
${contextParts ? `CRITICAL INSTRUCTION: You MUST naturally and creatively weave the following selected settings into the narrative of the prompt to enforce them strongly: [${contextParts}].` : ''}
Reply ONLY with the final enhanced prompt text, maximum 2 to 3 very detailed sentences long. Do not include any conversational filler, intro, or outro. Just the prompt itself.`;

    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt + `\n\n[Internal Timestamp: ${Date.now()}-${Math.random()}]` },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        seed: Math.floor(Math.random() * 100000)
      })
    });
    
    if (!response.ok) {
       return prompt;
    }
    
    const result = await response.json();
    return (result && result.choices && result.choices[0]?.message?.content?.trim()) || prompt;
  } catch (error) {
    console.error("Prompt enhancement failed:", error);
    return prompt;
  }
};

export const generateImages = async (
  prompt: string,
  styleSuffix: string,
  mood: string,
  lighting: string,
  colorTone: string,
  aspectRatio: string,
  numImages: number = 1
): Promise<string[]> => {
  const fullPrompt = [
    prompt,
    styleSuffix,
    mood !== 'Default' ? `${mood} mood` : '',
    lighting !== 'Default' ? `${lighting} lighting` : '',
    colorTone !== 'Default' ? `${colorTone} color tone` : ''
  ].filter(Boolean).join(', ');

  const numToGen = numImages || 1;

  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") {
    width = 1024;
    height = 576;
  } else if (aspectRatio === "9:16") {
    width = 576;
    height = 1024;
  } else if (aspectRatio === "4:3") {
    width = 1024;
    height = 768;
  } else if (aspectRatio === "3:4") {
    width = 768;
    height = 1024;
  }

  // Pre-generate the URLs with unique seeds
  const imageUrls = Array.from({ length: numToGen }).map(() => {
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
  });

  const fetchImageWithRetry = async (url: string) => {
    let retries = 3;
    while (retries > 0) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        retries--;
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      }
    }
    return null;
  };

  // Fetch images sequentially to respect rate limits
  const results = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const result = await fetchImageWithRetry(imageUrls[i]);
    results.push(result);
    // Add wait between requests if making multiple
    if (i < imageUrls.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  const validImages = results.filter(img => img !== null) as string[];

  if (validImages.length === 0) {
    throw new Error("Failed to generate images. Please try again.");
  }

  return validImages;
};
