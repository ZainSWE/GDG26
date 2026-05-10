// Memory Palace backend skeleton (single-file, hackathon-friendly)

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const OpenAI = require("openai");
const { z } = require("zod");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

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

  // TODO:
  // 1) send notes to OpenAI
  // 2) parse AI JSON response
  // 3) validate with graphSchema
  // 4) save to MongoDB
  // 5) return graph JSON

  return res.status(501).json({
    message: "Skeleton ready. /generate implementation is intentionally pending.",
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
