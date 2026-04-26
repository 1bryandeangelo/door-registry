export type Role = "admin" | "member";
export type QcStatus = "Pending" | "Approved" | "Failed";
export type NoteCategory = "General" | "Install" | "QC" | "Field Issue" | "Damage" | "RFI" | "Other";

export interface Company { id: string; name: string; created_at: string; }
export interface Profile { id: string; company_id: string | null; full_name: string | null; role: Role; created_at: string; email?: string; }
export interface Invitation { id: string; company_id: string; email: string; token: string; invited_by: string | null; accepted_at: string | null; created_at: string; invited_by_name?: string; }
export interface Project { id: string; company_id: string; job_number: string | null; name: string; address: string | null; schedule_approved: boolean; hw_cutsheet_path: string | null; hw_cutsheet_media_type: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface Door { uid: string; door_id: string; project_id: string; company_id: string; location: string | null; manufacturer: string | null; model: string | null; thermal: string | null; elevation: string | null; glass_tag: string | null; glass_makeup: string | null; glass_size: string | null; has_midrail: boolean; glass_size_midrail: string | null; finish: string | null; hw_set: string | null; hw_schedule: string | null; door_function: string | null; swing: string | null; transom: boolean; sidelite: boolean; fire_rated: boolean; work_order: string | null; qc_sheet: string | null; qc_status: QcStatus; qc_date: string | null; elevation_image_path: string | null; floorplan_image_path: string | null; hw_items: HwItem[]; created_by: string | null; created_at: string; updated_at: string; }
export interface HwItem { qty: string; description: string; partNumber: string; finish: string; itemCode: string; mfr: string; cutsheetPages: number[]; cutsheetNote: string; }
export interface DoorFile { id: string; door_uid: string; company_id: string; name: string; mime_type: string | null; storage_path: string; created_at: string; }
export interface TimelineEntry { id: string; door_uid: string; company_id: string; category: NoteCategory; body: string | null; created_by: string | null; entry_ts: string; created_at: string; author_name?: string | null; photos?: TimelinePhoto[]; }
export interface TimelinePhoto { id: string; entry_id: string; storage_path: string; created_at: string; }

export interface DoorFormData { door_id: string; location: string; manufacturer: string; model: string; thermal: string; elevation: string; glass_tag: string; glass_makeup: string; glass_size: string; has_midrail: boolean; glass_size_midrail: string; finish: string; hw_set: string; hw_schedule: string; door_function: string; swing: string; transom: boolean; sidelite: boolean; fire_rated: boolean; work_order: string; qc_sheet: string; qc_status: QcStatus; qc_date: string; }
export const EMPTY_DOOR_FORM: DoorFormData = { door_id: "", location: "", manufacturer: "", model: "", thermal: "Thermal", elevation: "", glass_tag: "", glass_makeup: "", glass_size: "", has_midrail: false, glass_size_midrail: "", finish: "", hw_set: "", hw_schedule: "", door_function: "", swing: "", transom: false, sidelite: false, fire_rated: false, work_order: "", qc_sheet: "", qc_status: "Pending", qc_date: "" };
export const DOOR_FUNCTIONS = ["Passage","Storeroom","Entrance / Vestibule","Office","Exit Only","Stairwell","Mechanical / Utility","Electrified / Access Control","Other"];
export const SWING_OPTIONS = ["LH Inswing","LH Outswing","RH Inswing","RH Outswing","LHR Inswing","LHR Outswing","RHR Inswing","RHR Outswing","Pair - Active LH","Pair - Active RH","Sliding","Bi-fold","Other"];
export const QC_OPTIONS: QcStatus[] = ["Pending","Approved","Failed"];
export const NOTE_CATEGORIES: NoteCategory[] = ["General","Install","QC","Field Issue","Damage","RFI","Other"];
export interface ParsedDoorStub { door_id: string; hw_set: string; door_function: string; swing: string; transom: boolean; sidelite: boolean; fire_rated: boolean; location: string; elevation: string; hw_schedule: string; work_order: string; qc_sheet: string; qc_status: QcStatus; qc_date: string; }
export interface ScheduleParseResult { doorSets: Record<string, string>; sets: Record<string, RawHwItem[]>; }
export interface RawHwItem { qty: string; description: string; partNumber: string; finish: string; itemCode: string; mfr: string; }
export interface CutsheetMatch { pages: number[]; note: string; }
