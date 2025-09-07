import pl from 'pluralize'

export const pluralize = (qty: number, word: string) => {
  if (qty > 1) return pl(word)
  return word
}
