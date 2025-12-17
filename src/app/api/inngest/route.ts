import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestDocument } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [ingestDocument],
});
