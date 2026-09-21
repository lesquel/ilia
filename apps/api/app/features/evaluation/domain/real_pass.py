"""When a passed evaluation counts toward syllabus progress and certificates.

The stub writes `local-stub` on `Evaluation.model` (`local_provider.MODEL_NAME`).
Those notes are for trying the lab without a provider; they must not tick the
temario or mint a certificate.
"""

# Keep in sync with `local_provider.MODEL_NAME` (see `test_certificates_domain`).
SIMULATED_EVALUATION_MODEL = "local-stub"


def counts_as_real_pass(*, passed: bool, model: str) -> bool:
    return passed and model != SIMULATED_EVALUATION_MODEL
