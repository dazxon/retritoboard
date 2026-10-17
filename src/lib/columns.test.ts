import { describe, expect, it, vi } from 'vitest'
import type { Column } from './types'

vi.mock('./firebase', () => ({ db: {} }))
const { getActionablesColumn } = await import('./columns')

const col = (id: string, title: string, order: number, isActionables?: boolean): Column => ({
  id,
  title,
  order,
  isActionables,
})

describe('getActionablesColumn', () => {
  it('prefiere la columna marcada con isActionables', () => {
    const cols = [col('1', 'Accionables', 1000), col('2', 'Tareas', 2000, true)]
    expect(getActionablesColumn(cols)?.id).toBe('2')
  })
  it('salas viejas: reconoce el titulo, con o sin mayusculas', () => {
    expect(getActionablesColumn([col('1', 'Bien', 1000), col('2', 'Action Items', 2000)])?.id).toBe('2')
    expect(getActionablesColumn([col('1', 'accionables', 1000)])?.id).toBe('1')
    expect(getActionablesColumn([col('1', 'Acciones', 1000)])?.id).toBe('1')
  })
  it('si hay varias, gana la de mayor order', () => {
    const cols = [col('1', 'Accionables', 3000), col('2', 'Action items', 1000)]
    expect(getActionablesColumn(cols)?.id).toBe('1')
  })
  it('sin coincidencias: null', () => {
    expect(getActionablesColumn([col('1', 'Lo que estuvo bien', 1000)])).toBeNull()
  })
})
