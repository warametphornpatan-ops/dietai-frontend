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

  // 1. ล้างข้อมูล (เอา - ออก)
  const citizenIdClean = citizenId.replace("-", "").replace(/\s/g, "").trim();

  // 2. ตรวจสอบความยาว
  if (citizenIdClean.length !== 13) {
    return {
      isValid: false,
      message: `เลขบัตรต้อง 13 หลัก พบ ${citizenIdClean.length} หลัก`,
      errors: ["length_invalid"],
    };
  }

  // 3. ตรวจสอบว่าเป็นตัวเลขทั้งหมด
  if (!/^\d{13}$/.test(citizenIdClean)) {
    return {
      isValid: false,
      message: "เลขบัตรต้องเป็นตัวเลขเท่านั้น",
      errors: ["not_numeric"],
    };
  }

  // 4. ตรวจสอบเดือน (หลักที่ 5-6, index 4-5)
  const month = parseInt(citizenIdClean.substring(4, 6), 10);
  if (month < 1 || month > 12) {
    errors.push("invalid_month");
  }

  // 5. ตรวจสอบวัน (หลักที่ 7-8, index 6-7)
  const day = parseInt(citizenIdClean.substring(6, 8), 10);
  if (day < 1 || day > 31) {
    errors.push("invalid_day");
  }

  // 6. ตรวจสอบ Checksum Digit
  const weights = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  let total = 0;

  for (let i = 0; i < 12; i++) {
    total += parseInt(citizenIdClean[i], 10) * weights[i];
  }

  const remainder = total % 11;
  const checkDigit = (11 - remainder) % 10; // ถ้า >= 10 ให้ใช้ 0
  const actualCheckDigit = parseInt(citizenIdClean[12], 10);

  if (checkDigit !== actualCheckDigit) {
    errors.push("checksum_invalid");
  }

  // 7. ส่งผลลัพธ์
  if (errors.length > 0) {
    const errorMessages: Record<string, string> = {
      invalid_month: "เดือนไม่ถูกต้อง (1-12)",
      invalid_day: "วันไม่ถูกต้อง (1-31)",
      checksum_invalid: "เลขบัตรไม่ตรงกับตัวตรวจสอบ",
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