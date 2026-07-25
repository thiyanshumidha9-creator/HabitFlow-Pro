/* ============================================
   HabitFlow Pro — Validation Helper
   ============================================
   Validates form fields for authentication.
   Includes client-side checks matching backend rules.
   ============================================ */

/**
 * Validate an email address format.
 * @param {string} email
 * @returns {{isValid: boolean, message: string}}
 */
export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'Email address is required.' };
  }
  
  // Standard RFC 5322 email regex
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  if (!regex.test(email.trim())) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validate full name length (must be 1-150 characters).
 * @param {string} name
 * @returns {{isValid: boolean, message: string}}
 */
export function validateFullName(name) {
  if (!name || name.trim() === '') {
    return { isValid: false, message: 'Full name is required.' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length > 150) {
    return { isValid: false, message: 'Full name must be 150 characters or less.' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validate password strength:
 * - 8 to 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * @param {string} password
 * @returns {{isValid: boolean, message: string}}
 */
export function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: 'Password is required.' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be 128 characters or less.' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number.' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validate password confirmation match.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {{isValid: boolean, message: string}}
 */
export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password.' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match.' };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validate an optional phone number.
 * @param {string} phone
 * @returns {{isValid: boolean, message: string}}
 */
export function validatePhone(phone) {
  if (!phone || phone.trim() === '') {
    return { isValid: true, message: '' };
  }

  const sanitized = phone.replace(/[\s\-\(\)]/g, '');
  const regex = /^\+?[1-9]\d{1,14}$/;

  if (!regex.test(sanitized)) {
    return { isValid: false, message: 'Please enter a valid phone number (e.g. +1234567890).' };
  }

  return { isValid: true, message: '' };
}

