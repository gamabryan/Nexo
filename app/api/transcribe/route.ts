import { NextResponse } from "next/server";
import { GeminiConfigError, transcribeAudio } from "@/lib/gemini";
import { requireActiveApiUser } from "@/lib/user";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireActiveApiUser();
  if (auth.error) return auth.error;
  const user = auth.user;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie o áudio da gravação." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Envie o áudio da gravação." }, { status: 400 });
  }
  if (audio.size < 800) {
    return NextResponse.json(
      { error: "A gravação ficou curta demais. Fale um pouco mais e tente de novo." },
      { status: 400 },
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "A gravação passou de 8 MB. Fale menos tempo ou digite o relato." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await audio.arrayBuffer());
  const mimeHint = form.get("mimeType");
  const mimeType = normalizeAudioMime(
    typeof mimeHint === "string" && mimeHint.trim() ? mimeHint : audio.type,
  );

  try {
    const text = await transcribeAudio(bytes.toString("base64"), mimeType);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("transcribe", error);
    const message =
      error instanceof Error
        ? error.message
        : "Não consegui transcrever o áudio. Tente de novo ou digite o relato.";
    const status = error instanceof GeminiConfigError ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

function normalizeAudioMime(type: string) {
  const base = type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "audio/mp4" || base === "audio/m4a" || base === "audio/x-m4a") return "audio/mp4";
  if (base === "audio/webm") return "audio/webm";
  if (base === "audio/ogg") return "audio/ogg";
  if (base === "audio/wav" || base === "audio/wave" || base === "audio/x-wav") return "audio/wav";
  if (base === "audio/mpeg" || base === "audio/mp3") return "audio/mp3";
  if (base === "audio/aac") return "audio/aac";
  return "audio/webm";
}
