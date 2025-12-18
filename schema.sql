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

-- Document Chunks (Embeddings + Metadata)
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  embedding vector(768), -- Gemini text-embedding-004 dimension
  source_type text check (source_type in ('Lecture', 'Textbook', 'Supervision')),
  mathematical_density float check (mathematical_density >= 0 and mathematical_density <= 1),
  metadata jsonb -- Optional: page number, section title, etc.
);

-- Notation Dictionary (Anti-Hallucination Lock)
create table notation_configs (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references weeks(id) on delete cascade not null,
  term text not null,
  symbol text not null,
  definition text,
  created_at timestamptz default now()
);

-- Index for faster vector search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Index for text search (BM25/FTS)
create index on document_chunks insert using gin (to_tsvector('english', content));

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
  source_type text,
  mathematical_density float,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.source_type,
    document_chunks.mathematical_density,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  join documents on documents.id = document_chunks.document_id
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  and documents.week_id = filter_week_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RPC Function for Hybrid Search (Vector + FTS)
create or replace function hybrid_search (
  query_text text,
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_week_id uuid
)
returns table (
  id uuid,
  content text,
  source_type text,
  mathematical_density float,
  similarity float,
  rank float
)
language plpgsql
as $$
begin
  return query
  with vector_matches as (
    select
      document_chunks.id,
      document_chunks.content,
      document_chunks.source_type,
      document_chunks.mathematical_density,
      1 - (document_chunks.embedding <=> query_embedding) as similarity,
      0 as ts_rank
    from document_chunks
    join documents on documents.id = document_chunks.document_id
    where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    and documents.week_id = filter_week_id
    order by document_chunks.embedding <=> query_embedding
    limit match_count
  ),
  text_matches as (
    select
      document_chunks.id,
      document_chunks.content,
      document_chunks.source_type,
      document_chunks.mathematical_density,
      0 as similarity,
      ts_rank_cd(to_tsvector('english', document_chunks.content), plainto_tsquery('english', query_text)) as ts_rank
    from document_chunks
    join documents on documents.id = document_chunks.document_id
    where to_tsvector('english', document_chunks.content) @@ plainto_tsquery('english', query_text)
    and documents.week_id = filter_week_id
    order by ts_rank desc
    limit match_count
  )
  select
    m.id,
    m.content,
    m.source_type,
    m.mathematical_density,
    max(m.similarity) as similarity,
    max(m.ts_rank) as rank
  from (
    select * from vector_matches
    union all
    select * from text_matches
  ) m
  group by m.id, m.content, m.source_type, m.mathematical_density
  order by similarity desc, rank desc
  limit match_count;
end;
$$;
