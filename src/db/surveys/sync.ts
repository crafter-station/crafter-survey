import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  surveyAnswers,
  surveyQuestionOptions,
  surveyQuestions,
  surveySections,
  surveys,
  surveyVersions,
} from "@/db/schema";
import type {
  SurveyDefinition,
  SurveyOptionDefinition,
  SurveyQuestionDefinition,
  SurveySectionDefinition,
} from "@/types/survey";

type SurveyOpKind =
  | "create-survey"
  | "update-survey"
  | "create-version"
  | "update-version"
  | "create-section"
  | "update-section"
  | "reorder-section"
  | "delete-section"
  | "create-question"
  | "update-question"
  | "move-question"
  | "reorder-question"
  | "delete-question"
  | "create-option"
  | "update-option"
  | "reorder-option"
  | "delete-option";

export interface SurveyPlanOperation {
  kind: SurveyOpKind;
  message: string;
  analyticsKey?: string;
  destructive?: boolean;
  risky?: boolean;
}

interface DbSurveyBundle {
  survey: typeof surveys.$inferSelect;
  versions: Array<typeof surveyVersions.$inferSelect>;
  activeVersion: typeof surveyVersions.$inferSelect | null;
  sections: Array<
    typeof surveySections.$inferSelect & {
      questions: Array<
        typeof surveyQuestions.$inferSelect & {
          options: Array<typeof surveyQuestionOptions.$inferSelect>;
        }
      >;
    }
  >;
}

type DbSection = DbSurveyBundle["sections"][number];
type DbQuestion = DbSection["questions"][number];
type DbOption = DbQuestion["options"][number];

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeJson(entry)]),
    );
  }

  return value ?? null;
}

function jsonEquals(left: unknown, right: unknown) {
  return (
    JSON.stringify(normalizeJson(left)) === JSON.stringify(normalizeJson(right))
  );
}

function buildQuestionPayload(
  question: SurveyQuestionDefinition,
  sortOrder: number,
) {
  return {
    analyticsKey: question.analyticsKey,
    prompt: question.prompt,
    helpText: question.helpText ?? null,
    questionType: question.questionType,
    required: question.required ?? false,
    placeholder: question.placeholder ?? null,
    sortOrder,
    validationJson: (question.validation ?? null) as Record<
      string,
      unknown
    > | null,
    uiJson: (question.ui ?? null) as Record<string, unknown> | null,
    updatedAt: new Date(),
  };
}

function buildSectionPayload(
  section: SurveySectionDefinition,
  sortOrder: number,
) {
  return {
    title: section.title,
    description: section.description ?? null,
    sortOrder,
    updatedAt: new Date(),
  };
}

function buildOptionPayload(option: SurveyOptionDefinition, sortOrder: number) {
  return {
    analyticsKey: option.analyticsKey,
    label: option.label,
    helpText: option.helpText ?? null,
    sortOrder,
    metaJson: (option.meta ?? null) as Record<string, unknown> | null,
  };
}

function getNextVersionNumber(
  versions: Array<typeof surveyVersions.$inferSelect>,
) {
  return (
    versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) +
    1
  );
}

function addCreateMessages(
  operations: SurveyPlanOperation[],
  definition: SurveyDefinition,
) {
  for (const section of definition.sections) {
    operations.push({
      kind: "create-section",
      message: `CREATE SECTION ${section.key}`,
    });

    for (const question of section.questions) {
      operations.push({
        kind: "create-question",
        message: `CREATE QUESTION ${section.key}.${question.key}`,
        analyticsKey: question.analyticsKey,
      });

      for (const option of question.options ?? []) {
        operations.push({
          kind: "create-option",
          message: `CREATE OPTION ${section.key}.${question.key}.${option.key}`,
          analyticsKey: option.analyticsKey,
        });
      }
    }
  }
}

function addCreateQuestionAndOptionMessages(
  operations: SurveyPlanOperation[],
  section: SurveySectionDefinition,
) {
  for (const question of section.questions) {
    operations.push({
      kind: "create-question",
      message: `CREATE QUESTION ${section.key}.${question.key}`,
      analyticsKey: question.analyticsKey,
    });

    for (const option of question.options ?? []) {
      operations.push({
        kind: "create-option",
        message: `CREATE OPTION ${section.key}.${question.key}.${option.key}`,
        analyticsKey: option.analyticsKey,
      });
    }
  }
}

