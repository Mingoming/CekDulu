import { NextResponse } from "next/server";
import { analyzeInput } from "@/lib/analyzeInput";
import { AI_UNAVAILABLE_MESSAGE } from "@/lib/fallbackAnalysis";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 6000;

export async function POST(request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch (error) {
      console.error("[api/analyze] invalid json body", error);

      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Teks tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: "Teks terlalu panjang. Batasi maksimal 6000 karakter." },
        { status: 400 }
      );
    }

    const result = await analyzeInput(text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/analyze]", error);

    return NextResponse.json(
      {
        error: AI_UNAVAILABLE_MESSAGE,
      },
      { status: 500 }
    );
  }
}
