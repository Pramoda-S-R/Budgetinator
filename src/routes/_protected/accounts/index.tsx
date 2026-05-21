import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { calculateNetWorth } from '#/features/accounts/net-worth'

type Account = {
  id: string
  name: string
  accountType: string
  currentBalance: string
  includeInNetWorth: boolean
  isActive: boolean
  createdAt: string
}

type AccountsResponse = {
  accounts: Account[]
  totalNetWorth: string
}

export const Route = createFileRoute('/_protected/accounts/')({
  component: AccountsPage,
})

function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [totalNetWorth, setTotalNetWorth] = useState('0')
  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState('bank')
  const [currentBalance, setCurrentBalance] = useState('0')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadAccounts() {
    setIsBusy(true)
    setError(null)

    const response = await fetch('/api/accounts')
    if (!response.ok) {
      setError('Unable to load accounts')
      setIsBusy(false)
      return
    }

    const data = (await response.json()) as AccountsResponse
    setAccounts(data.accounts)
    setTotalNetWorth(data.totalNetWorth)
    setIsBusy(false)
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const totalNetWorthLabel = useMemo(() => {
    const value = Number(totalNetWorth)
    const fallback = calculateNetWorth(accounts)
    const safeValue = Number.isFinite(value) ? value : fallback

    return safeValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [accounts, totalNetWorth])

  async function onCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name,
        accountType,
        currentBalance: Number(currentBalance),
        includeInNetWorth: true,
        isActive: true,
      }),
    })

    if (!response.ok) {
      setError('Unable to create account')
      return
    }

    setName('')
    setCurrentBalance('0')
    await loadAccounts()
  }

  async function onDeleteAccount(accountId: string) {
    setError(null)
    const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })

    if (!response.ok) {
      setError('Unable to delete account')
      return
    }

    await loadAccounts()
  }

  async function onUpdateBalance(account: Account) {
    const input = window.prompt(`Update balance for ${account.name}`, account.currentBalance)
    if (!input) {
      return
    }

    const value = Number(input)
    if (!Number.isFinite(value)) {
      setError('Balance must be a valid number')
      return
    }

    const response = await fetch(`/api/accounts/${account.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ currentBalance: value }),
    })

    if (!response.ok) {
      setError('Unable to update balance')
      return
    }

    await loadAccounts()
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Total Net Worth</p>
          <p className="text-3xl font-semibold">${totalNetWorthLabel}</p>

          <form onSubmit={onCreateAccount} className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Main Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-type">Type</Label>
              <Input
                id="account-type"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                placeholder="bank"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-balance">Current Balance</Label>
              <Input
                id="account-balance"
                type="number"
                step="0.01"
                value={currentBalance}
                onChange={(event) => setCurrentBalance(event.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Add Account</Button>
            </div>
          </form>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isBusy ? <p className="text-sm text-muted-foreground">Loading accounts...</p> : null}

          {!isBusy && accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet. Add your first account above.</p>
          ) : null}

          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between border p-3">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.accountType} • ${Number(account.currentBalance).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onUpdateBalance(account)}>
                    Edit Balance
                  </Button>
                  <Button variant="destructive" onClick={() => onDeleteAccount(account.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
