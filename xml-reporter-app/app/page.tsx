"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectSummary = {
  id: string;
  fileName: string;
  projectTitle: string;
  location: string;
  projectNumber: string;
  requestDate: string | null;
  projectManager: string | null;
  totalProjectCost: number | null;
  requestTypeRequired: string | null;
  includedInCapitalBudget: string | null;
};

type ApprovalEntry = {
  stage: string;
  username: string | null;
  date: string | null;
};

type SpendingEntry = {
  year: string;
  amount: number | null;
};

type ProjectDetail = ProjectSummary & {
  businessArea: string | null;
  depreciationCostCenter: string | null;
  projectType: string | null;
  fundingType: string | null;
  currentRequest: number | null;
  futureRequests: number | null;
  justificationReason: string | null;
  approvals: ApprovalEntry[];
  spendingByYear: SpendingEntry[];
  narrative: {
    presentCondition: string | null;
    proposal: string | null;
    justification: string | null;
    situationIfRejected: string | null;
  };
};

type ListResponse = {
  data: ProjectSummary[];
  metadata: {
    count: number;
    directory: string;
    errors: Array<{ file: string; message: string }>;
  };
};

type DetailResponse = {
  data: ProjectDetail;
  metadata: {
    errors: Array<{ file: string; message: string }>;
  };
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }
  return currencyFormatter.format(value);
}

