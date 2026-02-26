import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DateSortOrder,
  TransactionDetails,
  TransactionFilterStatus,
  TransactionSummary,
} from '../../core/transactions/transactions.model';
import { TransactionsApi } from '../../core/transactions/transactions.api';
import { outputToObservable, toObservable } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  EMPTY,
  finalize,
  map,
  of,
  retry,
  startWith,
  Subject,
  switchMap,
  throwError,
} from 'rxjs';

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

  retryList$ = new BehaviorSubject<null>(null);
  retryDetails$ = new BehaviorSubject<string | null>(null);

  apiService = inject(TransactionsApi);

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

    combineLatest([
      toObservable(this.searchTerm).pipe(debounceTime(500)),
      toObservable(this.sortOrder),
      toObservable(this.statusFilter),
      this.retryList$,
    ])
      .pipe(
        startWith(['', '', '']),
        switchMap((filters) => {
          this.listState.set({
            ...this.listState(),
            loading: true,
          });
          return this.apiService
            .getTransactions({
              search: filters[0],
              sort: filters[1] as DateSortOrder,
              status: filters[2] as TransactionFilterStatus,
            })
            .pipe(
              // retry(2),
              catchError((err) => {
                this.listState.set({
                  ...this.listState(),
                  loading: false,
                  error: err.message,
                });

                return EMPTY;
              }),
              finalize(() => {
                this.listState.set({
                  ...this.listState(),
                  loading: false,
                });
              }),
            );
        }),
      )
      .subscribe({
        next: (data) => {
          this.listState.set({
            ...this.listState(),
            data,
          });
        },
      });
    // 2) Support loading/error/retry states for list.
    // 3) Cancel in-flight list requests when state changes.
    // 4) Build independent details request pipeline with its own loading/error/retry.
    // 5) Cancel in-flight details request on selection change.

    combineLatest([toObservable(this.selectedTransactionId), this.retryDetails$])
      .pipe(
        switchMap(([id]) => {
          if (id) {
            this.detailsState.set({
              ...this.detailsState(),
              loading: true,
            });
            return this.apiService.getTransactionDetails(id).pipe(
              // map(() => {
              //   throw new Error('error');
              // }),
              // retry(2),
              catchError((err) => {
                this.detailsState.set({
                  ...this.detailsState(),
                  error: err.message,
                  loading: false,
                });

                return of(null);
              }),
              finalize(() => {
                this.detailsState.set({
                  ...this.detailsState(),
                  loading: false,
                });
              }),
            );
          }
          return of(null);
        }),
      )
      .subscribe({
        next: (data) => {
          this.detailsState.set({
            ...this.detailsState(),
            data,
          });
        },
      });
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
    // TODO(interview): trigger list retry.
    this.retryList$.next(null);
  }

  retryDetails(): void {
    // TODO(interview): trigger details retry for currently selected row.
    this.retryDetails$.next(this.selectedTransactionId());
  }
}
