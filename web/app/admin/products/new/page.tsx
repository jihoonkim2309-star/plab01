import Link from "next/link";
import ProductForm from "../ProductForm";
import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>상품 생성</h1>
          <p className="subtext">
            <Link href="/admin/products" style={{ color: "var(--muted)" }}>
              ← 수강 상품 관리
            </Link>
          </p>
        </div>
      </div>
      <ProductForm
        action={createProduct}
        submitLabel="생성"
        cancelHref="/admin/products"
      />
    </>
  );
}
