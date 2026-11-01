import { expect, test, type Browser, type Page } from '@playwright/test'

// Casos de bordes de la fase de escritura con dos personas: reordenar lo propio
// con tarjetas ajenas en la columna (#20) y borrar una columna con búsqueda
// activa (#6).

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

const top = async (page: Page, text: string) =>
  (await page.getByText(text, { exact: true }).boundingBox())?.y ?? -1

test('antes de revelar se reordena lo propio y borrar columna avisa el total', async ({ browser }) => {
  const admin = await newPage(browser)
  await admin.goto('./')
  await admin.getByRole('button', { name: 'Crear sala' }).click()
  await admin.waitForURL(/#\/room\//)
  await join(admin, 'Ana')

  // Caro escribe primero: su tarjeta tiene el order más bajo de la columna
  const caro = await newPage(browser)
  await caro.goto(admin.url())
  await join(caro, 'Caro')
  await addCard(caro, 0, 'Tarjeta de Caro')
  await expect(admin.getByText('Oculta')).toHaveCount(1)

  await addCard(admin, 0, 'Primera mía')
  await addCard(admin, 0, 'Segunda mía')
  await expect(admin.getByText('Segunda mía', { exact: true })).toBeVisible()
  // Ana ve lo suyo arriba y la oculta de Caro abajo
  expect(await top(admin, 'Primera mía')).toBeLessThan(await top(admin, 'Segunda mía'))

  // Arrastra "Primera mía" abajo de "Segunda mía" (abajo está la de Caro)
  const from = (await admin.getByText('Primera mía', { exact: true }).boundingBox())!
  const to = (await admin.getByText('Segunda mía', { exact: true }).boundingBox())!
  await admin.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await admin.mouse.down()
  await admin.mouse.move(from.x + 20, from.y + 20, { steps: 5 })
  await admin.mouse.move(to.x + to.width / 2, to.y + to.height, { steps: 15 })
  await admin.mouse.up()

  await expect
    .poll(async () => (await top(admin, 'Primera mía')) > (await top(admin, 'Segunda mía')))
    .toBe(true)
  // Y queda así (no vuelve a su lugar cuando llega el snapshot)
  await admin.waitForTimeout(1000)
  expect(await top(admin, 'Primera mía')).toBeGreaterThan(await top(admin, 'Segunda mía'))

  // Con la búsqueda se ve 1 tarjeta, pero borrar la columna se lleva las 3
  await admin.getByPlaceholder('Buscar en tarjetas…').fill('Caro')
  await expect(admin.getByText('Primera mía', { exact: true })).toHaveCount(0)
  let message = ''
  admin.once('dialog', (d) => {
    message = d.message()
    void d.dismiss()
  })
  await admin.getByRole('button', { name: 'Borrar columna' }).first().click()
  await expect.poll(() => message).toBe('¿Borrar "Lo que estuvo bien" y sus 3 tarjetas?')
})
