'use client';

import { useState } from 'react';
import FundSourceManager, { FundSourceSummary } from './FundSourceManager';
import VoucherSignatoryManager, { VoucherSignatoryData } from './VoucherSignatoryManager';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isDepartmentHead: boolean;
  department?: { id: string; name: string } | null;
  headedDepartment?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
  headId?: string | null;
}

interface AdminFormProps {
  users: User[];
  departments: Department[];
  fundSources: FundSourceSummary[];
  voucherSignatories: VoucherSignatoryData[];
}

const voucherSlots = [
  'PREPARED_BY',
  'CHECKED_BY',
  'VERIFIED_BY',
  'RECOMMENDING_APPROVAL',
  'APPROVED_BY',
  'PRESIDENT'
];
const voucherRoleDefaults: Record<string, string> = {
  PREPARED_BY: 'FUND_OFFICER',
  CHECKED_BY: 'REVIEWER',
  VERIFIED_BY: 'ENDORSER',
  RECOMMENDING_APPROVAL: 'APPROVER_JCA',
  APPROVED_BY: 'APPROVER_JMAPC'
};
const voucherTitleDefaults: Record<string, string> = {
  PREPARED_BY: 'Fund Officer',
  CHECKED_BY: 'Reviewer',
  VERIFIED_BY: 'Endorser',
  RECOMMENDING_APPROVAL: 'JCA',
  APPROVED_BY: 'JMAPC',
  PRESIDENT: 'President'
};

