import dynamic from "next/dynamic";
import { LineChartProps } from "./LineChart";

const LineChart = dynamic(() => import("./LineChart"), {
  ssr: false,
  // loading: () => <p>Loading linechart wrapper...</p>,
  loading: () => (
    <div className="flex items-center justify-center">
      <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
      <span className="ml-2">Loading linechart wrapper...</span>
    </div>
  ),
});

export default function LineChartWrapper(props: LineChartProps) {
  return <LineChart {...props} />;
}
