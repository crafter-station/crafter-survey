import { NextResponse } from "next/server";

import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { authorizeResponseAccess } from "@/lib/survey/request-access";
import {
  serializeSurvey,
  serializeSurveyResponse,
} from "@/lib/survey/serialize";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET(request: Request) {
  if (!hasRequiredSurveyEnv()) {
    return jsonError(
      getEnvValidationMessage() ?? "Survey not configured.",
      503,
    );
  }

  const url = new URL(request.url);
  const responseId = url.searchParams.get("responseId");

  if (!responseId) {
    return jsonError("Missing responseId.", 400);
  }

  const cookieHeader = request.headers.get("cookie");
  const sessionToken =
    cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? null;

  const authorization = await authorizeResponseAccess({
    requestHeaders: request.headers,
    responseId,
    sessionToken,
  });

  if (authorization.kind === "missing") {
    return jsonError("Survey response not found.", 404);
  }

  if (authorization.kind === "forbidden") {
    return jsonError("Not allowed to read this response.", 403);
  }

  const survey = serializeSurvey(authorization.response.surveyVersion);
  const serialized = serializeSurveyResponse(authorization.response);

  const payload = NextResponse.json({
    survey,
    response: serialized,
  });

  if (authorization.sessionTokenToSet) {
    payload.cookies.set(
      SESSION_COOKIE_NAME,
      authorization.sessionTokenToSet,
      getSessionCookieOptions(),
    );
  }

  return payload;
}
