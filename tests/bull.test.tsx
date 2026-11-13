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

test('the apps get a bull drawn as plain text', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })

    expect((await ui.find({ type: 'Text', text: /\(••\)/ }))?.text).toContain(
      '(••)',
    )
    await ui.unmount()
  }
})

test('the backdrop draws the edge walk on desktop', async $ => {
  const ui = await $.ui.mount({
    plugin: 'bull-buddy',
    component: 'Backdrop',
    surface: 'desktop',
    props: { scene: 'pasture', plugin: 'bull-buddy', glass: false },
  })

  expect(await ui.find({ type: 'Text', text: /\(••\)/ })).toBeTruthy()
  await ui.unmount()
})
