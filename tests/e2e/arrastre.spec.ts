import { expect, test, type Page } from '@playwright/test'

// Arrastrar una tarjeta a otra columna: mientras se arrastra se ve una copia
// fiel pegada al cursor (o al dedo), en el origen queda un hueco y la columna
// destino se marca. Al soltar queda en la columna nueva.
// Con SHOTS=dir guarda capturas a mitad del arrastre.

const SHOTS = process.env.SHOTS

async function setup(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Crear sala' }).click()
  await page.waitForURL(/#\/room\//)
  await page.getByPlaceholder('Tu nombre').fill('Ana')
  await page.getByRole('button', { name: 'Entrar' }).click()
  const input = page.getByPlaceholder('Escribí una tarjeta…')
  await expect(input.first()).toBeVisible()
  for (const [col, text] of [
    [0, 'Pairing en pagos 🚀'],
    [0, 'La daily fue corta'],
    [1, 'Menos reuniones'],
  ] as const) {
    await input.nth(col).fill(text)
    await input.nth(col).press('Enter')
  }
  await expect(page.getByText('Menos reuniones')).toBeVisible()
}

const columnOf = (page: Page, title: string) =>
  page.locator('[data-column-id]', { has: page.locator('h3', { hasText: title }) })

const overlay = (page: Page) => page.locator('.card-lift')

test('mouse: la tarjeta viaja con el cursor y cae en la otra columna', async ({ page }) => {
  await setup(page)
  const card = columnOf(page, 'Lo que estuvo bien').locator('div.group', {
    hasText: 'Pairing en pagos',
  })
  const from = (await card.boundingBox())!
  const to = (await columnOf(page, 'Lo que mejorar')
    .locator('div.group', { hasText: 'Menos reuniones' })
    .boundingBox())!

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 10, { steps: 4 })

  // Copia fiel, mismo ancho, flotando sobre todo
  await expect(overlay(page)).toBeVisible()
  await expect(overlay(page)).toContainText('Pairing en pagos 🚀')
  await expect(overlay(page)).toContainText('Ana')
  const lifted = (await overlay(page).boundingBox())!
  expect(Math.abs(lifted.width - from.width)).toBeLessThan(from.width * 0.06)
  await expect(page.locator('.drag-placeholder')).toHaveCount(1)

  await page.mouse.move(to.x + to.width / 2, to.y + to.height + 40, { steps: 15 })
  // El hueco se mudó a la columna destino, que queda marcada
  await expect(
    columnOf(page, 'Lo que mejorar').locator('.drag-placeholder'),
  ).toHaveCount(1)
  await expect(columnOf(page, 'Lo que mejorar')).toHaveClass(/ring-2/)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/arrastre-mouse.png` })

  await page.mouse.up()
  await expect(overlay(page)).toHaveCount(0)
  await expect(columnOf(page, 'Lo que mejorar').getByText('Pairing en pagos 🚀')).toBeVisible()
  await expect(columnOf(page, 'Lo que estuvo bien').getByText('Pairing en pagos 🚀')).toHaveCount(0)
  // Y queda debajo de la que ya estaba
  const moved = (await columnOf(page, 'Lo que mejorar').getByText('Pairing en pagos 🚀').boundingBox())!
  expect(moved.y).toBeGreaterThan(to.y)

  // Recargar: la posición es la de Firestore, no solo la de la vista
  await page.reload()
  await expect(columnOf(page, 'Lo que mejorar').getByText('Pairing en pagos 🚀')).toBeVisible()
})

test('touch: mantener apretado levanta la tarjeta y se arrastra con el dedo', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: false,
  })
  const page = await ctx.newPage()
  await setup(page)
  const card = columnOf(page, 'Lo que estuvo bien').locator('div.group', {
    hasText: 'La daily fue corta',
  })
  const from = (await card.boundingBox())!
  const to = (await columnOf(page, 'Lo que mejorar').getByText('Menos reuniones').boundingBox())!

  const cdp = await ctx.newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    })
  const x0 = from.x + from.width / 2
  const y0 = from.y + from.height / 2
  await touch('touchStart', x0, y0)
  await page.waitForTimeout(350) // pasa el delay de 200ms del TouchSensor
  const x1 = to.x + to.width / 2
  const y1 = to.y + to.height + 30
  for (let i = 1; i <= 15; i++) {
    await touch('touchMove', x0 + ((x1 - x0) * i) / 15, y0 + ((y1 - y0) * i) / 15)
  }
  await expect(overlay(page)).toContainText('La daily fue corta')
  await expect(columnOf(page, 'Lo que mejorar').locator('.drag-placeholder')).toHaveCount(1)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/arrastre-touch.png` })
  await touch('touchEnd', x1, y1)

  await expect(overlay(page)).toHaveCount(0)
  await expect(columnOf(page, 'Lo que mejorar').getByText('La daily fue corta')).toBeVisible()
  await ctx.close()
})
