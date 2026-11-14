import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'bull-buddy',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('the terminal band holds the animated bull', async $ => {
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  expect(await ui.find({ type: 'Client' })).toBeTruthy()
  await ui.unmount()
})

test('the apps get the bull as a picture', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect(await ui.find({ type: 'Svg' })).toBeTruthy()
    await ui.unmount()
  }
})
