import { OpenAiLogoIcon } from "@phosphor-icons/react/ssr";

import { ClaudeLogo, CursorLogo, GeminiLogo } from "@/components/setup/agent-logos";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/setup/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AGENT_NAMES, setupPrompt, type SetupAgent } from "@/lib/setup/ai-prompt";

// Each product's own mark (components/setup/agent-logos.tsx).
const ICONS: Record<SetupAgent, React.ComponentType<React.ComponentProps<"svg">>> = {
  claude: ClaudeLogo,
  codex: OpenAiLogoIcon,
  gemini: GeminiLogo,
  cursor: CursorLogo,
};

const AGENTS = Object.keys(AGENT_NAMES) as SetupAgent[];

/** /setup's first path, "Let your AI do it": one prompt per agent that installs, signs in through the browser and pushes. */
export function AiSetupCard() {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Let your AI do it"
        meta={<Badge>Recommended</Badge>}
        description="Copy the prompt for your agent and paste it in. It runs the steps below for you, and you approve once in the browser. The prompt never holds a token."
      />
      <Card>
        <CardContent>
          <Tabs defaultValue="claude">
            <TabsList>
              {AGENTS.map((agent) => {
                const AgentIcon = ICONS[agent];
                return (
                  <TabsTrigger key={agent} value={agent}>
                    <AgentIcon aria-hidden="true" />
                    {AGENT_NAMES[agent]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {AGENTS.map((agent) => (
              <TabsContent key={agent} value={agent}>
                <div className="pt-3">
                  <CodeBlock
                    code={setupPrompt(agent)}
                    filename={`Prompt for ${AGENT_NAMES[agent]}`}
                    lineNumbers={false}
                    defaultWrap
                    copyLabel={`Copy the ${AGENT_NAMES[agent]} prompt`}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
