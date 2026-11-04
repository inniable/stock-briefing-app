-- ============================================================================
-- StockBriefing: Zero-Copyright-Risk Official Tech Press & SEC EDGAR Feed
-- Database Schema for Supabase PostgreSQL
-- ============================================================================

-- Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Single core table: filings_feed
-- Note: Zero images/thumbnails stored by design for 100% copyright safety.
CREATE TABLE IF NOT EXISTS public.filings_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL UNIQUE, -- SEC Accession Number (e.g. 0001045810-26-000078) or Newsroom URL
    ticker TEXT NOT NULL,           -- e.g. NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA
    company_name TEXT NOT NULL,     -- e.g. NVIDIA, Apple, Microsoft
    source_type TEXT NOT NULL CHECK (source_type IN ('SEC', 'PRESS', 'NEWS')),
    filing_type TEXT NOT NULL DEFAULT 'Press Release', -- e.g. 8-K, 10-Q, 10-K, Press Release
    original_title TEXT NOT NULL,
    headline_kr TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('Bullish', 'Bearish', 'Neutral')),
    summary_lines JSONB NOT NULL DEFAULT '[]'::jsonb,  -- list[str]: 3-line bullet summary in Korean
    key_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,    -- list[str]: Extracted financial figures, dates, deal sizes
    source_url TEXT NOT NULL,                          -- Mandatory official outlink URL
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.filings_feed IS 'AI-summarized primary disclosures from SEC EDGAR and official Big Tech newsrooms (text & metadata only, zero media assets).';

-- ============================================================================
-- Indexes for Fast Deduplication & Mobile Feed Filtering
-- ============================================================================

-- Fast sorting by latest disclosures
CREATE INDEX IF NOT EXISTS idx_filings_feed_published_at
    ON public.filings_feed (published_at DESC);

-- Fast filtering by ticker + chronological order
CREATE INDEX IF NOT EXISTS idx_filings_feed_ticker_published
    ON public.filings_feed (ticker, published_at DESC);

-- Fast filtering by sentiment (Bullish / Bearish / Neutral)
CREATE INDEX IF NOT EXISTS idx_filings_feed_sentiment
    ON public.filings_feed (sentiment, published_at DESC);

-- Fast filtering by source_type (SEC / PRESS)
CREATE INDEX IF NOT EXISTS idx_filings_feed_source_type
    ON public.filings_feed (source_type, published_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE filings_feed ENABLE ROW LEVEL SECURITY;

-- Allow SELECT-only read access without login (`anon` & `authenticated`), blocking client-side writes
DROP POLICY IF EXISTS "Allow public read access on filings_feed" ON filings_feed;
DROP POLICY IF EXISTS "Public read access" ON filings_feed;
CREATE POLICY "Public read access" ON filings_feed FOR SELECT USING (true);

GRANT SELECT ON TABLE public.filings_feed TO anon, authenticated;

-- Note: INSERT / UPDATE / DELETE are intentionally NOT granted to anon/authenticated.
-- Only the Python collector using SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS) can write.

-- ============================================================================
-- Enable Supabase Realtime for Live Feed Push Updates
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'filings_feed'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.filings_feed;
    END IF;
END
$$;
