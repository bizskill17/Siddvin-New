/**
 * Hooks for Code.gs CRUD methods.
 * Requires NotificationService.gs in the same Apps Script project.
 */

function tryNotifyMutation_(action, entity, savedData, updatedBy, previousData) {
  try {
    if (!savedData) return;
    notifyMutation_(action, entity, savedData, updatedBy || "System", previousData || null);
  } catch (err) {
    // Notification failure must not fail data save.
    Logger.log("Notification error: " + err);
  }
}

function notifyMutation_(action, entity, savedData, updatedBy, previousData) {
  var payload = buildBaseNotificationPayload_(entity, savedData, updatedBy);

  if (entity === "Properties") {
    notifySidvinOwner_(SidvinNotificationEvent.PROPERTY_UPDATE, payload);
    return;
  }

  if (entity === "Brands") {
    notifySidvinOwner_(SidvinNotificationEvent.BRAND_UPDATE, payload);
    return;
  }

  if (entity === "CompanyMaster" || entity === "CategoryMaster") {
    payload.list = entity === "CompanyMaster" ? "Company Master" : "Category Master";
    notifySidvinOwner_(SidvinNotificationEvent.MASTER_UPDATE, payload);
    return;
  }

  if (entity === "SidvinTeam" || entity === "SidvinTeamMembers" || entity === "Sidvin Team Members") {
    notifySidvinOwner_(SidvinNotificationEvent.TEAM_UPDATE, payload);
    return;
  }

  if (entity === "Proposals") {
    notifySidvinOwner_(SidvinNotificationEvent.PROPOSAL_UPDATED, payload);
    if (isFilled_(savedData.invoiceNo) || isFilled_(savedData.invoiceDate) || isFilled_(savedData.invoiceAmount)) {
      notifySidvinOwner_(SidvinNotificationEvent.SUCCESS_STORY_BILLED, payload);
    }
    return;
  }

  if (entity === "FollowUps") {
    var status = String(savedData.status || "").trim().toLowerCase();
    if (status === "cancel proposal") {
      notifySidvinOwner_(SidvinNotificationEvent.PROPOSAL_CANCELLED, payload);
    } else {
      notifySidvinOwner_(SidvinNotificationEvent.FOLLOW_UP_DONE, payload);
    }
    return;
  }

  if (entity === "Visits") {
    notifySidvinOwner_(SidvinNotificationEvent.VISIT_UPDATE, payload);
    return;
  }

  if (entity === "TermSheets") {
    notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, payload);

    if (
      isFilled_(savedData.ac) ||
      isFilled_(savedData.electricalPanel) ||
      isFilled_(savedData.fireFightingSystem) ||
      isFilled_(savedData.flooring) ||
      isFilled_(savedData.powerLoad) ||
      isFilled_(savedData.dgBackup)
    ) {
      notifySidvinOwner_(SidvinNotificationEvent.TECHNICAL_SPECS_FINALIZED, payload);
    }

    emitDepositAndReceiptNotifications_(payload, previousData, savedData, action);
    return;
  }
}

function buildBaseNotificationPayload_(entity, savedData, updatedBy) {
  var payload = copyObject_(savedData || {});
  payload.updatedBy = updatedBy || payload.updatedBy || "System";

  var context = resolveContext_(entity, savedData);
  payload.propertyAddress = payload.propertyAddress || context.propertyAddress;
  payload.brandName = payload.brandName || context.brandName;
  payload.serialNo = payload.serialNo || context.serialNo;

  if (!isFilled_(payload.contactPersonName) || !isFilled_(payload.mobile)) {
    var contact = firstContactSafe_(savedData && savedData.contactPersonsJson ? savedData.contactPersonsJson : savedData.contactPersons);
    if (contact) {
      if (!isFilled_(payload.contactPersonName)) payload.contactPersonName = contact.name;
      if (!isFilled_(payload.mobile)) payload.mobile = contact.mobile;
    }
  }

  if (!isFilled_(payload.proposalDate) && isFilled_(context.proposalDate)) {
    payload.proposalDate = context.proposalDate;
  }
  if (!isFilled_(payload.proposalSender) && isFilled_(context.proposalSender)) {
    payload.proposalSender = context.proposalSender;
  }
  if (!isFilled_(payload.brandRemarks) && isFilled_(context.brandRemarks)) {
    payload.brandRemarks = context.brandRemarks;
  }

  return payload;
}

function resolveContext_(entity, savedData) {
  var out = {
    propertyAddress: "",
    brandName: "",
    serialNo: "",
    proposalDate: "",
    proposalSender: "",
    brandRemarks: ""
  };

  if (entity === "Proposals") {
    var proposalCtx = getProposalContextByProposalId_(savedData.id, savedData.propertyId, savedData.brandId);
    out.propertyAddress = proposalCtx.propertyAddress;
    out.brandName = proposalCtx.brandName;
    out.serialNo = savedData.serialNo || proposalCtx.serialNo;
    out.proposalDate = savedData.proposalDate;
    out.proposalSender = savedData.proposalSender;
    out.brandRemarks = savedData.brandRemarks;
    return out;
  }

  if (entity === "FollowUps" || entity === "Visits" || entity === "TermSheets") {
    var proposalId = savedData.proposalId;
    if (!isFilled_(proposalId)) return out;
    var proposalContext = getProposalContextByProposalId_(proposalId);
    out.propertyAddress = proposalContext.propertyAddress;
    out.brandName = proposalContext.brandName;
    out.serialNo = proposalContext.serialNo;
    out.proposalDate = proposalContext.proposalDate;
    out.proposalSender = proposalContext.proposalSender;
    out.brandRemarks = proposalContext.brandRemarks;
    return out;
  }

  return out;
}

