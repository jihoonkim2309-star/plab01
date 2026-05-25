"use client";

import { useState } from "react";
import { formatBusinessNo, BUSINESS_NO_PLACEHOLDER } from "@/lib/business";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue" | "type"> & {
  defaultValue?: string | null;
};

// 사업자등록번호 입력 공통 컴포넌트. 자동 하이픈 (000-00-00000).
export default function BusinessNoInput({
  name,
  defaultValue,
  placeholder = BUSINESS_NO_PLACEHOLDER,
  ...rest
}: Props) {
  const [value, setValue] = useState(formatBusinessNo(defaultValue));
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      name={name}
      value={value}
      onChange={(e) => setValue(formatBusinessNo(e.target.value))}
      placeholder={placeholder}
      maxLength={12}
      autoComplete="off"
    />
  );
}
