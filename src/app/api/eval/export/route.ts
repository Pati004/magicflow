import { NextResponse }      from "next/server";
import { requireAdmin }     from "@/lib/auth";
import { generateReport }   from "@/lib/eval/statistics";

// ─── GET /api/eval/export?sessionId=&format=csv|json ─────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const format    = searchParams.get("format") ?? "csv";

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Manjka sessionId" }, { status: 400 });
  }

  try {
    await requireAdmin();
    const report = await generateReport(sessionId);

    if (format === "json") {
      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          "Content-Type":        "application/json",
          "Content-Disposition": `attachment; filename="eval_${sessionId}.json"`,
        },
      });
    }

    // ─── CSV za R / SPSS ─────────────────────────────────────
    // Format: long table — ena vrstica = ena ocena
    const lines: string[] = [
      // Header
      [
        "session_id", "session_name",
        "eval_result_id", "model", "photo_id", "prompt",
        "rater_id",
        "mos_quality", "mos_style_match",
        "is_contextual", "latency_ms", "cost_usd",
        "video_url",
      ].join(","),
    ];

    for (const row of report.anovaData) {
      const rawResult = report.rawResults.find((r) => r.evalResultId === row.evalResultId);
      lines.push([
        csvEscape(report.sessionId),
        csvEscape(report.sessionName),
        csvEscape(row.evalResultId),
        csvEscape(row.model),
        csvEscape(row.photoId),
        csvEscape(row.prompt),
        csvEscape(row.raterAnonymousId),
        row.mosQuality,
        row.mosStyleMatch,
        row.isContextual ? 1 : 0,
        row.latencyMs ?? "",
        row.costUsd ?? "",
        csvEscape(rawResult?.videoUrl ?? ""),
      ].join(","));
    }

    // Dodaj povzetek modelov na dnu (R comment style)
    lines.push("");
    lines.push("# --- MODEL SUMMARY ---");
    lines.push(["# model", "n", "mean_quality", "std_quality", "mean_style", "std_style", "ci95_q_low", "ci95_q_high", "mean_latency_ms", "mean_cost_usd"].join(","));
    for (const s of report.modelStats) {
      lines.push([
        `# ${s.model}`, s.n,
        s.meanQuality, s.stdQuality,
        s.meanStyle, s.stdStyle,
        s.ciQuality95[0], s.ciQuality95[1],
        s.meanLatencyMs ?? "",
        s.meanCostUsd ?? "",
      ].join(","));
    }

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="eval_${sessionId}.csv"`,
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Napaka";
    console.error("[EVAL-EXPORT]", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
