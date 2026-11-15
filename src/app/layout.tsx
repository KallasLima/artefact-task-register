import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import "@fontsource-variable/inter/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task register",
  description: "A simple in-memory task manager.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="app-sheet">
          <header className="site-header">
            <a href="/">
              <Icon name="register" />
              Task register
            </a>
          </header>
          <main id="main">{children}</main>
          <footer>
            <Icon name="info" />
            <span>Stored in memory. Tasks reset when the server restarts.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
