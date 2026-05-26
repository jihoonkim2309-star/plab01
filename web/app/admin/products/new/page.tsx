import ProductForm from "../ProductForm";
import { createProduct } from "../actions";

export default function NewProductPage() {
  return (
    <ProductForm
      action={createProduct}
      title="수강료 상품 생성"
      backLabel="수강료 상품"
      submitLabel="생성"
      cancelHref="/admin/products"
    />
  );
}
