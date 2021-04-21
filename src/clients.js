import sanityClient from "@sanity/client";
const config = {
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: "2021-03-25",
};

// Client to the main dataset
export const prod = sanityClient(config);
// Client to the sync dataset
export const sync = sanityClient(
  Object.assign({}, config, {
    dataset: "sync",
  })
);
