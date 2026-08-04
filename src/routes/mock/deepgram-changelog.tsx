import { createFileRoute } from "@tanstack/react-router";
import { getMockContent } from "@/lib/mock-changelog.server";

export const Route = createFileRoute("/mock/deepgram-changelog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const v = Number(url.searchParams.get("v") ?? "1");
        const content = getMockContent(v);
        // Serve plain markdown when requested by the capture agent, else render HTML.
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/plain") || accept.includes("text/markdown")) {
          return new Response(content, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Deepgram Changelog — Mock</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #222; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.15rem; margin-top: 1.5rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    .version { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
    nav { margin-top: 2rem; font-size: 0.9rem; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <p class="version">Mock version ${v} — <a href="?v=1">v1 (baseline)</a> · <a href="?v=2">v2 (changed)</a></p>
  <main id="content">
${content
  .split("\n")
  .map((line) => (line.startsWith("#") ? line : `<p>${line || "&nbsp;"}</p>`))
  .join("\n")}
  </main>
  <nav><a href="/">← Back to Dependency Drift Monitor</a></nav>
</body>
</html>`;
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      },
    },
  },
  component: () => null,
});
