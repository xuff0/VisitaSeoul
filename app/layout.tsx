import type { Metadata, Viewport } from "next";
import Nav from "@/components/ui/Nav";
import ServiceWorker from "@/components/ui/ServiceWorker";
import SyncProvider from "@/components/ui/SyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seúl para caminar",
  description:
    "Mapa de Seúl con tu ubicación, los sitios que importan y qué conviene comprar para llevar a Bolivia.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Seúl", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#16181d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="mx-auto max-w-[1180px] px-3 pb-10">
          <header className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-2.5">
            <div>
              <h1 className="m-0 text-[21px] font-semibold tracking-tight">
                Seúl para caminar
                <span className="ml-2 text-[17px] font-medium text-ink-3">서울</span>
              </h1>
              <p className="mt-1 mb-0 text-[13.5px] text-ink-2">
                Dónde estás, qué hay cerca y qué conviene comprar para llevar a Bolivia.
              </p>
            </div>
            <Nav />
          </header>
          {children}
        </div>
        <ServiceWorker />
        <SyncProvider />
      </body>
    </html>
  );
}
