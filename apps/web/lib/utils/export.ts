type Row = Record<string, string | number | boolean | null | undefined>;

function escapeCsv(value: string) {
  const v = value.replace(/"/g, '""');
  return /[",\n]/.test(v) ? `"${v}"` : v;
}

export function exportTable(rows: Row[], filenameBase: string, format: "csv" | "txt" | "excel") {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] as Row);
  if (format === "csv") {
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => escapeCsv(String(r[h] ?? ""))).join(",")
      ),
    ];
    downloadText(lines.join("\n"), `${filenameBase}.csv`, "text/csv;charset=utf-8");
    return;
  }
  if (format === "txt") {
    const lines = [
      headers.join("\t"),
      ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join("\t")),
    ];
    downloadText(lines.join("\n"), `${filenameBase}.txt`, "text/plain;charset=utf-8");
    return;
  }
  const xml = toExcelXml(headers, rows);
  downloadText(xml, `${filenameBase}.xls`, "application/vnd.ms-excel");
}

function toExcelXml(headers: string[], rows: Row[]) {
  const esc = (v: string) =>
    v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const headerCells = headers.map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("");
  const bodyRows = rows
    .map((r) => {
      const cells = headers
        .map((h) => `<Cell><Data ss:Type="String">${esc(String(r[h] ?? ""))}</Data></Cell>`)
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Data"><Table><Row>${headerCells}</Row>${bodyRows}</Table></Worksheet>
</Workbook>`;
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
