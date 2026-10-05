import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { InferenceClient } from "@huggingface/inference";
import { z } from "zod";

const hfToken = process.env.HF_TOKEN;
const apiAccessKey = process.env.API_ACCESS_KEY;
const model = process.env.HF_MODEL ?? "openai/gpt-oss-120b:fastest";
const port = Number(process.env.PORT ?? 3000);

if (!hfToken) {
  throw new Error("HF_TOKEN is required. Add it to your environment or .env file.");
}

if (!apiAccessKey) {
  throw new Error("API_ACCESS_KEY is required. Add it to your environment or .env file.");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const client = new InferenceClient(hfToken);
const app = express();

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().trim().min(1).max(20_000),
      }),
    )
    .min(1)
    .max(50),
  max_tokens: z.number().int().positive().max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api", (request: Request, response: Response, next: NextFunction) => {
  const authorization = request.header("authorization");
  const suppliedKey = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (suppliedKey !== apiAccessKey) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
});

app.post("/api/chat", async (request: Request, response: Response) => {
  const parsed = chatRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const completion = await client.chatCompletion({
      model,
      messages: parsed.data.messages,
      max_tokens: parsed.data.max_tokens,
      temperature: parsed.data.temperature,
    });

    response.json({
      id: completion.id,
      model: completion.model,
      message: completion.choices[0]?.message,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("Inference request failed:", error);
    response.status(502).json({ error: "Inference provider request failed" });
  }
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: "Request body must be valid JSON" });
    return;
  }

  console.error("Request failed:", error);
  response.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Hugging Face inference API listening on http://localhost:${port}`);
  console.log(`Model: ${model}`);
});