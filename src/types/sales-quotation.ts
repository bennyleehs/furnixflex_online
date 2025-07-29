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
  description: string;
  price: number;
  unit: string;
  discount?: number; // Add this property (optional if not all products have a discount)
  category?: string;
  subcategory?: string;
}

// Quotation item interface
export interface QuotationItem {
  id: string;
  productId: string; // Use number for product ID
  category: string;
  subcategory: string;
  productName: string;
  description: string;
  quantity: number;
  discount: number; // Add discount field
  unit: string;
  unitPrice: number;
  total: number;
  note: string;
}

// Quotation interface
export interface Quotation {
  id: string;
  task_id: string;
  customer_name: string;
  customer_nric: string;
  customer_contact: string;
  customer_email: string;
  customer_address: string;
  customer_property?: string; // Optional field for property
  customer_guard?: string; // Optional field for guard
  quotation_date: string;
  valid_until: string;
  installation_date: string;
  sales_representative: string;
  sales_uid: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  notes: string;
  terms: string;
  status: string;
  quote_ref: string; // New optional field
  quotation_number: string; // Optional field for quotation number
}

// Payment record interface
export interface PaymentRecord {
  id?: string;
  invoice_number: string;
  quotation_number: string;
  payment_reference?: string;
  amount_inv: number;
  balance: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at?: string;
  received?: boolean;
  received_date?: string;
}

//Terms Conditions - use for quotation page & pdf
export interface Section {
  title: string;
  content: string[];
}

export const TermsConditionsWarrantySections: Section[] = [
  {
    title: "Terms and Conditions",
    content: [
      "RM1,000 or 10% deposit upon confirmation (non-refundable; valid for 1 year).",
      "After 1 year, a new order and deposit will be required.",
      "90% payment is required before production.",
      "Production will be completed within 14 working days after receiving payment.",
      "The remaining 10% balance must be paid before installation.",
      "No changes or cancellations are allowed after production starts.",
    ],
  },
  {
    title: "Warranty Coverage",
    content: [
      "20 years for aluminium cabinet body.",
      "2 years for door colour (covers discoloration or peeling under normal indoor use).",
      "1 year for hinges, drawer slides, sink, water tap, cooker hood, cooker hob, and dishrack.",
    ],
  },
];

export const getTermsAsPlainText = (): string =>
  TermsConditionsWarrantySections
    .map(
      (section) =>
        `${section.title}\n${section.content.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    )
    .join("\n\n");
