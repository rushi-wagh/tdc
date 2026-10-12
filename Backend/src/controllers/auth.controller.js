import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const emailPattern = /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/;

const getSafeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

const login = async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!emailPattern.test(email) || password.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const user = await User.findOne({ email, isActive: true }).select(
    "+password",
  );
  const isPasswordValid = user ? await user.comparePassword(password) : false;

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const { JWT_SECRET, JWT_EXPIRY = "15m" } = process.env;

  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured",
    });
  }

  const safeUser = getSafeUser(user);
  const token = jwt.sign({ userId: safeUser.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
  .cookie("token", token, cookieOptions)
  .status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: safeUser,
    },
  });
};

export {login};
