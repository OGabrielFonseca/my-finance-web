/** Simulação local da saída do openapi-typescript (rascunho de validação do plano). */
export interface components {
  schemas: {
    LoginRequest: { email: string; password: string };
    RegisterRequest: { name: string; email: string; password: string };
    TokenResponse: { accessToken?: string; tokenType?: string; /** Format: int64 */ expiresIn?: number };
    UserResponse: { id?: string; name?: string; email?: string; createdAt?: string; updatedAt?: string };
    UpdateMeRequest: { name: string; email: string };

    AccountResponse: {
      id?: string;
      name?: string;
      /** @enum {string} */
      type?: 'CHECKING' | 'SAVINGS' | 'WALLET' | 'INVESTMENT' | 'OTHER';
      institution?: string;
      currency?: string;
      initialBalance?: number;
      archived?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
    AccountSummary: { id?: string; name?: string; type?: 'CHECKING' | 'SAVINGS' | 'WALLET' | 'INVESTMENT' | 'OTHER' };
    AccountBalanceResponse: {
      accountId?: string;
      initialBalance?: number;
      currentBalance?: number;
      projectedBalance?: number;
    };
    CreateAccountRequest: {
      name: string;
      type: 'CHECKING' | 'SAVINGS' | 'WALLET' | 'INVESTMENT' | 'OTHER';
      institution?: string;
      initialBalance?: number;
    };
    UpdateAccountRequest: {
      name: string;
      type: 'CHECKING' | 'SAVINGS' | 'WALLET' | 'INVESTMENT' | 'OTHER';
      institution?: string;
      initialBalance: number;
    };

    CategoryResponse: {
      id?: string;
      parentId?: string;
      name?: string;
      type?: 'INCOME' | 'EXPENSE';
      color?: string;
      icon?: string;
      archived?: boolean;
      system?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
    CategorySummary: {
      id?: string;
      name?: string;
      type?: 'INCOME' | 'EXPENSE';
      color?: string;
      icon?: string;
      parentId?: string;
    };
    CreateCategoryRequest: {
      name: string;
      type?: 'INCOME' | 'EXPENSE';
      parentId?: string;
      color?: string;
      icon?: string;
    };
    UpdateCategoryRequest: { name: string; color?: string; icon?: string };

    TransactionResponse: {
      id?: string;
      type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      description?: string;
      amount?: number;
      /** Format: date */
      date?: string;
      status?: 'PENDING' | 'CLEARED';
      account?: components['schemas']['AccountSummary'];
      destinationAccount?: components['schemas']['AccountSummary'];
      category?: components['schemas']['CategorySummary'];
      creditCardInvoiceId?: string;
      installmentGroupId?: string;
      installmentNumber?: number;
      installmentTotal?: number;
      notes?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    CreateTransactionRequest: {
      type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      description: string;
      amount: number;
      date: string;
      status?: 'PENDING' | 'CLEARED';
      accountId: string;
      categoryId: string;
      notes?: string;
    };
    UpdateTransactionRequest: {
      description: string;
      amount: number;
      date: string;
      status: 'PENDING' | 'CLEARED';
      accountId: string;
      destinationAccountId?: string;
      categoryId?: string;
      notes?: string;
    };
    CreateTransferRequest: {
      fromAccountId: string;
      toAccountId: string;
      description: string;
      amount: number;
      date: string;
      status?: 'PENDING' | 'CLEARED';
      notes?: string;
    };

    DashboardSummaryResponse: {
      month?: string;
      totalBalance?: number;
      income?: number;
      expenses?: number;
      result?: number;
    };
    CategoryExpense: {
      categoryId?: string;
      name?: string;
      color?: string;
      icon?: string;
      amount?: number;
      percentage?: number;
    };
    ExpensesByCategoryResponse: {
      month?: string;
      total?: number;
      categories?: components['schemas']['CategoryExpense'][];
    };
  };
}
