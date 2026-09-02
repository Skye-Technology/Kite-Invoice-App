import ExcelJS from "exceljs";
import Decimal from "decimal.js";

export type TimesheetEntry = {
  date: string; // ISO yyyy-mm-dd
  project: string;
  task: string;
  notes: string;
  minutes: number;
};

/**
 * Project-name rules for composing a line description — "override" replaces the whole
 * description with fixed text (for non-billable-detail buckets like internal meetings),
 * "abbreviate" swaps the project name for a short form but keeps task/notes. Unmapped
 * projects fall back to using the raw project name, so a future timesheet with an unknown
 * project still produces a reasonable (fully editable) line rather than being blocked.
 *
 * This is a plain code constant rather than a per-company settings table for now — add
 * entries here as your own project names come up. Every generated line stays editable in the
 * invoice's line-item table after import regardless, so an unmapped or wrong mapping is
 * never a dead end.
 */
const PROJECT_RULES: { match: string; mode: "override" | "abbreviate"; value: string }[] = [];

// Invoice line items have no separate date column (see line-items-editor.tsx's Line type),
// so the entry's date is folded into the description text itself — otherwise it's silently
// dropped once a parsed row is turned into an invoice line.
export function buildLineDescription(entry: TimesheetEntry): string {
  const rule = PROJECT_RULES.find((r) => r.match === entry.project);
  if (rule?.mode === "override") return `${entry.date} - ${rule.value}`;

  const projectLabel = rule?.mode === "abbreviate" ? rule.value : entry.project;
  const notes = entry.notes.replace(/\r?\n+/g, " | ").trim();
  const parts = [entry.date, projectLabel, entry.task, notes].filter(Boolean);
  return parts.join(" - ");
}

export type TimesheetLine = {
  date: string;
  description: string;
  quantity: string;
  minutes: number;
};

/** Parses a timesheet export with Date / Project / Task-Deliverable / Additional Notes / Time in Minutes columns. */
export async function parseTimesheetXlsx(buffer: Buffer): Promise<TimesheetLine[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types target an older, non-generic Node `Buffer` shape that this
  // project's @types/node version doesn't structurally match; the value is a real Buffer
  // at runtime, so this is purely a types-version mismatch, not a real type error.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in the uploaded file.");

  const headerRow = sheet.getRow(1).values as unknown[];
  const columnIndex = (label: string) =>
    headerRow.findIndex((h) => typeof h === "string" && h.trim() === label);

  const dateCol = columnIndex("Date");
  const projectCol = columnIndex("Project");
  const taskCol = columnIndex("Task/Deliverable");
  const notesCol = columnIndex("Additional Notes");
  const minutesCol = columnIndex("Time in Minutes");

  if ([dateCol, projectCol, taskCol, minutesCol].some((i) => i < 0)) {
    throw new Error(
      "Unrecognized timesheet format — expected columns: Date, Project, Task/Deliverable, Time in Minutes."
    );
  }

  const entries: TimesheetEntry[] = [];
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex).values as unknown[];
    const rawDate = row[dateCol];
    const project = row[projectCol];
    if (!rawDate || !project) continue;

    const date =
      rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : String(rawDate).slice(0, 10);
    const minutes = Number(row[minutesCol]) || 0;

    entries.push({
      date,
      project: String(project).trim(),
      task: taskCol >= 0 ? String(row[taskCol] ?? "").trim() : "",
      notes: notesCol >= 0 ? String(row[notesCol] ?? "").trim() : "",
      minutes,
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries.map((entry) => ({
    date: entry.date,
    description: buildLineDescription(entry),
    quantity: new Decimal(entry.minutes).dividedBy(60).toFixed(2),
    minutes: entry.minutes,
  }));
}
