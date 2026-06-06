"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitStudentLink } from "./actions";

type MaskedStudent = { id: string; masked_name: string; masked_birth: string | null };

export default function PickerForm({
  centerId,
  centerName,
}: {
  centerId: string;
  centerName: string;
}) {
  const supabase = createClient();
  const [schools, setSchools] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [students, setStudents] = useState<MaskedStudent[]>([]);
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loadingS, setLoadingS] = useState(false);
  const [loadingG, setLoadingG] = useState(false);
  const [loadingSt, setLoadingSt] = useState(false);

  useEffect(() => {
    setLoadingS(true);
    supabase.rpc("list_link_schools", { p_center_id: centerId }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) setSchools(data.map((r: { school: string }) => r.school));
      setLoadingS(false);
    });
  }, [supabase, centerId]);

  useEffect(() => {
    if (!school) {
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
        if (!error && Array.isArray(data)) setGrades(data.map((r: { grade: string }) => r.grade));
        setLoadingG(false);
      });
  }, [supabase, centerId, school]);

  useEffect(() => {
    if (!school || !grade) {
      setStudents([]);
      setStudentId("");
      return;
    }
    setLoadingSt(true);
    setStudentId("");
    supabase
      .rpc("list_link_students_masked", { p_center_id: centerId, p_school: school, p_grade: grade })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data)) setStudents(data as MaskedStudent[]);
        setLoadingSt(false);
      });
  }, [supabase, centerId, school, grade]);

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
    <form action={submitStudentLink} className="card" style={{ display: "block" }}>
      <div className="portal-field">
        <label>신청 지점</label>
        <div style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb", fontSize: 14, color: "#374151" }}>
          {centerName}
        </div>
      </div>

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
            이 지점에 등록된 학교가 없습니다. 지점에 문의해 주세요.
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
        <label>본인 *</label>
        <select required name="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!grade} style={{ ...inputStyle, background: !grade ? "#f9fafb" : "#fff" }}>
          <option value="">
            {!grade ? "학년 먼저 선택" : loadingSt ? "학생 불러오는 중..." : "본인 선택"}
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.masked_name}{s.masked_birth ? ` (${s.masked_birth})` : ""}
            </option>
          ))}
        </select>
        {!loadingSt && grade && students.length === 0 && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            해당 조건의 학생이 없습니다. 지점에 등록 여부를 문의하세요.
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn primary"
        style={{ width: "100%", marginTop: 6 }}
        disabled={!studentId}
      >
        연결 신청
      </button>
    </form>
  );
}
