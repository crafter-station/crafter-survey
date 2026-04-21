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
		"En el último año pasamos de comunidad pequeña a 600 personas construyendo cosas en LatAm: devs, diseñadores, founders, gente de producto, growth, y muchas personas entrando al mundo tech desde otras carreras.\n\nQueremos que los próximos eventos, hackathons y contenidos los decidamos contigo, no adivinando.\n\nLa encuesta es completamente anónima.\n\nThe Crafter Station team",
	completionTitle: "Gracias. En serio.",
	completionDescription:
		"En 2 semanas publicamos un resumen de lo que escuchamos y qué vamos a hacer al respecto.\n\nThe Crafter Station team",
	sections: [
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
					},
					options: [
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
					placeholder:
						"ej: design engineer, frontend dev, product designer, growth lead...",
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
						{ key: "design", label: "Diseño" },
						{ key: "art", label: "Arte" },
						{ key: "anthropology", label: "Antropología" },
						{ key: "product", label: "Producto / PM" },
						{ key: "marketing_growth", label: "Marketing / Growth" },
						{ key: "business", label: "Negocios / administración" },
						{ key: "communications", label: "Comunicación / periodismo" },
						{ key: "education", label: "Educación" },
						{ key: "psychology", label: "Psicología" },
						{ key: "research", label: "Investigación" },
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
					},
					options: [
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
		{
			key: "que_construyes",
			title: "Qué construyes",
			description: "Queremos saber si shippeas y por qué estás aquí.",
			questions: [
				question("community.interests", {
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
				}),
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
		{
			key: "comportamiento",
			title: "Comportamiento Real",
			description:
				"Queremos entender qué ha pasado de verdad en los últimos meses.",
			questions: [
				question("community.recent_activity", {
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
				}),
				question("community.events_attended", {
					key: "events_attended",
					prompt:
						"¿A qué eventos nuestros has asistido en los últimos 3 meses?",
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
				}),
				question("community.most_valuable", {
					key: "most_valuable",
					prompt:
						"¿Qué ha sido lo más valioso para ti hasta ahora en Crafter Station?",
					helpText:
						"Lo que sea: un evento, un contacto, un proyecto, algo que aprendiste, una idea que te voló la cabeza. Sé concreto.",
					questionType: "long_text",
					required: true,
					placeholder: "Cuéntanos qué fue lo más valioso",
					validation: { maxLength: 280 },
				}),
			],
		},
		{
			key: "eventos",
			title: "Eventos",
			description:
				"Esto nos ayuda a decidir qué formatos realmente deberíamos organizar.",
			questions: [
				question("community.discovery_source", {
					key: "discovery_source",
					prompt: "¿Cómo conociste Crafter Station?",
					questionType: "single_select",
					required: true,
					ui: {
						variant: "combobox",
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
					},
					options: [
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
		{
			key: "cierre",
			title: "Cierre",
			description:
				"Última parte. Si quieres que te contactemos directamente, puedes dejar tus datos aquí.",
			questions: [
				question("community.contact.name", {
					key: "name",
					prompt: "Nombre (opcional)",
					helpText:
						"Déjalo solo si quieres que podamos contactarte directamente.",
					questionType: "short_text",
					placeholder: "Tu nombre",
					ui: { autoComplete: "name" },
				}),
				question("community.contact.email", {
					key: "email",
					prompt: "Correo (opcional)",
					helpText:
						"Déjalo solo si quieres que podamos escribirte después de la encuesta.",
					questionType: "email",
					placeholder: "tu@correo.com",
					ui: { autoComplete: "email", inputMode: "email" },
				}),
				question("community.contact.phone", {
					key: "phone",
					prompt: "Teléfono (opcional)",
					helpText:
						"También puedes dejar tu número si prefieres que te contactemos por ahí.",
					questionType: "phone",
					placeholder: "+51 999 999 999",
					ui: { autoComplete: "tel", inputMode: "tel" },
				}),
				question("community.final_note", {
					key: "final_note",
					prompt: "¿Algo más que nos quieras decir?",
					questionType: "long_text",
					placeholder: "Cualquier detalle adicional",
					validation: { maxLength: 500 },
				}),
			],
		},
	],
};
