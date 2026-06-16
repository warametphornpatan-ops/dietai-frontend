/**
 * ตรวจสอบเลขบัตรประชาชนไทย (Frontend Validation)
 */

export interface ThaiIDValidationResult {
  isValid: boolean;
  message: string;
  errors: string[];
  details?: string[];
}

export function validateThaiID(citizenId: string): ThaiIDValidationResult {
  const errors: string[] = [];
  const citizenIdClean = citizenId.replace(/-/g, "").replace(/\s/g, "").trim();

  // 1. ตรวจสอบความยาว
  if (citizenIdClean.length !== 13) {
    return {
      isValid: false,
      message: `เลขบัตรต้อง 13 หลัก พบ ${citizenIdClean.length} หลัก`,
      errors: ["length_invalid"],
    };
  }

  // 2. ตรวจสอบว่าเป็นตัวเลขทั้งหมด
  if (!/^\d{13}$/.test(citizenIdClean)) {
    return {
      isValid: false,
      message: "เลขบัตรต้องเป็นตัวเลขเท่านั้น",
      errors: ["not_numeric"],
    };
  }

  // 3. ตรวจสอบ Checksum Digit
  const weights = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  let total = 0;

  for (let i = 0; i < 12; i++) {
    total += parseInt(citizenIdClean[i], 10) * weights[i];
  }

  const remainder = total % 11;
  const checkDigit = (11 - remainder) % 10;
  const actualCheckDigit = parseInt(citizenIdClean[12], 10);

  if (checkDigit !== actualCheckDigit) {
    errors.push("checksum_invalid");
  }

  // 4. ส่งผลลัพธ์
  if (errors.length > 0) {
    const errorMessages: Record<string, string> = {
      checksum_invalid: "เลขบัตรไม่ถูกต้อง (ไม่ผ่านการตรวจสอบ Checksum)",
    };

    return {
      isValid: false,
      message: "เลขบัตรไม่ถูกต้อง",
      errors,
      details: errors.map((e) => errorMessages[e] || e),
    };
  }

  return {
    isValid: true,
    message: "เลขบัตรถูกต้อง",
    errors: [],
  };
}

/**
 * ใช้ใน React Component
 */
export function useThaiIDValidation(citizenId: string) {
  return validateThaiID(citizenId);
}

// ===== Test Cases =====
if (typeof window === "undefined") {
  // Running in Node.js (for testing)
  const testCases = [
    ["1234567890123", "Valid format (example)"],
    ["1234567890120", "Invalid checksum"],
    ["12345678901", "Too short"],
    ["123456789012A", "Contains letter"],
    ["1234569012345", "Invalid month (90)"],
  ];

  console.log("=== Thai ID Validation Test ===\n");
  testCases.forEach(([id, desc]) => {
    const result = validateThaiID(id as string);
    console.log(`${desc}`);
    console.log(`ID: ${id}`);
    console.log(`Valid: ${result.isValid}`);
    console.log(`Message: ${result.message}`);
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.join(", ")}`);
    }
    console.log("");
  });
}