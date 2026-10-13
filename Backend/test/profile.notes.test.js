import test from "node:test";
import assert from "node:assert/strict";
import Profile from "../src/models/profile.models.js";
import {
  createProfileNote,
  getNoteInput,
  getProfileNotes,
} from "../src/controllers/profile.controller.js";

test("trims valid note input and normalizes note type", () => {
  assert.deepEqual(getNoteInput({ text: "  Discussed timeline  ", noteType: "call" }), {
    text: "Discussed timeline",
    noteType: "CALL",
  });
});

test("rejects empty, oversized, and unsupported notes", () => {
  assert.equal(getNoteInput({ text: "   ", noteType: "CALL" }).error, "Note text is required");
  assert.equal(getNoteInput({ text: "a".repeat(2001), noteType: "CALL" }).error, "Note cannot exceed 2000 characters");
  assert.equal(getNoteInput({ text: "Valid", noteType: "EMAIL" }).error, "noteType must be CALL or MEETING");
});

test("does not accept notes without a valid note type", () => {
  assert.equal(getNoteInput({ text: "Valid" }).error, "noteType must be CALL or MEETING");
});

test("rejects non-matchmakers before accessing profile notes", async (t) => {
  const findOne = t.mock.method(Profile, "findOne", () => {
    throw new Error("Profile lookup should not happen");
  });
  const response = createResponse();

  await getProfileNotes({ user: { role: "CUSTOMER" }, params: { profileId: "client-1" } }, response);

  assert.equal(response.statusCode, 403);
  assert.equal(findOne.mock.calls.length, 0);
});

test("does not expose notes from another matchmaker's profile", async (t) => {
  let query;
  t.mock.method(Profile, "findOne", (profileQuery) => {
    query = profileQuery;
    return {
      select() { return this; },
      populate() { return this; },
      lean: async () => null,
    };
  });
  const response = createResponse();

  await getProfileNotes({ user: { role: "MATCHMAKER", id: "matchmaker-2" }, params: { profileId: "client-1" } }, response);

  assert.deepEqual(query, { profileId: "client-1", assignedMatchmaker: "matchmaker-2" });
  assert.equal(response.statusCode, 404);
});

test("appends a note and returns its author", async (t) => {
  const notes = [];
  notes.push = (note) => Array.prototype.push.call(notes, { ...note, createdAt: "2026-01-03" });
  const profile = {
    notes,
    async save() {},
    async populate() {
      this.notes[this.notes.length - 1].author = {
        _id: "matchmaker-1",
        name: "Matchmaker One",
        email: "one@example.com",
        role: "MATCHMAKER",
      };
    },
  };
  let query;
  t.mock.method(Profile, "findOne", (profileQuery) => {
    query = profileQuery;
    return profile;
  });
  const response = createResponse();

  await createProfileNote(
    {
      user: { role: "MATCHMAKER", id: "matchmaker-1" },
      params: { profileId: "client-1" },
      body: { text: "  Discussed next steps  ", noteType: "meeting" },
    },
    response,
  );

  assert.deepEqual(query, { profileId: "client-1", assignedMatchmaker: "matchmaker-1" });
  assert.equal(response.statusCode, 201);
  assert.equal(profile.notes.length, 1);
  assert.deepEqual(response.body.data, {
    text: "Discussed next steps",
    noteType: "MEETING",
    createdAt: "2026-01-03",
    author: {
      id: "matchmaker-1",
      name: "Matchmaker One",
      email: "one@example.com",
      role: "MATCHMAKER",
    },
  });
});

test("lists complete note history newest-first", async (t) => {
  t.mock.method(Profile, "findOne", () => ({
    select() { return this; },
    populate() { return this; },
    lean: async () => ({
      notes: [
        { text: "First", noteType: "CALL", createdAt: "2026-01-01", author: { _id: "one", name: "One", email: "one@example.com", role: "MATCHMAKER" } },
        { text: "Second", noteType: "MEETING", createdAt: "2026-01-02", author: { _id: "two", name: "Two", email: "two@example.com", role: "MATCHMAKER" } },
      ],
    }),
  }));
  const response = createResponse();

  await getProfileNotes({ user: { role: "MATCHMAKER", id: "matchmaker-1" }, params: { profileId: "client-1" } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data.map((note) => note.text), ["Second", "First"]);
  assert.equal(response.body.data[0].author.name, "Two");
});

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});