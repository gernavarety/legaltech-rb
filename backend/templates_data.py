"""
Данные 20 шаблонов юридических документов по праву Республики Беларусь.
Каждый шаблон содержит полную fields_schema для динамической формы.

Типы полей:
  text     — однострочный ввод
  textarea — многострочный ввод
  number   — числовой ввод
  date     — дата (дд.мм.гггг)
  select   — выпадающий список
  boolean  — переключатель Да/Нет
"""

TEMPLATES: list[dict] = [

    # ════════════════════════════════════════════════
    # ГРУППА: ДОГОВОРЫ
    # ════════════════════════════════════════════════

    {
        "slug": "sale_purchase_agreement",
        "name": "Договор купли-продажи",
        "group_name": "Договоры",
        "description": "Договор купли-продажи товара между юридическими или физическими лицами. Регулирует передачу права собственности, порядок оплаты и ответственность сторон.",
        "law_references": ["ст. 424 ГК РБ", "ст. 428 ГК РБ", "ст. 443 ГК РБ", "ст. 461 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "seller_name",     "label": "Продавец (наименование/ФИО)", "type": "text",     "placeholder": "ООО «Торгснаб» или Иванов Иван Иванович", "required": True,  "hint": "Полное юридическое наименование или ФИО физлица"},
                {"key": "seller_unp",      "label": "УНП/паспорт продавца",        "type": "text",     "placeholder": "100123456",           "required": True,  "hint": "УНП для юрлиц, серия/номер паспорта для физлиц"},
                {"key": "seller_address",  "label": "Адрес продавца",              "type": "textarea", "placeholder": "г. Минск, ул. Ленина 1-45", "required": True},
                {"key": "buyer_name",      "label": "Покупатель (наименование/ФИО)", "type": "text",   "placeholder": "ИП Петров П.П.",      "required": True},
                {"key": "buyer_unp",       "label": "УНП/паспорт покупателя",      "type": "text",     "placeholder": "200456789",           "required": True},
                {"key": "buyer_address",   "label": "Адрес покупателя",            "type": "textarea", "placeholder": "г. Гомель, ул. Советская 5-12", "required": True},
                {"key": "goods_name",      "label": "Наименование товара",         "type": "textarea", "placeholder": "Офисная мебель: столы письменные 5 шт., стулья 10 шт.", "required": True, "hint": "Подробное описание товара"},
                {"key": "goods_quantity",  "label": "Количество и единица измерения", "type": "text",  "placeholder": "100 кг / 5 штук / 2 комплекта", "required": True},
                {"key": "price_total",     "label": "Общая цена договора (BYN)",   "type": "number",   "placeholder": "5000",                "required": True},
                {"key": "vat_included",    "label": "Цена включает НДС?",          "type": "boolean",  "required": True},
                {"key": "vat_rate",        "label": "Ставка НДС (%)",              "type": "select",   "options": ["0", "10", "20", "без НДС"], "required": True},
                {"key": "payment_term",    "label": "Срок оплаты",                 "type": "select",   "options": ["предоплата 100%", "по факту поставки", "в течение 3 дней", "в течение 5 дней", "в течение 10 дней", "в течение 30 дней"], "required": True},
                {"key": "delivery_date",   "label": "Дата/срок поставки",          "type": "text",     "placeholder": "до 31.12.2025 или в течение 5 рабочих дней", "required": True},
                {"key": "delivery_place",  "label": "Место передачи товара",       "type": "textarea", "placeholder": "Склад покупателя: г. Минск, ул. Промышленная 10", "required": True},
                {"key": "quality_standard","label": "Стандарт качества",           "type": "text",     "placeholder": "ГОСТ, ТУ или стандарт производителя", "required": False},
                {"key": "warranty_months", "label": "Гарантийный срок (месяцев)", "type": "number",   "placeholder": "12",                  "required": False, "hint": "0 если гарантия не предусмотрена"},
                {"key": "contract_date",   "label": "Дата договора",               "type": "date",     "required": True},
                {"key": "contract_city",   "label": "Город заключения",            "type": "text",     "placeholder": "Минск",               "required": True},
                {"key": "extra_conditions","label": "Дополнительные условия",      "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "lease_premises",
        "name": "Договор аренды помещения",
        "group_name": "Договоры",
        "description": "Договор аренды нежилого помещения (офис, склад, торговая площадь). Включает условия оплаты, ответственность за помещение, коммунальные платежи.",
        "law_references": ["ст. 577 ГК РБ", "ст. 581 ГК РБ", "ст. 625 ГК РБ", "ст. 642 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "landlord_name",    "label": "Арендодатель (наименование/ФИО)", "type": "text",     "placeholder": "ООО «Недвижимость-Плюс»", "required": True},
                {"key": "landlord_unp",     "label": "УНП арендодателя",               "type": "text",     "placeholder": "100123456", "required": True},
                {"key": "landlord_address", "label": "Юридический адрес арендодателя", "type": "textarea", "required": True},
                {"key": "landlord_bank",    "label": "Банк арендодателя",              "type": "text",     "placeholder": "ОАО «Беларусбанк»", "required": True},
                {"key": "landlord_account", "label": "Расчётный счёт арендодателя",    "type": "text",     "placeholder": "BY20AKBB00000000000000000000", "required": True},
                {"key": "tenant_name",      "label": "Арендатор (наименование/ФИО)",   "type": "text",     "placeholder": "ИП Сидоров С.С.", "required": True},
                {"key": "tenant_unp",       "label": "УНП арендатора",                 "type": "text",     "placeholder": "200456789", "required": True},
                {"key": "tenant_address",   "label": "Юридический адрес арендатора",   "type": "textarea", "required": True},
                {"key": "property_address", "label": "Адрес помещения",                "type": "textarea", "placeholder": "г. Минск, ул. Ленина, д. 1, пом. 101", "required": True},
                {"key": "property_area",    "label": "Площадь помещения (кв.м)",       "type": "number",   "placeholder": "50", "required": True},
                {"key": "property_floor",   "label": "Этаж",                           "type": "number",   "placeholder": "3", "required": False},
                {"key": "cadastral_number", "label": "Кадастровый номер",              "type": "text",     "placeholder": "010000000000", "required": False},
                {"key": "purpose",          "label": "Цель использования",             "type": "select",   "options": ["офис", "склад", "торговля", "производство", "общественное питание", "иное"], "required": True},
                {"key": "rent_amount",      "label": "Арендная плата (BYN/мес)",       "type": "number",   "placeholder": "1500", "required": True},
                {"key": "payment_day",      "label": "День оплаты (число месяца)",     "type": "number",   "placeholder": "5", "required": True},
                {"key": "utilities_included","label": "Коммунальные включены в аренду?","type": "boolean",  "required": True},
                {"key": "deposit_amount",   "label": "Залог (BYN)",                    "type": "number",   "placeholder": "3000", "required": False, "hint": "0 если залог не предусмотрен"},
                {"key": "contract_start",   "label": "Дата начала аренды",             "type": "date",     "required": True},
                {"key": "contract_end",     "label": "Дата окончания аренды",          "type": "date",     "required": False, "hint": "Оставьте пустым для бессрочного договора"},
                {"key": "repair_who",       "label": "Капитальный ремонт — чья обязанность?", "type": "select", "options": ["арендодателя", "арендатора", "по соглашению сторон"], "required": True},
                {"key": "sublease_allowed", "label": "Субаренда разрешена?",           "type": "boolean",  "required": True},
                {"key": "contract_city",    "label": "Город заключения",               "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "contract_date",    "label": "Дата договора",                  "type": "date",     "required": True},
                {"key": "extra_conditions", "label": "Дополнительные условия",         "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "lease_vehicle",
        "name": "Договор аренды транспортного средства",
        "group_name": "Договоры",
        "description": "Договор аренды автомобиля или иного транспортного средства без экипажа. Регулирует ответственность за техническое состояние, страхование, ГСМ.",
        "law_references": ["ст. 603 ГК РБ", "ст. 615 ГК РБ", "ст. 620 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "lessor_name",       "label": "Арендодатель",               "type": "text",     "required": True},
                {"key": "lessor_unp",        "label": "УНП арендодателя",           "type": "text",     "required": True},
                {"key": "lessee_name",       "label": "Арендатор",                  "type": "text",     "required": True},
                {"key": "lessee_unp",        "label": "УНП арендатора",             "type": "text",     "required": True},
                {"key": "vehicle_type",      "label": "Тип ТС",                     "type": "select",   "options": ["легковой автомобиль", "грузовой автомобиль", "микроавтобус", "автобус", "прицеп", "спецтехника"], "required": True},
                {"key": "vehicle_brand",     "label": "Марка и модель",             "type": "text",     "placeholder": "Toyota Camry 2022", "required": True},
                {"key": "vehicle_reg_number","label": "Государственный регномер",   "type": "text",     "placeholder": "1234 АА-7", "required": True},
                {"key": "vehicle_vin",       "label": "VIN номер",                  "type": "text",     "placeholder": "WBAWB310X0PN12345", "required": True},
                {"key": "vehicle_year",      "label": "Год выпуска",                "type": "number",   "placeholder": "2020", "required": True},
                {"key": "vehicle_mileage",   "label": "Пробег на момент передачи (км)", "type": "number", "placeholder": "50000", "required": True},
                {"key": "rent_amount",       "label": "Арендная плата (BYN/мес)",   "type": "number",   "required": True},
                {"key": "fuel_who_pays",     "label": "Расходы на ГСМ несёт",       "type": "select",   "options": ["арендатор", "арендодатель"], "required": True},
                {"key": "insurance_who",     "label": "Страховку оформляет",        "type": "select",   "options": ["арендодатель", "арендатор"], "required": True},
                {"key": "maintenance_who",   "label": "Техобслуживание несёт",      "type": "select",   "options": ["арендатор", "арендодатель"], "required": True},
                {"key": "contract_start",    "label": "Дата начала аренды",         "type": "date",     "required": True},
                {"key": "contract_end",      "label": "Дата окончания аренды",      "type": "date",     "required": False},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "supply_agreement",
        "name": "Договор поставки",
        "group_name": "Договоры",
        "description": "Договор поставки товаров для предпринимательской деятельности. Содержит условия о спецификации, порядке приёмки, ответственности за качество.",
        "law_references": ["ст. 462 ГК РБ", "ст. 464 ГК РБ", "ст. 476 ГК РБ", "ст. 481 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "supplier_name",     "label": "Поставщик",                  "type": "text",     "required": True},
                {"key": "supplier_unp",      "label": "УНП поставщика",             "type": "text",     "required": True},
                {"key": "supplier_address",  "label": "Адрес поставщика",           "type": "textarea", "required": True},
                {"key": "supplier_bank",     "label": "Банк поставщика",            "type": "text",     "required": True},
                {"key": "supplier_account",  "label": "Расчётный счёт поставщика",  "type": "text",     "required": True},
                {"key": "buyer_name",        "label": "Покупатель",                 "type": "text",     "required": True},
                {"key": "buyer_unp",         "label": "УНП покупателя",             "type": "text",     "required": True},
                {"key": "buyer_address",     "label": "Адрес покупателя",           "type": "textarea", "required": True},
                {"key": "buyer_bank",        "label": "Банк покупателя",            "type": "text",     "required": True},
                {"key": "buyer_account",     "label": "Расчётный счёт покупателя",  "type": "text",     "required": True},
                {"key": "goods_description", "label": "Наименование и характеристики товара", "type": "textarea", "placeholder": "Строительные материалы: цемент М-400 ГОСТ 10178, 500 мешков по 50 кг", "required": True},
                {"key": "total_quantity",    "label": "Общий объём поставки",       "type": "text",     "placeholder": "500 мешков / 25 000 кг", "required": True},
                {"key": "price_per_unit",    "label": "Цена за единицу (BYN)",      "type": "number",   "required": True},
                {"key": "total_price",       "label": "Общая стоимость (BYN)",      "type": "number",   "required": True},
                {"key": "vat_rate",          "label": "Ставка НДС (%)",             "type": "select",   "options": ["0", "10", "20", "без НДС"], "required": True},
                {"key": "delivery_schedule", "label": "График поставок",            "type": "textarea", "placeholder": "Ежемесячно по 100 мешков в течение 5 месяцев", "required": True},
                {"key": "delivery_place",    "label": "Адрес доставки",             "type": "textarea", "required": True},
                {"key": "delivery_conditions","label": "Условия доставки",          "type": "select",   "options": ["самовывоз", "доставка поставщиком", "транспортная компания за счёт покупателя"], "required": True},
                {"key": "payment_terms",     "label": "Порядок оплаты",             "type": "select",   "options": ["предоплата 100%", "предоплата 50% + 50% по факту", "оплата по факту", "отсрочка 10 дней", "отсрочка 30 дней"], "required": True},
                {"key": "quality_docs",      "label": "Документы о качестве",       "type": "select",   "options": ["сертификат соответствия", "удостоверение качества", "паспорт изделия", "не требуется"], "required": True},
                {"key": "acceptance_days",   "label": "Срок приёмки товара (дней)", "type": "number",   "placeholder": "5", "required": True},
                {"key": "penalty_rate",      "label": "Пеня за просрочку (% в день)","type": "number",  "placeholder": "0.5", "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "contract_duration_months","label": "Срок действия договора (месяцев)", "type": "number", "placeholder": "12", "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "contractor_agreement",
        "name": "Договор подряда",
        "group_name": "Договоры",
        "description": "Договор строительного или бытового подряда. Регулирует выполнение работ, сдачу результата, оплату и гарантийные обязательства подрядчика.",
        "law_references": ["ст. 656 ГК РБ", "ст. 663 ГК РБ", "ст. 669 ГК РБ", "ст. 682 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "customer_name",     "label": "Заказчик",                   "type": "text",     "required": True},
                {"key": "customer_unp",      "label": "УНП заказчика",              "type": "text",     "required": True},
                {"key": "customer_address",  "label": "Адрес заказчика",            "type": "textarea", "required": True},
                {"key": "contractor_name",   "label": "Подрядчик",                  "type": "text",     "required": True},
                {"key": "contractor_unp",    "label": "УНП подрядчика",             "type": "text",     "required": True},
                {"key": "contractor_address","label": "Адрес подрядчика",           "type": "textarea", "required": True},
                {"key": "work_description",  "label": "Описание работ",             "type": "textarea", "placeholder": "Ремонт офисного помещения площадью 100 кв.м: замена напольного покрытия, покраска стен, замена дверей", "required": True},
                {"key": "work_address",      "label": "Адрес выполнения работ",     "type": "textarea", "required": True},
                {"key": "start_date",        "label": "Дата начала работ",          "type": "date",     "required": True},
                {"key": "end_date",          "label": "Дата окончания работ",       "type": "date",     "required": True},
                {"key": "price_total",       "label": "Стоимость работ (BYN)",      "type": "number",   "required": True},
                {"key": "materials_who",     "label": "Материалы предоставляет",    "type": "select",   "options": ["подрядчик", "заказчик", "частично подрядчик частично заказчик"], "required": True},
                {"key": "payment_schedule",  "label": "Порядок оплаты",             "type": "select",   "options": ["аванс 30% + остаток по завершению", "аванс 50% + остаток по завершению", "оплата по завершению работ", "поэтапная оплата"], "required": True},
                {"key": "warranty_months",   "label": "Гарантийный срок (месяцев)", "type": "number",   "placeholder": "24", "required": True},
                {"key": "penalty_rate",      "label": "Пеня за просрочку (% в день)","type": "number",  "placeholder": "0.5", "required": True},
                {"key": "acceptance_procedure","label": "Порядок сдачи-приёмки",   "type": "select",   "options": ["акт выполненных работ", "акт с комиссией", "поэтапная приёмка"], "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "services_agreement",
        "name": "Договор возмездного оказания услуг",
        "group_name": "Договоры",
        "description": "Договор на оказание платных услуг (консультационных, маркетинговых, юридических, IT и других). Исполнитель обязуется оказать услугу лично.",
        "law_references": ["ст. 683 ГК РБ", "ст. 684 ГК РБ", "ст. 685 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "customer_name",     "label": "Заказчик",                   "type": "text",     "required": True},
                {"key": "customer_unp",      "label": "УНП заказчика",              "type": "text",     "required": True},
                {"key": "customer_address",  "label": "Адрес заказчика",            "type": "textarea", "required": True},
                {"key": "executor_name",     "label": "Исполнитель",                "type": "text",     "required": True},
                {"key": "executor_unp",      "label": "УНП исполнителя",            "type": "text",     "required": True},
                {"key": "executor_address",  "label": "Адрес исполнителя",          "type": "textarea", "required": True},
                {"key": "service_type",      "label": "Вид услуг",                  "type": "select",   "options": ["юридические консультации", "бухгалтерские услуги", "IT-услуги", "маркетинговые услуги", "дизайн", "обучение/тренинги", "аудит", "иное"], "required": True},
                {"key": "service_description","label": "Подробное описание услуг",  "type": "textarea", "placeholder": "Ведение бухгалтерского учёта и подготовка налоговой отчётности ежеквартально", "required": True},
                {"key": "price_amount",      "label": "Стоимость услуг (BYN)",      "type": "number",   "required": True},
                {"key": "price_period",      "label": "Период оплаты",              "type": "select",   "options": ["единовременно", "ежемесячно", "ежеквартально", "по факту оказания"], "required": True},
                {"key": "payment_day",       "label": "Срок оплаты (дней после акта)", "type": "number", "placeholder": "5", "required": True},
                {"key": "contract_start",    "label": "Дата начала оказания услуг", "type": "date",     "required": True},
                {"key": "contract_end",      "label": "Дата окончания",             "type": "date",     "required": False, "hint": "Оставьте пустым для бессрочного договора"},
                {"key": "result_document",   "label": "Документ подтверждения услуги", "type": "select", "options": ["акт оказанных услуг", "отчёт исполнителя", "акт + отчёт"], "required": True},
                {"key": "confidentiality",   "label": "Условие о конфиденциальности", "type": "boolean", "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "loan_agreement",
        "name": "Договор займа",
        "group_name": "Договоры",
        "description": "Договор займа денежных средств между юридическими или физическими лицами. Регулирует сумму, проценты, сроки возврата и ответственность.",
        "law_references": ["ст. 760 ГК РБ", "ст. 762 ГК РБ", "ст. 764 ГК РБ", "ст. 770 ГК РБ"],
        "available_plans": ["solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "lender_name",       "label": "Займодавец",                 "type": "text",     "required": True},
                {"key": "lender_unp",        "label": "УНП/паспорт займодавца",     "type": "text",     "required": True},
                {"key": "lender_address",    "label": "Адрес займодавца",           "type": "textarea", "required": True},
                {"key": "borrower_name",     "label": "Заёмщик",                    "type": "text",     "required": True},
                {"key": "borrower_unp",      "label": "УНП/паспорт заёмщика",       "type": "text",     "required": True},
                {"key": "borrower_address",  "label": "Адрес заёмщика",             "type": "textarea", "required": True},
                {"key": "loan_amount",       "label": "Сумма займа (BYN)",          "type": "number",   "required": True},
                {"key": "is_interest_free",  "label": "Заём беспроцентный?",        "type": "boolean",  "required": True},
                {"key": "interest_rate",     "label": "Процентная ставка (% годовых)", "type": "number", "placeholder": "15", "required": False, "hint": "Заполните если заём процентный"},
                {"key": "loan_purpose",      "label": "Цель займа",                 "type": "select",   "options": ["пополнение оборотных средств", "приобретение оборудования", "строительство", "потребительские нужды", "иное"], "required": True},
                {"key": "issue_date",        "label": "Дата выдачи займа",          "type": "date",     "required": True},
                {"key": "repayment_date",    "label": "Срок возврата займа",        "type": "date",     "required": True},
                {"key": "repayment_schedule","label": "Порядок погашения",          "type": "select",   "options": ["единовременно в конце срока", "ежемесячно равными частями", "ежеквартально"], "required": True},
                {"key": "penalty_rate",      "label": "Пеня за просрочку (% в день)", "type": "number", "placeholder": "0.5", "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "storage_agreement",
        "name": "Договор хранения",
        "group_name": "Договоры",
        "description": "Договор профессионального хранения имущества на складе или ином объекте. Определяет ответственность хранителя за сохранность и порядок выдачи.",
        "law_references": ["ст. 776 ГК РБ", "ст. 791 ГК РБ", "ст. 801 ГК РБ", "ст. 814 ГК РБ"],
        "available_plans": ["solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "depositor_name",    "label": "Поклажедатель",              "type": "text",     "required": True},
                {"key": "depositor_unp",     "label": "УНП поклажедателя",          "type": "text",     "required": True},
                {"key": "storer_name",       "label": "Хранитель",                  "type": "text",     "required": True},
                {"key": "storer_unp",        "label": "УНП хранителя",              "type": "text",     "required": True},
                {"key": "storage_address",   "label": "Адрес объекта хранения",     "type": "textarea", "required": True},
                {"key": "goods_description", "label": "Описание имущества",         "type": "textarea", "placeholder": "Офисная мебель: 10 столов, 20 стульев в разобранном виде", "required": True},
                {"key": "goods_value",       "label": "Объявленная стоимость (BYN)","type": "number",   "required": True},
                {"key": "storage_period_start","label": "Начало хранения",          "type": "date",     "required": True},
                {"key": "storage_period_end", "label": "Окончание хранения",        "type": "date",     "required": True},
                {"key": "storage_fee",       "label": "Стоимость хранения (BYN/мес)","type": "number",  "required": True},
                {"key": "temperature_conditions","label": "Температурный режим",    "type": "select",   "options": ["обычный", "охлаждаемый (+4°C)", "морозильный (-18°C)", "специальный"], "required": True},
                {"key": "insurance",         "label": "Страхование имущества",      "type": "boolean",  "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },

    {
        "slug": "commission_agreement",
        "name": "Договор комиссии",
        "group_name": "Договоры",
        "description": "Договор комиссии на продажу товаров от имени комиссионера. Включает вознаграждение, порядок отчётности и передачи выручки комитенту.",
        "law_references": ["ст. 880 ГК РБ", "ст. 885 ГК РБ", "ст. 887 ГК РБ", "ст. 894 ГК РБ"],
        "available_plans": ["solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "principal_name",    "label": "Комитент",                   "type": "text",     "required": True},
                {"key": "principal_unp",     "label": "УНП комитента",              "type": "text",     "required": True},
                {"key": "agent_name",        "label": "Комиссионер",                "type": "text",     "required": True},
                {"key": "agent_unp",         "label": "УНП комиссионера",           "type": "text",     "required": True},
                {"key": "goods_description", "label": "Описание товаров для реализации", "type": "textarea", "required": True},
                {"key": "min_price",         "label": "Минимальная цена реализации (BYN)", "type": "number", "required": True},
                {"key": "commission_rate",   "label": "Размер вознаграждения (%)",  "type": "number",   "placeholder": "10", "required": True},
                {"key": "commission_base",   "label": "База для расчёта вознаграждения", "type": "select", "options": ["от суммы продажи", "от выручки сверх минимальной цены"], "required": True},
                {"key": "payment_terms",     "label": "Срок перечисления выручки",  "type": "select",   "options": ["в течение 3 дней после продажи", "в течение 5 дней", "ежемесячно", "по требованию комитента"], "required": True},
                {"key": "report_period",     "label": "Период отчёта комиссионера", "type": "select",   "options": ["еженедельно", "ежемесячно", "после каждой продажи"], "required": True},
                {"key": "contract_duration", "label": "Срок договора (месяцев)",    "type": "number",   "placeholder": "6", "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "cargo_transport",
        "name": "Договор перевозки груза",
        "group_name": "Договоры",
        "description": "Договор автомобильной перевозки груза по территории Республики Беларусь. Регулирует ответственность перевозчика, сроки и условия доставки.",
        "law_references": ["ст. 739 ГК РБ", "ст. 746 ГК РБ", "ст. 751 ГК РБ", "Закон РБ о перевозке грузов"],
        "available_plans": ["solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "shipper_name",      "label": "Грузоотправитель",           "type": "text",     "required": True},
                {"key": "shipper_unp",       "label": "УНП грузоотправителя",       "type": "text",     "required": True},
                {"key": "carrier_name",      "label": "Перевозчик",                 "type": "text",     "required": True},
                {"key": "carrier_unp",       "label": "УНП перевозчика",            "type": "text",     "required": True},
                {"key": "consignee_name",    "label": "Грузополучатель",            "type": "text",     "required": True},
                {"key": "cargo_description", "label": "Описание груза",             "type": "textarea", "placeholder": "Стройматериалы: кирпич силикатный M150, 10 000 шт.", "required": True},
                {"key": "cargo_weight",      "label": "Масса груза (кг/т)",         "type": "text",     "placeholder": "5 000 кг", "required": True},
                {"key": "cargo_volume",      "label": "Объём груза (куб.м)",        "type": "number",   "placeholder": "8", "required": False},
                {"key": "cargo_value",       "label": "Объявленная ценность (BYN)", "type": "number",   "required": True},
                {"key": "loading_address",   "label": "Адрес погрузки",             "type": "textarea", "required": True},
                {"key": "delivery_address",  "label": "Адрес доставки",             "type": "textarea", "required": True},
                {"key": "loading_date",      "label": "Дата погрузки",              "type": "date",     "required": True},
                {"key": "delivery_deadline", "label": "Срок доставки",              "type": "text",     "placeholder": "в течение 2 рабочих дней", "required": True},
                {"key": "freight_amount",    "label": "Стоимость перевозки (BYN)",  "type": "number",   "required": True},
                {"key": "loading_unloading_who","label": "Погрузка/разгрузка",     "type": "select",   "options": ["силами грузоотправителя/получателя", "силами перевозчика", "по соглашению"], "required": True},
                {"key": "contract_date",     "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },

    # ════════════════════════════════════════════════
    # ГРУППА: ТРУДОВЫЕ ДОКУМЕНТЫ
    # ════════════════════════════════════════════════

    {
        "slug": "employment_contract",
        "name": "Трудовой договор (контракт)",
        "group_name": "Трудовые документы",
        "description": "Трудовой контракт с работником в соответствии с ТК РБ и Декретом №29. Включает должностные обязанности, оплату труда, режим работы.",
        "law_references": ["ст. 17 ТК РБ", "ст. 19 ТК РБ", "ст. 261 ТК РБ", "Декрет Президента РБ №29"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "employer_name",     "label": "Наниматель (организация)",   "type": "text",     "required": True},
                {"key": "employer_unp",      "label": "УНП нанимателя",             "type": "text",     "required": True},
                {"key": "employer_address",  "label": "Адрес нанимателя",           "type": "textarea", "required": True},
                {"key": "director_name",     "label": "ФИО руководителя",           "type": "text",     "placeholder": "Иванов Иван Иванович", "required": True},
                {"key": "director_basis",    "label": "Основание полномочий руководителя", "type": "text", "placeholder": "Устав", "required": True},
                {"key": "employee_full_name","label": "ФИО работника",              "type": "text",     "required": True},
                {"key": "employee_birth",    "label": "Дата рождения работника",    "type": "date",     "required": True},
                {"key": "employee_passport", "label": "Серия и номер паспорта",     "type": "text",     "placeholder": "МР 1234567", "required": True},
                {"key": "employee_address",  "label": "Адрес регистрации работника","type": "textarea", "required": True},
                {"key": "position",          "label": "Должность",                  "type": "text",     "placeholder": "Менеджер по продажам", "required": True},
                {"key": "department",        "label": "Структурное подразделение",  "type": "text",     "placeholder": "Отдел продаж", "required": False},
                {"key": "contract_type",     "label": "Вид контракта",              "type": "select",   "options": ["контракт (1 год)", "контракт (2 года)", "контракт (3 года)", "контракт (5 лет)", "бессрочный трудовой договор"], "required": True},
                {"key": "start_date",        "label": "Дата начала работы",         "type": "date",     "required": True},
                {"key": "probation_months",  "label": "Испытательный срок (месяцев)", "type": "select", "options": ["нет", "1", "2", "3"], "required": True},
                {"key": "work_schedule",     "label": "Режим рабочего времени",     "type": "select",   "options": ["5-дневная рабочая неделя, 8 ч/день", "6-дневная рабочая неделя", "неполное рабочее время", "гибкий режим"], "required": True},
                {"key": "salary",            "label": "Оклад/тарифная ставка (BYN/мес)", "type": "number", "required": True},
                {"key": "bonuses",           "label": "Надбавки и премии",          "type": "textarea", "placeholder": "Надбавка за интенсивность труда 30% оклада", "required": False},
                {"key": "vacation_days",     "label": "Продолжительность отпуска (дней)", "type": "number", "placeholder": "24", "required": True},
                {"key": "contract_date",     "label": "Дата подписания контракта",  "type": "date",     "required": True},
                {"key": "extra_conditions",  "label": "Дополнительные условия",     "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "employment_addendum",
        "name": "Дополнительное соглашение к трудовому договору",
        "group_name": "Трудовые документы",
        "description": "Дополнительное соглашение об изменении условий трудового договора: изменение должности, оклада, режима работы или иных существенных условий.",
        "law_references": ["ст. 32 ТК РБ", "ст. 30 ТК РБ", "ст. 19 ТК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "employer_name",     "label": "Наниматель",                 "type": "text",     "required": True},
                {"key": "employer_unp",      "label": "УНП нанимателя",             "type": "text",     "required": True},
                {"key": "employee_full_name","label": "ФИО работника",              "type": "text",     "required": True},
                {"key": "original_contract_date","label": "Дата основного договора","type": "date",     "required": True},
                {"key": "original_contract_number","label": "Номер основного договора","type": "text",  "placeholder": "№15/2023", "required": False},
                {"key": "change_type",       "label": "Что изменяется",             "type": "select",   "options": ["должность", "оклад", "режим работы", "структурное подразделение", "срок договора", "несколько условий одновременно"], "required": True},
                {"key": "old_position",      "label": "Текущая должность",          "type": "text",     "required": False},
                {"key": "new_position",      "label": "Новая должность",            "type": "text",     "required": False},
                {"key": "old_salary",        "label": "Текущий оклад (BYN)",        "type": "number",   "required": False},
                {"key": "new_salary",        "label": "Новый оклад (BYN)",          "type": "number",   "required": False},
                {"key": "change_reason",     "label": "Основание изменений",        "type": "textarea", "placeholder": "В связи с расширением должностных обязанностей и переводом в отдел маркетинга", "required": True},
                {"key": "effective_date",    "label": "Дата вступления в силу",     "type": "date",     "required": True},
                {"key": "additional_changes","label": "Иные изменения",             "type": "textarea", "required": False},
                {"key": "agreement_date",    "label": "Дата соглашения",            "type": "date",     "required": True},
            ]
        },
    },

    {
        "slug": "liability_agreement",
        "name": "Договор о полной материальной ответственности",
        "group_name": "Трудовые документы",
        "description": "Договор о полной индивидуальной материальной ответственности работника за вверенные ценности. Применяется для кассиров, кладовщиков, материально-ответственных лиц.",
        "law_references": ["ст. 405 ТК РБ", "ст. 406 ТК РБ", "ст. 404 ТК РБ", "Постановление Совета Министров РБ №764"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "employer_name",     "label": "Наниматель",                 "type": "text",     "required": True},
                {"key": "employer_unp",      "label": "УНП нанимателя",             "type": "text",     "required": True},
                {"key": "director_name",     "label": "ФИО руководителя",           "type": "text",     "required": True},
                {"key": "employee_full_name","label": "ФИО работника",              "type": "text",     "required": True},
                {"key": "employee_position", "label": "Должность работника",        "type": "text",     "placeholder": "Кассир / Кладовщик / Продавец", "required": True},
                {"key": "values_list",       "label": "Перечень вверяемых ценностей","type": "textarea", "placeholder": "Денежные средства, товарно-материальные ценности в кассе магазина", "required": True},
                {"key": "storage_place",     "label": "Место хранения ценностей",   "type": "text",     "placeholder": "Касса магазина по адресу: г. Минск, ул. Ленина 1", "required": True},
                {"key": "inventory_period",  "label": "Периодичность инвентаризации","type": "select",  "options": ["ежемесячно", "ежеквартально", "раз в полгода", "ежегодно", "при смене ответственного"], "required": True},
                {"key": "agreement_date",    "label": "Дата договора",              "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город заключения",           "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },

    {
        "slug": "job_description",
        "name": "Должностная инструкция",
        "group_name": "Трудовые документы",
        "description": "Должностная инструкция работника с перечнем обязанностей, прав и ответственности. Разрабатывается в соответствии с ЕКСД и ЕТКС РБ.",
        "law_references": ["ст. 19 ТК РБ", "ЕКСД РБ", "Постановление Министерства труда РБ №78"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "company_name",      "label": "Наименование организации",   "type": "text",     "required": True},
                {"key": "position_name",     "label": "Наименование должности",     "type": "text",     "placeholder": "Менеджер по продажам / Бухгалтер / Юрисконсульт", "required": True},
                {"key": "department",        "label": "Структурное подразделение",  "type": "text",     "required": True},
                {"key": "reports_to",        "label": "Непосредственный руководитель","type": "text",   "placeholder": "Начальник отдела продаж", "required": True},
                {"key": "qualification_requirements","label": "Требования к квалификации","type": "textarea","placeholder": "Высшее экономическое образование, стаж работы не менее 2 лет", "required": True},
                {"key": "main_duties",       "label": "Основные должностные обязанности","type": "textarea","placeholder": "1. Поиск и привлечение новых клиентов\n2. Проведение переговоров...", "required": True},
                {"key": "rights",            "label": "Права работника",            "type": "textarea", "placeholder": "1. Запрашивать необходимые документы\n2. Вносить предложения...", "required": True},
                {"key": "responsibility",    "label": "Ответственность",            "type": "textarea", "placeholder": "Несёт ответственность за ненадлежащее исполнение обязанностей...", "required": True},
                {"key": "knowledge_required","label": "Должен знать",              "type": "textarea", "placeholder": "Законодательство РБ в сфере деятельности, правила охраны труда...", "required": True},
                {"key": "approval_date",     "label": "Дата утверждения",           "type": "date",     "required": True},
                {"key": "contract_city",     "label": "Город",                      "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },

    # ════════════════════════════════════════════════
    # ГРУППА: КОРПОРАТИВНЫЕ ДОКУМЕНТЫ
    # ════════════════════════════════════════════════

    {
        "slug": "llc_charter",
        "name": "Устав ООО",
        "group_name": "Корпоративные документы",
        "description": "Устав общества с ограниченной ответственностью по Закону РБ «О хозяйственных обществах». Включает все обязательные разделы для государственной регистрации.",
        "law_references": ["Закон РБ о хозяйственных обществах", "ст. 47 ГК РБ", "ст. 86 ГК РБ", "ст. 91 ГК РБ"],
        "available_plans": ["solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "company_full_name", "label": "Полное наименование ООО",    "type": "text",     "placeholder": "Общество с ограниченной ответственностью «Рога и Копыта»", "required": True},
                {"key": "company_short_name","label": "Сокращённое наименование",   "type": "text",     "placeholder": "ООО «Рога и Копыта»", "required": True},
                {"key": "legal_address",     "label": "Юридический адрес",          "type": "textarea", "placeholder": "220000, г. Минск, ул. Ленина, д. 1, пом. 101", "required": True},
                {"key": "charter_capital",   "label": "Уставный фонд (BYN)",        "type": "number",   "placeholder": "100", "required": True, "hint": "Минимум 0 BYN (рекомендуется от 100 BYN)"},
                {"key": "participants",      "label": "Участники и их доли",        "type": "textarea", "placeholder": "Иванов Иван Иванович — 60%\nПетров Пётр Петрович — 40%", "required": True},
                {"key": "director_title",    "label": "Должность руководителя",     "type": "select",   "options": ["Директор", "Генеральный директор", "Управляющий"], "required": True},
                {"key": "main_activity",     "label": "Основной вид деятельности",  "type": "textarea", "placeholder": "Оптовая торговля строительными материалами (ОКЭД 46.73)", "required": True},
                {"key": "other_activities",  "label": "Иные виды деятельности",     "type": "textarea", "placeholder": "Розничная торговля, консультационные услуги", "required": False},
                {"key": "profit_distribution","label": "Порядок распределения прибыли","type": "select", "options": ["пропорционально долям", "по решению общего собрания", "ежеквартально пропорционально долям"], "required": True},
                {"key": "meeting_quorum",    "label": "Кворум общего собрания",     "type": "select",   "options": ["более 50% голосов", "более 2/3 голосов", "единогласно"], "required": True},
                {"key": "charter_date",      "label": "Дата утверждения устава",    "type": "date",     "required": True},
                {"key": "charter_city",      "label": "Город",                      "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },

    {
        "slug": "meeting_protocol",
        "name": "Протокол общего собрания участников",
        "group_name": "Корпоративные документы",
        "description": "Протокол общего собрания участников ООО. Фиксирует принятые решения по ключевым вопросам деятельности общества.",
        "law_references": ["ст. 34 Закона о хозяйственных обществах РБ", "ст. 44 Закона о хозяйственных обществах РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "company_name",      "label": "Наименование ООО",           "type": "text",     "required": True},
                {"key": "meeting_date",      "label": "Дата проведения собрания",   "type": "date",     "required": True},
                {"key": "meeting_time",      "label": "Время начала",               "type": "text",     "placeholder": "14:00", "required": True},
                {"key": "meeting_address",   "label": "Место проведения",           "type": "textarea", "placeholder": "г. Минск, ул. Ленина 1, офис 5", "required": True},
                {"key": "participants_list", "label": "Присутствующие участники",   "type": "textarea", "placeholder": "Иванов И.И. — 60%\nПетров П.П. — 40%\nИтого: 100% голосов", "required": True},
                {"key": "chairman",          "label": "Председатель собрания",      "type": "text",     "required": True},
                {"key": "secretary",         "label": "Секретарь собрания",         "type": "text",     "required": True},
                {"key": "agenda",            "label": "Повестка дня",               "type": "textarea", "placeholder": "1. Утверждение годового отчёта за 2024 год\n2. Распределение прибыли\n3. Переизбрание директора", "required": True},
                {"key": "decisions",         "label": "Принятые решения",           "type": "textarea", "placeholder": "По вопросу 1: Утвердить годовой отчёт единогласно...", "required": True},
                {"key": "voting_results",    "label": "Результаты голосования",     "type": "textarea", "placeholder": "За — 100%, против — 0%, воздержался — 0%", "required": True},
                {"key": "next_meeting",      "label": "Дата следующего собрания",   "type": "date",     "required": False},
            ]
        },
    },

    {
        "slug": "sole_participant_decision",
        "name": "Решение единственного участника ООО",
        "group_name": "Корпоративные документы",
        "description": "Решение единственного участника ООО по вопросам управления обществом: назначение директора, утверждение отчётов, изменение устава и другим.",
        "law_references": ["ст. 44 Закона о хозяйственных обществах РБ", "ст. 91 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "company_name",      "label": "Наименование ООО",           "type": "text",     "required": True},
                {"key": "participant_name",  "label": "ФИО/наименование единственного участника", "type": "text", "required": True},
                {"key": "participant_share", "label": "Доля участника",             "type": "text",     "placeholder": "100%", "required": True},
                {"key": "decision_number",   "label": "Номер решения",              "type": "text",     "placeholder": "1", "required": True},
                {"key": "decision_date",     "label": "Дата решения",               "type": "date",     "required": True},
                {"key": "decision_city",     "label": "Город",                      "type": "text",     "placeholder": "Минск", "required": True},
                {"key": "decision_subject",  "label": "Предмет решения",            "type": "select",   "options": ["назначение директора", "утверждение годового отчёта", "распределение прибыли", "изменение устава", "реорганизация/ликвидация", "утверждение сделки", "иное"], "required": True},
                {"key": "decision_content",  "label": "Содержание решения",         "type": "textarea", "placeholder": "1. Назначить Иванова Ивана Ивановича Директором ООО «Ромашка» сроком на 3 года с 01.01.2025...", "required": True},
            ]
        },
    },

    {
        "slug": "power_of_attorney",
        "name": "Доверенность",
        "group_name": "Корпоративные документы",
        "description": "Доверенность на представление интересов организации или физического лица. Нотариальная или выданная юридическим лицом.",
        "law_references": ["ст. 186 ГК РБ", "ст. 187 ГК РБ", "ст. 192 ГК РБ", "ст. 195 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "principal_type",    "label": "Тип доверителя",             "type": "select",   "options": ["юридическое лицо", "физическое лицо — ИП", "физическое лицо"], "required": True},
                {"key": "principal_name",    "label": "Доверитель (наименование/ФИО)", "type": "text",  "required": True},
                {"key": "principal_unp",     "label": "УНП/паспорт доверителя",     "type": "text",     "required": True},
                {"key": "principal_address", "label": "Адрес доверителя",           "type": "textarea", "required": True},
                {"key": "director_name",     "label": "ФИО руководителя (для юрлица)", "type": "text", "required": False},
                {"key": "attorney_name",     "label": "ФИО представителя",          "type": "text",     "placeholder": "Петров Пётр Петрович", "required": True},
                {"key": "attorney_passport", "label": "Паспорт представителя",      "type": "text",     "placeholder": "МР 1234567, выдан...", "required": True},
                {"key": "attorney_address",  "label": "Адрес регистрации представителя", "type": "textarea", "required": True},
                {"key": "poa_type",          "label": "Вид доверенности",           "type": "select",   "options": ["генеральная (все полномочия)", "на представление в судах", "на подписание договоров", "на получение документов/ТМЦ", "на управление ТС", "специальная"], "required": True},
                {"key": "powers_description","label": "Полномочия представителя",   "type": "textarea", "placeholder": "Представлять интересы в переговорах с контрагентами, подписывать договоры на сумму до 10 000 BYN...", "required": True},
                {"key": "validity_period",   "label": "Срок действия",              "type": "select",   "options": ["3 месяца", "6 месяцев", "1 год", "2 года", "3 года"], "required": True},
                {"key": "substitution",      "label": "Право передоверия",          "type": "boolean",  "required": True},
                {"key": "issue_date",        "label": "Дата выдачи",                "type": "date",     "required": True},
                {"key": "issue_city",        "label": "Город выдачи",               "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },

    # ════════════════════════════════════════════════
    # ГРУППА: ПРЕТЕНЗИОННАЯ РАБОТА
    # ════════════════════════════════════════════════

    {
        "slug": "claim_letter",
        "name": "Претензионное письмо",
        "group_name": "Претензии",
        "description": "Официальная претензия контрагенту с требованием устранить нарушение договора. Обязательна для соблюдения досудебного порядка урегулирования споров.",
        "law_references": ["ст. 422 ГК РБ", "ст. 364 ГК РБ", "ст. 366 ГК РБ", "Хозяйственный процессуальный кодекс РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "claimant_name",     "label": "Наименование заявителя",     "type": "text",     "required": True},
                {"key": "claimant_unp",      "label": "УНП заявителя",              "type": "text",     "required": True},
                {"key": "claimant_address",  "label": "Адрес заявителя",            "type": "textarea", "required": True},
                {"key": "claimant_phone",    "label": "Телефон заявителя",          "type": "text",     "placeholder": "+375 (17) 123-45-67", "required": True},
                {"key": "respondent_name",   "label": "Наименование ответчика",     "type": "text",     "required": True},
                {"key": "respondent_unp",    "label": "УНП ответчика",              "type": "text",     "required": True},
                {"key": "respondent_address","label": "Адрес ответчика",            "type": "textarea", "required": True},
                {"key": "contract_number",   "label": "Реквизиты договора",         "type": "text",     "placeholder": "Договор №15 от 01.01.2024", "required": True},
                {"key": "violation_description","label": "Описание нарушения",      "type": "textarea", "placeholder": "Ответчик не осуществил поставку товара в срок, установленный п. 3.1 Договора", "required": True},
                {"key": "violation_date",    "label": "Дата нарушения",             "type": "date",     "required": True},
                {"key": "claim_type",        "label": "Вид требования",             "type": "select",   "options": ["возврат денежных средств", "оплата неустойки", "поставка товара", "устранение недостатков", "возмещение убытков", "расторжение договора"], "required": True},
                {"key": "debt_amount",       "label": "Основной долг/сумма (BYN)", "type": "number",   "required": False},
                {"key": "penalty_amount",    "label": "Неустойка/пеня (BYN)",       "type": "number",   "required": False},
                {"key": "total_claim",       "label": "Итого требований (BYN)",     "type": "number",   "required": True},
                {"key": "response_deadline_days","label": "Срок ответа (дней)",     "type": "number",   "placeholder": "10", "required": True, "hint": "По ХПК РБ — не менее 10 дней"},
                {"key": "action_if_no_response","label": "Действия при отсутствии ответа","type":"textarea","placeholder":"Будем вынуждены обратиться в экономический суд г. Минска","required":True},
                {"key": "claim_date",        "label": "Дата претензии",             "type": "date",     "required": True},
                {"key": "extra_requirements","label": "Дополнительные требования",  "type": "textarea", "required": False},
            ]
        },
    },

    {
        "slug": "claim_response",
        "name": "Ответ на претензию",
        "group_name": "Претензии",
        "description": "Официальный ответ на претензию контрагента с признанием или отклонением требований. Составляется для соблюдения досудебного порядка и фиксации позиции.",
        "law_references": ["ст. 422 ГК РБ", "ст. 151 ХПК РБ", "ст. 364 ГК РБ"],
        "available_plans": ["free", "solo", "firm"],
        "fields_schema": {
            "fields": [
                {"key": "responder_name",    "label": "Наименование отвечающего",   "type": "text",     "required": True},
                {"key": "responder_unp",     "label": "УНП",                        "type": "text",     "required": True},
                {"key": "responder_address", "label": "Адрес",                      "type": "textarea", "required": True},
                {"key": "claimant_name",     "label": "Наименование заявителя претензии", "type": "text", "required": True},
                {"key": "claim_date",        "label": "Дата претензии",             "type": "date",     "required": True},
                {"key": "claim_reference",   "label": "Реквизиты претензии",        "type": "text",     "placeholder": "Претензия №1 от 01.01.2025", "required": True},
                {"key": "response_type",     "label": "Позиция по претензии",       "type": "select",   "options": ["признаём полностью", "признаём частично", "отклоняем полностью"], "required": True},
                {"key": "accepted_amount",   "label": "Признанная сумма (BYN)",     "type": "number",   "required": False, "hint": "Заполните при частичном признании"},
                {"key": "denial_reasons",    "label": "Обоснование отклонения",     "type": "textarea", "placeholder": "Претензия является необоснованной ввиду следующих обстоятельств: ...", "required": False},
                {"key": "payment_date",      "label": "Дата/срок выплаты (если признаём)", "type": "text", "placeholder": "в течение 5 рабочих дней", "required": False},
                {"key": "proposed_solution", "label": "Предложение по урегулированию","type": "textarea","placeholder": "Предлагаем рассмотреть вопрос о рассрочке платежа на 3 месяца", "required": False},
                {"key": "response_date",     "label": "Дата ответа",                "type": "date",     "required": True},
                {"key": "response_city",     "label": "Город",                      "type": "text",     "placeholder": "Минск", "required": True},
            ]
        },
    },
]

# Словарь slug → шаблон для быстрого доступа
TEMPLATES_BY_SLUG: dict[str, dict] = {t["slug"]: t for t in TEMPLATES}

# Уникальные группы для фильтра
GROUPS = list(dict.fromkeys(t["group_name"] for t in TEMPLATES))
