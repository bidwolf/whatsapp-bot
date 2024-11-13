import { MongoClient } from "mongodb";
import { WhatsAppInstance } from "./api/class/instance";
import { NSFWJS } from "nsfwjs";

declare global {

  interface WhatsAppInstances {
    [key: string]: WhatsAppInstance;
  }

  var WhatsAppInstances: WhatsAppInstances;
  var mongoClient: MongoClient;
  var model: NSFWJS
}

export { };
