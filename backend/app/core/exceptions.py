from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log and return detailed validation errors."""
    errors = exc.errors()
    logger.error(f"Validation error on {request.method} {request.url.path}")
    logger.error(f"Errors: {errors}")

    # Try to log the body
    try:
        body = await request.body()
        logger.error(f"Request body: {body.decode()}")
    except:
        pass

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": errors,
            "body_received": str(await request.body()) if request.method in ["POST", "PUT", "PATCH"] else None
        }
    )