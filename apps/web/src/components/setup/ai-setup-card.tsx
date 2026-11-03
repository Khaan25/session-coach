import { AsteriskIcon, CursorIcon, OpenAiLogoIcon, SparkleIcon } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AGENT_NAMES, setupPrompt, type SetupAgent } from "@/lib/setup/ai-prompt";

// Stand-in marks from Phosphor, not the vendors' logos.
const ICONS: Record<SetupAgent, Icon> = {
  claude: AsteriskIcon,
  codex: OpenAiLogoIcon,
  gemini: SparkleIcon,
  cursor: CursorIcon,
};

const AGENTS = Object.keys(AGENT_NAMES) as SetupAgent[];

/** /setup's first card: one prompt per agent that installs, signs in through the browser and pushes. */
export function AiSetupCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Set up with your AI</h2>
        </CardTitle>
        <CardDescription>
          Copy the prompt, paste it into your agent, then approve once in the browser. The prompt
          never holds a token.
        </CardDescription>
      </CardHeader>
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
  );
}
