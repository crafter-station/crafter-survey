import { cookies, headers } from "next/headers";

import { SurveyExperience } from "@/components/survey/survey-experience";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { loadSurveyPageData } from "@/lib/survey/load-survey";

export default async function Home() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const initialData = await loadSurveyPageData({
    requestHeaders: headerStore,
    sessionToken: cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null,
  });

  return (
    <main className="min-h-screen overflow-hidden">
      <SurveyExperience initialData={initialData} />
    </main>
  );
}
