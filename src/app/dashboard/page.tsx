import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Globe, Coins, Sprout } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const papers = [
    {
        id: "micro",
        title: "Paper 1: Microeconomics",
        href: "/papers/micro",
        icon: BookOpen,
        description: "Consumer theory, checking markets, and game theory.",
        progress: 85,
        status: "Review",
    },
    {
        id: "macro",
        title: "Paper 2: Macroeconomics",
        href: "/papers/macro",
        icon: TrendingUp,
        description: "Growth, inflation, and monetary policy.",
        progress: 60,
        status: "Continue",
    },
    {
        id: "trade",
        title: "Paper 3: International Trade",
        href: "/papers/trade",
        icon: Globe,
        description: "Comparative advantage and trade policy.",
        progress: 50,
        status: "Review",
    },
    {
        id: "finance",
        title: "Paper 4: Financial Markets",
        href: "/papers/finance",
        icon: Coins,
        description: "Asset pricing and market efficiency.",
        progress: 95,
        status: "Mastered",
    },
    {
        id: "development",
        title: "Paper 5: Development",
        href: "/papers/development",
        icon: Sprout,
        description: "Economic growth in developing nations.",
        progress: 70,
        status: "Mastered",
    },
];

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <header className="space-y-2">
                    <h1 className="font-serif text-4xl font-bold text-neutral-900">Tripos AI</h1>
                    <p className="text-neutral-500">Your supervision workspace.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {papers.map((paper, index) => (
                        <Card
                            key={paper.id}
                            className={cn(
                                "group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg border-neutral-200 bg-white",
                                "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
                            )}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <CardHeader className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="bg-neutral-100 p-2 rounded-full text-primary group-hover:bg-primary/10 transition-colors">
                                        <paper.icon className="h-6 w-6" />
                                    </div>
                                    <span className={cn(
                                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                                        paper.status === "Mastered" ? "bg-green-100 text-green-700" :
                                            paper.status === "Review" ? "bg-amber-100 text-amber-700" :
                                                "bg-blue-100 text-blue-700"
                                    )}>
                                        {paper.progress}%
                                    </span>
                                </div>
                                <CardTitle className="font-serif text-xl">{paper.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">{paper.description}</p>
                            </CardHeader>
                            <CardFooter>
                                <Link href={paper.href} className="w-full">
                                    <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-none group-hover:shadow-md transition-all">
                                        Open Syllabus
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
