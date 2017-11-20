module.exports = {
  "free": {
    "hits": 1000,
    "concurrency": 2,
    "cost": "$0.00"
  },
  "premium": {
    "hits": 10000,
    "concurrency": 4,
    "stripe_label": 'BASIC_HOSTING_PLAN_10',
    "cost": "$10.00"
  },
  "advanced": {
    "hits": 50000,
    "concurrency": 16,
    "stripe_label": 'BASIC_HOSTING_PLAN_25',
    "cost": "$25.00"
  },
  "pro": {
    "hits": 100000,
    "concurrency": 8,
    "stripe_label": 'BASIC_HOSTING_PLAN_50',
    "cost": "$50.00"
  },
  "business": {
    "hits": 1000000,
    "concurrency": 32,
    "stripe_label": 'BASIC_HOSTING_PLAN_200',
    "cost": "$200.00"
  }
};