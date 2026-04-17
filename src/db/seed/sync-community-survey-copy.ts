import { and, eq } from "drizzle-orm";

import { getDb } from "../client";
import { surveys, surveyVersions } from "../schema";

const surveySlug = "crafter-station-community-survey";
const surveyTitle = "Somos 600 shippers. Ayúdanos a construir lo que sigue.";
const introDescription =
  "En el último año pasamos de comunidad pequeña a 600 personas construyendo cosas en LatAm: devs, diseñadores, founders, gente de producto, growth, y muchas personas entrando al mundo tech desde otras carreras.\n\nQueremos que los próximos eventos, hackathons y contenidos los decidamos contigo, no adivinando.\n\n4 minutos. Anónima. Al final puedes dejar tu correo, nombre y teléfono si quieres involucrarte más directamente.\n\nThe Crafter Station team";
const completionDescription =
  "En 2 semanas publicamos un resumen de lo que escuchamos y qué vamos a hacer al respecto.\n\nSi dejaste tu correo, te escribimos esta semana.\n\nThe Crafter Station team";

async function main() {
  const db = getDb();

  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.slug, surveySlug),
  });

  if (!survey) {
    throw new Error(`Survey not found for slug: ${surveySlug}`);
  }

  const now = new Date();

  await db
    .update(surveys)
    .set({
      title: surveyTitle,
      description: introDescription,
      updatedAt: now,
    })
    .where(eq(surveys.id, survey.id));

  await db
    .update(surveyVersions)
    .set({
      title: surveyTitle,
      description: introDescription,
      completionDescription,
      updatedAt: now,
    })
    .where(
      and(
        eq(surveyVersions.surveyId, survey.id),
        eq(surveyVersions.status, "active"),
      ),
    );

  console.info(`Updated live survey copy for ${surveySlug}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
