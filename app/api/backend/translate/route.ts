
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, sourceLanguage, targetLanguage } = body;

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 10000 ||
      !["en", "es"].includes(sourceLanguage) ||
      !["en", "es"].includes(targetLanguage) ||
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
    console.error("Translation failed:", error);

    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
