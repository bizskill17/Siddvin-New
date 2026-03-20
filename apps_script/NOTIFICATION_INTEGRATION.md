# Sidvin Notification Integration (Apps Script)

This folder contains `NotificationService.gs`, which implements:
- fixed targets:
  - `groupId = 120363038687376021@g.us`
  - `mobile = 8638215773`
- all 13 notification templates from your plan
- zero-blank rule (empty fields are skipped)
- real-time sender via MessageAutoSender API

## 1) Add credentials in Apps Script

In Script Properties, set:
- `MAS_USERNAME`
- `MAS_PASSWORD`

`NotificationService.gs` has fallback values, but Script Properties are safer.

## 2) Patch your existing `doPost` (from your pasted Code.gs)

Use this exact shape so notifications fire after successful writes:

```javascript
function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').trim();

    if (action === 'create') {
      const data = create_(body.entity, body.data || {}, body.updatedBy || 'System');
      tryNotifyMutation_(action, body.entity, data, body.updatedBy || 'System', null);
      return json_({ ok: true, data });
    }

    if (action === 'update') {
      let previous = null;
      if (body.entity === 'TermSheets' && body.id) previous = getById_(body.entity, body.id);
      const data = update_(body.entity, body.id, body.data || {}, body.updatedBy || 'System');
      tryNotifyMutation_(action, body.entity, data, body.updatedBy || 'System', previous);
      return json_({ ok: true, data });
    }

    if (action === 'upsertByProposalId') {
      let previous = null;
      if (body.entity === 'TermSheets') {
        const oldRows = getByProposalId_(body.entity, body.proposalId);
        previous = (oldRows && oldRows.length) ? oldRows[0] : null;
      }
      const data = upsertByProposalId_(body.entity, body.proposalId, body.data || {}, body.updatedBy || 'System');
      tryNotifyMutation_(action, body.entity, data, body.updatedBy || 'System', previous);
      return json_({ ok: true, data });
    }

    if (action === 'delete') {
      removeById_(body.entity, body.id);
      return json_({ ok: true });
    }

    if (action === 'deleteByProposalId') {
      removeByProposalId_(body.entity, body.proposalId);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'Invalid POST action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
```

`tryNotifyMutation_` is provided in `BackendNotificationHooks.gs` and uses `NotificationService.gs`.

## 3) Optional direct call example

If you need manual event trigger in any custom flow:

```javascript
notifySidvinOwner_(SidvinNotificationEvent.PROPERTY_UPDATE, {
  address: row.address,
  proposedRent: row.proposedRent,
  proposedArea: row.proposedArea,
  noOfFloors: row.noOfFloors,
  frontage: row.frontage,
  googleMapsLink: row.googleMapsLink,
  contactPersons: row.contactPersonsJson,
  propertyFeeStatus: row.propertyFeeStatus,
  propertyFeePaperSigningDate: row.propertyFeePaperSigningDate,
  updatedBy: payload.updatedBy
});
```

## 4) Recommended event mapping

- `Properties.create/update` -> `PROPERTY_UPDATE`
- `Brands.create/update` -> `BRAND_UPDATE`
- `CompanyMaster.create` or `CategoryMaster.create` -> `MASTER_UPDATE`
- `SidvinTeam.create/update` -> `TEAM_UPDATE`
- `Proposals.create/update` -> `PROPOSAL_UPDATED`
- `FollowUps.create/update`:
  - if `status === "Cancel Proposal"` -> `PROPOSAL_CANCELLED`
  - else -> `FOLLOW_UP_DONE`
- `Visits.create/update` -> `VISIT_UPDATE`
- `TermSheets.upsert/update`:
  - `TERMS_AGREEMENT_UPDATED`
  - and if technical fields present, also `TECHNICAL_SPECS_FINALIZED`
- deposit stage create/update -> `DEPOSIT_UPDATE` (auto-detected from `depositStagesJson` diff)
- receipt add/update -> `RECEIPT_UPDATE` (auto-detected when new receipt appears)
- invoice/billed update -> `SUCCESS_STORY_BILLED`
