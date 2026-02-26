import { CurrencyPipe, DatePipe, JsonPipe, NgClass, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import {
  DateSortOrder,
  TransactionFilterStatus,
  TransactionStatus
} from '../../core/transactions/transactions.model';
import { TransactionsConsoleStore } from './transactions-console.store';

interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

@Component({
  selector: 'app-transactions-console',
  imports: [CurrencyPipe, DatePipe, JsonPipe, NgClass, TitleCasePipe],
  templateUrl: './transactions-console.component.html',
  styleUrl: './transactions-console.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsConsoleComponent {


  constructor() {

    effect(() => {
      console.log(this.listState(), 123);
    })
  }


  protected readonly store = inject(TransactionsConsoleStore);

  protected readonly statusOptions: ReadonlyArray<SelectOption<TransactionFilterStatus>> = [
    { value: 'all', label: 'All statuses' },
    { value: 'failed', label: 'Failed only' },
    { value: 'pending', label: 'Pending only' },
    { value: 'success', label: 'Success only' }
  ];

  protected readonly sortOptions: ReadonlyArray<SelectOption<DateSortOrder>> = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' }
  ];

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
