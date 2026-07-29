'use client';

import { ActivityRequest } from '@prisma/client';
import { useState } from 'react';

interface Signatory {
  slot: string;
  name: string;
  title: string | null;
}

interface VoucherPrintProps {
  request: ActivityRequest & {
    department: { name: string };
    requestedBy: { name: string };
    fundSource?: { name: string; parent?: { name: string } | null } | null;
    approvals: {
      role: string;
      action: string;
      actor: { name: string; role: string };
    }[];
  };
  signatories: Signatory[];
  roleNames: { jca?: string; jmapc?: string };
  canEdit?: boolean;
  fundAccountOptions?: { id: string; name: string; mainAccountName: string }[];
  selectedFundSourceId?: string;
  onFundSourceChange?: (id: string) => void;
  selectedAccountName?: string;
  selectedFundName?: string;
}

function wordsBelowThousand(value: number) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const parts: string[] = [];
  if (value >= 100) {
    parts.push(`${ones[Math.floor(value / 100)]} hundred`);
    value %= 100;
  }
  if (value >= 20) {
    parts.push(tens[Math.floor(value / 10)]);
    value %= 10;
  }
  if (value > 0) parts.push(ones[value]);
  return parts.join(' ');
}

function amountInWords(amount: number) {
  const whole = Math.floor(amount);
  if (whole === 0) return 'ZERO PESOS ONLY';
  const groups = [
    { value: 1_000_000_000, label: 'billion' },
    { value: 1_000_000, label: 'million' },
    { value: 1_000, label: 'thousand' }
  ];
  let remainder = whole;
  const parts: string[] = [];
  groups.forEach((group) => {
    if (remainder >= group.value) {
      parts.push(`${wordsBelowThousand(Math.floor(remainder / group.value))} ${group.label}`);
      remainder %= group.value;
    }
  });
  if (remainder) parts.push(wordsBelowThousand(remainder));
  return `${parts.join(' ').toUpperCase()} PESOS ONLY`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function Signature({ label, name, title, className = '' }: { label: string; name?: string | null; title?: string | null; className?: string }) {
  return (
    <div className={`min-h-[105px] border border-black p-2 text-center ${className}`}>
      <p className="text-left text-[10px] italic">{label}</p>
      <div className="mt-8">
        <p className="font-bold uppercase underline">{name || '____________________________'}</p>
        <p className="mt-1 text-[10px] italic">{title || ''}</p>
      </div>
    </div>
  );
}

export default function VoucherPrint({
  request, signatories, roleNames, canEdit = false, fundAccountOptions,
  selectedFundSourceId, onFundSourceChange, selectedAccountName, selectedFundName
}: VoucherPrintProps) {
  const [payTo, setPayTo] = useState(request.voucherPayTo ?? request.requestedBy.name);
  const [address, setAddress] = useState(request.voucherAddress ?? request.department.name);
  const [voucherNumber, setVoucherNumber] = useState(request.voucherNumber ?? request.controlNumber);
  const [voucherParticulars, setVoucherParticulars] = useState(request.voucherParticulars ?? request.particulars);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const setting = (slot: string) => signatories.find((item) => item.slot === slot);
  const approval = (role: string, action: string) =>
    request.approvals.find((item) => item.role === role && item.action === action);
  const fundOfficer = approval('FUND_OFFICER', 'FUND_AVAILABLE')?.actor.name ?? setting('PREPARED_BY')?.name;
  const reviewer = approval('REVIEWER', 'REVIEW_APPROVED')?.actor.name ?? setting('CHECKED_BY')?.name;
  const endorser = approval('ENDORSER', 'ENDORSED')?.actor.name ?? setting('VERIFIED_BY')?.name;
  const recommending = setting('RECOMMENDING_APPROVAL')?.name ?? roleNames.jca;
  const approved = setting('APPROVED_BY')?.name ?? roleNames.jmapc;
  const president = setting('PRESIDENT');
  const amount = Number(request.amount);
  const payee = payTo;
  const accountName = selectedAccountName ?? request.fundSource?.parent?.name ?? request.fundSource?.name ?? 'UNASSIGNED FUND';
  const fundName = selectedFundName ?? (request.fundSource?.parent ? request.fundSource.name : request.fundSource?.name ?? 'UNASSIGNED');
  const downloadExcel = () => {
    const rows: Array<[string, string | number]> = [
      ['DISBURSEMENT VOUCHER', ''],
      ['Pay To', payee],
      ['Address', address],
      ['Voucher / Control No.', voucherNumber],
      ['Date', new Date(request.date).toISOString()],
      ['Particulars', voucherParticulars],
      ['Amount in Words', amountInWords(amount)],
      ['Main Account', accountName],
      ['Fund / Sub-Account', fundName],
      ['Amount', amount],
      ['Payee', payee],
      ['Prepared By', fundOfficer ?? ''],
      ['Checked By', reviewer ?? ''],
      ['Verified By', endorser ?? ''],
      ['Recommending Approval', recommending ?? ''],
      ['Approved By - JMAPC', approved ?? ''],
      ['Approved By - President', president?.name ?? '']
    ];
    const xmlRows = rows.map((row, index) =>
      `<Row>${row.map((cell, column) => {
        const isAmount = index === 9 && column === 1;
        const isDate = index === 4 && column === 1;
        return `<Cell ss:StyleID="${index === 0 ? 'Title' : column === 0 ? 'Label' : isAmount ? 'Amount' : isDate ? 'Date' : 'Body'}"><Data ss:Type="${isAmount ? 'Number' : isDate ? 'DateTime' : 'String'}">${escapeXml(String(cell))}</Data></Cell>`;
      }).join('')}</Row>`
    ).join('');
    const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16" ss:Color="#FFFFFF"/><Interior ss:Color="#065F46" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Label"><Font ss:Bold="1"/><Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Body"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="Amount"><NumberFormat ss:Format="&quot;PHP&quot; #,##0.00"/></Style>
  <Style ss:ID="Date"><NumberFormat ss:Format="mmmm d, yyyy"/></Style>
 </Styles>
 <Worksheet ss:Name="Voucher"><Table><Column ss:Width="175"/><Column ss:Width="420"/>${xmlRows}</Table></Worksheet>
</Workbook>`;
    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voucher-${voucherNumber}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const saveVoucher = async () => {
    setSaveStatus('saving');
    setSaveMessage('');
    const response = await fetch(`/api/vouchers/${request.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucherPayTo: payTo,
        voucherAddress: address,
        voucherNumber,
        voucherParticulars,
        fundSourceId: selectedFundSourceId
      })
    });
    const data = await response.json();
    setSaveStatus(response.ok ? 'success' : 'error');
    setSaveMessage(response.ok ? data.message : data.error || 'Unable to save voucher details.');
  };

  return (
    <div className="mx-auto max-w-[900px] text-[12px] text-black">
      <div className="bg-white p-4 print:p-0">
        <div className="grid grid-cols-[90px_1fr_90px] items-center border border-black p-2 text-center">
          <img src="/sfxc_icon.png" alt="SFXC logo" className="mx-auto h-16 w-16 object-contain" />
          <div>
            <p className="text-base font-bold">ST. FRANCIS XAVIER COLLEGE</p>
            <p>San Francisco, Agusan del Sur</p>
            <p className="mt-2 text-sm font-bold">DISBURSEMENT VOUCHER</p>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-[1fr_225px] border-x border-black">
          <div className="border-r border-black p-2">
            <div className="flex items-center gap-2">Pay to:
              {canEdit ? (
                <input required value={payTo} onChange={(event) => setPayTo(event.target.value)} className="min-w-0 flex-1 border-b border-black bg-transparent px-1 font-bold uppercase outline-none" />
              ) : <span className="font-bold uppercase underline">{payee}</span>}
            </div>
            <div className="mt-1 flex items-center gap-2">Address:
              {canEdit ? (
                <input required value={address} onChange={(event) => setAddress(event.target.value)} className="min-w-0 flex-1 border-b border-black bg-transparent px-1 font-bold uppercase outline-none" />
              ) : <span className="font-bold uppercase underline">{address}</span>}
            </div>
          </div>
          <div className="p-2">
            <div className="flex items-center gap-2">Voucher No.:
              {canEdit ? (
                <input required value={voucherNumber} onChange={(event) => setVoucherNumber(event.target.value)} className="min-w-0 flex-1 border-b border-black bg-transparent px-1 text-right font-bold outline-none" />
              ) : <span className="ml-auto font-bold">{voucherNumber}</span>}
            </div>
            <p className="mt-1">Date: <span className="float-right font-bold">{new Date(request.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
          </div>
        </div>

        <div className="border border-black p-3 text-center">
          <p className="font-bold">PARTICULARS</p>
          <p className="mt-5">To release an amount of <strong>{amountInWords(amount)},</strong></p>
          {canEdit ? (
            <textarea
              required
              rows={3}
              value={voucherParticulars}
              onChange={(event) => setVoucherParticulars(event.target.value)}
              className="mx-auto mt-2 block w-full max-w-3xl resize-y border-b border-black bg-transparent p-1 text-center outline-none"
            />
          ) : <p className="mx-auto mt-2 max-w-3xl whitespace-pre-wrap">{voucherParticulars},</p>}
          <p>as per attached approved request.</p>
        </div>

        <div className="grid grid-cols-[1fr_220px]">
          <div className="border-x border-b border-black">
            <p className="border-b border-black py-1 text-center font-bold">Accounts (For Accounting Use only)</p>
            <div className="grid grid-cols-[1fr_110px_110px] text-[10px] font-semibold uppercase">
              <span />
              <span className="border-l border-black px-2 py-1 text-center">Debit</span>
              <span className="border-l border-black px-2 py-1 text-center">Credit</span>
            </div>
            <div className="grid min-h-[58px] grid-cols-[1fr_110px_110px]">
              <div className="p-2 font-bold uppercase">
                {fundAccountOptions && onFundSourceChange ? (
                  <select
                    required
                    value={selectedFundSourceId ?? ''}
                    onChange={(event) => onFundSourceChange(event.target.value)}
                    className="w-full border border-slate-300 bg-white px-2 py-1 font-bold uppercase print:appearance-none print:border-0"
                  >
                    <option value="">Select sub-account</option>
                    {fundAccountOptions.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                ) : fundName}
              </div>
              <div className="border-l border-black p-2 text-left font-bold">{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              <div className="border-l border-black" />
            </div>
            <div className="grid grid-cols-[1fr_110px_110px]">
              <p className="p-2 text-center font-bold">VOUCHER PAYABLE</p>
              <p className="border-l border-black" />
              <p className="border-l border-black p-2 text-right font-bold">{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="border-r border-b border-black">
            <p className="border-b border-black py-1 text-center font-bold">Amount</p>
            <p className="mt-12 px-3 text-right text-sm font-bold">PHP {amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="grid grid-cols-[230px_1fr] border-x border-b border-black">
          <div className="border-r border-black p-2">
            <p>Fund Type: <strong className="float-right uppercase">{accountName}</strong></p>
            <p className="mt-2">Fund Name: <strong className="float-right uppercase">{fundName}</strong></p>
            <p className="mt-2">Date Requested: <strong className="float-right">{new Date(request.date).toLocaleDateString()}</strong></p>
          </div>
          <div className="p-2 text-center">
            <p className="text-left italic">Received the amount in payment of the above stated particulars:</p>
            <p className="mt-5 font-bold uppercase underline">{payee}</p>
            <p className="mt-1">Payee</p>
          </div>
        </div>

        <div className="grid grid-cols-3">
          <Signature label="PREPARED:" name={fundOfficer} title={setting('PREPARED_BY')?.title ?? 'Fund Officer'} />
          <Signature label="CHECKED:" name={reviewer} title={setting('CHECKED_BY')?.title ?? 'Reviewer'} />
          <Signature label="VERIFIED:" name={endorser} title={setting('VERIFIED_BY')?.title ?? 'Endorser'} />
        </div>
        <div className="grid grid-cols-3">
          <Signature label="RECOMMENDING APPROVAL:" name={recommending} title={setting('RECOMMENDING_APPROVAL')?.title ?? 'JCA'} />
          <Signature label="APPROVED:" name={approved} title={setting('APPROVED_BY')?.title ?? 'JMAPC'} className="border-r-0" />
          <Signature label="APPROVED:" name={president?.name} title={president?.title ?? 'President'} className="border-l-0" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        {canEdit ? (
          <button type="button" onClick={saveVoucher} disabled={saveStatus === 'saving'} className="sfxc-button">
            {saveStatus === 'saving' ? 'Saving...' : 'Save Voucher'}
          </button>
        ) : null}
        <button type="button" onClick={() => window.print()} className="sfxc-button">Print Voucher</button>
        <button type="button" onClick={downloadExcel} className="rounded-2xl border border-sfxc-green px-4 py-3 text-sm font-semibold text-sfxc-green hover:bg-emerald-50">
          Download Excel
        </button>
        {saveMessage ? <p className={`self-center text-sm ${saveStatus === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{saveMessage}</p> : null}
      </div>
    </div>
  );
}
