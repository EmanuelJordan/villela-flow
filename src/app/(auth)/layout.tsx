import { VideoPanel } from '@/components/auth/video-panel'
import { VillelaLogo } from '@/components/brand/villela-logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col bg-background px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
        <header>
          <VillelaLogo />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px] rounded-2xl border border-border bg-white p-7 shadow-[0_1px_3px_rgb(8_30_46/0.06),0_12px_32px_-16px_rgb(8_30_46/0.14)] sm:p-10">
            {children}
          </div>
        </main>
        <footer className="text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} Grupo Villela · Sistema de uso interno
        </footer>
      </div>
      <VideoPanel />
    </div>
  )
}
