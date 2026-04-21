import type { UIDataTypes, UIMessage, UITools } from "ai";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type SurveyQuestionType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select"
  | "email"
  | "phone";

export type SurveyResponseStatus = "draft" | "submitted";
export type SurveyPageMode =
  | "gate"
  | "survey"
  | "submitted"
  | "missing"
  | "unconfigured";

export interface SurveyOptionMeta {
  allowsText?: boolean;
}

export interface SurveyQuestionValidation {
  maxSelections?: number;
  maxLength?: number;
  minLength?: number;
}

export interface SurveyQuestionUi {
  variant?: string;
  otherInputLabel?: string;
  otherInputPlaceholder?: string;
  autoComplete?: string;
  inputMode?: string;
}

export interface SurveyOptionDefinition {
  analyticsKey: string;
  key: string;
  label: string;
  helpText?: string;
  meta?: SurveyOptionMeta;
}

export interface SurveyQuestionDefinition {
  analyticsKey: string;
  key: string;
  prompt: string;
  helpText?: string;
  questionType: SurveyQuestionType;
  required?: boolean;
  placeholder?: string;
  validation?: SurveyQuestionValidation;
  ui?: SurveyQuestionUi;
  options?: SurveyOptionDefinition[];
}

export interface SurveySectionDefinition {
  key: string;
  title: string;
  description?: string;
  questions: SurveyQuestionDefinition[];
}

export interface SurveyDefinition {
  slug: string;
  title: string;
  description: string;
  completionTitle: string;
  completionDescription: string;
  sections: SurveySectionDefinition[];
}

export interface SurveyOption {
  id: string;
  analyticsKey: string;
  key: string;
  label: string;
  helpText: string | null;
  meta: SurveyOptionMeta | null;
}

export interface SurveyQuestion {
  id: string;
  analyticsKey: string;
  key: string;
  prompt: string;
  helpText: string | null;
  questionType: SurveyQuestionType;
  required: boolean;
  placeholder: string | null;
  sortOrder: number;
  validation: SurveyQuestionValidation | null;
  ui: SurveyQuestionUi | null;
  options: SurveyOption[];
}

export interface SurveySection {
  id: string;
  key: string;
  title: string;
  description: string | null;
  sortOrder: number;
  questions: SurveyQuestion[];
}

export interface SerializedSurvey {
  surveyId: string;
  surveySlug: string;
  surveyVersionId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  completionTitle: string | null;
  completionDescription: string | null;
  sections: SurveySection[];
}

export interface SurveyGateMeta {
  surveyId: string;
  surveySlug: string;
  title: string;
  description: string | null;
}

export interface SingleSelectAnswerValue {
  choice: string | null;
  otherText?: string;
}

export interface MultiSelectAnswerValue {
  choices: string[];
  otherText?: string;
}

export type SurveyAnswerValue =
  | string
  | SingleSelectAnswerValue
  | MultiSelectAnswerValue;

export interface SerializedAnswer {
  questionId: string;
  questionAnalyticsKeySnapshot?: string | null;
  selectedOptionAnalyticsKeysSnapshot?: string[] | null;
  valueText: string | null;
  valueJson: JsonValue | null;
  clientUpdatedAt: string;
}

export interface SerializedSurveyResponse {
  id: string;
  status: SurveyResponseStatus;
  currentSectionId: string | null;
  lastSavedAt: string | null;
  submittedAt: string | null;
  answers: Record<string, SerializedAnswer>;
  chatState: SerializedSurveyChatState | null;
}

export type SurveyChatMessage = UIMessage<unknown, UIDataTypes, UITools>;

export type SurveyChatClusterStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "skipped";

export interface SurveyChatClusterState {
  status: SurveyChatClusterStatus;
  answeredQuestionIds: string[];
  unresolvedQuestionIds: string[];
}

export interface SurveyChatFormSaveEvent {
  afterMessageId: string | null;
  afterMessageIndex: number | null;
  id: string;
  source: "form";
  savedQuestionIds: string[];
  createdAt: string;
}

export interface SurveyChatMeta extends Record<string, unknown> {
  activeClusterKey: string | null;
  lastCompletedClusterKey: string | null;
  clusterStates: Record<string, SurveyChatClusterState>;
  formSaveEvents: SurveyChatFormSaveEvent[];
  skippedQuestionIds: string[];
}

export interface SerializedSurveyChatState {
  messages: SurveyChatMessage[];
  meta: SurveyChatMeta;
  updatedAt: string | null;
}

export interface SurveyPageData {
  mode: SurveyPageMode;
  gate: SurveyGateMeta | null;
  survey: SerializedSurvey | null;
  response: SerializedSurveyResponse | null;
  message: string | null;
}

export interface SaveAnswerPayload {
  questionId: string;
  valueText: string | null;
  valueJson: JsonValue | null;
  clientUpdatedAt: string;
}

export interface SaveRequestBody {
  responseId: string;
  currentSectionId: string | null;
  answers: SaveAnswerPayload[];
}

export type SurveySaveErrorCode =
  | "invalid_save_request"
  | "rate_limited"
  | "response_not_found"
  | "response_forbidden"
  | "response_submitted"
  | "save_failed";

export interface UnlockResponseBody {
  survey: SerializedSurvey;
  response: SerializedSurveyResponse;
}

export interface SaveResponseBody {
  lastSavedAt: string;
  currentSectionId: string | null;
}

export interface SaveErrorResponseBody {
  code: SurveySaveErrorCode;
  message: string;
  retryAfterSeconds?: number;
}

export interface SubmitResponseBody {
  response: SerializedSurveyResponse;
}
