import { promises as fs } from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

export type ProjectSummary = {
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

export type ApprovalEntry = {
  stage: string;
  username: string | null;
  date: string | null;
};

export type SpendingEntry = {
  year: string;
  amount: number | null;
};

export type ProjectDetail = ProjectSummary & {
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

type ParseError = {
  file: string;
  message: string;
};

export type ProjectLoadResult = {
  directory: string;
  projects: ProjectDetail[];
  errors: ParseError[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

const approvalMappings = [
  { section: "ApprovalOriginator", stage: "Originator", userKey: "OriginatorUsername", dateKey: "OriginatorDate" },
  { section: "ApprovalDepartmentVP", stage: "Department VP", userKey: "DepartmentVPUsername", dateKey: "DepartmentVPDate" },
  { section: "ApprovalDandEVP", stage: "D&E VP", userKey: "DandEVPUsername", dateKey: "DandEVPDate" },
  { section: "ApprovalFinance", stage: "Finance", userKey: "FinanceUsername", dateKey: "FinanceDate" },
  { section: "ApprovalParkPresident", stage: "Park President", userKey: "ParkPresidentUsername", dateKey: "ParkPresidentDate" },
  { section: "ApprovalRegionalDirectorDE", stage: "Regional Director D&E", userKey: "RegionalDirectorDandEUsername", dateKey: "RegionalDirectorDandEDate" },
  { section: "ApprovalCorporateVPEandCD", stage: "Corporate VP E&CD", userKey: "CorporateVPEandCDUsername", dateKey: "CorporateVPEandCDDate" },
  { section: "ApprovalCorporateFunctionalVP", stage: "Corporate Functional VP", userKey: "CorporateDeptVPChiefUsername", dateKey: "CorporateDeptVPChiefDate" },
  { section: "ApprovalCorporateDirectorPlanning", stage: "Corporate Director Planning", userKey: "CorporateDirectorPlanningUsername", dateKey: "CorporateDirectorPlanningDate" },
  { section: "ApprovalCOO", stage: "COO", userKey: "COOUsername", dateKey: "COODate" },
  { section: "ApprovalCFO", stage: "CFO", userKey: "CFOUsername", dateKey: "CFODate" },
  { section: "ApprovalPresident", stage: "President", userKey: "PresidentUsername", dateKey: "PresidentDate" },
  { section: "ApprovalCIO", stage: "CIO", userKey: "CIOUsername", dateKey: "CIODate" },
] as const;

function valueAsString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "#text" in value) {
    return valueAsString((value as Record<string, unknown>)["#text"]);
  }
  return null;
}

function valueAsNumber(value: unknown): number | null {
  const stringValue = valueAsString(value);
  if (!stringValue) {
    return null;
  }
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function fileId(fileName: string): string {
  return encodeURIComponent(fileName);
}

function parseProjectDocument(xml: string, fileName: string): ProjectDetail {
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const root = parsed.myFields as Record<string, unknown> | undefined;
  if (!root) {
    throw new Error("Missing myFields root element.");
  }

  const formData = (root.FormData as Record<string, unknown> | undefined) ?? {};
  const approvalData = (root.ApprovalData as Record<string, unknown> | undefined) ?? {};
  const sessionData = (root.SessionData as Record<string, unknown> | undefined) ?? {};
  const sections = (sessionData.Sections as Record<string, unknown> | undefined) ?? {};
  const mainSection = (sections.MainSection as Record<string, unknown> | undefined) ?? {};

  const spendingByYear = toArray(formData.SpendingByYear as Record<string, unknown> | Record<string, unknown>[]).map(
    (entry) => ({
      year: valueAsString(entry.Year) ?? "Unknown",
      amount: valueAsNumber(entry.Amount),
    }),
  );

  const approvals: ApprovalEntry[] = approvalMappings.map((mapping) => {
    const section = (approvalData[mapping.section] as Record<string, unknown> | undefined) ?? {};
    return {
      stage: mapping.stage,
      username: valueAsString(section[mapping.userKey]),
      date: valueAsString(section[mapping.dateKey]),
    };
  });

  return {
    id: fileId(fileName),
    fileName,
    projectTitle: valueAsString(formData.ProjectTitle) ?? fileName.replace(/\.xml$/i, ""),
    location: valueAsString(formData.Location) ?? "Unknown",
    projectNumber: valueAsString(formData.ProjectNumber) ?? "Unknown",
    requestDate: valueAsString(formData.RequestDate),
    projectManager: valueAsString(formData.ProjectManager),
    totalProjectCost: valueAsNumber(formData.TotalProjectCost),
    requestTypeRequired: valueAsString(formData.RequestTypeRequired),
    includedInCapitalBudget: valueAsString(formData.IncludedInCapitalBudget),
    businessArea: valueAsString(formData.BusinessArea),
    depreciationCostCenter: valueAsString(formData.DepreciationCostCenter),
    projectType: valueAsString(formData.ProjectType),
    fundingType: valueAsString(formData.FundingType),
    currentRequest: valueAsNumber(formData.CurrentRequest),
    futureRequests: valueAsNumber(formData.FutureRequests),
    justificationReason: valueAsString(formData.JustificationReason),
    approvals,
    spendingByYear,
    narrative: {
      presentCondition: valueAsString(mainSection.PresentConditionsRichText),
      proposal: valueAsString(mainSection.ProposalRichText),
      justification: valueAsString(mainSection.JustificationRichTextBox),
      situationIfRejected: valueAsString(mainSection.SituationifRejectionRichTextBox),
    },
  };
}

export function getLibraryDirectory(): string {
  if (process.env.XML_LIBRARY_PATH) {
    return process.env.XML_LIBRARY_PATH;
  }
  return path.resolve(process.cwd(), "..");
}

export async function loadProjectLibrary(directory: string = getLibraryDirectory()): Promise<ProjectLoadResult> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const xmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xml"))
    .map((entry) => entry.name);

  const errors: ParseError[] = [];
  const projects: ProjectDetail[] = [];

  for (const fileName of xmlFiles) {
    const fullPath = path.join(directory, fileName);
    try {
      const xml = await fs.readFile(fullPath, "utf-8");
      projects.push(parseProjectDocument(xml, fileName));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parse error.";
      errors.push({ file: fileName, message });
    }
  }

  projects.sort((a, b) => {
    const firstDate = a.requestDate ?? "";
    const secondDate = b.requestDate ?? "";
    return secondDate.localeCompare(firstDate);
  });

  return {
    directory,
    projects,
    errors,
  };
}
