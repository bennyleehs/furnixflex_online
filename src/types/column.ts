export interface Column {
    title: string;
    inputType: string;
    valueKey?: string;
    min?: number;
    max?: number;
    options?: { 
      value?: string; 
      label?: string; 
      idd?: string | string[]; 
      timezones?: string[]; 
      currencies_code?: string; 
      currencies_symbol?: string 
    }[];
  }