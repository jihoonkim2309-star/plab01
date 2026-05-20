// SVG 아이콘 라이브러리 (사용자가 제공한 디자인 자산)
// 항목명 -> 심볼 id 매핑. 측정 항목 마스터의 emoji icon은 측정 항목 목록 화면용,
// 이 매핑은 PDF 리포트 전용.
export const ICON_ID: Record<string, string> = {
  // 신체
  키: "ic1-height",
  몸무게: "ic1-weight",
  골격근량: "ic1-muscle",
  체지방률: "ic1-fat",
  // 바디 사이즈
  어깨너비: "ic2-shoulder",
  허리둘레: "ic2-waist",
  골반둘레: "ic2-hip",
  팔길이: "ic2-arm",
  다리길이: "ic2-leg",
  // 바디 비율
  "얼굴-어깨": "ic3-face-shoulder",
  "얼굴-키": "ic3-face-height",
  "팔-키": "ic3-arm-height",
  "상하체 비율": "ic3-upper-lower",
  // 기초체력
  "제자리 멀리뛰기": "ic4-longjump",
  "수직 점프": "ic4-verticaljump",
  "20m 달리기": "ic4-run",
  // 배드민턴
  "스텝 테스트": "ic5-step",
  반응속도: "ic5-stopwatch",
  "라켓 컨트롤": "ic5-racket",
  정확도: "ic5-target",
};

