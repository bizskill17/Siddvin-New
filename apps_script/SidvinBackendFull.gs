/**
 * Sidvin Full Backend (single-file version)
 *
 * Includes:
 * - doPost mutation handler (create/update/upsert/delete)
 * - Notification routing for all 13 events
 * - MessageAutoSender API integration
 * - Payload/context enrichment helpers
 *
 * Notes:
 * - Uses existing CRUD helpers if available.
 * - Falls back to built-in sheet CRUD when helper names differ or are missing.
 */

var SidvinNotificationEvent = {
  PROPERTY_UPDATE: "PROPERTY_UPDATE",
  BRAND_UPDATE: "BRAND_UPDATE",
  MASTER_UPDATE: "MASTER_UPDATE",
  TEAM_UPDATE: "TEAM_UPDATE",
  PROPOSAL_UPDATED: "PROPOSAL_UPDATED",
  FOLLOW_UP_DONE: "FOLLOW_UP_DONE",
  PROPOSAL_CANCELLED: "PROPOSAL_CANCELLED",
  VISIT_SCHEDULED: "VISIT_SCHEDULED",
  VISIT_COMPLETED: "VISIT_COMPLETED",
  TERMS_AGREEMENT_UPDATED: "TERMS_AGREEMENT_UPDATED",
  AGREEMENT_STORE_OPENING_UPDATED: "AGREEMENT_STORE_OPENING_UPDATED",
  TECHNICAL_SPECS_FINALIZED: "TECHNICAL_SPECS_FINALIZED",
  DEPOSIT_UPDATE: "DEPOSIT_UPDATE",
  RECEIPT_UPDATE: "RECEIPT_UPDATE",
  SUCCESS_STORY_BILLED: "SUCCESS_STORY_BILLED"
};

var SIDVIN_NOTIFICATION_CONFIG = {
  API_URL: "https://app.messageautosender.com/api/v1/message/create",
  OWNER_GROUP_ID: "120363420785096184@g.us",
  OWNER_MOBILE: "9864023888",

  // Fallbacks only; prefer Script Properties.
  MAS_USERNAME: "bizskill",
  MAS_PASSWORD: "12345678"
};

