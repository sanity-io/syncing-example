# Webhook dataset document sync example
## Webhook
In api/webhook.js is an example webhook that receives a payload with identifiers of created, updated and deleted documents in a given dataset.

It syncs new documents over to a separate dataset, and further field changes are synced over to this separate dataset if the values have not diverged.

## Frontend
in /src is a React frontend listening for changes in the main dataset, just to illustrate its contents. There you may follow along with the changes the webhook handler is making.

## Deploy
You can easily deploy this to Vercel with `npx vercel`. The serverless function in /api should work automatically. You can then go to your sanity manage page at https://manage.sanity.io and configure a webhook for your dataset and point its URL to your vercel deployment like https://<my-project>-vercel.app/api/webhook

You'll also want to configure CORS if you want the frontend to be able to listen for changes. Add a CORS origin at https://manage.sanity.io for https://<my-project>.vercel.app
