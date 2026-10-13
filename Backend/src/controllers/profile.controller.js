import Profile from "../models/profile.models.js";

const defaultPage = 1;
const defaultLimit = 20;
const maxLimit = 100;
const allowedSortFields = new Set(["name", "lastUpdated"]);
const allowedSortOrders = new Set(["asc", "desc"]);
const maxNoteLength = 2000;
const noteTypes = new Set(["CALL", "MEETING"]);

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
      { profileId: { $regex: search, $options: "i" } },
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
      .select("profileId firstName lastName gender dateOfBirth city maritalStatus journeyStage updatedAt")
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
    gender: profile.gender,
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

const getProfileDetails = async (req, res) => {
  if (!requireMatchmaker(req, res)) {
    return;
  }

  try {
    const profile = await Profile.findOne({
      profileId: req.params.profileId,
      assignedMatchmaker: req.user.id,
    })
      .select("-notes")
      .lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: "Client profile not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        age: calculateAge(profile.dateOfBirth),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load profile details" });
  }
};

const requireMatchmaker = (req, res) => {
  if (req.user.role !== "MATCHMAKER") {
    res.status(403).json({
      success: false,
      message: "Matchmaker access required",
    });
    return false;
  }

  return true;
};

const getNoteInput = (body = {}) => {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const noteType = typeof body.noteType === "string" ? body.noteType.trim().toUpperCase() : "";

  if (!text) {
    return { error: "Note text is required" };
  }

  if (text.length > maxNoteLength) {
    return { error: `Note cannot exceed ${maxNoteLength} characters` };
  }

  if (!noteTypes.has(noteType)) {
    return { error: "noteType must be CALL or MEETING" };
  }

  return { text, noteType };
};

const formatNote = (note) => ({
  text: note.text,
  noteType: note.noteType,
  createdAt: note.createdAt,
  author: note.author
    ? {
        id: note.author._id?.toString() || note.author.toString(),
        name: note.author.name,
        email: note.author.email,
        role: note.author.role,
      }
    : null,
});

const getProfileNotes = async (req, res) => {
  if (!requireMatchmaker(req, res)) {
    return;
  }

  try {
    const profile = await Profile.findOne({
      profileId: req.params.profileId,
      assignedMatchmaker: req.user.id,
    })
      .select("notes")
      .populate("notes.author", "name email role")
      .lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: "Client profile not found" });
    }

    return res.status(200).json({
      success: true,
      data: [...(profile.notes || [])].reverse().map(formatNote),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load profile notes" });
  }
};

const createProfileNote = async (req, res) => {
  if (!requireMatchmaker(req, res)) {
    return;
  }

  const noteInput = getNoteInput(req.body);
  if (noteInput.error) {
    return res.status(400).json({ success: false, message: noteInput.error });
  }

  try {
    const profile = await Profile.findOne({
      profileId: req.params.profileId,
      assignedMatchmaker: req.user.id,
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Client profile not found" });
    }

    profile.notes.push({
      ...noteInput,
      author: req.user.id,
    });
    await profile.save();
    await profile.populate("notes.author", "name email role");

    return res.status(201).json({
      success: true,
      data: formatNote(profile.notes[profile.notes.length - 1]),
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Invalid profile note" });
    }

    return res.status(500).json({ success: false, message: "Unable to create profile note" });
  }
};

export { createProfileNote, getDashboardProfiles, getNoteInput, getProfileDetails, getProfileNotes };
export default getDashboardProfiles;
