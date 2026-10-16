let solutionGrid = [];
let initialGrid = [];
let currentGrid = [];
let cellElements = [];

let selectedRow = null;
let selectedCol = null;

let mistakesCount = 0;
let hintsCount = 0;
let timerSeconds = 0;
let timerInterval = null;
let isGameWon = false;

const STORAGE_KEY_RECORDS = 'sudoku_lab_records';

const DIFFICULTY_NAMES = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный'
};

const DIFFICULTY_HOLES = {
  easy: 38,
  medium: 48,
  hard: 55
};

document.addEventListener('DOMContentLoaded', () => {
  buildBoardDOM();
  loadRecords();
  setupEventListeners();
  startNewGame();
});

function buildBoardDOM() {
  const boardContainer = document.getElementById('sudoku-board');
  boardContainer.innerHTML = '';
  cellElements = Array.from({ length: 9 }, () => Array(9).fill(null));

  for (let blockIndex = 0; blockIndex < 9; blockIndex++) {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'sudoku-block';
    blockDiv.dataset.block = blockIndex;

    const blockStartRow = Math.floor(blockIndex / 3) * 3;
    const blockStartCol = (blockIndex % 3) * 3;

    for (let innerIndex = 0; innerIndex < 9; innerIndex++) {
      const r = blockStartRow + Math.floor(innerIndex / 3);
      const c = blockStartCol + (innerIndex % 3);

      const cellInput = document.createElement('input');
      cellInput.type = 'text';
      cellInput.maxLength = 1;
      cellInput.className = 'cell';
      cellInput.dataset.row = r;
      cellInput.dataset.col = c;
      cellInput.autocomplete = 'off';
      cellInput.inputMode = 'numeric';

      cellInput.addEventListener('click', () => selectCell(r, c));
      cellInput.addEventListener('focus', () => selectCell(r, c));
      cellInput.addEventListener('keydown', (e) => handleCellKeyDown(e, r, c));
      cellInput.addEventListener('input', (e) => handleCellTextInput(e, r, c));

      blockDiv.appendChild(cellInput);
      cellElements[r][c] = cellInput;
    }

    boardContainer.appendChild(blockDiv);
  }
}

function setupEventListeners() {
  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-check').addEventListener('click', () => validateCurrentBoard(true));
  document.getElementById('btn-hint').addEventListener('click', giveHint);
  document.getElementById('btn-clear').addEventListener('click', clearUserInputs);
  document.getElementById('btn-reset-records').addEventListener('click', resetRecords);
  document.getElementById('difficulty-select').addEventListener('change', startNewGame);

  const keypadButtons = document.querySelectorAll('.key-btn');
  keypadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedRow === null || selectedCol === null) return;
      
      const num = btn.dataset.number;
      const action = btn.dataset.action;

      if (num) {
        applyNumberInput(selectedRow, selectedCol, parseInt(num, 10));
      } else if (action === 'erase') {
        applyNumberInput(selectedRow, selectedCol, 0);
      }
    });
  });
}

function createBaseBoard() {
  const board = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push((r * 3 + Math.floor(r / 3) + c) % 9 + 1);
    }
    board.push(row);
  }
  return board;
}

function swapRowsInArea(board, r1, r2) {
  const temp = board[r1];
  board[r1] = board[r2];
  board[r2] = temp;
}

function swapColsInArea(board, c1, c2) {
  for (let r = 0; r < 9; r++) {
    const temp = board[r][c1];
    board[r][c1] = board[r][c2];
    board[r][c2] = temp;
  }
}

function swapRowAreas(board, a1, a2) {
  for (let i = 0; i < 3; i++) {
    swapRowsInArea(board, a1 * 3 + i, a2 * 3 + i);
  }
}

function swapColAreas(board, a1, a2) {
  for (let i = 0; i < 3; i++) {
    swapColsInArea(board, a1 * 3 + i, a2 * 3 + i);
  }
}

