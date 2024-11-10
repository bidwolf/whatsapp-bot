import { MongoClient } from "mongodb";
import { WhatsAppInstance } from "./api/class/instance";

declare global {

  interface WhatsAppInstances {
    [key: string]: WhatsAppInstance;
  }

  var WhatsAppInstances: WhatsAppInstances;
  var mongoClient: MongoClient;
}

export { };
