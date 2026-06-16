"use client";

import { useState } from "react";
import { validateThaiID } from "@/lib/validateThaiID";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle } from "lucide-react";

interface CitizenIDInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export function CitizenIDInput({
  value,
  onChange,
  label = "เลขบัตรประชาชน",
  error: externalError,
}: CitizenIDInputProps) {
  const [touched, setTouched] = useState(false);

  // ตรวจสอบเลขบัตร
  const validation = value ? validateThaiID(value) : null;

  // ส่วน error message
  const hasError = !validation?.isValid && touched;
  const errorMessage = hasError
    ? validation?.details?.[0] || validation?.message
    : externalError;

  // Format input (auto-hyphen)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ""); // เอาตัวอักษรออก

    // Format: XXXXXXXXX-XX (13 หลัก)
    if (input.length > 9) {
      input = input.slice(0, 9) + "-" + input.slice(9, 13);
    }

    onChange(input);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
      </label>

      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="123456789-0123"
          maxLength={14} // 13 หลัก + 1 hyphen
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          className={`
            bg-slate-50 h-11 focus-visible:ring-emerald-500
            ${
              hasError
                ? "border-red-400 focus-visible:ring-red-500"
                : validation?.isValid
                  ? "border-emerald-400"
                  : "border-slate-200"
            }
          `}
        />

        {/* Icon ตรวจสอบ */}
        {touched && value && (
          <div className="absolute right-3 top-3">
            {validation?.isValid ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Success Message */}
      {touched && validation?.isValid && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700">{validation.message}</p>
        </div>
      )}
    </div>
  );
}

// ===== ใช้ใน Register Component =====
// <CitizenIDInput
//   value={citizenId}
//   onChange={setCitizenId}
//   label="เลขบัตรประชาชน"
// />