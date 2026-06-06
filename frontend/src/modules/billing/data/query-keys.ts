export const billingKeys = {
  all: ['billing'] as const,
  balance: ['billing', 'balance'] as const,
  ledger: (page: number, limit: number) => ['billing', 'ledger', { page, limit }] as const,
};
