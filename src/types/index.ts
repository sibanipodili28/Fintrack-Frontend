export type Role = 'USER' | 'ADMIN';
export type AccountType = 'SAVINGS' | 'CURRENT' | 'CASH_WALLET' | 'DIGITAL_WALLET' | 'CREDIT_CARD';
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User { id: number; email: string; fullName: string; role: Role }
export interface AuthResponse { accessToken: string; user: User }

export interface Account {
  id: number; name: string; type: AccountType; currency: string;
  initialBalance: number; currentBalance: number; active: boolean; createdAt: string;
}
export interface Category { id: number; name: string; type: TransactionType }
export interface Transaction {
  id: number; accountId: number; accountName: string; categoryId: number; categoryName: string;
  type: TransactionType; amount: number; description?: string; notes?: string; date: string; createdAt: string;
}
export interface Transfer {
  id: number; fromAccountId: number; fromAccountName: string; toAccountId: number; toAccountName: string;
  amount: number; description?: string; createdAt: string;
}
export interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

export interface DashboardSummary {
  from: string; to: string; totalBalance: number; income: number; expense: number; netSavings: number;
  savingsRate: number; accounts: Account[]; recentTransactions: Transaction[];
  expenseByCategory: { category: string; amount: number }[];
  monthlyTrend: { month: string; income: number; expense: number }[];
}
export type DashboardRange = 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'CURRENT_YEAR';
