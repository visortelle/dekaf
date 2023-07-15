// Be sure to add these ENV variables!
const {
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY,
  KEYGEN_PRODUCT_TOKEN,
} = process.env

import Stripe from "stripe";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import morgan from 'morgan';
import express from 'express';

type PricingPlan = {
  name: string,
  keygenPolicyId: string,
  stripePlanId: string
};

const keygenAccountId = "add36df4-cf52-4909-b352-51318cb23d99"

const pricingPlans: PricingPlan[] = [
  {
    name: "pulsocat-standard-edition-yearly",
    keygenPolicyId: "c90c493b-376b-47de-a310-117973d4a395",
    stripePlanId: "price_1NU8d8B5EwgZEtpprJGGj4jx"
  },
  {
    name: "pulsocat-standard-edition-monthly",
    keygenPolicyId: "c90c493b-376b-47de-a310-117973d4a395",
    stripePlanId: "price_1NU8d8B5EwgZEtpprJGGj4jx"
  }
];

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
});

const app = express();

app.use(bodyParser.json({ type: "application/vnd.api+json" }));
app.use(bodyParser.json({ type: "application/json" }));
app.use(morgan('combined'));

app.post("/stripe-webhooks", async (req, res) => {
  const stripeEvent = req.body as Stripe.DiscriminatedEvent

  switch (stripeEvent.type) {
    case "customer.created": {
      const stripeCustomer = stripeEvent.data.object;

      // Make sure our Stripe customer has a Keygen user ID, or else we can't work with it.
      if (!stripeCustomer.metadata.keygenUserId) {
        console.info(`Keygen user for Stripe customer "${stripeCustomer.id}" isn't found. Creating a new one.`);

        const keygenUserRes = await fetch(`https://api.keygen.sh/v1/accounts/${keygenAccountId}/users`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KEYGEN_PRODUCT_TOKEN}`,
            "Content-Type": "application/vnd.api+json",
            "Accept": "application/vnd.api+json"
          },
          body: JSON.stringify({
            data: {
              type: "users",
              attributes: { email: stripeCustomer.email }
            }
          })
        });

        const { data, errors } = await keygenUserRes.json() as any;
        if (errors) {
          res.sendStatus(500)
          console.error(`Unable to create Keygen user for Stripe customer.`, JSON.stringify(stripeCustomer, null, 4), JSON.stringify(errors, null, 4));
        }

        const keygenUserId = data.id;
        console.info(`Created Keygen user with id "${keygenUserId}" for Stripe customer ${JSON.stringify(stripeCustomer, null, 4)}. Updating Stripe customer metadata.`);

        try {
          await stripe.customers.update(stripeCustomer.id, { metadata: { keygenUserId } });
        } catch (err: any) {
          res.sendStatus(500);
          console.error(`Unable to set Stripe customer metadata for Keygen user ${keygenUserId}`);
        }
      }

      break;
    }

    case "invoice.payment_succeeded": {
      const stripeSubscription = (stripeEvent.data.object.subscription as Stripe.Subscription);

      console.info('PAYMENT_SUCCEEDED')
      console.info(JSON.stringify(stripeEvent.data.object, null, 4));

      break;
    }

    default:
      // For events we don't care about, let Stripe know all is good.
      res.sendStatus(200)
  }
});

process.on('unhandledRejection', (err: Error) => {
  console.error(`Unhandled rejection: ${err}`, err.stack);
});

const port = 8080
app.listen(port, () => {
  console.log(`Listening at :${port}`)
});
