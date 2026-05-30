import type { AccountDelta, TransactionType } from "#/lib/transaction-ledger";

import type { OperationKind } from "./operation-kind";

export type TransactionSnapshot = {
	id: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	accountName: string | null;
	transferAccountName: string | null;
	categoryName: string | null;
	amount: string;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	tags: string[];
	isRecurring: boolean;
	transactionDate: string;
	createdAt: string;
};

export type TransactionCreatePayload = {
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	amount: number;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: Date;
};

export type TransactionUpdatePatch = {
	accountId?: string;
	transferAccountId?: string | null;
	categoryId?: string | null;
	amount?: number;
	transactionType?: TransactionType;
	merchant?: string;
	notes?: string;
	isRecurring?: boolean;
	transactionDate?: Date;
};

export type TransactionUpdatePayload = {
	transactionId: string;
	patch: TransactionUpdatePatch;
};

export type TransactionDeletePayload = {
	transactionId: string;
};

export type FinancialPostingInput<TPayload> = {
	userId: string;
	operationKind: OperationKind;
	postingKey: string;
	payload: TPayload;
};

export type FinancialPostingDomainError =
	| {
			kind: "account_not_found";
			message: string;
	  }
	| {
			kind: "category_not_found";
			message: string;
	  }
	| {
			kind: "transfer_account_invalid";
			message: string;
	  }
	| {
			kind: "posting_key_conflict";
			message: string;
	  }
	| {
			kind: "invariant_violation";
			message: string;
	  };

export type FinancialPostingSuccess = {
	kind: "posted" | "replayed";
	snapshot: TransactionSnapshot;
	schemaVersion: number;
};

export type FinancialPostingResult =
	| {
			ok: true;
			outcome: FinancialPostingSuccess;
	  }
	| {
			ok: false;
			error: FinancialPostingDomainError;
	  };

export type PostingKeyReservation =
	| { kind: "new" }
	| {
			kind: "existing";
			payloadHash: string;
			schemaVersion: number;
			snapshot: TransactionSnapshot;
	  };

export type CreatedTransactionEvent = {
	id: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	accountName: string | null;
	transferAccountName: string | null;
	categoryName: string | null;
	amount: string;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: Date;
	createdAt: Date;
};

export type ReservePostingKeyInput = {
	userId: string;
	operationKind: OperationKind;
	postingKey: string;
};

export type CompletePostingReservationInput = {
	userId: string;
	operationKind: OperationKind;
	postingKey: string;
	payloadHash: string;
	schemaVersion: number;
	snapshot: TransactionSnapshot;
};

export type CreateTransactionEventInput = {
	userId: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	amount: string;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: Date;
};

export type UpdateTransactionEventInput = {
	userId: string;
	transactionId: string;
	updates: TransactionUpdateFields;
};

export type TransactionRecord = {
	id: string;
	userId: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	amount: string;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: Date;
	createdAt: Date;
};

export type TransactionUpdateFields = {
	accountId?: string;
	transferAccountId?: string | null;
	categoryId?: string | null;
	amount?: string;
	transactionType?: TransactionType;
	merchant?: string;
	notes?: string;
	isRecurring?: boolean;
	transactionDate?: Date;
};

export type FinancialPostingAdapterTx = {
	reservePostingKey(
		input: ReservePostingKeyInput,
	): Promise<PostingKeyReservation>;
	loadOwnedAccountIds(
		userId: string,
		accountIds: string[],
	): Promise<Set<string>>;
	categoryExists(userId: string, categoryId: string): Promise<boolean>;
	createTransactionEvent(
		input: CreateTransactionEventInput,
	): Promise<CreatedTransactionEvent>;
	fetchTransactionRecord(
		userId: string,
		transactionId: string,
	): Promise<TransactionRecord | null>;
	updateTransactionEvent(
		input: UpdateTransactionEventInput,
	): Promise<CreatedTransactionEvent | null>;
	deleteTransactionEvent(
		userId: string,
		transactionId: string,
	): Promise<boolean>;
	applyBalanceAdjustments(
		userId: string,
		deltas: AccountDelta[],
	): Promise<void>;
	completePostingReservation(
		input: CompletePostingReservationInput,
	): Promise<void>;
};

export type FinancialPostingAdapter = {
	withTransaction<T>(
		callback: (transaction: FinancialPostingAdapterTx) => Promise<T>,
	): Promise<T>;
};
