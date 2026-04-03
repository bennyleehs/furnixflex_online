export interface OptionItem {
  id: string | number;  // Make id required, not optional
  value: string;
  label?: string;
  idd?: string[];
  timezones?: string[];
  currencies_code?: string;
  currencies_symbol?: string;
}

export interface Column {
  title: string;
  inputType?: string;
  valueKey?: string;
  idKey?: string;
  min?: number;
  max?: number;
  options?: OptionItem[];
  defaultValue?: string;
  readOnly?: boolean;
}