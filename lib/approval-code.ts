import { createHash } from 'crypto';

const COLLEGE_LETTERS = 'SaintFrancisXavierCollege'.replace(/[^A-Za-z]/g, '');
const UPPERCASE_LETTERS = COLLEGE_LETTERS.toUpperCase();
const LOWERCASE_LETTERS = COLLEGE_LETTERS.toLowerCase();
const DIGITS = '123456789';
const APPROVAL_CODE_LENGTH = 10;

function pick(source: string, value: number) {
  return source[value % source.length];
}

export function generateApprovalCode({
  requestId,
  actorId,
  role,
  action,
  approvedAt
}: {
  requestId: string;
  actorId: string;
  role: string;
  action: string;
  approvedAt: Date;
}) {
  const seed = [
    COLLEGE_LETTERS,
    requestId,
    actorId,
    role,
    action,
    approvedAt.toISOString()
  ].join('|');
  const digest = createHash('sha256').update(seed).digest();
  const alphabet = `${UPPERCASE_LETTERS}${LOWERCASE_LETTERS}${DIGITS}`;
  const code = [
    pick(UPPERCASE_LETTERS, digest[0]),
    pick(LOWERCASE_LETTERS, digest[1]),
    pick(DIGITS, digest[2])
  ];

  for (let index = code.length; index < APPROVAL_CODE_LENGTH; index += 1) {
    code.push(pick(alphabet, digest[index]));
  }

  // Deterministically mix the required uppercase, lowercase, and numeric characters.
  for (let index = code.length - 1; index > 0; index -= 1) {
    const swapIndex = digest[index + APPROVAL_CODE_LENGTH] % (index + 1);
    [code[index], code[swapIndex]] = [code[swapIndex], code[index]];
  }

  return code.join('');
}
