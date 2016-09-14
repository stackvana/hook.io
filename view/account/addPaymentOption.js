module['exports'] = function addPaymentOption (opts, cb) {
  // not a view

  return '\
    <form action="/billing" method="POST"> \
      <input type="hidden" value="true" name="addCustomer"/> \
      <script \
        src="https://checkout.stripe.com/checkout.js" class="stripe-button" \
        data-key="" \
        data-image="https://hook.io/img/pipe.gif" \
        data-name="hook.io hosting" \
        data-description="1 Month Basic Hosting ($5.00)" \
        data-amount="500" \
        data-currency="usd" \
        data-bitcoin="true"> \
      </script> \
    </form> \
  ';
  
  /*
    var $ = this.$;
    cb(null, $.html());
  */
};