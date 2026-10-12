import test from "node:test";
import assert from "node:assert/strict";
import {
  getMatchQuality,
  getQualifyingSuggestions,
  isEligibleCandidate,
  scoreCandidate,
} from "../src/controllers/match.controller.js";

const baseCustomer = {
  _id: "customer-id",
  gender: "Male",
  dateOfBirth: "1990-01-01",
  city: "Chennai",
  country: "India",
  income: 1000000,
  height: 175,
  maritalStatus: "Never married",
  religion: "Buddhist",
  caste: "Any",
  degree: "Bachelor's degree",
  designation: "Engineer",
  wantKids: "Yes",
  openToRelocate: "No",
  openToPets: "Yes",
  foodHabits: "Vegetarian",
  smokingHabits: "No",
  alcoholHabits: "No",
  partnerPreferences: {},
};

const baseCandidate = {
  _id: "candidate-id",
  profileId: "candidate-1",
  gender: "Female",
  dateOfBirth: "1992-01-01",
  city: "Chennai",
  country: "India",
  income: 800000,
  height: 165,
  maritalStatus: "Never married",
  religion: "Buddhist",
  caste: "Any",
  degree: "Bachelor's degree",
  designation: "Engineer",
  wantKids: "Yes",
  openToRelocate: "No",
  openToPets: "Yes",
  foodHabits: "Vegetarian",
  smokingHabits: "No",
  alcoholHabits: "No",
  partnerPreferences: {},
};

test("classifies recommendation thresholds at the boundaries", () => {
  assert.equal(getMatchQuality(39), null);
  assert.equal(getMatchQuality(40), "POTENTIAL");
  assert.equal(getMatchQuality(64), "POTENTIAL");
  assert.equal(getMatchQuality(65), "STRONG");
  assert.equal(getMatchQuality(100), "STRONG");
});

test("filters self, invalid-gender, and duplicate candidates", () => {
  const customer = { _id: "customer-id" };
  const seenProfileIds = new Set(["duplicate"]);

  assert.equal(isEligibleCandidate(customer, { _id: "customer-id", profileId: "other", gender: "Male" }, "male", seenProfileIds), false);
  assert.equal(isEligibleCandidate(customer, { _id: "candidate-id", profileId: "female", gender: "Female" }, "male", seenProfileIds), false);
  assert.equal(isEligibleCandidate(customer, { _id: "candidate-id", profileId: "duplicate", gender: "Male" }, "male", seenProfileIds), false);
  assert.equal(isEligibleCandidate(customer, { _id: "candidate-id", profileId: "valid", gender: "Male" }, "male", seenProfileIds), true);
});

test("returns empty results when no candidates qualify and applies the limit", () => {
  assert.deepEqual(getQualifyingSuggestions([{ profileId: "low", score: 39, matchQuality: null }], 10), []);
  assert.deepEqual(
    getQualifyingSuggestions([
      { profileId: "lower", score: 60, matchQuality: "POTENTIAL" },
      { profileId: "higher", score: 75, matchQuality: "STRONG" },
    ], 1),
    [{ profileId: "higher", score: 75, matchQuality: "STRONG" }],
  );
});

test("treats all ANY preferences as neutral without producing a perfect score", () => {
  const candidate = {
    ...baseCandidate,
    city: "Mumbai",
    religion: "Hindu",
    partnerPreferences: {
      locations: ["ANY"],
      education: [],
      professions: ["ANY"],
      maritalStatuses: ["ANY"],
      religions: ["ANY"],
      castes: ["ANY"],
      wantKids: "ANY",
      openToPets: "ANY",
      lifestyle: [],
    },
  };
  const result = scoreCandidate({ ...baseCustomer, partnerPreferences: { locations: ["ANY"] } }, candidate);

  assert.ok(result.totalScore < 100);
  assert.equal(result.explanations.some((explanation) => explanation.includes("Preference differs")), false);
  assert.equal(result.negativeExplanations.some((explanation) => explanation.includes("preference")), false);
});

test("scores compatible and incompatible explicit preferences distinctly", () => {
  const preferences = { minAge: 30, maxAge: 35, education: ["Bachelor's degree"], professions: ["Engineer"] };
  const compatible = scoreCandidate({ ...baseCustomer, partnerPreferences: preferences }, baseCandidate);
  const incompatible = scoreCandidate(
    { ...baseCustomer, partnerPreferences: preferences },
    { ...baseCandidate, dateOfBirth: "2000-01-01", degree: "Doctorate", designation: "Artist" },
  );

  assert.ok(compatible.totalScore > incompatible.totalScore);
  assert.ok(compatible.explanations.some((explanation) => explanation.includes("Preference matches")));
  assert.ok(incompatible.explanations.some((explanation) => explanation.includes("Preference differs")));
});

test("reports missing data without treating it as a mismatch or perfect score", () => {
  const result = scoreCandidate(
    { ...baseCustomer, partnerPreferences: { minAge: 25, maxAge: 35, professions: ["Engineer"] } },
    { ...baseCandidate, dateOfBirth: undefined, designation: undefined, city: undefined, country: undefined },
  );

  assert.ok(result.missingInformation.includes("age"));
  assert.ok(result.missingInformation.includes("profession"));
  assert.ok(result.missingInformation.includes("location"));
  assert.equal(result.explanations.some((explanation) => explanation.includes("Preference differs")), false);
  assert.ok(result.totalScore < 100);
});