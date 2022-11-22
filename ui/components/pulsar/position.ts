// Position here is a string like "10:20" where first number is a ledgerId and second is an entryId.
function compare(p1: string, p2: string): number {
  const [l1, e1] = p1.split(":");
  const [l2, e2] = p2.split(":");

  const isSameLedger = l1 === l2;
  if (isSameLedger) {
    return Number(e1) - Number(e2);
  }

  return Number(l1) - Number(l2);
}

function eq (p1: string, p2: string): boolean {
  return compare(p1, p2) === 0;
}

function gt(p1: string, p2: string): boolean {
  return compare(p1, p2) > 0;
}

function lt(p1: string, p2: string): boolean {
  return compare(p1, p2) < 0;
}

function getLedgerId(p: string): number {
  return Number(p.split(":")[0]);
}

function getEntryId(p: string): number {
  return Number(p.split(":")[1]);
}

export const position = {
  compare,
  eq,
  gt,
  lt,
  getLedgerId,
  getEntryId
}
