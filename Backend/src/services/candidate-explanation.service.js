import OpenAI from "openai";

const model = "openai/gpt-oss-20b";
const requestTimeoutMs = 60000;
const maxOutputTokens = 1600;

const openAIClient = process.env.NVIDIA_API_KEY
  ? new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
      timeout: requestTimeoutMs,
      maxRetries: 0,
    })
  : null;

const unavailable = (reason) => ({
  available: false,
  reason,
});

const normalizeStringArray = (value, maximumLength) => {
  if (
    !Array.isArray(value) ||
    value.length > maximumLength
  ) {
    return null;
  }

  const normalized = value.map((item) => {
    if (typeof item === "string") {
      return item.trim();
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
      const text = Object.values(item)
        .filter((part) => typeof part === "string")
        .map((part) => part.trim())
        .filter(Boolean)
        .join(": ");
      return text || null;
    }

    return null;
  });

  if (normalized.some((item) => item === null || item.length > 500)) {
    return null;
  }

  return normalized.filter(Boolean);
};

const getTextContent = (content) => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === "string" ? part : part?.text))
      .filter((part) => typeof part === "string")
      .join("");
    return text || null;
  }

  if (content && typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }

    if (typeof content.content === "string") {
      return content.content;
    }
  }

  return null;
};

const getJsonCandidates = (content) => {
  if (typeof content !== "string") {
    return [];
  }

  const trimmedContent = content.trim();
  const unfencedContent = trimmedContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const firstBrace = unfencedContent.indexOf("{");
  const lastBrace = unfencedContent.lastIndexOf("}");
  const embeddedJson = firstBrace >= 0 && lastBrace > firstBrace
    ? unfencedContent.slice(firstBrace, lastBrace + 1)
    : null;

  return [...new Set([unfencedContent, embeddedJson].filter(Boolean))];
};

const parseExplanation = (content) => {
  for (const jsonCandidate of getJsonCandidates(content)) {
    let parsed;
    try {
      parsed = JSON.parse(jsonCandidate);
    } catch {
      continue;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      continue;
    }

    const compatibilityPoints = normalizeStringArray(parsed.compatibilityPoints, 3);
    const discussionPoints = normalizeStringArray(parsed.discussionPoints, 3);
    const missingInformation = normalizeStringArray(parsed.missingInformation, 10);

    if (
      typeof parsed.summary !== "string" ||
      !parsed.summary.trim() ||
      !compatibilityPoints ||
      !discussionPoints ||
      !missingInformation
    ) {
      continue;
    }

    return {
      summary: parsed.summary.trim(),
      compatibilityPoints,
      discussionPoints,
      missingInformation,
    };
  }

  return null;
};

const sentenceCase = (value) =>
  String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());

const getFallbackCompatibilityPoints = (context) => {
  const explicitPoints = Array.isArray(context.preferenceComparisons)
    ? context.preferenceComparisons.filter((item) => typeof item === "string" && item.trim()).slice(0, 3)
    : [];

  if (explicitPoints.length) {
    return explicitPoints;
  }

  return Object.entries(context.scoreBreakdown || {})
    .filter(([, detail]) => Number(detail?.score) > 50)
    .sort(([, left], [, right]) => Number(right.score) - Number(left.score))
    .slice(0, 3)
    .map(([factor, detail]) => `${sentenceCase(factor)} is a positive factor with a score of ${detail.score}/100.`);
};

const getFallbackDiscussionPoints = (context) => {
  const explicitPoints = Array.isArray(context.negativeComparisons)
    ? context.negativeComparisons.filter((item) => typeof item === "string" && item.trim()).slice(0, 3)
    : [];

  if (explicitPoints.length) {
    return explicitPoints;
  }

  if (Number(context.score) < 60) {
    return ["Review the moderate compatibility score with the customer before introducing this match."];
  }

  return [];
};

const buildFallbackExplanation = (context) => ({
  summary: `This is a ${String(context.matchQuality || "recommended").toLowerCase()} match with a backend compatibility score of ${context.score}. Review the scoring factors and missing information before sharing it with the customer.`,
  compatibilityPoints: getFallbackCompatibilityPoints(context),
  discussionPoints: getFallbackDiscussionPoints(context),
  missingInformation: Array.isArray(context.missingInformation)
    ? context.missingInformation.filter((item) => typeof item === "string" && item.trim()).slice(0, 10)
    : [],
});

const SYSTEM_PROMPT = `
You are an objective assistant for professional human matchmakers.
Explain an existing candidate recommendation using ONLY the supplied
profile data, stated preferences, compatibility scores, and engine explanations.

Rules:
- The matching engine is the sole authority for scores, eligibility,
  match quality, and compatibility calculations. Never recalculate or
  override them.
- Never invent facts, preferences, motivations, or personality traits.
- Distinguish confirmed alignment, confirmed differences, and unknowns.
  Missing data or unspecified preferences are not mismatches.
- Call a preference a mismatch only when supplied evidence explicitly
  conflicts with that preference.
- Prioritize meaningful alignments and important trade-offs. Be concise.
- Treat sensitive attributes neutrally and only against explicit preferences.
- Be honest about low or moderate scores. Never promise relationship success.
- The human matchmaker makes the final decision.

Return valid JSON only, with exactly these keys:
{
  "summary": "1-3 concise sentences",
  "compatibilityPoints": [],
  "discussionPoints": [],
  "missingInformation": []
}

Constraints:
- compatibilityPoints: 0-3 evidence-supported alignments.
- discussionPoints: 0-3 confirmed differences or useful questions.
- missingInformation: 0-10 genuinely unknown relevant facts or preferences.
- Keep every item concise and traceable to supplied evidence.
- Use empty arrays when evidence is insufficient.
- No Markdown or text outside the JSON object.
`;

const createCandidateExplanationService = (client = openAIClient) => {
  return async (context) => {
    if (!client) {
      return unavailable("MISSING_API_KEY");
    }

    try {
      const response = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: JSON.stringify(context),
            },
          ],
          temperature: 0.2,
          top_p: 1,
          max_tokens: maxOutputTokens,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          stream: false,
        },
        {
          timeout: requestTimeoutMs,
          maxRetries: 0,
        },
      );

      const choice = response.choices?.[0];
      const rawContent = choice?.message?.content;
      const content = getTextContent(rawContent);
      const explanation = parseExplanation(content);

      if (!explanation) {
        return {
          available: true,
          explanation: buildFallbackExplanation(context),
          source: "FALLBACK",
        };
      }

      return {
        available: true,
        explanation,
      };
    } catch (error) {
      // Avoid logging API keys, full prompts, or profile data.
      console.error("[candidate-explanation] NVIDIA request failed", {
        name: error?.name,
        status: error?.status,
        code: error?.code,
        message: String(error?.message ?? "")
          .replace(/nvapi-[A-Za-z0-9_-]+/g, "[REDACTED_API_KEY]")
          .slice(0, 300),
      });

      if (error?.status === 429) {
        return unavailable("RATE_LIMITED");
      }

      if (
        error?.name === "APIConnectionTimeoutError" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "ECONNABORTED" ||
        error?.message === "Request timed out."
      ) {
        return unavailable("TIMEOUT");
      }

      return unavailable("PROVIDER_ERROR");
    }
  };
};

const generateCandidateExplanation = createCandidateExplanationService();

export {
  createCandidateExplanationService,
  generateCandidateExplanation,
  model,
};
