import { communitySurveyDefinition } from "../surveys/community-survey";
import { computeSurveyPlan, publishSurveyDefinition } from "../surveys/sync";

async function main() {
  const { operations } = await computeSurveyPlan(communitySurveyDefinition);

  if (operations.length === 0) {
    console.info("No survey changes detected.");
    return;
  }

  const version = await publishSurveyDefinition(communitySurveyDefinition);
  console.info(
    `Published survey version ${version.versionNumber} with ${operations.length} planned operations.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
