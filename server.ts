import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Initialize GoogleGenAI on the server with recommended User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini Chat & Intelligence endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { contents, systemInstruction, model } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server. Please set your API key in the Settings > Secrets panel."
        });
      }

      const modelToUse = model || "gemini-3.5-flash";

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: {
          systemInstruction: systemInstruction || "You are Kazi, the premium photography studio virtual coordinator and operations advisor for Asmaul Production. You speak in a highly professional, elegant, and helpful tone fitting a luxurious black & gold photography house.",
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API server-side error:", error);
      res.status(500).json({ error: error.message || "An error occurred with the Gemini API." });
    }
  });

  // Setup Vite middleware for development, or static file serving for production
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
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
