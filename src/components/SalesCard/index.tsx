"use client";
import LeadsConversion from "./LeadConversion";
import SalesConversion from "./SaleConversion";

export default function SalesCard() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* <div className="flex flex-col gap-9"> */}
      <LeadsConversion />
      <SalesConversion />
      {/* </div> */}
    </div>
  );
}
