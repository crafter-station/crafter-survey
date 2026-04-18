import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const surveys = pgTable(
  "surveys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("surveys_slug_unique").on(table.slug)],
);

export const surveyVersions = pgTable(
  "survey_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    title: text("title").notNull(),
    description: text("description"),
    completionTitle: text("completion_title"),
    completionDescription: text("completion_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("survey_versions_survey_version_unique").on(
      table.surveyId,
      table.versionNumber,
    ),
    uniqueIndex("survey_versions_active_unique")
      .on(table.surveyId)
      .where(sql`${table.status} = 'active'`),
    index("survey_versions_status_idx").on(table.status),
  ],
);

export const surveySections = pgTable(
  "survey_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyVersionId: uuid("survey_version_id")
      .notNull()
      .references(() => surveyVersions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("survey_sections_version_key_unique").on(
      table.surveyVersionId,
      table.key,
    ),
    index("survey_sections_version_sort_idx").on(
      table.surveyVersionId,
      table.sortOrder,
    ),
  ],
);

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveySectionId: uuid("survey_section_id")
      .notNull()
      .references(() => surveySections.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    analyticsKey: text("analytics_key"),
    prompt: text("prompt").notNull(),
    helpText: text("help_text"),
    questionType: text("question_type").notNull(),
    required: boolean("required").notNull().default(false),
    placeholder: text("placeholder"),
    sortOrder: integer("sort_order").notNull(),
    validationJson: jsonb("validation_json").$type<Record<
      string,
      unknown
    > | null>(),
    uiJson: jsonb("ui_json").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("survey_questions_section_key_unique").on(
      table.surveySectionId,
      table.key,
    ),
    index("survey_questions_section_sort_idx").on(
      table.surveySectionId,
      table.sortOrder,
    ),
  ],
);

export const surveyQuestionOptions = pgTable(
  "survey_question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    analyticsKey: text("analytics_key"),
    label: text("label").notNull(),
    helpText: text("help_text"),
    sortOrder: integer("sort_order").notNull(),
    metaJson: jsonb("meta_json").$type<Record<string, unknown> | null>(),
  },
  (table) => [
    uniqueIndex("survey_question_options_question_key_unique").on(
      table.questionId,
      table.key,
    ),
    index("survey_question_options_question_sort_idx").on(
      table.questionId,
      table.sortOrder,
    ),
  ],
);

export const anonymousSessions = pgTable(
  "anonymous_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionTokenHash: text("session_token_hash").notNull(),
    fingerprintHash: text("fingerprint_hash").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("anonymous_sessions_token_unique").on(table.sessionTokenHash),
    index("anonymous_sessions_fingerprint_idx").on(table.fingerprintHash),
  ],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => anonymousSessions.id, { onDelete: "cascade" }),
    surveyVersionId: uuid("survey_version_id")
      .notNull()
      .references(() => surveyVersions.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    currentSectionId: uuid("current_section_id").references(
      () => surveySections.id,
      {
        onDelete: "set null",
      },
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSavedAt: timestamp("last_saved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("survey_responses_session_version_unique").on(
      table.sessionId,
      table.surveyVersionId,
    ),
    index("survey_responses_status_idx").on(table.status),
  ],
);

export const surveyAnswers = pgTable(
  "survey_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => surveyResponses.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    questionKeySnapshot: text("question_key_snapshot").notNull(),
    questionAnalyticsKeySnapshot: text("question_analytics_key_snapshot"),
    valueText: text("value_text"),
    valueJson: jsonb("value_json").$type<
      Record<string, unknown> | string[] | string | null
    >(),
    selectedOptionAnalyticsKeysSnapshot: jsonb(
      "selected_option_analytics_keys_snapshot",
    ).$type<string[] | null>(),
    clientUpdatedAt: timestamp("client_updated_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("survey_answers_response_question_unique").on(
      table.responseId,
      table.questionId,
    ),
    index("survey_answers_question_analytics_key_snapshot_idx").on(
      table.questionAnalyticsKeySnapshot,
    ),
  ],
);

export const surveysRelations = relations(surveys, ({ many }) => ({
  versions: many(surveyVersions),
}));

export const surveyVersionsRelations = relations(
  surveyVersions,
  ({ one, many }) => ({
    survey: one(surveys, {
      fields: [surveyVersions.surveyId],
      references: [surveys.id],
    }),
    sections: many(surveySections),
    responses: many(surveyResponses),
  }),
);

export const surveySectionsRelations = relations(
  surveySections,
  ({ one, many }) => ({
    surveyVersion: one(surveyVersions, {
      fields: [surveySections.surveyVersionId],
      references: [surveyVersions.id],
    }),
    questions: many(surveyQuestions),
    currentResponses: many(surveyResponses),
  }),
);

export const surveyQuestionsRelations = relations(
  surveyQuestions,
  ({ one, many }) => ({
    section: one(surveySections, {
      fields: [surveyQuestions.surveySectionId],
      references: [surveySections.id],
    }),
    options: many(surveyQuestionOptions),
    answers: many(surveyAnswers),
  }),
);

export const surveyQuestionOptionsRelations = relations(
  surveyQuestionOptions,
  ({ one }) => ({
    question: one(surveyQuestions, {
      fields: [surveyQuestionOptions.questionId],
      references: [surveyQuestions.id],
    }),
  }),
);

export const anonymousSessionsRelations = relations(
  anonymousSessions,
  ({ many }) => ({
    responses: many(surveyResponses),
  }),
);

export const surveyResponsesRelations = relations(
  surveyResponses,
  ({ one, many }) => ({
    session: one(anonymousSessions, {
      fields: [surveyResponses.sessionId],
      references: [anonymousSessions.id],
    }),
    surveyVersion: one(surveyVersions, {
      fields: [surveyResponses.surveyVersionId],
      references: [surveyVersions.id],
    }),
    currentSection: one(surveySections, {
      fields: [surveyResponses.currentSectionId],
      references: [surveySections.id],
    }),
    answers: many(surveyAnswers),
  }),
);

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [surveyAnswers.responseId],
    references: [surveyResponses.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
  }),
}));

export type Survey = typeof surveys.$inferSelect;
export type SurveyVersion = typeof surveyVersions.$inferSelect;
export type SurveySection = typeof surveySections.$inferSelect;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type SurveyOption = typeof surveyQuestionOptions.$inferSelect;
export type AnonymousSession = typeof anonymousSessions.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type SurveyAnswer = typeof surveyAnswers.$inferSelect;
