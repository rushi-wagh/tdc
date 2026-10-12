import mongoose from "mongoose";

const yesNoMaybe = ["Yes", "No", "Maybe"];
const emailPattern = /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/;

const preferenceSchema = new mongoose.Schema(
  {
    minAge: {
      type: Number,
      min: 18,
      max: 120,
      validate: {
        validator(value) {
          return value == null || this.maxAge == null || value <= this.maxAge;
        },
        message: "Preferred minimum age cannot exceed maximum age",
      },
    },
    maxAge: {
      type: Number,
      min: 18,
      max: 120,
      validate: {
        validator(value) {
          return value == null || this.minAge == null || value >= this.minAge;
        },
        message: "Preferred maximum age cannot be less than minimum age",
      },
    },
    locations: [{ type: String, trim: true }],
    education: [{ type: String, trim: true }],
    professions: [{ type: String, trim: true }],
    minIncome: {
      type: Number,
      min: 0,
      validate: {
        validator(value) {
          return value == null || this.maxIncome == null || value <= this.maxIncome;
        },
        message: "Preferred minimum income cannot exceed maximum income",
      },
    },
    maxIncome: {
      type: Number,
      min: 0,
      validate: {
        validator(value) {
          return value == null || this.minIncome == null || value >= this.minIncome;
        },
        message: "Preferred maximum income cannot be less than minimum income",
      },
    },
    maritalStatuses: [{ type: String, trim: true }],
    religions: [{ type: String, trim: true }],
    castes: [{ type: String, trim: true }],
    wantKids: { type: String, enum: [...yesNoMaybe, "ANY"] },
    openToRelocate: { type: String, enum: [...yesNoMaybe, "ANY"] },
    openToPets: { type: String, enum: [...yesNoMaybe, "ANY"] },
    lifestyle: [{ type: String, trim: true }],
  },
  { _id: false },
);

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Note text is required"],
      trim: true,
      maxlength: [2000, "Note cannot exceed 2000 characters"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Note author is required"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    profileId: {
      type: String,
      required: [true, "Profile ID is required"],
      unique: true,
      trim: true,
    },
    assignedMatchmaker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value <= new Date(),
        message: "Date of birth cannot be in the future",
      },
    },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    height: { type: Number, required: true, min: 50, max: 250 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [emailPattern, "Enter a valid email address"],
    },
    phoneNumber: { type: String, required: true, trim: true },
    undergraduateCollege: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    income: { type: Number, required: true, min: 0 },
    currentCompany: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    maritalStatus: { type: String, required: true, trim: true },
    languagesKnown: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: {
        validator: (value) => value.length > 0,
        message: "At least one known language is required",
      },
    },
    siblings: { type: Number, required: true, min: 0 },
    caste: { type: String, required: true, trim: true },
    religion: { type: String, required: true, trim: true },
    wantKids: { type: String, required: true, enum: yesNoMaybe },
    openToRelocate: { type: String, required: true, enum: yesNoMaybe },
    openToPets: { type: String, required: true, enum: yesNoMaybe },
    aboutMe: { type: String, trim: true, maxlength: 3000 },
    interests: [{ type: String, trim: true }],
    hobbies: [{ type: String, trim: true }],
    familyBackground: { type: String, trim: true, maxlength: 3000 },
    foodHabits: { type: String, trim: true },
    smokingHabits: { type: String, trim: true },
    alcoholHabits: { type: String, trim: true },
    partnerPreferences: { type: preferenceSchema, default: () => ({}) },
    journeyStage: {
      type: String,
      enum: ["New", "Profile Reviewed", "Matching", "Follow-up", "Closed"],
      default: "New",
    },
    notes: { type: [noteSchema], default: [] },
  },
  { timestamps: true },
);

profileSchema.virtual("age").get(function calculateAge() {
  if (!this.dateOfBirth) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > this.dateOfBirth.getMonth() ||
    (today.getMonth() === this.dateOfBirth.getMonth() && today.getDate() >= this.dateOfBirth.getDate());

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age;
});

const Profile = mongoose.model("Profile", profileSchema);

export { Profile };
export default Profile;