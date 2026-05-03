const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const lockouts = new Map();

function checkLockout(ip) {
  const entry = lockouts.get(ip);
  if (!entry?.lockedUntil) return false;
  if (Date.now() < entry.lockedUntil) return true;
  lockouts.delete(ip);
  return false;
}

function recordFailure(ip) {
  const entry = lockouts.get(ip) || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCKOUT_MS;
  lockouts.set(ip, entry);
}

function clearLockout(ip) {
  lockouts.delete(ip);
}

function remainingLockoutSeconds(ip) {
  const entry = lockouts.get(ip);
  if (!entry?.lockedUntil) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
}

module.exports = { checkLockout, recordFailure, clearLockout, remainingLockoutSeconds };