function doPost(e) {
  try {
    var body = parseBody_(e);
    var action = String(body.action || "").trim();
    var entity = body.entity;
    var updatedBy = body.updatedBy || "System";
    var suppressNotification = !!body.suppressNotification;

    // Keep Visits sheet schema aligned with frontend payloads.
    if (entity === "Visits") {
      ensureVisitsSheetColumns_();
    }

    if (action === "create") {
      var created = backendCreate_(entity, body.data || {}, updatedBy);
      if (!suppressNotification) {
        tryNotifyMutation_(action, entity, created, updatedBy, null);
      }
      return json_({ ok: true, data: created });
    }

    if (action === "update") {
      var previous = null;
      if ((entity === "TermSheets" || entity === "FollowUps" || entity === "Proposals") && isFilled_(body.id)) {
        previous = backendGetById_(entity, body.id);
      }
      var updated = backendUpdate_(entity, body.id, body.data || {}, updatedBy);
      if (!suppressNotification) {
        tryNotifyMutation_(action, entity, updated, updatedBy, previous);
      }
      return json_({ ok: true, data: updated });
    }

    if (action === "upsertByProposalId") {
      var previousByProposalId = null;
      if (entity === "TermSheets" && isFilled_(body.proposalId)) {
        var oldRows = backendGetByProposalId_(entity, body.proposalId);
        previousByProposalId = oldRows && oldRows.length ? oldRows[0] : null;
      }
      var upserted = backendUpsertByProposalId_(entity, body.proposalId, body.data || {}, updatedBy);
      if (!suppressNotification) {
        tryNotifyMutation_(action, entity, upserted, updatedBy, previousByProposalId);
      }
      return json_({ ok: true, data: upserted });
    }

    if (action === "delete") {
      backendRemoveById_(entity, body.id);
      return json_({ ok: true });
    }

    if (action === "deleteByProposalId") {
      backendRemoveByProposalId_(entity, body.proposalId);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: "Invalid POST action" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = String(params.action || "list").trim();
    var entity = String(params.entity || "").trim();

    if (!isFilled_(entity) && action !== "ping") {
      return json_({ ok: false, error: "Missing entity" });
    }

    if (action === "ping") {
      return json_({ ok: true, now: new Date().toISOString() });
    }

    if (action === "list") {
      return json_({ ok: true, data: backendList_(entity) });
    }

    if (action === "getById") {
      if (!isFilled_(params.id)) return json_({ ok: false, error: "Missing id" });
      return json_({ ok: true, data: backendGetById_(entity, params.id) || null });
    }

    if (action === "getByProposalId") {
      if (!isFilled_(params.proposalId)) return json_({ ok: false, error: "Missing proposalId" });
      return json_({ ok: true, data: backendGetByProposalId_(entity, params.proposalId) });
    }

    return json_({ ok: false, error: "Invalid GET action" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !isFilled_(e.postData.contents)) {
    return {};
  }
  var raw = String(e.postData.contents || "");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("Invalid JSON body: " + err);
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function tryNotifyMutation_(action, entity, savedData, updatedBy, previousData) {
  try {
    if (!savedData) return;
    notifyMutation_(action, entity, savedData, updatedBy || "System", previousData || null);
  } catch (err) {
    // Notification failure must never fail data save.
    Logger.log("Notification error for " + entity + " (" + action + "): " + err);
    writeNotificationAudit_("NOTIFY_FAILURE", {
      action: action,
      entity: entity,
      error: String(err || ""),
      proposalId: savedData && savedData.proposalId ? savedData.proposalId : "",
      recordId: savedData && savedData.id ? savedData.id : ""
    });
  }
}

function notifyMutation_(action, entity, savedData, updatedBy, previousData) {
  var payload = buildBaseNotificationPayload_(entity, savedData, updatedBy);
  payload.mutationAction = action;

  if (entity === "Properties") {
    var act = String(action || "").trim().toLowerCase();
    if (act === "create") {
      notifySidvinOwner_(SidvinNotificationEvent.PROPERTY_UPDATE, payload);
    }
    return;
  }

  if (entity === "Brands") {
    var actBrand = String(action || "").trim().toLowerCase();
    if (actBrand === "create") {
      notifySidvinOwner_(SidvinNotificationEvent.BRAND_UPDATE, payload);
    }
    return;
  }

  if (entity === "Proposals") {
    if (String(action || "").toLowerCase() === "create") {
      notifySidvinOwner_(SidvinNotificationEvent.PROPOSAL_UPDATED, payload);
    }
    if (isFilled_(savedData.invoiceNo) || isFilled_(savedData.invoiceDate) || isFilled_(savedData.invoiceAmount)) {
      notifySidvinOwner_(SidvinNotificationEvent.SUCCESS_STORY_BILLED, payload);
    }
    return;
  }

  if (entity === "FollowUps") {
    var status = String(savedData.status || "").trim().toLowerCase();
    if (status === "cancel proposal") return;
    notifySidvinOwner_(SidvinNotificationEvent.FOLLOW_UP_DONE, payload);
    return;
  }

  if (entity === "Visits") {
    if (isFilled_(savedData.visitDate)) {
      notifySidvinOwner_(SidvinNotificationEvent.VISIT_COMPLETED, payload);
    } else {
      notifySidvinOwner_(SidvinNotificationEvent.VISIT_SCHEDULED, payload);
    }
    return;
  }

  if (entity === "TermSheets") {
    // Deposit/Receipt notifications are derived from changes inside depositStagesJson.
    emitDepositAndReceiptNotifications_(payload, previousData, savedData, String(action || "").trim().toLowerCase());

    // Send Terms/Agreement message only when agreement-related fields change.
    var hasAgreementChange =
      hasAgreementStoreOpeningChange_(previousData, savedData) ||
      hasTermsAgreementDetailsChange_(previousData, savedData);
    if (!hasAgreementChange) return;

    if (hasAgreementStoreOpeningChange_(previousData, savedData)) {
      notifySidvinOwner_(SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED, payload);
    } else {
      notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, payload);
    }
    return;
  }
}

function emitDepositAndReceiptNotifications_(basePayload, previousData, currentData, action) {
  var oldStages = toStageArray_(previousData && (previousData.depositStagesJson || previousData.depositStages));
  var newStages = toStageArray_(currentData && (currentData.depositStagesJson || currentData.depositStages));

  if (!newStages.length) return;

  var oldById = indexByStageKey_(oldStages);

  for (var i = 0; i < newStages.length; i++) {
    var stage = newStages[i] || {};
    var key = stageKey_(stage, i);
    var oldStage = oldById[key] || null;

    if (!oldStage) {
      notifySidvinOwner_(SidvinNotificationEvent.DEPOSIT_UPDATE, mergeStagePayload_(basePayload, stage));
      emitReceiptForNewStage_(basePayload, stage);
      continue;
    }

    if (stageChanged_(oldStage, stage)) {
      notifySidvinOwner_(SidvinNotificationEvent.DEPOSIT_UPDATE, mergeStagePayload_(basePayload, stage));
    }

    emitNewOrUpdatedReceipts_(basePayload, oldStage, stage);
  }

  // If upsert created first row and previous was empty, stage notifications above already cover it.
  if (action === "create" && !oldStages.length && newStages.length) return;
}

function emitReceiptForNewStage_(basePayload, stage) {
  var receipts = toReceiptArray_(stage && stage.receipts);
  for (var i = 0; i < receipts.length; i++) {
    var receipt = receipts[i] || {};
    var payload = mergeStagePayload_(basePayload, stage);
    payload.receiptAmount = receipt.receiptAmount;
    payload.receiptDate = receipt.receiptDate || stage.receiptDate;
    notifySidvinOwner_(SidvinNotificationEvent.RECEIPT_UPDATE, payload);
  }
}

function emitNewOrUpdatedReceipts_(basePayload, oldStage, newStage) {
  var oldReceipts = toReceiptArray_(oldStage && oldStage.receipts);
  var newReceipts = toReceiptArray_(newStage && newStage.receipts);
  if (!newReceipts.length) return;

  var oldByKey = {};
  for (var i = 0; i < oldReceipts.length; i++) {
    var oldR = oldReceipts[i] || {};
    var oldKey = String(oldR.id || i);
    oldByKey[oldKey] = oldR;
  }

  for (var j = 0; j < newReceipts.length; j++) {
    var r = newReceipts[j] || {};
    var rid = String(r.id || "");
    var key = rid || String(j);
    var oldReceipt = oldByKey[key] || null;
    var isNew = !oldReceipt;
    var isUpdated = !!oldReceipt && receiptChanged_(oldReceipt, r);
    if (!isNew && !isUpdated) continue;

    var payload = mergeStagePayload_(basePayload, newStage);
    payload.receiptAmount = r.receiptAmount;
    payload.receiptDate = r.receiptDate || newStage.receiptDate;
    notifySidvinOwner_(SidvinNotificationEvent.RECEIPT_UPDATE, payload);
  }
}

function receiptChanged_(oldReceipt, newReceipt) {
  oldReceipt = oldReceipt || {};
  newReceipt = newReceipt || {};
  return (
    String(oldReceipt.receiptDate || "") !== String(newReceipt.receiptDate || "") ||
    Number(oldReceipt.receiptAmount || 0) !== Number(newReceipt.receiptAmount || 0)
  );
}

/**
 * Ensures the Visits sheet contains all expected columns, including meetingLink.
 * Safe to run multiple times.
 */
function ensureVisitsSheetColumns_() {
  try {
    var sheet = getEntitySheet_("Visits", true);
    ensureSheetHeaders_(sheet, [
      "id",
      "proposalId",
      "scheduledDate",
      "scheduledTime",
      "meetingType",
      "meetingAgenda",
      "meetingLink",
      "visitDate",
      "developerAttendees",
      "brandAttendees",
      "sidvinAttendees",
      "visitOutcome",
      "createdAt",
      "updatedAt",
      "updatedBy"
    ]);
  } catch (err) {
    Logger.log("ensureVisitsSheetColumns_ failed: " + err);
  }
}

function buildBaseNotificationPayload_(entity, savedData, updatedBy) {
  var payload = copyObject_(savedData || {});
  payload.updatedBy = updatedBy || payload.updatedBy || "System";

  var context = {
    propertyAddress: "",
    brandName: "",
    companyName: "",
    ownerName: "",
    serialNo: "",
    proposalDate: "",
    proposalSender: "",
    brandRemarks: "",
    brandContactDesignation: ""
  };
  try {
    context = resolveContext_(entity, savedData);
  } catch (err) {
    Logger.log("Context resolution failed for " + entity + ": " + err);
    writeNotificationAudit_("CONTEXT_ERROR", {
      entity: entity,
      action: "resolveContext",
      error: String(err || ""),
      proposalId: savedData && savedData.proposalId ? savedData.proposalId : "",
      recordId: savedData && savedData.id ? savedData.id : ""
    });
  }
  payload.propertyAddress = payload.propertyAddress || context.propertyAddress;
  payload.brandName = payload.brandName || context.brandName;
  payload.companyName = payload.companyName || context.companyName;
  payload.ownerName = payload.ownerName || context.ownerName;
  payload.serialNo = payload.serialNo || context.serialNo;
  payload.propertyContactPersons = payload.propertyContactPersons || context.propertyContactPersons;
  payload.brandContactPersons = payload.brandContactPersons || context.brandContactPersons;
  if (!isFilled_(payload.propertyContactName) && isFilled_(context.propertyContactName)) {
    payload.propertyContactName = context.propertyContactName;
  }
  if (!isFilled_(payload.propertyContactMobile) && isFilled_(context.propertyContactMobile)) {
    payload.propertyContactMobile = context.propertyContactMobile;
  }
  if (!isFilled_(payload.brandContactName) && isFilled_(context.brandContactName)) {
    payload.brandContactName = context.brandContactName;
  }
  if (!isFilled_(payload.brandContactMobile) && isFilled_(context.brandContactMobile)) {
    payload.brandContactMobile = context.brandContactMobile;
  }
  if (!isFilled_(payload.brandContactDesignation) && isFilled_(context.brandContactDesignation)) {
    payload.brandContactDesignation = context.brandContactDesignation;
  }

  if (!isFilled_(payload.contactPersonName) || !isFilled_(payload.mobile)) {
    var contact = firstContactSafe_(savedData && savedData.contactPersonsJson ? savedData.contactPersonsJson : savedData.contactPersons);
    if (contact) {
      if (!isFilled_(payload.contactPersonName)) payload.contactPersonName = contact.name;
      if (!isFilled_(payload.mobile)) payload.mobile = contact.mobile;
    }
  }

  if (entity === "Properties" && !isFilled_(payload.propertyContactPersons)) {
    payload.propertyContactPersons = toContactArraySafe_(savedData && savedData.contactPersonsJson ? savedData.contactPersonsJson : savedData.contactPersons);
  }
  if (entity === "Brands" && !isFilled_(payload.brandContactPersons)) {
    payload.brandContactPersons = toContactArraySafe_(savedData && savedData.contactPersonsJson ? savedData.contactPersonsJson : savedData.contactPersons);
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
    companyName: "",
    ownerName: "",
    serialNo: "",
    proposalDate: "",
    proposalSender: "",
    brandRemarks: "",
    propertyContactPersons: [],
    brandContactPersons: [],
    propertyContactName: "",
    propertyContactMobile: "",
    brandContactName: "",
    brandContactMobile: "",
    brandContactDesignation: ""
  };

  if (entity === "Proposals") {
    var proposalCtx = getProposalContextByProposalId_(savedData.id, savedData.propertyId, savedData.brandId);
    out.propertyAddress = proposalCtx.propertyAddress;
    out.brandName = proposalCtx.brandName;
    out.companyName = proposalCtx.companyName;
    out.ownerName = proposalCtx.ownerName;
    out.serialNo = savedData.serialNo || proposalCtx.serialNo;
    out.proposalDate = savedData.proposalDate || proposalCtx.proposalDate;
    out.proposalSender = savedData.proposalSender || proposalCtx.proposalSender;
    out.brandRemarks = savedData.brandRemarks || proposalCtx.brandRemarks;
    out.propertyContactPersons = proposalCtx.propertyContactPersons;
    out.brandContactPersons = proposalCtx.brandContactPersons;
    out.propertyContactName = proposalCtx.propertyContactName;
    out.propertyContactMobile = proposalCtx.propertyContactMobile;
    out.brandContactName = proposalCtx.brandContactName;
    out.brandContactMobile = proposalCtx.brandContactMobile;
    out.brandContactDesignation = proposalCtx.brandContactDesignation;
    return out;
  }

  if (entity === "FollowUps" || entity === "Visits" || entity === "TermSheets") {
    var proposalId = savedData.proposalId;
    if (!isFilled_(proposalId)) return out;
    var proposalContext = getProposalContextByProposalId_(proposalId);
    out.propertyAddress = proposalContext.propertyAddress;
    out.brandName = proposalContext.brandName;
    out.companyName = proposalContext.companyName;
    out.ownerName = proposalContext.ownerName;
    out.serialNo = proposalContext.serialNo;
    out.proposalDate = proposalContext.proposalDate;
    out.proposalSender = proposalContext.proposalSender;
    out.brandRemarks = proposalContext.brandRemarks;
    out.propertyContactPersons = proposalContext.propertyContactPersons;
    out.brandContactPersons = proposalContext.brandContactPersons;
    out.propertyContactName = proposalContext.propertyContactName;
    out.propertyContactMobile = proposalContext.propertyContactMobile;
    out.brandContactName = proposalContext.brandContactName;
    out.brandContactMobile = proposalContext.brandContactMobile;
    out.brandContactDesignation = proposalContext.brandContactDesignation;
    return out;
  }

  return out;
}

function getProposalContextByProposalId_(proposalId, proposalPropertyId, proposalBrandId) {
  var out = {
    propertyAddress: "",
    brandName: "",
    companyName: "",
    ownerName: "",
    serialNo: "",
    proposalDate: "",
    proposalSender: "",
    brandRemarks: "",
    propertyContactPersons: [],
    brandContactPersons: [],
    propertyContactName: "",
    propertyContactMobile: "",
    brandContactName: "",
    brandContactMobile: "",
    brandContactDesignation: ""
  };

  var proposal = null;
  if (isFilled_(proposalId)) {
    proposal = backendGetById_("Proposals", proposalId);
  }

  var propertyId = proposal ? proposal.propertyId : proposalPropertyId;
  var brandId = proposal ? proposal.brandId : proposalBrandId;

  if (proposal) {
    out.serialNo = proposal.serialNo || "";
    out.proposalDate = proposal.proposalDate || "";
    out.proposalSender = proposal.proposalSender || "";
    out.brandRemarks = proposal.brandRemarks || "";
    out.companyName = proposal.companyName || "";
    out.ownerName = proposal.ownerName || "";
    out.propertyAddress = proposal.propertyAddress || out.propertyAddress;
    out.brandName = proposal.brandName || out.brandName;
  }

  if (isFilled_(propertyId)) {
    var property = backendGetById_("Properties", propertyId);
    out.propertyAddress = (property && (property.address || property.propertyAddress)) || out.propertyAddress;
    var propertyContacts = toContactArraySafe_(property && (property.contactPersonsJson || property.contactPersons));
    out.propertyContactPersons = propertyContacts;
    var propertyContact = firstContactSafe_(propertyContacts);
    if (propertyContact) {
      out.propertyContactName = propertyContact.name;
      out.propertyContactMobile = propertyContact.mobile;
    }
    if (!isFilled_(out.ownerName)) {
      out.ownerName =
        (property && (property.ownerName || property.contactPersonName || property.propertyContactName)) ||
        (propertyContact ? propertyContact.name : "");
    }
  }

  if (isFilled_(brandId)) {
    var brand = backendGetById_("Brands", brandId);
    out.brandName = (brand && (brand.name || brand.brandName)) || out.brandName;
    out.companyName = (brand && (brand.companyName || brand.company)) || out.companyName;
    var brandContacts = toContactArraySafe_(brand && (brand.contactPersonsJson || brand.contactPersons));
    out.brandContactPersons = brandContacts;
    var brandContact = firstContactSafe_(brandContacts);
    if (brandContact) {
      out.brandContactName = brandContact.name;
      out.brandContactMobile = brandContact.mobile;
    }
    if (!isFilled_(out.brandContactDesignation)) {
      out.brandContactDesignation = firstContactDesignation_(brandContacts) || (brand && brand.designation) || "";
    }
  }

  return out;
}

function emitSingleDepositUpdateNotification_(basePayload, previousData, currentData, action) {
  var oldStages = toStageArray_(previousData && previousData.depositStagesJson ? previousData.depositStagesJson : previousData && previousData.depositStages);
  var newStages = toStageArray_(currentData && currentData.depositStagesJson ? currentData.depositStagesJson : currentData && currentData.depositStages);

  if (!oldStages.length && !newStages.length) return;
  if (!depositStagesChanged_(oldStages, newStages)) return;

  var summary = buildDepositSummary_(newStages);
  var payload = copyObject_(basePayload || {});
  payload.depositStagesCount = summary.count;
  payload.totalDepositAmount = summary.totalAmount;
  payload.totalReceivedAmount = summary.totalReceivedAmount;
  payload.latestReceiptDate = summary.latestReceiptDate;
  payload.stageName = summary.firstStageName;
  payload.amount = summary.firstStageAmount;
  payload.receivedAmount = summary.firstStageReceivedAmount;
  payload.receiptDate = summary.firstStageReceiptDate;
  payload.depositAction = action;

  notifySidvinOwner_(SidvinNotificationEvent.DEPOSIT_UPDATE, payload);
}

function depositStagesChanged_(oldStages, newStages) {
  var oldNormalized = oldStages.map(function (stage, idx) { return normalizeStageForCompare_(stage, idx); });
  var newNormalized = newStages.map(function (stage, idx) { return normalizeStageForCompare_(stage, idx); });
  return JSON.stringify(oldNormalized) !== JSON.stringify(newNormalized);
}

function normalizeStageForCompare_(stage, index) {
  stage = stage || {};
  var receipts = toReceiptArray_(stage.receipts).map(function (receipt) {
    receipt = receipt || {};
    return {
      id: String(receipt.id || ""),
      receiptDate: String(receipt.receiptDate || ""),
      receiptAmount: normalizeNumberish_(receipt.receiptAmount)
    };
  });

  return {
    id: String(stage.id || ""),
    stageName: String(stage.stageName || index || ""),
    amount: normalizeNumberish_(stage.amount),
    receivedAmount: normalizeNumberish_(stage.receivedAmount),
    receiptDate: String(stage.receiptDate || ""),
    received: !!stage.received,
    receipts: receipts
  };
}

function normalizeNumberish_(value) {
  if (value === null || value === undefined || value === "") return 0;
  var n = Number(value);
  return isNaN(n) ? 0 : n;
}

function buildDepositSummary_(stages) {
  var count = stages.length;
  var totalAmount = 0;
  var totalReceivedAmount = 0;
  var latestReceiptDate = "";

  for (var i = 0; i < stages.length; i++) {
    var stage = stages[i] || {};
    totalAmount += normalizeNumberish_(stage.amount);
    totalReceivedAmount += normalizeNumberish_(stage.receivedAmount);

    var stageReceiptDate = String(stage.receiptDate || "");
    if (stageReceiptDate && (!latestReceiptDate || stageReceiptDate > latestReceiptDate)) {
      latestReceiptDate = stageReceiptDate;
    }

    var receipts = toReceiptArray_(stage.receipts);
    for (var j = 0; j < receipts.length; j++) {
      var rd = String((receipts[j] || {}).receiptDate || "");
      if (rd && (!latestReceiptDate || rd > latestReceiptDate)) {
        latestReceiptDate = rd;
      }
    }
  }

  var first = stages[0] || {};
  return {
    count: count,
    totalAmount: totalAmount,
    totalReceivedAmount: totalReceivedAmount,
    latestReceiptDate: latestReceiptDate,
    firstStageName: first.stageName || "",
    firstStageAmount: first.amount,
    firstStageReceivedAmount: first.receivedAmount,
    firstStageReceiptDate: first.receiptDate
  };
}

function isAgreementStoreOpeningPayload_(data) {
  data = data || {};
  return (
    isFilled_(data.preparationDate) ||
    isFilled_(data.leaseAgreementRemarks) ||
    isFilled_(data.signingDate) ||
    isFilled_(data.agreementRegistrationDate) ||
    isFilled_(data.storeOpeningDate)
  );
}

function hasAgreementStoreOpeningChange_(previousData, currentData) {
  if (!currentData) return false;
  if (!previousData) return isAgreementStoreOpeningPayload_(currentData);

  var fields = [
    "preparationDate",
    "leaseAgreementRemarks",
    "signingDate",
    "agreementRegistrationDate",
    "storeOpeningDate"
  ];

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var oldVal = String(previousData[field] || "").trim();
    var newVal = String(currentData[field] || "").trim();
    if (oldVal !== newVal) return true;
  }

  return false;
}

function hasTermsAgreementDetailsChange_(previousData, currentData) {
  if (!currentData) return false;

  var fields = [
    "terms",
    "leaseAgreementRemarks",
    "finalizationDate",
    "preparationDate",
    "signingDate",
    "agreementDate",
    "agreementRegistrationDate",
    "storeOpeningDate"
  ];

  if (!previousData) {
    for (var i = 0; i < fields.length; i++) {
      if (isFilled_(currentData[fields[i]])) return true;
    }
    return false;
  }

  for (var j = 0; j < fields.length; j++) {
    var field = fields[j];
    var oldVal = String(previousData[field] || "").trim();
    var newVal = String(currentData[field] || "").trim();
    if (oldVal !== newVal) return true;
  }

  return false;
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

function sendMessage_(waMessage, notificationPayload) {
  if (!isFilled_(waMessage)) {
    throw new Error("Cannot send blank message.");
  }

  var creds = getMessageAutosenderCredentials_();
  var resolved = resolveNotificationRecipients_(notificationPayload || {});
  var primaryResult = sendOwnerAndGroupWithFallback_(resolved, waMessage, creds);

  var failedRecipients = [];
  for (var i = 0; i < resolved.extraMobiles.length; i++) {
    var mobile = resolved.extraMobiles[i];
    try {
      sendMessageRequest_(mobile, [], waMessage, creds);
    } catch (err) {
      failedRecipients.push({
        mobile: mobile,
        error: String(err || "")
      });
      Logger.log("Notification extra recipient failed (" + mobile + "): " + err);
    }
  }

  return {
    statusCode: primaryResult.statusCode,
    body: primaryResult.body,
    recipients: {
      ownerMobile: resolved.ownerMobile,
      groupIds: resolved.groupIds,
      extraMobiles: resolved.extraMobiles,
      failedRecipients: failedRecipients
    }
  };
}

function sendMessageRequest_(receiverMobileNo, recipientIds, waMessage, creds) {
  var payload = {
    receiverMobileNo: String(receiverMobileNo || "").trim(),
    recipientIds: Array.isArray(recipientIds) ? recipientIds : [],
    message: [String(waMessage)]
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      accept: "application/json",
      Authorization: "Basic " + Utilities.base64Encode(creds.username + ":" + creds.password)
    }
  };

  var response = UrlFetchApp.fetch(SIDVIN_NOTIFICATION_CONFIG.API_URL, options);
  var statusCode = response.getResponseCode();
  var body = response.getContentText();
  Logger.log("Notification status: " + statusCode + " body: " + body + " receiver: " + payload.receiverMobileNo);

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Message API failed: " + statusCode + " - " + body);
  }

  return { statusCode: statusCode, body: body };
}

function sendOwnerAndGroupWithFallback_(resolved, waMessage, creds) {
  var combinedErr = "";
  var ownerErr = "";
  var groupErr = "";

  try {
    return sendMessageRequest_(
      resolved.ownerMobile,
      resolved.groupIds,
      waMessage,
      creds
    );
  } catch (errCombined) {
    combinedErr = String(errCombined || "");
    Logger.log("Owner+group combined send failed: " + combinedErr);
  }

  var ownerResult = null;
  var groupResult = null;
  try {
    ownerResult = sendMessageRequest_(resolved.ownerMobile, [], waMessage, creds);
  } catch (errOwner) {
    ownerErr = String(errOwner || "");
    Logger.log("Owner-only send failed: " + ownerErr);
  }

  if (resolved.groupIds && resolved.groupIds.length) {
    try {
      groupResult = sendMessageRequest_(resolved.ownerMobile, resolved.groupIds, waMessage, creds);
    } catch (errGroup) {
      groupErr = String(errGroup || "");
      Logger.log("Group-only send failed: " + groupErr);
    }
  }

  if (ownerResult || groupResult) {
    return ownerResult || groupResult;
  }

  throw new Error(
    "Owner/group delivery failed. combined=" + combinedErr +
    " owner=" + ownerErr +
    " group=" + groupErr
  );
}

function resolveNotificationRecipients_(payload) {
  payload = payload || {};
  var ownerMobile = normalizeRecipientMobile_(SIDVIN_NOTIFICATION_CONFIG.OWNER_MOBILE);
  if (!isFilled_(ownerMobile)) {
    throw new Error("Missing OWNER_MOBILE in SIDVIN_NOTIFICATION_CONFIG.");
  }

  var groupIds = [];
  if (isFilled_(SIDVIN_NOTIFICATION_CONFIG.OWNER_GROUP_ID)) {
    groupIds.push(String(SIDVIN_NOTIFICATION_CONFIG.OWNER_GROUP_ID).trim());
  }

  var propertyRaw = [];
  propertyRaw = propertyRaw.concat(extractContactMobiles_(payload.propertyContactPersonsJson || payload.propertyContactPersons));
  propertyRaw = propertyRaw.concat(extractContactMobiles_(payload.propertyContacts));
  propertyRaw.push(payload.propertyContactMobile);
  propertyRaw.push(payload.propertyContactPersonMobile);
  propertyRaw.push(payload.propertyContactPhone);
  propertyRaw.push(payload.ownerMobile);
  propertyRaw = propertyRaw.concat(extractMobilesFromText_(payload.propertyContactMobiles));

  var brandRaw = [];
  brandRaw = brandRaw.concat(extractContactMobiles_(payload.brandContactPersonsJson || payload.brandContactPersons));
  brandRaw = brandRaw.concat(extractContactMobiles_(payload.brandContacts));
  brandRaw.push(payload.brandContactMobile);
  brandRaw.push(payload.brandContactPersonMobile);
  brandRaw.push(payload.brandContactPhone);
  brandRaw.push(payload.brandMobile);
  brandRaw = brandRaw.concat(extractMobilesFromText_(payload.brandContactMobiles));

  var otherRaw = [];
  otherRaw = otherRaw.concat(extractContactMobiles_(payload.contactPersonsJson || payload.contactPersons));
  otherRaw = otherRaw.concat(extractContactMobiles_(payload.contacts));
  otherRaw.push(payload.contactMobile);
  otherRaw.push(payload.mobile);
  otherRaw = otherRaw.concat(extractMobilesFromText_(payload.additionalRecipientMobiles));

  var seen = {};
  seen[ownerMobile] = true;

  var propertyMobiles = uniqueNormalizedMobiles_(propertyRaw, seen);
  var brandMobiles = uniqueNormalizedMobiles_(brandRaw, seen);
  var otherMobiles = uniqueNormalizedMobiles_(otherRaw, seen);
  var extraMobiles = propertyMobiles.concat(brandMobiles).concat(otherMobiles);

  return {
    ownerMobile: ownerMobile,
    groupIds: groupIds,
    extraMobiles: extraMobiles,
    propertyMobiles: propertyMobiles,
    brandMobiles: brandMobiles,
    otherMobiles: otherMobiles
  };
}

function uniqueNormalizedMobiles_(values, seen) {
  var out = [];
  var localSeen = seen || {};
  var list = values || [];
  for (var i = 0; i < list.length; i++) {
    var normalized = normalizeRecipientMobile_(list[i]);
    if (!isFilled_(normalized) || localSeen[normalized]) continue;
    localSeen[normalized] = true;
    out.push(normalized);
  }
  return out;
}

function extractContactMobiles_(contactsValue) {
  var contacts = toContactArray_(contactsValue);
  var mobiles = [];
  for (var i = 0; i < contacts.length; i++) {
    var c = contacts[i] || {};
    mobiles.push(
      c.mobile ||
      c.mobileNo ||
      c.mobileNumber ||
      c.mobile_number ||
      c.phone ||
      c.phoneNo ||
      c.phoneNumber ||
      c.contactMobile ||
      c.whatsapp ||
      c.whatsappNo ||
      c.whatsappNumber ||
      c.whatsApp ||
      ""
    );
    mobiles = mobiles.concat(extractMobilesFromText_(c.mobileNumbers || c.phones || c.contactMobiles));
  }
  return mobiles;
}

function extractMobilesFromText_(value) {
  if (!isFilled_(value)) return [];
  if (Array.isArray(value)) {
    var out = [];
    for (var i = 0; i < value.length; i++) {
      out = out.concat(extractMobilesFromText_(value[i]));
    }
    return out;
  }
  var matches = String(value).match(/\+?\d[\d\s\-()]{8,}\d/g);
  return matches ? matches : [];
}

function toContactArray_(value) {
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

function normalizeRecipientMobile_(value) {
  if (!isFilled_(value)) return "";
  var digits = String(value).replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.indexOf("91") === 0) {
    return digits.substring(2);
  }
  if (digits.length > 10) {
    return digits.substring(digits.length - 10);
  }
  return digits;
}

function sendMessageToMobiles_(mobiles, waMessage, creds) {
  var list = Array.isArray(mobiles) ? mobiles : [];
  var failed = [];
  for (var i = 0; i < list.length; i++) {
    try {
      sendMessageRequest_(list[i], [], waMessage, creds);
    } catch (err) {
      failed.push({
        mobile: list[i],
        error: String(err || "")
      });
      Logger.log("Notification recipient failed (" + list[i] + "): " + err);
    }
  }
  return failed;
}

function splitPropertyAndBrandMessage_(combinedMessage) {
  var message = String(combinedMessage || "");
  if (!isFilled_(message)) return { propertyMessage: "", brandMessage: "" };

  // Messages that contain both Property + Brand sections are joined with "\n\n"
  // and the second section always starts with "Dear ...". Split generically so it
  // works for "Dear Mr.", "Dear Madam", "Dear Sir", etc.
  var idx = message.indexOf("\n\nDear ");
  var offset = 2;
  if (idx < 0) {
    idx = message.indexOf("\r\n\r\nDear ");
    offset = 4;
  }
  if (idx < 0) return { propertyMessage: message, brandMessage: "" };
  return {
    propertyMessage: message.substring(0, idx),
    brandMessage: message.substring(idx + offset) // keep the "Dear ..." line
  };
}

function sendSplitMessagesByAudience_(payload, propertyMessage, brandMessage) {
  var safePayload = payload || {};
  var creds = getMessageAutosenderCredentials_();
  var resolved = resolveNotificationRecipients_(safePayload);
  var failedRecipients = [];
  var ownerCombinedMessage = joinMessageSections_([propertyMessage, brandMessage]);
  var ownerResult = null;

  if (isFilled_(propertyMessage)) {
    ownerResult = sendOwnerAndGroupWithFallback_(resolved, propertyMessage, creds);
  }
  if (isFilled_(brandMessage)) {
    var brandOwnerResult = sendOwnerAndGroupWithFallback_(resolved, brandMessage, creds);
    if (!ownerResult) ownerResult = brandOwnerResult;
  }
  if (!ownerResult && isFilled_(ownerCombinedMessage)) {
    ownerResult = sendOwnerAndGroupWithFallback_(resolved, ownerCombinedMessage, creds);
  }

  if (isFilled_(propertyMessage)) {
    failedRecipients = failedRecipients.concat(sendMessageToMobiles_(resolved.propertyMobiles, propertyMessage, creds));
  }
  if (isFilled_(brandMessage)) {
    failedRecipients = failedRecipients.concat(sendMessageToMobiles_(resolved.brandMobiles, brandMessage, creds));
  }
  if (isFilled_(ownerCombinedMessage)) {
    failedRecipients = failedRecipients.concat(sendMessageToMobiles_(resolved.otherMobiles, ownerCombinedMessage, creds));
  }

  return {
    statusCode: ownerResult ? ownerResult.statusCode : 200,
    body: ownerResult ? ownerResult.body : "No owner/group message sent",
    recipients: {
      ownerMobile: resolved.ownerMobile,
      groupIds: resolved.groupIds,
      propertyMobiles: resolved.propertyMobiles,
      brandMobiles: resolved.brandMobiles,
      otherMobiles: resolved.otherMobiles,
      failedRecipients: failedRecipients
    }
  };
}

function sendOwnerGroupOnly_(payload, waMessage) {
  var safePayload = payload || {};
  var creds = getMessageAutosenderCredentials_();
  var resolved = resolveNotificationRecipients_(safePayload);
  var result = sendOwnerAndGroupWithFallback_(resolved, waMessage, creds);
  return {
    statusCode: result ? result.statusCode : 200,
    body: result ? result.body : "No owner/group message sent",
    recipients: {
      ownerMobile: resolved.ownerMobile,
      groupIds: resolved.groupIds
    }
  };
}

function buildProposalOwnerCompactMessage_(payload) {
  var propertyAddress = valueOrFallback_(payload.propertyAddress, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName, "brandName");
  var proposalDate = valueOrFallback_(payload.proposalDate, "proposalDate");
  var proposalSender = valueOrFallback_(payload.proposalSender, "proposalSender");
  var brandRemarks = valueOrFallback_(payload.brandRemarks, "brandRemarks");
  var updatedBy = valueOrFallback_(payload.updatedBy, "updatedBy");

  return joinMessageLines_([
    "Dear Sir,",
    "",
    "Property: *" + propertyAddress + "*",
    "Brand: *" + brandName + "*",
    "Proposal Date: *" + proposalDate + "*",
    "Proposal Sender: *" + proposalSender + "*",
    "Brand Remarks: *" + brandRemarks + "*",
    "Update By: *" + updatedBy + "*",
    ""
  ].concat(buildSignatureLines_()));
}

function notifyProposalUpdated_(payload) {
  var safePayload = payload || {};
  var creds = getMessageAutosenderCredentials_();
  var resolved = resolveNotificationRecipients_(safePayload);

  var failedRecipients = [];
  var propertyMessage = buildProposalPropertyMessage_(safePayload);
  var brandMessage = buildProposalBrandMessage_(safePayload);

  // Also deliver both proposal messages to owner mobile + owner group.
  if (isFilled_(propertyMessage)) {
    sendOwnerAndGroupWithFallback_(resolved, propertyMessage, creds);
  }
  if (isFilled_(brandMessage)) {
    sendOwnerAndGroupWithFallback_(resolved, brandMessage, creds);
  }

  failedRecipients = failedRecipients.concat(sendMessageToMobiles_(resolved.propertyMobiles, propertyMessage, creds));
  failedRecipients = failedRecipients.concat(sendMessageToMobiles_(resolved.brandMobiles, brandMessage, creds));

  return {
    statusCode: 200,
    body: "Proposal templates sent to property/brand contacts",
    recipients: {
      propertyMobiles: resolved.propertyMobiles,
      brandMobiles: resolved.brandMobiles,
      failedRecipients: failedRecipients
    }
  };
}

function notifySidvinOwner_(eventType, payload) {
  payload = payload || {};
  try {
    var result;
    if (
      eventType === SidvinNotificationEvent.PROPOSAL_CANCELLED ||
      eventType === SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED ||
      eventType === SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED ||
      eventType === SidvinNotificationEvent.DEPOSIT_UPDATE ||
      eventType === SidvinNotificationEvent.RECEIPT_UPDATE ||
      eventType === SidvinNotificationEvent.SUCCESS_STORY_BILLED
    ) {
      var ownerOnlyMessage = buildSidvinNotificationMessage_(eventType, payload);
      if (!isFilled_(ownerOnlyMessage)) {
        writeNotificationAudit_("NOTIFY_SKIPPED_TEMPLATE_ONLY", {
          eventType: eventType,
          proposalId: payload && payload.proposalId ? payload.proposalId : "",
          recordId: payload && payload.id ? payload.id : ""
        });
        return { skipped: true, reason: "Template-only mode: event not in approved templates." };
      }
      if (eventType === SidvinNotificationEvent.SUCCESS_STORY_BILLED) {
        var splitOwner = splitPropertyAndBrandMessage_(ownerOnlyMessage);
        var ownerPropertyMessage = splitOwner.propertyMessage;
        var ownerBrandMessage = splitOwner.brandMessage;
        if (isFilled_(ownerPropertyMessage)) {
          result = sendOwnerGroupOnly_(payload, ownerPropertyMessage);
        }
        if (isFilled_(ownerBrandMessage)) {
          var brandResult = sendOwnerGroupOnly_(payload, ownerBrandMessage);
          if (!result) result = brandResult;
        }
        if (!result) {
          result = sendOwnerGroupOnly_(payload, ownerOnlyMessage);
        }
      } else {
        result = sendOwnerGroupOnly_(payload, ownerOnlyMessage);
      }
      writeNotificationAudit_("NOTIFY_SUCCESS", {
        eventType: eventType,
        proposalId: payload && payload.proposalId ? payload.proposalId : "",
        recordId: payload && payload.id ? payload.id : "",
        serialNo: payload && payload.serialNo ? payload.serialNo : "",
        propertyAddress: payload && payload.propertyAddress ? payload.propertyAddress : "",
        brandName: payload && payload.brandName ? payload.brandName : ""
      });
      return result;
    }
    if (eventType === SidvinNotificationEvent.PROPOSAL_UPDATED) {
      result = notifyProposalUpdated_(payload);
    } else if (
      eventType === SidvinNotificationEvent.VISIT_SCHEDULED ||
      eventType === SidvinNotificationEvent.VISIT_COMPLETED ||
      eventType === SidvinNotificationEvent.FOLLOW_UP_DONE ||
      eventType === SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED ||
      eventType === SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED
    ) {
      if (eventType === SidvinNotificationEvent.FOLLOW_UP_DONE) {
        var guardedFollowUpStatus = String(payload.status || "").trim().toLowerCase();
        if (guardedFollowUpStatus !== "follow up again") {
          writeNotificationAudit_("NOTIFY_SKIPPED_FOLLOWUP_STATUS", {
            eventType: eventType,
            followUpStatus: guardedFollowUpStatus,
            proposalId: payload && payload.proposalId ? payload.proposalId : "",
            recordId: payload && payload.id ? payload.id : ""
          });
          return { skipped: true, reason: "Follow-up notifications are enabled only for Follow Up Again status." };
        }
      }
      var combined = buildSidvinNotificationMessage_(eventType, payload);
      if (!isFilled_(combined)) {
        writeNotificationAudit_("NOTIFY_SKIPPED_TEMPLATE_ONLY", {
          eventType: eventType,
          proposalId: payload && payload.proposalId ? payload.proposalId : "",
          recordId: payload && payload.id ? payload.id : ""
        });
        return { skipped: true, reason: "Template-only mode: event not in approved templates." };
      }
      var split = splitPropertyAndBrandMessage_(combined);
      var propertyMessage = split.propertyMessage;
      var brandMessage = split.brandMessage;

      if (eventType === SidvinNotificationEvent.FOLLOW_UP_DONE) {
        var followUpStatus = String(payload.status || "").trim().toLowerCase();
        // Brand contact should also receive follow-up messages.
      }

      if (
        eventType === SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED ||
        eventType === SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED
      ) {
        // Per latest rule: no pending terms/agreement message to brand contact.
        brandMessage = "";
      }

      result = sendSplitMessagesByAudience_(payload, propertyMessage, brandMessage);
    } else {
      var message = buildSidvinNotificationMessage_(eventType, payload);
      if (!isFilled_(message)) {
        writeNotificationAudit_("NOTIFY_SKIPPED_TEMPLATE_ONLY", {
          eventType: eventType,
          proposalId: payload && payload.proposalId ? payload.proposalId : "",
          recordId: payload && payload.id ? payload.id : ""
        });
        return { skipped: true, reason: "Template-only mode: event not in approved templates." };
      }
      result = sendMessage_(message, payload);
    }
    writeNotificationAudit_("NOTIFY_SUCCESS", {
      eventType: eventType,
      proposalId: payload && payload.proposalId ? payload.proposalId : "",
      recordId: payload && payload.id ? payload.id : "",
      serialNo: payload && payload.serialNo ? payload.serialNo : "",
      propertyAddress: payload && payload.propertyAddress ? payload.propertyAddress : "",
      brandName: payload && payload.brandName ? payload.brandName : ""
    });
    return result;
  } catch (err) {
    writeNotificationAudit_("NOTIFY_ERROR", {
      eventType: eventType,
      error: String(err || ""),
      proposalId: payload && payload.proposalId ? payload.proposalId : "",
      recordId: payload && payload.id ? payload.id : "",
      serialNo: payload && payload.serialNo ? payload.serialNo : "",
      propertyAddress: payload && payload.propertyAddress ? payload.propertyAddress : "",
      brandName: payload && payload.brandName ? payload.brandName : ""
    });
    throw err;
  }
}

/**
 * Optional helper for manual mapping from mutation payloads.
 */
function notifySidvinFromMutation_(mutation) {
  if (!mutation || !mutation.entity || !mutation.data) return null;

  var entity = String(mutation.entity);
  var data = mutation.data || {};
  var updatedBy = mutation.updatedBy || data.updatedBy || "System";
  var base = copyObject_(data);
  base.updatedBy = updatedBy;

  if (isFilled_(mutation.propertyAddress) && !isFilled_(base.propertyAddress)) {
    base.propertyAddress = mutation.propertyAddress;
  }
  if (isFilled_(mutation.brandName) && !isFilled_(base.brandName)) {
    base.brandName = mutation.brandName;
  }

  switch (entity) {
    case "Properties":
      if (String(mutation.action || "").trim().toLowerCase() === "create") {
        return notifySidvinOwner_(SidvinNotificationEvent.PROPERTY_UPDATE, base);
      }
      return null;
    case "Brands":
      if (String(mutation.action || "").trim().toLowerCase() === "create") {
        return notifySidvinOwner_(SidvinNotificationEvent.BRAND_UPDATE, base);
      }
      return null;
    case "CompanyMaster":
    case "CategoryMaster":
    case "SidvinTeam":
    case "SidvinTeamMembers":
    case "Sidvin Team Members":
      return null;
    case "Proposals":
      if (String(mutation.action || "").toLowerCase() === "create") {
        notifySidvinOwner_(SidvinNotificationEvent.PROPOSAL_UPDATED, base);
      }
      if (isFilled_(base.invoiceNo) || isFilled_(base.invoiceDate) || isFilled_(base.invoiceAmount)) {
        notifySidvinOwner_(SidvinNotificationEvent.SUCCESS_STORY_BILLED, base);
      }
      return true;
    case "FollowUps":
      if (String(base.status || "").trim().toLowerCase() !== "follow up again") {
        return null;
      }
      return notifySidvinOwner_(SidvinNotificationEvent.FOLLOW_UP_DONE, base);
    case "Visits":
      if (isFilled_(base.visitDate)) {
        return notifySidvinOwner_(SidvinNotificationEvent.VISIT_COMPLETED, base);
      }
      return notifySidvinOwner_(SidvinNotificationEvent.VISIT_SCHEDULED, base);
    case "TermSheets":
      if (isAgreementStoreOpeningPayload_(base)) {
        notifySidvinOwner_(SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED, base);
      } else {
        notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, base);
      }
      return true;
    default:
      return null;
  }
}

