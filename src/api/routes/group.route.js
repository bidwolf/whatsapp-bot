const express = require("express");
const controller = require("../controllers/group.controller");
const keyVerify = require("../middlewares/keyCheck");
const loginVerify = require("../middlewares/loginCheck");
const verifyJwt = require("../middlewares/verifyJwt");

const router = express.Router();

router
  .route("/create")
  .post(keyVerify, loginVerify, verifyJwt, controller.create);
router
  .route("/listall")
  .get(keyVerify, loginVerify, verifyJwt, controller.listAll);
router
  .route("/leave")
  .get(keyVerify, loginVerify, verifyJwt, controller.leaveGroup);

router
  .route("/inviteuser")
  .post(keyVerify, loginVerify, verifyJwt, controller.addNewParticipant);
router
  .route("/makeadmin")
  .post(keyVerify, loginVerify, verifyJwt, controller.makeAdmin);
router
  .route("/demoteadmin")
  .post(keyVerify, loginVerify, verifyJwt, controller.demoteAdmin);
router
  .route("/getinvitecode")
  .get(keyVerify, loginVerify, verifyJwt, controller.getInviteCodeGroup);
router
  .route("/getinstanceinvitecode")
  .get(
    keyVerify,
    loginVerify,
    verifyJwt,
    controller.getInstanceInviteCodeGroup,
  );
router
  .route("/getallgroups")
  .get(keyVerify, loginVerify, verifyJwt, controller.getAllGroups);
router
  .route("/participantsupdate")
  .post(keyVerify, loginVerify, verifyJwt, controller.groupParticipantsUpdate);
router
  .route("/settingsupdate")
  .post(keyVerify, loginVerify, verifyJwt, controller.groupSettingUpdate);
router
  .route("/updatesubject")
  .post(keyVerify, loginVerify, verifyJwt, controller.groupUpdateSubject);
router
  .route("/updatedescription")
  .post(keyVerify, loginVerify, verifyJwt, controller.groupUpdateDescription);
router
  .route("/inviteinfo")
  .post(keyVerify, loginVerify, verifyJwt, controller.groupInviteInfo);
router
  .route("/groupjoin")
  .post(keyVerify, loginVerify, verifyJwt, controller.groupJoin);
router.route("/register").post(controller.groupRegister);
router.route("/unregister").post(controller.groupUnregister);
router.route("/availableGroups").get(controller.groupAvailableList);
module.exports = router;
