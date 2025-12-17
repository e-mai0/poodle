import Link from "next/link";
import { BookOpen, Home, ChevronRight } from "lucide-react";

export default async function PaperLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    // Mock weeks data
    const weeks = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        title: `Week ${i + 1}`,
        href: `/papers/${id}/weeks/${i + 1}`,
    }));

    return (
        <div className="flex h-screen bg-neutral-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col">
                <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
                    <Link href="/dashboard" className="text-neutral-500 hover:text-primary transition-colors">
                        <Home className="h-5 w-5" />
                    </Link>
                    <ChevronRight className="h-4 w-4 text-neutral-300" />
                    <span className="font-serif font-semibold text-lg text-neutral-900 capitalize">
                        {id}
                    </span>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    <div className="px-2 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Syllabus
                    </div>
                    {weeks.map((week) => (
                        <Link
                            key={week.id}
                            href={week.href}
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-primary group transition-all"
                        >
                            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-xs text-neutral-500 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                {week.id}
                            </div>
                            {week.title}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-neutral-100">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-cambridge-blue/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-xs font-medium">Supervisor Mode Active</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {children}
            </main>
        </div>
    );
}
