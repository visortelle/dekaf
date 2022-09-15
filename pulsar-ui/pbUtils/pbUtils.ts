import jspb from 'google-protobuf';

export function createDeadline(seconds: number): string {
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + seconds);
  return deadline.getTime().toString();
}

export function mapToObject<V>(map: jspb.Map<string, V>): Record<string, V> {
  const obj: Record<string, V> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
