export enum DeletionReason {
  WRONG_PRODUCT = 'WRONG_PRODUCT',
  WRONG_QUANTITY = 'WRONG_QUANTITY',
  WRONG_PRICE = 'WRONG_PRICE',
  WRONG_CUSTOMER = 'WRONG_CUSTOMER',
  DUPLICATE = 'DUPLICATE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  OTHER = 'OTHER'
}

export enum DeletionRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export interface DeletionRequest {
  id: string;
  saleId: string;
  saleTicketNo: string;
  sellerId: string;
  reasons: DeletionReason[];
  description: string;
  status: DeletionRequestStatus;
  createdAt: string;
  updatedAt: string;
  sellerName?: string;
  rejectionReason?: string;
}

export interface CreateDeletionRequestDto {
  saleId: string;
  saleTicketNo: string;
  reasons: DeletionReason[];
  description: string;
}

export interface UpdateDeletionRequestStatusDto {
  status: DeletionRequestStatus;
  rejectionReason?: string;
}
