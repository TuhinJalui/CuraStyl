/**
 * Payment Validation Utilities
 * Real validation for UPI IDs, card numbers, and transaction IDs
 */

/**
 * Validates UPI ID format
 * Format: username@bankcode
 * Examples: 9876543210@paytm, user.name@oksbi, merchant@ybl
 */
export function validateUpiId(upiId: string): { valid: boolean; error?: string } {
  if (!upiId || typeof upiId !== "string") {
    return { valid: false, error: "UPI ID is required" };
  }

  const trimmed = upiId.trim();

  // Basic format check: should contain @ symbol
  if (!trimmed.includes("@")) {
    return { valid: false, error: "Invalid UPI ID format. Should be like: name@bank" };
  }

  // Split into username and bank handle
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid UPI ID format. Should contain exactly one @" };
  }

  const [username, bankHandle] = parts;

  // Username validation (alphanumeric, dots, hyphens, underscores, 3-50 chars)
  if (!username || username.length < 3 || username.length > 50) {
    return { valid: false, error: "UPI username must be 3-50 characters long" };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return { valid: false, error: "UPI username can only contain letters, numbers, dots, hyphens, and underscores" };
  }

  // Bank handle validation (known UPI handles)
  const validBankHandles = [
    "paytm", "pthdfc", "ptyes", "ptsbi", "ptaxis",
    "ybl", "oksbi", "okaxis", "okicici", "okhdfc",
    "ibl", "upi", "axl", "allbank", "andb",
    "apb", "airtel", "aubank", "axisb", "axisgo",
    "barodampay", "barodapay", "cbin", "centralbank",
    "citi", "citibank", "citigold", "cmsidfc", "cnrb",
    "csbcash", "csbpay", "dbs", "dcb", "dcbbank",
    "denabank", "equitasbank", "fbl", "federal",
    "finobank", "hdfcbank", "hsbc", "icici", "idbi",
    "idbibank", "idfc", "idfcbank", "idfcfirst",
    "ikwik", "imobile", "indus", "indianbank",
    "iob", "jkb", "jupiteraxis", "kaypay", "karurvysyabank",
    "kotak", "kotakbank", "kvb", "kvbank", "lime",
    "lvb", "mahb", "myicici", "obc", "okbizaxis",
    "pnb", "pockets", "psb", "rajgovhdfcbank",
    "rbl", "sbi", "sc", "scb", "scbl", "sib",
    "srcb", "synd", "tjsb", "uco", "ucobank",
    "unionbank", "unionbankofindia", "united", "upi",
    "utbi", "vijb", "vijayabank", "yapl", "yesbankltd",
    "bandhan", "cub", "dlb", "esaf", "fam",
    "nkgsb", "rbl", "tdb", "tjsb", "ucba",
    "ujjivan", "jio", "jiopaymentsbank", "mbk",
    "pingpay", "phonepe", "gpay", "whatsapp"
  ];

  if (!validBankHandles.includes(bankHandle.toLowerCase())) {
    return { valid: false, error: `Unrecognized bank handle "@${bankHandle}". Please verify your UPI ID` };
  }

  return { valid: true };
}

/**
 * Validates transaction/UTR number format
 * UTR: 12-digit numeric string
 */
export function validateTransactionId(txnId: string): { valid: boolean; error?: string } {
  if (!txnId || typeof txnId !== "string") {
    return { valid: false, error: "Transaction ID is required" };
  }

  const trimmed = txnId.trim();

  // Should be 12 digits for UTR
  if (!/^\d{12}$/.test(trimmed)) {
    return { valid: false, error: "Transaction ID must be exactly 12 digits" };
  }

  return { valid: true };
}

/**
 * Validates card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): { valid: boolean; error?: string } {
  if (!cardNumber || typeof cardNumber !== "string") {
    return { valid: false, error: "Card number is required" };
  }

  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, "");

  // Should be 13-19 digits
  if (!/^\d{13,19}$/.test(cleaned)) {
    return { valid: false, error: "Card number must be 13-19 digits" };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: "Invalid card number" };
  }

  return { valid: true };
}

/**
 * Validates phone number (Indian format)
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, error: "Phone number is required" };
  }

  // Remove spaces, dashes, and +91
  const cleaned = phone.replace(/[\s\-+]/g, "").replace(/^91/, "");

  // Should be 10 digits starting with 6-9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return { valid: false, error: "Invalid phone number. Must be 10 digits starting with 6-9" };
  }

  return { valid: true };
}
