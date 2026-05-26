import OpenAI from "openai";

const EMBEDDING_DIMENSIONS = 1536;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function createEmbedding(input: string) {
  const openai = getOpenAI();

  if (openai) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input
    });

    return response.data[0].embedding;
  }

  return deterministicEmbedding(input);
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function deterministicEmbedding(input: string) {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = input.toLowerCase().match(/[a-z0-9']+/g) ?? [];

  tokens.forEach((token, tokenIndex) => {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const index = Math.abs(hash) % EMBEDDING_DIMENSIONS;
    vector[index] += 1 + Math.min(token.length / 12, 1) + tokenIndex * 0.001;
  });

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}
