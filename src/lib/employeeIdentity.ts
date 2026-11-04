export const DOCUMENT_NUMBER_PATTERN = /^[0-9]+$/;

export function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export function formatProperName(value?: string | null) {
  return (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
    .replace(/(^|[ '\u2019-])(\p{L})/gu, (_, separator: string, initial: string) =>
      separator + initial.toLocaleUpperCase('es'),
    );
}
