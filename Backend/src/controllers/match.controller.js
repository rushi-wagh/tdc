import Profile from "../models/profile.models.js";

const defaultLimit = 10;
const maxLimit = 50;
const recommendationThresholds = {
  strong: 65,
  potential: 40,
};
const weights = {
  familyGoals: 25,
  locationRelocation: 20,
  valuesLifeGoals: 20,
  professionEducation: 15,
  lifestyle: 10,
  other: 10,
};

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const normalizeGender = (value) => {
  const gender = normalize(value);
  if (["male", "m"].includes(gender)) {
    return "male";
  }

  if (["female", "f"].includes(gender)) {
    return "female";
  }

  return null;
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const getPreference = (profile) => profile.partnerPreferences || {};

const isAnyPreference = (value) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return true;
  }

  if (typeof value === "string") {
    return normalize(value) === "any";
  }

  return Array.isArray(value) && value.some((item) => normalize(item) === "any");
};

const preferenceIncludes = (values, actualValue) => {
  if (isAnyPreference(values) || actualValue === undefined || actualValue === null || actualValue === "") {
    return null;
  }

  const normalizedValues = Array.isArray(values) ? values.map(normalize) : [normalize(values)];
  return normalizedValues.includes(normalize(actualValue));
};

const rangePreferenceIncludes = (preferences, minimumKey, maximumKey, actualValue) => {
  if (actualValue === null || actualValue === undefined) {
    return null;
  }

  const minimum = preferences[minimumKey];
  const maximum = preferences[maximumKey];
  if (minimum === undefined && maximum === undefined) {
    return null;
  }

  return (minimum === undefined || actualValue >= minimum) && (maximum === undefined || actualValue <= maximum);
};

const addComparison = (comparisons, missing, label, left, right) => {
  if (left === undefined || left === null || left === "" || right === undefined || right === null || right === "") {
    missing.push(label);
    return;
  }

  if (normalize(left) === normalize(right)) {
    comparisons.push(100);
  } else {
    comparisons.push(0);
  }
};

const addPreferenceComparison = (comparisons, missing, explanations, label, preferences, key, actualValue) => {
  const result = preferenceIncludes(preferences[key], actualValue);
  if (result === null) {
    if (!isAnyPreference(preferences[key]) && (actualValue === undefined || actualValue === null || actualValue === "")) {
      missing.push(`${label} candidate value`);
    }
    return;
  }

  comparisons.push(result ? 100 : 0);
  explanations.push(`${result ? "Preference matches" : "Preference differs"}: ${label}.`);
};

const addRangePreferenceComparison = (
  comparisons,
  missing,
  explanations,
  label,
  preferences,
  minimumKey,
  maximumKey,
  actualValue,
) => {
  const result = rangePreferenceIncludes(preferences, minimumKey, maximumKey, actualValue);
  if (result === null) {
    if ((preferences[minimumKey] !== undefined || preferences[maximumKey] !== undefined) && actualValue === null) {
      missing.push(`${label} candidate value`);
    }
    return;
  }

  comparisons.push(result ? 100 : 0);
  explanations.push(`${result ? "Preference matches" : "Preference differs"}: ${label}.`);
};

const average = (values) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 50);

const getMatchQuality = (score) => {
  if (score >= recommendationThresholds.strong) {
    return "STRONG";
  }

  if (score >= recommendationThresholds.potential) {
    return "POTENTIAL";
  }

  return null;
};

const isEligibleCandidate = (customer, candidate, oppositeGender, seenProfileIds) =>
  candidate._id.toString() !== customer._id.toString() &&
  normalizeGender(candidate.gender) === oppositeGender &&
  !seenProfileIds.has(candidate.profileId);

const getQualifyingSuggestions = (suggestions, limit) => suggestions
  .filter((suggestion) => suggestion.matchQuality)
  .sort((left, right) => right.score - left.score || left.profileId.localeCompare(right.profileId))
  .slice(0, limit);

const getLocationValues = (profile) => [profile.city, profile.country].filter(Boolean).map(normalize);

const locationScore = (customer, candidate, explanations, missing) => {
  const comparisons = [];
  const customerLocations = getLocationValues(customer);
  const candidateLocations = getLocationValues(candidate);

  if (customerLocations.length === 0 || candidateLocations.length === 0) {
    missing.push("location");
  } else if (customerLocations[0] === candidateLocations[0]) {
    comparisons.push(100);
    explanations.push("Same city.");
  } else if (customerLocations[1] && candidateLocations[1] && customerLocations[1] === candidateLocations[1]) {
    comparisons.push(75);
    explanations.push("Same country.");
  } else {
    comparisons.push(25);
    explanations.push("Different current locations.");
  }

  addPreferenceComparison(
    comparisons,
    missing,
    explanations,
    "customer location preference",
    getPreference(customer),
    "locations",
    candidate.city || candidate.country,
  );
  addPreferenceComparison(
    comparisons,
    missing,
    explanations,
    "candidate location preference",
    getPreference(candidate),
    "locations",
    customer.city || customer.country,
  );
  addComparison(comparisons, missing, "relocation preference", customer.openToRelocate, candidate.openToRelocate);

  return average(comparisons);
};

