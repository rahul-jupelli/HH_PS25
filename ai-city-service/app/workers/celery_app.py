from celery import Celery
import os

BROKER = os.getenv("CELERY_BROKER", "amqp://guest:guest@rabbitmq:5672//")
BACKEND = os.getenv("CELERY_BACKEND", "rpc://")

celery_app = Celery(
    "city_tasks",
    broker=BROKER,
    backend=BACKEND
)

celery_app.conf.task_routes = {
    "tasks.generate_city": {"queue": "city_queue"}
}
