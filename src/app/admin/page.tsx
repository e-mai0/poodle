'use client';

import { useState, useEffect } from "react";
import { uploadFiles } from "@/app/actions/upload-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, FileText, Upload, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

import { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export default function AdminPage() {
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
    const [paperId, setPaperId] = useState<string>("");
    const [term, setTerm] = useState<string>("");
    const [week, setWeek] = useState<string>("");
    const [type, setType] = useState<string>("");
    const [files, setFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploads, setUploads] = useState<any[]>([]);

    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        try {
            setSupabase(createClient());
        } catch (err: any) {
            console.error("Supabase client init failed:", err);
            setConfigError(err.message);
            toast.error("Configuration Error", { description: err.message });
        }
    }, []);

    // Real-time subscription to 'documents'
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'documents',
                },
                (payload) => {
                    setUploads((prev) =>
                        prev.map((up) =>
                            up.documentId === payload.new.id
                                ? { ...up, status: payload.new.status }
                                : up
                        )
                    );
                    if (payload.new.status === 'processed') {
                        toast.success("Document Ready", {
                            description: "File successfully processed and vectorized.",
                            icon: <CheckCircle2 className="text-[var(--primary)]" />, // Cambridge Blue
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paperId || !term || !week || !type || !files) {
            toast.error("Missing fields", { description: "Please select all options." });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("paperId", paperId);
        formData.append("term", term);
        formData.append("weekNumber", week);
        formData.append("type", type);

        // Add pending uploads to state for UI immediate feedback
        const newUploads = Array.from(files).map(f => ({
            name: f.name,
            status: 'uploading',
            documentId: null // will be populated after action
        }));
        setUploads(prev => [...newUploads, ...prev]);

        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }

        try {
            const result = await uploadFiles(formData);
            if ('error' in result && result.error) {
                toast.error("Upload Failed", { description: result.error });
            } else if ('results' in result) {
                toast.success("Upload Started", { description: `${files.length} files queued.` });

                if (result.results) {
                    const resultMap = new Map(result.results.map((r: any) => [r.file, r]));
                    setUploads(prev => prev.map(up => {
                        const res = resultMap.get(up.name);
                        return res ? { ...up, documentId: res.documentId, status: res.status } : up;
                    }));
                }
            }
        } catch (err) {
            toast.error("Error", { description: "Something went wrong." });
        } finally {
            setUploading(false);
            // Reset file input if needed
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-serif font-bold tracking-tight text-slate-900">Administrative Core</h1>
                    <p className="text-slate-500 font-light">Manage syllabus materials and ingest pipeline.</p>
                </div>

                {configError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5" />
                        <div>
                            <p className="font-semibold">Configuration Error</p>
                            <p className="text-sm">{configError}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Upload Form */}
                    <div className="md:col-span-1">
                        <Card className="rounded-xl border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="font-serif text-xl">Upload Material</CardTitle>
                                <CardDescription>Add lectures, textbooks, or handouts.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="paper">Paper</Label>
                                        <Select onValueChange={setPaperId}>
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder="Select Paper" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Paper 1: Microeconomics</SelectItem>
                                                <SelectItem value="2">Paper 2: Macroeconomics</SelectItem>
                                                <SelectItem value="3">Paper 3: Econometrics</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="term">Term</Label>
                                        <Select onValueChange={setTerm}>
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder="Select Term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Michaelmas">Michaelmas</SelectItem>
                                                <SelectItem value="Lent">Lent</SelectItem>
                                                <SelectItem value="Easter">Easter</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="week">Week</Label>
                                            <Select onValueChange={setWeek}>
                                                <SelectTrigger className="w-full bg-white">
                                                    <SelectValue placeholder="1-8" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                                        <SelectItem key={n} value={n.toString()}>Week {n}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="type">Type</Label>
                                            <Select onValueChange={setType}>
                                                <SelectTrigger className="w-full bg-white">
                                                    <SelectValue placeholder="Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="lecture_notes">Lecture</SelectItem>
                                                    <SelectItem value="textbook">Textbook</SelectItem>
                                                    <SelectItem value="handout">Supervision</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="files">Files</Label>
                                        <div className="grid w-full max-w-sm items-center gap-1.5">
                                            <Input
                                                id="files"
                                                type="file"
                                                multiple
                                                accept=".pdf"
                                                onChange={(e) => setFiles(e.target.files)}
                                                className="cursor-pointer bg-white file:text-slate-700 hover:file:bg-slate-100"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-[var(--primary)] hover:bg-[#8FB09A] text-white transition-all font-medium"
                                        disabled={uploading}
                                    >
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        {uploading ? "Ingesting..." : "Upload & Ingest"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Activity Feed */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-serif font-semibold text-slate-800">Processing Queue</h2>
                        </div>

                        {uploads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                <FileText className="h-12 w-12 mb-4 opacity-50" />
                                <p>No active uploads.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence>
                                    {uploads.map((up, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <Card className="rounded-lg border-slate-100 shadow-sm overflow-hidden">
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                            <FileText className="h-5 w-5 text-slate-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{up.name}</p>
                                                            <p className="text-xs text-slate-500 uppercase tracking-widest">{up.status}</p>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        {up.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                                                        {up.status === 'processed' && <CheckCircle2 className="h-6 w-6 text-[var(--primary)]" />}
                                                        {up.status === 'failed' && <AlertCircle className="h-6 w-6 text-red-400" />}
                                                    </div>
                                                </CardContent>
                                                {/* Progress bar effect - could be real if we had progress events */}
                                                {up.status === 'uploading' && (
                                                    <div className="h-1 w-full bg-slate-100">
                                                        <motion.div
                                                            className="h-full bg-[var(--primary)]"
                                                            initial={{ width: "0%" }}
                                                            animate={{ width: "100%" }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                        />
                                                    </div>
                                                )}
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
