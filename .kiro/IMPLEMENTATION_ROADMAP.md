# Arcane Platform: Complete Implementation Roadmap

This document outlines the full implementation strategy for transforming Arcane into a **locally supported, low-bandwidth skills-to-work system**. All items from the Technical and Functional Improvement Roadmap are organized by priority and execution sequence.

---

## Implementation Phases

### ✅ Phase 0: Complete (M1–M4)

These are already implemented or nearly complete:
- Foundation (Supabase, auth, catalog, video player)
- M2: Social/engagement (Q&A, reviews, notifications)
- M3: Commerce (M-Pesa payments, orders, payouts)
- M4: Trust & polish (wishlist, certificates, profiles, SEO, moderation)

**Action**: No changes needed. Move to Phase 1.

---

### 🔄 Phase 1: NOW (Instructor Onboarding & Competency Framework)

**Priority**: P0/P1 — Funding-critical + competitive advantage

**Status**: 
- Instructor Onboarding: Partially complete (database + some UI)
- Competency Framework: Design doc + tasks created

**Specs to Execute**:
1. `.kiro/specs/instructor-onboarding-and-screening/tasks.md` — Tasks 5–11 (UI, routes, tests)
2. `.kiro/specs/competency-framework-and-mastery/tasks.md` — All tasks (Phase 1–9)

**Timeline**: 6–8 weeks
**Team capacity**: 2 senior engineers (one per spec, running in parallel)

**Deliverables**:
- ✅ Instructor screening workflow with application review queue (admin console)
- ✅ Competency definitions linked to course sections
- ✅ Diagnostic assessments for prerequisite testing
- ✅ Mastery learning workflow (attempt → remediate → retry)
- ✅ Project submission & rubric-based grading
- ✅ Competency badges with verification pages
- ✅ Instructor analytics dashboard
- ✅ Tests (PBT + unit + integration)

---

### 🎯 Phase 2: ACCESS & CONNECTIVITY (Offline Support)

**Priority**: P0 — Fundable differentiator

**Spec**: *To be created* — `.kiro/specs/offline-and-low-bandwidth/`

**Target**: 4–6 weeks

**Requirements Summary** (from roadmap Section 1):
- Progressive Web App (PWA) with offline lesson download
- Low-data mode (audio-only, compressed images, quality selector)
- Shared-device mode (PIN access, fast switching, auto-logout)
- Queued sync on reconnect, resumable uploads
- Data-usage indicators and budget controls

**Outcomes**:
- Learners can download 5-lesson module, complete offline, sync on reconnect
- Data consumption < 50MB per completed course (target)
- Shared tablet workflows supported safely
- Funder reporting: completion rates by connectivity condition

---

### 🤝 Phase 3: FACILITATOR CONSOLE & HUMAN SUPPORT (Operations)

**Priority**: P0/P1 — Enables community deployment

**Spec**: *To be created* — `.kiro/specs/facilitator-console-and-support-triage/`

**Target**: 4–6 weeks

**Requirements Summary** (from roadmap Sections 5):
- Facilitator dashboard: learner roster, enrollment status, activity, support-risk queue
- Support triage: AI + analytics identify at-risk learners → facilitator inbox
- Contact log: log interventions, barriers, outcomes
- Peer learning circles: assign learners to groups, discussion prompts
- Safeguarding: report concerns, case records, referral directory
- Bulk messaging: SMS/WhatsApp templates for cohort communication

**Outcomes**:
- Facilitators can monitor 100+ learners from a single dashboard
- At-risk learners identified and contacted within 24 hours
- Safeguarding workflow in place for minors (16–24)
- Bulk messaging reduces operational overhead

---

### 🏅 Phase 4: PRACTICAL EVIDENCE & PORTFOLIOS (Work Readiness)

**Priority**: P0/P1 — Employers validate skills

**Spec**: *To be created* — `.kiro/specs/employer-review-and-portfolio-export/`

**Target**: 3–4 weeks

**Requirements Summary** (from roadmap Sections 6):
- Portable learner profile: export skills, badges, projects
- Employer portal: review portfolios (anonymized), provide feedback
- Project evidence: version history, rubric feedback, share permissions
- Badge types: participation | completion | competency | employer-reviewed
- Verification: public badge verification, LinkedIn/WhatsApp shares

**Outcomes**:
- Learners have portfolio evidence to share with employers
- Employers can review anonymized cohort portfolios
- Learner profiles shareable on LinkedIn, WhatsApp, email
- Work-transition tracking: applications, interviews, placements

---

### 📊 Phase 5: ANALYTICS & LEARNING MEASUREMENT (Evaluation)

**Priority**: P0/P1 — Funding reporting

**Spec**: *To be created* — `.kiro/specs/learning-analytics-and-measurement/`

**Target**: 3–4 weeks

**Requirements Summary** (from roadmap Section 7):
- Baseline + post-course skills measurement (diagnostic → final assessment)
- Learning gain reporting (not just completion %)
- Disaggregated analytics: gender, age, device, connectivity, hub vs. home
- Device/connectivity telemetry: load time, failed requests, sync failures
- Funder dashboard: reach, learning gain, cost per learner, work-transition evidence

