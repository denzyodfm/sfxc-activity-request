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

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cell(value: unknown, style = 'Body', mergeAcross = 0, type: 'String' | 'Number' = 'String') {
  return `<Cell ss:StyleID="${style}"${mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : ''}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

function evidence(signature: SignatureData) {
  const values = [
    signature.approval?.approvalCode ? `Approval Code: ${signature.approval.approvalCode}` : '',
    signature.approval?.createdAt ? new Date(signature.approval.createdAt).toLocaleString('en-PH') : ''
  ].filter(Boolean);
  return values.join(' | ');
}

function signatureCell(label: string, signature: SignatureData, mergeAcross = 1) {
  const details = [
    label,
    evidence(signature),
    signature.name || '____________________________',
    signature.title || ''
  ].filter(Boolean).join('\n');
  return cell(details, 'Signature', mergeAcross);
}

/** Creates an Excel 2003 XML workbook that mirrors the printed voucher form. */
export function buildVoucherExcelXml(data: VoucherExcelData) {
  const date = new Date(data.date).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const rows = [
    `<Row ss:Height="66">${cell('ST. FRANCIS XAVIER COLLEGE\nSan Francisco, Agusan del Sur\n\nDISBURSEMENT VOUCHER', 'Title', 5)}</Row>`,
    `<Row>${cell('Pay to:', 'Label')}${cell(data.payee.toUpperCase(), 'Underline', 2)}${cell('Voucher No.:', 'Label')}${cell(data.voucherNumber, 'Right', 1)}</Row>`,
    `<Row>${cell('Address:', 'Label')}${cell(data.address.toUpperCase(), 'Underline', 2)}${cell('Date:', 'Label')}${cell(date, 'Right', 1)}</Row>`,
    `<Row ss:Height="24">${cell('PARTICULARS', 'Section', 5)}</Row>`,
    `<Row ss:Height="24">${cell(`To release an amount of ${data.amountInWords},`, 'Centered', 5)}</Row>`,
    `<Row ss:Height="42">${cell(data.particulars, 'Centered', 5)}</Row>`,
    `<Row>${cell('as per attached approved request.', 'Centered', 5)}</Row>`,
    `<Row>${cell('Accounts (For Accounting Use only)', 'Section', 3)}${cell('Amount', 'Section', 1)}</Row>`,
    `<Row>${cell('Account', 'SmallHeader', 1)}${cell('Debit', 'SmallHeader')}${cell('Credit', 'SmallHeader')}${cell('Voucher Amount', 'SmallHeader', 1)}</Row>`,
    `<Row ss:Height="34">${cell(`${data.accountName}\n${data.fundName}`, 'Bold', 1)}${cell(data.amount, 'Money', 0, 'Number')}${cell('', 'Body')}${cell(data.amount, 'Money', 1, 'Number')}</Row>`,
    `<Row>${cell('VOUCHER PAYABLE', 'CenteredBold', 1)}${cell('', 'Body')}${cell(data.amount, 'Money', 0, 'Number')}${cell('', 'Body', 1)}</Row>`,
    `<Row>${cell(`Fund Type: ${data.accountName}\nFund Name: ${data.fundName}\nDate Requested: ${date}`, 'Body', 2)}${cell(`Received the amount in payment of the above stated particulars:\n\n${data.payee.toUpperCase()}\nPayee`, 'Centered', 2)}</Row>`,
    `<Row ss:Height="82">${signatureCell('PREPARED:', data.signatures.prepared)}${signatureCell('CHECKED:', data.signatures.checked)}${signatureCell('VERIFIED:', data.signatures.verified)}</Row>`,
    `<Row ss:Height="82">${signatureCell('RECOMMENDING APPROVAL:', data.signatures.recommending)}${signatureCell('APPROVED:', data.signatures.approved)}${signatureCell('APPROVED:', data.signatures.president)}</Row>`
  ].join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  <Style ss:ID="Body"><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="14" ss:Bold="1"/></Style>
  <Style ss:ID="Label"><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Underline"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Underline="Single"/></Style>
  <Style ss:ID="Right"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/></Style>
  <Style ss:ID="Section"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/></Style>
  <Style ss:ID="Centered"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
  <Style ss:ID="CenteredBold"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/></Style>
  <Style ss:ID="SmallHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="8" ss:Bold="1"/></Style>
  <Style ss:ID="Bold"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/></Style>
  <Style ss:ID="Money"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><NumberFormat ss:Format="&quot;PHP&quot; #,##0.00"/></Style>
  <Style ss:ID="Signature"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="9"/></Style>
 </Styles>
 <Worksheet ss:Name="Disbursement Voucher">
  <Table ss:ExpandedColumnCount="6" ss:ExpandedRowCount="14">
   <Column ss:Width="92"/><Column ss:Width="92"/><Column ss:Width="78"/><Column ss:Width="78"/><Column ss:Width="92"/><Column ss:Width="92"/>
   ${rows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Portrait"/><PageMargins x:Bottom="0.4" x:Left="0.4" x:Right="0.4" x:Top="0.4"/></PageSetup><FitToPage/><Print><FitWidth>1</FitWidth><FitHeight>1</FitHeight></Print></WorksheetOptions>
 </Worksheet>
</Workbook>`;
}
