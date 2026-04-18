import { communitySurveyDefinition } from "./community-survey";
import {
  computeSurveyPlan,
  getBreakingImpactCount,
  publishSurveyDefinition,
  summarizeSurveyPlan,
} from "./sync";

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

async function main() {
  const mode = process.argv[2] ?? "plan";
  const allowBreaking =
    hasFlag("--allow-breaking") || hasFlag("--allow-destructive");
  const yes = hasFlag("--yes");

  if (mode !== "plan" && mode !== "push") {
    throw new Error(`Unknown mode: ${mode}. Use 'plan' or 'push'.`);
  }

  const { operations } = await computeSurveyPlan(communitySurveyDefinition);
  const summary = summarizeSurveyPlan(operations);

  if (summary.length === 0) {
    console.info("No survey changes detected.");
    return;
  }

  console.info("Survey plan:");

  for (const line of summary) {
    console.info(`- ${line}`);
  }

  const hasBreakingChanges = operations.some(
    (operation) => operation.destructive || operation.risky,
  );

  if (hasBreakingChanges) {
    const impactedAnswers = await getBreakingImpactCount(operations);
    console.info(
      `\nAnalytics impact: ${impactedAnswers} answer rows may be affected.`,
    );
  }

  if (mode === "plan") {
    return;
  }

  if (hasBreakingChanges && !allowBreaking) {
    throw new Error(
      "Analytics-breaking changes detected. Re-run with --allow-breaking to publish them.",
    );
  }

  if (!yes) {
    throw new Error("Push requires explicit confirmation. Re-run with --yes.");
  }

  const version = await publishSurveyDefinition(communitySurveyDefinition);
  console.info(
    `\nSurvey push complete. Published version ${version.versionNumber}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
