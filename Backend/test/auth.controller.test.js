import test from "node:test";
import assert from "node:assert/strict";
import { getAuthCookieOptions } from "../src/controllers/auth.controller.js";

test("uses a cross-site secure cookie for production deployments", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.NODE_ENV = "production";
  process.env.FRONTEND_URL = "https://tdc-lemon.vercel.app";

  try {
    assert.deepEqual(getAuthCookieOptions(), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.FRONTEND_URL = previousFrontendUrl;
  }
});

test("keeps local development cookies usable over HTTP", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.NODE_ENV = "development";
  process.env.FRONTEND_URL = "http://localhost:5173";

  try {
    assert.deepEqual(getAuthCookieOptions(), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.FRONTEND_URL = previousFrontendUrl;
  }
});
