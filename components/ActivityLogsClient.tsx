'use client';

import { useEffect, useMemo, useState } from 'react';

export interface ActivityLogRow {
  id: string;
  timestamp: string;
  userName: string;
  email: string;
  role: string;
  process: string;
  requestNumber: string;
  details: string;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function ActivityLogsClient({ logs }: { logs: ActivityLogRow[] }) {
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [printAll, setPrintAll] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(log.timestamp));
      const matchesDate = !selectedDate || logDate === selectedDate;
      const matchesQuery =
        !normalizedQuery ||
        [
        new Date(log.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        log.userName,
        log.email,
        log.role.replace(/_/g, ' '),
        log.process,
        log.requestNumber,
        log.details
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesDate && matchesQuery;
    });
  }, [logs, normalizedQuery, selectedDate]);

  const suggestions = useMemo(() => {
    const values = new Set<string>();
    logs.forEach((log) => {
      [log.userName, log.email, log.role.replace(/_/g, ' '), log.process, log.requestNumber].forEach((value) => {
        if (value && value !== '—') values.add(value);
      });
    });

    const allSuggestions = Array.from(values);
    if (!normalizedQuery) return allSuggestions.slice(0, 20);
    return allSuggestions
      .filter((value) => value.toLowerCase().includes(normalizedQuery))
      .slice(0, 20);
  }, [logs, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const visibleLogs = printAll ? filteredLogs : filteredLogs.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery, selectedDate, pageSize]);

  const printResults = () => {
    setPrintAll(true);
    window.setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 100);
  };

  const downloadExcel = () => {
    const headers = ['Timestamp', 'User', 'Email', 'Role', 'Process', 'Request', 'Details'];
    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.userName,
      log.email,
      log.role.replace(/_/g, ' '),
      log.process,
      log.requestNumber === '—' ? '' : log.requestNumber,
      log.details
    ]);
    const worksheetRows = [headers, ...rows]
      .map(
        (row, rowIndex) =>
          `<Row>${row
            .map(
              (cell, columnIndex) =>
                `<Cell ss:StyleID="${rowIndex === 0 ? 'Header' : columnIndex === 0 ? 'Date' : 'Body'}"><Data ss:Type="${
                  rowIndex > 0 && columnIndex === 0 ? 'DateTime' : 'String'
                }">${escapeXml(cell)}</Data></Cell>`
            )
            .join('')}</Row>`
      )
      .join('');
    const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Body"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#065F46" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Date"><NumberFormat ss:Format="m/d/yyyy h:mm AM/PM"/></Style>
 </Styles>
 <Worksheet ss:Name="Activity Logs">
  <Table>
   <Column ss:Width="140"/><Column ss:Width="130"/><Column ss:Width="170"/>
   <Column ss:Width="110"/><Column ss:Width="140"/><Column ss:Width="145"/><Column ss:Width="300"/>
   ${worksheetRows}
  </Table>
  <AutoFilter x:Range="R1C1:R${rows.length + 1}C7" xmlns="urn:schemas-microsoft-com:office:excel"/>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions>
 </Worksheet>
</Workbook>`;
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-[minmax(0,1fr)_210px]">
          <label className="text-sm font-medium text-slate-700">
            Search all fields
            <input
              type="search"
              list="activity-log-suggestions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a user, role, process, request number, detail, or timestamp…"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sfxc-green focus:ring-2 focus:ring-emerald-100"
            />
            <datalist id="activity-log-suggestions">
              {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
            </datalist>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Filter by date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sfxc-green focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {query || selectedDate ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedDate('');
              }}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          ) : null}
          <button type="button" onClick={printResults} className="rounded-2xl border border-sfxc-green px-4 py-3 text-sm font-semibold text-sfxc-green hover:bg-emerald-50">
            Print Results
          </button>
          <button type="button" onClick={downloadExcel} className="sfxc-button">
            Download Excel
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:block">
        <p className="text-sm text-slate-500 print:text-slate-700">
          {filteredLogs.length > 0
            ? `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, filteredLogs.length)} of ${filteredLogs.length} matching activities`
            : 'Showing 0 matching activities'}
          {selectedDate ? ` on ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-PH')}` : ''}
          {query ? ` for “${query}”` : ''}.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600 print:hidden">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sfxc-green"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      <div className="sfxc-card overflow-hidden print:border-0 print:shadow-none">
        <div className="max-h-[65vh] overflow-auto print:max-h-none print:overflow-visible">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 print:static">
              <tr>
                <th className="px-5 py-4 font-semibold">Timestamp</th>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Process</th>
                <th className="px-5 py-4 font-semibold">Request</th>
                <th className="px-5 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleLogs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {new Date(log.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{log.userName}</p>
                    <p className="text-xs text-slate-500">{log.role.replace(/_/g, ' ')}</p>
                    {log.email ? <p className="text-xs text-slate-400">{log.email}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-sfxc-green">{log.process}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">{log.requestNumber}</td>
                  <td className="min-w-72 px-5 py-4 text-slate-600">{log.details}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No activity logs match your search.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length > 0 ? (
        <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden" aria-label="Activity log pagination">
          <p className="text-sm text-slate-500">Page {safeCurrentPage} of {totalPages}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">First</button>
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage === 1} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage === totalPages} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Last</button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
