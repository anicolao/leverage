# What This Simulator Tests

This simulator tests one leveraged dollar-cost averaging strategy against
historical market and rate data.

The strategy is:

1. Use HELOC debt to fund a monthly investment.
2. Buy the synthetic XAW proxy.
3. Set broker margin debt so margin debt is a target percentage of brokerage
   assets.
4. Accrue HELOC interest at Canadian prime.
5. Accrue margin interest at prime less 95 basis points.
6. Apply distributions to HELOC interest before selling shares for any
   remaining HELOC interest.
7. Enforce the maximum HELOC debt by selling shares when needed.
8. Record monthly checkpoints and compare fixed-horizon outcomes across sampled
   historical start dates.

It is a backtest and educational simulator, not investment or tax advice. It
can describe how the implemented mechanics behaved on available historical
data. It cannot predict future returns, borrowing rates, tax treatment, lender
policy, liquidity, spreads, or investor behavior.

## Core Terms

HELOC debt is debt outside the brokerage account. The simulator uses it to fund
monthly contributions and, depending on policy, capitalized margin interest.

Margin debt is broker debt inside the investment account. The leverage target
is `marginDebt / shareValue`; HELOC debt is not part of that target.

Brokerage assets are the current share value plus tracked cash. Total debt is
margin debt plus HELOC debt. Equity is `totalAssets - totalDebt`.

Distributions are cash paid by the proxy holdings. They are tracked separately
from price movement, applied to HELOC interest first, and included in the tax
deduction tracking column as an offset against interest.

Capitalized interest is margin interest that is added to HELOC debt instead of
being paid by selling shares.

Cash balance is tracked so board-lot rounding and leftover distribution cash
remain visible in the monthly checkpoint rows.

## Default Scenario

The app's initial control values are production constants:

<<r:default-dca-scenario-parameters>>

Operationally, those defaults mean the first available synthetic proxy trading
date is used as the start date, the simulator borrows up to `$500,000` of HELOC
contributions in `$100,000` monthly steps, targets `20%` margin debt relative
to brokerage share value, allows at most `$1,000,000` of HELOC debt, and
capitalizes margin interest in every monthly checkpoint.

The table interval default is monthly. Changing the table interval changes only
presentation of checkpoint rows, not the investment cadence. The default
outcome horizon is 10 years.

## What The First Chapter Validates

`book/examples/default-scenario.ts` imports the same default constants as the
Svelte app. `book/examples/examples.test.ts` verifies that the book's default
scenario fixture still produces:

- `$500,000` investment target
- `$100,000` monthly investment
- `$1,000,000` maximum HELOC debt
- `20%` margin leverage target
- `always` margin-interest capitalization

That validation does not prove the strategy is good. It only proves that this
chapter is describing the same default parameter surface that the app starts
with.
