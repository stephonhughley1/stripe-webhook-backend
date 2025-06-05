const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express app
const app = express();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Use raw body parser for Stripe webhook
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Event type received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const customerId = session.customer;
    const customerEmail = session.customer_details?.email;

    console.log("✅ Checkout completed for customer:", customerEmail, customerId);

    // Try to update existing user
    const { data, error } = await supabase
      .from('users')
      .update({ is_pro: true, stripe_customer_id: customerId })
      .eq('email', customerEmail);

    if (error) {
      console.error('❌ Failed to update Supabase:', error.message);
    } else if (Array.isArray(data) && data.length === 0) {
      console.log('No user found. Inserting new user...');

      const { error: insertError } = await supabase
        .from('users')
        .insert([
          { email: customerEmail, is_pro: true, stripe_customer_id: customerId }
        ]);

      if (insertError) {
        console.error('❌ Failed to insert new user:', insertError.message);
      } else {
        console.log('✅ Inserted new user successfully!');
      }
    } else {
      console.log('✅ Supabase updated successfully for:', customerEmail);
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    console.log("✅ Subscription payment succeeded");
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    const { error } = await supabase
      .from('users')
      .update({ is_pro: false })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('❌ Failed to downgrade user:', error.message);
    } else {
      console.log('✅ User downgraded successfully');
    }
  }

  res.json({ received: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
