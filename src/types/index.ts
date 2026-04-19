export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  vendorId: string;
  vendor: Vendor;
  rating: number;
  reviewCount: number;
  stock: number;
  unit?: string;
  tags: string[];
  featured?: boolean;
  isNew?: boolean;
  city: string;
}

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  logo: string;
  cover?: string;
  description: string;
  city: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  verified: boolean;
  joinedAt: string;
  phone?: string;
  whatsapp?: string;
  categories: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  productCount: number;
  subcategories?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "airtel_money" | "moov_money" | "cash" | "card";
  paymentStatus: "pending" | "paid" | "failed";
  address: DeliveryAddress;
  createdAt: string;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  details: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  city: string;
  role: "buyer" | "seller" | "admin";
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  productId: string;
}
