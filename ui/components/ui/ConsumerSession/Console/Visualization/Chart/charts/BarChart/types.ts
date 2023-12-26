export type Dimension<EntryT> = {
  getValue: (entry: EntryT) => number | null,
  name: string
}

export type Config<EntryT> = {
  name: string,
  dimensions: Dimension<EntryT>[],
  getLabel: (entry: EntryT) => string,
}