export default function AdminFormClient({ users, departments, fundSources, voucherSignatories }: AdminFormProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'funds' | 'voucher'>('users');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('REQUESTOR');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserIsDepartmentHead, setNewUserIsDepartmentHead] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserRole, setEditingUserRole] = useState('REQUESTOR');
  const [editingUserDepartment, setEditingUserDepartment] = useState('');
  const [editingUserIsDepartmentHead, setEditingUserIsDepartmentHead] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingDeptHead, setEditingDeptHead] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const roles = ['REQUESTOR', 'FUND_OFFICER', 'REVIEWER', 'ENDORSER', 'APPROVER_JMAPC', 'APPROVER_JCA', 'ADMIN'];
  const usersForDepartment = (departmentId?: string | null) =>
    users.filter((user) => user.department?.id === departmentId || user.headedDepartment?.id === departmentId);

  const showStatus = (nextStatus: 'success' | 'error', nextMessage: string) => {
    setStatus(nextStatus);
    setMessage(nextMessage);
  };

  const reloadSoon = () => setTimeout(() => window.location.reload(), 1000);

  const startEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditingUserName(user.name);
    setEditingUserEmail(user.email);
    setEditingUserRole(user.role);
    setEditingUserDepartment(user.department?.id ?? user.headedDepartment?.id ?? '');
    setEditingUserIsDepartmentHead(user.isDepartmentHead);
  };

  const startEditDepartment = (department: Department) => {
    setEditingDeptId(department.id);
    setEditingDeptName(department.name);
    setEditingDeptHead(department.headId ?? '');
  };

  const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          isDepartmentHead: newUserIsDepartmentHead,
          departmentId: newUserDepartment || null
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to create user.');
        return;
      }

      setStatus('success');
      setMessage('User created successfully.');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('REQUESTOR');
      setNewUserDepartment('');
      setNewUserIsDepartmentHead(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setStatus('error');
      setMessage('User service unavailable.');
    }
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUserId) return;

    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUserName,
          email: editingUserEmail,
          role: editingUserRole,
          isDepartmentHead: editingUserIsDepartmentHead,
          departmentId: editingUserDepartment || null
        })
      });
      const data = await response.json();

      if (!response.ok) {
        showStatus('error', data.error || 'Unable to update user.');
        return;
      }

      setEditingUserId(null);
      showStatus('success', 'User updated successfully.');
      reloadSoon();
    } catch (error) {
      showStatus('error', 'User service unavailable.');
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(`Delete user ${user.name}? This cannot be undone.`);
    if (!confirmed) return;

    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        showStatus('error', data.error || 'Unable to delete user.');
        return;
      }

      showStatus('success', 'User deleted successfully.');
      reloadSoon();
    } catch (error) {
      showStatus('error', 'User service unavailable.');
    }
  };

  const handleAddDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName, headId: newDeptHead || null })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to create department.');
        return;
      }

      setStatus('success');
      setMessage('Department created successfully.');
      setNewDeptName('');
      setNewDeptHead('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setStatus('error');
      setMessage('Department service unavailable.');
    }
  };

  const handleUpdateDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDeptId) return;

    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/departments/${editingDeptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingDeptName, headId: editingDeptHead || null })
      });
      const data = await response.json();

      if (!response.ok) {
        showStatus('error', data.error || 'Unable to update department.');
        return;
      }

      setEditingDeptId(null);
      showStatus('success', 'Department updated successfully.');
      reloadSoon();
    } catch (error) {
      showStatus('error', 'Department service unavailable.');
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    const confirmed = window.confirm(`Delete department ${department.name}? This cannot be undone.`);
    if (!confirmed) return;

    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/departments/${department.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        showStatus('error', data.error || 'Unable to delete department.');
        return;
      }

      showStatus('success', 'Department deleted successfully.');
      reloadSoon();
    } catch (error) {
      showStatus('error', 'Department service unavailable.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'users' ? 'border-b-2 border-sfxc-green text-sfxc-green' : 'text-slate-600'}`}
        >
          Manage Users
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'departments' ? 'border-b-2 border-sfxc-green text-sfxc-green' : 'text-slate-600'}`}
        >
          Manage Departments
        </button>
        <button
          onClick={() => setActiveTab('funds')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'funds' ? 'border-b-2 border-sfxc-green text-sfxc-green' : 'text-slate-600'}`}
        >
          Source of Fund
        </button>
        <button
          onClick={() => setActiveTab('voucher')}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === 'voucher' ? 'border-b-2 border-sfxc-green text-sfxc-green' : 'text-slate-600'}`}
        >
          Voucher Approvers
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form className="sfxc-card p-6" onSubmit={handleAddUser}>
            <h2 className="text-lg font-semibold text-slate-900">Create New User</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-700">
                Name
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                  required
                />
              </label>
              <label className="block text-sm text-slate-700">
                Email
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                  required
                />
              </label>
              <label className="block text-sm text-slate-700">
                Password
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                  required
                  minLength={6}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Role
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                Department
                <select
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                >
                  <option value="">No Department Assigned</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={newUserIsDepartmentHead}
                  onChange={(e) => setNewUserIsDepartmentHead(e.target.checked)}
                  className="h-4 w-4 accent-sfxc-green"
                />
                Department Head
              </label>
              <button type="submit" className="sfxc-button w-full">
                Create User
              </button>
            </div>
            {status !== 'idle' && (
              <div
                className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${
                  status === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {message}
              </div>
            )}
          </form>

          <div className="sfxc-card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Current Users</h2>
            <div className="mt-5 space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="rounded-3xl border border-slate-200 p-3">
                  {editingUserId === user.id ? (
                    <form className="space-y-3" onSubmit={handleUpdateUser}>
                      <input
                        type="text"
                        value={editingUserName}
                        onChange={(e) => setEditingUserName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                        required
                      />
                      <input
                        type="email"
                        value={editingUserEmail}
                        onChange={(e) => setEditingUserEmail(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                        required
                      />
                      <select
                        value={editingUserRole}
                        onChange={(e) => setEditingUserRole(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editingUserDepartment}
                        onChange={(e) => setEditingUserDepartment(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                      >
                        <option value="">No Department Assigned</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={editingUserIsDepartmentHead}
                          onChange={(e) => setEditingUserIsDepartmentHead(e.target.checked)}
                          className="h-4 w-4 accent-sfxc-green"
                        />
                        Department Head
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="sfxc-button">Save</button>
                        <button type="button" onClick={() => setEditingUserId(null)} className="sfxc-button-secondary">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Department: {user.department?.name ?? user.headedDepartment?.name ?? 'Unassigned'}
                      </p>
                      <p className="mt-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {user.role.replace(/_/g, ' ')}
                      </p>
                      {user.isDepartmentHead ? (
                        <p className="ml-2 mt-1 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Department Head
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditUser(user)} className="sfxc-button-secondary">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form className="sfxc-card p-6" onSubmit={handleAddDepartment}>
            <h2 className="text-lg font-semibold text-slate-900">Create New Department</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-700">
                Department Name
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                  required
                />
              </label>
              <label className="block text-sm text-slate-700">
                Department Head (Optional)
                <select
                  value={newDeptHead}
                  onChange={(e) => setNewDeptHead(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                >
                  <option value="">No Head Assigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}){user.department?.name ? ` - ${user.department.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="sfxc-button w-full">
                Create Department
              </button>
            </div>
            {status !== 'idle' && (
              <div
                className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${
                  status === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {message}
              </div>
            )}
          </form>

          <div className="sfxc-card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Current Departments</h2>
            <div className="mt-5 space-y-3 max-h-96 overflow-y-auto">
              {departments.map((dept) => (
                <div key={dept.id} className="rounded-3xl border border-slate-200 p-3">
                  {editingDeptId === dept.id ? (
                    <form className="space-y-3" onSubmit={handleUpdateDepartment}>
                      <input
                        type="text"
                        value={editingDeptName}
                        onChange={(e) => setEditingDeptName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                        required
                      />
                      <select
                        value={editingDeptHead}
                        onChange={(e) => setEditingDeptHead(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sfxc-green"
                      >
                        <option value="">No Head Assigned</option>
                        {usersForDepartment(dept.id).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      {usersForDepartment(dept.id).length === 0 ? (
                        <p className="text-sm text-slate-500">Assign users to this department first before choosing a department head.</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="sfxc-button">Save</button>
                        <button type="button" onClick={() => setEditingDeptId(null)} className="sfxc-button-secondary">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">{dept.name}</p>
                      <p className="text-sm text-slate-600">
                        Head: {users.find((u) => u.id === dept.headId)?.name || 'Unassigned'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditDepartment(dept)} className="sfxc-button-secondary">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dept)}
                          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'funds' && <FundSourceManager fundSources={fundSources} />}
      {activeTab === 'voucher' && (
        <VoucherSignatoryManager
          initialSignatories={voucherSlots.map((slot) => {
            const existing = voucherSignatories.find((item) => item.slot === slot);
            const defaultUser = users.find((user) => user.role === voucherRoleDefaults[slot]);
            return existing ?? {
              slot,
              name: slot === 'PRESIDENT' ? 'President' : defaultUser?.name ?? slot.replace(/_/g, ' '),
              title: voucherTitleDefaults[slot]
            };
          })}
        />
      )}
    </div>
  );
}
