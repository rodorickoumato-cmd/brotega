# 🔄 MIGRATION PLAN: Email/Password → Pseudo+PIN

**Duration:** 1 Month (September 14 - October 14, 2026)  
**Strategy:** Dual Authentication with Deadline

---

## 📊 PHASES

### PHASE 1: Dual Authentication (Sep 14 - Oct 13, 2026)

**Duration:** 30 days  
**Status:** Both old (Email/Password) AND new (Pseudo+PIN) work

#### Features:
- ✅ Old users can login with Email/Password
- ✅ New/migrated users can login with Pseudo/PIN
- ✅ Login page shows 2 tabs: "Pseudo+PIN" (new) and "Email (Ancien)"
- ✅ Old login shows warning: "Migration deadline: 14/10/2026"
- ✅ Email campaign: "Migrate to Pseudo+PIN"
- ✅ In-app banner: "Migration recommended"

#### URLs:
```
POST /api/auth/login-dual         # Unified login endpoint
GET  /auth/login-dual              # Login page with 2 tabs
GET  /auth/migrate-now             # Migration wizard
POST /api/auth/migrate-now         # Migration API
GET  /api/admin/migration-stats    # Admin dashboard
```

#### Expected Results:
- Week 1: 10-20% migration rate
- Week 2: 30-40% migration rate
- Week 3: 50-70% migration rate
- Week 4: 80%+ migration rate

#### Monitoring:
```bash
# Check migration progress
curl https://brotega.cm/api/admin/migration-stats \
  -H "Cookie: auth_token=<admin_jwt>"

# Response:
{
  "migration_stats": {
    "migrated": 8500,
    "total": 10000,
    "percentage": 85,
    "days_left": 5,
    "phase": "Phase 1 (Both methods)"
  }
}
```

---

### PHASE 2: Legacy Disabled (Oct 14, 2026 onwards)

**Status:** Email/Password login DISABLED

#### Changes:
- ❌ Old login method stops working
- ✅ Only Pseudo+PIN login available
- ✅ Remaining unmigrated users forced to migrate or recover account

#### URLs:
```
GET  /auth/login                  # Only Pseudo+PIN tab
GET  /auth/recover                # Recovery for locked users
```

#### Process for Non-Migrated Users:
1. Try to login → See message: "This account needs migration"
2. Click "Recover Account"
3. Verify with old email + password
4. Create new Pseudo+PIN
5. Account migrated

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Deploy Migration Infrastructure (Done ✅)

**Files Created:**
- `/api/auth/login-dual` - Unified login endpoint
- `/auth/login-dual` - Login page with 2 tabs
- `/auth/migrate-now` - Migration wizard page
- `/api/auth/migrate-now` - Migration API
- `/api/admin/migration-stats` - Admin tracking

### Step 2: Configure Email Campaign

**Email 1 (Day 1): Announcement**
```
Subject: Migration Update - Your Brotega Account

Hello,

We're improving security! Starting today, you can login with a 
secure Pseudo+PIN instead of Email/Password.

🆕 New login method:
  - Faster (no email verification)
  - More secure (bcrypt hashing)
  - Works offline

Your old login still works until October 14, 2026.

👉 Migrate now: https://brotega.cm/auth/migrate-now

Questions? Reply to this email.

- The Brotega Team
```

**Email 2 (Week 2): Reminder**
```
Subject: ⏰ Migrate to Pseudo+PIN (15 days left)

Hi,

You haven't migrated yet! Here's why you should:

✅ More secure
✅ Faster login
✅ Works offline
✅ Works until Oct 14

Migrate now: https://brotega.cm/auth/migrate-now
```

**Email 3 (Week 4): Final Warning**
```
Subject: 🚨 Last 3 Days - Migrate Your Account

Your account will stop working on October 14 unless you migrate.

Final deadline: October 14, 2026

Migrate now: https://brotega.cm/auth/migrate-now
```

### Step 3: In-App Communication

**Banner (Phase 1):**
```
🔔 Secure your account! Migrate to Pseudo+PIN by October 14.
📌 Learn more → https://brotega.cm/auth/migrate-now
```

**Popup (Week 3):**
- Show on every login for unmigrated users
- "Migrate to Pseudo+PIN" button
- "Later" option (max 3 times)

### Step 4: Transition (Oct 13 → Oct 14)

**Actions:**
1. Send final warning email
2. Schedule Phase 2 activation (Oct 14 00:00 UTC)
3. Disable old login method
4. Show recovery option for unmigrated users
5. Monitor support tickets

