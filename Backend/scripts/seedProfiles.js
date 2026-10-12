import dotenv from "dotenv";
import mongoose from "mongoose";
import XLSX from "xlsx";
import connectDatabase from "../src/config/db.js";
import Profile from "../src/models/profile.models.js";
import User from "../src/models/user.models.js";

dotenv.config();

const workbookPath = "matchmaker_100_profiles_seed.xlsx";
const profileSheetName = "Profiles";
const listSeparator = ";";

const supportedColumns = new Set([
  "profileId",
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "country",
  "city",
  "heightCm",
  "email",
  "phoneNumber",
  "undergraduateCollege",
  "degree",
  "annualIncome",
  "currentCompany",
  "designation",
  "maritalStatus",
  "languagesKnown",
  "siblings",
  "caste",
  "religion",
  "wantKids",
  "openToRelocate",
  "openToPets",
  "familyBackground",
  "aboutMe",
  "interests",
  "foodPreference",
  "smokingHabit",
  "alcoholHabit",
  "preferredMinAge",
  "preferredMaxAge",
  "preferredLocations",
  "preferredEducation",
  "preferredProfessions",
  "preferredMinIncome",
  "preferredMaxIncome",
  "preferredMaritalStatuses",
  "preferredReligions",
  "preferredCastes",
  "preferredPartnerKids",
  "preferredPartnerRelocate",
  "preferredPartnerPets",
  "assignedMatchmakerEmail",
  "journeyStage",
]);

const trimValue = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const trimmedValue = String(value).trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

