const { ipcRenderer } = require('electron');

let fullHistory = [];

ipcRenderer.send('get-clipboard-history');

ipcRenderer.on('clipboard-history', (event, history) => {
  fullHistory = history;
  renderHistory(fullHistory);
});

function renderHistory(history) {
  const list = document.getElementById('history');
  list.innerHTML = '';
  history.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

document.getElementById('search').addEventListener('input', (e) => {
  const keyword = e.target.value.toLowerCase();
  const filtered = fullHistory.filter(item => item.toLowerCase().includes(keyword));
  renderHistory(filtered);
});

function clearHistory() {
  ipcRenderer.send('clear-clipboard-history');
  fullHistory = [];
  renderHistory(fullHistory);
}
