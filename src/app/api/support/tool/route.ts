import { NextResponse } from "next/server";
import {
  checkReturnEligibility,
  getOrderDetails,
  getPolicy,
  listRecentOrders,
  runSupportTool
} from "@/lib/support/service";
import type { SupportToolName } from "@/lib/support/types";

type ToolRequestBody = {
  toolName?: string;
  args?: Record<string, unknown>;
};

const toolNames: SupportToolName[] = [
  "list_recent_orders",
  "get_order_details",
  "check_return_eligibility",
  "get_policy"
];

const isToolName = (value: string): value is SupportToolName => {
  return toolNames.includes(value as SupportToolName);
};

const hasStringArg = (
  args: Record<string, unknown> | undefined,
  key: string
): args is Record<string, string> => {
  return typeof args?.[key] === "string" && args[key].trim().length > 0;
};

export const POST = async (request: Request) => {
  const contentType = request.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 415 });
  }

  let body: ToolRequestBody;

  try {
    body = (await request.json()) as ToolRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.toolName || !isToolName(body.toolName)) {
    return NextResponse.json({ error: "invalid_tool" }, { status: 400 });
  }

  const args = body.args ?? {};

  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return NextResponse.json({ error: "invalid_args" }, { status: 400 });
  }

  console.info("[api:tool]", body.toolName, JSON.stringify(args));

  try {
    switch (body.toolName) {
      case "list_recent_orders": {
        const userId =
          typeof args.userId === "string" && args.userId.trim().length > 0
            ? args.userId
            : undefined;

        console.info("[api:tool]", "list_recent_orders", "success");
        return NextResponse.json({
          result: listRecentOrders(userId)
        });
      }
      case "get_order_details": {
        if (!hasStringArg(args, "orderId")) {
          return NextResponse.json({ error: "invalid_args" }, { status: 400 });
        }

        const order = getOrderDetails(args.orderId);

        if (!order) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }

        console.info("[api:tool]", "get_order_details", "success");
        return NextResponse.json({ result: order });
      }
      case "check_return_eligibility": {
        if (!hasStringArg(args, "orderId")) {
          return NextResponse.json({ error: "invalid_args" }, { status: 400 });
        }

        const result = checkReturnEligibility(args.orderId);

        if (!result) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }

        console.info("[api:tool]", "check_return_eligibility", "success");
        return NextResponse.json({ result });
      }
      case "get_policy": {
        if (!hasStringArg(args, "policyType")) {
          return NextResponse.json({ error: "invalid_args" }, { status: 400 });
        }

        const result = getPolicy(args.policyType);

        if (!result) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }

        console.info("[api:tool]", "get_policy", "success");
        return NextResponse.json({ result });
      }
      default: {
        return NextResponse.json({
          result: runSupportTool(body.toolName, args)
        });
      }
    }
  } catch (error) {
    console.error("[api:tool]", body.toolName, error);
    return NextResponse.json({ error: "tool_failed" }, { status: 500 });
  }
};
