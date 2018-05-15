module.exports = {
  "free": {
    "hits": 1000,
    "concurrency": 2,
    "apiKeys": 1,
    "cost": "$0.00",
    "disabled": true // placeholder boolean to indicate we are no longer supporting free accounts
  },
  "trial": {
    "hits": 1000,
    "concurrency": 2,
    "apiKeys": 1,
    "cost": "$0.00",
    "daysInTrial": 60 
  },
  "basic": {
    "hits": 1000,
    "concurrency": 2,
    "apiKeys": 1,
    "cost": "$2.00",
    "stripe_label": 'BASIC_HOSTING_PLAN_2',
  },
  "premium": {
    "hits": 10000,
    "concurrency": 4,
    "apiKeys": 5,
    "stripe_label": 'BASIC_HOSTING_PLAN_10',
    "cost": "$10.00"
  },
  "advanced": {
    "hits": 50000,
    "concurrency": 16,
    "apiKeys": 10,
    "stripe_label": 'BASIC_HOSTING_PLAN_25',
    "cost": "$25.00"
  },
  "pro": {
    "hits": 100000,
    "concurrency": 8,
    "apiKeys": 20,
    "stripe_label": 'BASIC_HOSTING_PLAN_50',
    "cost": "$50.00"
  },
  "business": {
    "hits": 1000000,
    "concurrency": 32,
    "apiKeys": 50,
    "stripe_label": 'BASIC_HOSTING_PLAN_200',
    "cost": "$200.00"
  }
};