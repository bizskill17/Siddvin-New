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
  OWNER_GROUP_ID: "120363038687376021@g.us",
  OWNER_MOBILE: "8638215773",

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

    if (action === "create") {
      var created = backendCreate_(entity, body.data || {}, updatedBy);
      tryNotifyMutation_(action, entity, created, updatedBy, null);
      return json_({ ok: true, data: created });
    }

    if (action === "update") {
      var previous = null;
      if ((entity === "TermSheets" || entity === "FollowUps" || entity === "Proposals") && isFilled_(body.id)) {
        previous = backendGetById_(entity, body.id);
      }
      var updated = backendUpdate_(entity, body.id, body.data || {}, updatedBy);
      tryNotifyMutation_(action, entity, updated, updatedBy, previous);
      return json_({ ok: true, data: updated });
    }

    if (action === "upsertByProposalId") {
      var previousByProposalId = null;
      if (entity === "TermSheets" && isFilled_(body.proposalId)) {
        var oldRows = backendGetByProposalId_(entity, body.proposalId);
        previousByProposalId = oldRows && oldRows.length ? oldRows[0] : null;
      }
      var upserted = backendUpsertByProposalId_(entity, body.proposalId, body.data || {}, updatedBy);
      tryNotifyMutation_(action, entity, upserted, updatedBy, previousByProposalId);
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
    if (isFilled_(savedData.visitDate)) {
      notifySidvinOwner_(SidvinNotificationEvent.VISIT_COMPLETED, payload);
    } else {
      notifySidvinOwner_(SidvinNotificationEvent.VISIT_SCHEDULED, payload);
    }
    return;
  }

  if (entity === "TermSheets") {
    if (hasAgreementStoreOpeningChange_(previousData, savedData)) {
      notifySidvinOwner_(SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED, payload);
    } else {
      notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, payload);
    }

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

    emitSingleDepositUpdateNotification_(payload, previousData, savedData, action);
    return;
  }
}

