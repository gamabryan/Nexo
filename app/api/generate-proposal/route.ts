import { NextResponse } from "next/server";
import { GeminiConfigError, generateProposalFromText } from "@/lib/gemini";
import { requireActiveApiUser } from "@/lib/user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const text =
    body && typeof body === "object" && "text" in body && typeof body.text === "string"
      ? body.text.trim()
      : "";

  if (text.length < 8) {
    return NextResponse.json(
      { error: "Descreva o serviço com um pouco mais de detalhe." },
      { status: 400 },
    );
  }

  if (text.length > 8000) {
    return NextResponse.json(
      { error: "O relato está longo demais. Resuma o serviço em até 8 mil caracteres." },
      { status: 400 },
    );
  }

  try {
    const proposal = await generateProposalFromText(text);
    return NextResponse.json(proposal);
  } catch (error) {
    console.error("generate-proposal", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível montar o orçamento agora. Tente de novo em alguns segundos.";
    const status = error instanceof GeminiConfigError ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
