(() => {
  'use strict';

  const form = document.getElementById('umg-form');
  const input = document.getElementById('umg-district');
  const output = document.getElementById('umg-output');
  const options = document.getElementById('umg-districts');
  if (!form || !input || !output || !options) return;

  let records;
  let pending;
  let revision = 0;
  const initialMessage = 'Выберите одномандатный округ, чтобы увидеть данные.';

  function message(text) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    output.replaceChildren(paragraph);
  }

  async function loadRecords() {
    if (records) return records;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetch('data/umg-2026.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Data unavailable');
      const data = await response.json();
      if (!data || Array.isArray(data) || typeof data !== 'object' || !Object.keys(data).length) {
        throw new Error('Invalid data');
      }
      for (const [key, record] of Object.entries(data)) {
        if (!/^[1-9]\d*$/.test(key) || !record || record.district_number !== Number(key) ||
            !['region', 'district_name', 'candidate'].every(field => typeof record[field] === 'string' && record[field].trim()) ||
            !(record.party === null || typeof record.party === 'string')) {
          throw new Error('Invalid district record');
        }
      }
      const fragment = document.createDocumentFragment();
      for (const record of Object.values(data).sort((a, b) => a.district_number - b.district_number)) {
        const option = document.createElement('option');
        option.value = String(record.district_number);
        option.label = `${record.district_name} — ${record.region}`;
        fragment.append(option);
      }
      options.replaceChildren(fragment);
      records = data;
      return records;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  async function showDistrict(event) {
    event.preventDefault();
    const current = ++revision;
    const value = input.value.trim();
    input.removeAttribute('aria-invalid');
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
      message('Введите номер одномандатного округа целым положительным числом, например 196.');
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    message('Загружаем данные…');
    try {
      const data = await loadRecords();
      if (current !== revision) return;
      const key = String(Number(value));
      if (!Object.hasOwn(data, key)) {
        message('Для этого одномандатного округа данных пока нет.');
        return;
      }
      const record = data[key];
      const heading = document.createElement('h3');
      heading.textContent = `Округ № ${record.district_number}, ${record.district_name}`;
      const details = document.createElement('dl');
      for (const [label, text] of [
        ['Регион', record.region],
        ['Номер одномандатного округа', String(record.district_number)],
        ['Название округа', record.district_name],
        ['Кандидат, указанный в данных Умного голосования', record.candidate],
        ['Партия', record.party || 'Не указана в источнике'],
      ]) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = text;
        row.append(term, description);
        details.append(row);
      }
      output.replaceChildren(heading, details);
    } catch {
      if (current === revision) {
        message('Не удалось загрузить данные. Проверьте подключение и нажмите «Показать данные» ещё раз.');
      }
    }
  }

  input.addEventListener('input', () => {
    revision += 1;
    input.removeAttribute('aria-invalid');
    message(initialMessage);
  });
  input.addEventListener('change', event => {
    if (input.value.trim()) showDistrict(event);
  });
  form.addEventListener('submit', showDistrict);
  // Preload district labels; a failed request can be retried by submitting the form.
  loadRecords().catch(() => {});
})();
