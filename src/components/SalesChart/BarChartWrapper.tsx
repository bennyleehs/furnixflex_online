import dynamic from "next/dynamic";
import { BarChartProps } from "./BarChart"; // adjust the import path if needed

// Dynamically import BarChart with SSR disabled
const BarChart = dynamic(() => import("./BarChart"), {
  ssr: false,
  // loading: () => <p>Loading barchart wrapper...</p>, // optional loading fallback
  loading: () => (
    <div className="flex items-center justify-center">
      {/* <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
      <span className="ml-2">Loading barchart wrapper...</span> */}
      <div className="flex items-center justify-center space-x-1">
        {/* <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 delay-75"></div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 delay-650"></div>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 delay-1225"></div> */}
        <span className="ml-2">Loading custchart data </span>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></div>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></div>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"></div>
      </div>
    </div>
  ),
});

export default function BarChartWrapper(props: BarChartProps) {
  return <BarChart {...props} />;
}
