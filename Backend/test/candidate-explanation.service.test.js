import test from "node:test";
import assert from "node:assert/strict";
import { createCandidateExplanationService } from "../src/services/candidate-explanation.service.js";

const context = {
  candidate: { profileId: "candidate-1", city: "Chennai" },
  score: 82.5,
  matchQuality: "STRONG",
  scoreBreakdown: { locationRelocation: { score: 90, weight: 20 } },
  preferenceComparisons: ["Preference matches: customer location preference."],
  negativeComparisons: [],
  missingInformation: ["candidate income"],
};

test("returns validated structured explanation from the model", async () => {
  const service = createCandidateExplanationService({
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify({
            summary: "The recommendation is supported by location compatibility.",
            compatibilityPoints: ["The locations align."],
            discussionPoints: ["Discuss income expectations."],
            missingInformation: ["candidate income"],
          }) } }],
        }),
      },
    },
  });

  const result = await service(context);
  assert.deepEqual(result, {
    available: true,
    explanation: {
      summary: "The recommendation is supported by location compatibility.",
      compatibilityPoints: ["The locations align."],
      discussionPoints: ["Discuss income expectations."],
      missingInformation: ["candidate income"],
    },
  });
});

test("returns a scoring-context fallback for malformed model output", async () => {
  const service = createCandidateExplanationService({
    chat: { completions: { create: async () => ({ choices: [{ message: { content: "not json" } }] }) } },
  });

  assert.deepEqual(await service(context), {
    available: true,
    source: "FALLBACK",
    explanation: {
      summary: "This is a strong match with a backend compatibility score of 82.5. Review the scoring factors and missing information before sharing it with the customer.",
      compatibilityPoints: ["Preference matches: customer location preference."],
      discussionPoints: [],
      missingInformation: ["candidate income"],
    },
  });
});

test("accepts JSON wrapped in a markdown fence or response text", async () => {
  const explanation = {
    summary: "The recommendation has moderate compatibility.",
    compatibilityPoints: [],
    discussionPoints: ["Discuss the missing details."],
    missingInformation: ["income"],
  };
  const service = createCandidateExplanationService({
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: `Here is the result:\n\n\`\`\`json\n${JSON.stringify(explanation)}\n\`\`\`` } }],
        }),
      },
    },
  });

  assert.deepEqual(await service(context), { available: true, explanation });
});

test("accepts text content returned as a provider object", async () => {
  const explanation = {
    summary: "The recommendation has moderate compatibility.",
    compatibilityPoints: [],
    discussionPoints: [],
    missingInformation: ["income"],
  };
  const service = createCandidateExplanationService({
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: { text: JSON.stringify(explanation) } } }],
        }),
      },
    },
  });

  assert.deepEqual(await service(context), { available: true, explanation });
});

test("removes empty items from model response lists", async () => {
  const service = createCandidateExplanationService({
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify({
            summary: "The score is moderate.",
            compatibilityPoints: ["Confirmed alignment", ""],
            discussionPoints: ["", "Discuss expectations"],
            missingInformation: [""],
          }) } }],
        }),
      },
    },
  });

  const result = await service(context);
  assert.deepEqual(result.explanation, {
    summary: "The score is moderate.",
    compatibilityPoints: ["Confirmed alignment"],
    discussionPoints: ["Discuss expectations"],
    missingInformation: [],
  });
});

test("normalizes structured evidence items from the provider", async () => {
  const service = createCandidateExplanationService({
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify({
            summary: "The score is moderate.",
            compatibilityPoints: [{ evidence: "Family goals score 75/100", reason: "Strong alignment" }],
            discussionPoints: [{ topic: "Religion", question: "Discuss expectations" }],
            missingInformation: [],
          }) } }],
        }),
      },
    },
  });

  const result = await service(context);
  assert.deepEqual(result.explanation, {
    summary: "The score is moderate.",
    compatibilityPoints: ["Family goals score 75/100: Strong alignment"],
    discussionPoints: ["Religion: Discuss expectations"],
    missingInformation: [],
  });
});

test("returns unavailable for missing key and provider errors", async () => {
  const missingKeyService = createCandidateExplanationService();
  assert.deepEqual(await missingKeyService(context), { available: false, reason: "MISSING_API_KEY" });

  const providerErrorService = createCandidateExplanationService({
    chat: { completions: { create: async () => { throw { status: 429 }; } } },
  });
  assert.deepEqual(await providerErrorService(context), { available: false, reason: "RATE_LIMITED" });
});

test("logs provider diagnostics without secrets or profile context", async () => {
  const originalConsoleError = console.error;
  const logArguments = [];
  console.error = (...argumentsToLog) => logArguments.push(argumentsToLog);

  try {
    const providerErrorService = createCandidateExplanationService({
      chat: {
        completions: {
          create: async () => {
            throw {
              name: "BadRequestError",
              message: "The model does not support JSON mode",
              status: 400,
              code: "response_format_not_supported",
              response: {
                status: 400,
                data: { error: { code: "response_format_not_supported", message: "Unsupported format" } },
                headers: { authorization: "Bearer sk-test-secret" },
              },
            };
          },
        },
      },
    });

    const result = await providerErrorService({
      ...context,
      candidate: { profileId: "private-profile-id", city: "Private City" },
    });

    assert.deepEqual(result, { available: false, reason: "PROVIDER_ERROR" });
    assert.equal(logArguments.length, 1);
    const diagnosticText = JSON.stringify(logArguments[0]);
    assert.match(diagnosticText, /BadRequestError/);
    assert.match(diagnosticText, /response_format_not_supported/);
    assert.match(diagnosticText, /400/);
    assert.doesNotMatch(diagnosticText, /sk-test-secret|private-profile-id|Private City/);
    assert.doesNotMatch(diagnosticText, /authorization/i);
  } finally {
    console.error = originalConsoleError;
  }
});

test("classifies the OpenAI SDK timeout message as a timeout", async () => {
  const timeoutService = createCandidateExplanationService({
    chat: { completions: { create: async () => { throw new Error("Request timed out."); } } },
  });

  assert.deepEqual(await timeoutService(context), { available: false, reason: "TIMEOUT" });
});
