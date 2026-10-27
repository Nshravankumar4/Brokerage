'use strict';

const PublicDemo = {
  apiUrl: 'PASTE_PUBLIC_DEMO_WEB_APP_URL_HERE',
  trips: [],

  async request(action, payload = {}) {
    if (!this.apiUrl.startsWith('https://script.google.com/macros/s/') || !this.apiUrl.endsWith('/exec')) {
      throw new Error('Public demo API URL is not configured. Follow the setup steps in Project Architectures.md.');
    }
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success' || result.demo !== true) {
      throw new Error(result && result.message ? result.message : 'The demo service returned an invalid response.');
    }
    return result;
  },

  setStatus(message, isError = false) {
    const status = document.getElementById('statusMessage');
    status.textContent = message;
    status.classList.toggle('error', isError);
  },

  async load() {
    this.setStatus('Loading synthetic demo records...');
    document.getElementById('refreshButton').disabled = true;
    try {
      const result = await this.request('publicDemoGetAll');
      if (!Array.isArray(result.trips)) throw new Error('The demo service returned an invalid records list.');
      this.trips = result.trips;
      this.render();
      this.setStatus('Shared demo data loaded. Changes are visible to other visitors.');
    } catch (error) {
      console.error('Public demo load failed:', error);
      this.setStatus(error.message, true);
    } finally {
      document.getElementById('refreshButton').disabled = false;
    }
  },

  render() {
    const body = document.getElementById('tripRows');
    body.replaceChildren();
    document.getElementById('tripCount').textContent = `${this.trips.length} shared demo shipment${this.trips.length === 1 ? '' : 's'}`;

    for (const trip of this.trips) {
      const row = document.createElement('tr');
      const values = [
        trip.date,
        trip.lrNo,
        trip.transporter,
        trip.truckNo,
        `${trip.from} to ${trip.to}`,
        trip.status
      ];
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = value || '';
        row.appendChild(cell);
      }

      for (const amount of [trip.freight, trip.advance]) {
        const cell = document.createElement('td');
        cell.className = 'numeric';
        cell.textContent = Number(amount || 0).toLocaleString('en-IN');
        row.appendChild(cell);
      }

      const actions = document.createElement('td');
      actions.className = 'actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'secondary';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => this.beginEdit(trip));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'danger';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => this.remove(trip));
      actions.append(edit, remove);
      row.appendChild(actions);
      body.appendChild(row);
    }
  },

  beginEdit(trip) {
    const form = document.getElementById('tripForm');
    for (const name of ['id', 'date', 'transporter', 'lrNo', 'truckNo', 'from', 'to', 'status', 'freight', 'advance', 'note']) {
      form.elements[name].value = trip[name] === undefined || trip[name] === null ? '' : trip[name];
    }
    document.getElementById('formHeading').textContent = 'Edit synthetic shipment';
    document.getElementById('saveButton').textContent = 'Save demo changes';
    document.getElementById('cancelEditButton').hidden = false;
    form.elements.transporter.focus();
  },

  resetForm() {
    const form = document.getElementById('tripForm');
    form.reset();
    form.elements.id.value = '';
    form.elements.freight.value = '0';
    form.elements.advance.value = '0';
    document.getElementById('formHeading').textContent = 'Add a synthetic shipment';
    document.getElementById('saveButton').textContent = 'Add demo row';
    document.getElementById('cancelEditButton').hidden = true;
  },

  async save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const trip = Object.fromEntries(new FormData(form).entries());
    trip.freight = Number(trip.freight);
    trip.advance = Number(trip.advance);
    const button = document.getElementById('saveButton');
    button.disabled = true;
    try {
      await this.request('publicDemoSave', { trip });
      this.resetForm();
      await this.load();
    } catch (error) {
      console.error('Public demo save failed:', error);
      this.setStatus(error.message, true);
    } finally {
      button.disabled = false;
    }
  },

  async remove(trip) {
    if (!window.confirm(`Delete synthetic demo row ${trip.lrNo}? Anyone can make changes to this demo.`)) return;
    try {
      await this.request('publicDemoDelete', { id: trip.id });
      await this.load();
    } catch (error) {
      console.error('Public demo delete failed:', error);
      this.setStatus(error.message, true);
    }
  },

  init() {
    document.getElementById('tripForm').addEventListener('submit', event => this.save(event));
    document.getElementById('refreshButton').addEventListener('click', () => this.load());
    document.getElementById('cancelEditButton').addEventListener('click', () => this.resetForm());
    this.load();
  }
};

window.PublicDemo = PublicDemo;
PublicDemo.init();
