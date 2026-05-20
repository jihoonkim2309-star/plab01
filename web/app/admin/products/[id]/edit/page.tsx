import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "../../ProductForm";
import { updateProduct, deleteProduct } from "../../actions";
import ConfirmButton from "../../../ConfirmButton";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!p) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>상품 수정</h1>
          <p className="subtext">
            <Link href="/admin/products" style={{ color: "var(--muted)" }}>
              ← 수강 상품 관리
            </Link>
          </p>
        </div>
        <div className="toolbar">
          <form action={deleteProduct.bind(null, id)}>
            <ConfirmButton
              message={`'${p.name ?? "상품"}'을(를) 삭제할까요? 연결된 수강·청구 데이터에 영향을 줄 수 있습니다.`}
              className="btn danger"
              type="submit"
            >
              삭제
            </ConfirmButton>
          </form>
        </div>
      </div>
      <ProductForm
        product={p}
        action={updateProduct.bind(null, id)}
        submitLabel="수정 저장"
        cancelHref="/admin/products"
      />
    </>
  );
}
