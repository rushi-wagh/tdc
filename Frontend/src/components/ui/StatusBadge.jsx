import Badge from "./Badge.jsx";

const statusVariant = (value = "") => {
  const normalized = value.toLowerCase();

  if (["strong", "matching", "interested", "meeting scheduled"].some((item) => normalized.includes(item))) {
    return "green";
  }

  if (["closed", "declined", "not interested"].some((item) => normalized.includes(item))) {
    return "red";
  }

  if (["potential", "follow-up", "sent"].some((item) => normalized.includes(item))) {
    return "gold";
  }

  if (["new", "profile reviewed", "suggested"].some((item) => normalized.includes(item))) {
    return "burgundy";
  }

  return "neutral";
};

const StatusBadge = ({ value, fallback = "Not available" }) => (
  <Badge variant={statusVariant(value || fallback)}>{value || fallback}</Badge>
);

export default StatusBadge;
