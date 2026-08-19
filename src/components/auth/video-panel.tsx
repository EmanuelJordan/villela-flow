'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Metade direita da tela de login: vídeo institucional em loop com gradação
 * na paleta Villela. O vídeo vive em /public/videos/login-bg.mp4 (H.264) —
 * para trocar, basta substituir o arquivo. Se ele faltar ou falhar, entra a
 * textura estática de marca.
 */
export function VideoPanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [pronto, setPronto] = useState(false)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // O arquivo local carrega rápido: canplay/error podem disparar ANTES da
    // hidratação e os handlers React perderem o evento — conferir o estado
    // atual cobre esse caso e destrava o autoplay.
    if (video.error) {
      setFalhou(true)
      return
    }
    if (video.readyState >= 2) setPronto(true)
    void video.play().catch(() => {})
  }, [])

  return (
    <aside className="relative hidden overflow-hidden bg-[var(--villela-navy)] lg:flex">
      {/* textura estática de marca — fundo permanente sob o vídeo */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_75%_15%,rgb(17_103_128/0.45),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(115deg,transparent_0_46px,#5bc8f5_46px_47px)]" />
      </div>

      {!falhou && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            pronto ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
          onLoadedData={() => setPronto(true)}
          onCanPlay={() => setPronto(true)}
          onError={() => setFalhou(true)}
        >
          <source src="/videos/login-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* gradação da marca sobre o vídeo */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[var(--villela-teal-escuro)]/25 mix-blend-multiply"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[var(--villela-navy)] via-[var(--villela-navy)]/40 to-[var(--villela-navy)]/10"
      />

      {/* costura de fluxo entre as duas metades */}
      <div aria-hidden className="flow-seam absolute inset-y-0 left-0 z-10 w-px" />

      <div className="relative z-10 mt-auto w-full p-10 xl:p-14">
        <p className="text-[0.7rem] font-medium tracking-[0.22em] text-[#5bc8f5] uppercase">
          Performance em Vendas
        </p>
        <p className="font-display mt-3 max-w-[18ch] text-[clamp(1.8rem,2.4vw,2.5rem)] leading-[1.12] font-medium tracking-tight text-white">
          Do diagnóstico ao fechamento, em um só fluxo.
        </p>
        <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/70">
          Funil, agenda e follow-ups da operação — sem redigitação e sem agenda
          duplicada.
        </p>
      </div>
    </aside>
  )
}
