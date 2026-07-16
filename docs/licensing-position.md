# Licensing Position

This repository makes its source publicly available under the terms in [`LICENSE`](../LICENSE) and [`ADDITIONAL_TERMS.md`](../ADDITIONAL_TERMS.md). Package metadata therefore uses npm's custom-license form, `SEE LICENSE IN LICENSE`, rather than an SPDX identifier for unmodified AGPL-3.0.

## Public Classification

The project is described as **source-available**, not as OSI-approved open source. The additional terms condition commercial and AI-training uses. The [Open Source Definition](https://opensource.org/osd) requires no discrimination against fields of endeavor, and the OSI's [license rejection guidance](https://opensource.org/licenses/common-reasons-for-rejection-of-licenses) identifies non-commercial restrictions as incompatible with that requirement.

This terminology distinguishes public source access from OSI license approval; it does not change the grants or restrictions stated in the legal files.

## AGPL Additional-Terms Caveat

The rider states that it supplements AGPL-3.0 under Section 7 to the maximum extent permitted. The [GNU AGPL-3.0 text](https://www.gnu.org/licenses/agpl-3.0.html) enumerates allowed non-permissive additional terms and separately addresses other further restrictions. This repository does not claim that the custom rider has been reviewed or approved by the FSF, OSI, or a court.

Maintainers should obtain qualified legal review before relying on the rider's enforceability, changing the licensing model, or describing the package as open source. This document is project-positioning guidance, not legal advice; the legal files control.

## Distribution Checklist

- Keep `LICENSE` and `ADDITIONAL_TERMS.md` together in GitHub and npm distributions.
- Keep `package.json#license` set to `SEE LICENSE IN LICENSE` while custom terms apply.
- Describe the package as source-available in badges, README text, registry metadata, and announcements.
- Do not substitute the SPDX expression `AGPL-3.0-only`; it would omit the separately asserted terms.
