Customized emails for Staff
Personalized upgrade message for executives

---

## Future: onboarding at scale — email delivers PIN (not verify link)

**Stakeholder feedback (Ayobami):** Don't use email as a verification step after signup. Use email to **send the PIN** to known valid addresses (department roster). Receiving the PIN in that inbox is the proof — same idea as staff PINs bound to `staff_email`, at scale via Resend.

### Today vs proposed

| | Today | Proposed |
|---|--------|----------|
| Email used for | Post-registration verify link | **PIN delivery** to roster email |
| PIN distribution | Manual (copy, WhatsApp, rep) | **Automated email** per student |
| Who can register | Anyone with matric+PIN | Matric+PIN + **email must match** pin record |
| Verify step | Required click | **Removed** — PIN in inbox = verified |
| Scale fit | OK for small cohort | **2000 students** — one controlled send wave |

**Today:** Admin generates PIN → copy to WhatsApp → student registers → verify-email link.
**Proposed:** Import roster (matric+email) → generate PINs → email each student their PIN → register with locked email → `is_email_verified=true` immediately.

Staff onboarding is already half of this (`onboarding_pins.staff_email` + registration email must match). Students only have `matric_number` on the pin today.

### Build list (future phase)

1. **Schema** — `recipient_email` on `onboarding_pins` for students.
2. **Roster import** — Bulk issue: matric + department + level + email (CSV or larger bulk API).
3. **`sendPinEmail`** in `email.service.ts` — matric, PIN, register link, expiry.
4. **Registration** — Email must match pin roster email; set `is_email_verified: true` on success (skip verify link).
5. **Admin UX** — "Send PINs by email" on bulk issue; resend PIN email; audit `pin_emailed`.
6. **Ops** — Resend batching for 2000 sends; handle bounces and roster typos.

### Tradeoffs

- **Pros:** One comms channel; brief first then email PINs; no verify spam-folder step; aligns with staff model.
- **Cons:** PIN in email is sensitive; roster must be accurate; Resend cost/limits at scale.

### When

- Keep current verify flow for CS election.
- Build before full chapter rollout after EC confirms roster source.
