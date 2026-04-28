import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/enhance", async (req, res) => {
    try {
      const { prompt, styleSuffix, mood, lighting, colorTone, aspectRatio } = req.body;
      if (!prompt) return res.json({ prompt: "" });

      const contextParts = [
        styleSuffix ? `Style preference: ${styleSuffix}` : '',
        mood && mood !== 'Default' ? `Mood: ${mood}` : '',
        lighting && lighting !== 'Default' ? `Lighting: ${lighting}` : '',
        colorTone && colorTone !== 'Default' ? `Color Tone: ${colorTone}` : '',
        aspectRatio ? `Aspect Ratio: ${aspectRatio}` : ''
      ].filter(Boolean).join('. ');

      let systemPrompt = `You are an expert image generation prompt engineer. The user has provided a base prompt and selected some specific styles and settings. 
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
        throw new Error("Failed to reach text generation API");
      }

      const result = await response.json();
      let enhancedPrompt = prompt;

      if (result && result.choices && result.choices[0]?.message) {
        enhancedPrompt = result.choices[0].message.content?.trim();
      }
      
      res.json({ prompt: enhancedPrompt || prompt });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to enhance prompt" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