---

## 📈 TRACKING & MONITORING

### Admin Dashboard

Access: `GET /api/admin/migration-stats`

Metrics tracked:
- Total users migrated
- Migration percentage
- Days left
- Recent migrations (last 10)
- Current phase

### Audit Logs

All migrations tracked in `audit_logs` table:
```sql
SELECT user_id, timestamp, details 
FROM audit_logs 
WHERE action = 'user_migration' 
ORDER BY timestamp DESC;
```

### Expected Metrics

| Day | Expected % | Status |
|-----|-----------|--------|
| Day 1 | 5% | Initial wave |
| Day 7 | 25% | Early adopters |
| Day 14 | 50% | Majority |
| Day 21 | 75% | Late majority |
| Day 28 | 90%+ | Ready for Phase 2 |

---

## 🚨 CONTINGENCY PLANS

### Issue: Low Migration Rate (<50% by Day 21)

**Actions:**
1. Increase email frequency (daily)
2. Add push notifications
3. Incentive: "Migrated users get 2x points"
4. Extend deadline by 1 week (if needed)

### Issue: High Support Tickets

**Automated Responses:**
```
Q: "I forgot how to migrate?"
A: Visit https://brotega.cm/auth/migrate-now

Q: "I can't create a Pseudo?"
A: Pseudo must be 3-50 chars, letters/numbers only

Q: "I forgot my old password?"
A: Use recovery at https://brotega.cm/auth/recover
```

### Issue: Users Locked Out After Oct 14

**Recovery Flow:**
```
1. Click "Recover Account"
2. Verify old email + password
3. Create new Pseudo+PIN
4. Auto-migrated + logged in
```

---

## 📋 CHECKLIST

### Before Phase 1 (Sep 14)
- [ ] Deploy all migration code
- [ ] Test login-dual endpoint
- [ ] Test migrate-now flow
- [ ] Test admin stats dashboard
- [ ] Configure email templates
- [ ] Update privacy policy (if needed)
- [ ] Prepare support docs

### During Phase 1 (Sep 14 - Oct 13)
- [ ] Send email campaigns (Day 1, 15, 25)
- [ ] Show in-app banners
- [ ] Monitor migration percentage daily
- [ ] Respond to support tickets
- [ ] Track audit logs

### Before Phase 2 (Oct 13)
- [ ] Send final warning email
- [ ] Verify 90%+ migration rate
- [ ] Backup Supabase Auth data
- [ ] Test Phase 2 flow
- [ ] Schedule Phase 2 deployment

### During Phase 2 (Oct 14+)
- [ ] Disable old login method
- [ ] Monitor support tickets
- [ ] Handle non-migrated users
- [ ] Track recovery flows

---

## 🎓 USER GUIDE

### For Users Migrating

**Step 1:** Go to https://brotega.cm/auth/migrate-now

**Step 2:** Click "Commencer la migration"

**Step 3:** Enter:
- Nouveau Pseudo (3-50 chars, letters/numbers only)
- PIN (4-6 digits - remember this!)
- Recovery method (Email, Phrase, or Code)

**Step 4:** Confirm and you're done!

**Next login:** Use your new Pseudo + PIN at https://brotega.cm/auth/login-dual

### For Users Who Forgot

1. Go to https://brotega.cm/auth/recover
2. Select recovery method
3. Verify identity
4. Create new PIN
5. Login with new Pseudo+PIN

---

## 📞 SUPPORT

### Common Questions

**Q: Why am I changing authentication?**
A: The new Pseudo+PIN system is more secure, faster, and works offline.

**Q: Will my old password still work?**
A: Yes, until October 14. After that, use Pseudo+PIN.

**Q: Can I use my email and password after Oct 14?**
A: No, but you can recover your account at https://brotega.cm/auth/recover

**Q: What if I forget my PIN?**
A: Use recovery method (email, phrase, or code) to reset it.

---

## ✅ SUCCESS CRITERIA

- ✅ 90%+ users migrated by Oct 13
- ✅ Phase 1 launches without errors
- ✅ Phase 2 activation smooth
- ✅ <5% support tickets related to migration
- ✅ Zero data loss
- ✅ <1% locked-out users

---

**Owner:** Engineering Team  
**Status:** Ready to Deploy  
**Estimated Effort:** 30 days  
**Risk Level:** Low (dual auth reduces risk)
