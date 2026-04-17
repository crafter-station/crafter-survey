import { eq } from "drizzle-orm";
import type { SurveyQuestionType } from "../../types/survey";
import { getDb } from "../client";
import {
  surveyQuestionOptions,
  surveyQuestions,
  surveySections,
  surveys,
  surveyVersions,
} from "../schema";

interface OptionSeed {
  key: string;
  label: string;
  helpText?: string;
  meta?: Record<string, unknown>;
}

interface QuestionSeed {
  key: string;
  prompt: string;
  helpText?: string;
  questionType: SurveyQuestionType;
  required?: boolean;
  placeholder?: string;
  validation?: Record<string, unknown>;
  ui?: Record<string, unknown>;
  options?: OptionSeed[];
}

interface SectionSeed {
  key: string;
  title: string;
  description?: string;
  questions: QuestionSeed[];
}

const surveyDefinition: {
  slug: string;
  title: string;
  description: string;
  completionTitle: string;
  completionDescription: string;
  sections: SectionSeed[];
} = {
  slug: "crafter-station-community-survey",
  title: "Somos 600 shippers. Ayúdanos a construir lo que sigue.",
  description:
    "En el último año pasamos de comunidad pequeña a 600 personas construyendo cosas en LatAm: devs, diseñadores, founders, gente de producto, growth, y muchas personas entrando al mundo tech desde otras carreras.\n\nQueremos que los próximos eventos, hackathons y contenidos los decidamos contigo, no adivinando.\n\n4 minutos. Anónima. Al final puedes dejar tu correo, nombre y teléfono si quieres involucrarte más directamente.\n\nThe Crafter Station team",
  completionTitle: "Gracias. En serio.",
  completionDescription:
    "En 2 semanas publicamos un resumen de lo que escuchamos y qué vamos a hacer al respecto.\n\nSi dejaste tu correo, te escribimos esta semana.\n\nThe Crafter Station team",
  sections: [
    {
      key: "contexto",
      title: "Contexto",
      description:
        "Queremos entender desde dónde estás construyendo y en qué momento profesional te encuentras.",
      questions: [
        {
          key: "country",
          prompt: "¿Desde dónde nos escribes?",
          helpText: "País",
          questionType: "single_select",
          required: true,
          ui: {
            otherInputLabel: "Otro país",
            otherInputPlaceholder: "Escribe tu país",
          },
          options: [
            { key: "peru", label: "Perú" },
            { key: "colombia", label: "Colombia" },
            { key: "mexico", label: "México" },
            { key: "argentina", label: "Argentina" },
            { key: "chile", label: "Chile" },
            { key: "espana", label: "España" },
            { key: "eeuu", label: "EE.UU." },
            {
              key: "otro",
              label: "Otro",
              meta: { allowsText: true },
            },
          ],
        },
        {
          key: "city",
          prompt: "Ciudad",
          questionType: "short_text",
          required: true,
          placeholder: "Tu ciudad",
        },
        {
          key: "role",
          prompt: "¿Qué rol describe mejor lo que haces (o quieres hacer)?",
          questionType: "single_select",
          required: true,
          ui: {
            otherInputLabel: "Otro rol",
            otherInputPlaceholder: "Cuéntanos tu rol",
          },
          options: [
            {
              key: "engineering",
              label: "Ingeniería / desarrollo de software",
            },
            { key: "design", label: "Diseño (product, UI/UX, brand)" },
            { key: "product", label: "Producto / PM" },
            { key: "growth", label: "Growth / marketing" },
            { key: "data_ai", label: "Data / ML / IA" },
            { key: "devops", label: "DevOps / infra / cloud" },
            { key: "founder", label: "Fundador / co-fundador" },
            { key: "sales", label: "Ventas / BD / partnerships" },
            { key: "ops", label: "Operaciones / finanzas / legal" },
            { key: "student", label: "Estudiante (aún decidiendo)" },
            {
              key: "career_switcher",
              label: "Vengo de otra carrera y estoy entrando a tech",
            },
            {
              key: "otro",
              label: "Otro",
              meta: { allowsText: true },
            },
          ],
        },
        {
          key: "experience_years",
          prompt: "¿Cuánto tiempo llevas en lo que haces hoy?",
          questionType: "single_select",
          required: true,
          options: [
            { key: "starting", label: "Recién empezando / aprendiendo" },
            { key: "0_2", label: "0–2 años" },
            { key: "2_5", label: "2–5 años" },
            { key: "5_10", label: "5–10 años" },
            { key: "10_plus", label: "10+ años" },
            {
              key: "not_applicable",
              label: "No aplica (soy founder, o estoy en transición, etc.)",
            },
          ],
        },
        {
          key: "current_focus",
          prompt: "¿En qué estás enfocado ahora mismo?",
          questionType: "single_select",
          required: true,
          options: [
            {
              key: "learning",
              label: "Aprendiendo / cambiando de carrera a tech",
            },
            { key: "side_projects", label: "Construyendo side projects" },
            { key: "full_time", label: "Trabajando full-time en una empresa" },
            { key: "freelancing", label: "Freelancing / consultoría" },
            {
              key: "startup",
              label: "Construyendo mi propia empresa / startup",
            },
            { key: "job_search", label: "Buscando trabajo / oportunidades" },
            { key: "between", label: "Entre cosas" },
          ],
        },
      ],
    },
    {
      key: "intereses",
      title: "Intereses",
      description:
        "Esto nos ayuda a decidir qué construir, qué enseñar y qué invitar.",
      questions: [
        {
          key: "interests",
          prompt: "¿Qué temas te interesan más ahora?",
          helpText: "Selecciona hasta 4 temas.",
          questionType: "multi_select",
          required: true,
          validation: { maxSelections: 4 },
          options: [
            { key: "ai", label: "IA / LLMs / agentes" },
            { key: "web_dev", label: "Desarrollo web (Next.js, React, etc.)" },
            { key: "backend", label: "Backend / infra / bases de datos" },
            { key: "devops", label: "DevOps / cloud" },
            { key: "mobile", label: "Mobile" },
            { key: "product_design", label: "Diseño de producto / UI/UX" },
            {
              key: "design_engineering",
              label: "Design engineering (el cruce diseño + código)",
            },
            { key: "product_pm", label: "Producto / PM / descubrimiento" },
            {
              key: "growth_distribution",
              label: "Growth / marketing / distribución",
            },
            { key: "startups", label: "Emprender / fundraising / startups" },
            {
              key: "freelancing",
              label: "Freelancing / clientes internacionales",
            },
            { key: "open_source", label: "Open source" },
            {
              key: "career_growth",
              label: "Crecimiento profesional / conseguir trabajo afuera",
            },
            { key: "sales", label: "Ventas / landing clientes" },
            {
              key: "productivity",
              label: "Herramientas de productividad / dev tools",
            },
            { key: "career_switch", label: "Entrar a tech desde otra carrera" },
          ],
        },
        {
          key: "discovery_source",
          prompt: "¿Cómo conociste Crafter Station?",
          questionType: "single_select",
          required: true,
          ui: {
            otherInputLabel: "Otro origen",
            otherInputPlaceholder: "Cuéntanos cómo llegaste",
          },
          options: [
            { key: "referral", label: "Un amigo / referido" },
            {
              key: "hackathon",
              label: "Un hackathon (SheShips, IA Hackathon Perú, etc.)",
            },
            { key: "code_brew", label: "Un Code Brew" },
            { key: "social", label: "Twitter/X o LinkedIn" },
            {
              key: "project",
              label: "Un proyecto nuestro (Lupa, Text0, etc.)",
            },
            {
              key: "otro",
              label: "Otro",
              meta: { allowsText: true },
            },
          ],
        },
      ],
    },
    {
      key: "comportamiento",
      title: "Comportamiento Real",
      description:
        "Queremos entender qué ha pasado de verdad en los últimos meses.",
      questions: [
        {
          key: "recent_activity",
          prompt: "En los últimos 3 meses, ¿qué has hecho con Crafter Station?",
          questionType: "multi_select",
          required: true,
          options: [
            {
              key: "attended_event",
              label: "Asistí a un evento (presencial u online)",
            },
            { key: "followed_content", label: "Seguí contenido / anuncios" },
            {
              key: "built_after_event",
              label:
                "Construí / shippé algo inspirado en un evento o en la comunidad",
            },
            { key: "hackathon", label: "Participé en un hackathon" },
            {
              key: "networking",
              label: "Hice networking / conocí a alguien útil",
            },
            { key: "read_chat", label: "Solo he leído el chat" },
            { key: "none_yet", label: "Nada todavía" },
          ],
        },
        {
          key: "events_attended",
          prompt:
            "¿A qué eventos nuestros has asistido en los últimos 12 meses?",
          questionType: "multi_select",
          required: true,
          ui: {
            otherInputLabel: "Otro evento",
            otherInputPlaceholder: "Escribe el evento",
          },
          options: [
            { key: "code_brew_lima", label: "Code Brew Lima" },
            { key: "code_brew_bogota", label: "Code Brew Bogotá" },
            { key: "code_brew_madrid", label: "Code Brew Madrid" },
            { key: "sheships", label: "SheShips" },
            { key: "ia_hackathon_peru", label: "IA Hackathon Perú" },
            { key: "ship_or_sink", label: "Ship or Sink" },
            { key: "none_yet", label: "Ninguno todavía" },
            {
              key: "otro",
              label: "Otro",
              meta: { allowsText: true },
            },
          ],
        },
        {
          key: "most_valuable",
          prompt:
            "¿Qué ha sido lo más valioso para ti hasta ahora en Crafter Station?",
          helpText:
            "Lo que sea: un evento, un contacto, un proyecto, algo que aprendiste, una idea que te voló la cabeza. Sé concreto.",
          questionType: "long_text",
          required: true,
          placeholder: "Cuéntanos qué fue lo más valioso",
          validation: { maxLength: 280 },
        },
      ],
    },
    {
      key: "eventos",
      title: "Eventos",
      description:
        "Esto nos ayuda a decidir qué formatos realmente deberíamos organizar.",
      questions: [
        {
          key: "event_formats",
          prompt: "¿Qué formatos realísticamente asistirías?",
          helpText: "Selecciona todos los que sí te ves asistiendo.",
          questionType: "multi_select",
          required: true,
          options: [
            {
              key: "workshops",
              label: "Workshops hands-on (construir / diseñar algo en vivo)",
            },
            {
              key: "weekend_hackathons",
              label: "Hackathons presenciales de fin de semana",
            },
            { key: "online_hackathons", label: "Hackathons online" },
            {
              key: "meetups",
              label: "Meetups / Code Brew (charlas + networking)",
            },
            {
              key: "live_building",
              label: "Live building / coding (Ship or Sink)",
            },
            {
              key: "study_groups",
              label: "Sesiones de grupo pequeño / study groups",
            },
            { key: "talks_panels", label: "Charlas / paneles" },
            { key: "async_challenges", label: "Retos async online" },
            { key: "mentorship", label: "Mentorship 1:1" },
            { key: "coworking", label: "Co-working days" },
            {
              key: "non_dev_events",
              label:
                "Eventos específicos de diseño / producto / growth (no solo código)",
            },
            {
              key: "career_switch_events",
              label: "Eventos para gente entrando a tech desde otras carreras",
            },
          ],
        },
        {
          key: "event_frequency",
          prompt: "¿Cada cuánto realísticamente asistirías a algo?",
          questionType: "single_select",
          required: true,
          options: [
            { key: "weekly", label: "Semanalmente" },
            { key: "biweekly", label: "Cada 2 semanas" },
            { key: "monthly", label: "Mensualmente" },
            {
              key: "big_only",
              label: "Solo para eventos grandes (hackathons, lanzamientos)",
            },
            { key: "content_only", label: "Prefiero contenido, no eventos" },
          ],
        },
        {
          key: "participation_blocker",
          prompt: "¿Qué es lo que más te frena para participar más?",
          questionType: "single_select",
          required: true,
          options: [
            { key: "not_my_city", label: "Los eventos no son en mi ciudad" },
            { key: "schedule", label: "Horarios / zona horaria" },
            { key: "timing", label: "No me entero a tiempo de lo que pasa" },
            { key: "topics", label: "Los temas no matchean con mis intereses" },
            {
              key: "too_junior",
              label: "Me siento muy junior / síndrome del impostor",
            },
            {
              key: "too_senior",
              label: "Soy muy senior para lo que se ofrece hoy",
            },
            {
              key: "too_dev",
              label: 'Siento que la comunidad es muy "dev" y yo no soy dev',
            },
            { key: "language", label: "Idioma" },
            { key: "lurker", label: "Prefiero ser lurker, así estoy bien" },
            { key: "nothing", label: "Nada — participo todo lo que quiero" },
          ],
        },
      ],
    },
    {
      key: "contribucion",
      title: "Contribución",
      description:
        "Nos importa saber cómo te gustaría involucrarte en los próximos meses.",
      questions: [
        {
          key: "involvement",
          prompt: "¿Cómo te gustaría involucrarte en los próximos 6 meses?",
          questionType: "multi_select",
          required: true,
          options: [
            { key: "attend_only", label: "Solo asistir" },
            {
              key: "build_with_others",
              label:
                "Construir / shippear con otros (grupos de proyecto, buildathons)",
            },
            {
              key: "give_talk",
              label: "Dar una charla o workshop sobre algo en lo que soy bueno",
            },
            {
              key: "organize_city",
              label: "Co-organizar un evento en mi ciudad",
            },
            { key: "mentor", label: "Mentorear a gente más junior" },
            {
              key: "open_source",
              label: "Contribuir a un proyecto open source de Crafter Station",
            },
            {
              key: "community_ops",
              label: "Ayudar con diseño / growth / contenido de la comunidad",
            },
            { key: "sponsors", label: "Ayudar a conseguir sponsors" },
            { key: "none_now", label: "Ninguna de las anteriores por ahora" },
          ],
        },
        {
          key: "missing_from_crafter",
          prompt:
            "¿Qué te gustaría que Crafter Station hiciera que hoy no hacemos?",
          questionType: "long_text",
          placeholder: "Tu idea o sugerencia",
          validation: { maxLength: 280 },
        },
      ],
    },
    {
      key: "cierre",
      title: "Cierre",
      description:
        "Última parte. Si quieres que te contactemos directamente, puedes dejar tus datos aquí.",
      questions: [
        {
          key: "communication_frequency",
          prompt: "¿Cada cuánto quieres saber de nosotros?",
          questionType: "single_select",
          required: true,
          options: [
            { key: "weekly", label: "Semanal" },
            { key: "biweekly", label: "Cada 2 semanas" },
            { key: "monthly", label: "Mensual" },
            { key: "big_only", label: "Solo para cosas grandes" },
            { key: "least_possible", label: "Lo menos posible" },
          ],
        },
        {
          key: "name",
          prompt: "Nombre (opcional)",
          helpText: "Si quieres que te contactemos de forma más personal.",
          questionType: "short_text",
          placeholder: "Tu nombre",
          ui: { autoComplete: "name" },
        },
        {
          key: "email",
          prompt: "Correo (opcional)",
          helpText:
            "Si nos lo dejas, podemos escribirte personalmente sobre las formas en que te gustaría involucrarte.",
          questionType: "email",
          placeholder: "tu@correo.com",
          ui: { autoComplete: "email", inputMode: "email" },
        },
        {
          key: "phone",
          prompt: "Teléfono (opcional)",
          questionType: "phone",
          placeholder: "+51 999 999 999",
          ui: { autoComplete: "tel", inputMode: "tel" },
        },
        {
          key: "final_note",
          prompt: "¿Algo más que nos quieras decir?",
          questionType: "long_text",
          placeholder: "Cualquier detalle adicional",
          validation: { maxLength: 500 },
        },
      ],
    },
  ],
};

