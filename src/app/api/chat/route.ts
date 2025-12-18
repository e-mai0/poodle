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

    // 3. Retrieve relevant chunks using Hybrid Search
    const { data: chunks, error } = await supabase.rpc("hybrid_search", {
        query_text: query,
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5,
        filter_week_id: weekId,
    });

    if (error) {
        console.error("Hybrid search error:", error);
        return new Response("Error retrieving documents", { status: 500 });
    }

    // 4. Fetch Notation Dictionary for the week
    const { data: notation } = await supabase
        .from('notation_configs')
        .select('symbol, definition')
        .eq('week_id', weekId);

    const notationContext = notation?.map(n => `- ${n.symbol}: ${n.definition}`).join('\n') || "None defined.";

    // 5. Source Diversity Check (Ensure at least one of each type if available)
    const diverseChunks = chunks || [];
    const sourceTypes = ['Lecture', 'Textbook', 'Supervision'];
    const selectedChunks: any[] = [];

    sourceTypes.forEach(type => {
        const chunk = diverseChunks.find((c: any) => c.source_type === type);
        if (chunk) selectedChunks.push(chunk);
    });

    // Fill the rest with top matches (avoid duplicates)
    diverseChunks.forEach((c: any) => {
        if (!selectedChunks.find(sc => sc.id === c.id) && selectedChunks.length < 5) {
            selectedChunks.push(c);
        }
    });

    // 6. Construct Context
    const context = selectedChunks.map((c: any) => `[Source: ${c.source_type}] (Density: ${c.mathematical_density.toFixed(2)})\n${c.content}`).join("\n\n---\n\n") || "";

    // 7. System Prompt (The Supervisor Logic)
    const systemPrompt = `You are a Senior Cambridge Economics Supervisor.

NOTATION DICTIONARY:
${notationContext}

STRICT pedagogical style:
1. Use ONLY the symbols defined in the Notation Dictionary.
2. If the user asks a question, identify if the Lecture and Textbook disagree; if so, prioritize the Lecture's derivation but note the Textbook's alternative.
3. MATHEMATICAL RIGOR: All derivations must be step-by-step. If a variable is mentioned, it must be defined.
4. FORMATTING: Use $$...$$ for standalone equations and $...$ for inline variables. Use \\mathbf{...} for vectors.

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
