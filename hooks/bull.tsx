import type { ClientModule } from 'claude-code'

type Props = { mode: 'band' | 'edge'; isWorking: boolean }
type State = { tick: number }

// The bull as pixels, two to a terminal cell (upper and lower half):
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
const WIDTH = 11
const HEIGHT = 3

type Run = { text: string; color?: string; backgroundColor?: string }

// One terminal row from two pixel rows, as runs of one style each.
const runsOf = (upper: string, lower: string): Run[] => {
  const runs: Run[] = []

  for (let x = 0; x < WIDTH; x += 1) {
    const top = COLORS[upper[x] ?? '']
    const bottom = COLORS[lower[x] ?? '']
    const cell: Run =
      top === undefined && bottom === undefined
        ? { text: ' ' }
        : top === undefined
          ? { text: '▄', color: bottom }
          : bottom === undefined
            ? { text: '▀', color: top }
            : top === bottom
              ? { text: '█', color: top }
              : { text: '▀', color: top, backgroundColor: bottom }
    const last = runs[runs.length - 1]

    if (
      last !== undefined &&
      last.color === cell.color &&
      last.backgroundColor === cell.backgroundColor
    ) {
      last.text += cell.text
    } else {
      runs.push(cell)
    }
  }

  return runs
}

const ROWS = FRAMES.map(frame =>
  [0, 2, 4].map(y => runsOf(frame[y] ?? '', frame[y + 1] ?? '')),
)

type Spot = { x: number; y: number }

// Back and forth along one row.
const pace = (tick: number, columns: number): Spot => {
  const span = Math.max(1, columns - WIDTH)
  const step = tick % (span * 2)

  return { x: step < span ? step : span * 2 - step, y: 0 }
}

// Round the region's edge: along the bottom, up the right side, back along
// the top, down the left side.
const patrol = (tick: number, columns: number, rows: number): Spot => {
  const xMax = Math.max(1, columns - WIDTH)
  const yMax = Math.max(1, rows - HEIGHT)
  let step = tick % ((xMax + yMax) * 2)

  if (step < xMax) {
    return { x: step, y: yMax }
  }

  step -= xMax

  if (step < yMax) {
    return { x: xMax, y: yMax - step }
  }

  step -= yMax

  return step < xMax ? { x: xMax - step, y: 0 } : { x: 0, y: step - xMax }
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
  // Steady walk when idle, a quick-stepping charge while Claude works.
  const stride = props.isWorking ? tick % 2 : Math.floor(tick / 3) % 2
  const rows = ROWS[stride] ?? []

  return (
    <Box flexDirection="column" marginLeft={spot.x} marginTop={spot.y}>
      {rows.map(runs => (
        <Box flexDirection="row">
          {runs.map(run => (
            <Text color={run.color} backgroundColor={run.backgroundColor}>
              {run.text}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  )
}

export default Bull