function buildSidvinNotificationMessage_(eventType, payload) {
  payload = payload || {};
  switch (eventType) {
    case SidvinNotificationEvent.PROPERTY_UPDATE:
      return buildPropertyRegistrationMessage_(payload);
    case SidvinNotificationEvent.BRAND_UPDATE:
      return buildBrandPersonMessage_(payload);
    case SidvinNotificationEvent.PROPOSAL_UPDATED:
      return buildProposalMessage_(payload);
    case SidvinNotificationEvent.VISIT_SCHEDULED:
      return buildVisitMessage_(payload, "scheduled");
    case SidvinNotificationEvent.VISIT_COMPLETED:
      return buildVisitMessage_(payload, "completed");
    case SidvinNotificationEvent.FOLLOW_UP_DONE:
      return buildFollowUpMeetingMessage_(payload);
    case SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED:
    case SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED:
      return buildTermsAgreementUpdatedMessage_(payload);
    case SidvinNotificationEvent.SUCCESS_STORY_BILLED:
      return buildDealClosedMessage_(payload);
    case SidvinNotificationEvent.PROPOSAL_CANCELLED:
      return buildProposalCancelledOwnerMessage_(payload);
    case SidvinNotificationEvent.MASTER_UPDATE:
      return "";
    case SidvinNotificationEvent.TEAM_UPDATE:
      return "";
    case SidvinNotificationEvent.TECHNICAL_SPECS_FINALIZED:
      return "";
    case SidvinNotificationEvent.DEPOSIT_UPDATE:
      return buildDepositOwnerMessage_(payload);
    case SidvinNotificationEvent.RECEIPT_UPDATE:
      return buildReceiptOwnerMessage_(payload);
    default:
      return "";
  }
}

