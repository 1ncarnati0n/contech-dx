declare module '@thatopen/components' {
  interface FragmentsListOnItemSetEvent<T = unknown> {
    add: (listener: (payload: { value: T }) => void | Promise<void>) => void;
  }
}
