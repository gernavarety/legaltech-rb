"""
Вебхуки от Bepaid.by.

POST /api/webhooks/bepaid — основной вебхук
Bepaid отправляет уведомления о результате платежа на этот URL.
Эндпоинт НЕ требует авторизации (Bepaid не передаёт JWT).
Безопасность обеспечивается проверкой HMAC-SHA256 подписи.

Документация вебхуков: https://docs.bepaid.by/en/webhooks
"""
import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from loguru import logger

from database import (
    get_plan_by_name,
    upsert_subscription,
    update_payment_status,
    create_payment,
    find_subscription_by_order_id,
    find_subscription_by_bepaid_id,
    reset_usage,
)
from notifications import EmailService
from payments import get_bepaid_client

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/bepaid")
async def bepaid_webhook(request: Request):
    """
    Обработчик вебхука Bepaid.

    Bepaid отправляет JSON в теле запроса и подпись в заголовке X-Webhook-Signature.
    Мы проверяем подпись, затем обрабатываем событие.

    Возможные типы событий:
    - payment.success     — платёж прошёл
    - payment.failed      — платёж отклонён
    - subscription.charge.success  — рекуррентное списание успешно
    - subscription.charge.failed   — рекуррентное списание провалилось
    """
    raw_body = await request.body()
    payload_str = raw_body.decode("utf-8")
    signature = request.headers.get("X-Webhook-Signature", "")

    # Верифицируем подпись
    bepaid = get_bepaid_client()
    if not bepaid.verify_webhook(payload_str, signature):
        logger.warning("Bepaid webhook: невалидная подпись")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Невалидная подпись")

    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Невалидный JSON")

    logger.info(f"Bepaid webhook получен: {json.dumps(payload, ensure_ascii=False)[:300]}")

    # Извлекаем данные транзакции
    transaction = payload.get("transaction") or payload.get("checkout", {})
    status_str = transaction.get("status", "")
    order_id = transaction.get("tracking_id") or transaction.get("order", {}).get("tracking_id")
    transaction_id = transaction.get("uid") or transaction.get("id")
    customer_email = (
        transaction.get("customer", {}).get("email") or
        payload.get("customer", {}).get("email", "")
    )
    # bepaid_uid — токен карты для рекуррентных платежей
    bepaid_uid = transaction.get("uid")
    amount_byn = transaction.get("amount", 0) / 100  # копейки → рубли

    if not order_id:
        logger.warning(f"Bepaid webhook: нет order_id в payload")
        return {"ok": True}

    # ── Успешный платёж ─────────────────────────────────────────────
    if status_str in ("successful", "paid", "captured"):
        await _handle_payment_success(
            order_id=order_id,
            transaction_id=transaction_id,
            bepaid_uid=bepaid_uid,
            customer_email=customer_email,
            amount_byn=amount_byn,
            payload=payload,
        )

    # ── Неуспешный платёж ───────────────────────────────────────────
    elif status_str in ("failed", "error", "expired"):
        reason = transaction.get("message") or transaction.get("be_message") or "Платёж отклонён"
        await update_payment_status(
            bepaid_order_id=order_id,
            status="failed",
            bepaid_transaction_id=transaction_id,
            payload_json=payload,
            failure_reason=reason,
        )
        logger.info(f"Bepaid payment failed: order={order_id} reason={reason}")

    # ── Рефанд ──────────────────────────────────────────────────────
    elif status_str == "refunded":
        await update_payment_status(
            bepaid_order_id=order_id,
            status="refunded",
            bepaid_transaction_id=transaction_id,
            payload_json=payload,
        )
        logger.info(f"Bepaid refund: order={order_id}")

    else:
        logger.info(f"Bepaid webhook: игнорируем статус '{status_str}' для order={order_id}")

    return {"ok": True}


async def _handle_payment_success(
    order_id: str,
    transaction_id: str,
    bepaid_uid: str,
    customer_email: str,
    amount_byn: float,
    payload: dict,
):
    """
    Логика при успешном платеже:
    1. Найти pending запись платежа по order_id
    2. Обновить статус платежа → success
    3. Найти или определить план из суммы
    4. Upsert подписку (период +1 месяц)
    5. Создать рекуррентную подписку в Bepaid (если есть bepaid_uid)
    6. Сбросить счётчик usage
    7. Отправить email с квитанцией
    """
    # Обновляем статус платежа
    user_id = await update_payment_status(
        bepaid_order_id=order_id,
        status="success",
        bepaid_transaction_id=transaction_id,
        bepaid_uid=bepaid_uid,
        payload_json=payload,
    )

    if not user_id:
        # Первый платёж — запись была создана при checkout, но могла потеряться
        logger.warning(f"Bepaid webhook: не найден платёж с order_id={order_id}")
        return

    # Определяем план по сумме (49 BYN ± → solo, 149 BYN ± → firm)
    # В реальной системе лучше хранить plan_name в metadata при создании payment token
    plan_name = "solo" if amount_byn < 100 else "firm"
    plan = await get_plan_by_name(plan_name)
    if not plan:
        logger.error(f"Bepaid webhook: план '{plan_name}' не найден в БД!")
        return

    # Период подписки: с сегодня до +1 месяц
    now = datetime.now(timezone.utc)
    period_start = now
    period_end = now + timedelta(days=30)

    # Upsert подписку
    sub_id = await upsert_subscription(
        user_id=user_id,
        plan_id=plan["id"],
        status="active",
        period_start=period_start,
        period_end=period_end,
        bepaid_order_id=order_id,
    )

    # Создаём рекуррентную подписку в Bepaid (для автопродления)
    if bepaid_uid:
        bepaid = get_bepaid_client()
        notify_url = f"https://api.lexai.by/api/webhooks/bepaid"
        try:
            sub_data = await bepaid.create_subscription(
                plan_name=plan_name,
                customer_email=customer_email,
                bepaid_uid=bepaid_uid,
                notify_url=notify_url,
                order_id=order_id,
            )
            bepaid_subscription_id = sub_data.get("subscription_id")
            if bepaid_subscription_id:
                await upsert_subscription(
                    user_id=user_id,
                    plan_id=plan["id"],
                    status="active",
                    period_start=period_start,
                    period_end=period_end,
                    bepaid_subscription_id=bepaid_subscription_id,
                )
        except Exception as e:
            logger.warning(f"Не удалось создать рекуррентную подписку Bepaid: {e}")

    # Сбрасываем счётчик использования
    await reset_usage(user_id=user_id, period_start=period_start, period_end=period_end)

    # Email квитанция
    email_service = EmailService()
    # Получаем exchange_rate из payload если есть
    exchange_rate = payload.get("transaction", {}).get("exchange_rate", 3.30)
    amount_usd = float(plan["price_usd"])

    await email_service.send_payment_receipt(
        to_email=customer_email,
        plan_display_name=plan["display_name"],
        amount_byn=amount_byn,
        amount_usd=amount_usd,
        period_end=period_end,
        transaction_id=transaction_id or order_id,
    )

    logger.info(
        f"Bepaid webhook success: user={user_id} plan={plan_name} "
        f"sub={sub_id} period={period_start.date()}→{period_end.date()}"
    )
