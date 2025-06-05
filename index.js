import express from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load your env variables
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

// Use raw body parser for Stripe webhook ONLY
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
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

  // ✅ Webhook successfully verified
  console.log('✅ Event type received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('✅ Checkout session completed:', session);
  }

  if (event.type === 'invoice.payment_succeeded') {
    console.log('✅ Payment succeeded:', event.data.object);
  }

  if (event.type === 'customer.subscription.deleted') {
    console.log('❌ Subscription cancelled:', event.data.object);
  }

  res.json({ received: true });
});

// Standard express listen
app.listen(3000, () => console.log('Server running on port 3000'));
