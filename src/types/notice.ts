export interface ExtractedNotice {
  notice_type: string | null;
  notice_ref_no: string | null;
  notice_date: string | null; // ISO YYYY-MM-DD
  period_from: string | null;
  period_to: string | null;
  fy: string | null;
  gstin_mentioned: string | null;
  issuing_office_name: string | null;
  issuing_office_address: string | null;
  ward_circle_range: string | null;
  discrepancy_type: string | null;
  discrepancy_details: string | null;
  confidence_notes: string;
}

export type FlowStep = "UPLOAD" | "EXTRACTING" | "CONFIRM_EDIT" | "PROCEED_TO_DRAFT";