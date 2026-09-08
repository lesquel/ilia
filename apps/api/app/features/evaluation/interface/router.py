"""The Lab: submitting prompts and reading results.

All authenticated. Identity comes from the token — a submission is always
attributed to whoever is holding the session, never to a body parameter.
"""

from uuid import UUID

from fastapi import APIRouter, Request, status

from app.features.auth.interface.dependencies import CurrentUser
from app.features.evaluation.application.use_cases import (
    GetSubmissionResult,
    SubmitPrompt,
)
from app.features.evaluation.domain.errors import ActivityNotFoundError
from app.features.evaluation.interface.dependencies import (
    ActivitiesDep,
    EvaluationsDep,
    QueueDep,
    QuotaDep,
    SubmissionsDep,
)
from app.features.evaluation.interface.schemas import (
    ActivityResponse,
    EvaluationResponse,
    SubmissionResponse,
    SubmissionResultResponse,
    SubmitPromptRequest,
)

router = APIRouter(prefix="/lab", tags=["lab"])


@router.get("/activities/{activity_id}", response_model=ActivityResponse)
async def read_activity(
    activity_id: UUID,
    user: CurrentUser,
    activities: ActivitiesDep,
    submissions: SubmissionsDep,
) -> ActivityResponse:
    activity = await activities.get(activity_id)
    if activity is None:
        raise ActivityNotFoundError()

    used = await submissions.count_attempts(user_id=user.id, activity_id=activity_id)

    return ActivityResponse.from_entity(activity, attempts_used=used)


@router.post(
    "/activities/{activity_id}/submissions",
    response_model=SubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_prompt(
    activity_id: UUID,
    payload: SubmitPromptRequest,
    request: Request,
    user: CurrentUser,
    activities: ActivitiesDep,
    submissions: SubmissionsDep,
    quota: QuotaDep,
    queue: QueueDep,
) -> SubmissionResponse:
    """Accept a prompt for evaluation.

    **202, not 201.** The work has been accepted, not finished: an execution
    plus a judging step takes tens of seconds and cannot be held inside an HTTP
    request (TRD 3). The client polls the result endpoint with the id returned
    here.
    """
    submission = await SubmitPrompt(
        activities=activities,
        submissions=submissions,
        quota=quota,
        queue=queue,
        clock=request.app.state.auth["clock"],
    ).execute(user_id=user.id, activity_id=activity_id, prompt=payload.prompt)

    return SubmissionResponse.from_entity(submission)


@router.get("/submissions/{submission_id}", response_model=SubmissionResultResponse)
async def read_submission(
    submission_id: UUID,
    user: CurrentUser,
    submissions: SubmissionsDep,
    evaluations: EvaluationsDep,
) -> SubmissionResultResponse:
    """Submission and evaluation together.

    One URL for both states, so the client polls the same place while it waits
    and after it finishes.
    """
    submission, evaluation = await GetSubmissionResult(
        submissions=submissions, evaluations=evaluations
    ).execute(user_id=user.id, submission_id=submission_id)

    return SubmissionResultResponse(
        submission=SubmissionResponse.from_entity(submission),
        evaluation=EvaluationResponse.from_entity(evaluation) if evaluation else None,
    )


@router.get("/activities/{activity_id}/submissions", response_model=list[SubmissionResponse])
async def list_my_submissions(
    activity_id: UUID,
    user: CurrentUser,
    submissions: SubmissionsDep,
) -> list[SubmissionResponse]:
    mine = await submissions.list_for_activity(user_id=user.id, activity_id=activity_id)
    return [SubmissionResponse.from_entity(item) for item in mine]
