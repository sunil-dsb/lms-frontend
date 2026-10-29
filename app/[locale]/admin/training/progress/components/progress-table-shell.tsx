"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The frame both Progress tables sit in: a card with the `.atable` header
 * rule. The columns differ per view (people vs courses) — the table chrome
 * does not, so it lives here once.
 */
export function ProgressTableShell({
  label,
  columns,
  children,
}: {
  /** What this table lists, for a screen reader. */
  label: string;
  /** Header cells, left to right. The actions cell carries its own sr-only span. */
  columns: React.ReactNode[];
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="atable min-w-[640px] w-full" aria-label={label}>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