const scoreCandidate = (customer, candidate) => {
  const customerAge = calculateAge(customer.dateOfBirth);
  const candidateAge = calculateAge(candidate.dateOfBirth);
  const customerPreferences = getPreference(customer);
  const candidatePreferences = getPreference(candidate);
  const explanations = [];
  const negativeExplanations = [];
  const missingInformation = [];

  const familyComparisons = [];
  addComparison(familyComparisons, missingInformation, "children goals", customer.wantKids, candidate.wantKids);
  addPreferenceComparison(familyComparisons, missingInformation, explanations, "customer children preference", customerPreferences, "wantKids", candidate.wantKids);
  addPreferenceComparison(familyComparisons, missingInformation, explanations, "candidate children preference", candidatePreferences, "wantKids", customer.wantKids);
  addComparison(familyComparisons, missingInformation, "marital status", customer.maritalStatus, candidate.maritalStatus);
  addPreferenceComparison(familyComparisons, missingInformation, explanations, "customer marital preference", customerPreferences, "maritalStatuses", candidate.maritalStatus);
  addPreferenceComparison(familyComparisons, missingInformation, explanations, "candidate marital preference", candidatePreferences, "maritalStatuses", customer.maritalStatus);

  const valuesComparisons = [];
  addComparison(valuesComparisons, missingInformation, "religion", customer.religion, candidate.religion);
  addComparison(valuesComparisons, missingInformation, "caste", customer.caste, candidate.caste);
  addPreferenceComparison(valuesComparisons, missingInformation, explanations, "customer religion preference", customerPreferences, "religions", candidate.religion);
  addPreferenceComparison(valuesComparisons, missingInformation, explanations, "candidate religion preference", candidatePreferences, "religions", customer.religion);
  addPreferenceComparison(valuesComparisons, missingInformation, explanations, "customer caste preference", customerPreferences, "castes", candidate.caste);
  addPreferenceComparison(valuesComparisons, missingInformation, explanations, "candidate caste preference", candidatePreferences, "castes", customer.caste);

  const professionComparisons = [];
  addComparison(professionComparisons, missingInformation, "education", customer.degree, candidate.degree);
  addComparison(professionComparisons, missingInformation, "profession", customer.designation, candidate.designation);
  addPreferenceComparison(professionComparisons, missingInformation, explanations, "customer education preference", customerPreferences, "education", candidate.degree);
  addPreferenceComparison(professionComparisons, missingInformation, explanations, "candidate education preference", candidatePreferences, "education", customer.degree);
  addPreferenceComparison(professionComparisons, missingInformation, explanations, "customer profession preference", customerPreferences, "professions", candidate.designation);
  addPreferenceComparison(professionComparisons, missingInformation, explanations, "candidate profession preference", candidatePreferences, "professions", customer.designation);

  const lifestyleComparisons = [];
  addComparison(lifestyleComparisons, missingInformation, "pets preference", customer.openToPets, candidate.openToPets);
  addComparison(lifestyleComparisons, missingInformation, "food habits", customer.foodHabits, candidate.foodHabits);
  addComparison(lifestyleComparisons, missingInformation, "smoking habits", customer.smokingHabits, candidate.smokingHabits);
  addComparison(lifestyleComparisons, missingInformation, "alcohol habits", customer.alcoholHabits, candidate.alcoholHabits);
  addPreferenceComparison(lifestyleComparisons, missingInformation, explanations, "customer pets preference", customerPreferences, "openToPets", candidate.openToPets);
  addPreferenceComparison(lifestyleComparisons, missingInformation, explanations, "candidate pets preference", candidatePreferences, "openToPets", customer.openToPets);

  const otherComparisons = [];
  if (customerAge === null || candidateAge === null) {
    missingInformation.push("age");
  } else {
    const ageDifference = Math.abs(customerAge - candidateAge);
    otherComparisons.push(Math.max(0, 100 - ageDifference * 10));

    if (normalizeGender(customer.gender) === "male") {
      otherComparisons.push(candidateAge <= customerAge ? 100 : 0);
      otherComparisons.push(candidate.income === undefined || customer.income === undefined ? 50 : candidate.income <= customer.income ? 100 : 0);
      otherComparisons.push(candidate.height === undefined || customer.height === undefined ? 50 : candidate.height <= customer.height ? 100 : 0);
    }
  }

  addRangePreferenceComparison(otherComparisons, missingInformation, explanations, "customer age preference", customerPreferences, "minAge", "maxAge", candidateAge);
  addRangePreferenceComparison(otherComparisons, missingInformation, explanations, "candidate age preference", candidatePreferences, "minAge", "maxAge", customerAge);
  addRangePreferenceComparison(otherComparisons, missingInformation, explanations, "customer income preference", customerPreferences, "minIncome", "maxIncome", candidate.income);
  addRangePreferenceComparison(otherComparisons, missingInformation, explanations, "candidate income preference", candidatePreferences, "minIncome", "maxIncome", customer.income);

  const factorScores = {
    familyGoals: average(familyComparisons),
    locationRelocation: locationScore(customer, candidate, explanations, missingInformation),
    valuesLifeGoals: average(valuesComparisons),
    professionEducation: average(professionComparisons),
    lifestyle: average(lifestyleComparisons),
    other: average(otherComparisons),
  };

  for (const [factor, score] of Object.entries(factorScores)) {
    if (score < 50) {
      negativeExplanations.push(`${factor} has limited compatibility based on known values.`);
    } else if (score > 50) {
      explanations.push(`${factor} is compatible based on known values.`);
    }
  }

  const totalScore = Object.entries(weights).reduce(
    (total, [factor, weight]) => total + factorScores[factor] * weight / 100,
    0,
  );

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    scoreBreakdown: Object.fromEntries(
      Object.entries(factorScores).map(([factor, score]) => [factor, {
          score: Math.round(score * 100) / 100,
          weight: weights[factor],
          weightedScore: Math.round(score * weights[factor]) / 100,
        }]),
    ),
    explanations: [...new Set(explanations)].slice(0, 10),
    negativeExplanations: [...new Set(negativeExplanations)].slice(0, 10),
    missingInformation: [...new Set(missingInformation)],
    candidateAge,
  };
};

