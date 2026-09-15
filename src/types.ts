export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface ProductVariant {
  id: string; // unique variant ID (e.g., 'mattress-topper-single')
  size: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  colors: ColorSwatch[];
  variants: ProductVariant[];
  featured?: boolean;
}

export interface FilterState {
  search: string;
  category: string;
  color: string;
  availability: 'all' | 'in-stock' | 'out-of-stock';
}
