import React, { ReactNode } from "react";

interface SalesDataStatsProps {
  totalA: string;
  totalB: string;
  titleMonthYear: string;
  rate: string;
  levelUp?: boolean;
  levelDown?: boolean;
  children: ReactNode;
  title: string;
}

const SalesDataStats: React.FC<SalesDataStatsProps> = ({
  totalA,
  totalB,
  titleMonthYear,
  rate,
  levelUp,
  levelDown,
  children,
  title,
}) => {
  return (
    // <div className="rounded-lg border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark">
    <div className="dark:bg-boxdark bg-white">
      <div className="grid grid-cols-4 gap-4 sm:grid-cols-4">
        <div className="flex justify-center">
          <div className="bg-meta-2 dark:bg-meta-4 flex h-12 w-18 items-center justify-center rounded-xl">
            {children}
          </div>
        </div>
        <div className="col-start-2 col-end-5 sm:col-end-5">
          <div className="bg-meta-2 dark:bg-meta-4 flex h-12 w-full items-center justify-center rounded-lg pl-4">
            <h3 className="font-bold text-black dark:text-white">
              {titleMonthYear}
            </h3>
          </div>
        </div>
      </div>
      <div className="border-primary my-4 border-b-2">
        <h4 className="text-center font-bold text-black dark:text-white">
          {title}
        </h4>
      </div>

      <div className="flex items-end justify-between">
        <span className="pl-6 font-medium">
          {totalA} / {totalB}
        </span>
        <span
          className={`flex items-center gap-1 text-sm font-medium ${
            levelUp && "text-meta-3"
          } ${levelDown && "text-meta-5"} `}
        >
          {rate}

          {levelUp && (
            <svg
              className="fill-meta-3"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z"
                fill=""
              />
            </svg>
          )}
          {levelDown && (
            <svg
              className="fill-meta-5"
              width="10"
              height="11"
              viewBox="0 0 10 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.64284 7.69237L9.09102 4.33987L10 5.22362L5 10.0849L-8.98488e-07 5.22362L0.908973 4.33987L4.35716 7.69237L4.35716 0.0848701L5.64284 0.0848704L5.64284 7.69237Z"
                fill=""
              />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
};

export default SalesDataStats;
