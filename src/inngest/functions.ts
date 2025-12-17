import { inngest } from "@/lib/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { LlamaParse } from "llama-parse";
import { google } from "@ai-sdk/google";
import { embedMany } from "ai";
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

        // 2. Parse using LlamaParse
        const markdownContent = await step.run("parse-pdf", async () => {
            const fileBuffer = Buffer.from(fileBase64, 'base64');
            const parser = new LlamaParse({ apiKey: process.env.LLAMA_CLOUD_API_KEY! });

            // Convert Buffer to Blob for parseFile
            const blob = new Blob([fileBuffer], { type: 'application/pdf' });
            const result = await parser.parseFile(blob);
            return result.markdown;
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

        // 5. Upsert into document_chunks
        await step.run("upsert-chunks", async () => {
            const rows = chunks.map((content, idx) => ({
                document_id: documentId,
                content,
                embedding: embeddings[idx],
            }));

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
