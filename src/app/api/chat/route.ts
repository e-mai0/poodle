import { google } from "@ai-sdk/google";
import { streamText, embed } from "ai";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const maxDuration = 60; // Allow longer timeouts for RAG

export async function POST(req: Request) {
    const { messages, weekId } = await req.json();

    const supabase = await createClient();

    // 1. Get the latest user message
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    // 2. Generate embedding for query
    const { embedding } = await embed({
        model: google.textEmbeddingModel("text-embedding-004"),
        value: query,
    });

    // 3. Retrieve relevant chunks
    const { data: chunks, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.5, // Adjust based on testing
        match_count: 5,
        filter_week_id: weekId,
    });

    if (error) {
        console.error("Vector search error:", error);
        return new Response("Error retrieving documents", { status: 500 });
    }

    // 4. Construct Context
    const context = chunks?.map((c: any) => c.content).join("\n\n---\n\n") || "";

    // 5. System Prompt
    const systemPrompt = `You are a rigid Cambridge Economics Supervisor.

You must:
- Use standard LaTeX notation for all mathematics (e.g. $ x^2 $, $$ \int f(x) dx $$)
- Only reason using the provided context
- Never introduce variables, assumptions, or steps not present in the context
- If the context is insufficient, state explicitly that the notes do not justify the claim

CONTEXT:
${context}
`;

    // 6. Stream Response
    const result = streamText({
        model: google("gemini-1.5-flash"),
        system: systemPrompt,
        messages,
        temperature: 0.2,
    });

    return result.toTextStreamResponse();
}
