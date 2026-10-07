def reconcile(
    expected: list[str],
    rfid_detected: list[str],
    vision_detected: list[str]
):

    combined_detected = set(
        rfid_detected + vision_detected
    )

    expected_set = set(expected)

    missing = sorted(
        expected_set - combined_detected
    )

    unexpected = sorted(
        combined_detected - expected_set
    )

    if not missing and not unexpected:

        status = "verified"

    else:

        status = "mismatch"

    return {
        "status": status,
        "missing_items": missing,
        "unexpected_items": unexpected
    }