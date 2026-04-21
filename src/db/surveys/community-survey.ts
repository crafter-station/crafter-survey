import type {
	SurveyDefinition,
	SurveyOptionDefinition,
	SurveyQuestionDefinition,
} from "@/types/survey";

type LocalOptionDefinition = Omit<SurveyOptionDefinition, "analyticsKey"> & {
	analyticsKey?: string;
};

type LocalQuestionDefinition = Omit<
	SurveyQuestionDefinition,
	"analyticsKey" | "options"
> & {
	options?: LocalOptionDefinition[];
};

function question(
	analyticsKey: string,
	definition: LocalQuestionDefinition,
): SurveyQuestionDefinition {
	return {
		...definition,
		analyticsKey,
		required: false,
		options: definition.options?.map((option) => ({
			...option,
			analyticsKey: option.analyticsKey ?? `${analyticsKey}.${option.key}`,
		})),
	};
}

export const communitySurveyDefinition: SurveyDefinition = {
	slug: "crafter-station-community-survey",
	title: "Somos 600 shippers. Ayúdanos a construir lo que sigue.",
	description:
		"En un año pasamos de comunidad pequeña a 600 personas construyendo en LatAm. Ayúdanos a decidir qué sigue.\n\n2 minutos. Anónima.\n\nThe Crafter Station team",
	completionTitle: "Gracias. En serio.",
	completionDescription:
		"En 2 semanas publicamos un resumen de lo que escuchamos y qué vamos a hacer al respecto.\n\nThe Crafter Station team",
	sections: [
		// CORE SECTION 1: Quién eres
		{
			key: "quien_eres",
			title: "Quién eres",
			description:
				"Queremos entender quién es la comunidad: roles, niveles, background.",
			questions: [
				question("community.location.country", {
					key: "country",
					prompt: "¿Desde dónde nos escribes?",
					helpText: "País",
					questionType: "single_select",
					required: true,
					ui: {
						variant: "combobox",
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
				}),
				question("community.location.city", {
					key: "city",
					prompt: "Ciudad",
					questionType: "short_text",
					required: true,
					placeholder: "Tu ciudad",
				}),
				question("community.current_status", {
					key: "current_status",
					prompt: "¿Qué haces actualmente?",
					questionType: "single_select",
					required: true,
				ui: {
					variant: "combobox",
				},					options: [
						{ key: "full_time", label: "Trabajo full-time en una empresa" },
						{ key: "freelancing", label: "Freelancing / consultoría" },
						{ key: "startup", label: "Construyendo mi propia startup" },
						{ key: "student", label: "Estudiante" },
						{ key: "job_search", label: "Buscando trabajo" },
						{ key: "between", label: "Entre cosas / transición" },
					],
				}),
				question("community.role", {
					key: "role",
					prompt: "¿Qué rol describes lo que haces?",
					helpText: "Escribe tu rol específico.",
					questionType: "short_text",
					required: true,
					placeholder: "ej: design engineer, frontend dev, product designer, growth lead...",
					validation: { maxLength: 50 },
				}),
				question("community.background", {
					key: "background",
					prompt: "¿Cuál es tu background?",
					helpText: "Selecciona todos los que apliquen.",
					questionType: "multi_select",
					required: true,
					ui: {
						variant: "chips",
						showAdditionalTextInput: true,
						additionalTextPlaceholder: "Cuéntanos más",
					},
					options: [
						{ key: "cs_engineering", label: "CS / Ingeniería" },
						{ key: "bootcamp", label: "Bootcamp" },
						{ key: "self_taught", label: "Self-taught" },
						{ key: "career_switch", label: "Otra carrera" },
						{ key: "studying", label: "Estudiando ahora" },
					],
				}),
				question("community.seniority", {
					key: "seniority",
					prompt: "¿Qué nivel/seniority tienes?",
					questionType: "single_select",
					required: true,
				ui: {
					variant: "combobox",
				},					options: [
						{ key: "starting", label: "Recién empezando / aprendiendo" },
						{ key: "junior", label: "Junior (0–2 años)" },
						{ key: "mid", label: "Mid (2–5 años)" },
						{ key: "senior", label: "Senior (5–10 años)" },
						{ key: "lead", label: "Lead / Staff / Principal (10+ años)" },
						{
							key: "not_applicable",
							label: "No aplica (founder, transición, etc.)",
						},
					],
				}),
			],
		},

		// CORE SECTION 2: Qué construyes
		{
			key: "que_construyes",
			title: "Qué construyes",
			description: "Queremos saber si shippeas y por qué estás aquí.",
			questions: [
				question("community.recent_builds", {
					key: "recent_builds",
					prompt: "¿Qué has buildeado/shipped en los últimos 3 meses?",
					helpText:
						"Cuéntanos qué has construido: proyectos, features, experimentos, etc. Si no has buildeado nada, cuéntanos por qué.",
					questionType: "long_text",
					required: true,
					placeholder:
						"ej: Un MVP de SaaS con Next.js, features en mi trabajo, prototipos de IA, nada porque estoy aprendiendo...",
					validation: { maxLength: 280 },
				}),
				question("community.why_crafter", {
					key: "why_crafter",
					prompt: "¿Por qué estás en Crafter Station?",
					helpText: "Selecciona las razones principales.",
					questionType: "multi_select",
					required: true,
					ui: {
						variant: "chips",
						showAdditionalTextInput: true,
						additionalTextPlaceholder: "Cuéntanos más",
					},
					options: [
						{ key: "learn", label: "Aprender" },
						{ key: "build", label: "Construir" },
						{ key: "networking", label: "Networking" },
						{ key: "job", label: "Trabajo" },
						{ key: "vibe", label: "Vibe" },
						{ key: "mentorship", label: "Mentorship" },
					],
				}),
			],
		},

		// CORE SECTION 3: Eventos
		{
			key: "eventos",
			title: "Eventos",
			description:
				"Ayúdanos a decidir qué formatos organizar y cada cuánto.",
			questions: [
				question("community.discovery_source", {
					key: "discovery_source",
					prompt: "¿Cómo conociste Crafter Station?",
					questionType: "single_select",
					required: true,
					ui: {
						variant: "combobox",						otherInputLabel: "Otro origen",
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
				}),
				question("community.event_formats", {
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
						{
							key: "meetups",
							label: "Meetups / Code Brew (charlas + networking)",
						},
						{ key: "talks_panels", label: "Charlas / paneles" },
						{
							key: "live_building",
							label: "Live building / coding (Ship or Sink)",
						},
					],
				}),
				question("community.event_frequency", {
					key: "event_frequency",
					prompt: "¿Cada cuánto realísticamente asistirías a algo?",
					questionType: "single_select",
					required: true,
					ui: {
						variant: "combobox",
						otherInputLabel: "Otro",
						otherInputPlaceholder: "Cuéntanos cada cuánto asistirías",
					},
					options: [
						{ key: "weekly", label: "Semanalmente" },
						{ key: "biweekly", label: "Cada 2 semanas" },
						{ key: "monthly", label: "Mensualmente" },
						{
							key: "big_only",
							label: "Solo para eventos grandes (hackathons, lanzamientos)",
						},
						{ key: "content_only", label: "Prefiero contenido, no eventos" },
						{
							key: "otro",
							label: "Otro",
							meta: { allowsText: true },
						},
					],
				}),
				question("community.participation_blocker", {
					key: "participation_blocker",
					prompt: "¿Qué es lo que más te frena para participar más?",
					questionType: "single_select",
					required: true,
				ui: {
					variant: "combobox",
				},					options: [
						{ key: "not_my_city", label: "Los eventos no son en mi ciudad" },
						{ key: "schedule", label: "Horarios / zona horaria" },
						{ key: "timing", label: "No me entero a tiempo de lo que pasa" },
						{
							key: "topics",
							label: "Los temas no matchean con mis intereses",
						},
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
				}),
			],
		},

	],
};