function buildBaseNotificationPayload_(entity, savedData, updatedBy) {
  var payload = copyObject_(savedData || {});
  payload.updatedBy = updatedBy || payload.updatedBy || "System";

  var context = {
    propertyAddress: "",
    brandName: "",
    serialNo: "",
    proposalDate: "",
    proposalSender: "",
    brandRemarks: ""
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
    out.proposalDate = savedData.proposalDate || proposalCtx.proposalDate;
    out.proposalSender = savedData.proposalSender || proposalCtx.proposalSender;
    out.brandRemarks = savedData.brandRemarks || proposalCtx.brandRemarks;
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
    proposal = backendGetById_("Proposals", proposalId);
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
    var property = backendGetById_("Properties", propertyId);
    out.propertyAddress = property && property.address ? property.address : "";
  }

  if (isFilled_(brandId)) {
    var brand = backendGetById_("Brands", brandId);
    out.brandName = brand && brand.name ? brand.name : "";
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

function sendMessage_(waMessage) {
  if (!isFilled_(waMessage)) {
    throw new Error("Cannot send blank message.");
  }

  var creds = getMessageAutosenderCredentials_();
  var payload = {
    receiverMobileNo: SIDVIN_NOTIFICATION_CONFIG.OWNER_MOBILE,
    recipientIds: [SIDVIN_NOTIFICATION_CONFIG.OWNER_GROUP_ID],
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
  Logger.log("Notification status: " + statusCode + " body: " + body);

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Message API failed: " + statusCode + " - " + body);
  }

  return { statusCode: statusCode, body: body };
}

function notifySidvinOwner_(eventType, payload) {
  var message = buildSidvinNotificationMessage_(eventType, payload || {});
  try {
    var result = sendMessage_(message);
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
      return notifySidvinOwner_(SidvinNotificationEvent.PROPERTY_UPDATE, base);
    case "Brands":
      return notifySidvinOwner_(SidvinNotificationEvent.BRAND_UPDATE, base);
    case "CompanyMaster":
      base.list = "Company Master";
      if (!isFilled_(base.name) && isFilled_(data.value)) base.name = data.value;
      return notifySidvinOwner_(SidvinNotificationEvent.MASTER_UPDATE, base);
    case "CategoryMaster":
      base.list = "Category Master";
      if (!isFilled_(base.name) && isFilled_(data.value)) base.name = data.value;
      return notifySidvinOwner_(SidvinNotificationEvent.MASTER_UPDATE, base);
    case "SidvinTeam":
    case "SidvinTeamMembers":
    case "Sidvin Team Members":
      return notifySidvinOwner_(SidvinNotificationEvent.TEAM_UPDATE, base);
    case "Proposals":
      notifySidvinOwner_(SidvinNotificationEvent.PROPOSAL_UPDATED, base);
      if (isFilled_(base.invoiceNo) || isFilled_(base.invoiceDate) || isFilled_(base.invoiceAmount)) {
        notifySidvinOwner_(SidvinNotificationEvent.SUCCESS_STORY_BILLED, base);
      }
      return true;
    case "FollowUps":
      if (String(base.status || "").toLowerCase() === "cancel proposal") {
        return notifySidvinOwner_(SidvinNotificationEvent.PROPOSAL_CANCELLED, base);
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
      if (
        isFilled_(base.ac) ||
        isFilled_(base.electricalPanel) ||
        isFilled_(base.fireFightingSystem) ||
        isFilled_(base.flooring) ||
        isFilled_(base.powerLoad) ||
        isFilled_(base.dgBackup)
      ) {
        notifySidvinOwner_(SidvinNotificationEvent.TECHNICAL_SPECS_FINALIZED, base);
      }
      emitSingleDepositUpdateNotification_(base, null, base, "update");
      return true;
    default:
      return null;
  }
}

function buildSidvinNotificationMessage_(eventType, payload) {
  var lines = [];
  var title = getNotificationTitle_(eventType);
  // WhatsApp markdown: bold header + one blank line after header.
  lines.push("*" + title + "*");
  lines.push("");

  switch (eventType) {
    case SidvinNotificationEvent.PROPERTY_UPDATE:
      addLine_(lines, "Address", payload.address);
      addLine_(lines, "Proposed Rent", payload.proposedRent);
      addLine_(lines, "Proposed Area", payload.proposedArea);
      addLine_(lines, "Floors", payload.noOfFloors);
      addLine_(lines, "Frontage", payload.frontage);
      addLine_(lines, "Maps Link", payload.googleMapsLink);
      addLine_(lines, "Contact", formatContact_(payload));
      addLine_(lines, "Property Fee Status", payload.propertyFeeStatus);
      addLine_(lines, "Paper Signing Date", payload.propertyFeePaperSigningDate);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.BRAND_UPDATE:
      addLine_(lines, "Brand Name", payload.name);
      addLine_(lines, "Company Name", payload.companyName);
      addLine_(lines, "Category", payload.category);
      addLine_(lines, "Service Fee Agreed", payload.serviceFeeAgreed);
      addLine_(lines, "Assigned Rep", payload.assignedRep);
      addLine_(lines, "Contact", formatContact_(payload));
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.MASTER_UPDATE:
      addLine_(lines, "List", payload.list);
      addLine_(lines, "New Entry", payload.name);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.TEAM_UPDATE:
      addLine_(lines, "Staff Name", payload.name);
      addLine_(lines, "Designation", payload.designation);
      addLine_(lines, "Role", payload.role);
      addLine_(lines, "Update By", payload.updatedBy || payload.adminName);
      break;

    case SidvinNotificationEvent.PROPOSAL_UPDATED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Proposal Date", payload.proposalDate);
      addLine_(lines, "Proposal Sender", payload.proposalSender);
      addLine_(lines, "Brand Remarks", payload.brandRemarks);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.FOLLOW_UP_DONE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Follow Up Date", payload.followUpDate);
      addLine_(lines, "Status", payload.status);
      addLine_(lines, "Remarks", payload.remarks);
      addLine_(lines, "Next Follow Up Date", joinParts_([payload.nextFollowUpDate, payload.nextFollowUpTime], " "));
      addLine_(lines, "Planned Visit Date", payload.plannedVisitDate);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.PROPOSAL_CANCELLED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Cancellation Reason", payload.cancelRemarks);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.VISIT_SCHEDULED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Status", "Scheduled");
      addLine_(lines, "Date", payload.scheduledDate || payload.visitDate);
      addLine_(lines, "Visit Outcome", payload.visitOutcome);
      addLine_(lines, "Attendance", joinParts_([payload.sidvinAttendees, payload.brandAttendees, payload.developerAttendees], " / "));
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.VISIT_COMPLETED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Status", "Completed");
      addLine_(lines, "Date", payload.visitDate || payload.scheduledDate);
      addLine_(lines, "Visit Outcome", payload.visitOutcome);
      addLine_(lines, "Attendance", joinParts_([payload.sidvinAttendees, payload.brandAttendees, payload.developerAttendees], " / "));
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Current Stage", payload.currentStage || deriveTermsStage_(payload));
      addLine_(lines, "Signing Date", payload.signingDate);
      addLine_(lines, "Finalization Date", payload.finalizationDate);
      addLine_(lines, "Rent Commencement", payload.rentCommencementDate);
      addLine_(lines, "Handover Date", payload.handoverDate);
      addLine_(lines, "Agreement Registration Date", payload.agreementRegistrationDate);
      addLine_(lines, "Planned Store Opening", payload.plannedOpeningDate);
      addLine_(lines, "Actual Store Opening", payload.storeOpeningDate);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.AGREEMENT_STORE_OPENING_UPDATED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Lease Agreement Prepared", payload.preparationDate);
      addLine_(lines, "Lease Agreement Remarks", payload.leaseAgreementRemarks);
      addLine_(lines, "Lease Agreement Signed", payload.signingDate);
      addLine_(lines, "Lease Agreement Registered", payload.agreementRegistrationDate);
      addLine_(lines, "Store Opening Date", payload.storeOpeningDate);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.TECHNICAL_SPECS_FINALIZED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "AC", payload.ac);
      addLine_(lines, "Electrical Panel", payload.electricalPanel);
      addLine_(lines, "Fire Safety", payload.fireFightingSystem);
      addLine_(lines, "Flooring", payload.flooring);
      addLine_(lines, "Power Load", payload.powerLoad);
      addLine_(lines, "DG Backup", payload.dgBackup);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.DEPOSIT_UPDATE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Deposit Stages", payload.depositStagesCount);
      addLine_(lines, "Total Deposit Amount", payload.totalDepositAmount);
      addLine_(lines, "Total Received Amount", payload.totalReceivedAmount);
      addLine_(lines, "Latest Receipt Date", payload.latestReceiptDate);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.RECEIPT_UPDATE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Deposit Stage", payload.stageName);
      addLine_(lines, "Receipt Amount", payload.receiptAmount);
      addLine_(lines, "Receipt Date", payload.receiptDate);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.SUCCESS_STORY_BILLED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Invoice Status", "Billed");
      addLine_(lines, "Invoice No", payload.invoiceNo);
      addLine_(lines, "Invoice Date", payload.invoiceDate);
      addLine_(lines, "Invoice Amount", payload.invoiceAmount);
      addLine_(lines, "Update By", payload.updatedBy);
      break;

    default:
      throw new Error("Unsupported eventType: " + eventType);
  }

  return lines.join("\n");
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
    return Utilities.formatDate(value, tz, "yyyy-MM-dd");
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
