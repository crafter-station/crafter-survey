import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  surveyAnswers,
  surveyQuestionOptions,
  surveyQuestions,
  surveys,
  surveyVersions,
} from "@/db/schema";

import { communitySurveyDefinition } from "./community-survey";

function parseSelectedOptionKeys(valueJson: unknown) {
  if (!valueJson || typeof valueJson !== "object" || Array.isArray(valueJson)) {
    return [] as string[];
  }

  if ("choice" in valueJson && typeof valueJson.choice === "string") {
    return [valueJson.choice];
  }

  if ("choices" in valueJson && Array.isArray(valueJson.choices)) {
    return valueJson.choices.filter(
      (choice): choice is string => typeof choice === "string",
    );
  }

  return [];
}

async function main() {
  const db = getDb();

  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.slug, communitySurveyDefinition.slug),
  });

  if (!survey) {
    throw new Error(`Survey not found: ${communitySurveyDefinition.slug}`);
  }

  const versions = await db.query.surveyVersions.findMany({
    where: eq(surveyVersions.surveyId, survey.id),
    with: {
      sections: {
        with: {
          questions: {
            with: {
              options: true,
            },
          },
        },
      },
    },
  });

  const questionDefinitionMap = new Map(
    communitySurveyDefinition.sections.flatMap((section) =>
      section.questions.map((question) => [
        `${section.key}:${question.key}`,
        question,
      ]),
    ),
  );

  const optionDefinitionMap = new Map(
    communitySurveyDefinition.sections.flatMap((section) =>
      section.questions.flatMap((question) =>
        (question.options ?? []).map((option) => [
          `${section.key}:${question.key}:${option.key}`,
          option,
        ]),
      ),
    ),
  );

  const now = new Date();

  for (const version of versions) {
    for (const section of version.sections) {
      for (const question of section.questions) {
        const questionDefinition = questionDefinitionMap.get(
          `${section.key}:${question.key}`,
        );

        if (
          questionDefinition &&
          question.analyticsKey !== questionDefinition.analyticsKey
        ) {
          await db
            .update(surveyQuestions)
            .set({
              analyticsKey: questionDefinition.analyticsKey,
              updatedAt: now,
            })
            .where(eq(surveyQuestions.id, question.id));
        }

        for (const option of question.options) {
          const optionDefinition = optionDefinitionMap.get(
            `${section.key}:${question.key}:${option.key}`,
          );

          if (
            optionDefinition &&
            option.analyticsKey !== optionDefinition.analyticsKey
          ) {
            await db
              .update(surveyQuestionOptions)
              .set({
                analyticsKey: optionDefinition.analyticsKey,
              })
              .where(eq(surveyQuestionOptions.id, option.id));
          }
        }
      }
    }
  }

  const answers = await db.query.surveyAnswers.findMany({
    with: {
      question: {
        with: {
          options: true,
        },
      },
    },
  });

  for (const answer of answers) {
    const selectedKeys = parseSelectedOptionKeys(answer.valueJson);
    const selectedOptionAnalyticsKeys = selectedKeys
      .map(
        (key) =>
          answer.question.options.find((option) => option.key === key)
            ?.analyticsKey,
      )
      .filter((value): value is string => Boolean(value));

    await db
      .update(surveyAnswers)
      .set({
        questionAnalyticsKeySnapshot: answer.question.analyticsKey,
        selectedOptionAnalyticsKeysSnapshot:
          selectedOptionAnalyticsKeys.length > 0
            ? selectedOptionAnalyticsKeys
            : null,
        updatedAt: now,
      })
      .where(eq(surveyAnswers.id, answer.id));
  }

  console.info("Backfilled analytics keys for survey versions and answers.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
