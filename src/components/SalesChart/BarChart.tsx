import {
  Chart as ChartJS,
  Colors,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register the required Chart.js components
ChartJS.register(
  Colors,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// Define the props type
export interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
    }[];
  };
  title?: string;
  options?: object; // optional custom options
}

export default function BarChart({ data, title = "Sales Data", options: userOptions = {} }: BarChartProps) {
  // Default options (stacked, responsive, etc.)
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true },
    },
  };

  const mergedOptions = { ...defaultOptions, ...userOptions };

  return <Bar data={data} options={mergedOptions} />;
}