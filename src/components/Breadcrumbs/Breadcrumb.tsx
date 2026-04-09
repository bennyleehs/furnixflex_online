"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbProps {
  pageName: string;
  noHeader?: boolean;
}

const ChevRight = () => (
  <svg
    className="inline-block w-4 h-4 mx-2 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const Breadcrumb = ({ pageName, noHeader }: BreadcrumbProps) => {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);

  return (
    <div className={noHeader ? 'inline-breadcrumb mb-4' : 'mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'}>
      {!noHeader && (
        <h2 className="text-lg font-semibold text-black dark:text-white">
          {pageName}
        </h2>
      )}
      
      <nav>
        <ol className="flex items-center text-gray-600 dark:text-gray-300">
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
                {!isLast && <ChevRight />}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;