import type { SerializedSurvey, SurveyQuestion } from "@/types/survey";

export interface ConversationPlaybookClusterDefinition {
  key: string;
  title: string;
  intent: string;
  questionKeys: string[];
  completionQuestionKeys?: string[];
  opener: string;
  resumePrompt: string;
  followUps: string[];
}

export interface ResolvedConversationPlaybookQuestion {
  question: SurveyQuestion;
  sectionId: string;
  sectionKey: string;
  sectionTitle: string;
}

export interface ResolvedConversationPlaybookCluster
  extends ConversationPlaybookClusterDefinition {
  questions: ResolvedConversationPlaybookQuestion[];
}

const COMMUNITY_SURVEY_PLAYBOOK: ConversationPlaybookClusterDefinition[] = [
  {
    key: "introduction",
    title: "Presentación",
    intent:
      "Romper el hielo y entender de una sola vez quién es la persona, desde dónde participa y en qué está hoy.",
    questionKeys: ["name", "country", "city", "role", "current_focus"],
    completionQuestionKeys: ["country", "city"],
    opener:
      "Hola. Voy a ayudarte a completar la encuesta. ¿Cómo te llamas, desde dónde nos escribes y en qué estás metido hoy? ¿Eres ingeniero, diseñador, founder, o algo totalmente distinto? Me encantaría conocerte un poco mejor, preséntate porfa.",
    resumePrompt:
      "Retomemos por aquí: cuéntame cómo te llamas, desde dónde nos escribes y en qué estás metido hoy.",
    followUps: [
      "Idealmente cuéntamelo junto: ciudad, país, qué haces y en qué andas ahora mismo.",
      "Si me das una mini presentación, yo me encargo de acomodarla en la encuesta.",
    ],
  },
  {
    key: "professional_snapshot",
    title: "Perfil actual",
    intent:
      "Entender a qué se dedica la persona, su background relevante y en qué está enfocada ahora mismo.",
    questionKeys: ["role", "current_focus"],
    completionQuestionKeys: ["role", "current_focus"],
    opener:
      "Buenísimo. Cuéntame un poco más de ti: ¿qué haces hoy, de dónde vienes profesionalmente y en qué estás más metido ahora mismo?",
    resumePrompt:
      "Quiero entenderte mejor: ¿qué haces hoy, de dónde vienes profesionalmente y en qué estás más metido ahora mismo?",
    followUps: [
      "¿Hoy estás más metido en trabajar para una empresa, freelancear, aprender, o construir algo tuyo?",
      "Si vienes cambiando de carrera o mezclas varias cosas, cuéntamelo con tus palabras y yo lo aterrizo.",
    ],
  },
  {
    key: "experience_followup",
    title: "Experiencia",
    intent:
      "Ubicar la etapa profesional solo si sigue sin quedar clara después del snapshot profesional.",
    questionKeys: ["experience_years"],
    completionQuestionKeys: ["experience_years"],
    opener: "¿Hace cuánto vienes en esa etapa o haciendo eso?",
    resumePrompt: "Solo me falta ubicar tu etapa: ¿hace cuánto vienes en eso?",
    followUps: [
      "Si tu caso no calza perfecto, descríbelo y lo ubicamos igual.",
    ],
  },
  {
    key: "interests",
    title: "Intereses",
    intent: "Entender qué temas mueven más a la persona en este momento.",
    questionKeys: ["interests"],
    completionQuestionKeys: ["interests"],
    opener: "¿Qué temas te tienen más metido ahora?",
    resumePrompt:
      "Quiero entender tus intereses: ¿qué temas te tienen más metido ahora?",
    followUps: [
      "Si son varios, dime los principales y yo los ordeno por detrás.",
    ],
  },
  {
    key: "crafter_entry",
    title: "Entrada a Crafter",
    intent:
      "Entender cómo llegó a Crafter Station y qué tipo de relación ha tenido recientemente.",
    questionKeys: ["discovery_source", "recent_activity"],
    completionQuestionKeys: ["discovery_source", "recent_activity"],
    opener:
      "¿Cómo llegaste a Crafter Station, y qué has hecho con nosotros últimamente, si algo?",
    resumePrompt:
      "Cuéntame cómo llegaste a Crafter Station y qué tanto te has involucrado últimamente.",
    followUps: [
      "Si fue por un evento, proyecto o referido, menciónalo con tus palabras.",
    ],
  },
  {
    key: "crafter_value",
    title: "Valor recibido",
    intent:
      "Entender a qué eventos asistió y qué fue lo más valioso para esa persona.",
    questionKeys: ["events_attended", "most_valuable"],
    completionQuestionKeys: ["events_attended", "most_valuable"],
    opener:
      "Si has ido a eventos o participado en algo, ¿qué fue y qué fue lo más valioso para ti?",
    resumePrompt:
      "Quiero entender qué te aportó Crafter hasta ahora: ¿a qué fuiste y qué te sirvió más?",
    followUps: [
      "Puede ser un evento, una persona, una idea o algo que aprendiste.",
    ],
  },
  {
    key: "event_preferences",
    title: "Preferencias de eventos",
    intent:
      "Entender a qué formatos asistiría, con qué frecuencia y qué la frena.",
    questionKeys: ["event_formats", "event_frequency", "participation_blocker"],
    completionQuestionKeys: [
      "event_formats",
      "event_frequency",
      "participation_blocker",
    ],
    opener:
      "Pensando en adelante: ¿a qué tipos de eventos sí irías, con qué frecuencia, y qué te frena más hoy?",
    resumePrompt:
      "Mirando hacia adelante, cuéntame qué formatos te interesan, cada cuánto irías y qué te frena más.",
    followUps: [
      "Responde con naturalidad; yo traduzco eso al formato del survey.",
    ],
  },
  {
    key: "closing",
    title: "Cierre",
    intent:
      "Cerrar con preferencias de contacto y cualquier detalle final que la persona quiera compartir.",
    questionKeys: ["name", "email", "phone", "final_note"],
    completionQuestionKeys: [],
    opener:
      "Y para cerrar: si quieres, puedes dejarme tu nombre, correo o teléfono, además de cualquier detalle final que quieras compartir.",
    resumePrompt:
      "Ya casi cerramos: si te nace, déjame tus datos o un último comentario.",
    followUps: ["Los datos de contacto son totalmente opcionales."],
  },
];

export function resolveConversationPlaybook(
  survey: SerializedSurvey,
): ResolvedConversationPlaybookCluster[] {
  const questionLookup = new Map<
    string,
    ResolvedConversationPlaybookQuestion
  >();

  for (const section of survey.sections) {
    for (const question of section.questions) {
      questionLookup.set(question.key, {
        question,
        sectionId: section.id,
        sectionKey: section.key,
        sectionTitle: section.title,
      });
    }
  }

  return COMMUNITY_SURVEY_PLAYBOOK.map((cluster) => ({
    ...cluster,
    questions: cluster.questionKeys
      .map((questionKey) => questionLookup.get(questionKey) ?? null)
      .filter(
        (question): question is ResolvedConversationPlaybookQuestion =>
          question !== null,
      ),
  })).filter((cluster) => cluster.questions.length > 0);
}
