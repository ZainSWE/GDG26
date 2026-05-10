// Memory Palace backend skeleton (single-file, hackathon-friendly)

require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 4000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const savedResponsePath = path.join(__dirname, "last-gemini-response.json");

app.use(express.json());
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("*", (_req, res) => {
  res.sendStatus(204);
});

async function saveGeminiResponse(payload) {
  await fs.writeFile(savedResponsePath, JSON.stringify(payload, null, 2), "utf8");
}

async function generateWithGemini(notes) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemPrompt = `You are an AI system that converts educational notes into a structured knowledge graph for a visual memory palace study tool.

Your task is to analyze the provided notes and transform them into a connected graph-based JSON structure optimized for studying, memorization, and concept navigation.

INSTRUCTIONS:

1. Read the entire notes document carefully.

2. Create a concise but comprehensive understanding of the material:

* Keep explanations short and information-dense.
* Avoid redundancy and repeated ideas.
* Preserve all important concepts, definitions, methods, processes, formulas, events, relationships, and key details necessary for studying.
* Generalize across any academic subject (science, math, history, engineering, programming, biology, literature, etc.).

3. Organize the material hierarchically:

* Create ONE main/root node representing the overall course, subject, or document title.
* Create unit/category/topic nodes representing major sections of the material.
* Create smaller concept/detail nodes representing:

  * concepts
  * definitions
  * important ideas
  * methods
  * processes
  * examples
  * relationships
  * important facts
  * formulas
  * events
  * terminology
  * techniques
  * principles
  * comparisons
  * or other important studyable information.

4. Node size guidelines:

* Each node should contain ONE focused piece of information.
* Keep node content short enough to quickly read and memorize.
* Do not create overly large paragraphs.
* Split large ideas into multiple connected nodes when necessary.

5. Relationships:

* Connect nodes that are meaningfully related.
* Connections may represent:

  * prerequisite knowledge
  * conceptual similarity
  * dependency
  * comparison
  * shared topic
  * cause/effect
  * sequence
  * mathematical relation
  * historical relation
  * or any important educational connection.

6. Graph hierarchy rules:

* The root node connects ONLY to unit/category nodes.
* Unit/category nodes connect to concepts inside their section.
* Lower-level concept nodes may connect to ANY other related nodes across the graph.

7. Importance levels:
   Use an integer from 1-5:

* 5 = root/main course node only
* 4 = major unit/category/topic nodes
* 3 = highly important concepts or core material
* 2 = moderately important supporting material
* 1 = minor details, examples, or supplementary information

8. Output Requirements:
   Return ONLY valid JSON.
   Do NOT include explanations, markdown, comments, or extra text.

Each node MUST contain ONLY these 5 fields:

* "id"
* "title"
* "content"
* "connected"
* "importance"

FIELD RULES:

* "id" must be unique
* "title" should be concise
* "content" should contain a short explanation or summary
* "connected" must be an array of connected node ids
* "importance" must be an integer from 1-5

JSON FORMAT:

{
"nodes": [
{
"id": "1",
"title": "Example Title",
"content": "Example content.",
"connected": ["2", "5"],
"importance": 3
}
]
}

Now analyze the provided notes and generate the complete connected knowledge graph JSON.`;

  const prompt = [
    systemPrompt,
    "User input:",
    notes,
  ].join("\n\n");

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  console.log("Gemini response generated:", responseText);

  return {
    model: GEMINI_MODEL,
    prompt,
    responseText,
    createdAt: new Date().toISOString(),
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "memory-palace-backend-skeleton" });
});

app.post("/generate", async (req, res) => {
  try {
    const { notes } = req.body || {};

    if (!notes || typeof notes !== "string") {
      return res.status(400).json({ message: "notes is required and must be a string" });
    }

    const geminiResult = await generateWithGemini(notes);
    await saveGeminiResponse({
      notes,
      ...geminiResult,
    });

    return res.status(200).json({
      success: true,
      message: "Gemini response generated and saved",
      data: geminiResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Gemini request failed",
    });
  }
});

// Basic error handler placeholder
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Memory Palace skeleton server running on port ${PORT}`);
});
