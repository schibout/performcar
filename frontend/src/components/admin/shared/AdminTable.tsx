"use client";

import { Inbox } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shared building blocks for the admin data tables so all of them speak the
// same visual language: airy rows, hairline dividers, soft hover, skeleton
// loading rows and a friendly empty state.

export function AdminTable({ children, className }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function AdminThead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export function AdminTh({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80",
        className,
      )}
      {...props}
    />
  );
}

export function AdminTbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border/60">{children}</tbody>;
}

export function AdminTr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("group transition-colors hover:bg-muted/40", className)} {...props} />;
}

export function AdminTd({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5", className)} {...props} />;
}

interface AdminTableStateRowProps {
  colSpan: number;
  isLoading: boolean;
  emptyLabel: string;
  /** Announced to screen readers (and asserted in tests) while skeletons show. */
  loadingLabel: string;
  loadingRows?: number;
}

// Single row covering both pending and empty states: skeleton placeholder
// rows while loading, an inbox illustration once the list is truly empty.
export function AdminTableStateRow({
  colSpan,
  isLoading,
  emptyLabel,
  loadingLabel,
  loadingRows = 3,
}: AdminTableStateRowProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: loadingRows }, (_, index) => (
          <tr key={index}>
            <td colSpan={colSpan} className="px-4 py-3.5">
              {index === 0 ? <span className="sr-only">{loadingLabel}</span> : null}
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/5" />
                </div>
              </div>
            </td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5" />
          </span>
          <span className="text-sm">{emptyLabel}</span>
        </div>
      </td>
    </tr>
  );
}
