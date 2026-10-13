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

test("returns unavailable for malformed model output", async () => {
  const service = createCandidateExplanationService({
    chat: { completions: { create: async () => ({ choices: [{ message: { content: "not json" } }] }) } },
  });

  assert.deepEqual(await service(context), { available: false, reason: "MALFORMED_RESPONSE" });
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