import { RegisterAiKnowledge, RegisterAiTool } from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import { useSpreadsheet } from "../spreadsheet/react";
import { convertSpreadsheetToKeyValueArray } from "../spreadsheet/utils";
import { defineAiTool } from "@liveblocks/client";

export function Chat() {
  const spreadsheet = useSpreadsheet();

  if (!spreadsheet) return null;

  const { rows, cells, columns, setCellValue } = spreadsheet;

  // Convert spreadsheet data to key-value array format
  const spreadsheetData = convertSpreadsheetToKeyValueArray(
    columns,
    rows,
    cells
  );

  console.log(
    spreadsheetData,
    columns.map((column, index) => ({
      id: column.id,
      columnLetter: String.fromCharCode(65 + index),
    }))
  );

  return (
    <>
      <AiChat
        chatId="main"
        copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID}
      />

      <RegisterAiTool
        name="edit-cells"
        tool={defineAiTool()({
          parameters: {
            type: "object",
            properties: {
              cells: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    rowId: { type: "string" },
                    columnId: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["rowId", "columnId", "value"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cells"],
            additionalProperties: false,
          },
          execute: async ({ cells }) => {
            console.log("executing", cells);
            cells?.forEach(
              (cell: { rowId: string; columnId: string; value: string }) => {
                setCellValue(cell.columnId, cell.rowId, cell.value);
                console.log("setting", cell);
              }
            );
          },
        })}
      />

      <RegisterAiKnowledge
        description="Spreadsheet cell data"
        value={spreadsheetData}
      />
      <RegisterAiKnowledge
        description="Available row IDs mapped to their row numbers (1-based)"
        value={rows.map((row, index) => ({ id: row.id, row: index + 1 }))}
      />
      <RegisterAiKnowledge
        description="Available column IDs mapped to their column letters (A, B, C, etc.)"
        value={columns.map((column, index) => ({
          id: column.id,
          column: String.fromCharCode(65 + index),
        }))}
      />
      <RegisterAiKnowledge
        description="Spreadsheet info. Rows start at 1. Columns start at A. A1 is the top left cell."
        value={{ rowCount: rows.length, columnCount: columns.length }}
      />
    </>
  );
}