async function main() {
  const db = getDb();

  const existingSurvey = await db.query.surveys.findFirst({
    where: eq(surveys.slug, surveyDefinition.slug),
  });

  let surveyId = existingSurvey?.id;

  if (!surveyId) {
    const [createdSurvey] = await db
      .insert(surveys)
      .values({
        slug: surveyDefinition.slug,
        title: surveyDefinition.title,
        description: surveyDefinition.description,
      })
      .returning({ id: surveys.id });

    surveyId = createdSurvey.id;
    console.info(`Created survey ${surveyDefinition.slug}`);
  } else {
    await db
      .update(surveys)
      .set({
        title: surveyDefinition.title,
        description: surveyDefinition.description,
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, surveyId));
  }

  const existingVersion = await db.query.surveyVersions.findFirst({
    where: eq(surveyVersions.surveyId, surveyId),
  });

  if (existingVersion) {
    console.info(
      `Survey version already exists for ${surveyDefinition.slug}. Seed skipped to avoid overwriting live content.`,
    );
    return;
  }

  const [createdVersion] = await db
    .insert(surveyVersions)
    .values({
      surveyId,
      versionNumber: 1,
      status: "active",
      title: surveyDefinition.title,
      description: surveyDefinition.description,
      completionTitle: surveyDefinition.completionTitle,
      completionDescription: surveyDefinition.completionDescription,
      activatedAt: new Date(),
    })
    .returning({ id: surveyVersions.id });

  const versionId = createdVersion.id;

  for (const [sectionIndex, section] of surveyDefinition.sections.entries()) {
    const [createdSection] = await db
      .insert(surveySections)
      .values({
        surveyVersionId: versionId,
        key: section.key,
        title: section.title,
        description: section.description,
        sortOrder: sectionIndex + 1,
      })
      .returning({ id: surveySections.id });

    for (const [questionIndex, question] of section.questions.entries()) {
      const [createdQuestion] = await db
        .insert(surveyQuestions)
        .values({
          surveySectionId: createdSection.id,
          key: question.key,
          prompt: question.prompt,
          helpText: question.helpText,
          questionType: question.questionType,
          required: question.required ?? false,
          placeholder: question.placeholder,
          sortOrder: questionIndex + 1,
          validationJson: question.validation ?? null,
          uiJson: question.ui ?? null,
        })
        .returning({ id: surveyQuestions.id });

      if (!question.options?.length) {
        continue;
      }

      await db.insert(surveyQuestionOptions).values(
        question.options.map((option, optionIndex) => ({
          questionId: createdQuestion.id,
          key: option.key,
          label: option.label,
          helpText: option.helpText,
          sortOrder: optionIndex + 1,
          metaJson: option.meta ?? null,
        })),
      );
    }
  }

  console.info(`Seeded survey ${surveyDefinition.slug} version 1`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
