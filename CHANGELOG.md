# Changelog

## Unreleased

### Fixed

- Separated expense month-over-month change from net cash-flow change on Home.
- Limited the current Planning summary to recurring payments due today or later and clarified past/current/future labels.
- Made custom report ranges valid by construction and based category trend buckets on actual duration.
- Prevented Spending Pace from ending before its custom start date when the current month is included.
- Replaced the mismatched cash-flow goal with a current-versus-previous net comparison.
- Preserved immutable budget updates and initialized date inputs from the local calendar day.
- Corrected month-status copy for past, current, and future Home views.
- Defined Net Worth as account opening balances plus ledger net, with migration from legacy account `balance` data.
- Kept the selected comparison category valid when the available category set changes.
