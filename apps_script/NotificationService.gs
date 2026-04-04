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
  if (message.indexOf("Dear Mr.") === 0) {
    return { propertyMessage: "", brandMessage: message };
  }
  var marker = "\n\nDear Mr.";
  var idx = message.indexOf(marker);
  if (idx < 0) return { propertyMessage: message, brandMessage: "" };
  return {
    propertyMessage: message.substring(0, idx),
    brandMessage: "Dear Mr." + message.substring(idx + marker.length)
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
  if (eventType === SidvinNotificationEvent.PROPOSAL_UPDATED) {
    return notifyProposalUpdated_(payload);
  }
  if (
    eventType === SidvinNotificationEvent.VISIT_UPDATE ||
    eventType === SidvinNotificationEvent.FOLLOW_UP_DONE ||
    eventType === SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED ||
    eventType === SidvinNotificationEvent.SUCCESS_STORY_BILLED
  ) {
    if (eventType === SidvinNotificationEvent.FOLLOW_UP_DONE) {
      var guardedFollowUpStatus = String(payload.status || "").trim().toLowerCase();
      if (guardedFollowUpStatus !== "follow up again") {
        return { skipped: true, reason: "Follow-up notifications are enabled only for Follow Up Again status." };
      }
    }
    var combined = buildSidvinNotificationMessage_(eventType, payload);
    if (!isFilled_(combined)) {
      return { skipped: true, reason: "Template-only mode: event not in approved templates." };
    }
    var split = splitPropertyAndBrandMessage_(combined);
    var propertyMessage = split.propertyMessage;
    var brandMessage = split.brandMessage;

    if (eventType === SidvinNotificationEvent.FOLLOW_UP_DONE) {
      var followUpStatus = String(payload.status || "").trim().toLowerCase();
      if (followUpStatus === "follow up again") {
        brandMessage = "";
      }
    }

    if (eventType === SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED) {
      // Per latest rule: no pending terms/agreement message to brand contact.
      brandMessage = "";
    }

    return sendSplitMessagesByAudience_(payload, propertyMessage, brandMessage);
  }
  var message = buildSidvinNotificationMessage_(eventType, payload);
  if (!isFilled_(message)) {
    return { skipped: true, reason: "Template-only mode: event not in approved templates." };
  }
  return sendMessage_(message, payload);
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
  base.mutationAction = mutation.action;

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
      return notifySidvinOwner_(SidvinNotificationEvent.VISIT_UPDATE, base);
    case "TermSheets":
      notifySidvinOwner_(SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED, base);
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
    case SidvinNotificationEvent.VISIT_UPDATE:
      return buildVisitMessage_(payload, deriveVisitStatus_(payload));
    case SidvinNotificationEvent.FOLLOW_UP_DONE:
      return buildFollowUpMeetingMessage_(payload);
    case SidvinNotificationEvent.TERMS_AGREEMENT_UPDATED:
      return buildPendingTermsAgreementMessage_(payload);
    case SidvinNotificationEvent.SUCCESS_STORY_BILLED:
      return buildDealClosedMessage_(payload);
    case SidvinNotificationEvent.PROPOSAL_CANCELLED:
      return "";
    case SidvinNotificationEvent.MASTER_UPDATE:
      return "";
    case SidvinNotificationEvent.TEAM_UPDATE:
      return "";
    case SidvinNotificationEvent.TECHNICAL_SPECS_FINALIZED:
      return "";
    case SidvinNotificationEvent.DEPOSIT_UPDATE:
      return "";
    case SidvinNotificationEvent.RECEIPT_UPDATE:
      return "";
    default:
      return "";
  }
}

function buildPropertyRegistrationMessage_(payload) {
  var visitDoneDate = valueOrFallback_(payload.visitDate || payload.createdAt, "Date");
  var propertyName = valueOrFallback_(payload.propertyName || payload.propertyAddress || payload.address, "propertyName");
  return joinMessageLines_([
    "Dear Sir,",
    "",
    "Thank you for registering your property at  *" + propertyName + "* with us. A site visit to your property was conducted on *" + visitDoneDate + "*. We look forward to a long-term association with you.",
    ""
  ].concat(buildSignatureLines_()));
}

function buildBrandPersonMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");

  return joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
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

  return joinMessageLines_([
    "Dear Sir,",
    "",
    "We have proposed your property at " + address + " to " + brandName + " on " + proposalDate + ". We are awaiting a site visit from the company soon. The details of the site visit shall be updated soon.",
    ""
  ].concat(buildSignatureLines_()));
}

function buildProposalBrandMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");

  return joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
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

  var propertyLine = visitStatus === "completed"
    ? "The site visit for your property located at " + address + " has been completed on " + dateValue + " by the brand " + brandName + " We will keep you updated."
    : "A site visit for your property located at " + address + " is scheduled on " + dateValue + " with " + brandName + ". Kindly ensure your availability (or your team's availability) for the same.";

  var brandLine = visitStatus === "completed"
    ? "Thank you for visiting the property for " + brandName + " located at " + address + " and sharing your insights.\nKindly let us know how can we take this deal further."
    : "A site visit has been confirmed for the property located at " + address + " for the brand " + brandName + " on " + dateValue + ".";

  var propertySection = joinMessageLines_([
    "Dear Sir,",
    "",
    propertyLine,
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
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
  var isPendingTerms = status.indexOf("pending terms") >= 0 || remarks.indexOf("pending terms") >= 0 || remarks.indexOf("agreement") >= 0;
  if (isPendingTerms) return buildPendingTermsAgreementMessage_(payload);
  if (isVirtualMeetingType_(payload)) return buildVirtualMeetingMessage_(payload);
  return buildClientMeetingMessage_(payload);
}

function buildClientMeetingMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var dateValue = valueOrFallback_(resolveMeetingDate_(payload), "Date");
  var timeValue = valueOrFallback_(resolveMeetingTime_(payload), "Time");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");

  var propertySection = joinMessageLines_([
    "Dear Sir,",
    "",
    "A meeting has been scheduled with the officials of " + brandName + " on " + dateValue + " at " + timeValue + " for your property located at " + address + ". The meeting place shall be updated shortly.",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
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

  var propertySection = joinMessageLines_([
    "Dear Sir,",
    "",
    "A virtual meeting with the officials of " + brandName + " for your property located at " + address + " is scheduled on " + dateValue + " at " + timeValue + ". Please join via " + linkValue + ".",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
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

  var propertySection = joinMessageLines_([
    "Dear Sir,",
    "",
    "A meeting with the officials of the brand " + brandName + " is scheduled on " + dateValue + " at " + timeValue + " to finalize pending terms and conditions. Please be available. The meeting place shall be updated shortly",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "A meeting is being scheduled  with the owner of the property located at *" + address + "* for your brand " + brandName + " is scheduled on " + dateValue + " at " + timeValue + ". The meeting place shall be updated shortly.",
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
}

function buildDealClosedMessage_(payload) {
  var brandContact = resolveBrandContactName_(payload);
  var brandName = valueOrFallback_(payload.brandName || payload.name, "brandName");
  var address = valueOrFallback_(payload.propertyAddress || payload.address, "propertyAddress");

  var propertySection = joinMessageLines_([
    "Dear Sir,",
    "",
    "Congratulations on successful completion of the lease deal for your property located at *" + address + "* with the brand " + brandName + ". Thank you for trusting us.",
    "",
    "We look forward for more business in future.",
    ""
  ].concat(buildSignatureLines_()));

  var brandSection = joinMessageLines_([
    "Dear Mr. *" + valueOrFallback_(brandContact, "brandContactName") + "*,",
    "",
    "Congratulations on successful deal closure for your brand " + brandName + " in the property at *" + address + "*. We look forward for more business in future.",
    ""
  ].concat(buildSignatureLines_()));

  return joinMessageSections_([propertySection, brandSection]);
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
  var list = toContactArray_(contactsValue);
  if (!list.length) return "";
  var first = list[0] || {};
  return first.name || first.contactPersonName || "";
}

function firstContactDesignation_(contactsValue) {
  var list = toContactArray_(contactsValue);
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
      c.phone ||
      c.contactMobile ||
      c.whatsapp ||
      c.whatsApp ||
      c.phoneNumber ||
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
