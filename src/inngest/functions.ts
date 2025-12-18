import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { LlamaParse } from "llama-parse";
import { google } from "@ai-sdk/google";
import { embedMany, generateText } from "ai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import * as os from 'os';

export const ingestDocument = inngest.createFunction(
    { id: "ingest-document" },
    { event: "documents/uploaded" },
    async ({ event, step }) => {
        const { documentId, storagePath } = event.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Download PDF from Supabase Storage
        // Return base64 to avoid serialization issues
        const fileBase64 = await step.run("download-file", async () => {
            const { data, error } = await supabase.storage
                .from("documents") // bucket name
                .download(storagePath);

            if (error) throw new Error(`Failed to download file: ${error.message}`);
            return Buffer.from(await data.arrayBuffer()).toString('base64');
        });

        // 2. Parse using LlamaParse (PREMIUM mode with math awareness)
        const markdownContent = await step.run("parse-pdf", async () => {
            const fileBuffer = Buffer.from(fileBase64, 'base64');
            const parser = new LlamaParse({
                apiKey: process.env.LLAMA_CLOUD_API_KEY!,
                resultType: "markdown",
                // Instruct parser to handle math and headers properly
                parsingInstruction: "Identify all headers and sub-headers. Preserve all mathematical notation in LaTeX format."
            } as any);
            const blob = new Blob([fileBuffer], { type: 'application/pdf' });
            const result = await parser.parseFile(blob);
            return result.markdown;
        });

        // 3. Extract Notation Dictionary (First Pass)
        const notation = await step.run("extract-notation", async () => {
            const { text } = await generateText({
                model: google("gemini-1.5-flash"),
                prompt: `Identify key variables and their definitions from these notes. 
                Return a JSON array of objects with 'term', 'symbol', and 'definition'.
                NOTES:
                ${markdownContent.slice(0, 10000)} // First 10k chars for efficiency
                `,
            });

            try {
                // Simplified extraction logic for the demo; in production use structured output
                const jsonMatch = text.match(/\[.*\]/s);
                return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            } catch (e) {
                console.error("Failed to parse notation:", e);
                return [];
            }
        });

        // 4. Save Notation to DB
        await step.run("save-notation", async () => {
            // Get weekId from document
            const { data: doc } = await supabase
                .from('documents')
                .select('week_id')
                .eq('id', documentId)
                .single();

            if (doc?.week_id && notation.length > 0) {
                const rows = notation.map((item: any) => ({
                    week_id: doc.week_id,
                    term: item.term,
                    symbol: item.symbol,
                    definition: item.definition
                }));
                await supabase.from('notation_configs').insert(rows);
            }
        });

        // 3. Chunk parsed Markdown
        const chunks = await step.run("chunk-content", async () => {
            const lines = markdownContent.split('\n');
            const groupedChunks: string[] = [];
            let currentChunk = "";

            for (const line of lines) {
                if (line.startsWith('#') && currentChunk.length > 500) {
                    groupedChunks.push(currentChunk);
                    currentChunk = line + "\n";
                } else {
                    currentChunk += line + "\n";
                    if (currentChunk.length > 3500) {
                        groupedChunks.push(currentChunk);
                        currentChunk = "";
                    }
                }
            }
            if (currentChunk) groupedChunks.push(currentChunk);

            return groupedChunks.filter(c => c.trim().length > 0);
        });

        // 4. Generate Embeddings
        const embeddings = await step.run("generate-embeddings", async () => {
            // embedMany returns { embeddings: ... }
            const { embeddings } = await embedMany({
                model: google.textEmbeddingModel('text-embedding-004'),
                values: chunks,
            });
            return embeddings;
        });

        // 7. Upsert into document_chunks with metadata
        await step.run("upsert-chunks", async () => {
            // Get document type for source_type mapping
            const { data: doc } = await supabase
                .from('documents')
                .select('type')
                .eq('id', documentId)
                .single();

            const sourceTypeMapping: Record<string, string> = {
                'lecture_notes': 'Lecture',
                'textbook': 'Textbook',
                'handout': 'Supervision' // Adjust based on your 'type' enum
            };

            const rows = chunks.map((content, idx) => {
                // Heuristic for mathematical density: ratio of $ or \ to total length
                const mathSymbols = (content.match(/[\$\\]/g) || []).length;
                const density = Math.min(1, mathSymbols / (content.length / 50)); // Scale for density

                return {
                    document_id: documentId,
                    content,
                    embedding: embeddings[idx],
                    source_type: doc ? (sourceTypeMapping[doc.type] || 'Lecture') : 'Lecture',
                    mathematical_density: density
                };
            });

            const { error } = await supabase
                .from('document_chunks')
                .upsert(rows);

            if (error) throw error;

            await supabase
                .from('documents')
                .update({ status: 'processed' })
                .eq('id', documentId);
        });

        return { success: true, chunksProcessed: chunks.length };
    }
);
