/**
 * Web Audio 分析器单例。
 * 注意：MediaElementSource 只能对同一个 <audio> 创建一次，因此全局缓存。
 */

let context: AudioContext | null = null
let analyser: AnalyserNode | null = null
let boundElement: HTMLAudioElement | null = null

export function getAnalyser(element: HTMLAudioElement): AnalyserNode | null {
  if (analyser && boundElement === element) {
    if (context?.state === 'suspended') void context.resume()
    return analyser
  }
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = context ?? new Ctor()
    const source = context.createMediaElementSource(element)
    analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    analyser.minDecibels = -85
    source.connect(analyser)
    analyser.connect(context.destination)
    boundElement = element
    if (context.state === 'suspended') void context.resume()
    return analyser
  } catch {
    // 某些浏览器（如无 Web Audio 支持）降级为无可视化
    return null
  }
}
