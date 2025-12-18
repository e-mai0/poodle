'use server';

import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

export async function uploadFiles(formData: FormData) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const paperId = formData.get('paperId') as string;
    const term = formData.get('term') as string;
    const weekNumber = formData.get('weekNumber') as string;
    const type = formData.get('type') as string;
    const files = formData.getAll('files') as File[];

    if (!paperId || !term || !weekNumber || !type || files.length === 0) {
        return { error: "Missing required fields" };
    }

    // 1. Get Week ID (or create if not exists)
    const { data: weekData, error: weekError } = await supabase
        .from('weeks')
        .select('id')
        .eq('paper_id', paperId)
        .eq('term', term)
        .eq('week_number', parseInt(weekNumber))
        .single();

    let weekId;

    if (weekError || !weekData) {
        const { data: newWeek, error: createError } = await supabase
            .from('weeks')
            .insert({
                paper_id: paperId,
                term: term,
                week_number: parseInt(weekNumber),
                topic: `Week ${weekNumber} - ${term}`
            })
            .select('id')
            .single();

        if (createError) return { error: `Failed to create week: ${createError.message}` };
        weekId = newWeek.id;
    } else {
        weekId = weekData.id;
    }

    const results = [];

    for (const file of files) {
        // 2. Upload to Storage
        const path = `paper-${paperId}/${term}/week-${weekNumber}/${type}/${file.name}`;
        const fileBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from('materials')
            .upload(path, fileBuffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            results.push({ file: file.name, status: 'failed', error: uploadError.message });
            continue;
        }

        // 3. Create Document Record
        const { data: doc, error: dbError } = await supabase
            .from('documents')
            .insert({
                week_id: weekId,
                storage_path: path,
                type: type,
                status: 'uploading'
            })
            .select('id')
            .single();

        if (dbError) {
            results.push({ file: file.name, status: 'failed', error: dbError.message });
            continue;
        }

        // 4. Trigger Inngest
        await inngest.send({
            name: "app/process.file",
            data: {
                documentId: doc.id,
                storagePath: path
            }
        });

        results.push({ file: file.name, status: 'success', documentId: doc.id });
    }

    return { success: true, results };
}