export default function IconLibrary() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        {/* Section 1: Vital metrics (white-fill icons for green badge) */}
        <symbol id="ic1-height" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="6" r="2" />
            <path d="M11 8 L11 16" />
            <path d="M7 11 L15 11" />
            <path d="M11 16 L8 22 M11 16 L14 22" />
            <path d="M20 4 L20 23" />
            <path d="M20 4 L22.5 4" />
            <path d="M20 8.75 L21.7 8.75" />
            <path d="M20 13.5 L22.5 13.5" />
            <path d="M20 18.25 L21.7 18.25" />
            <path d="M20 23 L22.5 23" />
          </g>
        </symbol>

        <symbol id="ic1-weight" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="9" width="20" height="14" rx="2.5" />
            <path d="M9 16 a5 5 0 0 1 10 0" />
            <path d="M14 16 L17 13.5" />
            <circle cx="14" cy="16" r="0.6" fill="#fff" />
            <path d="M11 9 L11 6.5 L17 6.5 L17 9" />
          </g>
        </symbol>

        <symbol id="ic1-muscle" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 16 C4 13, 7 11, 11 12 C14 12.5, 17 11, 18.5 8.5 L23 10 C22 15, 18.5 17, 15 17 C15 19, 16 20.5, 18.5 22 L15.5 24 C11 23, 7.5 21, 6 18.5 C5 17.5, 4.5 17, 4 16 Z" />
            <path d="M11 12 C12 14, 13.5 16, 15 17" />
          </g>
        </symbol>

        <symbol id="ic1-fat" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 4 C14 4, 6.5 12.5, 6.5 17.5 a7.5 7.5 0 0 0 15 0 C21.5 12.5, 14 4, 14 4 Z" />
            <circle cx="11.5" cy="16" r="1.3" />
            <circle cx="16" cy="20" r="1.3" />
            <path d="M11 21 L16.5 14.5" />
          </g>
        </symbol>

        {/* Section 2: Body size (gray figure + green highlighted measurement) */}
        <symbol id="ic2-shoulder" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="7" r="2.5" />
            <path d="M10 14 C10 12, 12.5 11, 16 11 C19.5 11, 22 12, 22 14 L22 21 L10 21 Z" />
            <path d="M10 14 L8 21 M22 14 L24 21" />
          </g>
          <path
            d="M10 14 L22 14"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="10" cy="14" r="1.6" fill="#0F6E56" />
          <circle cx="22" cy="14" r="1.6" fill="#0F6E56" />
          <g fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round">
            <path d="M10 11 L10 13" />
            <path d="M22 11 L22 13" />
            <path d="M10 12 L22 12" strokeDasharray="1.8 1.5" />
          </g>
        </symbol>

        <symbol id="ic2-waist" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="5" r="2.2" />
            <path d="M11 10 C11 9, 13 8.5, 16 8.5 C19 8.5, 21 9, 21 10 L20 15" />
            <path d="M12 18 L10.5 26 M20 18 L21.5 26" />
            <path d="M12 18 L20 18" />
          </g>
          <path
            d="M12 15 L20 15 L20 18 L12 18 Z"
            fill="#0F6E56"
            opacity="0.18"
          />
          <path
            d="M12 15 C11 16, 11 17, 12 18"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 15 C21 16, 21 17, 20 18"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M5 16.5 L27 16.5"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="1.8 1.5"
          />
          <circle cx="5" cy="16.5" r="1.4" fill="#0F6E56" />
          <circle cx="27" cy="16.5" r="1.4" fill="#0F6E56" />
        </symbol>

        <symbol id="ic2-hip" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="5" r="2.2" />
            <path d="M11 10 C11 9, 13 8.5, 16 8.5 C19 8.5, 21 9, 21 10 L19.5 15 L12.5 15 Z" />
            <path d="M11.5 21 L10 26 M20.5 21 L22 26" />
          </g>
          <path
            d="M12.5 15 C10 16, 8.5 18.5, 9 21 L23 21 C23.5 18.5, 22 16, 19.5 15 Z"
            fill="#0F6E56"
            opacity="0.18"
            stroke="#0F6E56"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 19 L27 19"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="1.8 1.5"
          />
          <circle cx="5" cy="19" r="1.4" fill="#0F6E56" />
          <circle cx="27" cy="19" r="1.4" fill="#0F6E56" />
        </symbol>

        <symbol id="ic2-arm" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="6" r="2.2" />
            <path d="M8 12 C8 10.5, 10 10, 12 10 C14 10, 16 10.5, 16 12 L15 19 L9 19 Z" />
            <path d="M8 12 L6 18 L6 22" />
            <path d="M10 19 L9 26 M14 19 L15 26" />
          </g>
          <path
            d="M16 12 L21 15 L26 14"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="12" r="1.6" fill="#0F6E56" />
          <circle cx="21" cy="15" r="1.2" fill="#0F6E56" />
          <circle cx="26" cy="14" r="1.6" fill="#0F6E56" />
          <g fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round">
            <path d="M16 9 L26 11" strokeDasharray="1.8 1.5" />
            <path d="M16 9 L16 11.5" />
            <path d="M26 11 L26 12.5" />
          </g>
        </symbol>

        <symbol id="ic2-leg" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="5" r="2" />
            <path d="M12 10 C12 9, 14 8.5, 16 8.5 C18 8.5, 20 9, 20 10 L19 15 L13 15 Z" />
            <path d="M12 10 L10 14 M20 10 L22 14" />
          </g>
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13.5 15 L12 21 L11.5 26" />
            <path d="M18.5 15 L20 21 L20.5 26" />
          </g>
          <circle cx="16" cy="15" r="1.6" fill="#0F6E56" />
          <circle cx="11.5" cy="26" r="1.4" fill="#0F6E56" />
          <circle cx="20.5" cy="26" r="1.4" fill="#0F6E56" />
          <g fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round">
            <path d="M26 15 L26 26" strokeDasharray="1.8 1.5" />
            <path d="M24.5 15 L27.5 15" />
            <path d="M24.5 26 L27.5 26" />
          </g>
        </symbol>

        {/* Section 3: Body ratio (two-color comparison) */}
        <symbol id="ic3-face-shoulder" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="9" r="3.5" />
            <path d="M10 16 C10 14, 12.5 13, 16 13 C19.5 13, 22 14, 22 16 L22 23 L10 23 Z" />
            <path d="M10 16 L8 22 M22 16 L24 22" />
          </g>
          <path
            d="M12.5 9 L19.5 9"
            stroke="#5DCAA5"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="12.5" cy="9" r="1.5" fill="#5DCAA5" />
          <circle cx="19.5" cy="9" r="1.5" fill="#5DCAA5" />
          <path
            d="M10 16 L22 16"
            stroke="#0F6E56"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="10" cy="16" r="1.6" fill="#0F6E56" />
          <circle cx="22" cy="16" r="1.6" fill="#0F6E56" />
          <path
            d="M26 9 L28 9 L28 16 L26 16"
            fill="none"
            stroke="#888780"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="1.5 1.2"
          />
        </symbol>

        <symbol id="ic3-face-height" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="6" r="2.5" />
            <path d="M7 12 C7 10.5, 9 10, 11 10 C13 10, 15 10.5, 15 12 L14 18 L8 18 Z" />
            <path d="M7 12 L5 16 M15 12 L17 16" />
            <path d="M9 18 L8 26 M13 18 L14 26" />
          </g>
          <path
            d="M21 3.5 L21 8.5"
            stroke="#5DCAA5"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M19.5 3.5 L22.5 3.5"
            stroke="#5DCAA5"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M19.5 8.5 L22.5 8.5"
            stroke="#5DCAA5"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M28 3.5 L28 26"
            stroke="#0F6E56"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M26.5 3.5 L29.5 3.5"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M26.5 26 L29.5 26"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </symbol>

        <symbol id="ic3-arm-height" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="14" cy="6" r="2.2" />
            <path d="M10 11 C10 10, 12 9.5, 14 9.5 C16 9.5, 18 10, 18 11 L17 16 L11 16 Z" />
            <path d="M10 11 L8 15 L7 19" />
            <path d="M11 16 L10 24 L10 27 M17 16 L18 24 L18 27" />
          </g>
          <path
            d="M18 11 L22 14 L26 13"
            stroke="#5DCAA5"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="18" cy="11" r="1.5" fill="#5DCAA5" />
          <circle cx="26" cy="13" r="1.5" fill="#5DCAA5" />
          <path
            d="M3 3.5 L3 27"
            stroke="#0F6E56"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M1.5 3.5 L4.5 3.5"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M1.5 27 L4.5 27"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </symbol>

        <symbol id="ic3-upper-lower" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#C8C5BC"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="16" cy="5.5" r="2.2" />
          </g>
          <path
            d="M11 10.5 C11 9, 13 8.5, 16 8.5 C19 8.5, 21 9, 21 10.5 L20.5 16 L11.5 16 Z"
            fill="#0F6E56"
            opacity="0.18"
            stroke="#0F6E56"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 10.5 L9 14.5 M21 10.5 L23 14.5"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g fill="none" stroke="#0F6E56" strokeWidth="1.6" strokeLinecap="round">
            <path d="M27 5.5 L27 16" />
            <path d="M25.5 5.5 L28.5 5.5" />
            <path d="M25.5 16 L28.5 16" />
          </g>
          <path
            d="M12.5 17.5 L11 24 L13.5 24 L14.5 17.5 Z"
            fill="#5DCAA5"
            opacity="0.22"
            stroke="#5DCAA5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.5 17.5 L21 24 L18.5 24 L17.5 17.5 Z"
            fill="#5DCAA5"
            opacity="0.22"
            stroke="#5DCAA5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g fill="none" stroke="#5DCAA5" strokeWidth="1.6" strokeLinecap="round">
            <path d="M27 17.5 L27 24" />
            <path d="M25.5 17.5 L28.5 17.5" />
            <path d="M25.5 24 L28.5 24" />
          </g>
        </symbol>

        {/* Section 4: Sport silhouettes */}
        <symbol id="ic4-longjump" viewBox="0 0 32 24">
          <g fill="#0F6E56">
            <circle cx="8" cy="5" r="2" />
            <path d="M9 7 L13 9.5 L11 13 L13.5 14 L10 17 L6.5 18.5 L5 17 L7 14 L5 11 Z" />
            <path d="M9 7.5 L6 5 L5 6 L7.5 9 Z" />
          </g>
          <path
            d="M12 17 Q19 10, 27 18"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.3"
            strokeDasharray="1.8 1.5"
            strokeLinecap="round"
          />
          <g fill="none" stroke="#0F6E56" strokeWidth="1.4" strokeLinecap="round">
            <path d="M2 21 L30 21" />
            <path d="M3 19.5 L3 22.5" />
            <path d="M29 19.5 L29 22.5" />
          </g>
        </symbol>

        <symbol id="ic4-verticaljump" viewBox="0 0 28 30">
          <g fill="#0F6E56">
            <path d="M14 5 L15 1.5 L17 1.5 L16 5.5 Z" />
            <circle cx="14" cy="7" r="2" />
            <path d="M12 9.5 L16 9.5 L16.5 15 L15.5 18 L12.5 18 L11.5 15 Z" />
            <path d="M13 18 L11 21.5 L10 24 L12 24.5 L13.5 20.5 Z" />
            <path d="M15 18 L17 21.5 L18 24 L16 24.5 L14.5 20.5 Z" />
            <path d="M12 11 L9.5 13.5 L8.5 13 L11.5 10 Z" />
          </g>
          <g fill="none" stroke="#0F6E56" strokeWidth="1.4" strokeLinecap="round">
            <path d="M4 28 L24 28" />
            <path d="M5 26.5 L5 29.5" />
            <path d="M23 26.5 L23 29.5" />
          </g>
          <g fill="none" stroke="#0F6E56" strokeWidth="1.4" strokeLinecap="round">
            <path d="M3 16 L3 24" />
            <path d="M3 16 L1.5 18 M3 16 L4.5 18" />
            <path d="M3 24 L1.5 22 M3 24 L4.5 22" />
          </g>
        </symbol>

        <symbol id="ic4-run" viewBox="0 0 32 24">
          <g fill="#0F6E56">
            <circle cx="20" cy="4.5" r="2" />
            <path d="M18 6.5 L22 7 L20 13 L17 14 L15 13 L15.5 11 L18 9.5 Z" />
            <path d="M21.5 7.5 L25 9.5 L26 11.5 L24.5 12 L22.5 10.5 L20.5 9.5 Z" />
            <path d="M18 8.5 L15 7.5 L14 8.5 L17 10 Z" />
            <path d="M18 14 L21.5 17 L22.5 20 L21 20.5 L18 18 L16 15 Z" />
            <path d="M16 14 L13 17 L11 18 L11 19.5 L14 19 L17 16 Z" />
          </g>
          <g fill="none" stroke="#0F6E56" strokeWidth="1.3" strokeLinecap="round">
            <path d="M2 8 L8 8" />
            <path d="M1 12 L7 12" />
            <path d="M2 16 L6 16" />
          </g>
        </symbol>

        {/* Section 5: Badminton */}
        <symbol id="ic5-step" viewBox="0 0 28 28">
          <g fill="#0F6E56">
            <ellipse cx="9" cy="17" rx="2.5" ry="4" />
            <circle cx="7.3" cy="11.5" r="0.85" />
            <circle cx="9" cy="10.5" r="0.85" />
            <circle cx="10.7" cy="11" r="0.85" />
          </g>
          <g fill="#0F6E56">
            <ellipse cx="19" cy="13" rx="2.3" ry="3.7" transform="rotate(15 19 13)" />
            <circle cx="17.7" cy="7.7" r="0.75" />
            <circle cx="19.3" cy="7" r="0.75" />
            <circle cx="20.8" cy="7.7" r="0.75" />
          </g>
          <path
            d="M12.5 22 L15.5 19"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeDasharray="1.8 1.5"
          />
        </symbol>

        <symbol id="ic5-stopwatch" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="14" cy="16" r="8" />
            <path d="M11.5 4 L16.5 4" />
            <path d="M14 4 L14 7" />
            <path d="M21 9.5 L23 7.5" />
            <path d="M14 16 L17.5 12.5" strokeWidth="2" />
            <circle cx="14" cy="16" r="0.9" fill="#0F6E56" />
            <path d="M14 9 L14 10.2" strokeWidth="1.3" />
            <path d="M14 22 L14 20.8" strokeWidth="1.3" />
            <path d="M7 16 L8.2 16" strokeWidth="1.3" />
            <path d="M21 16 L19.8 16" strokeWidth="1.3" />
          </g>
        </symbol>

        <symbol id="ic5-racket" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse
              cx="10"
              cy="10"
              rx="5.5"
              ry="6"
              transform="rotate(-35 10 10)"
            />
            <g strokeWidth="0.7" opacity="0.7">
              <path d="M6 7 L14 13" />
              <path d="M7 4.5 L14.5 10.5" />
              <path d="M5 11 L12 15" />
              <path d="M4 13.5 L10 16" />
            </g>
            <path d="M14 13.5 L21 20.5" strokeWidth="2" />
            <path d="M20 19.5 L22.5 22" />
            <path
              d="M17 16.5 L17.5 17 M18.5 18 L19 18.5"
              strokeWidth="1"
            />
          </g>
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="23" cy="6" r="1.3" fill="#0F6E56" />
            <path d="M22.5 5 L21 3 M23 5 L22.5 2.5 M23.5 5 L24.5 3" />
          </g>
        </symbol>

        <symbol id="ic5-target" viewBox="0 0 28 28">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="13" cy="15" r="9" />
            <circle cx="13" cy="15" r="5.5" />
            <circle cx="13" cy="15" r="2.2" />
            <circle cx="13" cy="15" r="0.7" fill="#0F6E56" />
          </g>
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 15 L23 5" />
            <path d="M23 5 L20 5 L23 5 L23 8" />
            <path d="M20 5 L21 4 M20 5 L21 6" strokeWidth="1.2" />
          </g>
        </symbol>

        {/* Profile icons */}
        <symbol id="ic-name" viewBox="0 0 24 24">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="10" r="2.8" />
            <path d="M5.5 19 C6.5 16, 9 14.5, 12 14.5 C15 14.5, 17.5 16, 18.5 19" />
          </g>
        </symbol>
        <symbol id="ic-age" viewBox="0 0 24 24">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 20 L20 20 L20 12 L4 12 Z" />
            <path d="M4 15.5 C5 17, 7 17, 8 15.5 C9 14, 11 14, 12 15.5 C13 17, 15 17, 16 15.5 C17 14, 19 14, 20 15.5" />
            <path d="M12 12 L12 8" />
            <path d="M11 6.5 C11 6, 11.5 5.5, 12 6 C12.5 5.5, 13 6, 13 6.5 C13 7.5, 12 8, 12 8 C12 8, 11 7.5, 11 6.5 Z" />
          </g>
        </symbol>
        <symbol id="ic-gender" viewBox="0 0 24 24">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="10" cy="14" r="5" />
            <path d="M13.5 10.5 L20 4" />
            <path d="M15 4 L20 4 L20 9" />
          </g>
        </symbol>
        <symbol id="ic-date" viewBox="0 0 24 24">
          <g
            fill="none"
            stroke="#0F6E56"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10 L21 10" />
            <path d="M8 3 L8 7" />
            <path d="M16 3 L16 7" />
            <circle cx="12" cy="15" r="0.8" fill="#0F6E56" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}
