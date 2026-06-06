import { notFound } from "next/navigation";
import ProductForm from "../../ProductForm";
import { updateProduct, deleteProduct } from "../../actions";
import { requireCenter } from "@/lib/center";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();
  const { data: p } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("center_id", centerId)
    .single();

  if (!p) notFound();

  return (
    <ProductForm
      product={p}
      action={updateProduct.bind(null, id)}
      title="수강료 상품 수정"
      submitLabel="수정 저장"
      cancelHref="/admin/products"
      backLabel="수강료 상품"
      deleteAction={deleteProduct.bind(null, id)}
      deleteMessage={`'${p.name ?? "수강료 상품"}'을(를) 삭제할까요? 연결된 수강·청구 데이터에 영향을 줄 수 있습니다.`}
    />
  );
}
