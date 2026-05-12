# myers32 variants notes

## baseline
Reference implementation based on historical 32-bit Myers loop.
- branch-based score update
- no unsigned normalization on shift

## v1
Change from baseline:
- force unsigned normalization with `>>> 0` after shift/update

## v2
Change from baseline:
- use `ph/mh` explicit form
- branchless top-bit score update

## v3
Change from baseline:
- explicit `ph/mh` formulation
- branch-based score update
- `newMv/newPv` update style

## v4
Change from baseline:
- merged `eqv` formulation
- explicit `nh/ph/mh`
- branchless score update using top-bit boolean subtraction

## generated variants
- unrolledA: codegen-generated variant specialized by fixed `a.length`
- unrolledB: codegen-generated variant specialized by fixed `b.length`

## system comparator
- Lightning-v2: full short-string routing path from bolt build, included to measure real-world dispatcher performance against raw myers32 cores


## future variants
- split `charCodeAt` from `peq` lookup
- merged eqv form
- generated artifact comparisons


---

myers32 findings
unrolledA-v4 is the best current 32-bit specialized Myers implementation

fixing a.length is more valuable than fixing b.length

upgrading codegen A from legacy mutation kernel to v4 kernel produced consistent gains, especially at lengths 4-32

v4 kernel appears more JIT-friendly than the earlier generated kernel

unrolledB remains useful as a comparison but is not the lead strategy
