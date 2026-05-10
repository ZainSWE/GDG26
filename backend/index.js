// Memory Palace backend skeleton (single-file, hackathon-friendly)

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { z } = require("zod");

const app = express();
const PORT = process.env.PORT || 4000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Zod schema — mirrors the requirements in the system prompt exactly
const nodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  connected: z.array(z.string()),
  importance: z.number().int().min(1).max(5),
});

const graphSchema = z.object({
  nodes: z.array(nodeSchema).min(1),
});

// Mongoose schema and model
const graphRecordSchema = new mongoose.Schema(
  {
    notes: { type: String, required: true },
    model: { type: String, required: true },
    responseText: { type: String, required: true },
    graph: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const GraphRecord = mongoose.model("GraphRecord", graphRecordSchema);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

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

async function saveToMongo(payload) {
  const record = new GraphRecord(payload);
  await record.save();
  return record;
}

function parseAndValidateGraph(raw) {
  let cleaned = raw.trim();

  // Extract JSON from inside a code fence if present (anywhere in the response)
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Fall back: find the outermost { ... } block
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini returned text that is not valid JSON");
  }

  const result = graphSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Graph failed Zod validation: ${result.error.message}`);
  }

  return result.data;
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

2. Create a comprehensive understanding of the material:

* Write detailed, thorough explanations that give real depth.
* Include the why, how, when, and where — not just a surface-level definition.
* Include relevant formulas, mechanisms, edge cases, or practical implications where applicable.
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

4. Node content guidelines:

* Each node should contain ONE focused piece of information.
* Write 3–6 sentences of rich, detailed content per concept node — enough that a student can understand the topic deeply from that node alone.
* Include: what the concept is, why it matters, how it works, any key formula or method, and a concrete example or application where relevant.
* For unit/root nodes: write a paragraph-level overview of the section's scope and purpose.
* Do not truncate or oversimplify. Depth is more valuable than brevity here.

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
* "content" should contain a thorough, detailed explanation (3–6 sentences minimum for concept nodes)
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

  console.log("Gemini raw response:", responseText);

  const graph = parseAndValidateGraph(responseText);
  console.log(`Graph validated — ${graph.nodes.length} nodes`);

  return {
    model: GEMINI_MODEL,
    responseText,
    graph,
    createdAt: new Date().toISOString(),
  };
}

// Multer — memory storage, PDF only, 20 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

async function parsePdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text.trim();
  if (!text) throw new Error("PDF contained no extractable text");
  return text;
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

    const record = await saveToMongo({
      notes,
      model: geminiResult.model,
      responseText: geminiResult.responseText,
      graph: geminiResult.graph,
    });

    return res.status(200).json({
      success: true,
      message: "Gemini response validated and saved to MongoDB",
      data: {
        id: record._id,
        model: geminiResult.model,
        createdAt: geminiResult.createdAt,
        graph: geminiResult.graph,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Gemini request failed",
    });
  }
});

app.post("/generate-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "A PDF file is required" });
    }

    const notes = await parsePdf(req.file.buffer);
    console.log(`PDF parsed — ${notes.length} characters extracted`);

    const geminiResult = await generateWithGemini(notes);

    const record = await saveToMongo({
      notes,
      model: geminiResult.model,
      responseText: geminiResult.responseText,
      graph: geminiResult.graph,
    });

    return res.status(200).json({
      success: true,
      message: "PDF parsed, Gemini response validated and saved to MongoDB",
      data: {
        id: record._id,
        model: geminiResult.model,
        createdAt: geminiResult.createdAt,
        graph: geminiResult.graph,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "PDF processing failed",
    });
  }
});

// Basic error handler placeholder
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Memory Palace backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
