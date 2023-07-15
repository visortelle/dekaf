# Example Keygen + Stripe integration
The following web app is written in Node.js and shows how to integrate
[Keygen](https://keygen.sh) and [Stripe](https://stripe.com) together
using webhooks. Much more could be done to automate e.g. license
revocation when a subscription is canceled, etc.

> **This example application is not 100% production-ready**, but it should
> get you 90% of the way there. You may need to add additional logging,
> error handling, as well as listening for additional webhook events.

🚨 Don't want to host your own webhook server? Check out [our Zapier integration](https://keygen.sh/integrate/zapier/).

## Running the app

First up, configure a few environment variables:
```bash
# Stripe publishable key
export STRIPE_PUBLISHABLE_KEY="YOUR_STRIPE_PUBLISHABLE_KEY"

# Stripe secret key (don't share this!)
export STRIPE_SECRET_KEY="YOUR_STRIPE_SECRET_KEY"

# The Stripe plan to subscribe new customers to
export STRIPE_PLAN_ID="YOUR_STRIPE_PLAN_ID"

# Keygen product token (don't share this!)
export KEYGEN_PRODUCT_TOKEN="YOUR_KEYGEN_PRODUCT_TOKEN"

# Your Keygen account ID
export KEYGEN_ACCOUNT_ID="YOUR_KEYGEN_ACCOUNT_ID"

# The Keygen policy to use when creating licenses for new users
# after they successfully subscribe to a plan
export KEYGEN_POLICY_ID="YOUR_KEYGEN_POLICY_ID"
```

You can either run each line above within your terminal session before
starting the app, or you can add the above contents to your `~/.bashrc`
file and then run `source ~/.bashrc` after saving the file.

Next, install dependencies with [`yarn`](https://yarnpkg.comg):
```
yarn
```

Then start the app:
```
yarn start
```

## Configuring the webhooks

For local development, create an [`ngrok`](https://ngrok.com) tunnel to your
local development server:
```
ngrok http 8080
```

Next up, add the generated `ngrok` URL to your Stripe and Keygen accounts to
listen for webhooks.

1. **Stripe:** add `https://{YOUR_NGROK_URL}/stripe-webhooks` to https://dashboard.stripe.com/account/webhooks
1. **Keygen:** add `https://{YOUR_NGROK_URL}/keygen-webhooks` to https://app.keygen.sh/webhook-endpoints

> **In a production environment, you would use your actual server info in place of
> the `ngrok` URLs above.**

## Testing the integration

Visit the following url: http://localhost:8080 and fill out the purchase form.

## Common Issues

### Incorrect ENV variables

In case of errors, please double check all of your environment variables.
If one of the variables are incorrect, it may cause API authentication
issues.

### Protected account

**Please note that this example requires that your Keygen account is
set to unprotected**, because this example handles user creation
on the front-end. You can update this setting on your [account's
settings page](https://app.keygen.sh/settings). If you would prefer
to keep your account protected, the logic for user creation would
need to be moved to a server-side URL.

### Other issues

Here's a few things to double check when a problem arises:

1. Make sure you're using the correct account ID (find yours [here](https://app.keygen.sh/settings))
1. Make sure you're using a product token or admin token (the token should start with `prod-` or `admi-`)
1. Make sure you're using the correct policy ID (it should be a UUID)
1. Make sure that your Stripe environment variables are correct
1. Make sure all dependencies have been installed via `yarn install`
1. Make sure you have correctly configured webhooks for both Keygen _and_ Stripe
1. Make sure that the webhook URL is accessible from the public internet via `ngrok`

## Questions?

Reach out at [support@keygen.sh](mailto:support@keygen.sh) if you have any
questions or concerns!
