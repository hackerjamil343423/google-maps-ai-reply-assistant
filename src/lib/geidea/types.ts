export type GeideaCustomer = {
  id?: string;
  customerId?: string;
  name: string;
  email?: string | null;
  phoneCountryCode?: string | null;
  phone?: string | null;
};

export type GeideaSession = {
  id: string;
  sessionId?: string;
  amount: number;
  currency: string;
  status?: string;
  expiryDate?: string | null;
};

export type GeideaSubscription = {
  id?: string;
  subscriptionId: string;
  customerId?: string | null;
  status: string;
  occurrences?: number | null;
  nextOccurrenceDate?: string | null;
  agreementId?: string | null;
  tokenId?: string | null;
};

export type GeideaCallbackOrder = {
  orderId?: string;
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  detailedStatus?: string;
  responseCode?: string;
  merchantReferenceId?: string;
  paymentMethod?: {
    agreementId?: string | null;
    tokenId?: string | null;
  };
  subscription?: {
    subscriptionId?: string;
    id?: string;
    status?: string;
    nextOccurrenceDate?: string | null;
  };
};

export type GeideaCallback = {
  order?: GeideaCallbackOrder;
  orderId?: string;
  amount?: number;
  currency?: string;
  subscriptionId?: string;
  subscription?: GeideaCallbackOrder["subscription"];
  responseCode?: string;
  responseMessage?: string;
  detailedResponseCode?: string;
  detailedResponseMessage?: string;
  detailedStatus?: string;
  status?: string;
  signature?: string;
  timeStamp?: string;
  timestamp?: string;
  merchantReferenceId?: string;
  agreementId?: string | null;
  tokenId?: string | null;
  paymentMethod?: GeideaCallbackOrder["paymentMethod"];
};

export type GeideaApiEnvelope = {
  responseCode?: string;
  responseMessage?: string;
  detailedResponseMessage?: string;
  detailedResponseCode?: string;
};
