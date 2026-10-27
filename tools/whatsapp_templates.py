"""
Siddvin WhatsApp templates in Meta format, ready to submit to Red Lava
(POST https://wa.redlava.in/api/v1/messageTemplate/create).

Run:  python3 tools/whatsapp_templates.py
It checks every template against Meta's rules and writes
php_backend/api/whatsapp_templates.json (one request body per template, plus
the app field that fills each {{n}} placeholder).

Edit the wording here, not in the JSON.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

LANGUAGE = "en"

SIGNATURE = (
    "Best Regards.\n\n"
    "*Siddvin RLT*\n"
    "Founder: *Mr. Vikaas D Goenka*\n"
    "Call: 9117706555\n"
    "www.sidvinrlt.com\n\n"
    "Instagram: https://www.instagram.com/realtorvikasgoenka"
)

# Each template: name, category, body (with {{n}}), and for each placeholder
# (field the app fills it from, example value). Placeholders are numbered in order.
TEMPLATES: list[dict] = [
    {
        "name": "sidvin_property_registration",
        "title": "1) Property Registration - Property side",
        "category": "MARKETING",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "The site visit to your property was done on *{{2}}*. Thank you for registering your property with us. "
            "We assure you the best services from our end. Hope to have a good relation with you. Welcome on board."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("visit date of the property (no field yet)", "27/10/2026"),
        ],
    },
    {
        "name": "sidvin_brand_registration",
        "title": "2) Brand Registration - Brand side",
        "category": "MARKETING",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n"
            "Designation: *{{4}}*\n\n"
            "Thank you for giving us the opportunity to join hands with you. We shall be sending you property proposals, "
            "knowledge info and regular updates through email and WhatsApp messages."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("brand contact designation", "Expansion Manager"),
        ],
    },
    {
        "name": "sidvin_proposal_property",
        "title": "3) Proposal sent - Property side",
        "category": "UTILITY",
        "body": (
            "Dear Sir,\n\n"
            "We have proposed your property *{{1}}* to *{{2}}* of *{{3}}* on *{{4}}*. "
            "Next process is the site visit of *{{5}}* - *{{6}}*. "
            "For live tracking, please visit the link {{7}} ."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("proposal.proposalDate", "27/10/2026"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("property portal link", "https://proposal.bizskilledu.com"),
        ],
    },
    {
        "name": "sidvin_proposal_brand",
        "title": "4) Proposal sent - Brand side",
        "category": "MARKETING",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n"
            "Designation: *{{4}}*\n\n"
            "This is to inform you that we have proposed a commercial property *{{5}}* which belongs to *{{6}}*. "
            "Please review and send us your valuable feedback."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("brand contact designation", "Expansion Manager"),
            ("property.address", "12 MG Road, Guwahati"),
            ("property owner: first contact person name", "Mr. Anil Sharma"),
        ],
    },
    {
        "name": "sidvin_visit_scheduled_property",
        "title": "5) Visit Scheduled - Property side",
        "category": "UTILITY",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "This is to inform you that a site visit is arranged for your property on *{{2}}* with *{{3}}* - *{{4}}*. "
            "Please keep yourself/team available for the same."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("visit.scheduledDate (+ time)", "28/10/2026 11:00 AM"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
        ],
    },
    {
        "name": "sidvin_visit_scheduled_brand",
        "title": "6) Visit Scheduled - Brand side",
        "category": "UTILITY",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n\n"
            "This is to inform you that the site visit of the property *{{4}}* which belongs to *{{5}}* "
            "has been scheduled on *{{6}}*."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("property.address", "12 MG Road, Guwahati"),
            ("property owner: first contact person name", "Mr. Anil Sharma"),
            ("visit.scheduledDate (+ time)", "28/10/2026 11:00 AM"),
        ],
    },
    {
        "name": "sidvin_visit_completed_property",
        "title": "7) Visit Completed - Property side",
        "category": "UTILITY",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "This is to inform you that the site visit for your property was completed by *{{2}}* - *{{3}}* on *{{4}}*. "
            "Mr. *{{5}}* from your side was present. We will keep you posted on further updates."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("visit.visitDate", "28/10/2026"),
            ("visit.developerAttendees", "Anil Sharma"),
        ],
    },
    {
        "name": "sidvin_visit_completed_brand",
        "title": "8) Visit Completed - Brand side",
        "category": "UTILITY",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n\n"
            "Thank you for taking the time to visit the property *{{4}}* of *{{5}}* and sharing your insights. "
            "We look forward to coordinate on the next steps."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("property.address", "12 MG Road, Guwahati"),
            ("property owner: first contact person name", "Mr. Anil Sharma"),
        ],
    },
    {
        "name": "sidvin_meeting_property",
        "title": "9) Follow-up: Client Meeting - Property side",
        "category": "UTILITY",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "A meeting has been scheduled with Mr. *{{2}}* from *{{3}}* - *{{4}}* on *{{5}}* at *{{6}}*. "
            "Please keep yourself available."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("brand contact name", "Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("followUp.nextFollowUpDate", "30/10/2026"),
            ("followUp.nextFollowUpTime", "4:00 PM"),
        ],
    },
    {
        "name": "sidvin_meeting_brand",
        "title": "10) Follow-up: Client Meeting - Brand side",
        "category": "UTILITY",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n\n"
            "A meeting has been scheduled with Mr. *{{4}}*, owner of *{{5}}*, on *{{6}}* at *{{7}}*. "
            "Please keep yourself available."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("property owner: first contact person name", "Anil Sharma"),
            ("property.address", "12 MG Road, Guwahati"),
            ("followUp.nextFollowUpDate", "30/10/2026"),
            ("followUp.nextFollowUpTime", "4:00 PM"),
        ],
    },
    {
        "name": "sidvin_virtual_meeting_property",
        "title": "11) Follow-up: Virtual Meeting - Property side",
        "category": "UTILITY",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "A virtual meeting has been scheduled with Mr. *{{2}}* of *{{3}}* on *{{4}}* at *{{5}}*. "
            "Please make a note of the timing and join the meeting via {{6}} ."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("brand contact name", "Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("visit.scheduledDate", "30/10/2026"),
            ("visit.scheduledTime", "4:00 PM"),
            ("visit.meetingLink", "https://zoom.us/j/1234567890"),
        ],
    },
    {
        "name": "sidvin_virtual_meeting_brand",
        "title": "12) Follow-up: Virtual Meeting - Brand side",
        "category": "UTILITY",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n\n"
            "It is to inform you that a zoom meeting has been scheduled with owner *{{4}}* of *{{5}}* on *{{6}}* at *{{7}}*. "
            "Please make a note of the timing and join the meeting via {{8}} ."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("property owner: first contact person name", "Anil Sharma"),
            ("property.address", "12 MG Road, Guwahati"),
            ("visit.scheduledDate", "30/10/2026"),
            ("visit.scheduledTime", "4:00 PM"),
            ("visit.meetingLink", "https://zoom.us/j/1234567890"),
        ],
    },
    {
        "name": "sidvin_terms_meeting_property",
        "title": "13) Pending Terms / Agreement Meeting - Property side",
        "category": "UTILITY",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "A meeting with Mr. *{{2}}* of *{{3}}* of *{{4}}* is scheduled on *{{5}}* at *{{6}}* "
            "to discuss the pending terms/agreement. Please be available for the same."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("brand contact name", "Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("meeting date (no field yet)", "02/11/2026"),
            ("meeting time (no field yet)", "11:30 AM"),
        ],
    },
    {
        "name": "sidvin_terms_meeting_brand",
        "title": "14) Pending Terms / Agreement Meeting - Brand side",
        "category": "UTILITY",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n\n"
            "It is to inform you that the finalization of the pending terms/agreement is scheduled with *{{4}}* of *{{5}}* "
            "on *{{6}}* at *{{7}}*. Please be available for discussion."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
            ("property owner: first contact person name", "Mr. Anil Sharma"),
            ("property.address", "12 MG Road, Guwahati"),
            ("meeting date (no field yet)", "02/11/2026"),
            ("meeting time (no field yet)", "11:30 AM"),
        ],
    },
    {
        "name": "sidvin_deal_closed_property",
        "title": "15) Deal Closed / Billed - Property side",
        "category": "MARKETING",
        "body": (
            "Dear Sir,\n\n"
            "Property (*{{1}}*)\n\n"
            "We are extending our heartiest congratulations on successful completion of the lease deal with *{{2}}* - *{{3}}*. "
            "Thank you for trusting us and giving us the opportunity to work with you. "
            "Please remember us in all future endeavors."
        ),
        "vars": [
            ("property.address", "12 MG Road, Guwahati"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
        ],
    },
    {
        "name": "sidvin_deal_closed_brand",
        "title": "16) Deal Closed / Billed - Brand side",
        "category": "MARKETING",
        "body": (
            "Dear {{1}},\n\n"
            "Brand Name: *{{2}}*\n"
            "Company Name: *{{3}}*\n\n"
            "Congratulations on successful completion of the lease deal. Your efforts and collaborations made this possible. "
            "Thank you for trusting us and giving us the opportunity to work with you. "
            "Please remember us in all future endeavors."
        ),
        "vars": [
            ("brand contact: Mr./Ms. + name", "Mr. Rajesh Kumar"),
            ("brand.name", "BrandOne"),
            ("brand.companyName", "ABC Retail Pvt Ltd"),
        ],
    },
]


def full_body(t: dict) -> str:
    return t["body"] + "\n\n" + SIGNATURE


def check(t: dict) -> list[str]:
    """Meta's template rules (see the redlava-whatsapp skill)."""
    errs = []
    body = full_body(t)
    if not re.fullmatch(r"[a-z0-9_]{1,512}", t["name"]):
        errs.append("name must be lowercase letters, digits and underscores")
    if t["category"] not in ("UTILITY", "MARKETING", "AUTHENTICATION"):
        errs.append("bad category")
    if len(body) > 1024:
        errs.append(f"body is {len(body)} characters (max 1024)")
    nums = [int(n) for n in re.findall(r"\{\{(\d+)\}\}", body)]
    if nums != list(range(1, len(nums) + 1)):
        errs.append(f"placeholders must be {{{{1}}}}..{{{{n}}}} in order, found {nums}")
    if len(nums) != len(t["vars"]):
        errs.append(f"{len(nums)} placeholders but {len(t['vars'])} example values")
    if re.match(r"\s*\{\{", body) or re.search(r"\}\}\s*$", body):
        errs.append("body must not start or end with a placeholder")
    if re.search(r"\}\}[\s*_~-]*\{\{", body) and not re.search(r"\}\}\s*\*?\s*-\s*\*?\s*\{\{", body):
        errs.append("two placeholders sit side by side")
    for _, ex in t["vars"]:
        if not ex.strip() or "\n" in ex or "\t" in ex or "     " in ex:
            errs.append(f"invalid example value {ex!r}")
    return errs


def request_body(t: dict) -> dict:
    return {
        "name": t["name"],
        "language": LANGUAGE,
        "category": t["category"],
        "components": [
            {
                "type": "BODY",
                "text": full_body(t),
                "example": {"body_text": [[ex for _, ex in t["vars"]]]},
            }
        ],
    }


def main() -> int:
    problems = 0
    out = []
    for t in TEMPLATES:
        errs = check(t)
        status = "OK " if not errs else "ERR"
        print(f"{status} {t['name']:<34} {t['category']:<9} {len(t['vars'])} vars  {len(full_body(t))} chars")
        for e in errs:
            print("      -", e)
        problems += len(errs)
        out.append({
            "title": t["title"],
            "fields": [field for field, _ in t["vars"]],
            "request": request_body(t),
        })
    names = [t["name"] for t in TEMPLATES]
    if len(set(names)) != len(names):
        print("ERR duplicate template names")
        problems += 1
    path = Path(__file__).resolve().parents[1] / "php_backend" / "api" / "whatsapp_templates.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n{len(out)} templates, {problems} problem(s) -> {path}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
