import { expect, test, type Browser, type Page } from '@playwright/test'

// Una retro completa con dos personas: crear sala, escribir oculto, revelar,
// votar y mover una tarjeta. Si esto anda, la app esta usable.

async function join(page: Page, name: string) {
  await page.getByPlaceholder('Tu nombre').fill(name)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByPlaceholder('Escribí una tarjeta…').first()).toBeVisible()
}

async function addCard(page: Page, column: number, text: string) {
  const input = page.getByPlaceholder('Escribí una tarjeta…').nth(column)
  await input.fill(text)
  await input.press('Enter')
}

async function newPage(browser: Browser) {
  const ctx = await browser.newContext()
  return ctx.newPage()
}

test('retro con dos personas', async ({ browser }) => {
  const admin = await newPage(browser)
  await admin.goto('./')
  await admin.getByPlaceholder('Nombre de la retro (opcional)').fill('Retro e2e')
  await admin.getByRole('button', { name: 'Crear sala' }).click()
  await admin.waitForURL(/#\/room\//)
  await join(admin, 'Ana')
  await addCard(admin, 0, 'La daily fue corta')

  const caro = await newPage(browser)
  await caro.goto(admin.url())
  await join(caro, 'Caro')
  await addCard(caro, 0, 'Pairing en pagos')
  await addCard(caro, 1, 'Deploys manuales')

  // Modo escritura: cada uno ve solo lo suyo, lo ajeno como "Oculta"
  await expect(admin.getByText('Pairing en pagos')).toHaveCount(0)
  await expect(admin.getByText('Oculta')).toHaveCount(2)
  await expect(caro.getByText('La daily fue corta')).toHaveCount(0)
  // Revelar es solo del admin
  await expect(caro.getByRole('button', { name: /Revelar/ })).toHaveCount(0)

  await admin.getByRole('button', { name: /Revelar/ }).click()
  await expect(caro.getByText('La daily fue corta')).toBeVisible()
  await expect(admin.getByText('Deploys manuales')).toBeVisible()

  // Votacion: Caro vota la tarjeta de Ana y al cerrar se ve el total
  await admin.getByRole('button', { name: /Votar/ }).first().click()
  await expect(caro.getByText('Votación abierta.')).toBeVisible()
  const cardAna = caro.locator('div.group', { hasText: 'La daily fue corta' })
  await cardAna.getByRole('button', { name: /Votar/ }).click()
  await cardAna.getByRole('button', { name: 'Sumar un voto' }).click()
  await admin.getByRole('button', { name: /Cerrar votación/ }).click()
  await expect(
    admin.locator('div.group', { hasText: 'La daily fue corta' }).getByTitle('2 votos'),
  ).toBeVisible()

  // Caro arrastra su tarjeta a "Lo que mejorar" y Ana lo ve
  const source = caro.getByText('Pairing en pagos')
  const target = caro.getByPlaceholder('Escribí una tarjeta…').nth(1)
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  await caro.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await caro.mouse.down()
  await caro.mouse.move(from.x + 20, from.y + 20, { steps: 5 })
  await caro.mouse.move(to.x + to.width / 2, to.y + to.height + 40, { steps: 15 })
  await caro.mouse.up()
  // La tarjeta queda bajo el titulo de la columna destino en la vista de Ana
  const header = (await admin.locator('h3', { hasText: 'Lo que mejorar' }).boundingBox())!
  await expect
    .poll(async () => {
      const box = await admin.getByText('Pairing en pagos').boundingBox()
      return box ? Math.abs(box.x - header.x) < header.width : false
    })
    .toBe(true)
})
