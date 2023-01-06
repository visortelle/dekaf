const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

export function remToPx(rem: number): number {
  return rem * fontSize;
}
