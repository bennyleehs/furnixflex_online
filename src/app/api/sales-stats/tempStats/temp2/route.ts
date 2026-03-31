import { NextRequest, NextResponse } from "next/server";

type Data = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    // backgroundColor: string;
    // borderColor: string;
  }[];
};

export async function GET(req: NextRequest) {
  // Simulate fetching data from a database
  const salesData: Data = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "June",
      "July",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Sales 2022",
        data: [14400, 29050, 5440, 17330, 40030, 36211, 24554, 90033],
        // backgroundColor: 'rgb(255, 237, 38)',
        // borderColor: 'rgba(255, 237, 38, 0.5)'
      },
      {
        label: "Sales 2023",
        data: [11400, 19050, 5000, 11330, 40230, 33200, 24554, 110033],
        // backgroundColor: 'rgb(255, 237, 38)',
        // borderColor: 'rgba(255, 237, 38, 0.5)'
      },
      {
        label: "Sales 2024",
        data: [12000, 19000, 3000, 5000, 20000, 308000],
        // backgroundColor: 'rgb(53, 162, 235)',
        // borderColor: 'rgba(53, 162, 235, 0.5)'
      },
      {
        label: "Sales 2025",
        data: [15000, 10400, 0, 5550, 23000, 30500],
        // backgroundColor: 'rgb(75, 192, 192)',
        // borderColor: 'rgba(75, 192, 192, 0.5)'
      },
      {
        label: "Sales 2026",
        data: [15320, 12553],
        // backgroundColor: 'rgb(75, 192, 192)',
        // borderColor: 'rgba(75, 192, 192, 0.5)'
      },
    ],
  };

  return NextResponse.json(salesData, { status: 200 });
}