function buildPropertyRegistrationMessage_(payload) {
  var visitDoneDate = valueOrFallback_(payload.visitDate || payload.createdAt, "Date");
  var propertyName = valueOrFallback_(payload.propertyName || payload.propertyAddress || payload.address, "propertyName");
  var salutation = resolvePropertyOwnerSalutation_(payload);
  return joinMessageLines_([
    "Dear " + salutation + ",",
    "",
    "Thank you for registering your property at  *" + propertyName + "* with us. A site visit to your property was conducted on *" + visitDoneDate + "*. We look forward to a long-term association with you.",
    ""
  ].concat(buildSignatureLines_()));
}

function buildBrandPersonMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var salutation = resolveBrandContactSalutation_(payload);

  return joinMessageLines_([
    "Dear " + salutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "Thank you for trusting us for your commercial property requirements for the brand *" + brandName + "*. We will be sharing property proposals at the earliest.",
    ""
  ].concat(buildSignatureLines_()));
}

function buildProposalMessage_(payload) {
  return joinMessageSections_([
    buildProposalPropertyMessage_(payload),
    buildProposalBrandMessage_(payload)
  ]);
}

function buildProposalPropertyMessage_(payload) {
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var proposalDate = valueOrFallback_(payload.proposalDate, "Date");
  var salutation = resolvePropertyOwnerSalutation_(payload);

  return joinMessageLines_([
    "Dear " + salutation + ",",
    "",
    "We have proposed your property at " + address + " to " + brandName + " on " + proposalDate + ". We are awaiting a site visit from the company soon. The details of the site visit shall be updated soon.",
    ""
  ].concat(buildSignatureLines_()));
}

function buildProposalBrandMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var salutation = resolveBrandContactSalutation_(payload);

  return joinMessageLines_([
    "Dear " + salutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "We have sent a property proposal for brand " + brandName + " at location " + address + " via email. Kindly review and share your feedback.",
    ""
  ].concat(buildSignatureLines_()));
}

function buildVisitMessage_(payload, status) {
  var visitStatus = String(status || "").toLowerCase() === "completed" ? "completed" : "scheduled";
  var brandContact = resolveBrandContactName_(payload);
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var dateValue = valueOrFallback_(payload.visitDate || payload.scheduledDate, "Date");
  var propertySalutation = resolvePropertyOwnerSalutation_(payload);
  var brandSalutation = resolveBrandContactSalutation_(payload);

  var propertyLine = visitStatus === "completed"
    ? "The site visit for your property located at " + address + " has been completed on " + dateValue + " by the brand " + brandName + " We will keep you updated."
    : "A site visit for your property located at " + address + " is scheduled on " + dateValue + " with " + brandName + ". Kindly ensure your availability (or your team's availability) for the same.";

  var brandLine = visitStatus === "completed"
    ? "Thank you for visiting the property for " + brandName + " located at " + address + " and sharing your insights.\nKindly let us know how can we take this deal further."
    : "A site visit has been confirmed for the property located at " + address + " for the brand " + brandName + " on " + dateValue + ".";

  var propertySection = joinMessageLines_([
    "Dear " + propertySalutation + ",",
    "",
    propertyLine,
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear " + brandSalutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    brandLine,
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
}

function buildFollowUpMeetingMessage_(payload) {
  var remarks = String(payload.remarks || "").toLowerCase();
  var status = String(payload.status || "").toLowerCase();
  if (status === "schedule visit" || status === "update") {
    return buildClientMeetingMessage_(payload);
  }
  if (isVirtualMeetingType_(payload)) return buildVirtualMeetingMessage_(payload);
  return buildClientMeetingMessage_(payload);
}

function buildClientMeetingMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var dateValue = valueOrFallback_(resolveMeetingDate_(payload), "Date");
  var timeValue = valueOrFallback_(resolveMeetingTime_(payload), "Time");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var propertySalutation = resolvePropertyOwnerSalutation_(payload);
  var brandSalutation = resolveBrandContactSalutation_(payload);

  var propertySection = joinMessageLines_([
    "Dear " + propertySalutation + ",",
    "",
    "A meeting has been scheduled with the officials of " + brandName + " on " + dateValue + " at " + timeValue + " for your property located at " + address + ". The meeting place shall be updated shortly.",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear " + brandSalutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "A meeting has been scheduled with the property owner of the property located at " + address + " for " + brandName + " on " + dateValue + " at " + timeValue + ". The meeting place shall be updated shortly.",
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
}

function buildVirtualMeetingMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var dateValue = valueOrFallback_(resolveMeetingDate_(payload), "Date");
  var timeValue = valueOrFallback_(resolveMeetingTime_(payload), "Time");
  var linkValue = valueOrFallback_(resolveMeetingLink_(payload), "Link");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var propertySalutation = resolvePropertyOwnerSalutation_(payload);
  var brandSalutation = resolveBrandContactSalutation_(payload);

  var propertySection = joinMessageLines_([
    "Dear " + propertySalutation + ",",
    "",
    "A virtual meeting with the officials of " + brandName + " for your property located at " + address + " is scheduled on " + dateValue + " at " + timeValue + ". Please join via " + linkValue + ".",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear " + brandSalutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "A virtual meeting with the owner of the property located at " + address + " for your brand " + brandName + " is scheduled on " + dateValue + " at " + timeValue + ". Please join via " + linkValue + ".",
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
}

function buildPendingTermsAgreementMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var dateValue = valueOrFallback_(resolveMeetingDate_(payload), "Date");
  var timeValue = valueOrFallback_(resolveMeetingTime_(payload), "Time");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var propertySalutation = resolvePropertyOwnerSalutation_(payload);
  var brandSalutation = resolveBrandContactSalutation_(payload);

  var propertySection = joinMessageLines_([
    "Dear " + propertySalutation + ",",
    "",
    "A meeting with the officials of the brand " + brandName + " is scheduled on " + dateValue + " at " + timeValue + " to finalize pending terms and conditions. Please be available. The meeting place shall be updated shortly",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear " + brandSalutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "A meeting is being scheduled  with the owner of the property located at *" + address + "* for your brand " + brandName + " is scheduled on " + dateValue + " at " + timeValue + ". The meeting place shall be updated shortly.",
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
}

function buildTermsAgreementUpdatedMessage_(payload) {
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var salutation = resolvePropertyOwnerSalutation_(payload);

  var finalizationDate = valueOrFallback_(payload.finalizationDate, "finalizationDate");
  var preparationDate = valueOrFallback_(payload.preparationDate, "preparationDate");
  var signingDate = valueOrFallback_(payload.signingDate, "signingDate");
  var agreementRegistrationDate = valueOrFallback_(payload.agreementRegistrationDate, "agreementRegistrationDate");
  var storeOpeningDate = valueOrFallback_(payload.storeOpeningDate, "storeOpeningDate");
  var remarks = payload.leaseAgreementRemarks || payload.terms || payload.remarks || "";

  var lines = [
    "Dear " + salutation + ",",
    "",
    "Terms / Agreement details have been updated for the property located at *" + address + "* with the brand *" + brandName + "*.",
    "Finalization Date: *" + finalizationDate + "*",
    "Preparation Date: *" + preparationDate + "*",
    "Signing Date: *" + signingDate + "*",
    "Agreement Registration Date: *" + agreementRegistrationDate + "*",
    "Store Opening Date: *" + storeOpeningDate + "*"
  ];

  if (isFilled_(remarks)) {
    lines.push("Remarks: *" + stringifyValue_(remarks) + "*");
  }

  lines.push("");
  return joinMessageLines_(lines.concat(buildSignatureLines_()));
}

function buildDealClosedMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var propertySalutation = resolvePropertyOwnerSalutation_(payload);
  var brandSalutation = resolveBrandContactSalutation_(payload);

  var propertySection = joinMessageLines_([
    "Dear " + propertySalutation + ",",
    "",
    "Congratulations on successful completion of the lease deal for your property located at *" + address + "* with the brand " + brandName + ". Thank you for trusting us.",
    "",
    "We look forward for more business in future.",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear " + brandSalutation + " *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "Congratulations on successful deal closure for your brand " + brandName + " in the property at *" + address + "*. We look forward for more business in future.",
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
}

function buildProposalCancelledOwnerMessage_(payload) {
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var reason =
    payload.cancelRemarks ||
    payload.cancellationReason ||
    payload.cancelReason ||
    payload.remarks ||
    "";
  var salutation = resolvePropertyOwnerSalutation_(payload);

  return joinMessageLines_([
    "Dear " + salutation + ",",
    "",
    "The proposal for the property located at *" + address + "* with the brand *" + brandName + "* has been cancelled.",
    isFilled_(reason) ? ("Reason: *" + stringifyValue_(reason) + "*") : "",
    ""
  ].concat(buildSignatureLines_()));
}

function buildDepositOwnerMessage_(payload) {
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var stageName = valueOrFallback_(payload.stageName, "stageName");
  var amountDue = valueOrFallback_(payload.amount, "amountDue");
  var totalReceived = valueOrFallback_(payload.receivedAmount || payload.totalReceivedAmount, "totalReceivedAmount");
  var latestReceiptDate = valueOrFallback_(payload.receiptDate || payload.latestReceiptDate, "receiptDate");
  var salutation = resolvePropertyOwnerSalutation_(payload);

  return joinMessageLines_([
    "Dear " + salutation + ",",
    "",
    "Deposit details have been updated for the property located at *" + address + "* with the brand *" + brandName + "*.",
    "Deposit Stage: *" + stageName + "*",
    "Amount Due: *" + amountDue + "*",
    "Total Received: *" + totalReceived + "*",
    "Latest Receipt Date: *" + latestReceiptDate + "*",
    ""
  ].concat(buildSignatureLines_()));
}

function buildReceiptOwnerMessage_(payload) {
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var stageName = valueOrFallback_(payload.stageName, "stageName");
  var receiptAmount = valueOrFallback_(payload.receiptAmount, "receiptAmount");
  var receiptDate = valueOrFallback_(payload.receiptDate, "receiptDate");
  var salutation = resolvePropertyOwnerSalutation_(payload);

  return joinMessageLines_([
    "Dear " + salutation + ",",
    "",
    "A payment receipt has been recorded for the property located at *" + address + "* with the brand *" + brandName + "*.",
    "Deposit Stage: *" + stageName + "*",
    "Receipt Amount: *" + receiptAmount + "*",
    "Receipt Date: *" + receiptDate + "*",
    ""
  ].concat(buildSignatureLines_()));
}

function buildCompactNotification_(title, fields) {
  var lines = [title];
  for (var i = 0; i < fields.length; i++) {
    var label = fields[i][0];
    var value = fields[i][1];
    if (!isFilled_(value)) continue;
    lines.push(label + ": " + stringifyValue_(value));
  }
  return joinMessageLines_(lines);
}

function buildSignatureLines_() {
  return [
    "Best Regards.",
    "",
    "*Siddvin RLT*",
    "Founder: *Mr. Vikaas D Goenka*",
    "Call: +91 9117706555"
  ];
}

function joinMessageSections_(sections) {
  return (sections || []).filter(function (s) { return isFilled_(s); }).join("\n\n");
}

function joinMessageLines_(lines) {
  return (lines || [])
    .filter(function (line) { return line !== null && line !== undefined; })
    .map(function (line) { return String(line); })
    .join("\n");
}

function slot_(value, label) {
  if (isFilled_(value)) return stringifyValue_(value);
  return "<" + String(label || "value") + ">";
}

function slotToken_(value, token) {
  if (isFilled_(value)) return stringifyValue_(value);
  return "{" + String(token || "value") + "}";
}

function valueOrFallback_(value, token) {
  if (isFilled_(value)) {
    var tokenText = String(token || "");
    if (/date/i.test(tokenText)) {
      return formatDateForMessage_(value);
    }
    return stringifyValue_(value);
  }
  return slotToken_(value, token);
}

function formatDateForMessage_(value) {
  if (!isFilled_(value)) return "N/A";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    var tzDate = Session.getScriptTimeZone() || "Asia/Kolkata";
    return Utilities.formatDate(value, tzDate, "dd/MM/yyyy");
  }

  var raw = String(value).trim();
  if (!raw) return "N/A";

  var m = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return m[1] + "/" + m[2] + "/" + m[3];

  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];

  m = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})(?:[T\s].*)?$/);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];

  var parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    var tz = Session.getScriptTimeZone() || "Asia/Kolkata";
    return Utilities.formatDate(parsed, tz, "dd/MM/yyyy");
  }

  return raw;
}

