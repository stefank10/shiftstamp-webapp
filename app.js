// Store shifts in localStorage
let shifts = JSON.parse(localStorage.getItem('shifts')) || [];
let currentShift = null;

document.addEventListener('DOMContentLoaded', () => {
    loadShifts();
    updateTotals();
    updateButtons();
});

function clockIn() {
    if (currentShift) {
        alert('Already clocked on. Clock off first.');
        return;
    }
    
    const shift = {
        id: Date.now(),
        startDate: new Date(),
        endDate: null,
        notes: ''
    };

    shifts.push(shift);
    currentShift = shift;

    saveShifts();
    loadShifts();
    updateButtons();
    updateTotals();
}

function clockOut() {
    if (!currentShift) {
        alert('No active shift to clock off.');
        return;
    }

    currentShift.endDate = new Date();
    currentShift = null;

    saveShifts();
    loadShifts();
    updateButtons();
    updateTotals();
}

function loadShifts() {
    const shiftHistoryList = document.getElementById('shiftHistoryList');
    shiftHistoryList.innerHTML = '';
    
    shifts.forEach(shift => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${new Date(shift.startDate).toLocaleString()}</span>
            <span>${shift.endDate ? new Date(shift.endDate).toLocaleString() : '—'}</span>
            <span>${shift.endDate ? formatDuration(shift.startDate, shift.endDate) : '—'}</span>
        `;
        shiftHistoryList.appendChild(li);
    });
}

function saveShifts() {
    localStorage.setItem('shifts', JSON.stringify(shifts));
}

function updateTotals() {
    const todayTotal = getTotalForDate(new Date());
    const weekTotal = getTotalForWeek();
    const monthTotal = getTotalForMonth();

    document.getElementById('todayTotal').textContent = formatDuration(todayTotal.startDate, todayTotal.endDate);
    document.getElementById('weekTotal').textContent = formatDuration(weekTotal.startDate, weekTotal.endDate);
    document.getElementById('monthTotal').textContent = formatDuration(monthTotal.startDate, monthTotal.endDate);
}

function getTotalForDate(date) {
    return shifts.filter(shift => isSameDay(shift.startDate, date) && shift.endDate)
        .reduce((total, shift) => total + (shift.endDate - shift.startDate), 0);
}

function getTotalForWeek() {
    const startOfWeek = getStartOfWeek();
    return shifts.filter(shift => shift.startDate >= startOfWeek && shift.endDate)
        .reduce((total, shift) => total + (shift.endDate - shift.startDate), 0);
}

function getTotalForMonth() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return shifts.filter(shift => shift.startDate >= startOfMonth && shift.endDate)
        .reduce((total, shift) => total + (shift.endDate - shift.startDate), 0);
}

function formatDuration(start, end) {
    const diff = end - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

function getStartOfWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return new Date(today.setDate(today.getDate() - dayOfWeek));
}

function updateButtons() {
    if (currentShift) {
        document.getElementById('clockInBtn').disabled = true;
        document.getElementById('clockOutBtn').disabled = false;
    } else {
        document.getElementById('clockInBtn').disabled = false;
        document.getElementById('clockOutBtn').disabled = true;
    }
}

function exportCSV() {
    const csvContent = "data:text/csv;charset=utf-8," + shifts.map(shift => {
        return `${new Date(shift.startDate).toISOString()},${shift.endDate ? new Date(shift.endDate).toISOString() : ''},${shift.endDate ? (shift.endDate - shift.startDate) / 60000 : ''},${shift.notes || ''}`;
    }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "shifts.csv");
    document.body.appendChild(link);
    link.click();
}

function importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const rows = content.split("\n");
            rows.forEach(row => {
                const [start, end, duration, notes] = row.split(",");
                if (start) {
                    const shift = {
                        startDate: new Date(start),
                        endDate: end ? new Date(end) : null,
                        notes: notes || ''
                    };
                    shifts.push(shift);
                }
            });
            saveShifts();
            loadShifts();
            updateTotals();
        };
        reader.readAsText(file);
    };
    input.click();
}
