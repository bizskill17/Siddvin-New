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
    if (status !== "follow up again") return;
    notifySidvinOwner_(SidvinNotificationEvent.FOLLOW_UP_DONE, payload);
    return;
  }

  if (entity === "Visits") {
    notifySidvinOwner_(SidvinNotificationEvent.VISIT_UPDATE, payload);
    return;
  }

  if (entity === "TermSheets") {
    emitDepositAndReceiptNotifications_(payload, previousData, savedData, String(action || "").trim().toLowerCase());

    // Send Terms/Agreement message only when agreement-related fields change.
    if (!hasTermsAgreementDetailsChange_(previousData, savedData)) return;

    notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, payload);
    return;
  }
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

function buildBaseNotificationPayload_(entity, savedData, updatedBy) {
  var payload = copyObject_(savedData || {});
  payload.updatedBy = updatedBy || payload.updatedBy || "System";

  var context = resolveContext_(entity, savedData);
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
    proposal = getById_("Proposals", proposalId);
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
    var property = getById_("Properties", propertyId);
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
    var brand = getById_("Brands", brandId);
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
      out.brandContactDesignation = firstContactDesignationSafe_(brandContacts) || (brand && brand.designation) || "";
    }
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

function firstContactDesignationSafe_(value) {
  var list = toContactArraySafe_(value);
  if (!list.length) return "";
  var c = list[0] || {};
  return c.designation || "";
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
