// Augment the Window interface to include gtag (injected by @next/third-parties/google)
interface Window {
  gtag?: (...args: unknown[]) => void
}
