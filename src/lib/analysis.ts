// Анализ влияния новости на IT-индустрию и профессии.
// Основной режим — эвристический (работает без внешних сервисов).
// Если задан OPENAI_API_KEY, то анализ дополнительно улучшается языковой моделью.

export type Category = "ai" | "careers" | "dev" | "security";
export type Level = "high" | "medium" | "low";
export type Direction = "positive" | "negative" | "mixed" | "neutral";

export type Analysis = {
  category: Category;
  impactLevel: Level;
  impactScore: number;
  direction: Direction;
  analysisSummary: string;
  analysisJobs: string;
  analysisAdvice: string;
  professions: string[];
  analysisMethod: "rules" | "llm";
};

const re = (p: string) => new RegExp(`(?<![\\p{L}\\d])(?:${p})`, "iu");
const word = (p: string) => new RegExp(`(?<![\\p{L}\\d])(?:${p})(?![\\p{L}\\d])`, "iu");

const AI_RE = new RegExp(
  [
    word("ии|ai|llm|gpt|agi|rag|mcp").source,
    re(
      "нейросет|нейронн|нейро-|искусственн\\w+ интеллект|chatgpt|gpt-?\\d|openai|anthropic|claude|gemini|deepseek|mistral|llama|qwen|grok|midjourney|stable diffusion|sora|copilot|cursor|gigachat|yandexgpt|яндексgpt|алиса|языков\\w+ модел|машинн\\w+ обучен|глубок\\w+ обучен|генеративн|чат-?бот|ai-|ии-|робототехник|компьютерн\\w+ зрен|агентн|ai агент|ии агент",
    ).source,
  ].join("|"),
  "iu",
);

const CAREER_RE = re(
  "вакан|зарплат|рынок труда|рынке труда|увольн|сокращени\\w+ (?:сотрудн|персонал|штат)|сократ\\w+ (?:сотрудн|персонал|штат)|найм|нанима|карьер|профессi|профессии|профессия|резюме|айтишник|it-специалист|ит-специалист|кадров|кадровый|стажер|стажёр|джун|junior|senior|middle|специалистов|работодател|трудоустро|удал[её]нн\\w+ работ|релокац|hr\\b|рекрутер|собеседован|навык|переподготовк|образовани|курс[аы]? для|bootcamp|безработиц",
);

const SECURITY_RE = re(
  "безопасност|уязвимост|хакер|утечк|кибер|ddos|шифровальщик|фишинг|взлом|вредонос|эксплойт|cve-|0-day|zero-day|троян|бэкдор|ransomware",
);

const DEV_RE = re(
  "разработчик|программист|разработк|программировани|python|javascript|typescript|rust\\b|golang|java\\b|kotlin|swift\\b|github|gitlab|open ?source|опенсорс|фреймворк|devops|kubernetes|docker|linux|ядр[оа] linux|ide\\b|api\\b|sdk|код[аеу]?\\b|компилятор|баз[аы] данных|postgres|react|vue|android|ios\\b|backend|frontend|devin|vs code",
);

const BIG_PLAYERS = re(
  "openai|google|microsoft|nvidia|meta\\b|anthropic|яндекс|сбер|apple|amazon|aws|deepseek|xai|маск|tesla|intel|amd\\b|samsung|huawei|alibaba|tencent|baidu|vk\\b|тинькофф|т-банк|мтс|ростелеком|kaspersky|касперск",
);
const MONEY_BIG = re("млрд|миллиард|billion|\\$\\s?\\d+\\s?b\\b|триллион");
const MONEY_MID = re("млн|миллион|million|инвестици|раунд|оценк[аи] в|единорог|ipo");
const LAUNCH = re(
  "представил|выпустил|запустил|релиз|анонсир|новая модель|новую модель|вышла|вышел|открыл доступ|gpt-?\\d|claude \\d|gemini \\d|обновлени|появил",
);
const LABOR = re(
  "увольн|сократ|заменит|замен[яе]т|автоматизир|исчезн|безработ|вакан|зарплат|рынок труда|рынке труда|массов\\w+ сокращ|лишатся работы|потеряют работу",
);
const REGULATION = re(
  "закон|запрет|регулир|санкц|штраф|законопроект|правительств|минцифр|роскомнадзор|евросоюз|ai act|ограничени|лицензир|сертификац|госдум",
);
const SEC_INCIDENT = re("утечк|уязвимост|взлом|кибератак|ddos|атак[аи]");
const BREAKTHROUGH = re("прорыв|рекорд|впервые|революц|превзош|обогнал|лучш\\w+ результат|state-of-the-art|sota");

