/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

// Compartir accionables: elegir cuáles van y copiar al portapapeles una imagen
// PNG lista para pegar en Slack.

test('compartir accionables copia una imagen con los elegidos', async ({ browser }) => {
  const ctx = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await ctx.newPage()
  await page.goto('./')
  await page.getByPlaceholder('Nombre de la retro (opcional)').fill('Sprint 42')
  await page.getByRole('button', { name: 'Crear sala' }).click()
  await page.waitForURL(/#\/room\//)
  await page.getByPlaceholder('Tu nombre').fill('Ana')
  await page.getByRole('button', { name: 'Entrar' }).click()

  const input = page.getByPlaceholder('Escribí una tarjeta…').nth(2)
  for (const text of ['Automatizar el deploy', 'Daily de 15 minutos', 'Pairing los viernes']) {
    await input.fill(text)
    await input.press('Enter')
    await expect(page.getByText(text)).toBeVisible()
  }

  await page.getByRole('button', { name: 'Compartir accionables como imagen' }).click()
  const dialog = page.getByRole('dialog', { name: /Compartir accionables/ })
  await expect(dialog.getByText('3 de 3')).toBeVisible()
  await expect(dialog.getByRole('img', { name: 'Imagen con 3 accionables' })).toBeVisible()

  // Sacar uno: la vista previa se redibuja con dos
  await dialog.getByText('Daily de 15 minutos').click()
  await expect(dialog.getByText('2 de 3')).toBeVisible()
  await expect(dialog.getByRole('img', { name: 'Imagen con 2 accionables' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Copiar imagen' }).click()
  await expect(dialog.getByText('¡Copiada! Pegala en Slack.')).toBeVisible()

  const copied = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read()
    const blob = await item.getType('image/png')
    const bmp = await createImageBitmap(blob)
    return { types: item.types, width: bmp.width, height: bmp.height }
  })
  expect(copied.types).toContain('image/png')
  expect(copied.width).toBe(2160)
  expect(copied.height).toBeGreaterThan(600)

  // Ninguno: no hay nada para copiar
  await dialog.getByRole('button', { name: 'Ninguno' }).click()
  await expect(dialog.getByRole('button', { name: 'Copiar imagen' })).toBeDisabled()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})
