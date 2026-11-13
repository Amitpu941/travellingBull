import type { ClientModule } from 'claude-code'

type Props = { mode: 'band' | 'edge'; isWorking: boolean }
type State = { tick: number }

// Each sprite is 12 cells wide and 2 rows tall.
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

// Back and forth along one row.
const pace = (tick: number, columns: number): Spot => {
  const span = Math.max(1, columns - WIDTH)
  const step = tick % (span * 2)

  return step < span
    ? { x: step, y: 0, isFacingRight: true }
    : { x: span * 2 - step, y: 0, isFacingRight: false }
}

// Round the region's edge: along the bottom, up the right side, back along
// the top, down the left side.
const patrol = (tick: number, columns: number, rows: number): Spot => {
  const xMax = Math.max(1, columns - WIDTH)
  const yMax = Math.max(1, rows - HEIGHT)
  let step = tick % ((xMax + yMax) * 2)

  if (step < xMax) {
    return { x: step, y: yMax, isFacingRight: true }
  }

  step -= xMax

  if (step < yMax) {
    return { x: xMax, y: yMax - step, isFacingRight: false }
  }

  step -= yMax

  if (step < xMax) {
    return { x: xMax - step, y: 0, isFacingRight: false }
  }

  return { x: 0, y: step - xMax, isFacingRight: true }
}

const Bull: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements

  if (surface.state === undefined) {
    surface.setState({ tick: 0 })
    surface.every(140, () => {
      surface.setState({ tick: (surface.state?.tick ?? 0) + 1 })
    })
  }

  const tick = surface.state?.tick ?? 0
  const columns = surface.columns || 60
  const spot =
    props.mode === 'edge'
      ? patrol(tick, columns, surface.rows || 20)
      : pace(tick, columns)
  const sprite = spot.isFacingRight ? RIGHT : LEFT
  // Steady walk when idle, a quick-stepping charge while Claude works.
  const stride = props.isWorking ? tick % 2 : Math.floor(tick / 3) % 2
  const color = props.isWorking ? 'green' : undefined

  return (
    <Box flexDirection="column" marginLeft={spot.x} marginTop={spot.y}>
      <Text mono color={color}>
        {sprite.top[props.isWorking ? 1 : 0]}
      </Text>
      <Text mono color={color}>
        {sprite.legs[stride]}
      </Text>
    </Box>
  )
}

export default Bull
