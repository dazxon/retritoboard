// Une clases condicionales: cx('a', cond && 'b', undefined) → 'a b'
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
