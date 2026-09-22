import fs from "node:fs";

const raw = fs.readFileSync("./eligible-review-candidates.json", "utf8");
const start = raw.indexOf("{");
const end = raw.lastIndexOf("}");

const source = JSON.parse(raw.slice(start, end + 1));
const rows = source.results ?? [];

const output = rows
  .map((row) => {
    const proposal =
      typeof row.proposal_json === "string"
        ? JSON.parse(row.proposal_json)
        : row.proposal_json;

    const affixes = Array.isArray(proposal?.display_ko?.affixes)
      ? proposal.display_ko.affixes
      : [];

    const features = affixes
      .map((affix) => Number(affix?.value))
      .filter(Number.isFinite);

    if (!features.length) {
      return null;
    }

    return {
      itemId: String(row.id),
      features,
      label: row.status === "approved" ? 1 : 0,
      source: "admin-review",
      reviewer: String(row.reviewer_email),
      reviewedAt: row.reviewed_at,
      status: row.status,
    };
  })
  .filter(Boolean);

fs.writeFileSync(
  "./training-candidates.jsonl",
  output.map((row) => JSON.stringify(row)).join("\n") + "\n",
);

console.log({
  sourceRows: rows.length,
  exportedRows: output.length,
  approved: output.filter((row) => row.label === 1).length,
  rejected: output.filter((row) => row.label === 0).length,
});
