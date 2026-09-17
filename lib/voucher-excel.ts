import { XlsxCell, XlsxStyle, buildXlsx } from './xlsx';

interface ApprovalEvidence {
  approvalCode: string | null;
  createdAt: Date | string;
}

interface SignatureData {
  name?: string | null;
  title?: string | null;
  approval?: ApprovalEvidence;
}

export interface VoucherExcelData {
  payee: string;
  address: string;
  voucherNumber: string;
  date: Date | string;
  scheduledReleaseDate?: Date | string | null;
  actualReleaseDate?: Date | string | null;
  particulars: string;
  amount: number;
  amountInWords: string;
  accountName: string;
  fundName: string;
  signatures: {
    prepared: SignatureData;
    checked: SignatureData;
    verified: SignatureData;
    recommending: SignatureData;
    approved: SignatureData;
    president: SignatureData;
  };
}

const border = { border: true, vertical: 'center' as const };

const styles: Record<string, XlsxStyle> = {
  Body: { ...border, wrap: true },
  Title: { ...border, horizontal: 'center', wrap: true, font: { size: 14, bold: true } },
  Label: { ...border },
  Underline: { ...border, font: { bold: true, underline: true } },
  Right: { ...border, horizontal: 'right', font: { bold: true } },
  Section: { ...border, horizontal: 'center', font: { bold: true } },
  Centered: { ...border, horizontal: 'center', wrap: true },
  CenteredBold: { ...border, horizontal: 'center', wrap: true, font: { bold: true } },
  SmallHeader: { ...border, horizontal: 'center', font: { size: 8, bold: true } },
  Bold: { ...border, wrap: true, font: { bold: true } },
  Number: { ...border, horizontal: 'right', font: { bold: true }, numberFormat: '#,##0.00' },
  Money: { ...border, horizontal: 'right', font: { bold: true }, numberFormat: '"PHP" #,##0.00' },
  Signature: { ...border, horizontal: 'center', wrap: true, font: { size: 9 } }
};

function evidence(signature: SignatureData) {
  return [
    signature.approval?.approvalCode ? `Approval Code: ${signature.approval.approvalCode}` : '',
    signature.approval?.createdAt ? new Date(signature.approval.createdAt).toLocaleString('en-PH') : ''
  ]
    .filter(Boolean)
    .join(' | ');
}

function signatureText(label: string, signature: SignatureData) {
  return [label, evidence(signature), signature.name || '____________________________', signature.title || '']
    .filter(Boolean)
    .join('\n');
}

/** Creates an .xlsx workbook that mirrors the printed voucher form on six columns. */
export function buildVoucherXlsx(data: VoucherExcelData) {
  const date = new Date(data.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const scheduledReleaseDate = data.scheduledReleaseDate
    ? new Date(data.scheduledReleaseDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : 'Not scheduled';
  const actualReleaseDate = data.actualReleaseDate
    ? new Date(data.actualReleaseDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : 'Not released';
  const merges: string[] = [];
  const cols = 'ABCDEF';

  // Lays out one row from [value, style, columns spanned] triples. A merged
  // range still gets a styled cell under every column, or Excel draws the
  // border only around the first one.
  const row = (r: number, parts: [XlsxCell['value'], string, number?][], height?: number) => {
    const cells: XlsxCell[] = [];
    for (const [value, style, span = 1] of parts) {
      const start = cells.length;
      if (span > 1) merges.push(`${cols[start]}${r}:${cols[start + span - 1]}${r}`);
      cells.push({ value, style });
      for (let i = 1; i < span; i++) cells.push({ value: null, style });
    }
    return { height, cells };
  };

  const rows = [
    row(1, [['ST. FRANCIS XAVIER COLLEGE\nSan Francisco, Agusan del Sur\n\nDISBURSEMENT VOUCHER', 'Title', 6]], 84),
    row(2, [['Pay to:', 'Label'], [data.payee.toUpperCase(), 'Underline', 3], ['Voucher No.:', 'Label'], [data.voucherNumber, 'Right']]),
    row(3, [['Address:', 'Label'], [data.address.toUpperCase(), 'Underline', 3], ['Date:', 'Label'], [date, 'Right']]),
    row(4, [['PARTICULARS', 'Section', 6]], 24),
    row(5, [[`To release an amount of ${data.amountInWords},`, 'Centered', 6]], 24),
    row(6, [[data.particulars, 'Centered', 6]], 42),
    row(7, [['as per attached approved request.', 'Centered', 6]]),
    row(8, [['Accounts (For Accounting Use only)', 'Section', 4], ['Amount', 'Section', 2]]),
    row(9, [['Account', 'SmallHeader', 2], ['Debit', 'SmallHeader'], ['Credit', 'SmallHeader'], ['Voucher Amount', 'SmallHeader', 2]]),
    row(10, [[`${data.accountName}\n${data.fundName}`, 'Bold', 2], [data.amount, 'Number'], [null, 'Body'], [data.amount, 'Money', 2]], 34),
    row(11, [['VOUCHER PAYABLE', 'CenteredBold', 2], [null, 'Body'], [data.amount, 'Number'], [null, 'Body', 2]]),
    row(12, [
      [`Fund Type: ${data.accountName}\nFund Name: ${data.fundName}\nDate Requested: ${date}\nScheduled Release: ${scheduledReleaseDate}\nActual Release: ${actualReleaseDate}`, 'Body', 3],
      [`Received the amount in payment of the above stated particulars:\n\n${data.payee.toUpperCase()}\nPayee`, 'Centered', 3]
    ], 78),
    row(13, [
      [signatureText('PREPARED:', data.signatures.prepared), 'Signature', 2],
      [signatureText('CHECKED:', data.signatures.checked), 'Signature', 2],
      [signatureText('VERIFIED:', data.signatures.verified), 'Signature', 2]
    ], 82),
    row(14, [
      [signatureText('RECOMMENDING APPROVAL:', data.signatures.recommending), 'Signature', 2],
      [signatureText('APPROVED:', data.signatures.approved), 'Signature', 2],
      [signatureText('APPROVED:', data.signatures.president), 'Signature', 2]
    ], 82)
  ];

  return buildXlsx({
    name: 'Disbursement Voucher',
    columns: [12, 17, 15, 15, 13, 22],
    rows,
    styles,
    merges,
    fitToPage: true,
    showGridLines: false,
    margins: 0.4
  });
}
