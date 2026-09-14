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
      let data;
      if (location.protocol === 'file:') {
        // Local HTML cannot fetch JSON. This companion is generated from the same XLSX.
        data = await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'data/umg-2026-local.js';
          script.onload = () => {
            const localData = window.umgLocalData;
            delete window.umgLocalData;
            script.remove();
            resolve(localData);
          };
          script.onerror = () => { script.remove(); reject(new Error('Local data unavailable')); };
          document.head.append(script);
        });
      } else {
        const response = await fetch('data/umg-2026.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('Data unavailable');
        data = await response.json();
      }
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
  const regions = document.getElementById('umg-regions');
  const regionLabel = document.getElementById('umg-region-label');
  const search = document.getElementById('umg-region-search');
  const regionList = document.getElementById('umg-region-list');
  const districtPicker = document.getElementById('umg-district-picker');
  const districtLabel = document.getElementById('umg-district-label');
  const districtList = document.getElementById('umg-district-list');
  const manual = document.getElementById('umg-manual');
  const status = document.getElementById('umg-picker-status');
  const retry = document.getElementById('umg-retry');

  function resetResult() {
    revision += 1;
    input.value = '';
    input.removeAttribute('aria-invalid');
    message(initialMessage);
  }

  function renderRegions() {
    const normalize = text => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');
    const names = [...new Set(Object.values(records).map(record => record.region))]
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .filter(name => normalize(name).includes(normalize(search.value.trim())));
    regionList.replaceChildren();
    for (const name of names) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.addEventListener('click', () => {
        resetResult();
        regionLabel.textContent = `1. ${name}`;
        regions.open = false;
        manual.open = false;
        districtLabel.textContent = '2. Выбрать округ';
        districtList.replaceChildren();
        for (const record of Object.values(records).filter(record => record.region === name)) {
          const choice = document.createElement('button');
          choice.type = 'button';
          choice.textContent = `№ ${record.district_number} — ${record.district_name}`;
          choice.addEventListener('click', async event => {
            input.value = String(record.district_number);
            districtLabel.textContent = `2. ${choice.textContent}`;
            districtPicker.open = false;
            await showDistrict(event);
            districtLabel.focus();
          });
          districtList.append(choice);
        }
        districtPicker.hidden = false;
        districtPicker.open = true;
        search.blur();
        districtLabel.focus();
      });
      regionList.append(button);
    }
    if (!names.length) regionList.textContent = 'Регион не найден в базе. Попробуйте другое название или введите номер округа.';
  }

  async function initializePicker() {
    status.textContent = 'Загружаем список округов…';
    retry.hidden = true;
    try {
      await loadRecords();
      renderRegions();
      status.textContent = '';
    } catch {
      status.textContent = 'Не удалось загрузить список округов. Проверьте подключение и повторите загрузку.';
      retry.hidden = false;
    }
  }
  search.addEventListener('input', () => { if (records) renderRegions(); });
  retry.addEventListener('click', initializePicker);
  manual.querySelector('summary').addEventListener('click', () => {
    if (manual.open) return;
    resetResult();
    regions.open = false;
    regionLabel.textContent = '1. Выбрать регион';
    districtPicker.hidden = true;
  });
  initializePicker();
})();
