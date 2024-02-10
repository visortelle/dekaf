export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const newArr = [...arr];

  let element = newArr[fromIndex];
  newArr.splice(fromIndex, 1);
  newArr.splice(toIndex, 0, element);

  return newArr;
}
