
-- ===== TOKENS =====
CREATE TABLE public.user_tokens (
  user_id uuid PRIMARY KEY,
  balance bigint NOT NULL DEFAULT 50000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read tokens" ON public.user_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner update tokens" ON public.user_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner insert tokens" ON public.user_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage tokens" ON public.user_tokens FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create token row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_tokens()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_tokens (user_id, balance) VALUES (NEW.id, 50000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_tokens
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tokens();

-- ===== WEBSITE PROJECTS =====
CREATE TABLE public.website_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  last_charged_year int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read projects" ON public.website_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert projects" ON public.website_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update projects" ON public.website_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete projects" ON public.website_projects FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER website_projects_updated BEFORE UPDATE ON public.website_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PROJECT MESSAGES (chat) =====
CREATE TABLE public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.website_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read msgs" ON public.project_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert msgs" ON public.project_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete msgs" ON public.project_messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_project_messages_project ON public.project_messages(project_id, created_at);

-- ===== Yearly charge function =====
-- Charges 10k tokens per enabled project for the current year if not yet charged.
CREATE OR REPLACE FUNCTION public.charge_website_projects(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_yr int := EXTRACT(YEAR FROM now())::int;
  proj record;
  total_cost bigint := 0;
  bal bigint;
  charged uuid[] := ARRAY[]::uuid[];
BEGIN
  FOR proj IN
    SELECT id FROM public.website_projects
    WHERE user_id = _user_id AND enabled = true AND COALESCE(last_charged_year, 0) < current_yr
  LOOP
    total_cost := total_cost + 10000;
    charged := array_append(charged, proj.id);
  END LOOP;

  IF total_cost = 0 THEN
    RETURN jsonb_build_object('charged', 0, 'projects', charged);
  END IF;

  SELECT balance INTO bal FROM public.user_tokens WHERE user_id = _user_id;
  IF bal IS NULL THEN
    INSERT INTO public.user_tokens (user_id, balance) VALUES (_user_id, 0);
    bal := 0;
  END IF;

  IF bal < total_cost THEN
    -- Disable enabled projects until user pays
    UPDATE public.website_projects SET enabled = false
    WHERE user_id = _user_id AND enabled = true AND COALESCE(last_charged_year, 0) < current_yr;
    RETURN jsonb_build_object('error','insufficient_balance','required',total_cost,'balance',bal);
  END IF;

  UPDATE public.user_tokens SET balance = balance - total_cost, updated_at = now() WHERE user_id = _user_id;
  UPDATE public.website_projects SET last_charged_year = current_yr
  WHERE id = ANY(charged);

  RETURN jsonb_build_object('charged', total_cost, 'projects', charged);
END; $$;

-- ===== Seed: new app + new tools =====
INSERT INTO public.apps (slug, name, icon, accent_color, description) VALUES
  ('websites', 'Websites', 'Globe', '#0a0a0a', 'AI website builder — bouw oneindige sites met chat')
ON CONFLICT (slug) DO NOTHING;

-- Insert/Upsert tools
INSERT INTO public.tools (slug, name, description, type, size, route, icon, app_id) VALUES
  ('website-builder', 'Website Builder', 'Bouw met AI complete websites — chat per project', 'ai', 'lg', '/tools/website-builder', 'Globe', NULL),
  ('code-ai', 'Code AI', 'Genereer en bewerk code in elke taal', 'ai', 'md', '/tools/code', 'Code', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Roblox tools
INSERT INTO public.tools (slug, name, description, type, size, route, icon, app_id)
SELECT 'rb-ui-builder', 'UI Builder', 'Bouw Roblox UI met instant export', 'app', 'md', '/tools/rb-ui-builder', 'LayoutGrid', id FROM public.apps WHERE slug='roblox'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.tools (slug, name, description, type, size, route, icon, app_id)
SELECT 'rb-plugin-maker', 'Plugin Maker', 'Maak Roblox Studio plugins met AI', 'app', 'md', '/tools/rb-plugin-maker', 'Puzzle', id FROM public.apps WHERE slug='roblox'
ON CONFLICT (slug) DO NOTHING;

-- Minecraft tools
INSERT INTO public.tools (slug, name, description, type, size, route, icon, app_id)
SELECT 'mc-skin-pack', 'Skin Pack Maker', 'Maak en exporteer skin packs', 'app', 'md', '/tools/mc-skin-pack', 'Package', id FROM public.apps WHERE slug='minecraft'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.tools (slug, name, description, type, size, route, icon, app_id)
SELECT 'mc-mod-maker', 'Mod Maker (Java)', 'Fabric & Paper mods met AI assist + bestanden', 'app', 'md', '/tools/mc-mod-maker', 'Hammer', id FROM public.apps WHERE slug='minecraft'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.tools (slug, name, description, type, size, route, icon, app_id)
SELECT 'mc-addon-maker', 'Addon Maker (Bedrock)', 'Bedrock add-ons met AI + instant export', 'app', 'md', '/tools/mc-addon-maker', 'Boxes', id FROM public.apps WHERE slug='minecraft'
ON CONFLICT (slug) DO NOTHING;
