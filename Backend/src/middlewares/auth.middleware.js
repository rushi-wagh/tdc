import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

const getSafeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

const authenticate = async (req, res, next) => {
  const authorization = req.get("Authorization");
  const authorizationMatch = authorization?.match(/^Bearer\s+(\S+)$/);
  const token = authorizationMatch?.[1] || req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const { JWT_SECRET } = process.env;

  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (typeof payload !== "object" || !payload.userId) {
      throw new Error("Invalid token payload");
    }

    const user = await User.findOne({ _id: payload.userId, isActive: true }).select("name email role");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    req.user = getSafeUser(user);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
};

export { authenticate };
export default authenticate;