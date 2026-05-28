import { NextRequest, NextResponse } from "next/server";
import { requireAdmin }             from "@/lib/auth";
import { collectRegressionData, datasetToCSV, R_ANALYSIS_CODE } from "@/lib/ux/regression-data";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const dataset = await collectRegressionData();

  if (format === "csv") {
    const csv = datasetToCSV(dataset);
    return new NextResponse(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="regression_t4.csv"',
      },
    });
  }

  if (format === "r") {
    return new NextResponse(R_ANALYSIS_CODE, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="analysis_t4.R"',
      },
    });
  }

  return NextResponse.json(dataset);
}
