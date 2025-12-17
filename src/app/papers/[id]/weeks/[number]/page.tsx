import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatInterface from "@/components/ChatInterface";
import StatusBadge from "@/components/StatusBadge";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Mock content
const lectureContent = `
# Consumer Theory

In microeconomics, consumer theory is the study of how people decide what to spend their money on based on their preferences and budget constraints.

## Utility Maximization

$$
\\max U(x_1, x_2) \\quad \\text{s.t.} \\quad p_1 x_1 + p_2 x_2 = m
$$

Where:
- $x_1, x_2$ are quantities of goods
- $p_1, p_2$ are prices
- $m$ is income
`;

export default async function WeekPage({ params }: { params: Promise<{ id: string; number: string }> }) {
    const { id, number } = await params;
    const weekId = `${id}-${number}`; // derived ID

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            {/* Left Panel: Source Material */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="px-6 py-3 border-b border-neutral-100 flex items-center justify-between">
                    <h2 className="font-serif text-xl font-semibold text-neutral-900">
                        Week {number}: Consumer Theory
                    </h2>
                    <StatusBadge weekId={weekId} />
                </div>

                <Tabs defaultValue="lecture" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4 pb-2">
                        <TabsList className="w-full justify-start bg-neutral-100 p-1">
                            <TabsTrigger value="lecture" className="flex-1">Lecture</TabsTrigger>
                            <TabsTrigger value="textbook" className="flex-1">Textbook</TabsTrigger>
                            <TabsTrigger value="supervision" className="flex-1">Supervision</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="lecture" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-0">
                        <ScrollArea className="flex-1 h-full p-6 md:p-8">
                            <div className="prose prose-neutral max-w-none dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {lectureContent}
                                </ReactMarkdown>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="textbook" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-0">
                        <div className="flex flex-1 items-center justify-center text-neutral-400 text-sm">
                            No textbook material selected.
                        </div>
                    </TabsContent>

                    <TabsContent value="supervision" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-0">
                        <div className="flex flex-1 items-center justify-center text-neutral-400 text-sm">
                            Supervision notes will appear here.
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Right Panel: Chat */}
            <div className="w-[400px] border-l border-neutral-200 hidden md:flex text-sm">
                <ChatInterface />
            </div>
        </div>
    );
}