function getProposalContextByProposalId_(proposalId, proposalPropertyId, proposalBrandId) {
  var out = {
    propertyAddress: "",
    brandName: "",
    serialNo: "",
    proposalDate: "",
    proposalSender: "",
    brandRemarks: ""
  };

  var proposal = null;
  if (isFilled_(proposalId)) {
    proposal = getById_("Proposals", proposalId);
  }

  var propertyId = proposal ? proposal.propertyId : proposalPropertyId;
  var brandId = proposal ? proposal.brandId : proposalBrandId;

  if (proposal) {
    out.serialNo = proposal.serialNo || "";
    out.proposalDate = proposal.proposalDate || "";
    out.proposalSender = proposal.proposalSender || "";
    out.brandRemarks = proposal.brandRemarks || "";
  }

  if (isFilled_(propertyId)) {
    var property = getById_("Properties", propertyId);
    out.propertyAddress = property && property.address ? property.address : "";
  }

  if (isFilled_(brandId)) {
    var brand = getById_("Brands", brandId);
    out.brandName = brand && brand.name ? brand.name : "";
  }

  return out;
}

function emitDepositAndReceiptNotifications_(basePayload, previousData, currentData, action) {
  var oldStages = toStageArray_(previousData && previousData.depositStagesJson);
  var newStages = toStageArray_(currentData && currentData.depositStagesJson);

  if (!newStages.length) return;

  var oldById = indexByStageKey_(oldStages);
  var newById = indexByStageKey_(newStages);

  // Deposit stage created or changed.
  for (var i = 0; i < newStages.length; i++) {
    var stage = newStages[i] || {};
    var key = stageKey_(stage, i);
    var oldStage = oldById[key];

    if (!oldStage) {
      notifySidvinOwner_(SidvinNotificationEvent.DEPOSIT_UPDATE, mergeStagePayload_(basePayload, stage));
      emitReceiptForNewStage_(basePayload, stage);
      continue;
    }

    if (stageChanged_(oldStage, stage)) {
      notifySidvinOwner_(SidvinNotificationEvent.DEPOSIT_UPDATE, mergeStagePayload_(basePayload, stage));
    }

    emitNewReceipts_(basePayload, oldStage, stage);
  }

  // Optional: if upsert created first row and previous was empty, stage notifications above already cover it.
  if (action === "create" && !oldStages.length && newStages.length) {
    return;
  }
}

function emitReceiptForNewStage_(basePayload, stage) {
  var receipts = toReceiptArray_(stage.receipts);
  for (var i = 0; i < receipts.length; i++) {
    var receipt = receipts[i] || {};
    var payload = mergeStagePayload_(basePayload, stage);
    payload.receiptAmount = receipt.receiptAmount;
    payload.receiptDate = receipt.receiptDate || stage.receiptDate;
    notifySidvinOwner_(SidvinNotificationEvent.RECEIPT_UPDATE, payload);
  }
}

function emitNewReceipts_(basePayload, oldStage, newStage) {
  var oldReceipts = toReceiptArray_(oldStage && oldStage.receipts);
  var newReceipts = toReceiptArray_(newStage && newStage.receipts);
  if (!newReceipts.length) return;

  var oldIds = {};
  for (var i = 0; i < oldReceipts.length; i++) {
    var oldId = String(oldReceipts[i] && oldReceipts[i].id || "");
    if (oldId) oldIds[oldId] = true;
  }

  for (var j = 0; j < newReceipts.length; j++) {
    var r = newReceipts[j] || {};
    var rid = String(r.id || "");
    var isNew = !rid || !oldIds[rid];
    if (!isNew) continue;

    var payload = mergeStagePayload_(basePayload, newStage);
    payload.receiptAmount = r.receiptAmount;
    payload.receiptDate = r.receiptDate || newStage.receiptDate;
    notifySidvinOwner_(SidvinNotificationEvent.RECEIPT_UPDATE, payload);
  }
}

function mergeStagePayload_(basePayload, stage) {
  var payload = copyObject_(basePayload || {});
  payload.stageName = stage.stageName;
  payload.amount = stage.amount;
  payload.receivedAmount = stage.receivedAmount;
  payload.receiptDate = stage.receiptDate;
  return payload;
}

function stageChanged_(oldStage, newStage) {
  return (
    String(oldStage.stageName || "") !== String(newStage.stageName || "") ||
    Number(oldStage.amount || 0) !== Number(newStage.amount || 0) ||
    Number(oldStage.receivedAmount || 0) !== Number(newStage.receivedAmount || 0) ||
    String(oldStage.receiptDate || "") !== String(newStage.receiptDate || "") ||
    String(oldStage.received || "") !== String(newStage.received || "")
  );
}

function indexByStageKey_(stages) {
  var out = {};
  for (var i = 0; i < stages.length; i++) {
    var stage = stages[i] || {};
    out[stageKey_(stage, i)] = stage;
  }
  return out;
}

function stageKey_(stage, index) {
  return String(stage.id || stage.stageName || index);
}

function toStageArray_(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

function toReceiptArray_(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

function firstContactSafe_(value) {
  var list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "string") {
    try {
      var parsed = JSON.parse(value);
      if (Array.isArray(parsed)) list = parsed;
    } catch (err) {
      list = [];
    }
  }
  if (!list.length) return null;
  var c = list[0] || {};
  return {
    name: c.name || c.contactPersonName || "",
    mobile: c.mobile || c.phone || ""
  };
}

