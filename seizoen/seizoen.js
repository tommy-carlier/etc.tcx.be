const currentMonth = new Date().getMonth() + 1;

function selectCurrentMonthColumn(row) {
  const cell = row.cells[currentMonth];
  if(cell.textContent.length) {
    cell.classList.add('current');
    return true;
  }
  return false;
}

for(const table of document.getElementsByTagName('TABLE')) {
  selectCurrentMonthColumn(table.tHead.rows[0]);
  for(const body of table.tBodies) {
    for(const row of body.rows) {
      if(selectCurrentMonthColumn(row)) {
        row.classList.add('selected');
      }
    }
  }
}