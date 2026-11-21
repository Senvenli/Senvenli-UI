import { Tracker } from "@senvenli/react/charts";

// Dates as ISO strings work as well as CalendarDate values.
const RUNS = [
  { date: "2026-03-09", status: "passed" },
  { date: "2026-03-10", status: "passed" },
  { date: "2026-03-11", status: "failed", tooltip: "Export timed out after 30 minutes" },
  { date: "2026-03-12", status: "passed" },
  { date: "2026-03-13", status: "passed" },
  { date: "2026-03-14", status: "skipped", tooltip: "Paused for maintenance" },
  { date: "2026-03-15", status: "skipped", tooltip: "Paused for maintenance" },
  { date: "2026-03-16", status: "passed" },
  { date: "2026-03-17", status: "passed" },
  { date: "2026-03-18", status: "passed" },
];

export default function Example() {
  return (
    <Tracker
      title="Nightly order export"
      period="March 9–18, 2026"
      data={RUNS}
      summary="7 of 10 exports completed"
      statusMap={{
        passed: { tone: "success", label: "Completed" },
        failed: { tone: "danger", label: "Failed" },
        skipped: { tone: "neutral", label: "Skipped" },
      }}
    />
  );
}