function resolvePropertyContactName_(payload) {
  return (
    payload.propertyContactName ||
    payload.propertyContactPersonName ||
    payload.contactPersonName ||
    firstContactName_(payload.propertyContactPersons) ||
    firstContactName_(payload.contactPersonsJson || payload.contactPersons)
  );
}

function resolveBrandContactName_(payload) {
  return (
    payload.brandContactName ||
    payload.brandContactPersonName ||
    firstContactName_(payload.brandContactPersons) ||
    firstContactName_(payload.contactPersonsJson || payload.contactPersons)
  );
}

function resolveBrandDesignation_(payload) {
  return (
    payload.brandContactDesignation ||
    payload.designation ||
    firstContactDesignation_(payload.brandContactPersons) ||
    firstContactDesignation_(payload.contactPersonsJson || payload.contactPersons)
  );
}

function resolveOwnerName_(payload) {
  return (
    payload.ownerName ||
    payload.owner ||
    payload.propertyOwnerName ||
    payload.propertyContactName ||
    payload.contactPersonName ||
    firstContactName_(payload.propertyContactPersons) ||
    firstContactName_(payload.contactPersonsJson || payload.contactPersons)
  );
}

function resolveMeetingDate_(payload) {
  return (
    payload.meetingDate ||
    payload.nextFollowUpDate ||
    payload.followUpDate ||
    payload.finalizationDate ||
    payload.agreementDate ||
    payload.scheduledDate ||
    payload.visitDate ||
    payload.proposalDate
  );
}

