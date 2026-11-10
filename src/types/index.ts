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

export type BudgetStatus = 'ON_TRACK' | 'NEAR_LIMIT' | 'LIMIT_REACHED' | 'EXCEEDED';
export interface BudgetItem {
  id: number; categoryId: number; categoryName: string; amount: number; spent: number;
  remaining: number; utilizationPercent: number; status: BudgetStatus;
}
export interface BudgetOverview {
  month: string; totalAllocated: number; totalSpent: number; totalRemaining: number;
  utilizationPercent: number; items: BudgetItem[]; alerts: string[];
}
export interface BudgetHistoryPoint { month: string; allocated: number; spent: number }

export interface Goal {
  id: number; name: string; targetAmount: number; savedAmount: number; remainingAmount: number;
  progressPercent: number; targetDate: string | null; status: 'ACTIVE' | 'COMPLETED'; overdue: boolean;
  createdAt: string; completedAt: string | null;
}
export interface Contribution { id: number; amount: number; date: string; note?: string; createdAt: string }

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'ENDED';
export interface Recurring {
  id: number; accountId: number; accountName: string; categoryId: number; categoryName: string; type: TransactionType;
  amount: number; description?: string; frequency: Frequency; startDate: string; endDate: string | null;
  nextExecutionDate: string; status: RecurringStatus; createdAt: string;
}
export interface RecurringExecution { id: number; scheduledDate: string; status: 'SUCCESS' | 'FAILED'; transactionId: number | null; message?: string; executedAt: string }

export interface AppNotification { id: number; type: string; title: string; message: string; read: boolean; createdAt: string }
<<<<<<< HEAD

export interface MonthPoint { month: string; income: number; expense: number; savings: number }
export interface AnalyticsOverview {
  from: string; to: string; monthly: MonthPoint[]; expenseByCategory: { category: string; amount: number }[];
  accountBalances: { name: string; type: AccountType; balance: number; creditCard: boolean }[];
}
export interface YearComparison { year: number; previousYear: number; months: { month: string; current: number; previous: number }[] }

export type ReportType = 'monthly' | 'yearly' | 'category' | 'account-statement' | 'budget' | 'savings';
export type ReportFormat = 'csv' | 'xlsx' | 'pdf';
export interface ReportData {
  title: string; subtitle: string | null; columns: string[]; rows: (string | number | null)[][];
  summary: { label: string; value: string | number }[];
}
=======
>>>>>>> c71131119096b39c02bd6989eebcd0f27c0eb175
