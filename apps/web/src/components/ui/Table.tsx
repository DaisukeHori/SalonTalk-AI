/**
 * Table Component
 * テーブルコンポーネント
 */
import { forwardRef } from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={`w-full text-sm text-left ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={`bg-gray-50 border-b border-gray-200 ${className}`}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TableHeader.displayName = 'TableHeader';

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={`divide-y divide-gray-100 ${className}`}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = 'TableBody';

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className = '', hoverable = true, children, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`${hoverable ? 'hover:bg-gray-50 transition-colors' : ''} ${className}`}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className = '', sortable = false, sorted = false, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
          sortable ? 'cursor-pointer hover:text-gray-700' : ''
        } ${className}`}
        {...props}
      >
        <div className="flex items-center gap-1">
          {children}
          {sortable && sorted && (
            <span className="text-indigo-600">{sorted === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      </th>
    );
  }
);

TableHead.displayName = 'TableHead';

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={`px-6 py-4 whitespace-nowrap ${className}`}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = 'TableCell';

interface EmptyTableProps {
  message?: string;
  icon?: React.ReactNode;
  colSpan?: number;
}

export function EmptyTable({
  message = 'データがありません',
  icon,
  colSpan = 1,
}: EmptyTableProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12">
        <div className="flex flex-col items-center justify-center text-gray-500">
          {icon && <div className="mb-2">{icon}</div>}
          <p>{message}</p>
        </div>
      </td>
    </tr>
  );
}

export default Table;
