"""
Email уведомления через Resend.com.

Resend — современный email API, простой SDK, надёжная доставка.
Бесплатный тариф: 3000 писем/месяц, достаточно для старта.

Регистрация: https://resend.com
Добавить в .env: RESEND_API_KEY=re_...

Все шаблоны на русском языке, с брендингом LexAI.by.
"""
from datetime import datetime
from typing import Optional

import resend
from loguru import logger

from config import get_settings

settings = get_settings()


def _get_client():
    """Возвращает инициализированный Resend клиент."""
    if not settings.resend_api_key:
        return None
    resend.api_key = settings.resend_api_key
    return resend


def _html_wrapper(title: str, body: str) -> str:
    """Базовый HTML-шаблон для всех писем."""
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5; margin: 0; padding: 20px; color: #1a1a1a; }}
    .container {{ max-width: 600px; margin: 0 auto; background: white;
                  border-radius: 12px; overflow: hidden;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
               padding: 32px 40px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 24px; font-weight: 700; }}
    .header p {{ color: #93c5fd; margin: 8px 0 0; font-size: 14px; }}
    .body {{ padding: 40px; }}
    .body h2 {{ color: #1e3a5f; font-size: 20px; margin: 0 0 16px; }}
    .body p {{ color: #374151; line-height: 1.6; margin: 0 0 16px; }}
    .button {{ display: inline-block; background: #2563eb; color: white !important;
               padding: 14px 32px; border-radius: 8px; text-decoration: none;
               font-weight: 600; font-size: 15px; margin: 8px 0; }}
    .info-box {{ background: #f0f7ff; border-left: 4px solid #2563eb;
                 border-radius: 4px; padding: 16px 20px; margin: 20px 0; }}
    .info-box p {{ margin: 0; color: #1e3a5f; font-size: 14px; }}
    .divider {{ border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }}
    .footer {{ background: #f9fafb; padding: 24px 40px; text-align: center; }}
    .footer p {{ color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚖️ LexAI.by</h1>
      <p>AI-анализ договоров по праву Республики Беларусь</p>
    </div>
    <div class="body">
      {body}
    </div>
    <div class="footer">
      <p>
        © {datetime.now().year} LexAI.by · AI-помощник белорусского юриста<br>
        Если вы получили это письмо по ошибке — просто проигнорируйте его.
      </p>
    </div>
  </div>
</body>
</html>"""


class EmailService:
    """Сервис отправки транзакционных email через Resend.com."""

    def __init__(self):
        self.from_email = settings.from_email
        self.client = _get_client()

    async def _send(self, to_email: str, subject: str, html: str) -> bool:
        """
        Отправляет письмо. Логирует ошибки, но не бросает исключение
        чтобы не прерывать основной платёжный флоу.
        """
        if not self.client:
            logger.warning(f"Email не отправлен (RESEND_API_KEY не задан): {subject} → {to_email}")
            return False

        try:
            params = {
                "from": f"LexAI.by <{self.from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html,
            }
            self.client.Emails.send(params)
            logger.info(f"Email отправлен: {subject} → {to_email}")
            return True
        except Exception as e:
            logger.error(f"Ошибка отправки email '{subject}' → {to_email}: {e}")
            return False

    async def send_welcome(self, to_email: str, user_name: Optional[str] = None) -> bool:
        """Приветственное письмо после регистрации."""
        name = user_name or to_email.split("@")[0]
        body = f"""
        <h2>Добро пожаловать в LexAI.by, {name}!</h2>
        <p>Ваш аккаунт успешно создан. Теперь вы можете загружать договоры
        на анализ — AI проверит их на риски по законодательству Республики Беларусь.</p>

        <div class="info-box">
          <p><strong>Бесплатный план включает:</strong></p>
          <p>• 3 проверки договоров в месяц<br>
             • Анализ рисков по ГК РБ, ТК РБ, ХПК РБ<br>
             • Просмотр результатов в браузере</p>
        </div>

        <p>Для полного доступа (история, скачивание отчётов, безлимит) —
        рассмотрите тарифы SOLO или FIRM.</p>

        <a href="{settings.frontend_url}" class="button">Начать работу</a>
        """
        return await self._send(
            to_email=to_email,
            subject="Добро пожаловать в LexAI.by! ⚖️",
            html=_html_wrapper("Добро пожаловать в LexAI.by", body),
        )

    async def send_payment_receipt(
        self,
        to_email: str,
        plan_display_name: str,
        amount_byn: float,
        amount_usd: float,
        period_end: datetime,
        transaction_id: str,
    ) -> bool:
        """Квитанция об успешной оплате подписки."""
        body = f"""
        <h2>Оплата прошла успешно ✅</h2>
        <p>Ваша подписка на тариф <strong>{plan_display_name}</strong> активирована.</p>

        <div class="info-box">
          <p><strong>Детали платежа:</strong></p>
          <p>
            Тариф: <strong>{plan_display_name}</strong><br>
            Сумма: <strong>{amount_byn:.2f} BYN</strong> (${amount_usd:.2f})<br>
            Следующее списание: <strong>{period_end.strftime('%d.%m.%Y')}</strong><br>
            Номер транзакции: <code>{transaction_id}</code>
          </p>
        </div>

        <p>Подписка действует до <strong>{period_end.strftime('%d.%m.%Y')}</strong>.
        После этой даты будет произведено автоматическое продление.</p>

        <a href="{settings.frontend_url}/dashboard" class="button">Личный кабинет</a>

        <hr class="divider">
        <p style="font-size: 13px; color: #6b7280;">
          Для управления подпиской перейдите в раздел
          <a href="{settings.frontend_url}/settings">Настройки</a>.
          Вы можете отменить подписку в любой момент — доступ сохранится до конца оплаченного периода.
        </p>
        """
        return await self._send(
            to_email=to_email,
            subject=f"Квитанция об оплате LexAI.by — {plan_display_name}",
            html=_html_wrapper("Квитанция об оплате", body),
        )

    async def send_subscription_expiring(
        self,
        to_email: str,
        plan_display_name: str,
        period_end: datetime,
        days_left: int,
    ) -> bool:
        """Напоминание за 3 дня до окончания подписки."""
        body = f"""
        <h2>Ваша подписка истекает через {days_left} {_days_word(days_left)}</h2>
        <p>Подписка <strong>{plan_display_name}</strong> действует до
        <strong>{period_end.strftime('%d.%m.%Y')}</strong>.</p>

        <p>После этой даты ваш аккаунт автоматически перейдёт на бесплатный план
        (3 проверки в месяц, без скачивания отчётов).</p>

        <div class="info-box">
          <p>Если подписка настроена на автопродление — списание произойдёт автоматически
          и дополнительных действий не требуется.</p>
        </div>

        <a href="{settings.frontend_url}/pricing" class="button">Продлить подписку</a>
        """
        return await self._send(
            to_email=to_email,
            subject=f"Подписка LexAI.by истекает через {days_left} {_days_word(days_left)}",
            html=_html_wrapper("Истекает подписка", body),
        )

    async def send_subscription_cancelled(
        self,
        to_email: str,
        plan_display_name: str,
        access_until: datetime,
    ) -> bool:
        """Подтверждение отмены подписки."""
        body = f"""
        <h2>Подписка отменена</h2>
        <p>Ваша подписка <strong>{plan_display_name}</strong> отменена.</p>

        <div class="info-box">
          <p>Доступ к функциям тарифа сохраняется до
          <strong>{access_until.strftime('%d.%m.%Y')}</strong>.
          После этой даты аккаунт перейдёт на бесплатный план.</p>
        </div>

        <p>Мы будем рады видеть вас снова! Если хотите возобновить подписку —
        это можно сделать в любой момент.</p>

        <a href="{settings.frontend_url}/pricing" class="button">Возобновить подписку</a>
        """
        return await self._send(
            to_email=to_email,
            subject="Подписка LexAI.by отменена",
            html=_html_wrapper("Подписка отменена", body),
        )

    async def send_limit_reached(
        self,
        to_email: str,
        checks_used: int,
        plan_display_name: str,
        upgrade_plan: str,
    ) -> bool:
        """Уведомление о достижении лимита проверок."""
        body = f"""
        <h2>Лимит проверок исчерпан</h2>
        <p>Вы использовали все <strong>{checks_used}</strong> проверок договоров
        в рамках тарифа <strong>{plan_display_name}</strong> в этом месяце.</p>

        <p>Чтобы продолжить работу, перейдите на тариф <strong>{upgrade_plan}</strong>:</p>

        <div class="info-box">
          <p>
            <strong>SOLO — $49/мес:</strong> 50 проверок, история, скачивание отчётов<br>
            <strong>FIRM — $149/мес:</strong> безлимит, командный доступ, API
          </p>
        </div>

        <a href="{settings.frontend_url}/pricing" class="button">Выбрать тариф</a>
        """
        return await self._send(
            to_email=to_email,
            subject="Лимит проверок на LexAI.by исчерпан",
            html=_html_wrapper("Лимит проверок исчерпан", body),
        )

    async def send_team_invite(
        self,
        to_email: str,
        inviter_email: str,
        invite_url: str,
    ) -> bool:
        """Приглашение присоединиться к команде (тариф FIRM)."""
        body = f"""
        <h2>Вас пригласили в команду LexAI.by</h2>
        <p>Пользователь <strong>{inviter_email}</strong> приглашает вас
        присоединиться к команде на тарифе <strong>FIRM</strong>.</p>

        <p>После принятия приглашения у вас появится доступ к безлимитным
        проверкам договоров в рамках корпоративной подписки.</p>

        <a href="{invite_url}" class="button">Принять приглашение</a>

        <hr class="divider">
        <p style="font-size: 13px; color: #6b7280;">
          Ссылка действительна 7 дней. Если вы не ожидали этого письма —
          проигнорируйте его.
        </p>
        """
        return await self._send(
            to_email=to_email,
            subject=f"{inviter_email} приглашает вас в команду LexAI.by",
            html=_html_wrapper("Приглашение в команду", body),
        )


def _days_word(n: int) -> str:
    """Склонение слова 'день' по-русски."""
    if 11 <= n % 100 <= 19:
        return "дней"
    r = n % 10
    if r == 1:
        return "день"
    if 2 <= r <= 4:
        return "дня"
    return "дней"
