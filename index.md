# Leverage Backtester Book

This is the draft executable book for the leveraged XAW DCA simulator.

Chapters:

- [What This Simulator Tests](book/chapters/01-what-this-simulator-tests.html)
- [How To Read The Interface](book/chapters/02-how-to-read-the-interface.html)
- [The Synthetic XAW Proxy](book/chapters/03-synthetic-xaw-proxy.html)
- [Price, Distributions, and Total Return](book/chapters/04-price-distributions-total-return.html)
- [Prime, Margin, and HELOC Interest](book/chapters/05-prime-and-margin-rates.html)
- [The Monthly Step](book/chapters/06-monthly-step.html)
- [Contributions and Investment Target](book/chapters/07-contributions-and-investment-target.html)
- [Board Lots and Cash Balance](book/chapters/08-board-lots-and-cash-balance.html)
- [Debt, Equity, and Margin Leverage](book/chapters/09-debt-equity-and-margin-leverage.html)
- [Interest Handling](book/chapters/10-interest-handling.html)
- [HELOC Cap Enforcement](book/chapters/11-heloc-cap-enforcement.html)
- [Tax Deduction Column](book/chapters/12-tax-deduction-column.html)
- [Drawdown to Margin Call](book/chapters/13-drawdown-to-margin-call.html)
- [The Portfolio Path Chart](book/chapters/14-portfolio-path-chart.html)
- [The Checkpoint Table](book/chapters/15-checkpoint-table.html)
- [Outcome Histograms](book/chapters/16-outcome-histograms.html)
- [Reading Bad Outcomes](book/chapters/17-reading-bad-outcomes.html)

The book uses LiTScript: prose expands production TypeScript regions, the
interactive calculator imports production simulator code, and chapter fixtures
are covered by Vitest.
