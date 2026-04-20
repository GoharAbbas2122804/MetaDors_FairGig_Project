import hashlib
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/fairgig")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "fairgig")
ANON_SALT = os.getenv("ANON_SALT", "fairgig-anon-salt")
FRONTEND_ORIGINS = [
    origin.strip() for origin in os.getenv("FRONTEND_ORIGINS", "").split(",") if origin.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    app.state.mongo_client = mongo_client
    app.state.db = mongo_client[MONGO_DB_NAME]
    try:
        yield
    finally:
        mongo_client.close()


app = FastAPI(
    title="FairGig Analytics Service",
    description="Aggregated and privacy-safe analytics APIs for advocates.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"https?://.*" if not FRONTEND_ORIGINS else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ZoneDistributionItem(BaseModel):
    city_zone: str
    shift_count: int
    worker_count: int
    average_net_income: float
    min_net_income: float
    max_net_income: float
    volatility_stddev: float


class VulnerabilityItem(BaseModel):
    worker_id_hash: str
    previous_30d_income: float
    last_30d_income: float
    drop_percent: float


class CommissionTrendItem(BaseModel):
    month: str
    month_start: datetime
    platform: str
    average_commission_rate: float
    shift_count: int


def _db() -> AsyncIOMotorDatabase:
    return app.state.db


def anonymize_worker_id(worker_id: Any) -> str:
    raw = f"{ANON_SALT}:{worker_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "analytics"}


@app.get(
    "/analytics/zonal-distribution",
    response_model=List[ZoneDistributionItem],
    tags=["Advocate Dashboard"],
    summary="Get zonal income distribution and volatility",
)
async def zonal_distribution():
    try:
        pipeline: List[Dict[str, Any]] = [
            {
                "$lookup": {
                    "from": "users",
                    "localField": "workerId",
                    "foreignField": "_id",
                    "as": "worker",
                }
            },
            {"$unwind": "$worker"},
            {
                "$group": {
                    "_id": {"$ifNull": ["$worker.demographics.cityZone", "unknown"]},
                    "shiftCount": {"$sum": 1},
                    "workers": {"$addToSet": "$workerId"},
                    "averageNetIncome": {"$avg": "$net"},
                    "minNetIncome": {"$min": "$net"},
                    "maxNetIncome": {"$max": "$net"},
                    "volatilityStdDev": {"$stdDevPop": "$net"},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "city_zone": "$_id",
                    "shift_count": "$shiftCount",
                    "worker_count": {"$size": "$workers"},
                    "average_net_income": {"$ifNull": ["$averageNetIncome", 0]},
                    "min_net_income": {"$ifNull": ["$minNetIncome", 0]},
                    "max_net_income": {"$ifNull": ["$maxNetIncome", 0]},
                    "volatility_stddev": {"$ifNull": ["$volatilityStdDev", 0]},
                }
            },
            {"$sort": {"shift_count": -1}},
        ]

        rows = await _db().shifts.aggregate(pipeline).to_list(length=None)
        return rows
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to aggregate zonal analytics: {exc}")


@app.get(
    "/analytics/commission-trend",
    response_model=List[CommissionTrendItem],
    tags=["Advocate Dashboard"],
    summary="Get monthly commission trend by platform",
)
async def commission_trend():
    try:
        current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        lookback_start = (current_month_start - timedelta(days=330)).replace(day=1)

        pipeline: List[Dict[str, Any]] = [
            {
                "$project": {
                    "platform": {"$ifNull": ["$platform", "Unknown"]},
                    "gross": {"$ifNull": ["$gross", 0]},
                    "deductions": {"$ifNull": ["$deductions", 0]},
                    "shiftDate": {"$ifNull": ["$date", "$createdAt"]},
                }
            },
            {
                "$match": {
                    "shiftDate": {"$gte": lookback_start},
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$shiftDate"},
                        "month": {"$month": "$shiftDate"},
                        "platform": "$platform",
                    },
                    "averageCommissionRate": {
                        "$avg": {
                            "$cond": [
                                {"$gt": ["$gross", 0]},
                                {"$multiply": [{"$divide": ["$deductions", "$gross"]}, 100]},
                                0,
                            ]
                        }
                    },
                    "shiftCount": {"$sum": 1},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "platform": "$_id.platform",
                    "month_start": {
                        "$dateFromParts": {
                            "year": "$_id.year",
                            "month": "$_id.month",
                            "day": 1,
                            "timezone": "UTC",
                        }
                    },
                    "average_commission_rate": {"$ifNull": ["$averageCommissionRate", 0]},
                    "shift_count": "$shiftCount",
                }
            },
            {"$sort": {"month_start": 1, "platform": 1}},
        ]

        rows = await _db().shifts.aggregate(pipeline).to_list(length=None)
        response: List[CommissionTrendItem] = []

        for row in rows:
            month_start = row["month_start"]
            response.append(
                CommissionTrendItem(
                    month=month_start.strftime("%b %Y"),
                    month_start=month_start,
                    platform=str(row.get("platform", "Unknown")),
                    average_commission_rate=round(float(row.get("average_commission_rate", 0)), 2),
                    shift_count=int(row.get("shift_count", 0)),
                )
            )

        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute commission trend: {exc}")


@app.get(
    "/analytics/vulnerability-flag",
    response_model=List[VulnerabilityItem],
    tags=["Advocate Dashboard"],
    summary="Flag workers with >20% income drop",
)
async def vulnerability_flag():
    try:
        now = datetime.now(timezone.utc)
        last_30_start = now - timedelta(days=30)
        prev_30_start = now - timedelta(days=60)

        pipeline: List[Dict[str, Any]] = [
            {
                "$project": {
                    "workerId": 1,
                    "net": {"$ifNull": ["$net", 0]},
                    "shiftDate": {"$ifNull": ["$date", "$createdAt"]},
                }
            },
            {
                "$match": {
                    "shiftDate": {"$gte": prev_30_start, "$lt": now},
                }
            },
            {
                "$group": {
                    "_id": "$workerId",
                    "last30Income": {
                        "$sum": {
                            "$cond": [
                                {"$gte": ["$shiftDate", last_30_start]},
                                "$net",
                                0,
                            ]
                        }
                    },
                    "prev30Income": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$gte": ["$shiftDate", prev_30_start]},
                                        {"$lt": ["$shiftDate", last_30_start]},
                                    ]
                                },
                                "$net",
                                0,
                            ]
                        }
                    },
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "workerId": "$_id",
                    "last30Income": 1,
                    "prev30Income": 1,
                    "dropPercent": {
                        "$cond": [
                            {"$gt": ["$prev30Income", 0]},
                            {
                                "$multiply": [
                                    {
                                        "$divide": [
                                            {"$subtract": ["$prev30Income", "$last30Income"]},
                                            "$prev30Income",
                                        ]
                                    },
                                    100,
                                ]
                            },
                            0,
                        ]
                    },
                }
            },
            {"$match": {"dropPercent": {"$gt": 20}}},
            {"$sort": {"dropPercent": -1}},
        ]

        rows = await _db().shifts.aggregate(pipeline).to_list(length=None)
        response: List[VulnerabilityItem] = []
        for row in rows:
            response.append(
                VulnerabilityItem(
                    worker_id_hash=anonymize_worker_id(row["workerId"]),
                    previous_30d_income=round(float(row.get("prev30Income", 0)), 2),
                    last_30d_income=round(float(row.get("last30Income", 0)), 2),
                    drop_percent=round(float(row.get("dropPercent", 0)), 2),
                )
            )

        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute vulnerability flags: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
