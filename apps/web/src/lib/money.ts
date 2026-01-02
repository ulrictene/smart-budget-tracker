export function penniesFromInput(input: string) {
  const normalized = input.replace(",", ".").trim();
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function poundsFromPennies(pennies: number) {
  return (pennies / 100).toFixed(2);
}
