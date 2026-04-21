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
		"En un año pasamos de comunidad pequeña a 600 personas construyendo en LatAm. Ayúdanos a decidir qué sigue.\n\n3 minutos. Anónima. Sorteo de $100 USD en Cursor al final.\n\nThe Crafter Station team",
	completionTitle: "Gracias. En serio.",
	completionDescription:
		"En 2 semanas publicamos un resumen de lo que escuchamos y qué vamos a hacer al respecto.\n\nSi dejaste tu correo, te escribimos esta semana.\n\nThe Crafter Station team",
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
					},
					options: [
						{ key: "cs_engineering", label: "CS / Ingeniería" },
						{ key: "bootcamp", label: "Bootcamp" },
						{ key: "self_taught", label: "Self-taught" },
						{ key: "career_switch", label: "Otra carrera" },
						{ key: "studying", label: "Estudiando ahora" },
					],
				}),
				question("community.background_detail", {
					key: "background_detail",
					prompt: "Cuéntanos más sobre tu background (opcional)",
					questionType: "short_text",
					placeholder: "Detalles adicionales sobre tu formación...",
					validation: { maxLength: 100 },
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
				question("community.why_crafter_detail", {
					key: "why_crafter_detail",
					prompt: "Cuéntanos más (opcional)",
					questionType: "short_text",
					placeholder: "Elabora sobre por qué estás en la comunidad...",
					validation: { maxLength: 150 },
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

		// RAFFLE SECTION (optional)
		{
			key: "raffle",
			title: "Participa en el sorteo",
			description:
				"Ayúdanos a planear mejor los próximos meses y participa en el sorteo de $100 USD en Cursor. Sortearemos cuando lleguemos a 100 respuestas.",
			questions: [
				question("community.most_valuable", {
					key: "most_valuable",
					prompt:
						"¿Qué ha sido lo más valioso para ti hasta ahora en Crafter Station?",
					helpText:
						"Lo que sea: un evento, un contacto, un proyecto, algo que aprendiste, una idea que te voló la cabeza. Sé concreto.",
					questionType: "long_text",
					placeholder: "Cuéntanos qué fue lo más valioso",
					validation: { maxLength: 280 },
				}),
				question("community.involvement", {
					key: "involvement",
					prompt: "¿Cómo te gustaría involucrarte en los próximos 6 meses?",
					helpText: "Selecciona todos los que apliquen.",
					questionType: "multi_select",
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
				}),
				question("community.missing_from_crafter", {
					key: "missing_from_crafter",
					prompt:
						"¿Qué te gustaría que Crafter Station hiciera que hoy no hacemos?",
					questionType: "long_text",
					placeholder: "Tu idea o sugerencia",
					validation: { maxLength: 280 },
				}),
				question("community.communication_frequency", {
					key: "communication_frequency",
					prompt: "¿Cada cuánto quieres saber de nosotros?",
					questionType: "single_select",
				ui: {
					variant: "combobox",
				},					options: [
						{ key: "weekly", label: "Semanal" },
						{ key: "biweekly", label: "Cada 2 semanas" },
						{ key: "monthly", label: "Mensual" },
						{ key: "big_only", label: "Solo para cosas grandes" },
						{ key: "least_possible", label: "Lo menos posible" },
					],
				}),
				question("community.contact.name", {
					key: "name",
					prompt: "Nombre (opcional)",
					helpText: "Para contactarte si ganas el sorteo.",
					questionType: "short_text",
					placeholder: "Tu nombre",
					ui: { autoComplete: "name" },
				}),
				question("community.contact.email", {
					key: "email",
					prompt: "Correo",
					helpText: "Requerido para participar en el sorteo.",
					questionType: "email",
					required: true,
					placeholder: "tu@correo.com",
					ui: { autoComplete: "email", inputMode: "email" },
				}),
				question("community.contact.phone", {
					key: "phone",
					prompt: "Teléfono (opcional)",
					helpText: "También puedes dejar tu número.",
					questionType: "phone",
					placeholder: "+51 999 999 999",
					ui: { autoComplete: "tel", inputMode: "tel" },
				}),
			],
		},
	],
};