**Outcomes**:
- Funder can see learning gain by subgroup (e.g., girls on low-bandwidth devices)
- Platform reports on actual data consumption per module
- Baseline → post-course improvement measured and reported
- Work-transition: jobs, placements, businesses tracked separately

---

### 🔐 Phase 6: RESPONSIBLE AI & QUALITY GOVERNANCE (Trust)

**Priority**: P0 — Compliance + funder requirement

**Spec**: *To be created* — `.kiro/specs/responsible-ai-and-content-governance/`

**Target**: 2–3 weeks

**Requirements Summary** (from roadmap Section 4):
- AI transparency notice: where AI is used, what it can't do, how to appeal
- Source-grounded tutor: show course section used to answer
- AI assessment governance: questions drafted by AI, approved by instructor, bias checklist
- AI grading safeguards: confidence scores, human review for low-confidence, learner appeal
- Course quality system: completeness, coverage, broken links, learner difficulty reports

**Outcomes**:
- Funder compliance: responsible AI practices documented
- Learners understand AI limitations; can escalate to humans
- Quality issues surfaced and fixed quickly
- Grading decisions are transparent, appealable

---

### 🚀 Phase 7: RELIABILITY, SCALE & OPS (Platform Hardening)

**Priority**: P0/P1 — Platform resilience

**Spec**: *To be created* — `.kiro/specs/platform-reliability-and-operations/`

**Target**: 2–3 weeks

**Requirements Summary** (from roadmap Sections 8, 10):
- Data minimization & retention policies: document what's kept, how long, who sees it
- Role-based access: facilitator, instructor, evaluator, admin permissions
- Audit logs: grading changes, certificate changes, safeguarding access
- Service health dashboard: auth failures, AI queue status, sync failures
- Incident response: documented procedures, manual backup workflows
- Cost controls: AI usage tracking, storage cleanup, usage alerts

**Outcomes**:
- Audit trail for compliance
- Platform uptime SLA tracked and reported
- Manual workarounds exist if primary systems fail
- Budget predictable; cost per learner known

---

### 🤖 Phase 8: CONTENT OPERATIONS & INSTRUCTOR TOOLS (Scaling)

**Priority**: P1/P2 — Content quality at scale

**Spec**: *To be created* — `.kiro/specs/content-operations-and-templates/`

**Target**: 2–3 weeks

**Requirements Summary** (from roadmap Section 9):
- Course authoring lifecycle: draft → AI processing → instructor review → pilot → feedback → revision → publish
- Content licensing & provenance: record source, license, creator, date, allowed use, attribution
- Assessment templates: learning objectives, competency mapping, diagnostic, rubric templates
- Accessibility checklist: keyboard nav, captions, alt text, color contrast
- Language adaptation: templates for translation, Kiswahili glossary structure

**Outcomes**:
- Instructors have reusable templates for course creation
- Content quality consistent across courses
- Licensing tracked for compliance (esp. if white-label)
- Faster time-to-publish for new courses

---

### 🌍 Phase 9: PARTNERSHIPS & INTEROPERABILITY (Ecosystem)

**Priority**: P1/P2 — Partnerships with employers, NGOs

**Spec**: *To be created* — `.kiro/specs/partnerships-and-integrations/`

**Target**: 2–3 weeks

**Requirements Summary** (from roadmap Section 11):
- Partner organization dashboard: manage referrals, device loans, facilitator assignments
- Employer portal: review competency definitions, submit job briefs, request candidates (with consent)
- Referral workflows: link to Ajira, Generation, county programs, NGOs
- Interoperable exports: JSON/CSV exports for partner systems, documented schemas
- Data separation: one org can't see another's learners

**Outcomes**:
- Partner organizations can self-serve referrals and cohort setup
- Employers source candidates directly from Arcane
- Arcane can integrate with external talent platforms (non-exclusive)
- Portable learner data enables interoperability

---

### 📱 Phase 10: MOBILE & ACCESSIBILITY (Inclusion)

**Priority**: P0/P1 — Equity

**Spec**: *To be created* — `.kiro/specs/accessibility-and-mobile-optimization/`

**Target**: 2–3 weeks

**Requirements Summary** (from roadmap Sections 2):
- Phone-first onboarding: OTP login option (email fallback)
- Bilingual support: Kiswahili translation plan, audio explanations, glossary
- Accessibility audit: keyboard nav, screen reader, WCAG 2.1 AA conformance
- Mobile optimization: font sizing, touch targets, one-hand operation
- Disability support: accessibility preference at signup, alternative formats

**Outcomes**:
- Learners with limited data can use OTP (vs. email)
- Kiswahili learners see glossary + audio explanations
- Learners with visual impairments can use screen readers
- Platform works on low-end phones (e.g., Tecno Spark 3, Samsung J2)

---

## Execution Strategy

