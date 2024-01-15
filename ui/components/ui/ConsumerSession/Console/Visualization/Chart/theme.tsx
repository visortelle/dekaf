import { remToPx } from "../../../../rem-to-px";
import chroma from "chroma-js";
import { Chart as ChartJs } from 'chart.js';

ChartJs.defaults.font = {
  family: 'Inter',
  size: remToPx(14),
}

const palette = ['#276ff4', '#00ab28', '#fe6e6e', '#f8cf06', '#9d50ff', '#1d9d6'];

export const getTheme = () => ({
  getRandomColors: (count: number) => generateRandomColors(count, palette)
});

function generateRandomColors(count: number, palette: string[]): string[] {
  return Array.from(Array(count)).reduce<string[]>((generated) => {
    const availableColors = palette.filter(color => !generated.includes(color));
    const randomColor = availableColors.length > 0 ? availableColors[0] : generateRandomColor('#ffffff');
    return [...generated, randomColor];
  }, []);
}

function generateRandomColor(contrastTo: string): string {
  const minContrastRatio = 4.5;
  const randomColor = chroma.random();
  if (chroma.contrast(randomColor, contrastTo) >= minContrastRatio) {
    return randomColor.hex();;
  }

  return generateRandomColor(contrastTo);
}
