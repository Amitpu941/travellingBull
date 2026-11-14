import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const isHidden = atom({ plugin: 'bull-buddy', key: 'isHidden' } as const, false)
const step = atom({ plugin: 'bull-buddy', key: 'step' } as const, 0)

// The same pixel bull the terminal's surface module draws (hooks/bull.tsx):
// G body, H horn, S snout; anything else is see-through (eyes, nostrils).
const COLORS: Record<string, string> = {
  G: '#2FA36B',
  H: '#E3B04B',
  S: '#F2B5A0',
}
const FRAMES = [
  [
    'H.........H',
    'HHGGGGGGGHH',
    '.GGDGGGDGG.',
    'GGGGGGGGGGG',
    '.GSSDSDSSG.',
    '.G.G...G.G.',
  ],
  [
    'H.........H',
    'HHGGGGGGGHH',
    '.GGDGGGDGG.',
    'GGGGGGGGGGG',
    '.GSSDSDSSG.',
    '..GG...GG..',
  ],
]

function svgOf(frame: readonly string[]): string {
  let rects = ''

  frame.forEach((row, y) => {
    Array.from(row).forEach((pixel, x) => {
      const fill = COLORS[pixel]

      if (fill !== undefined) {
        rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fill}"/>`
      }
    })
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 6" shape-rendering="crispEdges">${rects}</svg>`
}

const SVGS = FRAMES.map(svgOf)
const ALT = 'A small green pixel bull with gold horns'
// Roughly how many text columns and rows the drawn bull covers in the apps.
const WIDTH = 8
const HEIGHT = 2

type Spot = { x: number; y: number }

function pace(tick: number, columns: number): Spot {
  const span = Math.max(1, columns - WIDTH)
  const at = tick % (span * 2)

  return { x: at < span ? at : span * 2 - at, y: 0 }
}

// Where no surface module can be trusted to draw, the hook animates.
let isWalking = false

function walk($: EngineInterface): void {
  if (isWalking) {
    return
  }

  isWalking = true
  $.clock.every(400, () => {
    void update($, step, n => (n + 2) % 1_000_000).catch(() => undefined)
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'bull',
      description: 'Show or hide your bull',
    })
    return next(e)
  })

  on('command.run', { command: 'bull' }, async $ => {
    const hidden = await update($, isHidden, was => !was)

    return { text: hidden ? 'The bull went to rest.' : 'The bull is back.' }
  })

  // The band above the prompt: the bull paces left and right.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    if (e.surface === 'terminal') {
      const { Box, Client } = $.ui.resolve(e)

      return (
        <Box width={e.props.bodyColumns} height={3}>
          <Client
            key="bull"
            module="./bull.tsx"
            width="100%"
            height={3}
            props={{ mode: 'band', isWorking: e.props.isWorking }}
          />
        </Box>
      )
    }

    walk($)
    const { Box, Svg } = $.ui.resolve(e)
    const tick = await read($, step)
    const spot = pace(tick, Math.max(WIDTH + 8, e.props.bodyColumns || 60))
    // Steady walk when idle, a quick-stepping charge while Claude works.
    const stride = e.props.isWorking ? (tick / 2) % 2 : Math.floor(tick / 4) % 2

    return (
      <Box marginLeft={spot.x}>
        <Svg source={SVGS[stride] ?? ''} alt={ALT} width={33} height={18} />
      </Box>
    )
  })
}
