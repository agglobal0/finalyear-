export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return emailRegex.test(String(email || '').toLowerCase());
}

// Returns a score from 0..4
export function getPasswordScore(pwd = '') {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  // Map 0..5 to 0..4 for UI
  return Math.max(0, Math.min(4, score - 1));
}

export function passwordStrength(pwd = '') {
  const score = getPasswordScore(pwd);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-green-500"];
  return { score, label: labels[score], color: colors[score] };
}

export function isStrongPassword(pwd = '', minScore = 3) {
  return getPasswordScore(pwd) >= minScore;
}
