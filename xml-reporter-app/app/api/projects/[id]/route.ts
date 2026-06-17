import { NextResponse } from "next/server";
import { loadProjectLibrary } from "@/lib/infopath";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { projects, errors } = await loadProjectLibrary();
    const selected = projects.find((project) => project.id === id);

    if (!selected) {
      return NextResponse.json(
        {
          error: "Project not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: selected,
      metadata: {
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected API error.";
    return NextResponse.json(
      {
        error: "Unable to load XML project details.",
        detail: message,
      },
      { status: 500 },
    );
  }
}
