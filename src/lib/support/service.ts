import ordersData from "@/data/orders.json";
import policiesData from "@/data/policies.json";
import type {
  OrderRecord,
  PolicyRecord,
  PolicyType,
  ReturnEligibilityResult,
  SupportToolName
} from "@/lib/support/types";

type RawOrder = {
  order_id: string;
  user_id: string;
  status: OrderRecord["status"];
  item: string;
  order_date: string;
  delivery_date?: string;
  expected_delivery?: string;
  cancellation_date?: string;
  return_window_days?: number;
  refund_status: OrderRecord["refundStatus"];
};

type RawPolicies = {
  returns: {
    allowed: boolean;
    window_days: number;
    conditions: string[];
  };
  refunds: {
    method: string;
    processing_time_days: number;
  };
  support_hours: string;
};

export const DEFAULT_DEMO_USER_ID = "U1";

const normalizedOrders: OrderRecord[] = (ordersData as RawOrder[]).map((order) => ({
  orderId: order.order_id,
  userId: order.user_id,
  status: order.status,
  item: order.item,
  orderDate: order.order_date,
  deliveryDate: order.delivery_date,
  expectedDelivery: order.expected_delivery,
  cancellationDate: order.cancellation_date,
  returnWindowDays: order.return_window_days,
  refundStatus: order.refund_status
}));

const normalizedPolicies: PolicyRecord = {
  returns: {
    allowed: (policiesData as RawPolicies).returns.allowed,
    windowDays: (policiesData as RawPolicies).returns.window_days,
    conditions: (policiesData as RawPolicies).returns.conditions
  },
  refunds: {
    method: (policiesData as RawPolicies).refunds.method,
    processingTimeDays: (policiesData as RawPolicies).refunds.processing_time_days
  },
  supportHours: (policiesData as RawPolicies).support_hours
};

const getSortDate = (order: OrderRecord) => {
  return (
    order.expectedDelivery ??
    order.deliveryDate ??
    order.cancellationDate ??
    order.orderDate
  );
};

const getDateAfterDays = (dateValue: string, days: number) => {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const listRecentOrders = (userId = DEFAULT_DEMO_USER_ID) => {
  return normalizedOrders
    .filter((order) => order.userId === userId)
    .toSorted((left, right) => {
      return getSortDate(right).localeCompare(getSortDate(left));
    });
};

export const getOrderDetails = (orderId: string) => {
  return normalizedOrders.find((order) => order.orderId === orderId) ?? null;
};

export const checkReturnEligibility = (
  orderId: string,
  now = new Date()
): ReturnEligibilityResult | null => {
  const order = getOrderDetails(orderId);

  if (!order) {
    return null;
  }

  if (!normalizedPolicies.returns.allowed) {
    return {
      orderId,
      eligible: false,
      reason: "Returns are currently disabled in policy.",
      expiresOn: null
    };
  }

  if (order.status !== "delivered" || !order.deliveryDate) {
    return {
      orderId,
      eligible: false,
      reason: "Only delivered orders can be returned.",
      expiresOn: null
    };
  }

  if (order.refundStatus === "processing" || order.refundStatus === "completed") {
    return {
      orderId,
      eligible: false,
      reason: "A refund is already in progress or completed for this order.",
      expiresOn: null
    };
  }

  const returnWindowDays =
    order.returnWindowDays ?? normalizedPolicies.returns.windowDays;
  const expiresOnDate = getDateAfterDays(order.deliveryDate, returnWindowDays);
  const expiresOn = expiresOnDate.toISOString().slice(0, 10);

  if (expiresOnDate < now) {
    return {
      orderId,
      eligible: false,
      reason: "The return window has expired for this order.",
      expiresOn
    };
  }

  return {
    orderId,
    eligible: true,
    reason: "This order is within the return window.",
    expiresOn
  };
};

export const getPolicy = (policyType: string) => {
  const normalizedType = policyType as PolicyType;

  switch (normalizedType) {
    case "returns":
      return normalizedPolicies.returns;
    case "refunds":
      return normalizedPolicies.refunds;
    case "support_hours":
      return { supportHours: normalizedPolicies.supportHours };
    default:
      return null;
  }
};

export const runSupportTool = (
  toolName: SupportToolName,
  args: Record<string, unknown>
) => {
  switch (toolName) {
    case "list_recent_orders":
      return listRecentOrders(
        typeof args.userId === "string" ? args.userId : DEFAULT_DEMO_USER_ID
      );
    case "get_order_details":
      return getOrderDetails(String(args.orderId ?? ""));
    case "check_return_eligibility":
      return checkReturnEligibility(String(args.orderId ?? ""));
    case "get_policy":
      return getPolicy(String(args.policyType ?? ""));
  }
};
