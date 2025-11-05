# Edge Functions Quick Reference

Quick reference card for Indigo Yield Platform Edge Functions.

## 🚀 Quick Deploy

```bash
cd supabase/functions
./deploy-all.sh
```

## 📋 Function Endpoints

| Function | Endpoint | Auth | Role |
|----------|----------|------|------|
| generate-report | `/functions/v1/generate-report` | ✅ | All |
| process-deposit | `/functions/v1/process-deposit` | ✅ | All |
| process-withdrawal | `/functions/v1/process-withdrawal` | ✅ | All |
| calculate-performance | `/functions/v1/calculate-performance` | ✅ | All |
| generate-tax-documents | `/functions/v1/generate-tax-documents` | ✅ | All |
| run-compliance-checks | `/functions/v1/run-compliance-checks` | ✅ | Admin |
| process-webhooks/* | `/functions/v1/process-webhooks/{provider}` | Signature | N/A |

## 🔑 Environment Variables

```bash
# Required
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Features
ENABLE_EMAIL_NOTIFICATIONS=true

# Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
PLAID_WEBHOOK_SECRET=...
COINBASE_WEBHOOK_SECRET=...
CIRCLE_WEBHOOK_SECRET=...
```

Set with: `supabase secrets set VAR_NAME=value`

## 📊 Quick Examples

### Generate Report
```bash
curl -X POST "https://PROJECT.supabase.co/functions/v1/generate-report" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reportId":"uuid","reportType":"portfolio_summary","format":"pdf"}'
```

### Process Deposit
```bash
curl -X POST "https://PROJECT.supabase.co/functions/v1/process-deposit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"investorId":"uuid","amount":10000,"currency":"USD","paymentMethod":"crypto"}'
```

### Calculate Performance
```bash
curl -X POST "https://PROJECT.supabase.co/functions/v1/calculate-performance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"investorId":"uuid","includeBenchmarks":true}'
```

## 🔍 Monitoring

```bash
# View logs
supabase functions logs <function-name>

# Tail logs
supabase functions logs <function-name> --tail

# List functions
supabase functions list
```

## ⚠️ Important Limits

| Limit | Value |
|-------|-------|
| Minimum Deposit | $1,000 |
| Daily Withdrawal | $50,000 |
| Monthly Withdrawal | $200,000 |
| Large Withdrawal (Review) | $25,000 |
| Minimum Holding Period | 7 days |
| Report URL Expiry | 7 days |
| Tax Document URL Expiry | 30 days |

## 🛡️ Compliance Checks

| Check | Description | Risk Threshold |
|-------|-------------|----------------|
| KYC | Identity, age, address | Required |
| AML | Transaction patterns | Auto-review > 50 |
| Sanctions | OFAC, UN, EU lists | Auto-block |
| PEP | Politically exposed | Manual review |
| Large TX | > $25,000 | Manual review |

## 📱 Frontend Integration

```typescript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/function-name`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* params */ })
  }
);
```

## 🪝 Webhook URLs

```
Stripe:    /functions/v1/process-webhooks/stripe
Plaid:     /functions/v1/process-webhooks/plaid
Coinbase:  /functions/v1/process-webhooks/coinbase
Circle:    /functions/v1/process-webhooks/circle
DocuSign:  /functions/v1/process-webhooks/docusign
Twilio:    /functions/v1/process-webhooks/twilio
SendGrid:  /functions/v1/process-webhooks/sendgrid
```

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT token |
| 403 Forbidden | Check user role/permissions |
| 429 Too Many Requests | Implement rate limiting |
| 500 Server Error | Check function logs |

## 📚 Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment guide
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API docs
- [README.md](./README.md) - Overview and usage
- [../EDGE_FUNCTIONS_SUMMARY.md](../EDGE_FUNCTIONS_SUMMARY.md) - Project summary

## 🎯 Testing Checklist

- [ ] Link Supabase project
- [ ] Set environment variables
- [ ] Create missing database tables
- [ ] Create storage buckets
- [ ] Deploy all functions
- [ ] Test each function locally
- [ ] Configure webhook endpoints
- [ ] Test in staging
- [ ] Monitor logs for errors
- [ ] Load test critical paths

## 📞 Support

**View Logs**: `supabase functions logs <name>`
**Check Status**: `supabase functions list`
**Documentation**: See `/supabase/functions/*.md`

---

**Version**: 1.0.0 | **Updated**: 2025-01-04