const NEG = re(
  "увольн|сократ|заменит|безработ|запрет|штраф|уязвимост|утечк|угроз|риск|взлом|санкц|падени|кризис|снижени|потер|дефицит кадров|блокир|ограничени|скандал|иск\\b|судебн",
);
const POS = re(
  "рост|вырос|увелич|инвестиц|запустил|представил|выпустил|возможност|ускор|повыс|спрос|прорыв|открыл|вакансий|новые рабочие|поддержк|бесплатн|доступн|упрост|улучш|эффективн|рекорд",
);

const PROFESSIONS: { name: string; rx: RegExp }[] = [
  { name: "Разработчики", rx: re("разработчик|программист|код\\b|кода\\b|кодинг|copilot|cursor|github|devin|ide\\b|sdk|api\\b|фреймворк|python|javascript|typescript|rust\\b|vibe") },
  { name: "ML/AI-инженеры", rx: re("нейросет|нейронн|модел|llm|машинн|датасет|gpu|nvidia|обучен|gpt|claude|gemini|openai|anthropic|deepseek|llama|генеративн") },
  { name: "Аналитики данных", rx: re("аналитик|данны[хм]|big data|bi\\b|статистик|дата-?сайентист|data scientist") },
  { name: "Тестировщики (QA)", rx: re("тестировщик|тестирован|qa\\b|баг|автотест") },
  { name: "DevOps/SRE", rx: re("devops|облач|kubernetes|docker|инфраструктур|дата-?центр|сервер|sre\\b|хостинг") },
  { name: "Специалисты по ИБ", rx: re("безопасност|уязвимост|хакер|утечк|кибер|взлом|вредонос|фишинг|шифровальщик") },
  { name: "Дизайнеры и креаторы", rx: re("дизайн|изображен|видео|midjourney|sora|иллюстр|креатив|контент|генераци\\w+ (?:картин|видео|изображ)") },
  { name: "Поддержка и операторы", rx: re("поддержк|колл-?центр|чат-?бот|оператор|клиентск|голосов\\w+ помощник|алиса") },
  { name: "Менеджеры и HR", rx: re("hr\\b|рекрутер|менеджер|найм|руководител|рынок труда|рынке труда|кадр|собеседован|вакан") },
  { name: "Юристы и комплаенс", rx: re("закон|регулир|персональн\\w+ данн|правов|комплаенс|штраф|лицензир") },
];

const CATEGORY_LABEL: Record<Category, string> = {
  ai: "ИИ",
  careers: "Профессии",
  dev: "Разработка",
  security: "Безопасность",
};
export { CATEGORY_LABEL };

export function isRelevant(
  title: string,
  text: string,
  mode: "all" | "it" | "general",
): boolean {
  if (mode === "all") return true;
  const blob = `${title}. ${text}`;
  const aiHit = AI_RE.test(title) || (AI_RE.test(blob) && mode === "it");
  const careerHit = CAREER_RE.test(title) && /(?:it|ит|разработ|программ|айти|технолог|специалист|нейро|ии)/iu.test(blob);
  if (mode === "general") return aiHit || careerHit;
  // mode === "it": ленты об IT — оставляем ещё разработку и безопасность
  return aiHit || careerHit || DEV_RE.test(title) || SECURITY_RE.test(title);
}

export function detectCategory(title: string, text: string, fallback?: Category): Category {
  const blob = `${title}. ${text}`;
  const careerStrong = CAREER_RE.test(title) || (LABOR.test(blob) && CAREER_RE.test(blob));
  if (careerStrong && fallback !== "ai") return "careers";
  if (careerStrong && AI_RE.test(blob) === false) return "careers";
  if (AI_RE.test(title) || (fallback === "ai" && AI_RE.test(blob))) return "ai";
  if (CAREER_RE.test(title)) return "careers";
  if (SECURITY_RE.test(title)) return "security";
  if (DEV_RE.test(title)) return "dev";
  if (fallback) return fallback;
  if (AI_RE.test(blob)) return "ai";
  if (SECURITY_RE.test(blob)) return "security";
  return "dev";
}

