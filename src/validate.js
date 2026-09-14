const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{8,20}$/;

export function validateRegistered({ name, email, phone, consent }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = "Please enter your full name.";
  const hasEmail = Boolean(email && email.trim());
  const hasPhone = Boolean(phone && phone.trim());
  if (!hasEmail && !hasPhone) {
    errors.contact = "Enter an email or a phone number so we can reach prize winners.";
  }
  if (hasEmail && !EMAIL.test(email.trim())) errors.email = "That email does not look valid.";
  if (hasPhone && !PHONE.test(phone.trim())) errors.phone = "That phone number does not look valid.";
  if (!consent) errors.consent = "Please confirm that we may store your details.";
  return errors;
}

export function validateGuest({ name }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = "Please enter a name to display.";
  return errors;
}

export function firstError(errors) {
  return Object.values(errors)[0] || "";
}