function formatValue(value: string | null): string {
  if (!value || !value.trim()) {
    return "N/A";
  }
  return value;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [directory, setDirectory] = useState<string>("");
  const [errors, setErrors] = useState<Array<{ file: string; message: string }>>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadList() {
      setLoadingList(true);
      try {
        const searchParams = new URLSearchParams();
        if (query.trim()) {
          searchParams.set("q", query.trim());
        }
        const response = await fetch(`/api/projects?${searchParams.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load project list.");
        }
        const payload = (await response.json()) as ListResponse;
        if (!isCurrent) {
          return;
        }

        setProjects(payload.data);
        setDirectory(payload.metadata.directory);
        setErrors(payload.metadata.errors);

        if (payload.data.length === 0) {
          setSelectedId(null);
          setDetail(null);
          return;
        }

        setSelectedId((currentId) => {
          const hasCurrent = currentId && payload.data.some((item) => item.id === currentId);
          return hasCurrent ? currentId : payload.data[0].id;
        });
      } catch (error) {
        if (!isCurrent) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unexpected list load error.";
        setProjects([]);
        setErrors([{ file: "library", message }]);
      } finally {
        if (isCurrent) {
          setLoadingList(false);
        }
      }
    }

    loadList();
    return () => {
      isCurrent = false;
    };
  }, [query]);

  useEffect(() => {
    let isCurrent = true;
    const projectId = selectedId ?? "";
    if (!projectId) {
      return;
    }

    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`);
        if (!response.ok) {
          throw new Error("Failed to load project details.");
        }
        const payload = (await response.json()) as DetailResponse;
        if (isCurrent) {
          setDetail(payload.data);
        }
      } catch (error) {
        if (isCurrent) {
          const message =
            error instanceof Error ? error.message : "Unexpected detail load error.";
          setDetail(null);
          setErrors((current) => [...current, { file: projectId, message }]);
        }
      } finally {
        if (isCurrent) {
          setLoadingDetail(false);
        }
      }
    }

    loadDetail();
    return () => {
      isCurrent = false;
    };
  }, [selectedId]);

  const listTitle = useMemo(
    () => `${projects.length} project${projects.length === 1 ? "" : "s"} found`,
    [projects.length],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-6">
        <header className="rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-2xl font-semibold">InfoPath XML Reporter</h1>
          <p className="mt-1 text-sm text-slate-600">Library path: {directory || "Loading..."}</p>
        </header>

        {errors.length > 0 && (
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Some files could not be parsed:</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.slice(0, 5).map((error) => (
                <li key={`${error.file}-${error.message}`}>
                  {error.file}: {error.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[45%_55%]">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Projects</h2>
              <span className="text-sm text-slate-500">{listTitle}</span>
            </div>

            <input
              type="text"
              placeholder="Search title, project number, location, manager..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            <div className="mt-3 max-h-[60vh] overflow-auto rounded-md border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold">Project</th>
                    <th className="px-2 py-2 text-left font-semibold">Location</th>
                    <th className="px-2 py-2 text-left font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const isSelected = selectedId === project.id;
                    return (
                      <tr
                        key={project.id}
                        className={`cursor-pointer border-t border-slate-200 ${
                          isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                        onClick={() => setSelectedId(project.id)}
                      >
                        <td className="px-2 py-2">
                          <div className="font-medium">{project.projectTitle}</div>
                          <div className="text-xs text-slate-500">{project.projectNumber}</div>
                        </td>
                        <td className="px-2 py-2">{formatValue(project.location)}</td>
                        <td className="px-2 py-2">
                          {formatCurrency(project.totalProjectCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loadingList && projects.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No projects matched your search.</p>
              )}
              {loadingList && <p className="p-4 text-sm text-slate-500">Loading projects...</p>}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Project Details</h2>
            {loadingDetail && <p className="mt-3 text-sm text-slate-500">Loading details...</p>}
            {!loadingDetail && !detail && (
              <p className="mt-3 text-sm text-slate-500">
                Select a project row to view full details.
              </p>
            )}
            {detail && (
              <div className="mt-3 space-y-4 text-sm">
                <div className="grid gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-2">
                  <p>
                    <span className="font-semibold">Title:</span> {formatValue(detail.projectTitle)}
                  </p>
                  <p>
                    <span className="font-semibold">Project #:</span>{" "}
                    {formatValue(detail.projectNumber)}
                  </p>
                  <p>
                    <span className="font-semibold">Location:</span> {formatValue(detail.location)}
                  </p>
                  <p>
                    <span className="font-semibold">Manager:</span>{" "}
                    {formatValue(detail.projectManager)}
                  </p>
                  <p>
                    <span className="font-semibold">Request Date:</span>{" "}
                    {formatValue(detail.requestDate)}
                  </p>
                  <p>
                    <span className="font-semibold">Request Type:</span>{" "}
                    {formatValue(detail.requestTypeRequired)}
                  </p>
                  <p>
                    <span className="font-semibold">Funding Type:</span>{" "}
                    {formatValue(detail.fundingType)}
                  </p>
                  <p>
                    <span className="font-semibold">Project Type:</span>{" "}
                    {formatValue(detail.projectType)}
                  </p>
                  <p>
                    <span className="font-semibold">Total Cost:</span>{" "}
                    {formatCurrency(detail.totalProjectCost)}
                  </p>
                  <p>
                    <span className="font-semibold">Current Request:</span>{" "}
                    {formatCurrency(detail.currentRequest)}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Spending by Year</h3>
                  <table className="mt-1 w-full border-collapse rounded-md border border-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Year</th>
                        <th className="px-2 py-1 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.spendingByYear.map((entry) => (
                        <tr
                          key={`${entry.year}-${entry.amount}`}
                          className="border-t border-slate-200"
                        >
                          <td className="px-2 py-1">{formatValue(entry.year)}</td>
                          <td className="px-2 py-1">{formatCurrency(entry.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-semibold">Approval Chain</h3>
                  <table className="mt-1 w-full border-collapse rounded-md border border-slate-200">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Stage</th>
                        <th className="px-2 py-1 text-left">Approver</th>
                        <th className="px-2 py-1 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.approvals.map((approval) => (
                        <tr
                          key={`${approval.stage}-${approval.username}`}
                          className="border-t border-slate-200"
                        >
                          <td className="px-2 py-1">{approval.stage}</td>
                          <td className="px-2 py-1">{formatValue(approval.username)}</td>
                          <td className="px-2 py-1">{formatValue(approval.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 rounded-md bg-slate-50 p-3">
                  <h3 className="font-semibold">Narrative</h3>
                  <p>
                    <span className="font-semibold">Present Condition:</span>{" "}
                    {formatValue(detail.narrative.presentCondition)}
                  </p>
                  <p>
                    <span className="font-semibold">Proposal:</span>{" "}
                    {formatValue(detail.narrative.proposal)}
                  </p>
                  <p>
                    <span className="font-semibold">Justification:</span>{" "}
                    {formatValue(detail.narrative.justification)}
                  </p>
                  <p>
                    <span className="font-semibold">If Rejected:</span>{" "}
                    {formatValue(detail.narrative.situationIfRejected)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
