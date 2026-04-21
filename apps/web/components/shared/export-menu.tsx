"use client";

import { Button } from "@/components/ui/button";
import { exportTable } from "@/lib/utils/export";

type Row = Record<string, string | number | boolean | null | undefined>;

export function ExportMenu({ rows, filenameBase }: { rows: Row[]; filenameBase: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => exportTable(rows, filenameBase, "csv")}>
        CSV
      </Button>
      <Button size="sm" variant="outline" onClick={() => exportTable(rows, filenameBase, "txt")}>
        TXT
      </Button>
      <Button size="sm" variant="outline" onClick={() => exportTable(rows, filenameBase, "excel")}>
        Excel
      </Button>
    </div>
  );
}
