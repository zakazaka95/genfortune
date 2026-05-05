import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GenFortune — AI Fortune Cookies on GenLayer" },
      { name: "description", content: "Pay 0.1 GEN. AI generates your unique fortune onchain. Powered by GenLayer." },
      { name: "author", content: "Zaksans" },
      { property: "og:title", content: "GenFortune — AI Fortune Cookies on GenLayer" },
      { property: "og:description", content: "Pay 0.1 GEN. AI generates your unique fortune onchain. Powered by GenLayer." },
      { property: "og:url", content: "https://genfortune.xyz" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/IhlzXUUNDKgtL0h8xxb3VDNTxby2/social-images/social-1778024199518-f0865179-d71d-4052-9493-e0ce9daee866.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GenFortune — AI Fortune Cookies on GenLayer" },
      { name: "twitter:description", content: "Pay 0.1 GEN. AI generates your unique fortune onchain. Powered by GenLayer." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/IhlzXUUNDKgtL0h8xxb3VDNTxby2/social-images/social-1778024199518-f0865179-d71d-4052-9493-e0ce9daee866.webp" },
      { name: "base:app_id", content: "69f7ac2767b0f79c5f048ddb" },
      { name: "talentapp:project_verification", content: "1e96cbd069af6e07149848a85d4aa83df8b0b6a5551d7aff53b48f382cef3281ea5a22a5c6634fbea906af0787355c64d5e84f959a968dbc7b1b50574a650d07" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/og-image.png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
