'use client';

import { useState } from 'react';

interface AttachmentManagerProps {
  requests: { id: string; controlNumber: string }[];
  attachments: { id: string; fileName: string; fileUrl: string; requestId: string }[];
}

export default function AttachmentManager({ requests, attachments }: AttachmentManagerProps) {
  const [requestId, setRequestId] = useState(requests[0]?.id ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (files.length === 0 || !requestId) {
      setStatus('error');
      setMessage('Please select a request and at least one file.');
      return;
    }

    setStatus('saving');
    setMessage('');

    const formData = new FormData();
    formData.append('requestId', requestId);
    files.forEach((file) => formData.append('attachment', file));
    formData.append('remarks', remarks);

    try {
      const response = await fetch('/api/attachments', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Upload failed.');
        return;
      }

      setStatus('success');
      setMessage('Attachments uploaded successfully.');
      setFiles([]);
      setRemarks('');
    } catch (error) {
      setStatus('error');
      setMessage('Upload service unavailable.');
    }
  };

  return (
    <div className="space-y-6">
      <form className="sfxc-card p-6" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold text-slate-900">Upload Supporting Document</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            Select Request
            <select
              value={requestId}
              onChange={(event) => setRequestId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
            >
              {requests.map((request) => (
                <option key={request.id} value={request.id}>{request.controlNumber}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Choose File
            <input
              type="file"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
            <span className="block text-xs text-slate-500">
              {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'} selected.` : 'You can upload multiple supporting files, maximum 2MB per file.'}
            </span>
          </label>
        </div>
        <label className="block text-sm text-slate-700">
          Remarks
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
          />
        </label>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="submit" className="sfxc-button">Upload Attachment</button>
          <span className="text-sm text-slate-500">Attachments appear in the request detail list.</span>
        </div>
        {status !== 'idle' && (
          <div className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {message}
          </div>
        )}
      </form>

      <div className="sfxc-card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Attachment List</h2>
        <div className="mt-4 space-y-3">
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments uploaded yet.</p>
          ) : (
            attachments.map((attachment) => (
              <div key={attachment.id} className="rounded-3xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{attachment.fileName}</p>
                <p className="text-sm text-slate-500">Request: {attachment.requestId}</p>
                <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200">
                  Open attachment
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
