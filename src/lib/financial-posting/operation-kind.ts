export const operationKinds = [
	"transaction.create",
	"transaction.update",
	"transaction.delete",
	"loan.payment.create",
	"loan.payment.delete",
	"emi.payment.create",
	"emi.payment.delete",
	"investment.entry.create",
	"investment.entry.delete",
	"credit_card.payment.create",
	"credit_card.payment.delete",
] as const;

export type OperationKind = (typeof operationKinds)[number];

export const TRANSACTION_CREATE_OPERATION_KIND: OperationKind =
	"transaction.create";
export const TRANSACTION_UPDATE_OPERATION_KIND: OperationKind =
	"transaction.update";
export const TRANSACTION_DELETE_OPERATION_KIND: OperationKind =
	"transaction.delete";
