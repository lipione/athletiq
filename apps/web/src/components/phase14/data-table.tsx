import type { ReactNode } from 'react';

export type DataTableColumn<Row> = {
  header: string;
  cell: (row: Row) => ReactNode;
  className?: string;
};

type DataTableProps<Row> = {
  caption: string;
  description?: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
};

export function DataTable<Row>({
  caption,
  description,
  columns,
  rows,
  rowKey,
}: DataTableProps<Row>) {
  return (
    <section className="table-panel">
      <div className="section-heading">
        <div>
          <h2>{caption}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.className} key={column.header} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowKey(row, rowIndex)}>
                {columns.map((column) => (
                  <td className={column.className} data-label={column.header} key={column.header}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
