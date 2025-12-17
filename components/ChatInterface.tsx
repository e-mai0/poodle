"use client";

import { useChat } from "ai/react";
import { Message } from "ai";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // Import KaTeX CSS
import { useState } from "react";

interface ChatInterfaceProps {
    weekId: string; // The scope of the retrieval
}

export default function ChatInterface({ weekId }: ChatInterfaceProps) {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        body: { weekId },
    });

    return (
        <div className="flex flex-col h-screen max-h-[80vh] border rounded-lg overflow-hidden bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m: Message) => (
                    <div
                        key={m.id}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${m.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                                }`}
                        >
                            <div className="prose dark:prose-invert">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {m.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="text-sm text-muted-foreground animate-pulse">
                        Supervisor is thinking...
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
                <div className="flex gap-2">
                    <input
                        className="flex-1 p-2 border rounded bg-background text-foreground"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask your supervisor..."
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}
