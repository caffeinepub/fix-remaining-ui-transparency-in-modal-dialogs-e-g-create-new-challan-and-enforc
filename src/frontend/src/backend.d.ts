import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface BecomeAdminResponse {
    isAlreadyAdmin: boolean;
    error?: string;
    success: boolean;
}
export interface PettyCashAttachment {
    id: string;
    blob: ExternalBlob;
}
export interface PettyCashBulkCreateResult {
    created?: PettyCash;
    date: bigint;
    error?: string;
    success: boolean;
}
export interface ClientBulkCreateResult {
    created?: Client;
    name: string;
    error?: string;
    success: boolean;
}
export interface PettyCash {
    categoryExpenses: Array<PettyCashCategory>;
    date: bigint;
    expenses: number;
    createdAt: bigint;
    transferFromCashEquivalents: number;
    staffAdvance: number;
    closingBalance: number;
    openingBalance: number;
    handoverToMd: number;
    cashFromMd: number;
    remarks: string;
    netChange: number;
}
export interface Payment {
    id: string;
    client: string;
    referenceNumber: string;
    date: bigint;
    mode: string;
    createdAt: bigint;
    site: string;
    amount: number;
}
export interface InventoryBulkCreateResult {
    created?: InventoryItem;
    name: string;
    error?: string;
    success: boolean;
}
export interface BuildMetadata {
    gitCommitHash: string;
    buildTime: bigint;
    canisterId: Principal;
}
export interface InventoryItem {
    dailyRate: number;
    availableQuantity: number;
    name: string;
    issuedQuantity: number;
    totalQuantity: number;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface PettyCashWithAttachments {
    attachments: Array<PettyCashAttachment>;
    pettyCash: PettyCash;
}
export interface PettyCashCategory {
    title: string;
    amount: number;
}
export interface Challan {
    id: string;
    clientName: string;
    venue: string;
    site: string;
    numberOfDays: number;
    creationDate: bigint;
    freight: number;
    items: Array<ChallanItem>;
    rentDate: bigint;
    returned: boolean;
}
export interface BulkChallanCreateResult {
    id: string;
    created?: Challan;
    error?: string;
    success: boolean;
}
export interface Client {
    name: string;
    createdAt: bigint;
}
export interface ChallanItem {
    rate: number;
    rentalDays: number;
    itemName: string;
    quantity: number;
}
export interface UserProfile {
    name: string;
}
export interface PaymentBulkCreateResult {
    id: string;
    created?: Payment;
    error?: string;
    success: boolean;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAttachmentToPettyCashRecord(date: bigint, attachment: PettyCashAttachment): Promise<Array<PettyCashAttachment>>;
    addClient(name: string, createdAt: bigint): Promise<void>;
    addInventoryItem(name: string, totalQuantity: number, dailyRate: number): Promise<void>;
    addPayment(id: string, date: bigint, client: string, mode: string, amount: number, referenceNumber: string, createdAt: bigint, site: string): Promise<void>;
    addPettyCash(date: bigint, openingBalance: number, cashFromMd: number, expenses: number, staffAdvance: number, handoverToMd: number, netChange: number, closingBalance: number, transferFromCashEquivalents: number, categoryExpenses: Array<PettyCashCategory>, remarks: string, createdAt: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    becomeBootstrapAdmin(isAdminDomain: boolean): Promise<BecomeAdminResponse>;
    bulkAddPayments(batch: Array<Payment>): Promise<Array<PaymentBulkCreateResult>>;
    bulkAddPettyCash(batch: Array<PettyCash>): Promise<Array<PettyCashBulkCreateResult>>;
    bulkCreateClients(batch: Array<Client>): Promise<Array<ClientBulkCreateResult>>;
    bulkCreateInventoryItems(batch: Array<InventoryItem>): Promise<Array<InventoryBulkCreateResult>>;
    clearPettyCashAttachments(date: bigint): Promise<void>;
    createBulkChallans(batch: Array<Challan>): Promise<Array<BulkChallanCreateResult>>;
    createChallan(id: string, clientName: string, venue: string, items: Array<ChallanItem>, freight: number, numberOfDays: number, rentDate: bigint, site: string, creationDate: bigint): Promise<void>;
    deleteChallan(id: string): Promise<void>;
    deleteClient(name: string): Promise<void>;
    deleteInventoryItem(name: string): Promise<void>;
    deletePettyCash(date: bigint): Promise<void>;
    getAllChallans(): Promise<Array<Challan>>;
    getAllClients(): Promise<Array<Client>>;
    getAllPayments(): Promise<Array<Payment>>;
    getAllPettyCashRecords(): Promise<Array<PettyCash>>;
    getAllPettyCashRecordsWithAttachments(): Promise<Array<PettyCashWithAttachments>>;
    getAttachmentsForPettyCashRecord(date: bigint): Promise<Array<PettyCashAttachment>>;
    getBuildMetadata(): Promise<BuildMetadata>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChallansByClient(client: string): Promise<Array<Challan>>;
    getChallansByDateRange(startDate: bigint, endDate: bigint): Promise<Array<Challan>>;
    getInventory(): Promise<Array<InventoryItem>>;
    getPaymentsByClient(client: string): Promise<Array<Payment>>;
    getPaymentsByDateRange(startDate: bigint, endDate: bigint): Promise<Array<Payment>>;
    getPettyCashByDateRange(startDate: bigint, endDate: bigint): Promise<Array<PettyCash>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    healthCheck(): Promise<bigint>;
    isAdminOrBootstrapAdminExternal(): Promise<boolean>;
    isBootstrapAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    markChallanReturned(id: string): Promise<void>;
    removeAttachmentFromPettyCashRecord(date: bigint, attachmentId: string): Promise<Array<PettyCashAttachment>>;
    requestApproval(): Promise<void>;
    revertChallanToActive(_id: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    updateChallan(id: string, clientName: string, venue: string, items: Array<ChallanItem>, freight: number, numberOfDays: number, rentDate: bigint, site: string): Promise<void>;
    /**
     * / Update rent date of all existing challans by re-uploading original csv file.
     * / This is an admin-only operation to restore corrupted rent dates.
     */
    updateChallanRentDates(challanData: Array<Challan>): Promise<void>;
    updateInventoryItem(name: string, totalQuantity: number, dailyRate: number): Promise<void>;
    updatePettyCash(originalDate: bigint, openingBalance: number, cashFromMd: number, expenses: number, staffAdvance: number, handoverToMd: number, netChange: number, closingBalance: number, transferFromCashEquivalents: number, categoryExpenses: Array<PettyCashCategory>, remarks: string): Promise<void>;
}
