"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, CheckCircle } from "lucide-react";

// Initialize client (Assuming env vars are available publicly or handled by a lib. 
// For client side, usually use createClientComponentClient from auth-helpers-nextjs but user mentioned Supabase Subscriptions directly).
// I will use a dummy client for now if envs are not ready, or standard process.
// User said: "Use a shared weekId ... status badge using Supabase subscriptions".

// NOTE: Hardcoding null check for demo if env missing, but assuming NEXT_PUBLIC_SUPABASE_URL exists.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function StatusBadge({ weekId }: { weekId: string }) {
    const [status, setStatus] = useState<"processing" | "completed">("processing");

    useEffect(() => {
        // Initial fetch (mock)
        // In real app, fetch current status of documents for this week.

        // Subscription
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'documents',
                    filter: `week_id=eq.${weekId}`, // Mock filter
                },
                (payload) => {
                    if (payload.new.status === 'completed') {
                        setStatus('completed');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [weekId]);

    if (status === "completed") {
        return (
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                <CheckCircle className="h-3 w-3" />
                <span>Ready</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing</span>
        </div>
    );
}
