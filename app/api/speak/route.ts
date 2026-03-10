import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// "Rachel" — warm, friendly female voice
const VOICE_ID = "21m00Zb0j0jDMoZckpXHg";

export async function POST(req: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("ElevenLabs error:", err);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
