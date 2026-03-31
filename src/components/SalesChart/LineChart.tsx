import {
  Chart as ChartJS,
  Colors,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  Colors,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export interface LineChartProps {
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
  options?: object;
}

export default function LineChart({ data, title = "Sales Data", options: userOptions = {} }: LineChartProps) {
  const defaultOptions = {
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    pointRadius: 5,
    pointHoverRadius: 15,
  };

  const mergedOptions = { ...defaultOptions, ...userOptions };

  return <Line data={data} options={{ ...mergedOptions }} />;
}
