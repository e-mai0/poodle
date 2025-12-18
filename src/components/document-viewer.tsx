'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import 'katex/dist/katex.min.css';

export function DocumentViewer({ url }: { url: string }) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!url) return;

        const fetchContent = async () => {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to load document');
                const text = await res.text();
                setContent(text);
            } catch (err) {
                setError('Could not load content.');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [url]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading material...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-red-400">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full w-full bg-white px-8 py-8">
            <article className="prose prose-slate max-w-3xl mx-auto prose-headings:font-serif prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-slate-300">
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                >
                    {content}
                </ReactMarkdown>
                {/* Extra padding at bottom */}
                <div className="h-20" />
            </article>
        </ScrollArea>
    );
}
