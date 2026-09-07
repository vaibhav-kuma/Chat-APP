"""
AI CareerOS - Resume Processing Tasks
Celery tasks for async resume processing pipeline
"""

import asyncio
import logging
from datetime import datetime

from app.config.settings import settings
from app.tasks.celery_app import celery_app
from app.db.session import async_session

logger = logging.getLogger(__name__)


def _get_async_session():
    """Get an async database session for Celery tasks"""
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, sessionmaker

    from app.config.settings import settings

    engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,
    )

    async_session_local = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    return async_session_local(), engine


async def _process_resume_async(resume_id: str) -> bool:
    """Async processing function - called by Celery task"""
    from app.services.pipeline import processing_pipeline
    from app.models.resume import Resume

    async_session, engine = _get_async_session()

    try:
        async with async_session as db:
            resume = await db.get(Resume, resume_id)
            if not resume:
                logger.error(f"Resume not found for processing: {resume_id}")
                return False

            result = await processing_pipeline.process_resume(db, resume_id)
            await db.close()
            return result

    except Exception as e:
        logger.error(f"Resume processing task failed for {resume_id}: {e}", exc_info=True)
        return False

    finally:
        await engine.dispose()


@celery_app.task(bind=True, name="app.tasks.resume_tasks.process_resume")
def process_resume(self, resume_id: str) -> bool:
    """Celery task: process a resume through the full AI pipeline"""
    logger.info(f"Starting resume processing task: resume_id={resume_id}, task_id={self.request.id}")
    try:
        result = asyncio.run(_process_resume_async(resume_id))
        logger.info(f"Resume processing task completed: resume_id={resume_id}, result={result}")
        return result
    except Exception as e:
        logger.error(f"Resume processing task failed: resume_id={resume_id}, error={e}", exc_info=True)
        self.retry(exc=e, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.resume_tasks.process_resume_stage")
def process_resume_stage(self, resume_id: str, stage_name: str) -> bool:
    """Celery task: process a specific stage of resume processing"""
    logger.info(f"Starting resume stage processing: resume_id={resume_id}, stage={stage_name}")
    try:
        asyncio.run(_process_resume_stage_async(resume_id, stage_name))
        return True
    except Exception as e:
        logger.error(f"Stage processing failed: resume_id={resume_id}, stage={stage_name}, error={e}")
        self.retry(exc=e, countdown=30, max_retries=3)


async def _process_resume_stage_async(resume_id: str, stage_name: str) -> None:
    """Process a specific stage of resume processing"""
    from app.services.pipeline import processing_pipeline
    from app.models.resume import Resume

    async_session, engine = _get_async_session()

    try:
        async with async_session as db:
            resume = await db.get(Resume, resume_id)
            if not resume:
                logger.error(f"Resume not found: {resume_id}")
                return

            stage_method = getattr(processing_pipeline, f"_stage_{stage_name}", None)
            if stage_method and callable(stage_method):
                await stage_method(db, resume)
            else:
                logger.warning(f"Unknown stage: {stage_name}")

    finally:
        await engine.dispose()


@celery_app.task(bind=True, name="app.tasks.resume_tasks.reprocess_resume")
def reprocess_resume(self, resume_id: str) -> bool:
    """Celery task: re-process a resume after user edits"""
    logger.info(f"Reprocessing resume: resume_id={resume_id}")
    try:
        result = asyncio.run(_process_resume_async(resume_id))
        return result
    except Exception as e:
        logger.error(f"Resume reprocessing failed: resume_id={resume_id}, error={e}")
        return False
