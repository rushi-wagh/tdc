import Profile from "../models/profile.models.js";

const defaultPage = 1;
const defaultLimit = 20;
const maxLimit = 100;
const allowedSortFields = new Set(["name", "lastUpdated"]);
const allowedSortOrders = new Set(["asc", "desc"]);

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
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

  return age;
};

const getDashboardProfiles = async (req, res) => {
  if (req.user.role !== "MATCHMAKER") {
    return res.status(403).json({
      success: false,
      message: "Matchmaker access required",
    });
  }

  const page = parsePositiveInteger(req.query.page, defaultPage);
  const requestedLimit = parsePositiveInteger(req.query.limit, defaultLimit);
  const limit = requestedLimit && requestedLimit <= maxLimit ? requestedLimit : null;
  const sortBy = req.query.sortBy || "name";
  const sortOrder = req.query.sortOrder || "asc";

  if (!page || !limit || !allowedSortFields.has(sortBy) || !allowedSortOrders.has(sortOrder)) {
    return res.status(400).json({
      success: false,
      message: "Invalid dashboard query parameters",
    });
  }

  const query = { assignedMatchmaker: req.user.id };
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
    ];
  }

  for (const field of ["gender", "maritalStatus", "journeyStage"]) {
    if (typeof req.query[field] === "string" && req.query[field].trim()) {
      query[field] = req.query[field].trim();
    }
  }

  const direction = sortOrder === "asc" ? 1 : -1;
  const sort = sortBy === "name"
    ? { firstName: direction, lastName: direction }
    : { updatedAt: direction };
  const skip = (page - 1) * limit;
  const [totalItems, profiles] = await Promise.all([
    Profile.countDocuments(query),
    Profile.find(query)
      .select("profileId firstName lastName dateOfBirth city maritalStatus journeyStage updatedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  const data = profiles.map((profile) => ({
    profileId: profile.profileId,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    age: calculateAge(profile.dateOfBirth),
    city: profile.city,
    maritalStatus: profile.maritalStatus,
    journeyStage: profile.journeyStage,
    lastUpdated: profile.updatedAt,
  }));

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
};

export { getDashboardProfiles };
export default getDashboardProfiles;