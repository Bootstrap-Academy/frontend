export type CancellationKind = "webinar" | "coaching";
export type CancellationScope = "auto" | "booking" | "session";
export interface CancellationTarget {
  id: string;
  event_id: string;
  kind: CancellationKind;
  scope: "booking" | "session";
  role: "participant" | "provider" | "administrator";
  title: string;
  start: string;
  end: string;
  affected_orders: number;
  recorded_paid_coins: number | null;
  payment_evidence_complete: boolean;
}
export interface CancellationStatement {
  target_id: string;
  cancel_selected_scope: true;
  original_text: string;
  administration_reason: string | null;
}
export interface CancellationReceipt {
  command_id: string;
  origin: "ordinary_authenticated";
  received_at: string;
  target: CancellationTarget;
  declaration: CancellationStatement;
  state: "received" | "applied" | "resolution_required";
  reason: string | null;
  booking_changed: boolean;
  financial_state:
    | "not_assessed"
    | "amount_unknown"
    | "requires_review"
    | "uncertain"
    | "recorded_zero"
    | "historical_application"
    | "pending";
  financial_satisfaction: false;
  notice_state: "pending" | "smtp_accepted";
}
export interface CancellationAttempt {
  command: string;
  target: CancellationTarget;
  statement: CancellationStatement;
  receipt: CancellationReceipt | null;
}
