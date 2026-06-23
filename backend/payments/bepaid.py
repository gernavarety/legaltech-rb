"""
Клиент Bepaid.by — главный платёжный шлюз Республики Беларусь.

Документация API: https://docs.bepaid.by
Тестовый режим: используй BEPAID_TEST_MODE=true и тестовые карты из документации.

Тестовые карты Bepaid (только в тестовом режиме):
  Успешная оплата:    4200000000000000 CVV: 123 Exp: 01/30
  Отклонение:         4005550000000019 CVV: 123 Exp: 01/30
  3D-Secure:          4200000000000018 CVV: 123 Exp: 01/30

Bepaid работает через HTTP Basic Auth: shop_id:secret_key
"""
import hashlib
import hmac
import json
import uuid
from typing import Optional

import httpx
from loguru import logger

from config import get_settings
from utils.currency import usd_to_byn_kopecks, usd_to_byn

settings = get_settings()


class BePaidError(Exception):
    """Ошибка при работе с Bepaid API."""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class BePaidClient:
    """
    Асинхронный клиент для Bepaid.by API.

    Основные операции:
    - create_payment_token: создать токен для редиректа на страницу оплаты
    - create_subscription: создать рекуррентную подписку
    - charge_subscription: списать по рекуррентной подписке
    - cancel_subscription: отменить подписку
    - verify_webhook: проверить подпись вебхука

    Все суммы в API Bepaid передаются в копейках (1 BYN = 100 копеек).
    """

    BASE_URL = "https://api.bepaid.by"

    # Цены тарифов в USD
    PLAN_PRICES: dict[str, float] = {
        "solo": 49.0,
        "firm": 149.0,
    }

    def __init__(self):
        self.shop_id = settings.bepaid_shop_id
        self.secret_key = settings.bepaid_secret_key
        self.public_key = settings.bepaid_public_key
        self.test_mode = settings.bepaid_test_mode

        if not self.shop_id or not self.secret_key:
            logger.warning(
                "Bepaid не настроен (BEPAID_SHOP_ID / BEPAID_SECRET_KEY отсутствуют). "
                "Используется тестовый режим-заглушка."
            )

    def _auth(self) -> tuple[str, str]:
        """HTTP Basic Auth для Bepaid API: shop_id:secret_key."""
        return (self.shop_id, self.secret_key)

    async def _post(self, endpoint: str, payload: dict) -> dict:
        """Выполняет POST запрос к Bepaid API."""
        url = f"{self.BASE_URL}{endpoint}"
        logger.debug(f"Bepaid POST {endpoint}: {json.dumps(payload, ensure_ascii=False)[:200]}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                auth=self._auth(),
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )

        data = response.json()
        logger.debug(f"Bepaid ответ {response.status_code}: {json.dumps(data, ensure_ascii=False)[:300]}")

        if response.status_code >= 400:
            error_msg = data.get("message") or data.get("errors", {}) or "Ошибка Bepaid API"
            raise BePaidError(
                message=str(error_msg),
                status_code=response.status_code,
                response=data,
            )

        return data

    async def _get(self, endpoint: str) -> dict:
        """Выполняет GET запрос к Bepaid API."""
        url = f"{self.BASE_URL}{endpoint}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, auth=self._auth())
        return response.json()

    # ── Платёжный токен (редирект на checkout) ────────────────────────

    async def create_payment_token(
        self,
        amount_usd: float,
        order_id: str,
        description: str,
        customer_email: str,
        return_url: str,
        notify_url: str,
        plan_name: str,
    ) -> dict:
        """
        Создаёт токен для редиректа пользователя на страницу оплаты Bepaid.

        Args:
            amount_usd: сумма в долларах (будет конвертирована в BYN)
            order_id: уникальный ID заказа (наш UUID)
            description: описание платежа (для квитанции)
            customer_email: email покупателя
            return_url: URL для редиректа после оплаты (success/fail)
            notify_url: URL для вебхука Bepaid
            plan_name: 'solo' | 'firm' (для метаданных)

        Returns:
            dict с ключами: token, redirect_url
        """
        # Если магазин не настроен — возвращаем заглушку для разработки
        if not self.shop_id:
            return self._stub_payment_token(order_id, customer_email)

        amount_kopecks = await usd_to_byn_kopecks(amount_usd)
        amount_byn = await usd_to_byn(amount_usd)

        payload = {
            "checkout": {
                "test": self.test_mode,
                "transaction_type": "payment",
                "order": {
                    "currency": "BYR",  # Белорусский рубль в системе Bepaid
                    "amount": amount_kopecks,
                    "description": description,
                    "tracking_id": order_id,
                    "additional_data": {
                        "receipt_text": [
                            f"Подписка LexAI.by — тариф {plan_name.upper()}",
                            f"Сумма: {amount_byn:.2f} BYN (${amount_usd:.2f})",
                        ]
                    }
                },
                "settings": {
                    "success_url": return_url.replace("{status}", "success"),
                    "fail_url": return_url.replace("{status}", "fail"),
                    "notification_url": notify_url,
                    "language": "ru",
                    "customer_fields": {
                        "hidden": ["email"],
                        "read_only": ["email"],
                    }
                },
                "customer": {
                    "email": customer_email,
                },
            }
        }

        data = await self._post("/ctp/api/checkouts", payload)
        token = data["checkout"]["token"]
        redirect_url = f"{settings.bepaid_checkout_url}/?token={token}"
        logger.info(f"Bepaid токен создан для заказа {order_id}: {token[:8]}...")
        return {
            "token": token,
            "redirect_url": redirect_url,
            "amount_kopecks": amount_kopecks,
            "amount_byn": amount_byn,
        }

    # ── Рекуррентная подписка ──────────────────────────────────────────

    async def create_subscription(
        self,
        plan_name: str,
        customer_email: str,
        bepaid_uid: str,      # токен карты после первого успешного платежа
        notify_url: str,
        order_id: str,
    ) -> dict:
        """
        Создаёт рекуррентную подписку на основе токена карты (bepaid_uid).

        bepaid_uid — уникальный токен карты, который Bepaid возвращает
        в вебхуке после первого успешного платежа. Используется для
        последующих автоматических списаний.

        Returns:
            dict с ключом subscription_id
        """
        if not self.shop_id:
            return {"subscription_id": f"stub-sub-{uuid.uuid4()}"}

        amount_usd = self.PLAN_PRICES.get(plan_name, 49.0)
        amount_kopecks = await usd_to_byn_kopecks(amount_usd)

        payload = {
            "request": {
                "uid": bepaid_uid,
                "amount": amount_kopecks,
                "currency": "BYR",
                "description": f"Подписка LexAI.by {plan_name.upper()} — ежемесячное списание",
                "tracking_id": order_id,
                "notification_url": notify_url,
                "customer": {
                    "email": customer_email,
                },
                "recurring": {
                    "plan": {
                        "amount": amount_kopecks,
                        "currency": "BYR",
                        "interval": 1,
                        "interval_unit": "month",
                    }
                }
            }
        }

        data = await self._post("/beyag/subscriptions", payload)
        subscription_id = data.get("subscription", {}).get("id") or data.get("id")
        logger.info(f"Bepaid подписка создана: {subscription_id} для {customer_email}")
        return {"subscription_id": str(subscription_id)}

    async def get_subscription(self, subscription_id: str) -> dict:
        """Получает статус рекуррентной подписки."""
        if not self.shop_id:
            return {"id": subscription_id, "status": "active"}

        return await self._get(f"/beyag/subscriptions/{subscription_id}")

    async def cancel_subscription(self, subscription_id: str) -> bool:
        """
        Отменяет рекуррентную подписку в Bepaid.
        После отмены списания прекратятся — но текущий период остаётся оплаченным.
        """
        if not self.shop_id:
            logger.info(f"Stub: отмена подписки {subscription_id}")
            return True

        try:
            data = await self._post(f"/beyag/subscriptions/{subscription_id}/cancel", {})
            logger.info(f"Bepaid подписка {subscription_id} отменена")
            return True
        except BePaidError as e:
            logger.error(f"Ошибка отмены подписки {subscription_id}: {e}")
            return False

    # ── Проверка подписи вебхука ──────────────────────────────────────

    def verify_webhook(self, payload_str: str, signature: str) -> bool:
        """
        Верифицирует подпись вебхука от Bepaid.

        Bepaid подписывает вебхуки через HMAC-SHA256.
        Подпись передаётся в заголовке: X-Webhook-Signature

        Args:
            payload_str: тело запроса в виде строки (raw bytes.decode)
            signature: значение заголовка X-Webhook-Signature

        Returns:
            True если подпись валидна
        """
        if not self.secret_key:
            logger.warning("Верификация вебхука пропущена: BEPAID_SECRET_KEY не задан")
            return True  # В тестовом режиме без ключа пропускаем

        expected = hmac.new(
            self.secret_key.encode("utf-8"),
            payload_str.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        is_valid = hmac.compare_digest(expected, signature)
        if not is_valid:
            logger.warning(f"Невалидная подпись вебхука Bepaid. Ожидали: {expected[:16]}...")
        return is_valid

    # ── Заглушки для режима разработки ───────────────────────────────

    def _stub_payment_token(self, order_id: str, email: str) -> dict:
        """
        Возвращает mock-токен когда Bepaid не настроен.
        Редиректит на страницу /payment/success без реального платежа.
        """
        stub_token = f"stub_{uuid.uuid4().hex}"
        return_base = f"{settings.frontend_url}/payment"
        logger.info(f"STUB: создан платёжный токен {stub_token} для {email}")
        return {
            "token": stub_token,
            "redirect_url": f"{return_base}/success?order_id={order_id}&stub=true",
            "amount_kopecks": 0,
            "amount_byn": 0.0,
            "is_stub": True,
        }


# Singleton — один экземпляр на всё приложение
_bepaid_client: Optional[BePaidClient] = None


def get_bepaid_client() -> BePaidClient:
    global _bepaid_client
    if _bepaid_client is None:
        _bepaid_client = BePaidClient()
    return _bepaid_client
