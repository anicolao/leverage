---
{
  "modules": ["./book/components/BookExamples"]
}
---

# What This Simulator Tests

This simulator tests a leveraged dollar-cost averaging strategy. Dollar-cost
averaging means investing on a repeated schedule instead of trying to choose one
perfect entry date. Leveraged means some of the invested money is borrowed.

The strategy uses two borrowing sources. A Home Equity Line of Credit, or
HELOC, is a loan secured by home equity and controlled outside the brokerage
account. A margin loan is money borrowed from the brokerage inside the
investment account.

## The Risk Question

The strategy tries to buy global equities over time while using borrowed money
to increase exposure. That can improve outcomes when investment returns exceed
borrowing costs, but it can also magnify losses when markets fall or interest
rates rise.

The simulator exists because the important question is not only "what is the
average return?" The important question is "what happens to debt, equity,
interest, forced sales, and margin-call risk during bad historical windows?"

A margin call is a brokerage demand created when the account's equity is too
small relative to the broker loan. It matters because the brokerage may sell
shares when prices are already low. That is the opposite of the intended
behavior of holding or buying through a downturn.

## Simulation Path

The app models the strategy month by month:

1. Draw HELOC debt for the monthly contribution.
2. Buy the synthetic XAW proxy, which stands in for global equities.
3. Adjust broker margin debt toward the selected leverage target.
4. Accrue HELOC interest at Canadian prime.
5. Accrue margin interest at prime less 95 basis points.
6. Use distributions to pay HELOC interest before selling shares.
7. Enforce the maximum HELOC debt by selling shares when needed.
8. Record checkpoints and compare fixed-horizon outcomes across historical
   start dates.

It is a backtest and educational simulator, not investment or tax advice. A
backtest replays a rule against historical data. It cannot predict future
returns, lending policy, tax treatment, liquidity, or investor behavior.

## Default Scenario

The default scenario is the initial set of app controls. Those defaults live in
`src/lib/backtest/defaultScenario.ts` so the app, tests, and book describe the
same scenario instead of drifting apart.

<<r:default-dca-scenario-parameters>>

<default-scenario-demo></default-scenario-demo>

Operationally, those defaults mean the simulator tries to invest up to
`$500,000` in `$100,000` monthly HELOC-funded steps, targets `20%` broker margin
leverage, allows up to `$1,000,000` of HELOC debt, and capitalizes margin
interest in every monthly checkpoint.

## Core Terms

Equity means what remains after debt is subtracted from assets. The simulator
computes it as `totalAssets - totalDebt` because debt holders have a claim on
the assets before the investor does.

Total debt means margin debt plus HELOC debt. The distinction matters because
margin debt can trigger broker liquidation, while HELOC debt affects household
borrowing capacity and total solvency.

Distributions are cash paid by the holdings. They matter because cash can pay
interest without selling shares, which helps avoid selling during a downturn.

Cash balance is tracked because board-lot rounding and leftover distribution
cash change the account state even when they are small.

## Validation Artifact

`book/examples/default-scenario.ts` imports the production default constants.
`book/examples/examples.test.ts` verifies that the book's default fixture still
matches the app's default parameter surface.
