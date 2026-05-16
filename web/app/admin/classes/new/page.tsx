import Link from "next/link";
import ClassForm from "../ClassForm";
import { createClass } from "../actions";

export default function NewClassPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>클래스 생성</h1>
          <p className="subtext">
            <Link href="/admin/classes" style={{ color: "var(--muted)" }}>
              ← 클래스 목록
            </Link>
          </p>
        </div>
      </div>
      <ClassForm
        action={createClass}
        submitLabel="생성"
        cancelHref="/admin/classes"
      />
    </>
  );
}
