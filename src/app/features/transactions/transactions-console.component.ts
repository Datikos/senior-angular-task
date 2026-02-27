import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  JsonPipe,
  NgClass,
  TitleCasePipe,
} from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import {
  DateSortOrder,
  TransactionDetails,
  TransactionFilterStatus,
  TransactionsQuery,
  TransactionStatus,
} from '../../core/transactions/transactions.model';
import { TransactionsConsoleStore } from './transactions-console.store';
import { TransactionsApi } from '../../core/transactions/transactions.api';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  debounceTime,
  filter,
  merge,
  of,
  retryWhen,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

@Component({
  selector: 'app-transactions-console',
  imports: [CurrencyPipe, DatePipe, JsonPipe, NgClass, TitleCasePipe, AsyncPipe],
  templateUrl: './transactions-console.component.html',
  styleUrl: './transactions-console.component.scss',
})
export class TransactionsConsoleComponent {
  protected readonly store = inject(TransactionsConsoleStore);
  #transactionService = inject(TransactionsApi);

  protected readonly statusOptions: ReadonlyArray<SelectOption<TransactionFilterStatus>> = [
    { value: 'all', label: 'All statuses' },
    { value: 'failed', label: 'Failed only' },
    { value: 'pending', label: 'Pending only' },
    { value: 'success', label: 'Success only' },
  ];

  protected readonly sortOptions: ReadonlyArray<SelectOption<DateSortOrder>> = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
  ];

  query$ = toObservable(this.store.query).pipe(
    tap(() => this.store.listState.set({ loading: true, error: null, data: [] })),
  );
  retry$ = this.store.retryList$;

  transactions$ = merge(this.query$, this.retry$).pipe(
    debounceTime(200),
    switchMap(() => this.#transactionService.getTransactions(this.store.query())),
    tap((transactions) => {
      this.store.listState.set({
        data: transactions,
        loading: false,
        error: null,
      });
    }),
    catchError((err) => {
      return of({
        data: [],
        loading: false,
        error: err,
      });
    }),
  );

  transactions = toSignal(this.transactions$, { initialValue: [] });

  //details
  retryDetails$ = this.store.retryDetails$.pipe(startWith(null));
  detailId$ = toObservable(this.store.selectedTransactionId).pipe(
    filter((id) => !!id),
    tap(() => {
      this.store.detailsState.set({ data: null, loading: true, error: null });
    }),
  );
  details$ = combineLatest([this.detailId$, this.retryDetails$]).pipe(
    tap(console.log),
    switchMap(([id]) => this.#transactionService.getTransactionDetails(id)),
    tap((details) => {
      this.store.detailsState.set({
        data: details,
        loading: false,
        error: details.failureCode ? details.failureCode : null,
      });
    }),
    catchError((err) => {
      return of({
        data: null,
        loading: false,
        error: err,
      });
    }),
  );

  details = toSignal(this.details$, { initialValue: {} as TransactionDetails });

  protected readonly listState = computed(() => this.store.listState());
  protected readonly detailsState = computed(() => this.store.detailsState());
  protected readonly selectedId = computed(() => this.store.selectedTransactionId());
  protected readonly failedCount = computed(() => this.store.failedCount());

  protected onSearchChange(value: string): void {
    this.store.setSearchTerm(value);
  }

  protected onStatusChange(value: string): void {
    if (value === 'all' || value === 'pending' || value === 'success' || value === 'failed') {
      this.store.setStatusFilter(value);
    }
  }

  protected onSortChange(value: string): void {
    if (value === 'newest' || value === 'oldest') {
      this.store.setSortOrder(value);
    }
  }

  protected statusClass(status: TransactionStatus): string {
    return `status--${status}`;
  }
}
