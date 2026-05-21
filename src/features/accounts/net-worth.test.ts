import { describe, expect, it } from 'vitest'

import { calculateNetWorth } from './net-worth'

describe('calculateNetWorth', () => {
  it('sums only active accounts included in net worth', () => {
    const result = calculateNetWorth([
      { currentBalance: '1200.50', includeInNetWorth: true, isActive: true },
      { currentBalance: '300.25', includeInNetWorth: false, isActive: true },
      { currentBalance: '100', includeInNetWorth: true, isActive: false },
      { currentBalance: '-50', includeInNetWorth: true, isActive: true },
    ])

    expect(result).toBe(1150.5)
  })
})