### High-Level Timeline

```
Month 1-2:     Phase 1 (Instructor onboarding + Competency framework) — PARALLEL with ALL other P0
Month 1:       Phase 2 (Offline support) — START design
Month 2:       Phase 2 execution begins; Phase 3 (Facilitator console) design
Month 3:       Phase 2 complete; Phase 3 execution; Phase 4 design
Month 4:       Phase 3 complete; Phase 4 execution; Phase 5 design
Month 4-5:     Phase 5, 6, 7 execution (can run in parallel)
Month 6:       Phase 8, 9, 10 execution (lower priority, can be staggered)
```

### Resource Allocation

**Assuming 3–4 senior engineers:**

- **Engineer A**: Phase 1 (Competency framework) → Phase 2 (Offline support)
- **Engineer B**: Phase 1 (Instructor onboarding) → Phase 3 (Facilitator console)
- **Engineer C**: Phase 4 → Phase 5 → Phase 6 (can context-switch weekly)
- **Engineer D** (if available): Phase 7 ops work + Phase 8/9/10 (parallelizable)

### Spec Creation Priority

**Recommended order for spec creation** (if delegating to subagents):

1. ✅ Instructor Onboarding (done)
2. ✅ Competency Framework (done)
3. Offline & Low-Bandwidth Support
4. Facilitator Console & Support Triage
5. Employer Review & Portfolio Export
6. Learning Analytics & Measurement
7. Responsible AI & Content Governance
8. Platform Reliability & Operations
9. Content Operations & Templates
10. Partnerships & Integrations
11. Accessibility & Mobile Optimization

---

## Key Success Metrics

### By Phase

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Instructor applications processed | 100% of applicants reviewed within 7 days |
| 1 | Competencies defined per course | ≥ 1 competency, ≥ 2 assessments per course |
| 2 | Data per module download | < 50 MB median |
| 2 | Offline completion rate | ≥ 80% (vs. online) |
| 3 | At-risk learner identification | 95% of at-risk identified within first week |
| 3 | Facilitator cohort size | 1 facilitator per 50–100 learners |
| 4 | Portfolio shares | 70%+ of completers share skills profile |
| 5 | Learning gain measurement | Pre/post score diff, ≥ 30% gain avg |
| 6 | AI answer accuracy (sampled) | 90%+ of answers rated helpful or correct |
| 7 | Platform uptime | 99.5% SLA |
| 8 | Time-to-publish (new course) | ≤ 10 business days |
| 9 | Partner referrals | ≥ 5 partner organizations active |
| 10 | Accessibility score (WCAG) | ≥ AA conformance (manual audit) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Scope creep (trying to do all at once) | Strict phase sequencing; feature flags for beta features |
| Database performance (many new tables) | Indexes, denormalization where needed, query optimization early |
| AI cost explosion | Cost controls implemented in Phase 6; usage tracking from start |
| Facilitator fatigue (support triage) | Automate triage rules; start with small pilot (20–30 learners/facilitator) |
| Privacy/safeguarding compliance | Legal review of safeguarding workflows before Phase 3 launch |
| Offline sync edge cases | Extensive testing in Phase 2; conflict resolution rules documented |
| Employer engagement low | Start with 2–3 committed employers in Phase 4; co-design portal with them |

---

## Staffing & Training

### Required Expertise

- **Backend Engineer**: Supabase, PostgreSQL, RLS, server functions, real-time
- **Frontend Engineer**: React, TanStack Start, form handling, offline-first patterns
- **DevOps/Infra**: Monitoring, cost controls, incident response, PWA deployment
- **QA/Testing**: Property-based testing, integration testing, accessibility audits
- **Product/Compliance**: Data privacy, safeguarding, funder reporting
- **Instructor/Domain Expert**: Pedagogy input on competency definitions, assessment design

### Team Onboarding

1. Read this roadmap + the technical-functional roadmap (background)
2. Review README.md (current architecture)
3. Review `.kiro/specs/` for detailed requirements per feature
4. Pair on Phase 1 implementation to align on patterns
5. Autonomous execution of assigned phases

---

## Monitoring & Iteration

### Weekly Sync

- Phase status updates (blockers, PRs, testing)
- Spec refinement (if requirements unclear)
- Budget/timeline tracking
- Risk escalation

### Monthly Milestones

- Phase completion review
- User feedback on deployed features (if pilot cohort exists)
- Funder checkpoint (if applicable)
- Next phase kickoff

### Post-Pilot (after Phase 2–3)

- Measure actual KPIs from pilot cohort
- Refine estimates for Phases 4+
- Adjust timeline/scope if needed
- Plan post-pilot scale-up

---

## Conclusion

This roadmap transforms Arcane from a basic e-learning platform into a **trusted, locally operated, low-bandwidth skills-to-work system**. By following the phased approach and maintaining discipline on scope, the team can deliver measurable funder value by Month 3–4.

**Next step**: Confirm resource allocation and begin Phase 1 implementation (instructor onboarding + competency framework tasks).

