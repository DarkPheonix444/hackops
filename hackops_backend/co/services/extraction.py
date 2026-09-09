import re


PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
AADHAAR_PATTERN = re.compile(r"\b(?:[0-9]{4}[ -]?){2}[0-9]{4}\b")
DATE_PATTERN = re.compile(
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"
)
AMOUNT_PATTERN = re.compile(
    r"(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)",
    re.IGNORECASE,
)


def _clean_text(raw_text):
    return "\n".join(line.strip() for line in raw_text.splitlines() if line.strip())


def _find_labeled_value(text, labels):
    label_pattern = "|".join(re.escape(label) for label in labels)
    match = re.search(
        rf"(?:{label_pattern})\s*[:\-]?\s*([^\n|]+)",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None
    value = re.sub(r"\s+", " ", match.group(1)).strip(" :|-\t")
    return value or None


def _find_name(text, labels):
    value = _find_labeled_value(text, labels)
    if value:
        return value.upper()
    return None


def _normalise_aadhaar(value):
    digits = re.sub(r"\D", "", value)
    return digits if len(digits) == 12 else None


def _normalise_amount(value):
    try:
        return float(value.replace(",", ""))
    except (AttributeError, ValueError):
        return None


def _find_amount(text, labels):
    value = _find_labeled_value(text, labels)
    if not value:
        return None
    match = AMOUNT_PATTERN.search(value)
    return _normalise_amount(match.group(1)) if match else None


def _find_date(text, labels):
    value = _find_labeled_value(text, labels)
    if not value:
        return None
    match = DATE_PATTERN.search(value)
    return match.group(1) if match else None


def extract_pan(text):
    pan_match = PAN_PATTERN.search(text.upper())
    return {
        "document_type": "PAN",
        "fields": {
            "name": _find_name(text, ["name", "नाम"]),
            "pan": pan_match.group(0) if pan_match else None,
        },
    }


def extract_aadhaar(text):
    aadhaar_match = AADHAAR_PATTERN.search(text)
    return {
        "document_type": "AADHAAR",
        "fields": {
            "name": _find_name(text, ["name", "नाम"]),
            "aadhaar_number": (
                _normalise_aadhaar(aadhaar_match.group(0))
                if aadhaar_match
                else None
            ),
            "date_of_birth": _find_date(text, ["date of birth", "dob", "जन्म"]),
            "address": _find_labeled_value(text, ["address", "पता"]),
        },
    }


def extract_itr(text):
    return {
        "document_type": "ITR",
        "fields": {
            "name": _find_name(text, ["name of assessee", "assessee name", "name"]),
            "assessment_year": _find_labeled_value(
                text, ["assessment year", "a.y.", "ay"]
            ),
            "gross_income": _find_amount(
                text, ["gross total income", "gross income"]
            ),
            "taxable_income": _find_amount(
                text, ["total taxable income", "taxable income"]
            ),
        },
    }


def extract_income_computation(text):
    return {
        "document_type": "INCOME_COMPUTATION",
        "fields": {
            "name": _find_name(text, ["name", "assessee name"]),
            "financial_year": _find_labeled_value(
                text, ["financial year", "f.y.", "fy"]
            ),
            "total_income": _find_amount(
                text, ["total income", "gross total income", "gross income"]
            ),
        },
    }


def _extract_bank_transactions(text):
    transactions = []
    row_pattern = re.compile(
        r"^(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+"
        r"(?P<description>.+?)\s+"
        r"(?P<amount>[0-9][0-9,]*(?:\.\d{1,2})?)\s+"
        r"(?P<transaction_type>credit|debit|cr|dr)$",
        re.IGNORECASE,
    )
    for line in text.splitlines():
        match = row_pattern.match(line.strip())
        if not match:
            continue
        transactions.append(
            {
                "date": match.group("date"),
                "description": re.sub(r"\s+", " ", match.group("description")).strip(),
                "amount": _normalise_amount(match.group("amount")),
                "type": match.group("transaction_type").upper(),
            }
        )
    return transactions


def extract_bank_statement(text):
    transactions = _extract_bank_transactions(text)
    credits = [
        row["amount"]
        for row in transactions
        if row["type"] in {"CREDIT", "CR"} and row["amount"] is not None
    ]
    return {
        "document_type": "BANK_STATEMENT",
        "fields": {
            "account_holder_name": _find_name(
                text, ["account holder", "account name", "customer name", "name"]
            ),
            "account_number": _find_labeled_value(
                text, ["account number", "a/c no", "account no"]
            ),
            "statement_period": _find_labeled_value(
                text, ["statement period", "period"]
            ),
            "transaction_rows": transactions,
            "total_credits": round(sum(credits), 2) if credits else None,
            "average_credit": round(sum(credits) / len(credits), 2) if credits else None,
        },
    }


def extract_document_data(document_type, raw_text):
    text = _clean_text(raw_text)
    extractors = {
        "PAN": extract_pan,
        "AADHAAR": extract_aadhaar,
        "ITR": extract_itr,
        "INCOME_COMPUTATION": extract_income_computation,
        "BANK_STATEMENT": extract_bank_statement,
    }
    extractor = extractors.get(document_type)
    if extractor is None:
        return {"document_type": document_type, "fields": {}}
    return extractor(text)
