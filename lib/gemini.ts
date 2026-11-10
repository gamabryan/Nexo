import { GoogleGenAI, Type } from "@google/genai";
import { parseMoney, roundMoney, sumItems } from "@/lib/money";
import type { GeneratedProposal } from "@/lib/types";

/** Único modelo fixo: rápido e estável nesta chave (testado). */
const MODEL = "gemini-3.1-flash-lite";
const MODEL_TIMEOUT_MS = 20_000;
const RETRY_DELAYS_MS = [600, 1500] as const;

const SYSTEM_PROMPT = `Você extrai orçamentos de relatos informais de prestadores de serviço brasileiros (marceneiros, pintores, eletricistas, encanadores, serralheiros e similares).

Responda somente com um objeto JSON válido, sem markdown e sem texto extra, neste formato exato:
{
  "clientName": string,
  "items": [{ "name": string, "price": number }],
  "total": number,
  "estimatedDays": number,
  "materialsNeeded": string
}

Regras obrigatórias:
1. clientName: nome da pessoa ou empresa cliente citado no relato. Se não houver nome, use "Cliente".
2. items: cada serviço, material ou mão de obra com preço vira um item separado. name é curto e profissional, em português. price é número em reais, sem símbolo e sem separador de milhar.
3. Quando o prestador informar valores, use exatamente esses valores. "2 mil" = 2000. "1.500" = 1500. Não aumente, não dê desconto e não crie cobranças que não foram ditas.
4. Se material e mão de obra tiverem valores distintos, crie dois itens.
5. Se nenhum valor for informado, estime preços de mercado no Brasil de forma conservadora e indique no name que é estimativa, por exemplo "Pintura da sala (estimativa)".
6. total deve ser a soma aritmética exata de items[].price.
7. estimatedDays: inteiro maior ou igual a 1. Use o prazo dito pelo prestador. Se não houver prazo, estime o mínimo realista para o serviço.
8. materialsNeeded: frase curta com os materiais citados. Se não houver, use "A definir com o cliente".
9. Não inclua campos além dos pedidos. Não use null.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    clientName: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.NUMBER },
        },
        required: ["name", "price"],
      },
    },
    total: { type: Type.NUMBER },
    estimatedDays: { type: Type.INTEGER },
    materialsNeeded: { type: Type.STRING },
  },
  required: ["clientName", "items", "total", "estimatedDays", "materialsNeeded"],
} as const;

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export async function generateProposalFromText(text: string): Promise<GeneratedProposal> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError(
      "Configure a GEMINI_API_KEY no arquivo .env e reinicie o servidor.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt += 1) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: MODEL,
          contents: `Relato do prestador:\n"""${text}"""\n\nExtraia o orçamento em JSON.`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
        MODEL_TIMEOUT_MS,
      );

      const raw = response.text?.trim() ?? "";
      if (!raw) {
        throw new Error(
          "O Gemini não retornou um orçamento. Descreva o serviço, os valores e, se souber, o nome do cliente.",
        );
      }

      return normalizeGeneratedProposal(raw);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      console.error("gemini failed", MODEL, `attempt=${attempt + 1}`, rawMessage.slice(0, 400));
      lastError = error;

      if (!isRetryableModelError(error)) {
        if (error instanceof SyntaxError || (error instanceof Error && error.message === "Nenhum item válido.")) {
          throw new Error(
            "A IA não conseguiu estruturar esse relato. Inclua o que será feito, o prazo e os valores de material e mão de obra.",
          );
        }
        if (error instanceof Error && error.message.startsWith("O Gemini não retornou")) {
          throw error;
        }
        throw new Error(friendlyGeminiError(error));
      }

      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  console.warn("gemini unavailable, using local draft", String(lastError).slice(0, 200));
  return heuristicProposalFromText(text);
}

const TRANSCRIBE_PROMPT =
  "Transcreva este áudio em português do Brasil. Devolva somente o texto falado, sem aspas, sem comentários e sem marcação de tempo. Se não houver fala compreensível, responda exatamente (sem fala).";

const EMPTY_TRANSCRIPT = "Não ouvi fala nessa gravação. Tente de novo, mais perto do microfone.";

export async function transcribeAudio(audioBase64: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError(
      "Configure a GEMINI_API_KEY no arquivo .env e reinicie o servidor.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  let sawEmptyTranscript = false;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt += 1) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { text: TRANSCRIBE_PROMPT },
                { inlineData: { mimeType, data: audioBase64 } },
              ],
            },
          ],
          config: { temperature: 0 },
        }),
        MODEL_TIMEOUT_MS,
      );

      const text = cleanupTranscript(response.text ?? "");
      if (!text) {
        sawEmptyTranscript = true;
        throw new Error(EMPTY_TRANSCRIPT);
      }
      return text;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error("gemini transcribe failed", MODEL, `attempt=${attempt + 1}`, message.slice(0, 400));

      if (message === EMPTY_TRANSCRIPT) {
        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw error;
      }

      if (/mime type|unsupported|invalid_argument|invalid argument/i.test(message) && !isUnavailableModel(error)) {
        throw new Error("O Gemini não aceitou esse formato de áudio. Tente de novo ou digite o relato.");
      }

      if (!isRetryableModelError(error)) {
        if (error instanceof GeminiConfigError) throw error;
        throw new Error(
          friendlyGeminiError(
            error,
            "Não consegui transcrever o áudio. Tente de novo ou digite o relato.",
          ),
        );
      }

      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  if (sawEmptyTranscript) throw new Error(EMPTY_TRANSCRIPT);
  throw new Error(
    friendlyGeminiError(lastError, "Não consegui transcrever o áudio. Tente de novo ou digite o relato."),
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout após ${ms}ms no modelo ${MODEL}.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function cleanupTranscript(raw: string) {
  const text = raw.trim().replace(/^```[\w]*\n?/, "").replace(/```$/, "").trim();
  if (!text || text === "(sem fala)" || /^(\(sem fala\)|sem fala|no speech|\[silence\])\.?$/i.test(text)) {
    return "";
  }
  return text.replace(/\s+/g, " ");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableModelError(error: unknown) {
  return isUnavailableModel(error) || isCapacityError(error) || isTimeoutError(error);
}

function isTimeoutError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|Timeout|aborted|AbortError/i.test(message);
}

function isCapacityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /503|UNAVAILABLE|high demand|try again later|overloaded|resource exhausted|429|quota|rate/i.test(
    message,
  );
}

function isUnavailableModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /no longer available|not found|NOT_FOUND|unknown model|is not supported for generateContent/i.test(
    message,
  );
}

export function friendlyGeminiError(
  error: unknown,
  fallback = "Não foi possível montar o orçamento agora. Tente de novo em alguns segundos.",
) {
  const message = error instanceof Error ? error.message : "";

  if (/api key|API_KEY|permission denied|unauth|401|403/i.test(message)) {
    return "A chave da API do Gemini é inválida. Cole uma GEMINI_API_KEY válida no arquivo .env e reinicie o servidor.";
  }

  if (/quota|rate|429|resource exhausted/i.test(message)) {
    return "O Gemini atingiu o limite de uso agora. Espere um instante e tente de novo.";
  }

  if (/503|UNAVAILABLE|high demand|try again later|overloaded|timeout|Timeout/i.test(message)) {
    return "O Gemini está sobrecarregado agora. Espere um instante e tente de novo.";
  }

  if (/no longer available|NOT_FOUND|unknown model|is not found|is not supported for generateContent/i.test(message)) {
    return "Nenhum modelo Gemini disponível para esta chave. Confira a GEMINI_API_KEY no Google AI Studio.";
  }

  if (error instanceof GeminiConfigError) return error.message;

  return fallback;
}

/** Rascunho local quando a API do Gemini está indisponível. O prestador revisa na etapa seguinte. */
export function heuristicProposalFromText(text: string): GeneratedProposal {
  const normalized = text.replace(/\s+/g, " ").trim();

  const clientMatch =
    normalized.match(/\b(?:para|cliente)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]*(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ]*){0,2})/i) ||
    normalized.match(/\b(?:sr\.?|sra\.?|senhor|senhora)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ]*)/i);
  const clientName = clientMatch?.[1]?.trim() || "Cliente";

  const daysMatch = normalized.match(/\b(\d{1,3})\s*dias?\b/i);
  const estimatedDays = daysMatch ? Math.max(1, Number(daysMatch[1])) : 1;

  const amounts: number[] = [];
  const amountPattern =
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|r\$)?|\b(\d{1,3})\s*mil\b/gi;
  let match: RegExpExecArray | null;
  while ((match = amountPattern.exec(normalized)) !== null) {
    if (match[2]) {
      amounts.push(Number(match[2]) * 1000);
      continue;
    }
    const value = parseMoney(match[1]);
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }

  const uniqueAmounts = Array.from(new Set(amounts)).slice(0, 6);
  const serviceHint =
    normalized
      .split(/[.,;]/)
      .map((part) => part.trim())
      .find((part) => part.length >= 8 && !/^\d/.test(part)) || "Serviço descrito";

  const items =
    uniqueAmounts.length > 0
      ? uniqueAmounts.map((price, index) => ({
          name:
            uniqueAmounts.length === 1
              ? `${serviceHint.slice(0, 80)} (revisar)`
              : `Item ${index + 1} (revisar)`,
          price,
          cost: 0,
          quantity: 1,
        }))
      : [
          {
            name: `${serviceHint.slice(0, 80)} (revisar valor)`,
            price: 0,
            cost: 0,
            quantity: 1,
          },
        ];

  return {
    clientName,
    items,
    total: sumItems(items),
    estimatedDays,
    materialsNeeded: "A definir com o cliente — rascunho local (Gemini indisponível)",
  };
}

function normalizeGeneratedProposal(raw: string): GeneratedProposal {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const source = Array.isArray(parsed.items) ? parsed.items : [];

  const items = source.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const price = parseMoney(record.price);
    if (!name || !Number.isFinite(price) || price < 0) return [];
    return [{ name, price, cost: 0, quantity: 1 }];
  });

  if (items.length === 0) {
    throw new Error("Nenhum item válido.");
  }

  const clientName =
    typeof parsed.clientName === "string" && parsed.clientName.trim()
      ? parsed.clientName.trim()
      : "Cliente";

  const days = Number(parsed.estimatedDays);
  const estimatedDays = Number.isFinite(days) ? Math.max(1, Math.round(days)) : 1;

  const materialsNeeded =
    typeof parsed.materialsNeeded === "string" && parsed.materialsNeeded.trim()
      ? parsed.materialsNeeded.trim()
      : "A definir com o cliente";

  return {
    clientName,
    items,
    total: sumItems(items) || roundMoney(parseMoney(parsed.total) || 0),
    estimatedDays,
    materialsNeeded,
  };
}