const getSuggestions = async (req, res) => {
  if (req.user.role !== "MATCHMAKER") {
    return res.status(403).json({ success: false, message: "Matchmaker access required" });
  }

  const { profileId } = req.params;
  const requestedLimit = Number(req.query.limit ?? defaultLimit);

  if (!profileId || !Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > maxLimit) {
    return res.status(400).json({
      success: false,
      message: `limit must be an integer between 1 and ${maxLimit}`,
    });
  }

  try {
    const customer = await Profile.findOne({ profileId, assignedMatchmaker: req.user.id }).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer profile not found" });
    }

    const customerGender = normalizeGender(customer.gender);
    if (!customerGender) {
      return res.status(422).json({ success: false, message: "Customer profile has an unsupported gender" });
    }

    const candidateProfiles = await Profile.find({ _id: { $ne: customer._id } })
      .select("profileId firstName lastName gender dateOfBirth city country income height maritalStatus religion caste degree designation currentCompany wantKids openToRelocate openToPets foodHabits smokingHabits alcoholHabits partnerPreferences journeyStage")
      .lean();
    const oppositeGender = customerGender === "male" ? "female" : "male";
    const seenProfileIds = new Set();
    const suggestions = [];

    for (const candidate of candidateProfiles) {
      if (!isEligibleCandidate(customer, candidate, oppositeGender, seenProfileIds)) {
        continue;
      }

      const candidateAge = calculateAge(candidate.dateOfBirth);
      seenProfileIds.add(candidate.profileId);
      const scoring = scoreCandidate(customer, candidate);
      const matchQuality = getMatchQuality(scoring.totalScore);

      suggestions.push({
        profileId: candidate.profileId,
        name: [candidate.firstName, candidate.lastName].filter(Boolean).join(" "),
        gender: candidate.gender,
        age: scoring.candidateAge,
        city: candidate.city,
        maritalStatus: candidate.maritalStatus,
        journeyStage: candidate.journeyStage,
        score: scoring.totalScore,
        scoreBreakdown: scoring.scoreBreakdown,
        explanations: scoring.explanations,
        negativeExplanations: scoring.negativeExplanations,
        missingInformation: scoring.missingInformation,
        matchQuality,
      });
    }

    const qualifyingSuggestions = suggestions.filter((suggestion) => suggestion.matchQuality);

    return res.status(200).json({
      success: true,
      data: getQualifyingSuggestions(qualifyingSuggestions, requestedLimit),
      meta: {
        customerProfileId: customer.profileId,
        eligibleCandidateCount: suggestions.length,
        qualifyingRecommendationCount: qualifyingSuggestions.length,
        limit: requestedLimit,
        weights,
        thresholds: recommendationThresholds,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load match suggestions" });
  }
};

export { getMatchQuality, getQualifyingSuggestions, getSuggestions, isEligibleCandidate, scoreCandidate };
export default getSuggestions;