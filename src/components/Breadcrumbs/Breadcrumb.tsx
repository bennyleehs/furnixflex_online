"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbProps {
  pageName: string;
  noHeader?: boolean;
}

const Breadcrumb = ({ pageName, noHeader }: BreadcrumbProps) => {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);

  return (
    <div className={noHeader ? 'inline-breadcrumb mb-4' : 'mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}>
      {!noHeader && <h2 className="mb-2 text-title-md2 font-semibold text-black dark:text-white">
        {pageName}
      </h2>}
      
      <nav>
        <ol className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
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
