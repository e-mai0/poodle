export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            papers: {
                Row: {
                    id: string
                    title: string
                    year: number
                }
                Insert: {
                    id?: string
                    title: string
                    year: number
                }
                Update: {
                    id?: string
                    title?: string
                    year?: number
                }
            }
            weeks: {
                Row: {
                    id: string
                    paper_id: string
                    week_number: number
                    topic: string
                }
                Insert: {
                    id?: string
                    paper_id: string
                    week_number: number
                    topic: string
                }
                Update: {
                    id?: string
                    paper_id?: string
                    week_number?: number
                    topic?: string
                }
            }
            documents: {
                Row: {
                    id: string
                    week_id: string
                    storage_path: string
                    type: string
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    week_id: string
                    storage_path: string
                    type: string
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    week_id?: string
                    storage_path?: string
                    type?: string
                    status?: string
                    created_at?: string
                }
            }
            document_chunks: {
                Row: {
                    id: string
                    document_id: string
                    content: string
                    embedding: string | null // string representation of vector or null? usually vector comes back as string or array depending on driver, but supabase-js handles it. Let's say number[] | string for safety or just any for now if unsure, but typically it's number[] in js.
                    source_type: 'Lecture' | 'Textbook' | 'Supervision' | null
                    mathematical_density: number | null
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    document_id: string
                    content: string
                    embedding?: string | null
                    source_type?: 'Lecture' | 'Textbook' | 'Supervision' | null
                    mathematical_density?: number | null
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    document_id?: string
                    content?: string
                    embedding?: string | null
                    source_type?: 'Lecture' | 'Textbook' | 'Supervision' | null
                    mathematical_density?: number | null
                    metadata?: Json | null
                }
            }
            notation_configs: {
                Row: {
                    id: string
                    week_id: string
                    term: string
                    symbol: string
                    definition: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    week_id: string
                    term: string
                    symbol: string
                    definition?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    week_id?: string
                    term?: string
                    symbol?: string
                    definition?: string | null
                    created_at?: string
                }
            }
        }
    }
}
