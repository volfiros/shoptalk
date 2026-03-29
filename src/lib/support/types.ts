export type OrderStatus = "delivered" | "in_transit" | "cancelled";

export type RefundStatus = "none" | "processing" | "completed";

export type PolicyType = "returns" | "refunds" | "support_hours";

export type SupportToolName =
  | "list_recent_orders"
  | "get_order_details"
  | "check_return_eligibility"
  | "get_policy";

export type OrderRecord = {
  orderId: string;
  userId: string;
  status: OrderStatus;
  item: string;
  orderDate: string;
  deliveryDate?: string;
  expectedDelivery?: string;
  cancellationDate?: string;
  returnWindowDays?: number;
  refundStatus: RefundStatus;
};

export type ReturnsPolicy = {
  allowed: boolean;
  windowDays: number;
  conditions: string[];
};

export type RefundsPolicy = {
  method: string;
  processingTimeDays: number;
};

export type PolicyRecord = {
  returns: ReturnsPolicy;
  refunds: RefundsPolicy;
  supportHours: string;
};

export type ReturnEligibilityResult = {
  orderId: string;
  eligible: boolean;
  reason: string;
  expiresOn: string | null;
};
