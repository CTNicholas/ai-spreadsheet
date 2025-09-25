import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { ID_LENGTH } from "../constants";
import { Cell, Column, FixedArray, Row, Storage } from "../types";
import tokenizer, {
  CellToken,
  RefToken,
  SyntaxKind,
  tokenToString,
} from "./interpreter/tokenizer";
import { convertLetterToNumber } from "./interpreter/utils";

export function removeFromArray<T>(array: T[], item: T): void {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

export function getCellId(columnId: string, rowId: string) {
  return `${columnId}${rowId}`;
}

export function extractCellId(cellId: string) {
  const columnId = cellId.slice(0, Math.max(0, cellId.length / 2));
  const rowId = cellId.slice(Math.max(0, cellId.length / 2));

  return [columnId, rowId] as [string, string];
}

function cellToRef(
  token: CellToken,
  columns: LiveObject<Column>[],
  rows: LiveObject<Row>[]
): RefToken {
  const [letter, number] = token.cell;

  const columnIndex = convertLetterToNumber(letter);
  const rowIndex = Number.parseInt(number) - 1;

  const column = columns[columnIndex]?.get("id")!;
  const row = rows[rowIndex]?.get("id")!;

  return { kind: SyntaxKind.RefToken, ref: getCellId(column, row) };
}

export function createInitialStorage<X extends number, Y extends number>(
  columns: { length: X; width: number },
  rows: { height: number; length: Y },
  cells: FixedArray<FixedArray<string, X>, Y>
): Storage {
  const initialColumns = Array.from(
    { length: columns.length },
    () =>
      new LiveObject({ id: nanoid(ID_LENGTH), width: columns.width } as Column)
  );
  const initialRows = Array.from(
    { length: rows.length },
    () => new LiveObject({ id: nanoid(ID_LENGTH), height: rows.height } as Row)
  );
  const initialCells = cells
    .flatMap((row, y) => {
      return row.map((cell, x) => {
        if (cell) {
          const columnId = initialColumns[x].get("id") as string;
          const rowId = initialRows[y].get("id") as string;

          let expression;

          try {
            const tokens = tokenizer(cell);
            const tokensWithRefs = tokens.map((token) =>
              token.kind === SyntaxKind.CellToken
                ? cellToRef(token as CellToken, initialColumns, initialRows)
                : token
            );

            expression = tokensWithRefs.map(tokenToString).join("");
          } catch {
            expression = cell;
          }

          return [
            getCellId(columnId, rowId),
            new LiveObject({ value: expression }),
          ] as readonly [string, LiveObject<Cell>];
        }
      });
    })
    .filter(Boolean) as [string, LiveObject<Cell>][];

  return {
    spreadsheet: new LiveObject({
      cells: new LiveMap<string, LiveObject<Cell>>(initialCells),
      rows: new LiveList<LiveObject<Row>>(initialRows),
      columns: new LiveList<LiveObject<Column>>(initialColumns),
    }),
  };
}

/**
 * Converts spreadsheet data (rows, cells, columns) into a key-value array format
 * @param columns Array of column objects
 * @param rows Array of row objects
 * @param cells Record of cell values keyed by cellId
 * @returns Array of objects with cell, id, and other properties
 */
export function convertSpreadsheetToKeyValueArray(
  columns: Array<{ id: string; width: number }>,
  rows: Array<{ id: string; height: number }>,
  cells: Record<string, string>
): Array<{
  cell: string;
  id: string;
  columnId: string;
  rowId: string;
  value: string;
  columnIndex: number;
  rowIndex: number;
  width: number;
  height: number;
}> {
  const result: Array<{
    cell: string;
    id: string;
    columnId: string;
    rowId: string;
    value: string;
    columnIndex: number;
    rowIndex: number;
    width: number;
    height: number;
  }> = [];

  // Create a map for quick column/row lookups
  const columnMap = new Map(
    columns.map((col, index) => [col.id, { ...col, index }])
  );
  const rowMap = new Map(rows.map((row, index) => [row.id, { ...row, index }]));

  // Iterate through all cells
  for (const [cellId, value] of Object.entries(cells)) {
    const [columnId, rowId] = extractCellId(cellId);

    const column = columnMap.get(columnId);
    const row = rowMap.get(rowId);

    if (column && row) {
      // Convert cellId to Excel-style notation (A1, B2, etc.)
      const cellNotation = convertCellIdToNotation(column.index, row.index);

      result.push({
        cell: cellNotation,
        id: cellId,
        columnId,
        rowId,
        value,
        columnIndex: column.index,
        rowIndex: row.index,
        width: column.width,
        height: row.height,
      });
    }
  }

  return result;
}

/**
 * Converts column and row indices to Excel-style cell notation (A1, B2, etc.)
 */
function convertCellIdToNotation(
  columnIndex: number,
  rowIndex: number
): string {
  const columnLetter = convertNumberToLetter(columnIndex);
  const rowNumber = rowIndex + 1;
  return `${columnLetter}${rowNumber}`;
}

/**
 * Converts a number to Excel column letter (0=A, 1=B, 25=Z, 26=AA, etc.)
 */
function convertNumberToLetter(num: number): string {
  let result = "";
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  }
  return result;
}
