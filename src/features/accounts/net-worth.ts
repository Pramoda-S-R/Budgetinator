type NetWorthAccount = {
  currentBalance: string | number
  includeInNetWorth: boolean
  isActive: boolean
}

export function calculateNetWorth(accounts: NetWorthAccount[]) {
  return accounts.reduce((total, account) => {
    if (!account.isActive || !account.includeInNetWorth) {
      return total
    }

    const balance = typeof account.currentBalance === 'number'
      ? account.currentBalance
      : Number(account.currentBalance)

    if (!Number.isFinite(balance)) {
      return total
    }

    return total + balance
  }, 0)
}
