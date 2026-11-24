// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

// The one public base URL of the docs. The app's in-app links (P-DOCS.2) use the same origin.
export const SITE = "https://docs.lucid-agents.com";

export default defineConfig({
  site: SITE,
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "LUCID Agent Docs",
      description: "How to install LUCID Agent, connect your AI, and get work done with agents.",
      logo: { src: "./src/assets/lucid.svg", alt: "" },
      favicon: "/favicon.svg",
      social: [
        { icon: "github", label: "LUCID Agent on GitHub", href: "https://github.com/mlcyclops/lucidagentide" },
      ],
      editLink: { baseUrl: "https://github.com/mlcyclops/lucid-agent-docs/edit/main/" },
      lastUpdated: true,
      customCss: ["./src/styles/custom.css"],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
      },
      sidebar: [
        { label: "Get started", items: [{ autogenerate: { directory: "get-started" } }] },
        { label: "Connect your apps and AI", items: [{ autogenerate: { directory: "connect" } }] },
        { label: "Glossary", link: "/glossary/" },
      ],
      plugins: [starlightLinksValidator({ errorOnLocalLinks: true })],
    }),
  ],
});
