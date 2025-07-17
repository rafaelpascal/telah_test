export interface ReceiptData {
  receiptId: string;
  payerName: string;
  amount: number;
  currency: string;
  paymentDate: string;
}

export interface SingleEmailData {
  email: string;
  name: string;
  batch: string;
  window: string;
}

// export interface EmailMessagePayload {
//   message: SingleEmailData[];
//   batch: string;
//   window: string;
// }

export interface EmailMessagePayload {
  message: {
    email: string;
    name: string;
  }[];
  batch: string;
  window: string;
  html: string;
  completedhtml: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EmailJob {
  email: string;
  name: string;
  batch: string;
  window: string;
}
