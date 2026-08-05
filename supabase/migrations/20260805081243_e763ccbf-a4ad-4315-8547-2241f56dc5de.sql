ALTER TABLE public.watches ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'LLM';

UPDATE public.watches SET role = 'LLM' WHERE vendor = 'OpenAI';
UPDATE public.watches SET role = 'TTS' WHERE vendor = 'ElevenLabs';
UPDATE public.watches SET role = 'noise-cancel' WHERE vendor = 'Krisp';
UPDATE public.watches SET role = 'STT' WHERE vendor = 'Deepgram';