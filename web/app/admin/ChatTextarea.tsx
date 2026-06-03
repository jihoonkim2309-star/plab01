"use client";

import { useState } from "react";

// 채팅 톤 입력 — Enter = 전송, Shift+Enter = 줄바꿈 (카톡 패턴).
// 부모 <form> 의 server action 을 requestSubmit() 로 트리거.
// 전송 후 입력값 비우기.
export default function ChatTextarea({
  name = "body",
  placeholder = "메시지 입력",
  rows = 2,
  required = true,
}: {
  name?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  const [value, setValue] = useState("");

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form && value.trim()) {
        form.requestSubmit();
        // server action 후 페이지 redirect 로 state 리셋되지만, 즉시 UI 깨끗하게
        setValue("");
      }
    }
  }

  return (
    <textarea
      name={name}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={rows}
      required={required}
      style={{ flex: 1, resize: "none" }}
    />
  );
}
