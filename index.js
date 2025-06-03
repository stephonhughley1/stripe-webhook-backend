import express from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`✅ Received event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('🎯 Checkout session completed:', session);
    }

    res.status(200).send('Webhook received');
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));

