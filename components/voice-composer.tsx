"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type VoiceComposerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onError: (message: string | null) => void;
};

type Phase = "idle" | "recording" | "transcribing";
type VoiceEngine = "speech" | "gemini" | "none";
type EngineState = VoiceEngine | "pending";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function canRecordMedia() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isChromeOrEdge() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua) && !/SamsungBrowser/i.test(ua);
  return isChrome || isEdge;
}

function detectEngine(): VoiceEngine {
  if (isChromeOrEdge() && getSpeechRecognitionCtor()) return "speech";
  if (canRecordMedia()) return "gemini";
  return "none";
}

function joinTranscript(prefix: string, spoken: string) {
  const base = prefix.trim();
  const next = spoken.replace(/\s+/g, " ").trim();
  if (!next) return base;
  return base ? `${base} ${next}` : next;
}

export function VoiceComposer({ value, onChange, disabled, onError }: VoiceComposerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  // "pending" no SSR e no 1º paint do cliente evita hydration mismatch (Chrome ≠ servidor).
  const [engine, setEngine] = useState<EngineState>("pending");
  const valueRef = useRef(value);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseRef = useRef("");
  const speechFinalRef = useRef("");
  const speechStoppingRef = useRef(false);

  valueRef.current = value;

  useEffect(() => {
    setEngine(detectEngine());
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort();
        } catch {
          // já parado
        }
      }
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function releaseMic() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function transcribeWithGemini(blob: Blob) {
    setPhase("transcribing");
    try {
      if (blob.size < 800) {
        onError("A gravação ficou curta demais. Fale um pouco mais e tente de novo.");
        return;
      }

      const form = new FormData();
      const mimeType = blob.type || "audio/webm";
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `relato.${extension}`);
      form.append("mimeType", mimeType);

      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Não consegui transcrever o áudio.");
      }

      const transcript = data.text?.trim() ?? "";
      if (!transcript) {
        onError("Não ouvi fala nessa gravação. Tente de novo, mais perto do microfone.");
        return;
      }

      onChange(joinTranscript(valueRef.current, transcript));
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Não consegui transcrever o áudio.");
    } finally {
      setPhase("idle");
    }
  }

  function startSpeechRecognition() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onError("Este navegador não reconhece voz. Digite o relato.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    speechBaseRef.current = valueRef.current.trim();
    speechFinalRef.current = "";
    speechStoppingRef.current = false;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) speechFinalRef.current += `${chunk} `;
        else interim += chunk;
      }
      onChange(joinTranscript(speechBaseRef.current, `${speechFinalRef.current}${interim}`));
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        onError("Permita o microfone para ditar o orçamento.");
        return;
      }
      if (event.error === "network") {
        onError("Sem conexão para o reconhecimento de voz. Tente de novo ou digite o relato.");
        return;
      }
      onError("Não consegui usar o reconhecimento de voz. Tente de novo ou digite o relato.");
    };

    recognition.onend = () => {
      if (!speechStoppingRef.current) {
        try {
          recognition.start();
          recognitionRef.current = recognition;
          return;
        } catch {
          // Chrome às vezes não deixa reiniciar; encerra o ditado.
        }
      }

      recognitionRef.current = null;
      const spoken = speechFinalRef.current.trim();
      const heardSomething =
        Boolean(spoken) || valueRef.current.trim() !== speechBaseRef.current.trim();
      if (!heardSomething && speechStoppingRef.current) {
        onError("Não ouvi fala nessa gravação. Tente de novo, mais perto do microfone.");
      } else {
        onError(null);
      }
      setPhase("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
    timerRef.current = window.setTimeout(() => {
      stopSpeechRecognition();
    }, 120_000);
    setPhase("recording");
    onError(null);
  }

  function stopSpeechRecognition() {
    speechStoppingRef.current = true;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      setPhase("idle");
      return;
    }
    try {
      recognition.stop();
    } catch {
      setPhase("idle");
    }
  }

  async function startGeminiRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    streamRef.current = stream;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || mimeType || "audio/webm",
      });
      releaseMic();
      void transcribeWithGemini(blob);
    };
    recorderRef.current = recorder;
    recorder.start(250);
    timerRef.current = window.setTimeout(() => {
      stopGeminiRecorder();
    }, 120_000);
    setPhase("recording");
    onError(null);
  }

  function stopGeminiRecorder() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      if (recorder.state === "recording") recorder.requestData();
    } catch {
      // Alguns navegadores não implementam requestData.
    }
    recorder.stop();
  }

  async function toggleMic() {
    if (phase === "transcribing") return;

    if (phase === "recording") {
      if (engine === "speech") stopSpeechRecognition();
      else stopGeminiRecorder();
      return;
    }

    const current = detectEngine();
    setEngine(current);

    if (current === "none") {
      onError("Este navegador não grava áudio. Digite o relato.");
      return;
    }

    try {
      if (current === "speech") startSpeechRecognition();
      else await startGeminiRecording();
    } catch (error) {
      releaseMic();
      setPhase("idle");
      onError(micErrorMessage(error));
    }
  }

  const recording = phase === "recording";
  const transcribing = phase === "transcribing";
  const supported = engine !== "none";
  const usingSpeech = engine === "speech";

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        disabled={disabled || transcribing}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex: Fazer armário de cozinha, MDF branco, vai levar 3 dias, cobrar 2 mil de material e 1500 de mão de obra. Cliente: Maria Silva."
        aria-label="Relato do serviço"
      />
      <Button
        type="button"
        variant={recording ? "destructive" : "outline"}
        className="w-full"
        onClick={toggleMic}
        disabled={disabled || transcribing || !supported}
      >
        {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {transcribing
          ? "Transcrevendo..."
          : recording
            ? usingSpeech
              ? "Parar ditado"
              : "Parar e transcrever"
            : "Usar microfone"}
        {recording ? (
          <span className="relative ml-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        ) : null}
      </Button>
      {!supported ? (
        <p className="text-xs text-muted-foreground">
          Microfone indisponível neste navegador. Você ainda pode digitar o relato.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {recording
            ? usingSpeech
              ? "Ouvindo no Chrome/Edge… o texto aparece enquanto você fala."
              : "Ouvindo… fale o serviço, os valores e o nome do cliente."
            : transcribing
              ? "O Gemini está transformando o áudio em texto."
              : engine === "speech"
                ? "No Chrome e no Edge o ditado é instantâneo. Em outros navegadores o áudio vai para o Gemini."
                : engine === "gemini"
                  ? "Neste navegador o áudio é enviado ao Gemini ao parar. No Chrome/Edge o ditado é instantâneo."
                  : "Use o microfone para ditar o relato do serviço."}
        </p>
      )}
    </div>
  );
}

function micErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Permita o microfone para ditar o orçamento.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Não encontrei um microfone neste aparelho.";
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return "Este navegador bloqueou o microfone. Abra o app em HTTPS ou digite o relato.";
  }
  return "Não consegui usar o microfone. Tente de novo ou digite o relato.";
}
