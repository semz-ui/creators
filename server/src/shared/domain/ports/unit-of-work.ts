/**
 * Opaque transaction handle threaded through repository/store calls so a set of
 * writes commits or rolls back together. Callers treat it as a token and pass it
 * around; infrastructure adapters narrow it back to their driver's session type.
 */
export type Tx = unknown;

/** Runs a unit of work atomically: all writes commit together or none do. */
export interface IUnitOfWork {
  /** Run `work` in a transaction, committing on success and rolling back if it throws. */
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