const splitList = (value) => {
  const trimmedValue = trimValue(value);

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue
    .split(listSeparator)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseNumber = (value) => {
  const trimmedValue = trimValue(value);
  return trimmedValue === undefined ? undefined : Number(trimmedValue);
};

const parseDate = (value) => {
  const trimmedValue = trimValue(value);

  if (!trimmedValue) {
    return undefined;
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? trimmedValue : parsedDate;
};

const setIfDefined = (target, key, value) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const buildProfileData = (row, assignedMatchmaker) => {
  const profileData = {
    profileId: trimValue(row.profileId),
    assignedMatchmaker,
    firstName: trimValue(row.firstName),
    lastName: trimValue(row.lastName),
    gender: trimValue(row.gender),
    dateOfBirth: parseDate(row.dateOfBirth),
    country: trimValue(row.country),
    city: trimValue(row.city),
    height: parseNumber(row.heightCm),
    email: trimValue(row.email),
    phoneNumber: trimValue(row.phoneNumber),
    undergraduateCollege: trimValue(row.undergraduateCollege),
    degree: trimValue(row.degree),
    income: parseNumber(row.annualIncome),
    currentCompany: trimValue(row.currentCompany),
    designation: trimValue(row.designation),
    maritalStatus: trimValue(row.maritalStatus),
    languagesKnown: splitList(row.languagesKnown),
    siblings: parseNumber(row.siblings),
    caste: trimValue(row.caste),
    religion: trimValue(row.religion),
    wantKids: trimValue(row.wantKids),
    openToRelocate: trimValue(row.openToRelocate),
    openToPets: trimValue(row.openToPets),
    familyBackground: trimValue(row.familyBackground),
    aboutMe: trimValue(row.aboutMe),
    interests: splitList(row.interests),
    foodHabits: trimValue(row.foodPreference),
    smokingHabits: trimValue(row.smokingHabit),
    alcoholHabits: trimValue(row.alcoholHabit),
    journeyStage: trimValue(row.journeyStage),
  };

  const partnerPreferences = {};
  setIfDefined(partnerPreferences, "minAge", parseNumber(row.preferredMinAge));
  setIfDefined(partnerPreferences, "maxAge", parseNumber(row.preferredMaxAge));
  setIfDefined(partnerPreferences, "locations", splitList(row.preferredLocations));
  setIfDefined(partnerPreferences, "education", splitList(row.preferredEducation));
  setIfDefined(partnerPreferences, "professions", splitList(row.preferredProfessions));
  setIfDefined(partnerPreferences, "minIncome", parseNumber(row.preferredMinIncome));
  setIfDefined(partnerPreferences, "maxIncome", parseNumber(row.preferredMaxIncome));
  setIfDefined(partnerPreferences, "maritalStatuses", splitList(row.preferredMaritalStatuses));
  setIfDefined(partnerPreferences, "religions", splitList(row.preferredReligions));
  setIfDefined(partnerPreferences, "castes", splitList(row.preferredCastes));
  setIfDefined(partnerPreferences, "wantKids", trimValue(row.preferredPartnerKids));
  setIfDefined(partnerPreferences, "openToRelocate", trimValue(row.preferredPartnerRelocate));
  setIfDefined(partnerPreferences, "openToPets", trimValue(row.preferredPartnerPets));

  if (Object.keys(partnerPreferences).length > 0) {
    profileData.partnerPreferences = partnerPreferences;
  }

  return profileData;
};

const formatValidationError = (error) => {
  if (!error?.errors) {
    return error.message;
  }

  return Object.entries(error.errors)
    .map(([path, validationError]) => `${path}: ${validationError.message}`)
    .join("; ");
};

const reportUnsupportedColumns = (headers) => {
  const unsupportedColumns = headers.filter((header) => !supportedColumns.has(header));

  if (unsupportedColumns.length > 0) {
    console.warn(`Unsupported workbook columns not imported: ${unsupportedColumns.join(", ")}`);
  }
};

const seedProfiles = async () => {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const worksheet = workbook.Sheets[profileSheetName];

  if (!worksheet) {
    throw new Error(`Workbook sheet not found: ${profileSheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  reportUnsupportedColumns(headers);

  const profileIds = rows.map((row) => trimValue(row.profileId)).filter((profileId) => profileId);
  const existingProfiles = await Profile.find({ profileId: { $in: profileIds } }).select("profileId").lean();
  const existingProfileIds = new Set(existingProfiles.map((profile) => profile.profileId));
  const matchmakerEmails = [...new Set(rows.map((row) => trimValue(row.assignedMatchmakerEmail)).filter((email) => email))];
  const matchmakers = await User.find({ email: { $in: matchmakerEmails } }).select("_id email").lean();
  const matchmakerIdsByEmail = new Map(matchmakers.map((user) => [user.email.toLowerCase(), user._id]));
  const counts = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  const dryRun = process.env.DRY_RUN === "true";

  for (const [index, row] of rows.entries()) {
    const excelRowNumber = index + 2;
    const profileId = trimValue(row.profileId);
    const matchmakerEmail = trimValue(row.assignedMatchmakerEmail)?.toLowerCase();

    if (!profileId) {
      counts.failed += 1;
      console.error(`Row ${excelRowNumber}: profileId is missing`);
      continue;
    }

    const assignedMatchmaker = matchmakerIdsByEmail.get(matchmakerEmail);

    if (!assignedMatchmaker) {
      counts.skipped += 1;
      console.error(`Row ${excelRowNumber} (${profileId}): matchmaker not found for ${matchmakerEmail || "missing email"}`);
      continue;
    }

    const profileData = buildProfileData(row, assignedMatchmaker);
    const profile = new Profile(profileData);

    try {
      await profile.validate();
    } catch (error) {
      counts.failed += 1;
      console.error(`Row ${excelRowNumber} (${profileId}): ${formatValidationError(error)}`);
      continue;
    }

    if (dryRun) {
      if (existingProfileIds.has(profileId)) {
        counts.updated += 1;
      } else {
        counts.inserted += 1;
      }
      continue;
    }

    try {
      await Profile.findOneAndUpdate(
        { profileId },
        { $set: profileData },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );

      if (existingProfileIds.has(profileId)) {
        counts.updated += 1;
      } else {
        counts.inserted += 1;
        existingProfileIds.add(profileId);
      }
    } catch (error) {
      counts.failed += 1;
      console.error(`Row ${excelRowNumber} (${profileId}): ${formatValidationError(error)}`);
    }
  }

  console.log(`${dryRun ? "Dry run" : "Profile seeding"} completed: ${JSON.stringify(counts)}`);
};

try {
  await connectDatabase();
  await seedProfiles();
} catch (error) {
  console.error(`Profile seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}