function transposeBoard(board) {
  const transposed = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      transposed[c][r] = board[r][c];
    }
  }
  return transposed;
}

function shuffleNumbers(board) {
  const map = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 9; i > 1; i--) {
    const j = 1 + Math.floor(Math.random() * i);
    const temp = map[i];
    map[i] = map[j];
    map[j] = temp;
  }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      board[r][c] = map[board[r][c]];
    }
  }
}

function generateSolution() {
  let board = createBaseBoard();
  const iterations = 40;

  for (let i = 0; i < iterations; i++) {
    const action = Math.floor(Math.random() * 5);
    if (action === 0) {
      const area = Math.floor(Math.random() * 3);
      const r1 = area * 3 + Math.floor(Math.random() * 3);
      const r2 = area * 3 + Math.floor(Math.random() * 3);
      swapRowsInArea(board, r1, r2);
    } else if (action === 1) {
      const area = Math.floor(Math.random() * 3);
      const c1 = area * 3 + Math.floor(Math.random() * 3);
      const c2 = area * 3 + Math.floor(Math.random() * 3);
      swapColsInArea(board, c1, c2);
    } else if (action === 2) {
      const a1 = Math.floor(Math.random() * 3);
      const a2 = Math.floor(Math.random() * 3);
      swapRowAreas(board, a1, a2);
    } else if (action === 3) {
      const a1 = Math.floor(Math.random() * 3);
      const a2 = Math.floor(Math.random() * 3);
      swapColAreas(board, a1, a2);
    } else if (action === 4) {
      board = transposeBoard(board);
    }
  }

  shuffleNumbers(board);
  return board;
}

function createPuzzle(solution, difficulty) {
  const holes = DIFFICULTY_HOLES[difficulty] || DIFFICULTY_HOLES.medium;
  const puzzle = solution.map(row => [...row]);

  const coords = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      coords.push({ r, c });
    }
  }

  for (let i = coords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = coords[i];
    coords[i] = coords[j];
    coords[j] = temp;
  }

  for (let i = 0; i < holes; i++) {
    const { r, c } = coords[i];
    puzzle[r][c] = 0;
  }

  return puzzle;
}

function startNewGame() {
  const difficulty = document.getElementById('difficulty-select').value;
  document.getElementById('level-display').innerText = DIFFICULTY_NAMES[difficulty];

  solutionGrid = generateSolution();
  initialGrid = createPuzzle(solutionGrid, difficulty);
  currentGrid = initialGrid.map(row => [...row]);

  mistakesCount = 0;
  hintsCount = 0;
  isGameWon = false;
  selectedRow = null;
  selectedCol = null;

  document.getElementById('mistakes-display').innerText = '0';
  document.getElementById('hints-display').innerText = '0';
  hideMessage();
  renderBoard();

  startTimer();
}

function renderBoard() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = cellElements[r][c];
      const val = currentGrid[r][c];
      const isGiven = initialGrid[r][c] !== 0;

      cell.className = 'cell';

      if (isGiven) {
        cell.classList.add('given');
        cell.value = val;
        cell.readOnly = true;
      } else {
        if (val !== 0) {
          cell.classList.add('user-input');
          cell.value = val;
        } else {
          cell.value = '';
        }
        cell.readOnly = false;
      }
    }
  }
  updateHighlights();
}

function selectCell(r, c) {
  selectedRow = r;
  selectedCol = c;
  updateHighlights();
  cellElements[r][c].focus();
}

function updateHighlights() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = cellElements[r][c];
      cell.classList.remove('selected', 'highlighted', 'same-number');
    }
  }

  if (selectedRow === null || selectedCol === null) return;

  const currentVal = currentGrid[selectedRow][selectedCol];
  const selectedBlockRow = Math.floor(selectedRow / 3);
  const selectedBlockCol = Math.floor(selectedCol / 3);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = cellElements[r][c];
      const inSameRow = r === selectedRow;
      const inSameCol = c === selectedCol;
      const inSameBlock = Math.floor(r / 3) === selectedBlockRow && Math.floor(c / 3) === selectedBlockCol;

      if (inSameRow && inSameCol) {
        cell.classList.add('selected');
      } else if (inSameRow || inSameCol || inSameBlock) {
        cell.classList.add('highlighted');
      }

      if (currentVal !== 0 && currentGrid[r][c] === currentVal) {
        cell.classList.add('same-number');
      }
    }
  }
}

