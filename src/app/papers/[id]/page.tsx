import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen, Video, Users, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to group weeks by term
const groupWeeksByTerm = (weeks: any[]) => {
    const terms = { Michaelmas: [], Lent: [], Easter: [] } as Record<string, any[]>;
    weeks.forEach(week => {
        if (terms[week.term]) {
            terms[week.term].push(week);
        }
    });
    return terms;
};

// Map document types to badges/icons
const getMaterialBadges = (docs: any[]) => {
    const types = new Set(docs.map(d => d.type));
    const badges = [];
    if (types.has('lecture_notes')) badges.push({ icon: Video, label: "Lecture", color: "bg-blue-100 text-blue-700" });
    if (types.has('textbook')) badges.push({ icon: BookOpen, label: "Textbook", color: "bg-amber-100 text-amber-700" });
    if (types.has('handout')) badges.push({ icon: Users, label: "Supervision", color: "bg-emerald-100 text-emerald-700" });
    return badges;
};

export default async function SyllabusPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = createClient();
    const { id } = await params;

    // Fetch Paper Details
    const { data: paper, error: paperError } = await supabase
        .from('papers')
        .select('*')
        .eq('id', id) // Assuming id is the paper ID. If it's 1-5, we might need to query by some other field or assume ID is UUID.
        // The user prompts implies selecting "Paper 1-5". 
        // In db schema, `papers` has `id` (uuid).
        // The URL is `/papers/[id]`. Let's assume `id` is the UUID.
        .single();

    if (paperError || !paper) {
        // For demo robustness, if UUID is invalid, maybe try to match map? 
        // Or just 404. Let's just 404 for now.
        // Actually, user prompts said "Select Paper (1-5)".
        // If user navigates manually to /papers/1, that won't work if ID is UUID.
        // But for now let's assume valid navigation.
        // notFound(); 
        // Let's not strict 404 yet to allow debugging if needed.
    }

    // Fetch Weeks and Documents
    const { data: weeksData, error: weeksError } = await supabase
        .from('weeks')
        .select(`
        *,
        documents (
            id, type, status
        )
    `)
        .eq('paper_id', id)
        .order('week_number', { ascending: true });

    const weeks = weeksData || [];
    const terms = groupWeeksByTerm(weeks);
    const termOrder = ['Michaelmas', 'Lent', 'Easter'];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-serif font-bold text-slate-900">{paper?.title || 'Paper Details'}</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Syllabus View</p>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
                {termOrder.map((term) => {
                    const termWeeks = terms[term];
                    if (!termWeeks || termWeeks.length === 0) return null;

                    return (
                        <div key={term} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-serif font-medium text-slate-400">{term} Term</h2>
                                <div className="h-px flex-1 bg-slate-200"></div>
                            </div>

                            <div className="relative border-l border-slate-200 ml-3 space-y-8 pl-8 py-2">
                                {termWeeks.map((week) => {
                                    const badges = getMaterialBadges(week.documents);
                                    const hasMaterials = badges.length > 0;
                                    const isComplete = hasMaterials; // Simplistic logic for "completed" or "active"

                                    return (
                                        <div key={week.id} className="relative group">
                                            {/* Timeline Node */}
                                            <div className={cn(
                                                "absolute -left-[41px] top-1.5 h-5 w-5 rounded-full border-2 bg-slate-50 flex items-center justify-center transition-colors",
                                                hasMaterials ? "border-[var(--primary)] text-[var(--primary)]" : "border-slate-300 text-slate-300"
                                            )}>
                                                {hasMaterials ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                                            </div>

                                            {/* Card */}
                                            <Link href={hasMaterials ? `/papers/${id}/weeks/${week.id}` : '#'} className={cn("block transition-all duration-300", hasMaterials ? "hover:translate-x-1" : "cursor-default")}>
                                                <Card className={cn(
                                                    "rounded-xl border transition-all duration-300",
                                                    hasMaterials
                                                        ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-[var(--primary)]/50"
                                                        : "bg-slate-50/50 border-slate-100 opacity-70"
                                                )}>
                                                    <CardContent className="p-5 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-1">
                                                                Week {week.week_number}
                                                            </p>
                                                            <h3 className={cn("text-lg font-medium", hasMaterials ? "text-slate-900" : "text-slate-400")}>
                                                                {week.topic}
                                                            </h3>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            {badges.map((b, i) => (
                                                                <div key={i} title={b.label} className={cn("p-2 rounded-full", b.color)}>
                                                                    <b.icon className="h-4 w-4" />
                                                                </div>
                                                            ))}
                                                            {!hasMaterials && (
                                                                <span className="text-xs text-slate-300 italic px-2 py-1">No materials</span>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {weeks.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <p>No syllabus found for this paper.</p>
                        <Link href="/admin" className="text-[var(--primary)] hover:underline mt-2 inline-block">Upload materials in Admin Dashboard</Link>
                    </div>
                )}

            </main>
        </div>
    );
}
