# Public Showcase Strategy

## Goal

Show the project clearly to employers, founders, and technical reviewers **without** pretending that a public source repository can also prevent code copying.

## Hard truth

If the current repository stays public, the source code remains downloadable.

That means:

- `README` can improve framing
- a closed-use `LICENSE` can improve legal clarity
- trust files can improve professionalism

But none of those steps can technically prevent someone from cloning the code while the repository remains public.

## Recommended operating model

### 1. Private source repository

Keep the full runnable implementation private.

This repo should contain:

- production code
- prompts
- workflows
- internal docs
- deployment details
- sensitive implementation paths

### 2. Public showcase repository

Publish a separate public repository focused on review, not reuse.

This repo should contain:

- portfolio-grade README
- screenshots or short GIFs
- architecture diagram
- live demo links
- selected sanitized snippets
- stack and release proof
- closed-use license

It should **not** contain:

- full runnable source
- full env contract
- operational secrets
- complete agent implementation
- reusable deployment contour

## What the public showcase should optimize for

1. What the product does
2. Why it is technically interesting
3. What is proven in production
4. Which engineering decisions matter
5. How to contact the maintainer

## Suggested public showcase sections

- hero
- live demo
- what Miro does
- why it is different from generic AI news bots
- architecture overview
- production proof
- selected engineering deep dives
- screenshots
- stack
- maintainer
- closed-use license

## Current repository status

The current repository can already act as a stronger public surface than before because it now has:

- English-first README
- Russian sibling README
- explicit closed-use license
- support/security/contribution policy
- issue intake guardrails

But for real source protection, the next required action is still:

- make the current source repository private
- create a separate public showcase repository
