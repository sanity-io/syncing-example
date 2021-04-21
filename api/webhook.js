/*
In the following example, the function `recv` is a Sanity webhook receiver
function which is called whenever published documents in a specific dataset
have been created, updated or deleted. The function replicates any create or
delete operation into another dataset `syncDatasetName` and applies patches to
any copied document for all of its non-diverged fields, thus keeping them up to
date from upstream dataset.
*/

const fetch = require("node-fetch");
const { applyPatch } = require("mendoza");

// The prod sanity client
const {prod} = require("../src/clients")

// Statically configured sync dataset here, might want dynamic values for that,
// perhaps from metadata documents or fields on the documents themselves
// describing where they should sync to
const syncDatasetName = "sync";

// The config object of the client, with things like projectId, apiVersion etc.
const clientConfig = prod.config()

// Need a token for writing into the synced dataset, and querying for
// transactions Those could be two different tokens if you need ACL separation,
// but for brewity we use one single token with all permissions here.
const readWriteToken = process.env.SANITY_READ_WRITE_TOKEN;

// Client for the main dataset
const client = sanityClient(config);
// Client for the sync dataset
const otherClient = sanityClient(
  Object.assign({}, clientConfig, {
    dataset: syncDatasetName,
    token: readWriteToken,
  })
);

// Gets the `limit` amount of previous transactions, descending, in patch
// format, for a given document. The patch format is mendoza
// https://github.com/sanity-io/mendoza
// https://github.com/sanity-io/mendoza-js
const getTransactions = (id, limit = 1) => {
  const { projectId, dataset } = config;
  const url = `https://${projectId}.api.sanity.io/v1/data/history/${dataset}/transactions/${id}?&excludeContent=true&excludeMutations=true&includeIdentifiedDocumentsOnly=true&reverse=true&limit=${limit}&effectFormat=mendoza`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${readWriteToken}` },
  }).then((res) => res.json());
};

// Very simple field comparison which just serializes to JSON and string
// compares root level fields. Probably you'd want some smarter/deeper
// comparison of documents than this.
const cmpField = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const syncDoc = async (id) => {
  // Get the document
  const doc = await client.getDocument(id);
  if (!doc) { return "no document"; }

  // _rev is never part of patch sets, so delete it before we apply patch later
  delete doc._rev; 

  // Get the latest transaction on this document, and its mendoza patches for
  // apply and revert.
  return getTransactions(id)
    .then((transaction) => transaction.effects[id])
    .then((patches) =>
      // Apply the `revert` patch to get the previous document version
      [doc, applyPatch(doc, patches.revert)]
    )
    .then(([doc, prev]) => {
      // We now have the current and previous version of the document. First
      // we'll compare the previous version against the sync copy to find
      // fields which were the same, but have now changed. These fields are safe
      // to update in the synced copy. If they are not the same then the synced
      // copy have forked from upstream.

      const copies = [prev._id, `drafts.${prev._id}`];
      const patches = copies.map((id) =>
        otherClient.getDocument(id).then((copy) => {
          if (!copy) { return; }
          // A value should be updated on the copy, if they were the same value
          // in the previous version, copy[field] === prev[field]

          const patches = [];
          
          const allFields = Array.from(new Set([...Object.keys(prev), ...Object.keys(doc)]))
          for (let i = 0; i < allFields.length; i++) {
            const field = allFields[i]
            // Ignore some system fields
            if (["_rev", "_updatedAt", "_createdAt", "_id"].includes(field))
              continue;

            if (!copy[field] || !cmpField(copy[field], doc[field])) {
              console.log("property has new or changed value", field);

              const sameAsPrev = cmpField(copy[field], prev[field]);

              if (!copy[field] || sameAsPrev) {
                console.log(
                  "New value, or same value in copy and prev, safe to update"
                );
                const patch = {};
                patch[field] = doc[field];
                patches.push(otherClient.patch(id).set(patch));
              } else if (sameAsPrev && !doc[field]) {
                // Removed
                patches.push(otherClient.patch(id).unset([field]));
              }
            }
          }

          // Combine the patches in a transaction
          if (patches.length) {
            const t = otherClient.transaction();
            patches.forEach((p) => t.patch(p));
            return t.commit();
          }
        })
      );
      return Promise.all(patches);
    });
};


// The serverless function handling our webhook endpoint URL
module.exports = (req, res) => {
  const payload = req.body;
  
  // Note: Should do some checks on the payload object here. Possibly checking shared
  // secret from get params etc too as a security measure.

  const { created, deleted, updated } = payload.ids;

  // First create any new documents (might want more control than just creating any document type)
  await Promise.all(
    created.map((id) => client.getDocument(id).then((doc) => otherClient.create(doc)))
  );

  // Delete any deleted documents (might want more control than just deleting any document)
  await Promise.all(deleted.map(id => otherClient.delete(id)));

  // The updated documents
  await Promise.all(updated.map((id) => syncDoc(id))).then(console.log);
  return recv(payload).then(res.json);
};
