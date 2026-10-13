export const notProvided = "Not available";

export const formatValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return notProvided;
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : notProvided;
  }

  return String(value);
};

export const formatDate = (value) => {
  if (!value) {
    return notProvided;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return notProvided;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const formatDateTime = (value) => {
  if (!value) {
    return notProvided;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return notProvided;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const calculateAge = (dateOfBirth) => {
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

  return age >= 0 ? age : null;
};

export const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") {
    return notProvided;
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(Number(value));
};

export const sentenceCase = (value) =>
  formatValue(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
