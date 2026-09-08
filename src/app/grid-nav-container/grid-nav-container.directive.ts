import { Directive, signal } from '@angular/core';
import { GridNavCellDirective } from './grid-nav-cell.directive';

@Directive({
  selector: '[grid-nav-container]',
})
export class GridNavContainerDirective {
  private readonly cells = signal<GridNavCellDirective[]>([]);

  registerCell(cell: GridNavCellDirective) {
    this.cells.update(list => [...list, cell]);
  }

  unregisterCell(cell: GridNavCellDirective) {
    this.cells.update(list => list.filter(c => c !== cell));
  }

  navigate(currentCell: GridNavCellDirective, direction: 'up' | 'down' | 'left' | 'right') {
    const sortedCells = [...this.cells()].sort((a, b) => {
      const position = a.elementRef.nativeElement.compareDocumentPosition(b.elementRef.nativeElement);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const rows: GridNavCellDirective[][] = [];
    let currentRowElement: Element | null = null;
    let currentRowIndex = -1;

    sortedCells.forEach(cell => {
      const rowElem = cell.elementRef.nativeElement.closest('tr');
      if (rowElem !== currentRowElement) {
        currentRowElement = rowElem;
        currentRowIndex++;
        rows[currentRowIndex] = [];
      }
      rows[currentRowIndex].push(cell);
    });

    let rowIndex = -1;
    let colIndex = -1;

    for (let r = 0; r < rows.length; r++) {
      const c = rows[r].indexOf(currentCell);
      if (c !== -1) {
        rowIndex = r;
        colIndex = c;
        break;
      }
    }

    if (rowIndex === -1 || colIndex === -1) return;

    let targetCell: GridNavCellDirective | undefined;

    if (direction === 'left' && colIndex > 0) {
      targetCell = rows[rowIndex][colIndex - 1];
    } else if (direction === 'right' && colIndex < rows[rowIndex].length - 1) {
      targetCell = rows[rowIndex][colIndex + 1];
    }

    else if (direction === 'up' || direction === 'down') {
      const targetRowIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;

      if (targetRowIndex >= 0 && targetRowIndex < rows.length) {
        const targetRowCells = rows[targetRowIndex];
        const currentRect = currentCell.elementRef.nativeElement.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;

        let closestCell: GridNavCellDirective | undefined;
        let minDistance = Infinity;

        for (const cell of targetRowCells) {
          const cellRect = cell.elementRef.nativeElement.getBoundingClientRect();
          const cellCenterX = cellRect.left + cellRect.width / 2;
          const distance = Math.abs(currentCenterX - cellCenterX);

          if (distance < minDistance) {
            minDistance = distance;
            closestCell = cell;
          }
        }

        targetCell = closestCell;
      }
    }

    if (targetCell) {
      targetCell.focus();
    }
  }
}
