import { LibraryItem } from "./model/library";

type ValueOrReference<ValueT> = {
  type: 'value',
  value: ValueT
} | {
  type: 'reference',
  reference: string
};

export function useResolvedUserManagedItemValueOrReference<ValueT>(ValueOrReference: ValueOrReference<ValueT>): ValueT | undefined {

}
