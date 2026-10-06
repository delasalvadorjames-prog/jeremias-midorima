import React from 'react';
interface DeleteConfirmationContentProps {
  staff?: {
    id: number;
    full_name: string;
    identifier: string;
    created_at?: string;
  } | null;
}

export const DeleteConfirmationContent = ({ staff }: DeleteConfirmationContentProps) => {
  if (!staff) return null;

  return (
    <div className="space-y-5">
      {/* Account Profile Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-rose-200 text-2xl font-bold text-rose-700 ring-2 ring-rose-200/50">
          {staff.identifier?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-bold text-slate-900">
            {staff.full_name || 'Staff Member'}
          </h4>
          <p className="text-sm text-slate-500">
            @{staff.identifier || 'username'}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200/80" />

      {/* Account Created */}
      {staff.created_at && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Account created</span>
            <span className="text-sm text-slate-900">
              {new Date(staff.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="border-t border-slate-200/80" />
        </>
      )}

      {/* Confirm Deletion */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">
          Confirm Deletion
        </h3>
        <p className="text-sm leading-6 text-slate-600">
          You are about to permanently remove{' '}
          <span className="font-bold text-slate-900">
            @{staff.identifier}
          </span>{' '}
          from the staff directory. This action will also remove all associated data and access permissions.
        </p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 rounded-xl bg-rose-50/80 px-4 py-3.5 ring-1 ring-rose-200/60">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.949 3.374h14.708c1.732 0 2.815-1.874 1.95-3.374L13.95 4.576c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" 
          />
        </svg>
        <p className="text-sm font-semibold text-rose-800">
          This action is irreversible and cannot be undone.
        </p>
      </div>

      {/* Staff Details */}
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50/80 px-4 py-3.5 ring-1 ring-slate-200/60">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            STAFF ID
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {staff.id}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            IDENTIFIER
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            @{staff.identifier}
          </p>
        </div>
      </div>
    </div>
  );
};
