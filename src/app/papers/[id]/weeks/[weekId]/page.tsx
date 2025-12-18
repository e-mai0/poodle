import { createClient } from "@/lib/supabase/server";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatInterface from "@/components/ChatInterface";
import { Separator } from "@/components/ui/separator";
import { DocumentViewer } from "@/components/document-viewer";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string; weekId: string }> }) {
    const supabase = await createClient();
    const { id: paperId, weekId } = await params;

    // Fetch Week & Documents
    const { data: week } = await supabase
        .from('weeks')
        .select('*, documents(*)')
        .eq('id', weekId)
        .single();

    if (!week) return <div>Week not found</div>;

    const documents: any[] = week.documents || [];
    const lectures = documents.filter((d: any) => d.type === 'lecture_notes');
    const textbooks = documents.filter((d: any) => d.type === 'textbook');
    const supervisions = documents.filter((d: any) => d.type === 'handout');

    // Helper to get Signed URL
    const getSignedUrl = async (path: string) => {
        const mdPath = path.replace('.pdf', '.md');
        const { data, error } = await supabase.storage
            .from('materials')
            .createSignedUrl(mdPath, 3600);
        return data?.signedUrl;
    };

    const [lectureUrl, textbookUrl, supervisionUrl] = await Promise.all([
        lectures[0] ? getSignedUrl(lectures[0].storage_path) : Promise.resolve(null),
        textbooks[0] ? getSignedUrl(textbooks[0].storage_path) : Promise.resolve(null),
        supervisions[0] ? getSignedUrl(supervisions[0].storage_path) : Promise.resolve(null)
    ]);

    return (
        <div className="h-screen w-full bg-slate-50 overflow-hidden font-sans">
            <ResizablePanelGroup direction="horizontal">

                {/* LEFT PANE: Material Viewer */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full flex flex-col bg-white">
                        <div className="h-12 border-b border-slate-200 flex items-center px-4 bg-slate-50/50">
                            <span className="font-semibold text-slate-700">{week.topic}</span>
                        </div>
                        <Tabs defaultValue="lecture" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-4 py-2 border-b border-slate-100">
                                <TabsList>
                                    <TabsTrigger value="lecture">Lectures</TabsTrigger>
                                    <TabsTrigger value="textbook">Textbook</TabsTrigger>
                                    <TabsTrigger value="supervision">Supervision</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="lecture" className="flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex">
                                <MaterialWrapper url={lectureUrl} placeholder="No lecture notes uploaded." />
                            </TabsContent>
                            <TabsContent value="textbook" className="flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex">
                                <MaterialWrapper url={textbookUrl} placeholder="No textbook uploaded." />
                            </TabsContent>
                            <TabsContent value="supervision" className="flex-1 overflow-hidden p-0 m-0 data-[state=active]:flex">
                                <MaterialWrapper url={supervisionUrl} placeholder="No supervision questions uploaded." />
                            </TabsContent>
                        </Tabs>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* RIGHT PANE: Supervisor Chat */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full bg-slate-50 border-l border-slate-200">
                        <ChatInterface weekId={weekId} />
                    </div>
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    );
}

function MaterialWrapper({ url, placeholder }: { url: string | null | undefined, placeholder: string }) {
    if (!url) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30">
                <p>{placeholder}</p>
            </div>
        );
    }
    return <DocumentViewer url={url} />;
}
