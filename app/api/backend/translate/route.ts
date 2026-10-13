
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid translation request" },
        { status: 400 }
      );
    }

    const { text, sourceLanguage, targetLanguage } = body as {
      text?: unknown;
      sourceLanguage?: unknown;
      targetLanguage?: unknown;
    };

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 10000 ||
      (sourceLanguage !== "en" && sourceLanguage !== "es") ||
      (targetLanguage !== "en" && targetLanguage !== "es") ||
      sourceLanguage === targetLanguage
    ) {
      return NextResponse.json(
        { error: "Invalid translation request" },
        { status: 400 }
      );
    }

    const source =
      sourceLanguage === "en" ? "English" : "Spanish";
    const target =
      targetLanguage === "en" ? "English" : "Spanish";

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("Translation provider is not configured: OPENROUTER_API_KEY is missing");
      return NextResponse.json(
        { error: "Translation service is not configured" },
        { status: 503 }
      );
    }

    const openrouter = createOpenRouter({ apiKey });

    const { text: translation } = await generateText({
      model: openrouter("tencent/hy-mt2-7b"),
      system: `
        Translate restaurant training content from ${source} to ${target}.
        Return only the translation.
        Preserve meaning, formatting, quantities, temperatures,
        ingredients, warnings, and instructions.
        Do not summarize or add explanations.
      `,
      prompt: text,
      temperature: 0,
    });

    return NextResponse.json({
      translation: translation.trim(),
    });
  } catch (error) {
    console.error("Translation provider request failed:", error);

    return NextResponse.json(
      { error: "Translation provider request failed" },
      { status: 502 }
    );
  }
}
