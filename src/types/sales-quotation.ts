// Task interface from the task system
export interface Task {
  id: number;
  name: string;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postcode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  customer_remark: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  source: string | null;
  nric: string | null;
  sales_id: number | null;
  interested: string | null;
  add_info: string | null;
  sales_name: string | null;
  sales_uid: string | null;
  // Only keep property_type and security_access
  property: string | null;
  guard: string | null;
}

// Product interfaces
export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  description?: string;
  category: string;
  subcategory: string;
}

// Quotation item interface
export interface QuotationItem {
  id: string;
  category: string;
  subcategory: string;
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  note: string;
}

// Quotation interface
export interface Quotation {
  id: string;
  task_id: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  quotationDate: string;
  validUntil: string;
  salesRepresentative: string;
  salesUID: string;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  quote_ref: string; // New optional field
  quotation_number?: string; // Optional field for quotation number
}