function createQuestionLookup(sections: DbSurveyBundle["sections"]) {
  const byAnalyticsKey = new Map<
    string,
    { section: DbSection; question: DbQuestion }
  >();
  const bySectionAndKey = new Map<string, DbQuestion>();

  for (const section of sections) {
    for (const question of section.questions) {
      if (question.analyticsKey) {
        byAnalyticsKey.set(question.analyticsKey, { section, question });
      }

      bySectionAndKey.set(`${section.key}:${question.key}`, question);
    }
  }

  return { byAnalyticsKey, bySectionAndKey };
}

function createOptionLookup(question: DbQuestion) {
  const byAnalyticsKey = new Map<string, DbOption>();
  const byKey = new Map<string, DbOption>();

  for (const option of question.options) {
    if (option.analyticsKey) {
      byAnalyticsKey.set(option.analyticsKey, option);
    }

    byKey.set(option.key, option);
  }

  return { byAnalyticsKey, byKey };
}

function validateSurveyDefinition(definition: SurveyDefinition) {
  const errors: string[] = [];
  const questionKeys = new Set<string>();
  const optionKeys = new Set<string>();

  for (const section of definition.sections) {
    for (const question of section.questions) {
      if (!question.analyticsKey) {
        errors.push(
          `Missing analyticsKey for question ${section.key}.${question.key}`,
        );
      } else if (questionKeys.has(question.analyticsKey)) {
        errors.push(
          `Duplicate question analyticsKey: ${question.analyticsKey}`,
        );
      } else {
        questionKeys.add(question.analyticsKey);
      }

      for (const option of question.options ?? []) {
        if (!option.analyticsKey) {
          errors.push(
            `Missing analyticsKey for option ${section.key}.${question.key}.${option.key}`,
          );
        } else if (optionKeys.has(option.analyticsKey)) {
          errors.push(`Duplicate option analyticsKey: ${option.analyticsKey}`);
        } else {
          optionKeys.add(option.analyticsKey);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid survey definition:\n- ${errors.join("\n- ")}`);
  }
}

export async function loadSurveyBundleBySlug(
  slug: string,
): Promise<DbSurveyBundle | null> {
  const db = getDb();

  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.slug, slug),
  });

  if (!survey) {
    return null;
  }

  const versions = await db.query.surveyVersions.findMany({
    where: eq(surveyVersions.surveyId, survey.id),
    orderBy: (table) => [desc(table.versionNumber)],
  });

  const activeVersion =
    versions.find((version) => version.status === "active") ?? null;

  if (!activeVersion) {
    return {
      survey,
      versions,
      activeVersion: null,
      sections: [],
    };
  }

  const sections = await db.query.surveySections.findMany({
    where: eq(surveySections.surveyVersionId, activeVersion.id),
    orderBy: (table) => [asc(table.sortOrder)],
    with: {
      questions: {
        orderBy: (table) => [asc(table.sortOrder)],
        with: {
          options: {
            orderBy: (table) => [asc(table.sortOrder)],
          },
        },
      },
    },
  });

  return {
    survey,
    versions,
    activeVersion,
    sections,
  };
}

export async function computeSurveyPlan(definition: SurveyDefinition) {
  validateSurveyDefinition(definition);

  const bundle = await loadSurveyBundleBySlug(definition.slug);
  const operations: SurveyPlanOperation[] = [];

  if (!bundle) {
    operations.push({
      kind: "create-survey",
      message: `CREATE SURVEY ${definition.slug}`,
    });
    operations.push({
      kind: "create-version",
      message: `PUBLISH VERSION 1 as active`,
    });
    addCreateMessages(operations, definition);

    return { bundle, operations };
  }

  const nextVersionNumber = getNextVersionNumber(bundle.versions);

  if (
    bundle.survey.title !== definition.title ||
    bundle.survey.description !== definition.description
  ) {
    operations.push({
      kind: "update-survey",
      message: `UPDATE SURVEY ${definition.slug}`,
    });
  }

  if (!bundle.activeVersion) {
    operations.push({
      kind: "create-version",
      message: `PUBLISH VERSION ${nextVersionNumber} as active`,
    });
    addCreateMessages(operations, definition);

    return { bundle, operations };
  }

  if (
    bundle.activeVersion.title !== definition.title ||
    bundle.activeVersion.description !== definition.description ||
    bundle.activeVersion.completionTitle !== definition.completionTitle ||
    bundle.activeVersion.completionDescription !==
      definition.completionDescription
  ) {
    operations.push({
      kind: "update-version",
      message: `UPDATE VERSION metadata for ${definition.slug}`,
    });
  }

  const dbSectionsByKey = new Map(
    bundle.sections.map((section) => [section.key, section]),
  );
  const questionLookup = createQuestionLookup(bundle.sections);
  const matchedQuestionIds = new Set<string>();
  const matchedOptionIds = new Set<string>();

  for (const [sectionIndex, section] of definition.sections.entries()) {
    const existingSection = dbSectionsByKey.get(section.key);

    if (!existingSection) {
      operations.push({
        kind: "create-section",
        message: `CREATE SECTION ${section.key}`,
      });
      addCreateQuestionAndOptionMessages(operations, section);
      continue;
    }

    if (
      existingSection.title !== section.title ||
      existingSection.description !== (section.description ?? null)
    ) {
      operations.push({
        kind: "update-section",
        message: `UPDATE SECTION ${section.key}`,
      });
    }

    if (existingSection.sortOrder !== sectionIndex + 1) {
      operations.push({
        kind: "reorder-section",
        message: `REORDER SECTION ${section.key} -> ${sectionIndex + 1}`,
      });
    }

    for (const [questionIndex, question] of section.questions.entries()) {
      const foundByAnalytics = questionLookup.byAnalyticsKey.get(
        question.analyticsKey,
      );
      const foundByKey = questionLookup.bySectionAndKey.get(
        `${section.key}:${question.key}`,
      );
      const existingQuestion = foundByAnalytics?.question ?? foundByKey ?? null;
      const existingQuestionSection =
        foundByAnalytics?.section ?? existingSection;

      if (!existingQuestion) {
        operations.push({
          kind: "create-question",
          message: `CREATE QUESTION ${section.key}.${question.key}`,
          analyticsKey: question.analyticsKey,
        });

        for (const option of question.options ?? []) {
          operations.push({
            kind: "create-option",
            message: `CREATE OPTION ${section.key}.${question.key}.${option.key}`,
            analyticsKey: option.analyticsKey,
          });
        }

        continue;
      }

      matchedQuestionIds.add(existingQuestion.id);

      if (existingQuestionSection.key !== section.key) {
        operations.push({
          kind: "move-question",
          message: `MOVE QUESTION ${question.analyticsKey} -> ${section.key}`,
          analyticsKey: question.analyticsKey,
        });
      }

      const questionChanged =
        existingQuestion.key !== question.key ||
        existingQuestion.prompt !== question.prompt ||
        existingQuestion.helpText !== (question.helpText ?? null) ||
        existingQuestion.questionType !== question.questionType ||
        existingQuestion.required !== (question.required ?? false) ||
        existingQuestion.placeholder !== (question.placeholder ?? null) ||
        !jsonEquals(
          existingQuestion.validationJson,
          question.validation ?? null,
        ) ||
        !jsonEquals(existingQuestion.uiJson, question.ui ?? null) ||
        existingQuestion.analyticsKey !== question.analyticsKey;

      if (questionChanged) {
        operations.push({
          kind: "update-question",
          message: `UPDATE QUESTION ${section.key}.${question.key}`,
          analyticsKey: question.analyticsKey,
          risky:
            existingQuestion.questionType !== question.questionType ||
            (existingQuestion.analyticsKey !== null &&
              existingQuestion.analyticsKey !== question.analyticsKey),
        });
      }

      if (existingQuestion.sortOrder !== questionIndex + 1) {
        operations.push({
          kind: "reorder-question",
          message: `REORDER QUESTION ${section.key}.${question.key} -> ${questionIndex + 1}`,
          analyticsKey: question.analyticsKey,
        });
      }

      const optionLookup = createOptionLookup(existingQuestion);
      const localOptions = question.options ?? [];

      for (const [optionIndex, option] of localOptions.entries()) {
        const existingOption =
          optionLookup.byAnalyticsKey.get(option.analyticsKey) ??
          optionLookup.byKey.get(option.key) ??
          null;

        if (!existingOption) {
          operations.push({
            kind: "create-option",
            message: `CREATE OPTION ${section.key}.${question.key}.${option.key}`,
            analyticsKey: option.analyticsKey,
          });
          continue;
        }

        matchedOptionIds.add(existingOption.id);

        const optionChanged =
          existingOption.key !== option.key ||
          existingOption.label !== option.label ||
          existingOption.helpText !== (option.helpText ?? null) ||
          !jsonEquals(existingOption.metaJson, option.meta ?? null) ||
          existingOption.analyticsKey !== option.analyticsKey;

        if (optionChanged) {
          operations.push({
            kind: "update-option",
            message: `UPDATE OPTION ${section.key}.${question.key}.${option.key}`,
            analyticsKey: option.analyticsKey,
          });
        }

        if (existingOption.sortOrder !== optionIndex + 1) {
          operations.push({
            kind: "reorder-option",
            message: `REORDER OPTION ${section.key}.${question.key}.${option.key} -> ${optionIndex + 1}`,
            analyticsKey: option.analyticsKey,
          });
        }
      }

      for (const option of existingQuestion.options) {
        if (!matchedOptionIds.has(option.id)) {
          operations.push({
            kind: "delete-option",
            message: `DELETE OPTION ${existingQuestionSection.key}.${existingQuestion.key}.${option.key}`,
            analyticsKey:
              option.analyticsKey ?? `${question.analyticsKey}.${option.key}`,
            destructive: true,
          });
        }
      }
    }
  }

  for (const section of bundle.sections) {
    for (const question of section.questions) {
      if (!matchedQuestionIds.has(question.id)) {
        operations.push({
          kind: "delete-question",
          message: `DELETE QUESTION ${section.key}.${question.key}`,
          analyticsKey:
            question.analyticsKey ?? `${section.key}.${question.key}`,
          destructive: true,
        });
      }
    }

    if (
      !definition.sections.some(
        (localSection) => localSection.key === section.key,
      )
    ) {
      operations.push({
        kind: "delete-section",
        message: `DELETE SECTION ${section.key}`,
        destructive: true,
      });
    }
  }

  if (operations.length > 0) {
    operations.unshift({
      kind: "create-version",
      message: `PUBLISH VERSION ${nextVersionNumber} as active`,
    });
  }

  return { bundle, operations };
}

export async function getBreakingImpactCount(
  operations: SurveyPlanOperation[],
) {
  const db = getDb();
  const affectedKeys = operations
    .filter(
      (operation) =>
        operation.analyticsKey && (operation.destructive || operation.risky),
    )
    .map((operation) => operation.analyticsKey as string);

  if (affectedKeys.length === 0) {
    return 0;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(surveyAnswers)
    .where(inArray(surveyAnswers.questionAnalyticsKeySnapshot, affectedKeys));

  return Number(count);
}

export async function publishSurveyDefinition(definition: SurveyDefinition) {
  validateSurveyDefinition(definition);

  const db = getDb();
  const bundle = await loadSurveyBundleBySlug(definition.slug);
  const now = new Date();

  let surveyId = bundle?.survey.id;

  if (!surveyId) {
    const [createdSurvey] = await db
      .insert(surveys)
      .values({
        slug: definition.slug,
        title: definition.title,
        description: definition.description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    surveyId = createdSurvey.id;
  } else {
    await db
      .update(surveys)
      .set({
        title: definition.title,
        description: definition.description,
        updatedAt: now,
      })
      .where(eq(surveys.id, surveyId));
  }

  const nextVersionNumber = getNextVersionNumber(bundle?.versions ?? []);

  const [createdVersion] = await db
    .insert(surveyVersions)
    .values({
      surveyId,
      versionNumber: nextVersionNumber,
      status: bundle?.activeVersion ? "draft" : "active",
      title: definition.title,
      description: definition.description,
      completionTitle: definition.completionTitle,
      completionDescription: definition.completionDescription,
      activatedAt: bundle?.activeVersion ? null : now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  for (const [sectionIndex, section] of definition.sections.entries()) {
    const [createdSection] = await db
      .insert(surveySections)
      .values({
        surveyVersionId: createdVersion.id,
        key: section.key,
        createdAt: now,
        ...buildSectionPayload(section, sectionIndex + 1),
      })
      .returning();

    for (const [questionIndex, question] of section.questions.entries()) {
      const [createdQuestion] = await db
        .insert(surveyQuestions)
        .values({
          surveySectionId: createdSection.id,
          key: question.key,
          createdAt: now,
          ...buildQuestionPayload(question, questionIndex + 1),
        })
        .returning();

      if (!question.options?.length) {
        continue;
      }

      await db.insert(surveyQuestionOptions).values(
        question.options.map((option, optionIndex) => ({
          questionId: createdQuestion.id,
          key: option.key,
          ...buildOptionPayload(option, optionIndex + 1),
        })),
      );
    }
  }

  if (bundle?.activeVersion) {
    await db
      .update(surveyVersions)
      .set({
        status: "archived",
        updatedAt: now,
      })
      .where(
        and(
          eq(surveyVersions.surveyId, surveyId),
          eq(surveyVersions.status, "active"),
        ),
      );

    await db
      .update(surveyVersions)
      .set({
        status: "active",
        activatedAt: now,
        updatedAt: now,
      })
      .where(eq(surveyVersions.id, createdVersion.id));
  }

  return createdVersion;
}

export function summarizeSurveyPlan(operations: SurveyPlanOperation[]) {
  return operations.map((operation) => {
    const flags = [
      operation.destructive ? "DESTRUCTIVE" : null,
      operation.risky ? "RISKY" : null,
    ]
      .filter(Boolean)
      .join(", ");

    return flags ? `${operation.message} [${flags}]` : operation.message;
  });
}
