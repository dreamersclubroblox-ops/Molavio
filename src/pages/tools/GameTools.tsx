import { ToolShell } from "@/components/ToolShell";
import { AIChat } from "@/components/AIChat";

interface Cfg {
  slug: string;
  fallbackName: string;
  fallbackIcon: string;
  systemPrompt: string;
  placeholder: string;
  empty: string;
}

const TOOLS: Record<string, Cfg> = {
  "rb-avatar-designer": {
    slug: "rb-avatar-designer", fallbackName: "Avatar Designer", fallbackIcon: "User",
    systemPrompt: "Je helpt Roblox avatars ontwerpen. Geef beschrijvingen, body parts, kleuren, asset-IDs en een exporteerbare JSON-structuur volgens Roblox HumanoidDescription.",
    placeholder: "Beschrijf je avatar…",
    empty: "Beschrijf de Roblox avatar die je wilt — kleuren, accessoires, kleding.",
  },
  "rb-script-helper": {
    slug: "rb-script-helper", fallbackName: "Script Helper", fallbackIcon: "Code",
    systemPrompt: "Je bent een Roblox Luau expert. Schrijf werkende Server/Client/ModuleScripts in Luau met goede best practices. Gebruik altijd code-blocks.",
    placeholder: "Wat moet het script doen?",
    empty: "Vraag een Roblox Luau script — server, client, of module.",
  },
  "rb-ui-builder": {
    slug: "rb-ui-builder", fallbackName: "UI Builder", fallbackIcon: "LayoutGrid",
    systemPrompt: "Je bouwt Roblox ScreenGui's. Geef volledige Instance-tree's als Luau code (Instance.new) of als rbxmx XML, plus uitleg.",
    placeholder: "Beschrijf de UI die je nodig hebt…",
    empty: "Beschrijf de Roblox UI (menu, HUD, shop) en krijg complete code.",
  },
  "rb-plugin-maker": {
    slug: "rb-plugin-maker", fallbackName: "Plugin Maker", fallbackIcon: "Puzzle",
    systemPrompt: "Je maakt Roblox Studio plugins in Luau. Geef de plugin-structuur, toolbar/buttons en complete code, plus installatie-instructies.",
    placeholder: "Wat moet de plugin doen?",
    empty: "Beschrijf je Roblox Studio plugin — tools, buttons, gedrag.",
  },
  "mc-skin-editor": {
    slug: "mc-skin-editor", fallbackName: "Skin Editor", fallbackIcon: "User",
    systemPrompt: "Je helpt Minecraft skins ontwerpen. Beschrijf pixel-by-pixel ideeën, kleurenpaletten en geef een 64x64 PNG-layout uitleg per gebied.",
    placeholder: "Beschrijf je skin…",
    empty: "Beschrijf de Minecraft skin die je wilt maken.",
  },
  "mc-build-planner": {
    slug: "mc-build-planner", fallbackName: "Build Planner", fallbackIcon: "Hammer",
    systemPrompt: "Je plant Minecraft bouwprojecten. Geef materialen, afmetingen, stappen en blueprint-beschrijvingen.",
    placeholder: "Wat wil je bouwen?",
    empty: "Beschrijf je Minecraft bouwproject — kasteel, stad, redstone-machine.",
  },
  "mc-skin-pack": {
    slug: "mc-skin-pack", fallbackName: "Skin Pack Maker", fallbackIcon: "Package",
    systemPrompt: "Je maakt Minecraft Bedrock skin packs. Geef de manifest.json, skins.json structuur en stappen om als .mcpack te exporteren.",
    placeholder: "Wat voor skin pack wil je?",
    empty: "Beschrijf je skin pack — thema, hoeveel skins, voor wie.",
  },
  "mc-mod-maker": {
    slug: "mc-mod-maker", fallbackName: "Mod Maker (Java)", fallbackIcon: "Hammer",
    systemPrompt: "Je bouwt Minecraft Java mods voor Fabric én Paper plugins. Geef volledige Java/Kotlin code, fabric.mod.json of plugin.yml, build.gradle en stappen om te exporteren naar .jar.",
    placeholder: "Wat moet je mod / plugin doen? Voor Fabric of Paper?",
    empty: "Beschrijf je mod (Fabric) of plugin (Paper) — feature, items, events.",
  },
  "mc-addon-maker": {
    slug: "mc-addon-maker", fallbackName: "Addon Maker (Bedrock)", fallbackIcon: "Boxes",
    systemPrompt: "Je maakt Minecraft Bedrock add-ons (behavior + resource packs). Geef manifest.json, entity/block/item JSON's en exporteer-stappen naar .mcaddon.",
    placeholder: "Wat moet je add-on doen?",
    empty: "Beschrijf je Bedrock add-on — entities, items, blocks.",
  },
};

export function GenericGameTool({ slug }: { slug: string }) {
  const cfg = TOOLS[slug];
  if (!cfg) return null;
  return (
    <ToolShell slug={cfg.slug} fallbackName={cfg.fallbackName} fallbackIcon={cfg.fallbackIcon}>
      <AIChat
        systemPrompt={cfg.systemPrompt}
        placeholder={cfg.placeholder}
        emptyState={<p className="text-sm text-muted-foreground">{cfg.empty}</p>}
      />
    </ToolShell>
  );
}

export const GAME_TOOL_SLUGS = Object.keys(TOOLS);
