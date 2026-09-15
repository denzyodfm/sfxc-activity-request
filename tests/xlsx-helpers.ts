/** Reads the entries back out of a stored (uncompressed) zip written by lib/xlsx. */
export function readStoredZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const end = zip.byteLength - 22;
  if (view.getUint32(end, true) !== 0x06054b50) throw new Error('No end-of-central-directory record.');

  const count = view.getUint16(end + 10, true);
  let position = view.getUint32(end + 16, true);
  const entries: Record<string, { text: string; crc: number; size: number }> = {};

  for (let i = 0; i < count; i++) {
    if (view.getUint32(position, true) !== 0x02014b50) throw new Error('Bad central directory entry.');
    const crc = view.getUint32(position + 16, true);
    const size = view.getUint32(position + 20, true);
    const nameLength = view.getUint16(position + 28, true);
    const localOffset = view.getUint32(position + 42, true);
    const name = decoder.decode(zip.subarray(position + 46, position + 46 + nameLength));

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`Bad local header for ${name}.`);
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    entries[name] = { text: decoder.decode(zip.subarray(dataStart, dataStart + size)), crc, size };
    position += 46 + nameLength;
  }

  return entries;
}
