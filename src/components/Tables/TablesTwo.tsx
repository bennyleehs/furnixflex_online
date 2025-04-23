interface TableProps {
  columns: { key: string; title: string }[]; // Defines column keys & titles
  data: Record<string, any>[]; // Rows of data
  detailTitle: string;
  rowClassName?: (row: Record<string, any>) => string;
}

export default function TablesTwo({
  columns,
  data,
  rowClassName,
  detailTitle,
}: TableProps) {
  return (
    <div className="rounded-lg border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-2">
      <div className="relative grid grid-cols-10">
        <h4 className="col-span-4 mb-6 text-xl font-semibold text-black dark:text-white">
          {detailTitle}
        </h4>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="min-w-[200px] px-2 py-4 font-medium text-black dark:text-white xl:pl-6"
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowClassName ? rowClassName(row) : ""}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="border-b border-[#eee] px-2 py-5 dark:border-strokedark xl:pl-6"
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
