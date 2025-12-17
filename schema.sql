-- Enable pgvector extension to work with embeddings
create extension if not exists vector;

-- Papers (Tripos Part I, Part IIA, etc.)
create table papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year int not null
);

-- Weeks/Topics within a Paper
create table weeks (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete cascade not null,
  week_number int not null,
  topic text not null
);

-- Documents (Lecture Notes, Handouts)
create table documents (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade not null,
  storage_path text not null, -- Path in Supabase Storage
  type text not null, -- 'lecture_notes', 'handout', etc.
  status text not null default 'pending', -- 'pending', 'processed', 'failed'
  created_at timestamptz default now()
);

-- Document Chunks (Embeddings)
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  embedding vector(768), -- Gemini text-embedding-004 dimension
  metadata jsonb -- Optional: page number, section title, etc.
);

-- Index for faster vector search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- RPC Function for Similarity Search
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_week_id uuid
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  join documents on documents.id = document_chunks.document_id
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  and documents.week_id = filter_week_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
