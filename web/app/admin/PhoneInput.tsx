"use client";

import { useState } from "react";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue" | "type"> & {
  defaultValue?: string | null;
};

// 전화번호 입력 공통 컴포넌트. server form 안에서도 동작 (name 으로 submit 됨).
// 입력 시 자동 하이픈 (010-1234-5678), placeholder 통일 (000-0000-0000).
export default function PhoneInput({
  name,
  defaultValue,
  placeholder = PHONE_PLACEHOLDER,
  ...rest
}: Props) {
  const [value, setValue] = useState(formatPhone(defaultValue));
  return (
    <input
      {...rest}
      type="tel"
      inputMode="numeric"
      name={name}
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      placeholder={placeholder}
      maxLength={13}
      autoComplete="tel"
    />
  );
}