function resolveMeetingTime_(payload) {
  return (
    payload.meetingTime ||
    payload.nextFollowUpTime ||
    payload.followUpTime ||
    payload.scheduledTime ||
    payload.scheduled_time ||
    payload.visitTime ||
    payload.time
  );
}

function resolveMeetingLink_(payload) {
  return payload.meetingLink || payload.zoomLink || payload.virtualMeetingLink || payload.link;
}

function resolvePropertyOwnerSalutation_(payload) {
  var contacts = toContactArraySafe_(payload && (payload.contactPersonsJson || payload.contactPersons));
  if (contacts.length > 0 && isFilled_(contacts[0].salutation)) {
    return contacts[0].salutation;
  }
  return "Sir";
}

function resolveBrandContactSalutation_(payload) {
  var contacts = toContactArraySafe_(payload && (payload.brandContactPersonsJson || payload.brandContactPersons));
  if (contacts.length > 0 && isFilled_(contacts[0].salutation)) {
    return contacts[0].salutation;
  }
  return "Sir";
}

function resolvePropertyOwnerSalutation_(payload) {
  var contacts = toContactArraySafe_(payload && (payload.contactPersonsJson || payload.contactPersons));
  if (contacts.length > 0 && isFilled_(contacts[0].salutation)) {
    return contacts[0].salutation;
  }
  return "Sir";
}

function resolveBrandContactSalutation_(payload) {
  var contacts = toContactArraySafe_(payload && (payload.brandContactPersonsJson || payload.brandContactPersons));
  if (contacts.length > 0 && isFilled_(contacts[0].salutation)) {
    return contacts[0].salutation;
  }
  return "Sir";
}

function resolveTrackingLink_(payload) {
  return payload.liveTrackingLink || payload.trackingLink || payload.proposalTrackingLink || payload.googleMapsLink || "https://sidvin-workflow.vercel.app/";
}

function isVirtualMeetingType_(payload) {
  var mt = String(
    (payload && (
      payload.meetingType ||
      payload.meeting_type ||
      payload.typeOfMeeting ||
      payload.meetingMode
    )) || ""
  ).trim().toLowerCase();
  return mt === "virtual";
}

function firstContactName_(contactsValue) {
  var list = toContactArraySafe_(contactsValue);
  if (!list.length) return "";
  var first = list[0] || {};
  return first.name || first.contactPersonName || "";
}

function firstContactDesignation_(contactsValue) {
  var list = toContactArraySafe_(contactsValue);
  if (!list.length) return "";
  var first = list[0] || {};
  return first.designation || "";
}

function getNotificationTitle_(eventType) {
  switch (eventType) {
    case SidvinNotificationEvent.PROPERTY_UPDATE: return "Property Update";
    case SidvinNotificationEvent.BRAND_UPDATE: return "Brand Update";
    case SidvinNotificationEvent.MASTER_UPDATE: return "Company / Category Master Update";
    case SidvinNotificationEvent.TEAM_UPDATE: return "Sidvin Team Update";
    case SidvinNotificationEvent.PROPOSAL_UPDATED: return "Proposal Updated";
    case SidvinNotificationEvent.FOLLOW_UP_DONE: return "Follow Up Done";
    case SidvinNotificationEvent.PROPOSAL_CANCELLED: return "Proposal Cancelled";
    case SidvinNotificationEvent.VISIT_SCHEDULED: return "Visit Scheduled";
    case SidvinNotificationEvent.VISIT_COMPLETED: return "Visit Completed";
    case SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED: return "Terms / Agreement Updated";
    case SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED: return "Agreement & Store Opening Updated";
    case SidvinNotificationEvent.TECHNICAL_SPECS_FINALIZED: return "Technical Specs Finalized";
    case SidvinNotificationEvent.DEPOSIT_UPDATE: return "Deposit Update";
    case SidvinNotificationEvent.RECEIPT_UPDATE: return "Receipt Update";
    case SidvinNotificationEvent.SUCCESS_STORY_BILLED: return "Success Story / Billed";
    default: return "Update";
  }
}

function getMessageAutosenderCredentials_() {
  var props = PropertiesService.getScriptProperties();
  var username = props.getProperty("MAS_USERNAME") || SIDVIN_NOTIFICATION_CONFIG.MAS_USERNAME;
  var password = props.getProperty("MAS_PASSWORD") || SIDVIN_NOTIFICATION_CONFIG.MAS_PASSWORD;
  if (!isFilled_(username) || !isFilled_(password)) {
    throw new Error("Missing MessageAutoSender credentials.");
  }
  return { username: username, password: password };
}

function addLine_(lines, label, value) {
  if (!isFilled_(value)) return;
  lines.push("*" + label + ":* " + stringifyValue_(value));
}

function isFilled_(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function stringifyValue_(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map(function (entry) { return stringifyValue_(entry); })
      .filter(function (entry) { return !!entry; })
      .join(", ");
  }
  if (typeof value === "object") {
    if (isFilled_(value.name) || isFilled_(value.mobile)) {
      return joinParts_([value.name, value.mobile ? "(" + value.mobile + ")" : ""], " ");
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function formatContact_(payload) {
  if (isFilled_(payload.contactPersonName) || isFilled_(payload.mobile)) {
    return joinParts_([
      payload.contactPersonName,
      isFilled_(payload.mobile) ? "(" + payload.mobile + ")" : ""
    ], " ");
  }
  var contact = firstContactSafe_(payload.contactPersonsJson || payload.contactPersons);
  if (!contact) return "";
  return joinParts_([
    contact.name,
    isFilled_(contact.mobile) ? "(" + contact.mobile + ")" : ""
  ], " ");
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
  var first = list[0] || {};
  return {
    name: first.name || first.contactPersonName || "",
    mobile: first.mobile || first.phone || ""
  };
}

function toContactArraySafe_(value) {
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

function joinParts_(parts, separator) {
  return (parts || [])
    .map(function (part) { return part === null || part === undefined ? "" : String(part).trim(); })
    .filter(function (part) { return part !== ""; })
    .join(separator || " ");
}

function deriveVisitStatus_(payload) {
  if (isFilled_(payload.visitDate)) return "Completed";
  if (isFilled_(payload.scheduledDate)) return "Scheduled";
  return "";
}

function deriveTermsStage_(payload) {
  return isFilled_(payload.signingDate) ? "Signed" : "Finalized";
}

function copyObject_(source) {
  var target = {};
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
  return target;
}

function backendList_(entity) {
  if (typeof list_ === "function") {
    try { return ensureArray_(list_(entity)); } catch (err) { Logger.log("list_ failed for " + entity + ": " + err); }
  }
  if (typeof getAll_ === "function") {
    try { return ensureArray_(getAll_(entity)); } catch (err) { Logger.log("getAll_ failed for " + entity + ": " + err); }
  }
  if (typeof listEntity_ === "function") {
    try { return ensureArray_(listEntity_(entity)); } catch (err) { Logger.log("listEntity_ failed for " + entity + ": " + err); }
  }
  return fallbackListBySheet_(entity);
}

function backendGetById_(entity, id) {
  if (typeof getById_ === "function") {
    try { return getById_(entity, id); } catch (err) { Logger.log("getById_ failed for " + entity + ": " + err); }
  }

  var rows = fallbackListBySheet_(entity);
  var wanted = String(id || "");
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || "") === wanted) return rows[i];
  }
  return null;
}

function backendGetByProposalId_(entity, proposalId) {
  if (typeof getByProposalId_ === "function") {
    try { return ensureArray_(getByProposalId_(entity, proposalId)); } catch (err) { Logger.log("getByProposalId_ failed for " + entity + ": " + err); }
  }

  var rows = fallbackListBySheet_(entity);
  var pid = String(proposalId || "");
  return rows.filter(function (row) {
    return row && String(row.proposalId || "") === pid;
  });
}

function backendCreate_(entity, data, updatedBy) {
  var payload = copyObject_(data || {});
  if (!isFilled_(payload.serialNo) && shouldAutoSerialNo_(entity)) {
    payload.serialNo = nextSerialNoByEntity_(entity);
  }

  if (typeof create_ === "function") {
    var created = create_(entity, payload, updatedBy);
    var merged = copyObject_(payload);
    var fromCreate = copyObject_(created || {});
    for (var key in fromCreate) {
      if (Object.prototype.hasOwnProperty.call(fromCreate, key)) {
        merged[key] = fromCreate[key];
      }
    }

    if (shouldAutoSerialNo_(entity) && isFilled_(payload.serialNo) && !isFilled_(merged.serialNo)) {
      merged.serialNo = payload.serialNo;
      if (isFilled_(merged.id)) {
        try {
          if (typeof update_ === "function") {
            update_(entity, merged.id, { serialNo: merged.serialNo }, updatedBy);
          } else {
            fallbackUpdateBySheet_(entity, merged.id, { serialNo: merged.serialNo }, updatedBy);
          }
        } catch (err) {
          Logger.log("Serial update failed for " + entity + " id=" + merged.id + ": " + err);
        }
      }
    }

    return merged;
  }
  return fallbackCreateBySheet_(entity, payload, updatedBy);
}

function backendUpdate_(entity, id, data, updatedBy) {
  if (typeof update_ === "function") return update_(entity, id, data, updatedBy);
  return fallbackUpdateBySheet_(entity, id, data, updatedBy);
}

function backendUpsertByProposalId_(entity, proposalId, data, updatedBy) {
  if (typeof upsertByProposalId_ === "function") {
    return upsertByProposalId_(entity, proposalId, data, updatedBy);
  }
  return fallbackUpsertByProposalIdBySheet_(entity, proposalId, data, updatedBy);
}

function backendRemoveById_(entity, id) {
  if (typeof removeById_ === "function") return removeById_(entity, id);
  return fallbackRemoveByIdBySheet_(entity, id);
}

function backendRemoveByProposalId_(entity, proposalId) {
  if (typeof removeByProposalId_ === "function") return removeByProposalId_(entity, proposalId);
  return fallbackRemoveByProposalIdBySheet_(entity, proposalId);
}

function fallbackListBySheet_(entity) {
  var sheet = getEntitySheetAllowMissing_(entity);
  if (!sheet) return [];
  var rows = readSheetRows_(sheet);
  return rows.map(function (row) { return row.data; });
}

function fallbackCreateBySheet_(entity, data, updatedBy) {
  var sheet = getEntitySheet_(entity, true);
  var payload = copyObject_(data || {});

  if (!isFilled_(payload.id)) payload.id = nextId_();
  if (!isFilled_(payload.serialNo) && shouldAutoSerialNo_(entity)) {
    payload.serialNo = nextSerialNoBySheet_(sheet);
  }
  if (!isFilled_(payload.createdAt)) payload.createdAt = nowIso_();
  payload.updatedAt = nowIso_();
  if (isFilled_(updatedBy)) payload.updatedBy = updatedBy;

  var headers = ensureSheetHeaders_(sheet, Object.keys(payload));
  var row = headers.map(function (header) { return toSheetCell_(payload[header]); });
  sheet.appendRow(row);
  return payload;
}

function fallbackUpdateBySheet_(entity, id, data, updatedBy) {
  var sheet = getEntitySheet_(entity, false);
  var rows = readSheetRows_(sheet);
  var wanted = String(id || "");
  var hit = null;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].data.id || "") === wanted) {
      hit = rows[i];
      break;
    }
  }

  if (!hit) throw new Error(entity + " row not found for id: " + wanted);

  var merged = copyObject_(hit.data || {});
  var incoming = data || {};
  for (var key in incoming) {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      merged[key] = incoming[key];
    }
  }
  merged.id = wanted;
  merged.updatedAt = nowIso_();
  if (isFilled_(updatedBy)) merged.updatedBy = updatedBy;
  if (!isFilled_(merged.createdAt)) merged.createdAt = hit.data.createdAt || nowIso_();

  var headers = ensureSheetHeaders_(sheet, Object.keys(merged));
  var values = headers.map(function (header) { return toSheetCell_(merged[header]); });
  sheet.getRange(hit.rowNumber, 1, 1, headers.length).setValues([values]);
  return merged;
}

