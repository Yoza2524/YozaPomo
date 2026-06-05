import { Howl } from 'howler'

/**
 * 音频管理器
 * 使用 Howler.js 播放音效，默认使用 Web Audio API 生成简单提示音
 */

type SoundType = 'focusEnd' | 'reminder' | 'restEnd'

interface SoundConfig {
  type: SoundType
  volume: number
  frequency: number
  duration: number
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  focusEnd: { type: 'focusEnd', volume: 0.5, frequency: 880, duration: 0.8 },
  reminder: { type: 'reminder', volume: 0.3, frequency: 660, duration: 0.3 },
  restEnd: { type: 'restEnd', volume: 0.5, frequency: 1040, duration: 0.6 },
}

let audioContext: AudioContext | null = null
let howlCache: Map<string, Howl> = new Map()

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * 使用 Web Audio API 生成提示音
 */
function playTone(frequency: number, duration: number, volume: number) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    // 衰减包络
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // 音频播放失败时静默处理
  }
}

/**
 * 播放自定义音频文件
 */
function playCustomSound(src: string, volume: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      let howl = howlCache.get(src)
      if (!howl) {
        howl = new Howl({ src: [src], volume, preload: true })
        howlCache.set(src, howl)
      }
      howl.volume(volume)
      howl.play()
      // Howler 没有直接的回调，使用大致时长
      const duration = (howl.duration() || 2) * 1000
      setTimeout(resolve, duration)
    } catch {
      resolve()
    }
  })
}

/**
 * 播放指定类型的提示音
 * @param type 音频类型
 * @param customSrc 自定义音频文件路径（可选，优先使用）
 */
export async function playSound(
  type: SoundType,
  customSrc?: string,
): Promise<void> {
  const config = SOUND_CONFIGS[type]

  // 优先使用自定义音频文件
  if (customSrc && customSrc !== 'default') {
    return playCustomSound(customSrc, config.volume)
  }

  // 默认使用 Web Audio API 生成提示音
  playTone(config.frequency, config.duration, config.volume)
}

/**
 * 播放专注结束提示音
 */
export function playFocusEndSound(customSrc?: string): Promise<void> {
  return playSound('focusEnd', customSrc)
}

/**
 * 播放 5 分钟提醒提示音
 */
export function playReminderSound(customSrc?: string): Promise<void> {
  return playSound('reminder', customSrc)
}

/**
 * 播放休息结束提示音
 */
export function playRestEndSound(customSrc?: string): Promise<void> {
  return playSound('restEnd', customSrc)
}

/**
 * 清理音频资源
 */
export function disposeSound() {
  howlCache.forEach((h) => h.unload())
  howlCache.clear()
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
}
