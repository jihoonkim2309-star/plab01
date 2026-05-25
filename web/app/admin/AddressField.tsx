"use client";

// 주소 입력 + Daum Postcode 검색 버튼 통합 컴포넌트.
// server form 안에서도 동작 (name 으로 submit). 검색 시 value 자동 채움.

import { useState } from "react";
import AddressSearch from "./AddressSearch";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> & {
  defaultValue?: string | null;
};

export default function AddressField({
  name,
  defaultValue,
  placeholder = "도로명 주소",
  required,
  ...rest
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        {...rest}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ flex: 1, minWidth: 0 }}
      />
      <AddressSearch
        onSelect={(addr) => setValue(addr)}
        className="btn"
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
      >
        주소 검색
      </AddressSearch>
    </div>
  );
}
