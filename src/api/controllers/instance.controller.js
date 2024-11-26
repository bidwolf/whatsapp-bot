const { WhatsAppInstance } = require("../class/instance");
const config = require("../../config/config");
const { Session } = require("../class/session");
const { sanitizeNumber } = require("../../utils/conversionHelpers");

exports.init = async (req, res) => {
  const key = req.query.key;
  const webhook = !req.query.webhook ? false : req.query.webhook;
  const webhookUrl = !req.query.webhookUrl ? null : req.query.webhookUrl;
  const appUrl = config.appUrl || req.protocol + "://" + req.headers.host;
  if (global.WhatsAppInstances[key]) {
    await global.WhatsAppInstances[key].close();
    global.WhatsAppInstances[key] = undefined;
  }
  const instance = new WhatsAppInstance(key, webhook, webhookUrl);
  const data = await instance.init();
  global.WhatsAppInstances[data.key] = instance;
  res.json({
    error: false,
    message: "Initializing successfully",
    key: data.key,
    webhook: {
      enabled: webhook,
      webhookUrl: webhookUrl,
    },
    qrcode: {
      url: appUrl + "/instance/qr?key=" + data.key,
    },
    browser: config.browser,
  });
};
exports.pairCode = async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber;
    const key = req.body.key;
    if (!phoneNumber) {
      return res.status(400).json({
        error: true,
        message: "Phone number is required",
      });
    }
    const sanitizedNumber = sanitizeNumber(phoneNumber);
    if (!sanitizedNumber || sanitizedNumber.length < 10) {
      return res.status(400).json({
        error: true,
        message: "Invalid phone number",
      });
    }
    const code =
      await global.WhatsAppInstances[key]?.getPairCode(sanitizedNumber);
    if (!code) {
      return res.status(400).json({
        error: true,
        message: "Failed to send pairing code",
      });
    }
    return res.json({
      error: false,
      message: "Pairing code sent successfully",
      code: code,
    });
  } catch {
    res.json({
      error: true,
      message: "Failed to send pairing code",
      code: "",
    });
  }
};
exports.qr = async (req, res) => {
  try {
    const qrcode = await global.WhatsAppInstances[req.query.key]?.instance.qr;
    res.render("qrcode", {
      qrcode: qrcode,
    });
  } catch {
    res.json({
      qrcode: "",
    });
  }
};

exports.qrbase64 = async (req, res) => {
  try {
    const qrcode = await global.WhatsAppInstances[req.query.key]?.instance.qr;
    res.json({
      error: false,
      message: "QR Base64 fetched successfully",
      qrcode: qrcode,
    });
  } catch {
    res.json({
      qrcode: "",
    });
  }
};

exports.info = async (req, res) => {
  const instance = await global.WhatsAppInstances[req.query.key];
  let data;
  try {
    data = await instance.getInstanceDetail(req.query.key);
  } catch (error) {
    data = {};
  }
  return res.json({
    error: false,
    message: "Instance fetched successfully",
    instance_data: data,
  });
};

exports.restore = async (req, res, next) => {
  try {
    const session = new Session();
    let restoredSessions = await session.restoreSessions();
    return res.json({
      error: false,
      message: "All instances restored",
      data: restoredSessions,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  let errormsg;
  try {
    await global.WhatsAppInstances[req.query.key].instance?.sock?.logout();
  } catch (error) {
    errormsg = error;
  }
  return res.json({
    error: false,
    message: "logout successfull",
    errormsg: errormsg ? errormsg : null,
  });
};

exports.delete = async (req, res) => {
  let errormsg;
  try {
    await global.WhatsAppInstances[req.query.key].deleteInstance(req.query.key);
    delete global.WhatsAppInstances[req.query.key];
  } catch (error) {
    errormsg = error;
  }
  return res.json({
    error: false,
    message: "Instance deleted successfully",
    data: errormsg ? errormsg : null,
  });
};

exports.list = async (req, res) => {
  if (req.query.active) {
    let instance = [];
    const db = global.mongoClient.db("whatsapp-api");
    const result = await db.listCollections().toArray();
    result.forEach((collection) => {
      instance.push(collection.name);
    });

    return res.json({
      error: false,
      message: "All active instance",
      data: instance,
    });
  }

  let instance = Object.keys(global.WhatsAppInstances).map(async (key) =>
    global.WhatsAppInstances[key].getInstanceDetail(key),
  );
  let data = await Promise.all(instance);

  return res.json({
    error: false,
    message: "All instance listed",
    data: data,
  });
};