function applyNumberInput(r, c, digit) {
  if (isGameWon) return;

  if (initialGrid[r][c] !== 0) return;

  const cell = cellElements[r][c];

  if (digit === 0) {
    currentGrid[r][c] = 0;
    cell.value = '';
    cell.classList.remove('error', 'hinted');
    updateHighlights();
    return;
  }

  currentGrid[r][c] = digit;
  cell.value = digit;
  cell.classList.add('user-input');

  if (digit !== solutionGrid[r][c]) {
    cell.classList.add('error');
    cell.classList.remove('hinted');
    mistakesCount++;
    document.getElementById('mistakes-display').innerText = mistakesCount;
    showMessage(`Ошибка! Цифра ${digit} не подходит для этой ячейки.`, 'error');
  } else {
    cell.classList.remove('error');
    hideMessage();
    checkWinCondition();
  }

  updateHighlights();
}

function handleCellTextInput(e, r, c) {
  const val = e.target.value.trim();
  const lastChar = val.slice(-1);

  if (/^[1-9]$/.test(lastChar)) {
    applyNumberInput(r, c, parseInt(lastChar, 10));
  } else {
    applyNumberInput(r, c, 0);
  }
}

function handleCellKeyDown(e, r, c) {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectCell(Math.max(0, r - 1), c);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectCell(Math.min(8, r + 1), c);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    selectCell(r, Math.max(0, c - 1));
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    selectCell(r, Math.min(8, c + 1));
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    applyNumberInput(r, c, 0);
  } else if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    applyNumberInput(r, c, parseInt(e.key, 10));
  }
}

function giveHint() {
  if (isGameWon) return;

  const targetCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (initialGrid[r][c] === 0 && currentGrid[r][c] !== solutionGrid[r][c]) {
        targetCells.push({ r, c });
      }
    }
  }

  if (targetCells.length === 0) {
    showMessage('Все доступные ячейки уже заполнены верно!', 'info');
    return;
  }

  let hintTarget = targetCells.find(item => item.r === selectedRow && item.c === selectedCol);
  if (!hintTarget) {
    const randomIndex = Math.floor(Math.random() * targetCells.length);
    hintTarget = targetCells[randomIndex];
  }

  const { r, c } = hintTarget;
  const correctVal = solutionGrid[r][c];

  currentGrid[r][c] = correctVal;
  const cell = cellElements[r][c];
  cell.value = correctVal;
  cell.classList.remove('error');
  cell.classList.add('user-input', 'hinted');

  hintsCount++;
  document.getElementById('hints-display').innerText = hintsCount;
  selectCell(r, c);

  showMessage(`Подсказка использована для строки ${r + 1}, столбца ${c + 1}: ${correctVal}`, 'info');

  checkWinCondition();
}

function clearUserInputs() {
  if (isGameWon) return;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (initialGrid[r][c] === 0) {
        currentGrid[r][c] = 0;
        const cell = cellElements[r][c];
        cell.value = '';
        cell.classList.remove('error', 'hinted');
      }
    }
  }
  updateHighlights();
  showMessage('Все введенные значения очищены.', 'info');
}

