import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: Request) {
    const { weekId } = await req.json();

    const supabase = await createClient();

    // 1. Fetch all chunks for the week to provide context
    const { data: docs } = await supabase.from('documents').select('id').eq('week_id', weekId);
    const docIds = docs?.map(d => d.id) || [];

    const { data: contextChunks } = await supabase
        .from('document_chunks')
        .select('content, source_type')
        .in('document_id', docIds);

    const context = contextChunks?.map(c => `[${c.source_type}] ${c.content}`).join('\n\n') || "";

    // 2. Generate questions using Gemini
    const { text } = await generateText({
        model: google("gemini-1.5-pro"), // Use Pro for better question quality
        system: `You are a Cambridge Economics Examiner for Tripos Part IIA.
        Your goal is to generate challenging, application-oriented practice questions based on the provided notes.
        
        RULES:
        - Generate 2 short-essay questions (require 200-300 word answers).
        - Generate 1 quantitative question (requires step-by-step mathematical derivation).
        - Focus on "application of theory" and "critical evaluation," not just definitions.
        - Style: Academic, rigorous, and specific to the theories in the context.
        - Formatting: Return a JSON object with a 'questions' array. Each object has 'id', 'type' (essay/quantitative), 'text', and 'hint'.`,
        prompt: `CONTEXT:\n${context.slice(0, 20000)}`,
    });

    try {
        const jsonMatch = text.match(/\{.*\}/s);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] };
        return Response.json(result);
    } catch (e) {
        console.error("Failed to parse questions:", e);
        return new Response("Error generating questions", { status: 500 });
    }
}
