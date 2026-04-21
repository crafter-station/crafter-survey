export type AdminFilters = {
  surveySlug: string | null;
  surveyVersionId: string | null;
  status: "all" | "draft" | "submitted";
  query: string;
  questionKey: string | null;
  page: number;
};

export function parseAdminFilters(
  searchParams:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | undefined,
): AdminFilters {
  const getValue = (key: string) => {
    if (!searchParams) {
      return null;
    }

    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }

    const value = searchParams[key];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  };

  const status = getValue("status");
  const page = Number.parseInt(getValue("page") ?? "1", 10);

  return {
    surveySlug: getValue("survey"),
    surveyVersionId: getValue("version"),
    status: status === "draft" || status === "submitted" ? status : "all",
    query: getValue("q")?.trim() ?? "",
    questionKey: getValue("question"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}