function validateCurrentBoard(showBanner = true) {
  let totalErrors = 0;
  let emptyCells = 0;

  for (let r = 0; r < 9; r++) {
    const counts = {};
    for (let c = 0; c < 9; c++) {
      const val = currentGrid[r][c];
      if (val === 0) {
        emptyCells++;
      } else {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > 1) {
          totalErrors++;
        }
      }
    }
  }

  for (let c = 0; c < 9; c++) {
    const counts = {};
    for (let r = 0; r < 9; r++) {
      const val = currentGrid[r][c];
      if (val !== 0) {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > 1) {
          totalErrors++;
        }
      }
    }
  }

  for (let b = 0; b < 9; b++) {
    const startR = Math.floor(b / 3) * 3;
    const startC = (b % 3) * 3;
    const counts = {};
    for (let r = startR; r < startR + 3; r++) {
      for (let c = startC; c < startC + 3; c++) {
        const val = currentGrid[r][c];
        if (val !== 0) {
          counts[val] = (counts[val] || 0) + 1;
          if (counts[val] > 1) {
            totalErrors++;
          }
        }
      }
    }
  }

  let mismatchCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] !== 0 && currentGrid[r][c] !== solutionGrid[r][c]) {
        mismatchCount++;
        cellElements[r][c].classList.add('error');
      }
    }
  }

  if (totalErrors > 0 || mismatchCount > 0) {
    if (showBanner) {
      showMessage(` В поле обнаружены ошибки (${totalErrors + mismatchCount})`, 'error');
    }
  } else if (emptyCells > 0) {
    if (showBanner) {
      showMessage(` Все текущие числа верны! Осталось заполнить ${emptyCells} ячеек.`, 'info');
    }
  } else {
    if (showBanner) {
      showMessage('Поле заполнено правильно! Победа!', 'success');
    }
  }
}

function checkWinCondition() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] !== solutionGrid[r][c]) {
        return false;
      }
    }
  }

  handleVictory();
  return true;
}

function handleVictory() {
  isGameWon = true;
  stopTimer();

  const difficulty = document.getElementById('difficulty-select').value;
  const timeFormatted = formatTime(timerSeconds);

  showMessage(` Поздравляем! Вы решили судоку сложности «${DIFFICULTY_NAMES[difficulty]}» за ${timeFormatted}!`, 'success');

  checkAndUpdateRecord(difficulty, timerSeconds);

  validateCurrentBoard(false);
}

function loadRecords() {
  let records = { easy: null, medium: null, hard: null };
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved) {
      records = Object.assign(records, JSON.parse(saved));
    }
  } catch (e) {
    console.error('Ошибка чтения рекордов из localStorage:', e);
  }

  document.getElementById('record-easy').innerText = records.easy ? formatTime(records.easy) : '—';
  document.getElementById('record-medium').innerText = records.medium ? formatTime(records.medium) : '—';
  document.getElementById('record-hard').innerText = records.hard ? formatTime(records.hard) : '—';
}

function checkAndUpdateRecord(difficulty, seconds) {
  let records = { easy: null, medium: null, hard: null };
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (saved) {
      records = Object.assign(records, JSON.parse(saved));
    }
  } catch (e) {
    console.error(e);
  }

  const prevBest = records[difficulty];
  if (prevBest === null || seconds < prevBest) {
    records[difficulty] = seconds;
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Ошибка записи рекордов в localStorage:', e);
    }
    loadRecords();
    showMessage(` Новый рекорд для сложности «${DIFFICULTY_NAMES[difficulty]}»: ${formatTime(seconds)}!`, 'success');
  }
}

function resetRecords() {
  if (confirm('Вы уверены, что хотите сбросить сохраненные рекорды?')) {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    loadRecords();
    showMessage('Рекорды успешно сброшены.', 'info');
  }
}

function startTimer() {
  stopTimer();
  timerSeconds = 0;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  document.getElementById('timer-display').innerText = formatTime(timerSeconds);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes < 10 ? '0' + minutes : minutes;
  const ss = seconds < 10 ? '0' + seconds : seconds;
  return `${mm}:${ss}`;
}

function showMessage(text, type = 'info') {
  const banner = document.getElementById('status-message');
  banner.className = `message-banner ${type}`;
  banner.innerText = text;
}

function hideMessage() {
  const banner = document.getElementById('status-message');
  banner.className = 'message-banner message-hidden';
  banner.innerText = '';
}