function fallbackUpsertByProposalIdBySheet_(entity, proposalId, data, updatedBy) {
  if (!isFilled_(proposalId)) throw new Error("Missing proposalId");

  var sheet = getEntitySheet_(entity, true);
  var rows = readSheetRows_(sheet);
  var wanted = String(proposalId);
  var hit = null;
  var i;

  for (i = 0; i < rows.length; i++) {
    if (String(rows[i].data.proposalId || "") === wanted) {
      hit = rows[i];
      break;
    }
  }

  var payload = copyObject_(data || {});
  payload.proposalId = wanted;
  if (isFilled_(updatedBy)) payload.updatedBy = updatedBy;
  payload.updatedAt = nowIso_();

  if (hit) {
    var merged = copyObject_(hit.data || {});
    for (var key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        merged[key] = payload[key];
      }
    }
    if (!isFilled_(merged.id)) merged.id = nextId_();
    if (!isFilled_(merged.createdAt)) merged.createdAt = hit.data.createdAt || nowIso_();

    var headersUpdate = ensureSheetHeaders_(sheet, Object.keys(merged));
    var updateValues = headersUpdate.map(function (header) { return toSheetCell_(merged[header]); });
    sheet.getRange(hit.rowNumber, 1, 1, headersUpdate.length).setValues([updateValues]);
    return merged;
  }

  if (!isFilled_(payload.id)) payload.id = nextId_();
  payload.createdAt = nowIso_();
  var headers = ensureSheetHeaders_(sheet, Object.keys(payload));
  var row = headers.map(function (header) { return toSheetCell_(payload[header]); });
  sheet.appendRow(row);
  return payload;
}

function fallbackRemoveByIdBySheet_(entity, id) {
  var sheet = getEntitySheetAllowMissing_(entity);
  if (!sheet) return false;

  var rows = readSheetRows_(sheet);
  var wanted = String(id || "");
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i].data.id || "") === wanted) {
      sheet.deleteRow(rows[i].rowNumber);
      return true;
    }
  }
  return false;
}

function fallbackRemoveByProposalIdBySheet_(entity, proposalId) {
  var sheet = getEntitySheetAllowMissing_(entity);
  if (!sheet) return false;

  var rows = readSheetRows_(sheet);
  var wanted = String(proposalId || "");
  var removed = false;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i].data.proposalId || "") === wanted) {
      sheet.deleteRow(rows[i].rowNumber);
      removed = true;
    }
  }
  return removed;
}

function readSheetRows_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = (values[0] || []).map(function (header) { return String(header || "").trim(); });
  if (!headers.length) return [];

  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r] || [];
    var obj = {};
    var hasAny = false;

    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;
      var normalized = normalizeSheetCell_(row[c]);
      obj[key] = normalized;
      if (normalized !== "" && normalized !== null && normalized !== undefined) hasAny = true;
    }

    if (!hasAny) continue;
    out.push({ rowNumber: r + 1, data: obj });
  }
  return out;
}

function normalizeSheetCell_(value) {
  if (value === null || value === undefined) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    var tz = Session.getScriptTimeZone() || "Asia/Kolkata";
    var year = value.getFullYear();
    var hours = value.getHours();
    var minutes = value.getMinutes();
    var seconds = value.getSeconds();

    // If it's a time-only field from Sheets, it usually has year 1899.
    if (year === 1899 || year === 1900) {
      return Utilities.formatDate(value, tz, "HH:mm");
    }
    
    // If it's a pure date (midnight).
    if (hours === 0 && minutes === 0 && seconds === 0) {
      return Utilities.formatDate(value, tz, "yyyy-MM-dd");
    }
    
    // Otherwise, it's a full Date-Time.
    return Utilities.formatDate(value, tz, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  }
  if (typeof value !== "string") return value;

  var s = value.trim();
  if (!s) return "";

  var looksLikeJson =
    (s.charAt(0) === "{" && s.charAt(s.length - 1) === "}") ||
    (s.charAt(0) === "[" && s.charAt(s.length - 1) === "]");

  if (looksLikeJson) {
    try {
      return JSON.parse(s);
    } catch (err) {
      return s;
    }
  }
  return s;
}

function toSheetCell_(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return value;
}

function ensureSheetHeaders_(sheet, keys) {
  var needed = ensureArray_(keys).filter(function (key) { return isFilled_(key); });
  var lastCol = sheet.getLastColumn();
  var headers = [];

  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || "").trim(); });
  }

  if (!headers.length) {
    if (!needed.length) needed = ["id"];
    headers = needed.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }

  var changed = false;
  for (var i = 0; i < needed.length; i++) {
    if (headers.indexOf(needed[i]) === -1) {
      headers.push(needed[i]);
      changed = true;
    }
  }

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function getEntitySheetAllowMissing_(entity) {
  try {
    return getEntitySheet_(entity, false);
  } catch (err) {
    return null;
  }
}

function getEntitySheet_(entity, createIfMissing) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No active spreadsheet.");

  var candidates = entitySheetCandidates_(entity);
  var i;
  for (i = 0; i < candidates.length; i++) {
    var found = ss.getSheetByName(candidates[i]);
    if (found) return found;
  }

  if (createIfMissing) {
    return ss.insertSheet(candidates[0]);
  }

  throw new Error("Sheet not found for entity: " + entity);
}

function entitySheetCandidates_(entity) {
  var key = String(entity || "").trim();
  var map = {
    Properties: ["Properties", "Property"],
    Brands: ["Brands", "Brand"],
    Proposals: ["Proposals", "Proposal"],
    Visits: ["Visits", "Visit"],
    FollowUps: ["FollowUps", "Follow Ups", "FollowUp", "Follow Up"],
    TermSheets: ["TermSheets", "Term Sheets", "TermSheet"],
    SidvinTeam: ["SidvinTeam", "SidvinTeamMembers", "Sidvin Team Members", "Sidvin Team"],
    SidvinTeamMembers: ["SidvinTeamMembers", "Sidvin Team Members", "SidvinTeam"],
    "Sidvin Team Members": ["Sidvin Team Members", "SidvinTeamMembers", "SidvinTeam"],
    CompanyMaster: ["CompanyMaster", "Company Master"],
    CategoryMaster: ["CategoryMaster", "Category Master"]
  };

  if (map[key]) return map[key];

  var compact = key.replace(/\s+/g, "");
  if (map[compact]) return map[compact];

  return [key];
}

function nowIso_() {
  return new Date().toISOString();
}

function nextId_() {
  return Utilities.getUuid();
}

function shouldAutoSerialNo_(entity) {
  var key = String(entity || "");
  return key === "Properties" || key === "Brands" || key === "Proposals";
}

function nextSerialNoBySheet_(sheet) {
  var rows = readSheetRows_(sheet);
  var maxNo = 0;

  for (var i = 0; i < rows.length; i++) {
    var serialNo = rows[i] && rows[i].data ? rows[i].data.serialNo : "";
    var extracted = extractSerialNo_(serialNo);
    if (extracted > maxNo) maxNo = extracted;
  }

  return maxNo + 1;
}

function nextSerialNoByEntity_(entity) {
  var rows = [];
  try {
    rows = backendList_(entity);
  } catch (err) {
    rows = [];
  }

  var maxNo = 0;
  for (var i = 0; i < rows.length; i++) {
    var serialNo = rows[i] ? rows[i].serialNo : "";
    var extracted = extractSerialNo_(serialNo);
    if (extracted > maxNo) maxNo = extracted;
  }
  return maxNo + 1;
}

function extractSerialNo_(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Math.floor(value);
  var s = String(value);
  var match = s.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function writeNotificationAudit_(status, details) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;

    var name = "NotificationAudit";
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = [
      "time",
      "status",
      "eventType",
      "action",
      "entity",
      "recordId",
      "proposalId",
      "serialNo",
      "propertyAddress",
      "brandName",
      "error"
    ];

    ensureSheetHeaders_(sheet, headers);

    var d = details || {};
    sheet.appendRow([
      nowIso_(),
      status || "",
      d.eventType || "",
      d.action || "",
      d.entity || "",
      d.recordId || "",
      d.proposalId || "",
      d.serialNo || "",
      d.propertyAddress || "",
      d.brandName || "",
      d.error || ""
    ]);
  } catch (ignoreErr) {
    Logger.log("Audit log write failed: " + ignoreErr);
  }
}

function ensureArray_(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}