function count(rx: RegExp, s: string): number {
  const g = new RegExp(rx.source, "giu");
  return (s.match(g) ?? []).length;
}

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : s).trim();
}

export function analyzeByRules(
  title: string,
  text: string,
  fallbackCategory?: Category,
): Analysis {
  const blob = `${title}. ${text}`;
  const category = detectCategory(title, text, fallbackCategory);

  let score = 0;
  const signals: string[] = [];
  if (BIG_PLAYERS.test(blob)) score += 2;
  if (MONEY_BIG.test(blob)) {
    score += 2;
    signals.push("money");
  } else if (MONEY_MID.test(blob)) {
    score += 1;
    signals.push("money");
  }
  if (LAUNCH.test(blob)) {
    score += 2;
    signals.push("launch");
  }
  if (LABOR.test(blob)) {
    score += 3;
    signals.push("labor");
  }
  if (REGULATION.test(blob)) {
    score += 2;
    signals.push("regulation");
  }
  if (SEC_INCIDENT.test(blob)) {
    score += 1;
    signals.push("security");
  }
  if (BREAKTHROUGH.test(blob)) {
    score += 1;
    signals.push("breakthrough");
  }
  if (AI_RE.test(blob)) score += 1;
  if (CAREER_RE.test(title)) score += 1;
  if (AI_RE.test(title) && BIG_PLAYERS.test(title)) score += 1;

  const impactLevel: Level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";

  const neg = count(NEG, blob);
  const pos = count(POS, blob);
  let direction: Direction = "neutral";
  if (neg > 0 && pos > 0 && Math.abs(neg - pos) <= 1) direction = "mixed";
  else if (pos > neg) direction = "positive";
  else if (neg > pos) direction = "negative";

  const scored = PROFESSIONS.map((p) => ({ name: p.name, n: count(p.rx, blob) }))
    .filter((p) => p.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((p) => p.name);
  const professions =
    scored.length > 0
      ? scored
      : category === "careers"
        ? ["Разработчики", "Менеджеры и HR"]
        : category === "security"
          ? ["Специалисты по ИБ", "DevOps/SRE"]
          : category === "ai"
            ? ["Разработчики", "ML/AI-инженеры"]
            : ["Разработчики", "DevOps/SRE"];

  // --- Тексты анализа ---
  const opening =
    impactLevel === "high"
      ? "Событие с высоким потенциалом влияния на отрасль."
      : impactLevel === "medium"
        ? "Заметный сдвиг, который скажется на части рынка."
        : "Локальная новость: прямого влияния на рынок немного, но она отражает общий тренд.";

  const parts: string[] = [opening];
  if (signals.includes("launch"))
    parts.push(
      "Появление новых продуктов и моделей усиливает конкуренцию между вендорами, ускоряет внедрение технологий и снижает порог входа для команд.",
    );
  if (signals.includes("money"))
    parts.push(
      "Крупные деньги показывают, куда движется капитал: вокруг этого направления вырастет спрос на компетенции и появятся новые вакансии.",
    );
  if (signals.includes("labor"))
    parts.push(
      "Новость затрагивает занятость: рутинные задачи автоматизируются, а требования к специалистам смещаются к проектированию, контролю качества и работе с ИИ-инструментами.",
    );
  if (signals.includes("regulation"))
    parts.push(
      "Регуляторные решения повышают требования к соответствию (compliance) и могут изменить сроки и бюджеты проектов.",
    );
  if (signals.includes("security"))
    parts.push(
      "Инциденты и уязвимости повышают спрос на специалистов по безопасности и заставляют пересматривать практики разработки и эксплуатации.",
    );
  if (signals.includes("breakthrough"))
    parts.push("Технологический прорыв может быстро изменить расстановку сил среди игроков рынка.");
  if (parts.length === 1) {
    parts.push(
      category === "ai"
        ? "Ещё один шаг в развитии ИИ-экосистемы: инструменты становятся доступнее и постепенно входят в рабочие процессы."
        : category === "careers"
          ? "Новость отражает текущие настроения на IT-рынке труда и может влиять на ожидания работодателей и кандидатов."
          : category === "security"
            ? "Тема безопасности остаётся приоритетом: компании продолжают инвестировать в защиту инфраструктуры и данных."
            : "Изменения в инструментах и практиках разработки постепенно меняют повседневную работу команд.",
    );
  }
  const analysisSummary = parts.join(" ");

  const list = professions.join(", ");
  const dirText: Record<Direction, string> = {
    positive: "В целом эффект положительный: растёт спрос на соответствующие навыки и появляются новые возможности для роста.",
    negative: "Есть риски: давление на рутинные задачи, рост конкуренции за позиции и необходимость быстро переучиваться.",
    mixed: "Эффект двойственный: одни задачи будут автоматизированы, зато вырастет ценность экспертизы и умения работать с новыми инструментами.",
    neutral: "Заметных изменений для рынка труда в краткосрочной перспективе не ожидается, но за темой стоит следить.",
  };
  const analysisJobs = `Затронет: ${list}. ${dirText[direction]}`;

  const advice: Record<Category, string> = {
    ai: "Попробуйте инструмент на реальной задаче и оцените, какие этапы работы он ускоряет. Развивайте навыки постановки задач ИИ и проверки результата.",
    careers: "Сверьте свой стек и навыки с актуальными вакансиями, обновите резюме и портфолио, уделите время смежным компетенциям.",
    dev: "Изучите новинку в песочнице, оцените применимость в своём стеке и заложите время на обучение команды.",
    security: "Проверьте свои зависимости и конфигурации, обновите ПО и закрепите базовые практики безопасной разработки.",
  };
  const analysisAdvice = advice[category];

  return {
    category,
    impactLevel,
    impactScore: score,
    direction,
    analysisSummary,
    analysisJobs,
    analysisAdvice,
    professions,
    analysisMethod: "rules",
  };
}

// ---- Необязательное улучшение через LLM (OpenAI-совместимый API) ----
type LlmResult = {
  impactLevel?: string;
  direction?: string;
  summary?: string;
  jobs?: string;
  advice?: string;
  professions?: string[];
};

export async function analyzeWithLlm(
  title: string,
  text: string,
  base: Analysis,
): Promise<Analysis> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return base;
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты — аналитик IT-рынка. По новости дай краткий анализ влияния на IT-индустрию и профессии на русском языке. Верни JSON: {\"impactLevel\":\"high|medium|low\",\"direction\":\"positive|negative|mixed|neutral\",\"summary\":\"2-3 предложения о влиянии на индустрию\",\"jobs\":\"1-2 предложения о влиянии на профессии\",\"advice\":\"1 предложение: что делать специалистам\",\"professions\":[\"до 4 затронутых профессий\"]}. Не выдумывай факты, опирайся на текст новости.",
          },
          { role: "user", content: `Заголовок: ${title}\n\nТекст: ${text.slice(0, 1500)}` },
        ],
      }),
    });
    if (!res.ok) return base;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return base;
    const r = JSON.parse(content) as LlmResult;
    if (!r.summary || !r.jobs) return base;
    const lvl: Level = (["high", "medium", "low"] as const).includes(r.impactLevel as Level)
      ? (r.impactLevel as Level)
      : base.impactLevel;
    const dir: Direction = (["positive", "negative", "mixed", "neutral"] as const).includes(
      r.direction as Direction,
    )
      ? (r.direction as Direction)
      : base.direction;
    return {
      ...base,
      impactLevel: lvl,
      impactScore: lvl === "high" ? Math.max(base.impactScore, 6) : lvl === "medium" ? Math.min(Math.max(base.impactScore, 3), 5) : Math.min(base.impactScore, 2),
      direction: dir,
      analysisSummary: r.summary,
      analysisJobs: r.jobs,
      analysisAdvice: r.advice || base.analysisAdvice,
      professions: Array.isArray(r.professions) && r.professions.length > 0 ? r.professions.slice(0, 4).map(String) : base.professions,
      analysisMethod: "llm",
    };
  } catch {
    return base;
  }
}

export function shortImpact(a: { analysisSummary: string }): string {
  const sentences = a.analysisSummary.split(/(?<=[.!?])\s+/);
  return sentences.length > 1 ? sentences[1] : firstSentence(a.analysisSummary);
}
