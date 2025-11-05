export interface Lead {
  id: string;
  originalKey: string;
  // Basic Info
  source: string;
  name: string;
  nric: string;
  status: string;
  created_at: Date;
//   updated_at: string;
  // Contact
  phone1: string;
  phone2: string;
  email: string;
  // Address
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  // Property
  property: string;
  guard: string;
  interested: string;
  add_info: string;
  // PIC
  sales_name: string;
  sales_uid: string;
  assigned_name: string;
  assigned_by: string;

  // Computed fields (for table display)
  contact?: string;
  address?: string;
  type?: string;
  pic?: string;
}