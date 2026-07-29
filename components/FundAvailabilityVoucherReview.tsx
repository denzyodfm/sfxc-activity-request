'use client';

import { useState } from 'react';
import VoucherPrint from './VoucherPrint';
import FundAvailabilityForm from './FundAvailabilityForm';
import { RequestDetailsData } from './RequestDetails';

interface FundSourceOption {
  id: string;
  name: string;
  parentId: string | null;
  balance: number;
}

export default function FundAvailabilityVoucherReview({
  request,
  requestDetails,
  signatories,
  roleNames,
  fundSources
}: {
  request: any;
  requestDetails: RequestDetailsData;
  signatories: { slot: string; name: string; title: string | null }[];
  roleNames: { jca?: string; jmapc?: string };
  fundSources: FundSourceOption[];
}) {
  const mainAccounts = fundSources.filter((source) => !source.parentId);
  const existing = fundSources.find((source) => source.id === request.fundSourceId);
  const initialMain = existing?.parentId ?? existing?.id ?? mainAccounts[0]?.id ?? '';
  const initialSub = existing?.parentId
    ? existing.id
    : fundSources.find((source) => source.parentId === initialMain)?.id ?? '';
  const [selectedMain, setSelectedMain] = useState(initialMain);
  const [selectedSub, setSelectedSub] = useState(initialSub);
  const selectedFund = fundSources.find((source) => source.id === selectedSub);
  const selectedParent = mainAccounts.find((source) => source.id === selectedFund?.parentId);

  const selectSubAccount = (id: string) => {
    const sub = fundSources.find((source) => source.id === id);
    setSelectedSub(id);
    if (sub?.parentId) setSelectedMain(sub.parentId);
  };

  return (
    <div className="space-y-2">
      <VoucherPrint
        request={request}
        signatories={signatories}
        roleNames={roleNames}
        canEdit
        fundAccountOptions={fundSources.filter((source) => source.parentId).map((source) => ({
          id: source.id,
          name: source.name,
          mainAccountName: mainAccounts.find((main) => main.id === source.parentId)?.name ?? 'Main Account'
        }))}
        selectedFundSourceId={selectedSub}
        onFundSourceChange={selectSubAccount}
        selectedAccountName={selectedParent?.name}
        selectedFundName={selectedFund?.name}
      />
      <FundAvailabilityForm
        requestId={request.id}
        request={requestDetails}
        fundSourceId={request.fundSourceId}
        showRequestDetails={false}
        fundSources={fundSources}
        selectedSub={selectedSub}
      />
    </div>
  );
}
