// Memory Palace backend skeleton (single-file, hackathon-friendly)

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const OpenAI = require("openai");
const { z } = require("zod");

const app = express();
const PORT = process.env.PORT || 4000;

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

// TODO: set up mongoose connection using process.env.MONGODB_URI
// mongoose.connect(process.env.MONGODB_URI)

// TODO: define graph schema with zod
const graphSchema = z.object({
  title: z.string(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

// TODO: define mongoose model for saved graph records
// const GraphModel = mongoose.model("Graph", new mongoose.Schema({ ... }))

// TODO: initialize OpenAI client when OPENAI_API_KEY is available
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "memory-palace-backend-skeleton" });
});

app.post("/generate", async (req, res) => {
  const { notes } = req.body || {};

  if (!notes || typeof notes !== "string") {
    return res.status(400).json({ message: "notes is required and must be a string" });
  }

  return res.status(200).json({
    success: true,
    message: "Input received by backend",
    received: {
      notes,
      length: notes.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// Basic error handler placeholder
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Memory Palace skeleton server running on port ${PORT}`);
});
