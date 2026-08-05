UPDATE public.watches
SET kind = 'dated_feed', use_firecrawl = false
WHERE url IN ('https://elevenlabs.io/docs/changelog', 'https://developers.deepgram.com/changelog');