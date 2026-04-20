import os
from statistics import mean
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(
    title="FairGig Anomaly Service",
    description="Detects suspicious income and deduction patterns from shift data.",
    version="1.0.0",
)

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=r"https?://.*" if not frontend_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ShiftInput(BaseModel):
    gross: float = Field(..., ge=0)
    deductions: float = Field(..., ge=0)
    net: float = Field(..., ge=0)
    hours: float = Field(..., gt=0)

    model_config = ConfigDict(extra="forbid")


class DetectAnomaliesRequest(BaseModel):
    shifts: List[ShiftInput] = Field(..., min_length=1)

    model_config = ConfigDict(extra="forbid")


class AnomalyItem(BaseModel):
    shift_index: int
    type: str
    human_readable_explanation: str
    metrics: dict


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "anomaly"}


@app.post(
    "/detect-anomalies",
    response_model=List[AnomalyItem],
    tags=["Anomaly Detection"],
    summary="Detect anomalous shift patterns",
)
async def detect_anomalies(payload: DetectAnomaliesRequest):
    shifts = payload.shifts
    anomalies: List[AnomalyItem] = []

    rolling_window = 5
    deduction_multiplier_threshold = 1.4
    net_drop_threshold = 0.25

    for index, shift in enumerate(shifts):
        history = shifts[max(0, index - rolling_window) : index]
        if not history:
            continue

        avg_deductions = mean(item.deductions for item in history)
        avg_net = mean(item.net for item in history)

        if avg_deductions > 0:
            deductions_ratio = shift.deductions / avg_deductions
            if deductions_ratio >= deduction_multiplier_threshold:
                percent_higher = (deductions_ratio - 1) * 100
                anomalies.append(
                    AnomalyItem(
                        shift_index=index,
                        type="high_deductions",
                        human_readable_explanation=(
                            f"Shift #{index + 1} deductions were {percent_higher:.1f}% higher "
                            f"than your recent rolling average."
                        ),
                        metrics={
                            "current_deductions": round(shift.deductions, 2),
                            "rolling_avg_deductions": round(avg_deductions, 2),
                            "ratio": round(deductions_ratio, 3),
                        },
                    )
                )

        if avg_net > 0:
            net_drop_ratio = (avg_net - shift.net) / avg_net
            if net_drop_ratio >= net_drop_threshold:
                anomalies.append(
                    AnomalyItem(
                        shift_index=index,
                        type="net_income_drop",
                        human_readable_explanation=(
                            f"Shift #{index + 1} net income dropped by {net_drop_ratio * 100:.1f}% "
                            f"versus your recent rolling average."
                        ),
                        metrics={
                            "current_net": round(shift.net, 2),
                            "rolling_avg_net": round(avg_net, 2),
                            "drop_ratio": round(net_drop_ratio, 3),
                        },
                    )
                )

    return anomalies


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
