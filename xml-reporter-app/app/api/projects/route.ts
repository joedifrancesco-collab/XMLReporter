import { NextResponse } from "next/server";
import { loadProjectLibrary } from "@/lib/infopath";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim() ?? "";

    const { projects, errors, directory } = await loadProjectLibrary();
    const filtered = !query
      ? projects
      : projects.filter((project) => {
          return (
            project.projectTitle.toLowerCase().includes(query) ||
            project.projectNumber.toLowerCase().includes(query) ||
            project.location.toLowerCase().includes(query) ||
            (project.projectManager ?? "").toLowerCase().includes(query) ||
            (project.requestTypeRequired ?? "").toLowerCase().includes(query)
          );
        });

    const summaries = filtered.map((project) => ({
      id: project.id,
      fileName: project.fileName,
      projectTitle: project.projectTitle,
      location: project.location,
      projectNumber: project.projectNumber,
      requestDate: project.requestDate,
      projectManager: project.projectManager,
      totalProjectCost: project.totalProjectCost,
      requestTypeRequired: project.requestTypeRequired,
      includedInCapitalBudget: project.includedInCapitalBudget,
    }));

    return NextResponse.json({
      data: summaries,
      metadata: {
        count: summaries.length,
        directory,
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected API error.";
    return NextResponse.json(
      {
        error: "Unable to load XML project list.",
        detail: message,
      },
      { status: 500 },
    );
  }
}
