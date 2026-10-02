# Architecture Decision Records

An ADR captures one significant, hard-to-reverse decision, its context, and the alternatives we rejected. Create one with the `/adr` skill, or copy [0000-template.md](0000-template.md).

Rules:
- Number sequentially. Never renumber or delete an ADR. To reverse one, write a new ADR and mark the old one `Superseded by ADR-XXXX`.
- Write an ADR when you choose or replace a framework, library or provider, change a data-model pattern, or trade off a PRD target.
- Add a row to the table below in the same PR.

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-core-stack.md) | Core stack: Next.js on Vercel with MongoDB Atlas | Accepted | 2026-10-02 |
| [0002](0002-auth-better-auth.md) | Authentication with Better Auth | Accepted | 2026-10-02 |
| [0003](0003-video-mux.md) | Mux for video upload, processing and playback | Accepted | 2026-10-02 |
| [0004](0004-burst-preview-engine.md) | Client-side burst preview with preloaded MP4 clips | Accepted | 2026-10-02 |
