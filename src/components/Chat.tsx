import { RegisterAiKnowledge, RegisterAiTool } from "@liveblocks/react";
import { AiChat, AiTool } from "@liveblocks/react-ui";
import { useSpreadsheet } from "../spreadsheet/react";
import { convertSpreadsheetToKeyValueArray } from "../spreadsheet/utils";
import { defineAiTool, JsonObject } from "@liveblocks/client";
import { AiToolInvocationProps } from "@liveblocks/core";
import { useExampleRoomId } from "../pages";

/* Zoom to 1.25 */

export function Chat() {
  const roomId = useExampleRoomId(
    "liveblocks:examples:nextjs-spreadsheet-advanced"
  );
  const spreadsheet = useSpreadsheet();

  if (!spreadsheet) return null;

  const { rows, cells, columns, setCellValue } = spreadsheet;

  // Convert spreadsheet data to key-value array format
  const spreadsheetData = convertSpreadsheetToKeyValueArray(
    columns,
    rows,
    cells
  );

  // console.log(
  //   spreadsheetData,
  //   columns.map((column, index) => ({
  //     id: column.id,
  //     columnLetter: String.fromCharCode(65 + index),
  //   }))
  // );

  return (
    <>
      <AiChat
        chatId={roomId}
        copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID}
      />

      <RegisterAiTool
        name="edit-cells"
        tool={defineAiTool()({
          description: `Edit multiple cells in the spreadsheet. Replace contents by submitting a string with text. 
- To create an empty cell, submit an emptry string.
- You can add simple formulae, with + - * /.
  - FORMALUAE ONLY in this format:
    - "=A1+B1"
    - '=B6*F6-D2"
- You can NOT use SUM, PRODUCT, :, etc
`,
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
          render: RenderEditCellsTool,
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

function RenderEditCellsTool({
  stage,
  partialArgs,
  args,
  respond,
}: AiToolInvocationProps<
  {
    cells: {
      rowId: string;
      columnId: string;
      value: string;
    }[];
  },
  JsonObject
>) {
  const spreadsheet = useSpreadsheet();
  if (!spreadsheet) return null;
  const { setCellValue } = spreadsheet;

  if (stage === "receiving") {
    if (
      !partialArgs.cells ||
      !Array.isArray(partialArgs.cells) ||
      partialArgs.cells?.length === 0
    ) {
      return;
    }

    (partialArgs as any).cells.forEach(
      (cell: { rowId: string; columnId: string; value: string }) => {
        if (cell.rowId && cell.columnId && typeof cell.value === "string") {
          setTimeout(() => setCellValue(cell.columnId, cell.rowId, cell.value));
          console.log("setting", cell);
        }
      }
    );

    return <AiTool title="Editing cells…" variant="minimal" />;
  }

  if (stage === "executing") {
    args.cells.forEach(
      (cell: { rowId: string; columnId: string; value: string }) => {
        setTimeout(() => setCellValue(cell.columnId, cell.rowId, cell.value));
        console.log("setting", cell);
      }
    );
    // console.log("setCellValue");
    respond({ data: {}, description: "Cells edited" });
    return <AiTool title="Editing cells…" variant="minimal" />;
  }

  return <AiTool title="Cells edited" variant="minimal" />;
}
