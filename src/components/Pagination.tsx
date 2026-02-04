import type { ChangeEvent } from "react";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher avec ellipses
      if (currentPage <= 3) {
        // Début : 1, 2, 3, 4, ..., N
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Fin : 1, ..., N-3, N-2, N-1, N
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Milieu : 1, ..., P-1, P, P+1, ..., N
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col items-center justify-between gap-4 p-4 bg-card border-2 border-border relative sm:flex-row">
      {/* Pixel corners */}
      <div className="absolute top-0 left-0 w-3 h-3 bg-border" />
      <div className="absolute top-0 right-0 w-3 h-3 bg-border" />
      <div className="absolute bottom-0 left-0 w-3 h-3 bg-border" />
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-border" />

      <div className="flex items-center gap-3">
        <span className="text-base text-muted-foreground">
          Affichage de <span className="font-semibold text-foreground">{startItem}</span> à{" "}
          <span className="font-semibold text-foreground">{endItem}</span> sur{" "}
          <span className="font-semibold text-foreground">{totalItems}</span>
        </span>
        <label className="flex items-center gap-2 text-base">
          <span className="text-muted-foreground">Par page:</span>
          <select
            value={itemsPerPage}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageChange(1); // Réinitialiser à la page 1
            }}
            className="bg-input border-2 border-border text-foreground px-2 py-1 text-base outline-none focus:border-primary"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="bg-secondary border-2 border-border text-foreground px-3 py-1.5 text-base font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary"
          aria-label="Première page"
        >
          ««
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-secondary border-2 border-border text-foreground px-3 py-1.5 text-base font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary"
          aria-label="Page précédente"
        >
          ‹
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[2.5rem] border-2 px-3 py-1.5 text-base font-medium transition ${
                  isActive
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-secondary text-foreground hover:bg-muted"
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-secondary border-2 border-border text-foreground px-3 py-1.5 text-base font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary"
          aria-label="Page suivante"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="bg-secondary border-2 border-border text-foreground px-3 py-1.5 text-base font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary"
          aria-label="Dernière page"
        >
          »»
        </button>
      </div>
    </div>
  );
}
