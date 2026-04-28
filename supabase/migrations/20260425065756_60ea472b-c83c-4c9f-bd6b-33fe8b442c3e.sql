-- Multi-file storage for website builder
CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.website_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  path text NOT NULL,
  content text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'plaintext',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read files" ON public.project_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert files" ON public.project_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update files" ON public.project_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete files" ON public.project_files FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER project_files_updated_at BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_project_files_project ON public.project_files(project_id);

-- AI usage log
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,
  model text,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  total_cost int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all usage" ON public.ai_usage FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_ai_usage_user ON public.ai_usage(user_id, created_at DESC);

-- Atomic token deduction (server-side from edge functions)
CREATE OR REPLACE FUNCTION public.deduct_tokens(_user_id uuid, _amount int, _tool text, _model text, _in int, _out int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bal bigint;
BEGIN
  SELECT balance INTO bal FROM public.user_tokens WHERE user_id = _user_id FOR UPDATE;
  IF bal IS NULL THEN
    INSERT INTO public.user_tokens (user_id, balance) VALUES (_user_id, 50000);
    bal := 50000;
  END IF;
  IF bal < _amount THEN
    RETURN jsonb_build_object('ok', false, 'balance', bal, 'required', _amount);
  END IF;
  UPDATE public.user_tokens SET balance = balance - _amount, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.ai_usage (user_id, tool, model, input_tokens, output_tokens, total_cost)
  VALUES (_user_id, _tool, _model, _in, _out, _amount);
  RETURN jsonb_build_object('ok', true, 'balance', bal - _amount, 'charged', _amount);
END; $$;

-- Drop old yearly charge function and column
DROP FUNCTION IF EXISTS public.charge_website_projects(uuid);
ALTER TABLE public.website_projects DROP COLUMN IF EXISTS last_charged_year;