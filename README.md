# Webhook dataset document sync example
## Webhook
In api/webhook.js is an example webhook that receives a payload with identifiers of created, updated and deleted documents in a given dataset.

It syncs new documents over to a separate dataset, and further field changes are synced over to this separate dataset if the values have not diverged.

## Frontend
in /src is a React frontend listening for changes in the main dataset, just to illustrate its contents. There you may follow along with the changes the webhook handler is making.