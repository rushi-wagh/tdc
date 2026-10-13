
import OpenAI from "openai";

const model = "openrouter/free";
const requestTimeoutMs = 100000;

const openAIClient = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    })
  : null;

const unavailable = (reason) => ({
  available: false,
  reason,
});

const redactForLog = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  const serialized =
    typeof value === "string" ? value : JSON.stringify(value);

  return serialized
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .slice(0, 1000);
};

const getProviderErrorDiagnostics = (error) => {
  const responseData = error?.response?.data;
  const providerError = responseData?.error || error?.error;

  return {
    name: error?.name,
    message: redactForLog(error?.message),
    httpStatus: error?.status ?? error?.response?.status,
    providerErrorCode: error?.code ?? providerError?.code,
    responseStatus: error?.response?.status,
    responseBody: redactForLog(
      providerError ??
        (typeof responseData === "string" ? responseData : undefined)
    ),
  };
};

const isStringArray = (value, maximumLength) =>
  Array.isArray(value) &&
  value.length <= maximumLength &&
  value.every(
    (item) => typeof item === "string" && item.trim().length > 0
  );

const parseExplanation = (content) => {
  if (typeof content !== "string") {
    return null;
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.summary !== "string" ||
    !parsed.summary.trim() ||
    !isStringArray(parsed.compatibilityPoints, 3) ||
    !isStringArray(parsed.discussionPoints, 3) ||
    !isStringArray(parsed.missingInformation, 10)
  ) {
    return null;
  }

  return {
    summary: parsed.summary.trim(),
    compatibilityPoints: parsed.compatibilityPoints.map((item) =>
      item.trim()
    ),
    discussionPoints: parsed.discussionPoints.map((item) =>
      item.trim()
    ),
    missingInformation: parsed.missingInformation.map((item) =>
      item.trim()
    ),
  };
};

const createCandidateExplanationService = (
  client = openAIClient
) => async (context) => {
  if (!client) {
    return unavailable("MISSING_API_KEY");
  }

  try {
    const response = await client.chat.completions.create(
      {
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an expert matchmaking assistant supporting professional human matchmakers. Explain an existing candidate recommendation clearly, objectively, and concisely using only the supplied profile data, preferences, compatibility factor scores, and matching-engine explanations.

CORE RULES:
1. The matching engine is the single source of truth for the overall score, match quality, eligibility, and compatibility calculations. Never recalculate, modify, or override them.
2. Use only facts explicitly present in the supplied context. Never invent profile attributes, preferences, motivations, personality traits, or relationship outcomes.
3. Distinguish confirmed compatibility, confirmed differences, and unknown information. Missing data or unspecified preferences must never be described as a mismatch.
4. A preference mismatch requires explicit evidence that the candidate conflicts with a stated preference. Never infer a mismatch from an absent preference.
5. Identify the most meaningful areas of alignment and the most important differences to discuss. Avoid merely listing fields or repeating the entire profile.
6. Prioritize evidence supported by the matching-engine factor scores and explicit preferences. Do not invent the importance of a factor.
7. Treat sensitive attributes, including religion and caste, neutrally and only in relation to explicitly supplied preferences. Never make value judgments based on these attributes.
8. Be candid about low or moderate scores. Do not exaggerate compatibility or promise a successful relationship.
9. Never recommend changing scores, thresholds, matching rules, or profile data. The human matchmaker makes the final decision.
10. Use professional, natural language suitable for a matchmaker's dashboard. Be specific, constructive, concise, and easy to scan.

OUTPUT REQUIREMENTS:
Return valid JSON only, with exactly these four keys:
{
  "summary": "A concise, evidence-based explanation in 1–3 sentences.",
  "compatibilityPoints": [],
  "discussionPoints": [],
  "missingInformation": []
}

FIELD GUIDANCE:
- summary: Explain the overall picture and important trade-offs. Avoid simply restating the candidate's demographics.
- compatibilityPoints: Include up to three meaningful, evidence-supported areas of alignment. Explain why each matters based on explicit preferences or supplied compatibility evidence.
- discussionPoints: Include up to three confirmed differences, unresolved trade-offs, or useful questions for the matchmaker. Phrase uncertainty as a question, not a confirmed incompatibility.
- missingInformation: Include up to ten relevant facts or preferences that are genuinely absent, unknown, or unspecified. Do not confuse a missing preference with a missing profile attribute. Do not repeat information.

VALIDATION:
- Every statement must be traceable to the supplied context.
- Return an empty array when there is insufficient evidence.
- Each list item must be concise and meaningful.
- Return no Markdown, commentary, extra keys, or text outside the JSON object.`,
          },
          {
            role: "user",
            content: JSON.stringify(context),
          },
        ],
      },
      { timeout: requestTimeoutMs }
    );

    const content = response?.choices?.[0]?.message?.content;
    const explanation = parseExplanation(content);

    return explanation
      ? { available: true, explanation }
      : unavailable("MALFORMED_RESPONSE");
  } catch (error) {
    console.error(
      "[candidate-explanation] provider request failed",
      getProviderErrorDiagnostics(error)
    );

    if (error?.status === 429) {
      return unavailable("RATE_LIMITED");
    }

    if (
      error?.name === "APIConnectionTimeoutError" ||
      error?.code === "ETIMEDOUT" ||
      error?.message === "Request timed out."
    ) {
      return unavailable("TIMEOUT");
    }

    return unavailable("PROVIDER_ERROR");
  }
};

const generateCandidateExplanation =
  createCandidateExplanationService();

export {
  createCandidateExplanationService,
  generateCandidateExplanation,
  model,
};
