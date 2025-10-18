// src/db.cosmos.js
import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOSDB_ACCOUNT_ENDPOINT;
const databaseId = process.env.COSMOSDB_DATABASE || "appdb";
const containerId = process.env.COSMOSDB_CONTAINER || "products";
const key = process.env.COSMOSDB_KEY; // usamos clave por ahora

const client = new CosmosClient({ endpoint, key });

export async function getCosmosContainer() {
  const database = client.database(databaseId);
  const container = database.container(containerId);
  return container;
}
