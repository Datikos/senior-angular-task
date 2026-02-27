import { Injectable, computed, signal } from '@angular/core';
import {
  DateSortOrder,
  TransactionDetails,
  TransactionFilterStatus,
  TransactionsQuery,
  TransactionSummary,
} from '../../core/transactions/transactions.model';
import { Subject } from 'rxjs';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class TransactionsConsoleStore {
  readonly statusFilter = signal<TransactionFilterStatus>('all');
  readonly searchTerm = signal('');
  readonly sortOrder = signal<DateSortOrder>('newest');
  readonly selectedTransactionId = signal<string | null>(null);

  retryList$ = new Subject<void>();
  retryDetails$ = new Subject<void>();

  readonly query = computed<TransactionsQuery>(() => ({
    status: this.statusFilter(),
    search: this.searchTerm(),
    sort: this.sortOrder(),
  }));

  readonly listState = signal<AsyncState<TransactionSummary[]>>({
    data: [],
    loading: false,
    error: null,
  });

  readonly detailsState = signal<AsyncState<TransactionDetails | null>>({
    data: null,
    loading: false,
    error: null,
  });

  readonly failedCount = computed(
    () => this.listState().data.filter((transaction) => transaction.status === 'failed').length,
  );

  constructor() {
    // TODO(interview): Implement full reactive orchestration.
    // Required:
    // 1) Build list request pipeline from status + debounced search + sort.
    // 2) Support loading/error/retry states for list.
    // 3) Cancel in-flight list requests when state changes.
    // 4) Build independent details request pipeline with its own loading/error/retry.
    // 5) Cancel in-flight details request on selection change.
  }

  setStatusFilter(status: TransactionFilterStatus): void {
    this.statusFilter.set(status);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setSortOrder(sortOrder: DateSortOrder): void {
    this.sortOrder.set(sortOrder);
  }

  selectTransaction(id: string): void {
    this.selectedTransactionId.set(id);
    this.detailsState.set({ data: null, loading: false, error: null });
  }

  clearSelection(): void {
    this.selectedTransactionId.set(null);
    this.detailsState.set({ data: null, loading: false, error: null });
  }

  retryList(): void {
    this.retryList$.next();
    // TODO(interview): trigger list retry.
  }

  retryDetails(): void {
    this.retryDetails$.next();
  }
}
