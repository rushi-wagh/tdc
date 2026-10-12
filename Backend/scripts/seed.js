import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDatabase from "../src/config/db.js";
import User from "../src/models/user.models.js";

dotenv.config();

const matchmakerAccounts = [
  { name: "Matchmaker 1", email: "matchmaker1@demo.tdc" },
  { name: "Matchmaker 2", email: "matchmaker2@demo.tdc" },
  { name: "Matchmaker 3", email: "matchmaker3@demo.tdc" },
];

const seedMatchmakers = async () => {
  const { DEMO_PASSWORD } = process.env;

  if (!DEMO_PASSWORD) {
    throw new Error("DEMO_PASSWORD is not configured");
  }

  await connectDatabase();

  for (const account of matchmakerAccounts) {
    const normalizedEmail = account.email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");

    if (existingUser) {
      console.log(`User already exists: ${normalizedEmail}`);
      continue;
    }

    await new User({
      ...account,
      email: normalizedEmail,
      password: DEMO_PASSWORD,
      role: "MATCHMAKER",
      isActive: true,
    }).save();

    console.log(`Created user: ${normalizedEmail}`);
  }
};

try {
  await seedMatchmakers();
  console.log("User seeding completed");
} catch (error) {
  console.error(`User seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}