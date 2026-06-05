"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitParentLink } from "./actions";

type Mode = "picker" | "manual";
type MaskedStudent = { id: string; masked_name: string; masked_birth: string | null };

export default function PickerForm({
  centerId,
  centerName,
}: {
  centerId: string;
  centerName: string;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("picker");

  // picker 모드
  const [schools, setSchools] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [students, setStudents] = useState<MaskedStudent[]>([]);
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loadingS, setLoadingS] = useState(false);
  const [loadingG, setLoadingG] = useState(false);
  const [loadingSt, setLoadingSt] = useState(false);

  // manual 모드 (fallback)
  const [mName, setMName] = useState("");
  const [mSchool, setMSchool] = useState("");
  const [mGrade, setMGrade] = useState("");
  const [mBirth, setMBirth] = useState("");

  // 공용
  const [relation, setRelation] = useState("부");

  // 학교 목록 로드
  useEffect(() => {
    if (mode !== "picker") return;
    setLoadingS(true);
    supabase
      .rpc("list_link_schools", { p_center_id: centerId })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) {
          setSchools(data.map((r: { school: string }) => r.school));
        }
        setLoadingS(false);
      });
  }, [supabase, centerId, mode]);

  // 학년 목록 로드 (school 변경 시)
  useEffect(() => {
    if (mode !== "picker" || !school) {
      setGrades([]);
      setGrade("");
      return;
    }
    setLoadingG(true);
    setGrade("");
    setStudentId("");
    supabase
      .rpc("list_link_grades", { p_center_id: centerId, p_school: school })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) {
          setGrades(data.map((r: { grade: string }) => r.grade));
        }
        setLoadingG(false);
      });
  }, [supabase, centerId, school, mode]);

  // 학생 목록 로드 (grade 변경 시)
  useEffect(() => {
    if (mode !== "picker" || !school || !grade) {
      setStudents([]);
      setStudentId("");
      return;
    }
    setLoadingSt(true);
    setStudentId("");
    supabase
      .rpc("list_link_students_masked", {
        p_center_id: centerId,
        p_school: school,
        p_grade: grade,
      })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) {
          setStudents(data as MaskedStudent[]);
        }
        setLoadingSt(false);
      });
  }, [supabase, centerId, school, grade, mode]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <form action={submitParentLink} className="card" style={{ display: "block" }}>
      <input type="hidden" name="mode" value={mode} />

      <div className="portal-field">
        <label>신청 지점</label>
        <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb", fontSize: 14, color: "#374151" }}>
          {centerName}
        </div>
      </div>

      {/* 모드 토글 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {(["picker", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "8px 0",
              borderRadius: 8,
              border: mode === m ? "2px solid var(--brand, #1e794e)" : "1px solid #e5e7eb",
              background: mode === m ? "var(--brand-soft, #d8ecdf)" : "#fff",
              color: mode === m ? "var(--brand, #1e794e)" : "#374151",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {m === "picker" ? "지점 등록 학생 중 선택" : "직접 입력 (미등록 학생)"}
          </button>
        ))}
      </div>

      {mode === "picker" ? (
        <>
          <div className="portal-field">
            <label>학교 *</label>
            <select required value={school} onChange={(e) => setSchool(e.target.value)} style={inputStyle}>
              <option value="">{loadingS ? "학교 목록 불러오는 중..." : "학교 선택"}</option>
              {schools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {!loadingS && schools.length === 0 && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                이 지점에 등록된 학교가 없습니다. 직접 입력으로 전환하세요.
              </div>
            )}
          </div>

          <div className="portal-field">
            <label>학년 *</label>
            <select required value={grade} onChange={(e) => setGrade(e.target.value)} disabled={!school} style={{ ...inputStyle, background: !school ? "#f9fafb" : "#fff" }}>
              <option value="">
                {!school ? "학교 먼저 선택" : loadingG ? "학년 불러오는 중..." : "학년 선택"}
              </option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="portal-field">
            <label>자녀 *</label>
            <select required name="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!grade} style={{ ...inputStyle, background: !grade ? "#f9fafb" : "#fff" }}>
              <option value="">
                {!grade ? "학년 먼저 선택" : loadingSt ? "학생 불러오는 중..." : "자녀 선택"}
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.masked_name}{s.masked_birth ? ` (${s.masked_birth})` : ""}
                </option>
              ))}
            </select>
            {!loadingSt && grade && students.length === 0 && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                해당 조건에 등록된 학생이 없습니다. 직접 입력으로 전환하세요.
              </div>
            )}
          </div>

          <input type="hidden" name="school" value={school} />
          <input type="hidden" name="grade" value={grade} />
        </>
      ) : (
        <>
          <div className="portal-field">
            <label>학생 이름 *</label>
            <input name="name" required placeholder="예: 박도윤" value={mName} onChange={(e) => setMName(e.target.value)} style={inputStyle} />
          </div>
          <div className="portal-field">
            <label>학교 *</label>
            <input name="school" required placeholder="예: 한빛초등학교" value={mSchool} onChange={(e) => setMSchool(e.target.value)} style={inputStyle} />
          </div>
          <div className="portal-field">
            <label>학년 *</label>
            <select name="grade" required value={mGrade} onChange={(e) => setMGrade(e.target.value)} style={inputStyle}>
              <option value="">학년 선택</option>
              <option>초1</option><option>초2</option><option>초3</option>
              <option>초4</option><option>초5</option><option>초6</option>
              <option>중1</option><option>중2</option><option>중3</option>
            </select>
          </div>
          <div className="portal-field">
            <label>생년월일</label>
            <input name="birth" placeholder="YYYY-MM-DD" value={mBirth} onChange={(e) => setMBirth(e.target.value)} style={inputStyle} />
          </div>
        </>
      )}

      <div className="portal-field">
        <label>본인 관계</label>
        <select name="relation" value={relation} onChange={(e) => setRelation(e.target.value)} style={inputStyle}>
          <option>부</option>
          <option>모</option>
          <option>조부모</option>
          <option>기타 보호자</option>
        </select>
      </div>

      <button
        type="submit"
        className="btn primary"
        style={{ width: "100%", marginTop: 6 }}
        disabled={mode === "picker" && !studentId}
      >
        연결 신청
      </button>
    </form>
  );
}
