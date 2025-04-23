// import Link from "next/link";
// interface BreadcrumbProps {
//   pageName: string;
// }
// const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
//   return (
//     <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//       <h2 className="text-title-md2 font-semibold text-black dark:text-white">
//         {pageName}
//       </h2>

//       <nav>
//         <ol className="flex items-center gap-2">
//           <li>
//             <Link className="font-medium hover:text-primary" href="/">
//               Dashboard
//             </Link>
//             &nbsp;/
//           </li>
//           <li className="font-medium text-primary">{pageName}</li>
//         </ol>
//       </nav>
//     </div>
//   );
// };

// export default Breadcrumb;

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbProps {
    pageName: string;
  }

const Breadcrumb = ({pageName}: BreadcrumbProps) => {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Page Title */}
      <h2 className="text-title-md1 font-semibold text-black dark:text-white capitalize">
        {/* {pathSegments[pathSegments.length - 1] || "Dashboard"} */}
        {pageName}
      </h2>

      {/* Breadcrumb Navigation */}
      <nav>
        <ol className="flex items-center text-gray-600 dark:text-gray-300">
          {/* Home Link */}
          {/* <li>
            <Link className="font-medium hover:text-primary" href="/">
              Dashboard
            </Link>
            <span className="mx-2">/</span>
          </li> */}

          {/* Dynamic Breadcrumbs */}
          {pathSegments.map((segment, index) => {
            const url = `/${pathSegments.slice(0, index + 1).join("/")}`;
            const isLast = index === pathSegments.length - 1;

            return (
              <li key={url} className="flex items-center">
                {!isLast ? (
                  <Link className="font-medium hover:text-primary capitalize" href={url}>
                    {decodeURIComponent(segment)}
                  </Link>
                ) : (
                  <span className="font-medium text-primary capitalize">{pageName}</span>
                )}
                {!isLast && <span className="mx-2">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
