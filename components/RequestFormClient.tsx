'use client';

import { useRef, useState } from 'react';

interface RequestFormProps {
  assignedDepartment: { id: string; name: string } | null;
  requester: { id: string; name: string };
  requestDate: string;
  nextControlNumber: string;
}

export default function RequestFormClient({ assignedDepartment, requester, requestDate, nextControlNumber }: RequestFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    particulars: '',
    amount: ''
  });
  const [preApprovalFile, setPreApprovalFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleAddAttachments = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    setAttachments((currentAttachments) => [...currentAttachments, ...selectedFiles]);
    if (attachmentsInputRef.current) {
      attachmentsInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (removeIndex: number) => {
    setAttachments((currentAttachments) => currentAttachments.filter((_, index) => index !== removeIndex));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    const payload = new FormData();
    payload.set('particulars', form.particulars);
    payload.set('amount', form.amount);
    if (preApprovalFile) {
      payload.set('preApprovalFile', preApprovalFile);
    }
    attachments.forEach((attachment) => {
      payload.append('attachments', attachment);
    });

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        body: payload
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to create request.');
        return;
      }

      setStatus('success');
      setMessage(`Request ${data.controlNumber} created successfully.`);
      setForm({
        particulars: '',
        amount: ''
      });
      setPreApprovalFile(null);
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (attachmentsInputRef.current) {
        attachmentsInputRef.current.value = '';
      }
    } catch (error) {
      setStatus('error');
      setMessage('Request service unavailable.');
    }
  };

  return (
    <form className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Date
          <input
            type="text"
            value={new Date(requestDate).toLocaleDateString()}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          No.
          <input
            type="text"
            value={nextControlNumber}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Department
          <input
            type="text"
            value={assignedDepartment?.name ?? 'No department assigned'}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Requested By
          <input
            type="text"
            value={requester.name}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 outline-none"
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => handleChange('amount', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-700">
          Pre-Approval Notes
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(event) => setPreApprovalFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-sfxc-green file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-sfxc-green"
          />
          <span className="block text-xs text-slate-500">Upload an image or PDF file, maximum 2MB.</span>
          {preApprovalFile ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="truncate text-sm font-medium text-slate-700">{preApprovalFile.name}</span>
              <button
                type="button"
                onClick={() => handleViewFile(preApprovalFile)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-sfxc-green hover:border-sfxc-green"
              >
                View
              </button>
            </div>
          ) : null}
        </label>
      </div>

      <label className="space-y-2 text-sm text-slate-700">
        Particulars of Request
        <textarea
          value={form.particulars}
          onChange={(event) => handleChange('particulars', event.target.value)}
          rows={4}
          className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sfxc-green"
        />
      </label>

      <label className="space-y-2 text-sm text-slate-700">
        Attachments
        <input
          ref={attachmentsInputRef}
          type="file"
          multiple
          onChange={(event) => handleAddAttachments(event.target.files)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 focus:border-sfxc-green"
        />
        <span className="block text-xs text-slate-500">
          {attachments.length > 0 ? `${attachments.length} file${attachments.length === 1 ? '' : 's'} selected. You can choose more files to add to this list.` : 'Upload quotations, invoices, or other supporting files. Maximum 2MB per file.'}
        </span>
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <span className="truncate text-sm font-medium text-slate-700">{attachment.name}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewFile(attachment)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-sfxc-green hover:border-sfxc-green"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Status will move to <strong>For Fund Availability</strong> after submission. Source of Fund will be assigned during fund availability review.</p>
        </div>
        <button type="submit" disabled={!assignedDepartment || status === 'saving'} className="sfxc-button">
          {status === 'saving' ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>

      {status !== 'idle' && (
        <div className={`rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message}
        </div>
      )}
    </form>
  );
}
