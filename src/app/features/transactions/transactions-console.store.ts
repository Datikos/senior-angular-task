import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  DateSortOrder,
  TransactionDetails,
  TransactionFilterStatus,
  TransactionsQuery,
  TransactionSummary
} from '../../core/transactions/transactions.model';
import { TransactionsApi } from '../../core/transactions/transactions.api';
import { catchError, of } from 'rxjs';

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
  private transService = inject(TransactionsApi);
  readonly selectedTransactionId = signal<string | null>(null);

  readonly listState = signal<AsyncState<TransactionSummary[]>>({
    data: [],
    loading: false,
    error: null
  });

  readonly detailsState = signal<AsyncState<TransactionDetails | null>>({
    data: null,
    loading: false,
    error: null
  });

  readonly failedCount = computed(
    () => this.listState().data.filter((transaction) => transaction.status === 'failed').length
  );

  constructor() {
    // TODO(interview): Implement full reactive orchestration.
    // Required:
    // 1) Build list request pipeline from status + debounced search + sort.
    // 2) Support loading/error/retry states for list.
    // 3) Cancel in-flight list requests when state changes.
    // 4) Build independent details request pipeline with its own loading/error/retry.
    // 5) Cancel in-flight details request on selection change.
    this.getTrans();
  }

  getTrans() {
    const query = {
      status: this.statusFilter(),
      search: this.searchTerm(),
      sort: this.sortOrder(),
    }

    this.transService.getTransactions(query).pipe(
      catchError((err) => {
         this.listState.update((val) => {
          val.loading = false;
          val.error = err;
          val.data = [];
          return val;
        });
        return of();
      })
    ).subscribe((m) => {
      this.listState.update((val) => {
          val.loading = false;
          val.data = m;
          val.error = null;
          return val;
        });
      console.log(this.listState());
    });
  }

  getTansDetails() {
    if (this.selectedTransactionId() != null) {
      this.transService.getTransactionDetails(this.selectedTransactionId() as string).pipe(
        catchError((err) => {
          this.detailsState.update((v) => {
            v.error = err;
            v.loading = false;
            v.data = null;
            return v;
          });
          return of();
        })
      ).subscribe(
        (res) => {
          this.detailsState.update((v) => {
            v.error = null;
            v.loading = false;
            v.data = res;
            return v;
          });
          console.log(this.detailsState());
        }
      )
    }
  }

  setStatusFilter(status: TransactionFilterStatus): void {
    this.statusFilter.set(status);
    this.getTrans();
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.getTrans();
  }

  setSortOrder(sortOrder: DateSortOrder): void {
    this.sortOrder.set(sortOrder);
    this.getTrans();
  }

  selectTransaction(id: string): void {
    this.selectedTransactionId.set(id);
    this.detailsState.set({ data: null, loading: false, error: null });
    this.getTansDetails();
  }

  clearSelection(): void {
    this.selectedTransactionId.set(null);
    this.detailsState.set({ data: null, loading: false, error: null });
  }

  retryList(): void {
    this.getTrans();
  }

  retryDetails(): void {
    // TODO(interview): trigger details retry for currently selected row.
  }
}
