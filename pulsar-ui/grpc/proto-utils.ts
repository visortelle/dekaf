export function createDeadline(seconds: number): string {
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + seconds);
  return deadline.getTime().toString();
}
