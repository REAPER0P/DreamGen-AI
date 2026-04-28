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
    const response = await fetch("/api/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, styleSuffix, mood, lighting, colorTone, aspectRatio }),
    });
    
    if (!response.ok) {
       const errText = await response.text();
       console.error("Text API Error", errText);
       
       let errMsg = "Failed to enhance prompt";
       try {
         const errJson = JSON.parse(errText);
         if (errJson.error) errMsg = errJson.error;
       } catch (e) {}

       if (response.status === 401 || !prompt) {
         throw new Error(errMsg);
       }
       return prompt;
    }
    
    const result = await response.json();
    return result.prompt || prompt;
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
