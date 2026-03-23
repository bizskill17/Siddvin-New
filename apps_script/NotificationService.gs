/**
 * Sidvin Owner notification service for Google Apps Script backend.
 *
 * Usage:
 *   notifySidvinOwner_(SidvinNotificationEvent.PROPERTY_UPDATE, {
 *     address: "Indiranagar, Bengaluru",
 *     proposedRent: 250000,
 *     proposedArea: 1800,
 *     updatedBy: "Ramesh",
 *   });
 *
 * Optional setup (recommended):
 *   Script Properties
 *     MAS_USERNAME=bizskill
 *     MAS_PASSWORD=12345678
 */

var SidvinNotificationEvent = {
  PROPERTY_UPDATE: "PROPERTY_UPDATE",
  BRAND_UPDATE: "BRAND_UPDATE",
  MASTER_UPDATE: "MASTER_UPDATE",
  TEAM_UPDATE: "TEAM_UPDATE",
  PROPOSAL_UPDATED: "PROPOSAL_UPDATED",
  FOLLOW_UP_DONE: "FOLLOW_UP_DONE",
  PROPOSAL_CANCELLED: "PROPOSAL_CANCELLED",
  VISIT_UPDATE: "VISIT_UPDATE",
  TERMS_AGREEMENT_UPDATED: "TERMS_AGREEMENT_UPDATED",
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

function sendMessage_(waMessage, notificationPayload) {
  if (!isFilled_(waMessage)) {
    throw new Error("Cannot send blank message.");
  }

  var creds = getMessageAutosenderCredentials_();
  var resolved = resolveNotificationRecipients_(notificationPayload || {});
  var primaryResult = sendMessageRequest_(
    resolved.ownerMobile,
    resolved.groupIds,
    waMessage,
    creds
  );

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

function notifySidvinOwner_(eventType, payload) {
  var message = buildSidvinNotificationMessage_(eventType, payload || {});
  return sendMessage_(message, payload || {});
}

/**
 * Optional best-effort mapper if you want automatic event detection
 * from your doPost mutation payload.
 *
 * Expected payload shape:
 * {
 *   action: "create" | "update" | "upsertByProposalId",
 *   entity: "Properties" | "Brands" | "Proposals" | "FollowUps" | ...
 *   data: {...},
 *   updatedBy: "User Name",
 *   propertyAddress: "optional pre-resolved value",
 *   brandName: "optional pre-resolved value"
 * }
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
      return notifySidvinOwner_(SidvinNotificationEvent.VISIT_UPDATE, base);
    case "TermSheets":
      notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, base);
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
      return true;
    default:
      return null;
  }
}

function buildSidvinNotificationMessage_(eventType, payload) {
  var lines = [];
  var title = getNotificationTitle_(eventType);
  lines.push("[Sidvin Notification] " + title);

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
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.BRAND_UPDATE:
      addLine_(lines, "Brand Name", payload.name);
      addLine_(lines, "Company Name", payload.companyName);
      addLine_(lines, "Category", payload.category);
      addLine_(lines, "Service Fee Agreed", payload.serviceFeeAgreed);
      addLine_(lines, "Assigned Rep", payload.assignedRep);
      addLine_(lines, "Contact", formatContact_(payload));
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.MASTER_UPDATE:
      addLine_(lines, "List", payload.list);
      addLine_(lines, "New Entry", payload.name);
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.TEAM_UPDATE:
      addLine_(lines, "Staff Name", payload.name);
      addLine_(lines, "Designation", payload.designation);
      addLine_(lines, "Role", payload.role);
      addLine_(lines, "Action By", payload.updatedBy || payload.adminName);
      break;

    case SidvinNotificationEvent.PROPOSAL_UPDATED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Serial No", payload.serialNo);
      addLine_(lines, "Proposal Date", payload.proposalDate);
      addLine_(lines, "Proposal Sender", payload.proposalSender);
      addLine_(lines, "Brand Remarks", payload.brandRemarks);
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.FOLLOW_UP_DONE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Follow Up Date", payload.followUpDate);
      addLine_(lines, "Status", payload.status);
      addLine_(lines, "Remarks", payload.remarks);
      addLine_(lines, "Next Follow Up Date", joinParts_([payload.nextFollowUpDate, payload.nextFollowUpTime], " "));
      addLine_(lines, "Planned Visit Date", payload.plannedVisitDate);
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.PROPOSAL_CANCELLED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Cancellation Reason", payload.cancelRemarks);
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.VISIT_UPDATE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Status", payload.status || deriveVisitStatus_(payload));
      addLine_(lines, "Date", payload.visitDate || payload.scheduledDate);
      addLine_(lines, "Visit Outcome", payload.visitOutcome);
      addLine_(lines, "Attendance", joinParts_([payload.sidvinAttendees, payload.brandAttendees, payload.developerAttendees], " / "));
      addLine_(lines, "Log By", payload.updatedBy);
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
      addLine_(lines, "Log By", payload.updatedBy);
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
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.DEPOSIT_UPDATE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Stage Name", payload.stageName);
      addLine_(lines, "Amount Due", payload.amount);
      addLine_(lines, "Total Received Amount", payload.receivedAmount);
      addLine_(lines, "Latest Receipt Date", payload.receiptDate);
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.RECEIPT_UPDATE:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Deposit Stage", payload.stageName);
      addLine_(lines, "Receipt Amount", payload.receiptAmount);
      addLine_(lines, "Receipt Date", payload.receiptDate);
      addLine_(lines, "Log By", payload.updatedBy);
      break;

    case SidvinNotificationEvent.SUCCESS_STORY_BILLED:
      addLine_(lines, "Property", payload.propertyAddress);
      addLine_(lines, "Brand", payload.brandName);
      addLine_(lines, "Invoice Status", "Billed");
      addLine_(lines, "Invoice No", payload.invoiceNo);
      addLine_(lines, "Invoice Date", payload.invoiceDate);
      addLine_(lines, "Invoice Amount", payload.invoiceAmount);
      addLine_(lines, "Log By", payload.updatedBy);
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
    case SidvinNotificationEvent.VISIT_UPDATE: return "Visit Scheduled / Completed";
    case SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED: return "Terms / Agreement Updated";
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
  lines.push(label + ": " + stringifyValue_(value));
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
  var contact = firstContact_(payload.contactPersons);
  if (!contact) return "";
  return joinParts_([
    contact.name,
    isFilled_(contact.mobile) ? "(" + contact.mobile + ")" : ""
  ], " ");
}

function firstContact_(contactPersons) {
  if (!Array.isArray(contactPersons) || !contactPersons.length) return null;
  var first = contactPersons[0];
  if (!first || typeof first !== "object") return null;
  return first;
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

function resolveNotificationRecipients_(payload) {
  var ownerMobile = normalizeRecipientMobile_(SIDVIN_NOTIFICATION_CONFIG.OWNER_MOBILE);
  if (!isFilled_(ownerMobile)) {
    throw new Error("Missing OWNER_MOBILE in SIDVIN_NOTIFICATION_CONFIG.");
  }

  var groupIds = [];
  if (isFilled_(SIDVIN_NOTIFICATION_CONFIG.OWNER_GROUP_ID)) {
    groupIds.push(String(SIDVIN_NOTIFICATION_CONFIG.OWNER_GROUP_ID).trim());
  }

  var extrasRaw = [];
  extrasRaw = extrasRaw.concat(extractContactMobiles_(payload.propertyContactPersons));
  extrasRaw = extrasRaw.concat(extractContactMobiles_(payload.brandContactPersons));
  extrasRaw = extrasRaw.concat(extractContactMobiles_(payload.contactPersonsJson || payload.contactPersons));
  extrasRaw.push(payload.propertyContactMobile);
  extrasRaw.push(payload.brandContactMobile);
  extrasRaw.push(payload.mobile);

  var seen = {};
  var extraMobiles = [];
  seen[ownerMobile] = true;
  for (var i = 0; i < extrasRaw.length; i++) {
    var normalized = normalizeRecipientMobile_(extrasRaw[i]);
    if (!isFilled_(normalized) || seen[normalized]) continue;
    seen[normalized] = true;
    extraMobiles.push(normalized);
  }

  return {
    ownerMobile: ownerMobile,
    groupIds: groupIds,
    extraMobiles: extraMobiles
  };
}

function extractContactMobiles_(contactsValue) {
  var contacts = toContactArray_(contactsValue);
  var mobiles = [];
  for (var i = 0; i < contacts.length; i++) {
    var c = contacts[i] || {};
    mobiles.push(c.mobile || c.phone || "");
  }
  return mobiles;
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
