import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const PLUGIN = 'bull-buddy'
const SCENE = 'pasture'
const isHidden = atom({ plugin: 'bull-buddy', key: 'isHidden' } as const, false)
const step = atom({ plugin: 'bull-buddy', key: 'step' } as const, 0)

// The same bull the terminal's surface module draws (hooks/bull.tsx).
const WIDTH = 12
const HEIGHT = 2
const RIGHT = {
  top: ['~╭━━━━━(\\_/)', '≈╭━━━━━(\\_/)'],
  legs: [' ┃┃  ┃┃ (••)', ' ╱╲  ╱╲ (••)'],
}
const LEFT = {
  top: ['(\\_/)━━━━━╮~', '(\\_/)━━━━━╮≈'],
  legs: ['(••) ┃┃  ┃┃ ', '(••) ╱╲  ╱╲ '],
}

type Spot = { x: number; y: number; isFacingRight: boolean }

const pace = (tick: number, columns: number): Spot => {
  const span = Math.max(1, columns - WIDTH)
  const at = tick % (span * 2)

  return at < span
    ? { x: at, y: 0, isFacingRight: true }
    : { x: span * 2 - at, y: 0, isFacingRight: false }
}

const patrol = (tick: number, columns: number, rows: number): Spot => {
  const xMax = Math.max(1, columns - WIDTH)
  const yMax = Math.max(1, rows - HEIGHT)
  let at = tick % ((xMax + yMax) * 2)

  if (at < xMax) {
    return { x: at, y: yMax, isFacingRight: true }
  }

  at -= xMax

  if (at < yMax) {
    return { x: xMax, y: yMax - at, isFacingRight: false }
  }

  at -= yMax

  if (at < xMax) {
    return { x: xMax - at, y: 0, isFacingRight: false }
  }

  return { x: 0, y: at - xMax, isFacingRight: true }
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
    // Desktop and mobile apps only: lets the bull walk the window's edge.
    void $.theme
      .set({ backdrop: { scene: SCENE, glass: false } })
      .catch(() => undefined)

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
        <Box width={e.props.bodyColumns} height={2}>
          <Client
            key="bull"
            module="./bull.tsx"
            width="100%"
            height={2}
            props={{ mode: 'band', isWorking: e.props.isWorking }}
          />
        </Box>
      )
    }

    walk($)
    const { Box, Text } = $.ui.resolve(e)
    const tick = await read($, step)
    const spot = pace(tick, Math.max(WIDTH + 8, e.props.bodyColumns || 60))
    const sprite = spot.isFacingRight ? RIGHT : LEFT
    const color = e.props.isWorking ? 'green' : undefined

    return (
      <Box flexDirection="column" marginLeft={spot.x}>
        <Text mono color={color}>
          {sprite.top[e.props.isWorking ? 1 : 0]}
        </Text>
        <Text mono color={color}>
          {sprite.legs[(tick / 2) % 2]}
        </Text>
      </Box>
    )
  })

  // The backdrop behind the conversation: the bull walks the whole edge.
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== PLUGIN || e.props.scene !== SCENE) {
      return next(e)
    }

    const columns = e.viewport?.columns ?? 0
    const rows = e.viewport?.rows ?? 0
    const { Box, Text } = $.ui.resolve(e)

    if (await read($, isHidden)) {
      return <Box />
    }

    walk($)
    const tick = await read($, step)
    const spot = patrol(tick, columns || 100, rows || 30)
    const sprite = spot.isFacingRight ? RIGHT : LEFT

    return (
      <Box width="100%" height="100%">
        <Box flexDirection="column" marginLeft={spot.x} marginTop={spot.y}>
          <Text mono>{sprite.top[0]}</Text>
          <Text mono>{sprite.legs[(tick / 2) % 2]}</Text>
        </Box>
      </Box>
    )
  })
}
